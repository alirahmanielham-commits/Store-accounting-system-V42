import { useState, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import { convertQuantityToBaseUnit, getPriceForSelectedUnit, getUnitRatioDirection } from '../utils/unitConversion';

export type InvoiceWorkflowType =
  | 'sale'
  | 'purchase'
  | 'proforma'
  | 'sale_return'
  | 'purchase_return'
  | 'warehouse_receipt'
  | 'warehouse_remittance';

export interface InvoiceLineItem {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  selectedUnit?: string;
  isSecondaryUnit?: boolean;
  unitRatio?: number;
  unitRatioDirection?: 'main_to_secondary' | 'secondary_to_main';
  baseQuantity?: number;
  description?: string;
  lineTotal: number;
}

export interface UseInvoiceWorkflowOptions {
  initialType?: InvoiceWorkflowType;
  defaultWarehouseId?: string;
  taxDefaultRate?: number;
}

/**
 * Pure calculation helper for an invoice line item
 */
export function calculateItemTotal(item: Partial<InvoiceLineItem>): number {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unitPrice) || 0;
  const gross = qty * price;

  const discountP = Number(item.discountPercent) || 0;
  const discountAmt = item.discountAmount !== undefined ? Number(item.discountAmount) : (gross * discountP) / 100;
  const afterDiscount = Math.max(0, gross - discountAmt);

  const taxP = Number(item.taxPercent) || 0;
  const taxAmt = item.taxAmount !== undefined ? Number(item.taxAmount) : (afterDiscount * taxP) / 100;

  return Math.round(afterDiscount + taxAmt);
}

/**
 * Pure calculation helper for invoice aggregated totals
 */
export function calculateInvoiceTotals(items: InvoiceLineItem[], overallDiscount: number = 0) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const totalDiscount = items.reduce((sum, it) => {
    const gross = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    const disc = it.discountAmount !== undefined ? Number(it.discountAmount) : (gross * (Number(it.discountPercent) || 0)) / 100;
    return sum + disc;
  }, 0) + (Number(overallDiscount) || 0);

  const totalTax = items.reduce((sum, it) => {
    const gross = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    const disc = it.discountAmount !== undefined ? Number(it.discountAmount) : (gross * (Number(it.discountPercent) || 0)) / 100;
    const afterDisc = Math.max(0, gross - disc);
    const tax = it.taxAmount !== undefined ? Number(it.taxAmount) : (afterDisc * (Number(it.taxPercent) || 0)) / 100;
    return sum + tax;
  }, 0);

  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

  return { subtotal, totalDiscount, totalTax, grandTotal };
}

