import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, ArrowUpRight, ArrowDownLeft, Calendar as CalendarIcon, 
  Warehouse as WarehouseIcon, User, Package, Plus, Trash2, Copy, 
  Save, Printer, X, Check, AlertCircle, Info, Sparkles, ScanLine, 
  FileText, Clock, FileCheck, ArrowRight, CornerDownLeft
} from 'lucide-react';
import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import DateObject from 'react-date-object';
import { toPersianDigits, addCommas, removeCommas } from '../../utils/format';
import { Invoice, InvoiceItem, Product, Warehouse, Person } from '../../types';
import { addInvoice, updateInvoice, generateDocNumber } from '../../services/invoiceService';
import { getUnitRatioDirection, getPriceForSelectedUnit, convertQuantityToBaseUnit } from '../../utils/unitConversion';
import BulkProductPickerModal from './BulkProductPickerModal';

interface ConsignmentInvoiceCreateProps {
  products: Product[];
  warehouses: Warehouse[];
  persons: Person[];
  editingInvoice?: Invoice | null;
  initialPersonId?: string | number;
  onSuccess: (savedInvoice: Invoice) => void;
  onCancel: () => void;
  productCategories?: any[];
}

export default function ConsignmentInvoiceCreate({
  products = [],
  warehouses = [],
  persons = [],
  editingInvoice,
  initialPersonId,
  onSuccess,
  onCancel,
  productCategories = []
}: ConsignmentInvoiceCreateProps) {
  // Consignment Type: 'consignment_out' (پرداختی به دیگران) vs 'consignment_in' (دریافتی از دیگران)
  const [consignmentType, setConsignmentType] = useState<'consignment_out' | 'consignment_in'>(
    (editingInvoice?.type === 'consignment_in' ? 'consignment_in' : 'consignment_out')
  );

  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [date, setDate] = useState<any>(new DateObject({ calendar: persian, locale: persian_fa }));
  const [dueDate, setDueDate] = useState<any>(
    new DateObject({ calendar: persian, locale: persian_fa }).add(30, 'days')
  );

  const [selectedPersonId, setSelectedPersonId] = useState<string | number>(
    editingInvoice?.customerId || editingInvoice?.personId || initialPersonId || ''
  );
  const [personSearch, setPersonSearch] = useState('');
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | number>('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Default legal trust terms
  const [trustTerms, setTrustTerms] = useState(
    'اقلام فوق‌الذکر به صورت کاملاً امانی و در کمال صحت و سلامت فیزیکی تحویل گردید و امانت‌گیرنده متعهد است ظرف مهلت مقرر، عین کالاها را مسترد نماید یا نسبت به تسویه و صدور فاکتور قطعی اقدام فرماید. در صورت مفقودی، عیب یا نقص متعهد به جبران کامل خسارت وارده بر مبنای ارزش تقویمی فوق خواهد بود.'
  );

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Modals & UI states
  const [isBulkPickerOpen, setIsBulkPickerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const personRef = useRef<HTMLDivElement>(null);

  // Close person dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (personRef.current && !personRef.current.contains(event.target as Node)) {
        setIsPersonDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set default warehouse
  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      const def = warehouses.find(w => (w as any).isDefault || (w as any).isDefaultSales) || warehouses[0];
      setSelectedWarehouseId(def.id);
    }
  }, [warehouses, selectedWarehouseId]);

  // Load editing invoice or initialize number
  useEffect(() => {
    if (editingInvoice) {
      setConsignmentType(editingInvoice.type === 'consignment_in' ? 'consignment_in' : 'consignment_out');
      setInvoiceNumber(String(editingInvoice.invoiceNumber || ''));
      if (editingInvoice.date) {
        setDate(new DateObject({ date: editingInvoice.date, calendar: persian, locale: persian_fa }));
      }
      if (editingInvoice.consignmentDueDate || editingInvoice.dueDate) {
        setDueDate(new DateObject({ date: editingInvoice.consignmentDueDate || editingInvoice.dueDate, calendar: persian, locale: persian_fa }));
      }
      setSelectedPersonId(editingInvoice.customerId || editingInvoice.personId || '');
      setSelectedWarehouseId(editingInvoice.warehouseId || '');
      setReceiverName(editingInvoice.receiverName || '');
      setReceiverPhone(editingInvoice.receiverPhone || '');
      setShippingAddress(editingInvoice.shippingAddress || '');
      setNotes(editingInvoice.description || editingInvoice.note || '');
      if (editingInvoice.consignmentTerms) setTrustTerms(editingInvoice.consignmentTerms);
      if (editingInvoice.items && editingInvoice.items.length > 0) {
        setItems(editingInvoice.items);
      }
    } else {
      // Auto-generate invoice number for consignment
      generateDocNumber(consignmentType).then(num => {
        setInvoiceNumber(num);
      }).catch(() => {
        setInvoiceNumber(`AM-${Date.now().toString().slice(-5)}`);
      });

      // Add one default empty row if no items
      if (items.length === 0) {
        handleAddEmptyRow();
      }
    }
  }, [editingInvoice]);

  // Re-generate number when switching consignment type (if not editing)
  const handleTypeSwitch = (type: 'consignment_out' | 'consignment_in') => {
    if (editingInvoice) return;
    setConsignmentType(type);
    generateDocNumber(type).then(num => {
      setInvoiceNumber(num);
    }).catch(() => {
      setInvoiceNumber(`AM-${Date.now().toString().slice(-5)}`);
    });
  };

  // Add empty item row
  const handleAddEmptyRow = () => {
    const newItem: InvoiceItem = {
      id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      totalPrice: 0,
      lineTotal: 0,
      selectedUnit: '',
      isSecondaryUnit: false,
      remainingQuantity: 1,
      settledQuantity: 0,
      returnedQuantity: 0,
      description: ''
    };
    setItems(prev => [...prev, newItem]);
  };

  // Product selection handler for a row
  const handleProductSelect = (rowId: string, productId: string | number) => {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;

    setItems(prev => prev.map(item => {
      if (item.id !== rowId) return item;
      const unit = product.unit || 'عدد';
      const price = product.salePrice || product.purchasePrice || 0;
      const qty = item.quantity || 1;
      return {
        ...item,
        productId: product.id,
        productName: product.name,
        unitPrice: price,
        selectedUnit: unit,
        isSecondaryUnit: false,
        unitRatio: product.unitRatio || 1,
        unitRatioDirection: product.unitRatioDirection || 'secondary_to_main',
        totalPrice: qty * price,
        lineTotal: qty * price,
        remainingQuantity: qty,
        settledQuantity: 0,
        returnedQuantity: 0,
        description: product.barcode ? `بارکد: ${product.barcode}` : ''
      };
    }));
  };

  // Row field change
  const handleItemFieldChange = (rowId: string, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== rowId) return item;
      const updated = { ...item, [field]: value };

      if (field === 'quantity' || field === 'unitPrice') {
        const q = field === 'quantity' ? Math.max(0, parseFloat(value) || 0) : item.quantity;
        const p = field === 'unitPrice' ? Math.max(0, parseFloat(value) || 0) : item.unitPrice;
        updated.quantity = q;
        updated.unitPrice = p;
        updated.totalPrice = q * p;
        updated.lineTotal = q * p;
        updated.remainingQuantity = Math.max(0, q - (item.settledQuantity || 0) - (item.returnedQuantity || 0));
      }

      return updated;
    }));
  };

  // Toggle unit (main vs secondary)
  const handleToggleUnit = (rowId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== rowId) return item;
      const product = products.find(p => String(p.id) === String(item.productId));
      if (!product || !product.secondaryUnit) return item;

      const isSec = !item.isSecondaryUnit;
      const unit = isSec ? product.secondaryUnit : (product.unit || 'عدد');
      return {
        ...item,
        isSecondaryUnit: isSec,
        selectedUnit: unit
      };
    }));
  };

  // Remove row
  const handleRemoveRow = (rowId: string) => {
    if (items.length <= 1) {
      setItems([{
        id: 'row_' + Date.now(),
        productId: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        totalPrice: 0,
        lineTotal: 0,
        selectedUnit: '',
        remainingQuantity: 1,
        settledQuantity: 0,
        returnedQuantity: 0
      }]);
      return;
    }
    setItems(prev => prev.filter(i => i.id !== rowId));
  };

  // Duplicate row
  const handleDuplicateRow = (rowId: string) => {
    const item = items.find(i => i.id === rowId);
    if (!item) return;
    const duplicated: InvoiceItem = {
      ...item,
      id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
    };
    setItems(prev => [...prev, duplicated]);
  };

  // Barcode quick add
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const barcode = barcodeInput.trim().toLowerCase();
    const product = products.find(p => 
      (p.barcode && p.barcode.toLowerCase() === barcode) ||
      (p.code && p.code.toLowerCase() === barcode)
    );

    if (product) {
      // If last item is blank, replace it
      const lastItem = items[items.length - 1];
      if (lastItem && !lastItem.productId) {
        handleProductSelect(lastItem.id, product.id);
      } else {
        const newItem: InvoiceItem = {
          id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.salePrice || product.purchasePrice || 0,
          discountPercent: 0,
          totalPrice: product.salePrice || product.purchasePrice || 0,
          lineTotal: product.salePrice || product.purchasePrice || 0,
          selectedUnit: product.unit || 'عدد',
          isSecondaryUnit: false,
          remainingQuantity: 1,
          settledQuantity: 0,
          returnedQuantity: 0,
          description: product.barcode ? `بارکد: ${product.barcode}` : ''
        };
        setItems(prev => [...prev, newItem]);
      }
      setBarcodeInput('');
    } else {
      setErrorMsg(`کالایی با بارکد یا کد "${barcodeInput}" یافت نشد.`);
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  // Bulk add products from modal
  const handleBulkAdd = (selectedProducts: { product: Product; quantity: number }[]) => {
    const newItems: InvoiceItem[] = selectedProducts.map(sp => {
      const p = sp.product;
      const q = sp.quantity || 1;
      const price = p.salePrice || p.purchasePrice || 0;
      return {
        id: 'row_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        productId: p.id,
        productName: p.name,
        quantity: q,
        unitPrice: price,
        discountPercent: 0,
        totalPrice: q * price,
        lineTotal: q * price,
        selectedUnit: p.unit || 'عدد',
        isSecondaryUnit: false,
        unitRatio: p.unitRatio || 1,
        unitRatioDirection: p.unitRatioDirection || 'secondary_to_main',
        remainingQuantity: q,
        settledQuantity: 0,
        returnedQuantity: 0,
        description: p.barcode ? `بارکد: ${p.barcode}` : ''
      };
    });

    // Remove trailing empty item if any
    setItems(prev => {
      const filtered = prev.filter(it => it.productId);
      return [...filtered, ...newItems];
    });
    setIsBulkPickerOpen(false);
  };

  // Filter persons for dropdown
  const filteredPersons = useMemo(() => {
    if (!personSearch.trim()) return persons.slice(0, 50);
    const q = personSearch.toLowerCase();
    return persons.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.mobile?.includes(q) ||
      p.phone?.includes(q) ||
      p.companyName?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [persons, personSearch]);

  const selectedPerson = useMemo(() => {
    return persons.find(p => String(p.id) === String(selectedPersonId));
  }, [persons, selectedPersonId]);

  // Calculations
  const totalItemsCount = items.filter(i => i.productId && i.quantity > 0).length;
  const totalQuantity = items.reduce((sum, i) => sum + (i.productId ? (i.quantity || 0) : 0), 0);
  const totalValuation = items.reduce((sum, i) => sum + (i.productId ? ((i.quantity || 0) * (i.unitPrice || 0)) : 0), 0);

  // Form Submission
  const handleSaveConsignment = async (isDraft: boolean = false) => {
    try {
      setErrorMsg('');
      const validItems = items.filter(i => i.productId && i.quantity > 0);

      if (!selectedPersonId) {
        setErrorMsg(consignmentType === 'consignment_out' 
          ? 'لطفاً طرف‌حساب تحویل‌گیرنده کالا (مشتری/همکار) را مشخص فرمایید.' 
          : 'لطفاً طرف‌حساب تحویل‌دهنده کالا (تامین‌کننده/شخص) را مشخص فرمایید.'
        );
        return;
      }

      if (validItems.length === 0) {
        setErrorMsg('حداقل یک قلم کالای معتبر با تعداد بیشتر از صفر باید به فاکتور امانی اضافه شود.');
        return;
      }

      setIsSubmitting(true);

      const formattedDate = date instanceof DateObject 
        ? date.format('YYYY/MM/DD') 
        : (typeof date === 'string' ? date : new Date().toISOString().split('T')[0]);

      const formattedDueDate = dueDate instanceof DateObject 
        ? dueDate.format('YYYY/MM/DD') 
        : (typeof dueDate === 'string' ? dueDate : null);

      // Prepare consignment items with tracking properties
      const finalItems: InvoiceItem[] = validItems.map(item => {
        const q = item.quantity || 0;
        const settled = item.settledQuantity || 0;
        const returned = item.returnedQuantity || 0;
        const remaining = Math.max(0, q - settled - returned);
        return {
          ...item,
          quantity: q,
          unitPrice: item.unitPrice || 0,
          totalPrice: q * (item.unitPrice || 0),
          lineTotal: q * (item.unitPrice || 0),
          settledQuantity: settled,
          returnedQuantity: returned,
          remainingQuantity: remaining
        };
      });

      const invoicePayload: Partial<Invoice> = {
        invoiceNumber: invoiceNumber.trim() || `AM-${Date.now().toString().slice(-6)}`,
        type: consignmentType,
        date: formattedDate,
        dueDate: formattedDueDate,
        consignmentDueDate: formattedDueDate || undefined,
        customerId: selectedPersonId,
        customerName: selectedPerson?.name || '',
        warehouseId: selectedWarehouseId,
        status: isDraft ? 'draft' : 'final',
        consignmentStatus: isDraft ? 'voided' : 'active',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        subtotal: totalValuation,
        totalDiscount: 0,
        totalTax: 0,
        grandTotal: totalValuation,
        totalAmount: totalValuation,
        items: finalItems,
        receiverName,
        receiverPhone,
        shippingAddress,
        description: notes,
        consignmentTerms: trustTerms,
        isDraft: isDraft
      };

      let saved: Invoice;
      if (editingInvoice) {
        saved = await updateInvoice(editingInvoice.id, {
          ...editingInvoice,
          ...invoicePayload
        });
      } else {
        saved = await addInvoice(invoicePayload, false, true); // skipAccounting: true to prevent financial debt
      }

      setSuccessMsg('فاکتور امانی با موفقیت ذخیره گردید.');
      setTimeout(() => {
        onSuccess(saved);
      }, 1000);

    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ثبت فاکتور امانی');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              title="بازگشت"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {editingInvoice ? 'ویرایش سند امانت کالا' : 'ثبت فاکتور امانت کالا'}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  سند بدون اثر مالی
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                مدیریت امانت‌های پرداختی به مشتریان/همکاران و امانت‌های دریافتی از تامین‌کنندگان
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              انصراف
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveConsignment(true)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl transition"
            >
              ذخیره پیش‌نویس
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveConsignment(false)}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-500/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'در حال ثبت...' : 'ثبت نهایی فاکتور امانی'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Consignment Direction Selector & Financial Note Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">جهت جریان امانت:</span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-2 w-fit">
                <button
                  type="button"
                  onClick={() => handleTypeSwitch('consignment_out')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    consignmentType === 'consignment_out'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  امانت پرداختی به دیگران (امانت صادره)
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeSwitch('consignment_in')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    consignmentType === 'consignment_in'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  امانت دریافتی از دیگران (امانت وارده)
                </button>
              </div>
            </div>

            {/* Information Card */}
            <div className="flex-1 max-w-lg p-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong className="block font-semibold mb-0.5">قانون اثر حسابداری امانت:</strong>
                ثبت فاکتور امانی بر موجودی انبار اثر فیزیکی می‌گذارد، اما <strong>هیچ‌گونه بدهی مالی</strong> در معین و مانده حساب طرف‌حساب ایجاد نمی‌کند. مطالبات و بدهی‌ها پس از تبدیل به فاکتور قطعی ثبت خواهند شد.
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Header Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            مشخصات سند و طرف‌حساب
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                شماره سند امانی:
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Registration Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                تاریخ صدور امانت:
              </label>
              <DatePicker
                value={date}
                onChange={setDate}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                inputClass="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Due Date (تاریخ سررسید عودت) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                مهلت امانت (سررسید عودت):
              </label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                calendar={persian}
                locale={persian_fa}
                calendarPosition="bottom-right"
                inputClass="w-full px-3 py-2 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Warehouse */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
                {consignmentType === 'consignment_out' ? 'انبار مبدا خروج:' : 'انبار مقصد ورود:'}
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Counterparty Search & Picker */}
            <div className="md:col-span-2 relative" ref={personRef}>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {consignmentType === 'consignment_out' ? 'طرف‌حساب امانت‌گیرنده (مشتری/شخص):' : 'طرف‌حساب امانت‌دهنده (تامین‌کننده/شخص):'}
              </label>

              <div 
                onClick={() => setIsPersonDropdownOpen(true)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-amber-500"
              >
                <span className={selectedPerson ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-400'}>
                  {selectedPerson ? `${selectedPerson.name} ${selectedPerson.mobile ? `(${toPersianDigits(selectedPerson.mobile)})` : ''}` : 'جستجو و انتخاب طرف‌حساب...'}
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                  تغییر شخص
                </span>
              </div>

              {isPersonDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-40 p-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="نام، شماره تماس یا شرکت را جستجو کنید..."
                    value={personSearch}
                    onChange={(e) => setPersonSearch(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none mb-2"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredPersons.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPersonId(p.id);
                          setIsPersonDropdownOpen(false);
                          setPersonSearch('');
                          if (p.mobile && !receiverPhone) setReceiverPhone(p.mobile);
                          if (p.address && !shippingAddress) setShippingAddress(p.address);
                        }}
                        className="px-3 py-2 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">{toPersianDigits(p.mobile || p.phone || '')}</span>
                      </div>
                    ))}
                    {filteredPersons.length === 0 && (
                      <div className="text-center py-4 text-xs text-slate-400">
                        شخصی با این مشخصات یافت نشد
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Receiver / Driver Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                نام تحویل‌گیرنده / نماینده:
              </label>
              <input
                type="text"
                placeholder="نام شخص تحویل گیرنده"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* Receiver Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                شماره تماس تحویل‌گیرنده:
              </label>
              <input
                type="text"
                placeholder="۰۹۱۲..."
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                اقلام و کالاهای امانی
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                {toPersianDigits(items.length)} ردیف
              </span>
            </div>

            {/* Barcode & Bulk Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <form onSubmit={handleBarcodeSubmit} className="relative flex items-center">
                <input
                  type="text"
                  placeholder="اسکن یا ثبت بارکد..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none w-44"
                />
                <button type="submit" className="absolute left-2 text-slate-400 hover:text-amber-500">
                  <ScanLine className="w-4 h-4" />
                </button>
              </form>

              <button
                type="button"
                onClick={() => setIsBulkPickerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                انتخاب دسته‌جمعی کالا
              </button>

              <button
                type="button"
                onClick={handleAddEmptyRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                افزودن سطر جدید
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 min-w-[220px]">کالا</th>
                  <th className="p-3 w-32 text-center">تعداد / مقدار</th>
                  <th className="p-3 w-28 text-center">واحد</th>
                  <th className="p-3 w-40 text-left">ارزش تقویمی هر واحد (تومان)</th>
                  <th className="p-3 w-40 text-left">ارزش کل امانی (تومان)</th>
                  <th className="p-3 min-w-[180px]">شماره سریال / توضیحات فنی</th>
                  <th className="p-3 w-20 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {items.map((item, idx) => {
                  const product = products.find(p => String(p.id) === String(item.productId));
                  const hasSecUnit = Boolean(product && product.secondaryUnit);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3 text-center font-mono text-slate-400">
                        {toPersianDigits(idx + 1)}
                      </td>

                      {/* Product Selector */}
                      <td className="p-3">
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleProductSelect(item.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                          <option value="">-- انتخاب کالا --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.barcode ? `(${p.barcode})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleItemFieldChange(item.id, 'quantity', e.target.value)}
                          className="w-24 text-center font-mono font-bold py-1 px-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </td>

                      {/* Unit Switcher */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {item.selectedUnit || (product?.unit || 'عدد')}
                          </span>
                          {hasSecUnit && (
                            <button
                              type="button"
                              onClick={() => handleToggleUnit(item.id)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-amber-100 dark:hover:bg-amber-900 text-slate-600 dark:text-slate-300 hover:text-amber-700 transition"
                              title="تغییر به واحد فرعی"
                            >
                              تبدیل
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Unit Valuation Price */}
                      <td className="p-3 text-left">
                        <input
                          type="text"
                          value={addCommas(item.unitPrice || 0)}
                          onChange={(e) => handleItemFieldChange(item.id, 'unitPrice', removeCommas(e.target.value))}
                          className="w-32 text-left font-mono font-medium py-1 px-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </td>

                      {/* Total Line Valuation */}
                      <td className="p-3 text-left font-mono font-bold text-slate-900 dark:text-slate-100">
                        {toPersianDigits(addCommas((item.quantity || 0) * (item.unitPrice || 0)))}
                      </td>

                      {/* Serial / Description */}
                      <td className="p-3">
                        <input
                          type="text"
                          placeholder="سریال، رنگ، شرایط کالا..."
                          value={item.description || ''}
                          onChange={(e) => handleItemFieldChange(item.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </td>

                      {/* Action buttons */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(item.id)}
                            className="p-1 text-slate-400 hover:text-amber-600 rounded transition"
                            title="تکرار سطر"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="حذف سطر"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms, Conditions & Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trust Terms & Conditions */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileCheck className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                مفاد و شرایط تعهد امانت‌داری (رسید قانونی)
              </h3>
            </div>
            <textarea
              rows={3}
              value={trustTerms}
              onChange={(e) => setTrustTerms(e.target.value)}
              className="w-full p-3 text-xs leading-relaxed rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">آدرس محل استقرار / تحویل کالا:</label>
                <input
                  type="text"
                  placeholder="آدرس دقیق انبار یا محل استفاده"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">یادداشت داخلی یا پیوست‌ها:</label>
                <input
                  type="text"
                  placeholder="توضیحات تکمیلی یا شماره توافق‌نامه"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Consignment Valuation Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
                خلاصه اقلام و ارزش تقویمی
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>تنوع اقلام امانی:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {toPersianDigits(totalItemsCount)} قلم
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>مجموع تعداد کل کالاها:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {toPersianDigits(totalQuantity)}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">ارزش کل امانی:</span>
                    <span className="text-[10px] text-slate-400">بدون ثبت بدهی مالی در معین</span>
                  </div>
                  <div className="text-left">
                    <span className="font-black text-lg text-amber-600 dark:text-amber-400 font-mono">
                      {toPersianDigits(addCommas(totalValuation))}
                    </span>
                    <span className="text-xs text-slate-500 mr-1">تومان</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveConsignment(false)}
                className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-500/20 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'در حال ثبت...' : 'ثبت نهایی فاکتور امانی'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Bulk Product Picker Modal */}
      {isBulkPickerOpen && (
        <BulkProductPickerModal
          isOpen={isBulkPickerOpen}
          onClose={() => setIsBulkPickerOpen(false)}
          products={products}
          onConfirm={handleBulkAdd}
          categories={productCategories}
        />
      )}
    </div>
  );
}