export function useInvoiceWorkflow(options: UseInvoiceWorkflowOptions = {}) {
  const { initialType = 'sale', defaultWarehouseId = '', taxDefaultRate = 0 } = options;

  const { addInvoice, updateInvoice, products } = useStore();

  const [invoiceType, setInvoiceType] = useState<InvoiceWorkflowType>(initialType);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>(defaultWarehouseId);
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [description, setDescription] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('unpaid');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDraftDirty, setIsDraftDirty] = useState<boolean>(false);

  // Line item calculations
  const calculateItemTotal = useCallback((item: Partial<InvoiceLineItem>): number => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const gross = qty * price;

    const discountP = Number(item.discountPercent) || 0;
    const discountAmt = item.discountAmount !== undefined ? Number(item.discountAmount) : (gross * discountP) / 100;
    const afterDiscount = Math.max(0, gross - discountAmt);

    const taxP = Number(item.taxPercent) || 0;
    const taxAmt = item.taxAmount !== undefined ? Number(item.taxAmount) : (afterDiscount * taxP) / 100;

    return Math.round(afterDiscount + taxAmt);
  }, []);

  const addItem = useCallback(
    (product: any, quantity: number = 1, isSecondaryUnit: boolean = false) => {
      const pid = String(product.id);
      const ratio = Number(product.unitRatio) || 1;
      const dir = product.unitRatioDirection || getUnitRatioDirection(product);
      const baseUnitPrice = Number(product.sellPrice || product.price || 0);

      const effectiveUnitPrice = isSecondaryUnit
        ? getPriceForSelectedUnit(baseUnitPrice, true, ratio, dir)
        : baseUnitPrice;

      const baseQty = convertQuantityToBaseUnit(quantity, isSecondaryUnit, ratio, dir);

      const newItem: InvoiceLineItem = {
        id: Math.random().toString(36).substring(2, 9),
        productId: pid,
        productName: product.name || '',
        quantity,
        unitPrice: effectiveUnitPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: taxDefaultRate,
        selectedUnit: isSecondaryUnit ? (product.secondaryUnit || '') : (product.unit || 'عدد'),
        isSecondaryUnit,
        unitRatio: ratio,
        unitRatioDirection: dir,
        baseQuantity: baseQty,
        lineTotal: calculateItemTotal({
          quantity,
          unitPrice: effectiveUnitPrice,
          discountPercent: 0,
          taxPercent: taxDefaultRate
        })
      };

      setItems(prev => [...prev, newItem]);
      setIsDraftDirty(true);
    },
    [calculateItemTotal, taxDefaultRate]
  );

  const updateItem = useCallback(
    (itemId: string, patch: Partial<InvoiceLineItem>) => {
      setItems(prev =>
        prev.map(it => {
          if (it.id !== itemId) return it;
          const merged = { ...it, ...patch };
          merged.lineTotal = calculateItemTotal(merged);
          return merged;
        })
      );
      setIsDraftDirty(true);
    },
    [calculateItemTotal]
  );

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(it => it.id !== itemId));
    setIsDraftDirty(true);
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
    setIsDraftDirty(true);
  }, []);

  // Aggregated totals
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  }, [items]);

  const totalDiscount = useMemo(() => {
    const itemDiscounts = items.reduce((sum, it) => {
      const gross = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      const disc = it.discountAmount !== undefined ? Number(it.discountAmount) : (gross * (Number(it.discountPercent) || 0)) / 100;
      return sum + disc;
    }, 0);
    return itemDiscounts + (Number(overallDiscount) || 0);
  }, [items, overallDiscount]);

  const totalTax = useMemo(() => {
    return items.reduce((sum, it) => {
      const gross = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      const disc = it.discountAmount !== undefined ? Number(it.discountAmount) : (gross * (Number(it.discountPercent) || 0)) / 100;
      const afterDisc = Math.max(0, gross - disc);
      const tax = it.taxAmount !== undefined ? Number(it.taxAmount) : (afterDisc * (Number(it.taxPercent) || 0)) / 100;
      return sum + tax;
    }, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - totalDiscount + totalTax);
  }, [subtotal, totalDiscount, totalTax]);

  const resetInvoiceForm = useCallback(() => {
    setInvoiceNumber('');
    setCustomerId('');
    setCustomerName('');
    setItems([]);
    setDescription('');
    setPaymentStatus('unpaid');
    setPaidAmount(0);
    setOverallDiscount(0);
    setIsDraftDirty(false);
  }, []);

  const submitInvoice = useCallback(
    async (extraData?: Record<string, any>) => {
      if (items.length === 0) {
        throw new Error('فاکتور باید حداقل شامل یک قلم کالا باشد.');
      }
      setIsSubmitting(true);
      try {
        const payload = {
          type: invoiceType,
          invoiceNumber,
          date: invoiceDate,
          customerId,
          customerName,
          warehouseId,
          items,
          subtotal,
          totalDiscount,
          totalTax,
          grandTotal,
          paymentStatus,
          paidAmount,
          description,
          ...extraData
        };

        const result = await addInvoice(payload);
        resetInvoiceForm();
        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      items,
      invoiceType,
      invoiceNumber,
      invoiceDate,
      customerId,
      customerName,
      warehouseId,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      paymentStatus,
      paidAmount,
      description,
      addInvoice,
      resetInvoiceForm
    ]
  );

  return {
    invoiceType,
    setInvoiceType,
    invoiceNumber,
    setInvoiceNumber,
    invoiceDate,
    setInvoiceDate,
    customerId,
    setCustomerId,
    customerName,
    setCustomerName,
    warehouseId,
    setWarehouseId,
    items,
    setItems,
    description,
    setDescription,
    paymentStatus,
    setPaymentStatus,
    paidAmount,
    setPaidAmount,
    overallDiscount,
    setOverallDiscount,
    isSubmitting,
    isDraftDirty,
    setIsDraftDirty,
    subtotal,
    totalDiscount,
    totalTax,
    grandTotal,
    addItem,
    updateItem,
    removeItem,
    clearItems,
    resetInvoiceForm,
    submitInvoice
  };
}
