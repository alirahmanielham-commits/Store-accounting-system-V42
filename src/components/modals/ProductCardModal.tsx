import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Package,
  TrendingUp,
  TrendingDown,
  History,
  BarChart2,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  Filter,
  CheckCircle2,
  Search,
  Printer,
  Download,
  ShoppingCart,
  ShoppingBag,
  AlertTriangle,
  AlertCircle,
  Calendar,
  DollarSign,
  Users,
  Award,
  Percent,
  RefreshCw,
  Clock,
  ArrowRightLeft,
  Building,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { Product, Warehouse } from '../../types';
import { getInvoices, getProductPriceHistory, getInventoryTransactions, getPersons, getWarehouses } from '../../services/dataService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { addCommas, toPersianDigits, formatDateDisplay, formatAmount, numToPersianWords } from '../../utils/format';
import { getUnitRatioDirection, getPriceForSelectedUnit, convertQuantityToBaseUnit, convertPriceToBaseUnit, formatUnitConversionFormula } from '../../utils/unitConversion';
import { compareKardexTransactions } from '../../utils/kardexSort';
import { exportToExcel } from '../../utils/exportUtils';

export interface ProductCardModalProps {
  product: Product;
  warehouses?: Warehouse[];
  currency?: string;
  onClose: () => void;
  isModal?: boolean;
  persons?: any[];
  storeSettings?: any;
}

export default function ProductCardModal({
  product,
  warehouses = [],
  currency = 'تومان',
  onClose,
  isModal = true,
  persons = [],
  storeSettings
}: ProductCardModalProps) {
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'kardex' | 'purchases' | 'sales' | 'analytics' | 'info' | 'warehouse' | 'persons' | 'price_chart'>('kardex');
  const [loading, setLoading] = useState(true);

  // Raw data state
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [activeWarehouses, setActiveWarehouses] = useState<Warehouse[]>(warehouses);
  const [activePersons, setActivePersons] = useState<any[]>(persons);

  // Dedicated collections for tabs
  const [purchaseInvoices, setPurchaseInvoices] = useState<any[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<any[]>([]);
  const [warehouseDocs, setWarehouseDocs] = useState<any[]>([]);
  const [kardexLedger, setKardexLedger] = useState<any[]>([]);
  const [stockPerWarehouse, setStockPerWarehouse] = useState<{ [key: string]: number }>({});
  const [calculatedStock, setCalculatedStock] = useState<number>(0);

  // Search & Filter states within tabs
  const [kardexWarehouseFilter, setKardexWarehouseFilter] = useState<string>('all');
  const [kardexSearchQuery, setKardexSearchQuery] = useState<string>('');
  const [kardexTypeFilter, setKardexTypeFilter] = useState<string>('all');

  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState<string>('');
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState<string>('all');

  const [salesSearchQuery, setSalesSearchQuery] = useState<string>('');
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>('all');

  const [personTabFilter, setPersonTabFilter] = useState<'all' | 'suppliers' | 'customers'>('all');

  // Print Kardex Modal state
  const [isPrintKardexOpen, setIsPrintKardexOpen] = useState(false);

  // Formatting helpers
  const formatCur = (num: any) => toPersianDigits(formatAmount(Number(num) || 0, storeSettings));
  const formatNum = (num: any) => toPersianDigits(formatAmount(Number(num) || 0, storeSettings));

  // Current purchase and sale prices (from priceHistory or product itself)
  const [currentPurchasePrice, setCurrentPurchasePrice] = useState(product.purchasePrice || 0);
  const [currentSalePrice, setCurrentSalePrice] = useState(product.price || 0);
  const [lastSaleDate, setLastSaleDate] = useState<string>('');
  const [lastPurchaseDate, setLastPurchaseDate] = useState<string>('');

  useEffect(() => {
    const salePrices = priceHistory.filter((h: any) => h.type === 'sale').sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const purchasePrices = priceHistory.filter((h: any) => h.type === 'purchase').sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (salePrices.length > 0) {
      setCurrentSalePrice(salePrices[0].price);
      setLastSaleDate(salePrices[0].date);
    } else if (product.price) {
      setCurrentSalePrice(product.price);
    }
    if (purchasePrices.length > 0) {
      setCurrentPurchasePrice(purchasePrices[0].price);
      setLastPurchaseDate(purchasePrices[0].date);
    } else if (product.purchasePrice) {
      setCurrentPurchasePrice(product.purchasePrice);
    }
  }, [priceHistory, product.price, product.purchasePrice]);

  // Main data extraction effect
  useEffect(() => {
    let isMounted = true;

    const loadAllProductData = async () => {
      setLoading(true);
      try {
        // 1. Ensure persons and warehouses are available
        const [loadedInvoices, loadedPriceHistory, loadedInvTx, loadedPersons, loadedWh] = await Promise.all([
          getInvoices(),
          getProductPriceHistory(product.id.toString()),
          getInventoryTransactions(product.id.toString()),
          activePersons.length > 0 ? Promise.resolve(activePersons) : getPersons().catch(() => []),
          activeWarehouses.length > 0 ? Promise.resolve(activeWarehouses) : getWarehouses().catch(() => [])
        ]);

        if (!isMounted) return;

        setAllInvoices(loadedInvoices || []);
        setActivePersons(loadedPersons || []);
        setActiveWarehouses(loadedWh || []);
        setPriceHistory((loadedPriceHistory || []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));

        const defaultWhId = product.warehouseId?.toString() || (loadedWh[0]?.id?.toString()) || 'unknown';
        const whStockMap: { [key: string]: number } = {};

        // Helper to match product item in an invoice
        const matchProductItem = (item: any) => {
          if (!item) return false;
          const itemId = String(item.productId || item.id || '');
          const prodId = String(product.id || '');
          if (itemId && prodId && itemId === prodId) return true;
          if (product.code && item.code && String(product.code).trim() === String(item.code).trim()) return true;
          return false;
        };

        // 2. Extract Purchase Invoices (and purchase returns)
        const extractedPurchases: any[] = [];
        // 3. Extract Sales Invoices (and sales returns)
        const extractedSales: any[] = [];
        // 4. Physical Kardex transactions
        const kardexRawItems: any[] = [];
        // 5. Physical Warehouse Documents
        const extractedWarehouseDocs: any[] = [];

        // Add Initial stock if present (Fixed: Must use product.initialStock to avoid fluctuating with current stock)
        const prodAny = product as any;
        const initialStock = Number(
          prodAny.initialStock !== undefined && prodAny.initialStock !== null && !isNaN(Number(prodAny.initialStock))
            ? prodAny.initialStock
            : (prodAny.initialStockQty !== undefined && prodAny.initialStockQty !== null && !isNaN(Number(prodAny.initialStockQty))
                ? prodAny.initialStockQty
                : (product.stock || 0))
        ) || 0;
        if (initialStock !== 0) {
          whStockMap[defaultWhId] = (whStockMap[defaultWhId] || 0) + initialStock;
          kardexRawItems.push({
            id: `init-${product.id}`,
            type: 'initial_stock',
            documentType: 'initial_stock',
            date: (product as any).createdAt ? formatDateDisplay((product as any).createdAt) : '---',
            invoiceNumber: product.code ? `INIT-${product.code}` : 'موجودی اولیه',
            quantity: Math.abs(initialStock),
            inQuantity: initialStock > 0 ? initialStock : 0,
            outQuantity: initialStock < 0 ? Math.abs(initialStock) : 0,
            isSecondaryUnit: false,
            unitPrice: product.purchasePrice || 0,
            totalPrice: Math.abs(initialStock) * (product.purchasePrice || 0),
            personName: 'سیستم (موجودی اول دوره)',
            warehouseId: defaultWhId,
            warehouseName: loadedWh.find(w => String(w.id) === defaultWhId)?.name || 'انبار اصلی',
            description: 'ثبت موجودی اولیه در بدو تعریف کالا',
            timestamp: (product as any).createdAt ? new Date((product as any).createdAt).getTime() : 1
          });
        }

        // Loop over invoices to extract Purchases, Sales, and Warehouse docs
        (loadedInvoices || []).forEach((inv: any) => {
          if (inv.status === 'voided' || inv.isDeleted) return;

          const invType = inv.type || inv.invoiceType || '';
          const isPurchase = invType === 'purchase' || invType === 'purchase_invoice';
          const isPurchaseReturn = invType === 'purchase_return';
          const isSale = invType === 'sale' || invType === 'sales_invoice';
          const isSaleReturn = invType === 'sales_return' || invType === 'sale_return';
          const isWarehouseReceipt = invType === 'warehouse_receipt';
          const isWarehouseRemittance = invType === 'warehouse_remittance';
          const isWaste = invType === 'waste';

          const invDate = inv.jalaliDate || (inv.date ? formatDateDisplay(inv.date) : '---');
          const invNumber = inv.invoiceNumber || inv.documentNumber || (inv.id ? String(inv.id).slice(0, 8) : '---');
          const personObj = (loadedPersons || []).find((p: any) => String(p.id) === String(inv.customerId || inv.personId));
          const personName = personObj?.name || inv.customerName || inv.personName || 'طرف حساب متفرقه';
          const whId = (inv.warehouseId || defaultWhId).toString();
          const whObj = (loadedWh || []).find((w: any) => String(w.id) === whId);
          const warehouseName = whObj?.name || 'انبار پیش‌فرض';
          const invTimestamp = inv.createdAt ? new Date(inv.createdAt).getTime() : (inv.date ? new Date(inv.date).getTime() : Date.now());

          if (inv.items && Array.isArray(inv.items)) {
            inv.items.forEach((item: any, itemIdx: number) => {
              if (!matchProductItem(item)) return;

              const isSec = Boolean(item.isSecondaryUnit) || (Boolean(product.secondaryUnit) && item.selectedUnit === product.secondaryUnit);
              const ratio = Number(item.unitRatio || product.unitRatio || 1);
              const dir = item.unitRatioDirection || product.unitRatioDirection || (product ? getUnitRatioDirection(product) : 'secondary_to_main');
              const rawUnitPrice = Number(item.unitPrice) || 0;
              const rawQuantity = Number(item.quantity) || 0;

              const baseQuantity = isSec && ratio > 0
                ? convertQuantityToBaseUnit(rawQuantity, true, ratio, dir)
                : (item.baseQuantity !== undefined && item.baseQuantity !== null && !isNaN(Number(item.baseQuantity)) && Number(item.baseQuantity) > 0
                    ? Number(item.baseQuantity)
                    : rawQuantity);

              const baseUnitPrice = isSec && ratio > 0
                ? convertPriceToBaseUnit(rawUnitPrice, true, ratio, dir)
                : (item.baseUnitPrice !== undefined && item.baseUnitPrice !== null && !isNaN(Number(item.baseUnitPrice)) && Number(item.baseUnitPrice) > 0
                    ? Number(item.baseUnitPrice)
                    : rawUnitPrice);

              const lineDiscount = Number(item.discount || item.discountAmount || 0);
              const lineTax = Number(item.tax || item.taxAmount || 0);
              const lineTotal = Number(item.totalPrice) > 0
                ? Number(item.totalPrice)
                : Math.max(0, (baseQuantity * baseUnitPrice) - lineDiscount + lineTax);

              const itemWhId = (item.warehouseId || whId).toString();
              const itemWhObj = (loadedWh || []).find((w: any) => String(w.id) === itemWhId);
              const itemWarehouseName = itemWhObj?.name || warehouseName;

              const record = {
                id: `${inv.id || 'inv'}-${itemIdx}`,
                invoiceId: inv.id,
                invoiceNumber: invNumber,
                type: invType,
                date: invDate,
                timestamp: invTimestamp,
                personId: inv.customerId || inv.personId,
                personName,
                warehouseId: itemWhId,
                warehouseName: itemWarehouseName,
                rawQuantity,
                rawUnitPrice,
                baseQuantity,
                baseUnitPrice,
                selectedUnit: item.selectedUnit || (isSec ? product.secondaryUnit : product.unit),
                isSecondaryUnit: isSec,
                discount: lineDiscount,
                tax: lineTax,
                totalPrice: lineTotal,
                status: inv.status || 'approved',
                isDraft: Boolean(inv.isDraft || inv.status === 'draft'),
                warehouseReceiptStatus: inv.warehouseReceiptStatus || (inv.status === 'approved' ? 'received' : 'pending'),
                description: item.description || inv.description || '',
              };

              // Collect Purchases
              if (isPurchase || isPurchaseReturn) {
                extractedPurchases.push({
                  ...record,
                  isReturn: isPurchaseReturn,
                  badgeLabel: isPurchaseReturn ? 'برگشت از خرید' : 'فاکتور خرید',
                  badgeColor: isPurchaseReturn ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                });
              }

              // Collect Sales
              if (isSale || isSaleReturn) {
                extractedSales.push({
                  ...record,
                  isReturn: isSaleReturn,
                  badgeLabel: isSaleReturn ? 'برگشت از فروش' : 'فاکتور فروش',
                  badgeColor: isSaleReturn ? 'text-purple-700 bg-purple-50 border-purple-200' : 'text-blue-700 bg-blue-50 border-blue-200'
                });
              }

              // Collect Warehouse physical movements
              if (isWarehouseReceipt || isWarehouseRemittance || isWaste) {
                extractedWarehouseDocs.push({
                  ...record,
                  badgeLabel: isWarehouseReceipt ? 'رسید انبار' : isWarehouseRemittance ? 'حواله انبار' : 'ضایعات',
                  direction: isWarehouseReceipt ? 'in' : 'out',
                  quantity: baseQuantity,
                });
              }
            });
          }
        });

        // 6. Build Physical Kardex Ledger
        // Check if dedicated inventory_transactions exist for this product
        if (loadedInvTx && loadedInvTx.length > 0) {
          loadedInvTx.forEach((tx: any) => {
            if (tx.documentType === 'initial_stock' && initialStock !== 0) return; // avoid duplicate initial stock

            const isInput = tx.type === 'in';
            const qty = Number(tx.quantity) || 0;
            const txWhId = (tx.warehouseId || defaultWhId).toString();
            whStockMap[txWhId] = (whStockMap[txWhId] || 0) + (isInput ? qty : -qty);

            const txPerson = (loadedPersons || []).find((p: any) => String(p.id) === String(tx.personId));
            const personName = tx.personName || txPerson?.name || '---';
            const whObj = (loadedWh || []).find((w: any) => String(w.id) === txWhId);

            kardexRawItems.push({
              id: tx.id || `tx-${Math.random()}`,
              type: tx.documentType || (isInput ? 'warehouse_receipt' : 'warehouse_remittance'),
              documentType: tx.documentType || (isInput ? 'warehouse_receipt' : 'warehouse_remittance'),
              date: tx.date || (tx.timestamp ? formatDateDisplay(tx.timestamp) : '---'),
              invoiceNumber: tx.documentNumber || tx.invoiceNumber || '---',
              quantity: qty,
              inQuantity: isInput ? qty : 0,
              outQuantity: !isInput ? qty : 0,
              originalQuantity: tx.originalQuantity !== undefined ? Number(tx.originalQuantity) : qty,
              originalUnitPrice: tx.originalUnitPrice !== undefined ? Number(tx.originalUnitPrice) : Number(tx.unitPrice || 0),
              selectedUnit: tx.selectedUnit || (tx.isSecondaryUnit ? product.secondaryUnit : product.unit),
              isSecondaryUnit: Boolean(tx.isSecondaryUnit),
              unitPrice: Number(tx.unitPrice || 0),
              totalPrice: Number(tx.totalPrice || (qty * Number(tx.unitPrice || 0))),
              personName,
              warehouseId: txWhId,
              warehouseName: whObj?.name || 'انبار پیش‌فرض',
              description: tx.description || (isInput ? 'ورود به انبار' : 'خروج از انبار'),
              timestamp: tx.timestamp || Date.now()
            });
          });
        } else {
          // Fallback: If no dedicated kardex rows seeded yet, derive from extracted receipts, remittances and approved invoices
          (loadedInvoices || []).forEach((inv: any) => {
            if (inv.status === 'voided' || inv.isDeleted || inv.status === 'draft' || inv.isDraft) return;
            const invType = inv.type || inv.invoiceType || '';
            const isReceipt = invType === 'warehouse_receipt';
            const isRemittance = invType === 'warehouse_remittance' || invType === 'waste';

            // Only actual warehouse receipts and remittances belong in physical Kardex
            if (!isReceipt && !isRemittance) return;

            if (!inv.items || !Array.isArray(inv.items)) return;

            inv.items.forEach((item: any) => {
              if (!matchProductItem(item)) return;

              const isSec = Boolean(item.isSecondaryUnit) || (Boolean(product.secondaryUnit) && item.selectedUnit === product.secondaryUnit);
              const ratio = Number(item.unitRatio || product.unitRatio || 1);
              const dir = item.unitRatioDirection || product.unitRatioDirection || (product ? getUnitRatioDirection(product) : 'secondary_to_main');
              const rawUnitPrice = Number(item.unitPrice) || 0;
              const rawQuantity = Number(item.quantity) || 0;

              const qty = isSec && ratio > 0
                ? convertQuantityToBaseUnit(rawQuantity, true, ratio, dir)
                : (item.baseQuantity !== undefined && item.baseQuantity !== null && !isNaN(Number(item.baseQuantity)) && Number(item.baseQuantity) > 0
                    ? Number(item.baseQuantity)
                    : rawQuantity);

              const uPrice = isSec && ratio > 0
                ? convertPriceToBaseUnit(rawUnitPrice, true, ratio, dir)
                : (item.baseUnitPrice !== undefined && item.baseUnitPrice !== null && !isNaN(Number(item.baseUnitPrice)) && Number(item.baseUnitPrice) > 0
                    ? Number(item.baseUnitPrice)
                    : rawUnitPrice);

              const itemWhId = (item.warehouseId || inv.warehouseId || defaultWhId).toString();
              const whObj = (loadedWh || []).find((w: any) => String(w.id) === itemWhId);
              const pName = (loadedPersons || []).find((p: any) => String(p.id) === String(inv.customerId || inv.personId))?.name || inv.customerName || inv.personName || '---';

              if (isReceipt || isRemittance) {
                whStockMap[itemWhId] = (whStockMap[itemWhId] || 0) + (isReceipt ? qty : -qty);
              }

              kardexRawItems.push({
                id: `fallback-${inv.id}-${Math.random()}`,
                type: invType,
                documentType: invType,
                date: inv.jalaliDate || (inv.date ? formatDateDisplay(inv.date) : '---'),
                invoiceNumber: inv.invoiceNumber || inv.documentNumber || '---',
                quantity: qty,
                inQuantity: isReceipt ? qty : 0,
                outQuantity: isRemittance ? qty : 0,
                originalQuantity: rawQuantity,
                originalUnitPrice: rawUnitPrice,
                selectedUnit: item.selectedUnit || (isSec ? product.secondaryUnit : product.unit),
                isSecondaryUnit: isSec,
                unitPrice: uPrice,
                totalPrice: Number(item.totalPrice) > 0 ? Number(item.totalPrice) : qty * uPrice,
                personName: pName,
                warehouseId: itemWhId,
                warehouseName: whObj?.name || 'انبار پیش‌فرض',
                description: inv.description || item.description || (isReceipt ? `ورود به انبار بابت ${inv.invoiceNumber || ''}` : `خروج از انبار بابت ${inv.invoiceNumber || ''}`),
                timestamp: inv.createdAt ? new Date(inv.createdAt).getTime() : Date.now()
              });
            });
          });
        }

        // Sort chronological for running balance
        const chronological = [...kardexRawItems].sort(compareKardexTransactions);
        let runningBalance = 0;
        const finalizedKardex = chronological.map((row, idx) => {
          const inQ = Number(row.inQuantity || 0);
          const outQ = Number(row.outQuantity || 0);
          const balBefore = runningBalance;
          runningBalance = runningBalance + inQ - outQ;
          return {
            ...row,
            rowNumber: idx + 1,
            inQuantity: inQ,
            outQuantity: outQ,
            balanceBefore: balBefore,
            balanceAfter: runningBalance,
            balanceValue: runningBalance * (Number(row.unitPrice) || product.purchasePrice || 0)
          };
        });

        // Set all resolved state
        setPurchaseInvoices(extractedPurchases.sort((a, b) => b.timestamp - a.timestamp));
        setSalesInvoices(extractedSales.sort((a, b) => b.timestamp - a.timestamp));
        setWarehouseDocs(extractedWarehouseDocs.sort((a, b) => b.timestamp - a.timestamp));
        setKardexLedger(finalizedKardex);
        setCalculatedStock(runningBalance);
        setStockPerWarehouse(whStockMap);
      } catch (err) {
        console.error('Error fetching comprehensive product card data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAllProductData();
    return () => {
      isMounted = false;
    };
  }, [product.id, product.code, product.warehouseId, product.stock, activeWarehouses.length, activePersons.length]);

  // Comprehensive Financial & Inventory Analytics
  const analytics = useMemo(() => {
    // 1. Purchases stats
    const totalPurchaseInvoices = purchaseInvoices.filter(p => !p.isReturn).length;
    const totalPurchasedQty = purchaseInvoices.reduce((sum, p) => sum + (p.isReturn ? -p.baseQuantity : p.baseQuantity), 0);
    const totalPurchaseCost = purchaseInvoices.reduce((sum, p) => sum + (p.isReturn ? -p.totalPrice : p.totalPrice), 0);
    const weightedAvgPurchasePrice = totalPurchasedQty > 0 ? (totalPurchaseCost / totalPurchasedQty) : (product.purchasePrice || 0);

    const validPurchasePrices = purchaseInvoices.map(p => p.baseUnitPrice).filter(p => p > 0);
    const minPurchasePrice = validPurchasePrices.length > 0 ? Math.min(...validPurchasePrices) : (product.purchasePrice || 0);
    const maxPurchasePrice = validPurchasePrices.length > 0 ? Math.max(...validPurchasePrices) : (product.purchasePrice || 0);

    // 2. Sales stats
    const totalSalesInvoices = salesInvoices.filter(s => !s.isReturn).length;
    const totalSoldQty = salesInvoices.reduce((sum, s) => sum + (s.isReturn ? -s.baseQuantity : s.baseQuantity), 0);
    const totalSalesRevenue = salesInvoices.reduce((sum, s) => sum + (s.isReturn ? -s.totalPrice : s.totalPrice), 0);
    const weightedAvgSalePrice = totalSoldQty > 0 ? (totalSalesRevenue / totalSoldQty) : (product.price || 0);

    const validSalePrices = salesInvoices.map(s => s.baseUnitPrice).filter(p => p > 0);
    const minSalePrice = validSalePrices.length > 0 ? Math.min(...validSalePrices) : (product.price || 0);
    const maxSalePrice = validSalePrices.length > 0 ? Math.max(...validSalePrices) : (product.price || 0);

    // 3. Profitability Metrics
    const grossProfitPerUnit = weightedAvgSalePrice - weightedAvgPurchasePrice;
    const grossMarginPercent = weightedAvgSalePrice > 0 ? (grossProfitPerUnit / weightedAvgSalePrice) * 100 : 0;
    const totalRealizedGrossProfit = Math.max(0, totalSoldQty * grossProfitPerUnit);
    const markupPercent = weightedAvgPurchasePrice > 0 ? (grossProfitPerUnit / weightedAvgPurchasePrice) * 100 : 0;

    // 4. Inventory Valuation
    const finalStock = calculatedStock;
    const stockValuationPurchase = Math.max(0, finalStock * (currentPurchasePrice || weightedAvgPurchasePrice));
    const stockValuationSale = Math.max(0, finalStock * (currentSalePrice || weightedAvgSalePrice));
    const potentialStockProfit = Math.max(0, stockValuationSale - stockValuationPurchase);

    // 5. Velocity and Reorder Point Alert
    const minStock = Number(product.minStock || product.minStockLevel || 0);
    const maxStock = Number(product.maxStock || 0);
    const isBelowMin = minStock > 0 && finalStock <= minStock;
    const isDeficit = finalStock < 0;

    // Daily Sales Rate (approx over all sales or last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const salesInLast30Days = salesInvoices
      .filter(s => s.timestamp >= thirtyDaysAgo && !s.isReturn)
      .reduce((sum, s) => sum + s.baseQuantity, 0);
    const dailySalesRate = salesInLast30Days > 0 ? salesInLast30Days / 30 : (totalSoldQty > 0 ? totalSoldQty / 90 : 0);
    const daysOfStockCover = dailySalesRate > 0 && finalStock > 0 ? Math.round(finalStock / dailySalesRate) : null;
    const turnoverRatio = finalStock > 0 ? Number((totalSoldQty / finalStock).toFixed(2)) : 0;

    return {
      totalPurchaseInvoices,
      totalPurchasedQty,
      totalPurchaseCost,
      weightedAvgPurchasePrice,
      minPurchasePrice,
      maxPurchasePrice,
      totalSalesInvoices,
      totalSoldQty,
      totalSalesRevenue,
      weightedAvgSalePrice,
      minSalePrice,
      maxSalePrice,
      grossProfitPerUnit,
      grossMarginPercent,
      totalRealizedGrossProfit,
      markupPercent,
      finalStock,
      stockValuationPurchase,
      stockValuationSale,
      potentialStockProfit,
      minStock,
      maxStock,
      isBelowMin,
      isDeficit,
      dailySalesRate,
      daysOfStockCover,
      turnoverRatio,
      salesInLast30Days
    };
  }, [purchaseInvoices, salesInvoices, calculatedStock, product, currentPurchasePrice, currentSalePrice]);

  // Aggregated Partner (Supplier & Customer) Statistics
  const partnerStats = useMemo(() => {
    const suppliers: Record<string, { id: string; name: string; invoiceCount: number; totalQty: number; totalAmount: number; lastDate: string; avgPrice: number }> = {};
    const customers: Record<string, { id: string; name: string; invoiceCount: number; totalQty: number; totalAmount: number; lastDate: string; avgPrice: number }> = {};

    purchaseInvoices.forEach(p => {
      const name = p.personName || 'نامشخص';
      if (!suppliers[name]) {
        suppliers[name] = { id: p.personId, name, invoiceCount: 0, totalQty: 0, totalAmount: 0, lastDate: p.date, avgPrice: 0 };
      }
      suppliers[name].invoiceCount += 1;
      suppliers[name].totalQty += p.baseQuantity;
      suppliers[name].totalAmount += p.totalPrice;
      if (!suppliers[name].lastDate || new Date(p.date) > new Date(suppliers[name].lastDate)) {
        suppliers[name].lastDate = p.date;
      }
    });

    salesInvoices.forEach(s => {
      const name = s.personName || 'نامشخص';
      if (!customers[name]) {
        customers[name] = { id: s.personId, name, invoiceCount: 0, totalQty: 0, totalAmount: 0, lastDate: s.date, avgPrice: 0 };
      }
      customers[name].invoiceCount += 1;
      customers[name].totalQty += s.baseQuantity;
      customers[name].totalAmount += s.totalPrice;
      if (!customers[name].lastDate || new Date(s.date) > new Date(customers[name].lastDate)) {
        customers[name].lastDate = s.date;
      }
    });

    // Compute averages
    Object.values(suppliers).forEach(s => {
      s.avgPrice = s.totalQty > 0 ? Math.round(s.totalAmount / s.totalQty) : 0;
    });
    Object.values(customers).forEach(c => {
      c.avgPrice = c.totalQty > 0 ? Math.round(c.totalAmount / c.totalQty) : 0;
    });

    return {
      suppliersList: Object.values(suppliers).sort((a, b) => b.totalAmount - a.totalAmount),
      customersList: Object.values(customers).sort((a, b) => b.totalAmount - a.totalAmount)
    };
  }, [purchaseInvoices, salesInvoices]);

  // Price Chart Data
  const chartData = useMemo(() => {
    return [...priceHistory].reverse().map((h: any) => ({
      ...h,
      salePrice: h.type === 'sale' ? Number(h.price) : null,
      purchasePrice: h.type === 'purchase' ? Number(h.price) : null,
      date: formatDateDisplay(h.date),
    }));
  }, [priceHistory]);

  // Excel Export Handler for Kardex
  const handleExportKardexExcel = () => {
    const filteredKardex = kardexWarehouseFilter === 'all'
      ? kardexLedger
      : kardexLedger.filter(k => String(k.warehouseId) === String(kardexWarehouseFilter));

    exportToExcel({
      filename: `کاردکس_کالا_${product.name}_${new Date().toLocaleDateString('fa-IR')}.xlsx`,
      title: `گزارش کاردکس گردش کالا: ${product.name} (کد: ${product.code || '---'})`,
      subtitle: `تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')} | انبار: ${kardexWarehouseFilter === 'all' ? 'تمام انبارها' : activeWarehouses.find(w => String(w.id) === kardexWarehouseFilter)?.name || 'انبار انتخابی'}`,
      columns: [
        { header: 'ردیف', key: 'rowNumber', isNumeric: true },
        { header: 'تاریخ', key: 'date' },
        { header: 'شماره سند', key: 'invoiceNumber' },
        { header: 'نوع عملیات', key: 'operationTitle' },
        { header: 'طرف حساب', key: 'personName' },
        { header: 'انبار', key: 'warehouseName' },
        { header: 'واحد', key: 'selectedUnit' },
        { header: 'وارده (+)', key: 'inQuantity', isNumeric: true },
        { header: 'صادره (-)', key: 'outQuantity', isNumeric: true },
        { header: 'مانده موجودی', key: 'balanceAfter', isNumeric: true },
        { header: 'قیمت واحد (فی)', key: 'unitPrice', isNumeric: true },
        { header: 'ارزش مانده', key: 'balanceValue', isNumeric: true },
        { header: 'توضیحات', key: 'description' }
      ],
      data: filteredKardex.map(row => ({
        ...row,
        operationTitle: row.type === 'initial_stock' ? 'موجودی اولیه' :
          row.type === 'warehouse_receipt' ? 'رسید انبار' :
          row.type === 'warehouse_remittance' ? 'حواله انبار' :
          row.type === 'purchase' ? 'فاکتور خرید' :
          row.type === 'sale' ? 'فاکتور فروش' :
          row.type === 'sales_return' ? 'برگشت از فروش' :
          row.type === 'purchase_return' ? 'برگشت از خرید' :
          row.type === 'waste' ? 'ضایعات' : row.type
      })),
      storeSettings
    });
  };

  // Excel Export Handler for Purchases
  const handleExportPurchasesExcel = () => {
    exportToExcel({
      filename: `فاکتورهای_خرید_${product.name}_${new Date().toLocaleDateString('fa-IR')}.xlsx`,
      title: `سوابق فاکتورهای خرید کالا: ${product.name}`,
      columns: [
        { header: 'شماره فاکتور', key: 'invoiceNumber' },
        { header: 'تاریخ', key: 'date' },
        { header: 'تامین‌کننده', key: 'personName' },
        { header: 'انبار', key: 'warehouseName' },
        { header: 'تعداد', key: 'baseQuantity', isNumeric: true },
        { header: 'واحد', key: 'selectedUnit' },
        { header: 'فی خرید', key: 'baseUnitPrice', isNumeric: true },
        { header: 'تخفیف', key: 'discount', isNumeric: true },
        { header: 'مبلغ کل', key: 'totalPrice', isNumeric: true },
        { header: 'وضعیت فاکتور', key: 'status' },
        { header: 'وضعیت رسید انبار', key: 'warehouseReceiptStatus' }
      ],
      data: purchaseInvoices,
      storeSettings
    });
  };

  // Excel Export Handler for Sales
  const handleExportSalesExcel = () => {
    exportToExcel({
      filename: `فاکتورهای_فروش_${product.name}_${new Date().toLocaleDateString('fa-IR')}.xlsx`,
      title: `سوابق فاکتورهای فروش کالا: ${product.name}`,
      columns: [
        { header: 'شماره فاکتور', key: 'invoiceNumber' },
        { header: 'تاریخ', key: 'date' },
        { header: 'مشتری', key: 'personName' },
        { header: 'انبار', key: 'warehouseName' },
        { header: 'تعداد', key: 'baseQuantity', isNumeric: true },
        { header: 'واحد', key: 'selectedUnit' },
        { header: 'فی فروش', key: 'baseUnitPrice', isNumeric: true },
        { header: 'تخفیف', key: 'discount', isNumeric: true },
        { header: 'مبلغ کل', key: 'totalPrice', isNumeric: true },
        { header: 'وضعیت فاکتور', key: 'status' }
      ],
      data: salesInvoices,
      storeSettings
    });
  };

  // Filtered Kardex
  const filteredKardexRows = useMemo(() => {
    let rows = kardexWarehouseFilter === 'all'
      ? kardexLedger
      : kardexLedger.filter(k => String(k.warehouseId) === String(kardexWarehouseFilter));

    if (kardexTypeFilter !== 'all') {
      if (kardexTypeFilter === 'in') {
        rows = rows.filter(r => r.inQuantity > 0);
      } else if (kardexTypeFilter === 'out') {
        rows = rows.filter(r => r.outQuantity > 0);
      } else {
        rows = rows.filter(r => r.type === kardexTypeFilter);
      }
    }

    if (kardexSearchQuery.trim()) {
      const q = kardexSearchQuery.trim().toLowerCase();
      rows = rows.filter(r =>
        (r.invoiceNumber && String(r.invoiceNumber).toLowerCase().includes(q)) ||
        (r.personName && String(r.personName).toLowerCase().includes(q)) ||
        (r.description && String(r.description).toLowerCase().includes(q))
      );
    }

    return rows;
  }, [kardexLedger, kardexWarehouseFilter, kardexTypeFilter, kardexSearchQuery]);

  // Filtered Purchases
  const filteredPurchaseRows = useMemo(() => {
    let rows = purchaseInvoices;
    if (purchaseStatusFilter !== 'all') {
      rows = rows.filter(p => p.status === purchaseStatusFilter);
    }
    if (purchaseSearchQuery.trim()) {
      const q = purchaseSearchQuery.trim().toLowerCase();
      rows = rows.filter(p =>
        (p.invoiceNumber && String(p.invoiceNumber).toLowerCase().includes(q)) ||
        (p.personName && String(p.personName).toLowerCase().includes(q)) ||
        (p.warehouseName && String(p.warehouseName).toLowerCase().includes(q)) ||
        (p.description && String(p.description).toLowerCase().includes(q))
      );
    }
    return rows;
  }, [purchaseInvoices, purchaseStatusFilter, purchaseSearchQuery]);

  // Filtered Sales
  const filteredSalesRows = useMemo(() => {
    let rows = salesInvoices;
    if (salesStatusFilter !== 'all') {
      rows = rows.filter(s => s.status === salesStatusFilter);
    }
    if (salesSearchQuery.trim()) {
      const q = salesSearchQuery.trim().toLowerCase();
      rows = rows.filter(s =>
        (s.invoiceNumber && String(s.invoiceNumber).toLowerCase().includes(q)) ||
        (s.personName && String(s.personName).toLowerCase().includes(q)) ||
        (s.warehouseName && String(s.warehouseName).toLowerCase().includes(q)) ||
        (s.description && String(s.description).toLowerCase().includes(q))
      );
    }
    return rows;
  }, [salesInvoices, salesStatusFilter, salesSearchQuery]);

  // Main Card Modal / View JSX
  const mainContent = (
    <motion.div
      initial={isModal ? { opacity: 0, scale: 0.96 } : { opacity: 0 }}
      animate={isModal ? { opacity: 1, scale: 1 } : { opacity: 1 }}
      exit={isModal ? { opacity: 0, scale: 0.96 } : undefined}
      className={`bg-white rounded-3xl w-full ${isModal ? 'max-w-6xl max-h-[92vh]' : 'h-full min-h-[580px] border border-slate-200'} overflow-hidden shadow-2xl flex flex-col font-sans`}
      dir="rtl"
    >
      {/* Header Banner */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-800 truncate">{product.name}</h2>
              {product.code && (
                <span className="font-mono text-xs font-bold bg-indigo-100/70 text-indigo-700 px-2.5 py-0.5 rounded-lg border border-indigo-200/50">
                  کد: {product.code}
                </span>
              )}
              {product.barcode && (
                <span className="font-mono text-xs text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {product.barcode}
                </span>
              )}
              {analytics.isDeficit && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-300">
                  <AlertCircle className="w-3.5 h-3.5" /> کسری موجودی
                </span>
              )}
              {analytics.isBelowMin && !analytics.isDeficit && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" /> زیر نقطه سفارش
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
              <span>دسته‌بندی: <strong className="text-slate-700">{product.category || 'عمومی'}</strong></span>
              <span>واحد اصلی: <strong className="text-slate-700">{product.unit || 'عدد'}</strong></span>
              {product.secondaryUnit && (
                <span>واحد فرعی: <strong className="text-indigo-600">{product.secondaryUnit}</strong> (ضریب: {product.unitRatio || 1})</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintKardexOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors shadow-2xs"
            title="چاپ رسمی کاردکس A4"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">چاپ کاردکس</span>
          </button>
          {isModal ? (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors"
              aria-label="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              بازگشت به فهرست کالاها
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="border-b border-slate-200 px-6 bg-white overflow-x-auto custom-scrollbar flex gap-2 pt-2">
        <button
          onClick={() => setActiveTab('kardex')}
          className={`pb-3 px-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 relative ${
            activeTab === 'kardex' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          کاردکس کالا
          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">
            {kardexLedger.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 px-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 relative ${
            activeTab === 'purchases' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          فاکتورهای خرید کالا
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            purchaseInvoices.length > 0 ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-500'
          }`}>
            {purchaseInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 px-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 relative ${
            activeTab === 'sales' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          فاکتورهای فروش کالا
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            salesInvoices.length > 0 ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-500'
          }`}>
            {salesInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 relative ${
            activeTab === 'analytics' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          تحلیل سودآوری و شاخص‌ها
          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
            هوشمند
          </span>
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`pb-3 px-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 relative ${
            activeTab === 'info' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          مشخصات و موجودی انبارها
        </button>

        <button
          onClick={() => setActiveTab('warehouse')}
          className={`pb-3 px-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 relative ${
            activeTab === 'warehouse' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          اسناد و گردش انبار
          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">
            {warehouseDocs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('persons')}
          className={`pb-3 px-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 relative ${
            activeTab === 'persons' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          مشتریان و تامین‌کنندگان
          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">
            {partnerStats.suppliersList.length + partnerStats.customersList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('price_chart')}
          className={`pb-3 px-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 relative ${
            activeTab === 'price_chart' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          نمودار و تاریخچه قیمت
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/40">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <span className="text-sm font-bold text-slate-600">در حال استخراج و تحلیل جامع سوابق، فاکتورها و کاردکس کالا...</span>
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* TAB 1: KARDEX (کاردکس کالا) */}
            {/* ========================================================================= */}
            {activeTab === 'kardex' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Kardex Quick KPI Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">موجودی اول دوره</span>
                    <span className="text-base sm:text-lg font-mono font-black text-slate-800" dir="ltr">
                      {formatNum(analytics.finalStock - (filteredKardexRows.reduce((s, k) => s + k.inQuantity - k.outQuantity, 0) - (filteredKardexRows.find(k => k.type === 'initial_stock')?.inQuantity || 0)))} <span className="text-xs font-normal font-sans text-slate-500">{product.unit || 'عدد'}</span>
                    </span>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-emerald-700 block mb-1 flex items-center gap-1">
                      <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                      جمع کل وارده (+)
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-emerald-800" dir="ltr">
                      +{formatNum(filteredKardexRows.reduce((s, k) => s + k.inQuantity, 0))} <span className="text-xs font-normal font-sans text-emerald-600">{product.unit || 'عدد'}</span>
                    </span>
                  </div>

                  <div className="bg-rose-50/70 border border-rose-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-rose-700 block mb-1 flex items-center gap-1">
                      <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-600" />
                      جمع کل صادره (-)
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-rose-800" dir="ltr">
                      -{formatNum(filteredKardexRows.reduce((s, k) => s + k.outQuantity, 0))} <span className="text-xs font-normal font-sans text-rose-600">{product.unit || 'عدد'}</span>
                    </span>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-indigo-700 block mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      مانده نهایی کاردکس
                    </span>
                    <span className="text-lg sm:text-xl font-mono font-black text-indigo-900" dir="ltr">
                      {formatNum(filteredKardexRows.length > 0 ? filteredKardexRows[filteredKardexRows.length - 1].balanceAfter : 0)} <span className="text-xs font-normal font-sans text-indigo-700">{product.unit || 'عدد'}</span>
                    </span>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl shadow-3xs col-span-2 lg:col-span-1">
                    <span className="text-[11px] font-bold text-amber-800 block mb-1 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                      ارزش ریالی مانده انبار
                    </span>
                    <span className="text-base sm:text-lg font-mono font-black text-amber-900" dir="ltr">
                      {formatCur(analytics.stockValuationPurchase)} <span className="text-[10px] font-normal font-sans text-amber-700">{currency}</span>
                    </span>
                  </div>
                </div>

                {/* Filters and Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-3xs">
                  <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={kardexSearchQuery}
                      onChange={(e) => setKardexSearchQuery(e.target.value)}
                      placeholder="جستجوی شماره سند، شخص یا توضیحات در کاردکس..."
                      className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Warehouse Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-slate-500">انبار:</span>
                      <select
                        value={kardexWarehouseFilter}
                        onChange={(e) => setKardexWarehouseFilter(e.target.value)}
                        className="bg-transparent text-slate-800 outline-none cursor-pointer text-xs font-bold"
                      >
                        <option value="all">تمام انبارها (کاردکس کل)</option>
                        {activeWarehouses.map((w, idx) => (
                          <option key={w.id || idx} value={String(w.id)}>{w.name || (w as any).title}</option>
                        ))}
                      </select>
                    </div>

                    {/* Operation Type Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <select
                        value={kardexTypeFilter}
                        onChange={(e) => setKardexTypeFilter(e.target.value)}
                        className="bg-transparent text-slate-800 outline-none cursor-pointer text-xs font-bold"
                      >
                        <option value="all">تمام عملیات‌ها</option>
                        <option value="in">فقط وارده (+)</option>
                        <option value="out">فقط صادره (-)</option>
                        <option value="purchase">فاکتورهای خرید</option>
                        <option value="sale">فاکتورهای فروش</option>
                        <option value="warehouse_receipt">رسید انبار</option>
                        <option value="warehouse_remittance">حواله انبار</option>
                        <option value="initial_stock">موجودی اول دوره</option>
                      </select>
                    </div>

                    {/* Export Kardex Button */}
                    <button
                      onClick={handleExportKardexExcel}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors"
                      title="خروجی فایل اکسل کاردکس"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>اکسل کاردکس</span>
                    </button>
                  </div>
                </div>

                {/* Kardex Table */}
                {filteredKardexRows.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">گردشی در کاردکس با فیلترهای انتخابی یافت نشد.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-bold">
                          <tr>
                            <th className="px-3.5 py-3 text-center w-12">ردیف</th>
                            <th className="px-3.5 py-3 whitespace-nowrap">تاریخ سند</th>
                            <th className="px-3.5 py-3 whitespace-nowrap">شماره سند</th>
                            <th className="px-3.5 py-3 whitespace-nowrap">نوع عملیات</th>
                            <th className="px-3.5 py-3">طرف حساب / شرح</th>
                            <th className="px-3.5 py-3 whitespace-nowrap">انبار</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-center text-emerald-700 bg-emerald-50/40">وارده (+)</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-center text-rose-700 bg-rose-50/40">صادره (-)</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-center text-indigo-700 bg-indigo-50/40">مانده</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-left">فی ({currency})</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-left">ارزش مانده</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredKardexRows.map((r: any, idx: number) => {
                            const isInput = r.inQuantity > 0;
                            const isOutput = r.outQuantity > 0;
                            return (
                              <tr key={r.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-3.5 py-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">{r.date || '---'}</td>
                                <td className="px-3.5 py-3 font-mono font-bold text-slate-700 whitespace-nowrap">{r.invoiceNumber || '---'}</td>
                                <td className="px-3.5 py-3 whitespace-nowrap">
                                  {r.type === 'initial_stock' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                      موجودی اولیه
                                    </span>
                                  )}
                                  {r.type === 'warehouse_receipt' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                                      رسید انبار
                                    </span>
                                  )}
                                  {r.type === 'warehouse_remittance' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                                      حواله انبار
                                    </span>
                                  )}
                                  {r.type === 'purchase' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-200">
                                      فاکتور خرید
                                    </span>
                                  )}
                                  {r.type === 'sale' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                                      فاکتور فروش
                                    </span>
                                  )}
                                  {r.type === 'sales_return' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                                      برگشت از فروش
                                    </span>
                                  )}
                                  {r.type === 'purchase_return' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                                      برگشت از خرید
                                    </span>
                                  )}
                                  {r.type === 'waste' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-md border border-red-300">
                                      ضایعات
                                    </span>
                                  )}
                                </td>
                                <td className="px-3.5 py-3">
                                  <div className="font-bold text-slate-800 truncate max-w-[170px]">{r.personName || '---'}</div>
                                  {r.description && <div className="text-[10px] text-slate-400 truncate max-w-[170px]">{r.description}</div>}
                                </td>
                                <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap text-[11px]">
                                  {r.warehouseName || activeWarehouses.find(w => String(w.id) === String(r.warehouseId))?.name || '---'}
                                </td>
                                <td className="px-3.5 py-3 text-center font-mono font-black text-emerald-700 bg-emerald-50/20 whitespace-nowrap" dir="ltr">
                                  {isInput ? `+${formatNum(r.inQuantity)}` : '-'}
                                </td>
                                <td className="px-3.5 py-3 text-center font-mono font-black text-rose-700 bg-rose-50/20 whitespace-nowrap" dir="ltr">
                                  {isOutput ? `-${formatNum(r.outQuantity)}` : '-'}
                                </td>
                                <td className="px-3.5 py-3 text-center font-mono font-black text-indigo-900 bg-indigo-50/30 whitespace-nowrap" dir="ltr">
                                  {formatNum(r.balanceAfter)}
                                </td>
                                <td className="px-3.5 py-3 text-left font-mono text-slate-700 whitespace-nowrap" dir="ltr">
                                  {r.unitPrice ? formatNum(r.unitPrice) : '---'}
                                </td>
                                <td className="px-3.5 py-3 text-left font-mono font-bold text-slate-800 whitespace-nowrap" dir="ltr">
                                  {r.balanceValue ? formatCur(r.balanceValue) : '---'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: PURCHASE INVOICES (فاکتورهای خرید کالا - حل قطعی مشکل عدم نمایش) */}
            {/* ========================================================================= */}
            {activeTab === 'purchases' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Purchase KPI Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">تعداد فاکتورهای خرید</span>
                    <span className="text-xl font-mono font-black text-slate-800" dir="ltr">
                      {formatNum(analytics.totalPurchaseInvoices)} <span className="text-xs font-normal font-sans text-slate-400">فقره</span>
                    </span>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-emerald-800 block mb-1">کل حجم خریداری‌شده</span>
                    <span className="text-xl font-mono font-black text-emerald-800" dir="ltr">
                      {formatNum(analytics.totalPurchasedQty)} <span className="text-xs font-normal font-sans text-emerald-600">{product.unit || 'عدد'}</span>
                    </span>
                  </div>

                  <div className="bg-teal-50/70 border border-teal-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-teal-800 block mb-1">میانگین موزون قیمت خرید</span>
                    <span className="text-xl font-mono font-black text-teal-900" dir="ltr">
                      {formatCur(analytics.weightedAvgPurchasePrice)} <span className="text-xs font-normal font-sans text-teal-600">{currency}</span>
                    </span>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-indigo-700 block mb-1">کل ارزش خریدهای ثبت‌شده</span>
                    <span className="text-xl font-mono font-black text-indigo-900" dir="ltr">
                      {formatCur(analytics.totalPurchaseCost)} <span className="text-xs font-normal font-sans text-indigo-600">{currency}</span>
                    </span>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-3xs">
                  <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={purchaseSearchQuery}
                      onChange={(e) => setPurchaseSearchQuery(e.target.value)}
                      placeholder="جستجو در فاکتورهای خرید (شماره، نام تامین‌کننده، انبار)..."
                      className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <select
                        value={purchaseStatusFilter}
                        onChange={(e) => setPurchaseStatusFilter(e.target.value)}
                        className="bg-transparent text-slate-800 outline-none cursor-pointer text-xs font-bold"
                      >
                        <option value="all">تمام وضعیت‌ها</option>
                        <option value="approved">فاکتورهای تایید شده</option>
                        <option value="draft">پیش‌نویس‌ها</option>
                        <option value="pending_approval">در انتظار تایید</option>
                      </select>
                    </div>

                    <button
                      onClick={handleExportPurchasesExcel}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors"
                      title="خروجی فاکتورهای خرید به اکسل"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>اکسل خرید</span>
                    </button>
                  </div>
                </div>

                {/* Purchases Table */}
                {filteredPurchaseRows.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <h4 className="text-sm font-bold text-slate-700 mb-1">فاکتور خریدی برای این کالا ثبت نشده یا با فیلترها همخوانی ندارد.</h4>
                    <p className="text-xs text-slate-400">به محض ثبت فاکتور خرید حاوی این کالا، کلیه جزئیات سطر و انبار در این جدول نمایش داده می‌شود.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                          <tr>
                            <th className="px-3.5 py-3 whitespace-nowrap">نوع / شماره سند</th>
                            <th className="px-3.5 py-3 whitespace-nowrap">تاریخ</th>
                            <th className="px-3.5 py-3">تامین‌کننده / فروشنده</th>
                            <th className="px-3.5 py-3 whitespace-nowrap">انبار مقصد</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-center">مقدار خریداری‌شده</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-left">فی واحد ({currency})</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-left">تخفیف سطر</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-left">مبلغ کل ({currency})</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-center">وضعیت فاکتور</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-center">رسید انبار</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPurchaseRows.map((p: any, idx: number) => (
                            <tr key={p.id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <div className="font-mono font-bold text-slate-800">{p.invoiceNumber || '---'}</div>
                                {p.isReturn ? (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">برگشت از خرید</span>
                                ) : (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">فاکتور خرید</span>
                                )}
                              </td>
                              <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">{p.date || '---'}</td>
                              <td className="px-3.5 py-3 font-bold text-slate-800">
                                <div className="truncate max-w-[160px]">{p.personName || '---'}</div>
                              </td>
                              <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap text-[11px]">{p.warehouseName || '---'}</td>
                              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                <span className="font-mono font-black text-emerald-700" dir="ltr">
                                  {formatNum(p.baseQuantity)} {product.unit || 'عدد'}
                                </span>
                                {p.isSecondaryUnit && p.rawQuantity && (
                                  <div className="text-[10px] text-indigo-600 font-sans">
                                    معادل {formatNum(p.rawQuantity)} {p.selectedUnit}
                                  </div>
                                )}
                              </td>
                              <td className="px-3.5 py-3 text-left font-mono font-bold text-slate-800 whitespace-nowrap" dir="ltr">
                                {formatNum(p.baseUnitPrice)}
                                {p.isSecondaryUnit && p.rawUnitPrice && (
                                  <div className="text-[10px] text-slate-400 font-sans">
                                    فی فرعی: {formatNum(p.rawUnitPrice)}
                                  </div>
                                )}
                              </td>
                              <td className="px-3.5 py-3 text-left font-mono text-slate-500 whitespace-nowrap" dir="ltr">
                                {p.discount > 0 ? formatNum(p.discount) : '-'}
                              </td>
                              <td className="px-3.5 py-3 text-left font-mono font-black text-indigo-900 whitespace-nowrap" dir="ltr">
                                {formatCur(p.totalPrice)}
                              </td>
                              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                {p.status === 'approved' ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    تایید شده
                                  </span>
                                ) : p.isDraft ? (
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                    پیش‌نویس
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    {p.status || 'در انتظار'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                {p.warehouseReceiptStatus === 'received' || p.status === 'approved' ? (
                                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                                    رسید شده
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    در انتظار رسید
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: SALES INVOICES (فاکتورهای فروش کالا) */}
            {/* ========================================================================= */}
            {activeTab === 'sales' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Sales KPI Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">تعداد فاکتورهای فروش</span>
                    <span className="text-xl font-mono font-black text-slate-800" dir="ltr">
                      {formatNum(analytics.totalSalesInvoices)} <span className="text-xs font-normal font-sans text-slate-400">فقره</span>
                    </span>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-blue-800 block mb-1">کل حجم فروخته‌شده</span>
                    <span className="text-xl font-mono font-black text-blue-800" dir="ltr">
                      {formatNum(analytics.totalSoldQty)} <span className="text-xs font-normal font-sans text-blue-600">{product.unit || 'عدد'}</span>
                    </span>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-indigo-700 block mb-1">میانگین موزون قیمت فروش</span>
                    <span className="text-xl font-mono font-black text-indigo-900" dir="ltr">
                      {formatCur(analytics.weightedAvgSalePrice)} <span className="text-xs font-normal font-sans text-indigo-600">{currency}</span>
                    </span>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl shadow-3xs">
                    <span className="text-[11px] font-bold text-emerald-800 block mb-1">کل درآمد حاصل از فروش</span>
                    <span className="text-xl font-mono font-black text-emerald-900" dir="ltr">
                      {formatCur(analytics.totalSalesRevenue)} <span className="text-xs font-normal font-sans text-emerald-600">{currency}</span>
                    </span>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-3xs">
                  <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={salesSearchQuery}
                      onChange={(e) => setSalesSearchQuery(e.target.value)}
                      placeholder="جستجو در فاکتورهای فروش (شماره، مشتری، انبار)..."
                      className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <select
                        value={salesStatusFilter}
                        onChange={(e) => setSalesStatusFilter(e.target.value)}
                        className="bg-transparent text-slate-800 outline-none cursor-pointer text-xs font-bold"
                      >
                        <option value="all">تمام وضعیت‌ها</option>
                        <option value="approved">فاکتورهای تایید شده</option>
                        <option value="draft">پیش‌نویس‌ها</option>
                      </select>
                    </div>

                    <button
                      onClick={handleExportSalesExcel}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors"
                      title="خروجی فاکتورهای فروش به اکسل"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>اکسل فروش</span>
                    </button>
                  </div>
                </div>

                {/* Sales Table */}
                {filteredSalesRows.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <h4 className="text-sm font-bold text-slate-700 mb-1">فاکتور فروشی برای این کالا ثبت نشده است.</h4>
                    <p className="text-xs text-slate-400">به محض ثبت فاکتورهای فروش در سیستم، لیست دقیق آن‌ها در این بخش قرار می‌گیرد.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                          <tr>
                            <th className="px-3.5 py-3 whitespace-nowrap">نوع / شماره سند</th>
                            <th className="px-3.5 py-3 whitespace-nowrap">تاریخ</th>
                            <th className="px-3.5 py-3">مشتری / خریدار</th>
                            <th className="px-3.5 py-3 whitespace-nowrap">انبار مبدا</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-center">مقدار فروش</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-left">فی واحد ({currency})</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-left">تخفیف سطر</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-left">مبلغ نهایی ({currency})</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-center">وضعیت فاکتور</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSalesRows.map((s: any, idx: number) => (
                            <tr key={s.id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <div className="font-mono font-bold text-slate-800">{s.invoiceNumber || '---'}</div>
                                {s.isReturn ? (
                                  <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">برگشت از فروش</span>
                                ) : (
                                  <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">فاکتور فروش</span>
                                )}
                              </td>
                              <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">{s.date || '---'}</td>
                              <td className="px-3.5 py-3 font-bold text-slate-800">
                                <div className="truncate max-w-[160px]">{s.personName || '---'}</div>
                              </td>
                              <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap text-[11px]">{s.warehouseName || '---'}</td>
                              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                <span className="font-mono font-black text-blue-700" dir="ltr">
                                  {formatNum(s.baseQuantity)} {product.unit || 'عدد'}
                                </span>
                                {s.isSecondaryUnit && s.rawQuantity && (
                                  <div className="text-[10px] text-indigo-600 font-sans">
                                    معادل {formatNum(s.rawQuantity)} {s.selectedUnit}
                                  </div>
                                )}
                              </td>
                              <td className="px-3.5 py-3 text-left font-mono font-bold text-slate-800 whitespace-nowrap" dir="ltr">
                                {formatNum(s.baseUnitPrice)}
                                {s.isSecondaryUnit && s.rawUnitPrice && (
                                  <div className="text-[10px] text-slate-400 font-sans">
                                    فی فرعی: {formatNum(s.rawUnitPrice)}
                                  </div>
                                )}
                              </td>
                              <td className="px-3.5 py-3 text-left font-mono text-slate-500 whitespace-nowrap" dir="ltr">
                                {s.discount > 0 ? formatNum(s.discount) : '-'}
                              </td>
                              <td className="px-3.5 py-3 text-left font-mono font-black text-indigo-900 whitespace-nowrap" dir="ltr">
                                {formatCur(s.totalPrice)}
                              </td>
                              <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                {s.status === 'approved' ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    تایید شده
                                  </span>
                                ) : s.isDraft ? (
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                    پیش‌نویس
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    {s.status || 'در انتظار'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: ADVANCED BUSINESS & PROFITABILITY ANALYTICS (تحلیل هوشمند سودآوری) */}
            {/* ========================================================================= */}
            {activeTab === 'analytics' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Profitability Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Gross Profit Per Unit */}
                  <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-3xl border border-indigo-100 shadow-3xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-indigo-700">سود ناخالص هر واحد کالا</span>
                      <Award className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="text-2xl font-mono font-black text-slate-800 mb-1" dir="ltr">
                      {formatCur(analytics.grossProfitPerUnit)} <span className="text-xs font-normal font-sans text-slate-500">{currency}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      اختلاف میانگین قیمت فروش موزون ({formatNum(analytics.weightedAvgSalePrice)}) و بهای تمام‌شده خرید ({formatNum(analytics.weightedAvgPurchasePrice)})
                    </p>
                    <div className="mt-3 pt-3 border-t border-indigo-100/60 flex items-center justify-between text-xs font-bold text-indigo-700">
                      <span>حاشیه سود ناخالص (Gross Margin):</span>
                      <span className="font-mono text-sm">{analytics.grossMarginPercent.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Total Realized Profit */}
                  <div className="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-3xl border border-emerald-100 shadow-3xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-emerald-800">کل سود ناخالص محقق‌شده</span>
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-mono font-black text-emerald-900 mb-1" dir="ltr">
                      {formatCur(analytics.totalRealizedGrossProfit)} <span className="text-xs font-normal font-sans text-emerald-700">{currency}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      مجموع بازدهی و ارزش افزوده ریالی ایجاد شده از فروش {formatNum(analytics.totalSoldQty)} {product.unit || 'عدد'} از این کالا
                    </p>
                    <div className="mt-3 pt-3 border-t border-emerald-100/60 flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span>سود بالقوه موجودی در انبار:</span>
                      <span className="font-mono text-sm">{formatCur(analytics.potentialStockProfit)} {currency}</span>
                    </div>
                  </div>

                  {/* Velocity & Stock Days Cover */}
                  <div className="bg-gradient-to-br from-amber-50 to-white p-5 rounded-3xl border border-amber-100 shadow-3xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-amber-800">سرعت گردش و پوشش انبار</span>
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="text-2xl font-mono font-black text-amber-900 mb-1" dir="ltr">
                      {analytics.daysOfStockCover !== null ? `${formatNum(analytics.daysOfStockCover)} روز` : 'نامحدود / بدون فروش'}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      تخمین پوشش موجودی فعلی بر اساس میانگین فروش روزانه ({analytics.dailySalesRate.toFixed(2)} {product.unit || 'عدد'} در روز)
                    </p>
                    <div className="mt-3 pt-3 border-t border-amber-100/60 flex items-center justify-between text-xs font-bold text-amber-800">
                      <span>نرخ گردش کالا (Turnover):</span>
                      <span className="font-mono text-sm">{analytics.turnoverRatio}x</span>
                    </div>
                  </div>
                </div>

                {/* Comparative Table: Cost vs Revenue */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs">
                  <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                    مقایسه تحلیلی ارقام خرید و فروش کالا
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Purchases Column */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                          <ShoppingCart className="w-4 h-4 text-emerald-600" /> سمت خرید (ورودی و تامین)
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-600">{analytics.totalPurchaseInvoices} فاکتور</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">حجم کل خریداری شده:</span>
                        <span className="font-bold font-mono text-slate-800" dir="ltr">{formatNum(analytics.totalPurchasedQty)} {product.unit || 'عدد'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">میانگین موزون قیمت خرید:</span>
                        <span className="font-bold font-mono text-emerald-700" dir="ltr">{formatCur(analytics.weightedAvgPurchasePrice)} {currency}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">کمترین و بیشترین فی خرید:</span>
                        <span className="font-bold font-mono text-slate-700" dir="ltr">{formatNum(analytics.minPurchasePrice)} تا {formatNum(analytics.maxPurchasePrice)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">آخرین قیمت خرید ثبت‌شده:</span>
                        <span className="font-bold font-mono text-slate-800" dir="ltr">{formatCur(currentPurchasePrice)} {currency}</span>
                      </div>
                    </div>

                    {/* Sales Column */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-black text-blue-800 flex items-center gap-1.5">
                          <ShoppingBag className="w-4 h-4 text-blue-600" /> سمت فروش (خروجی و مشتریان)
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-600">{analytics.totalSalesInvoices} فاکتور</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">حجم کل فروخته شده:</span>
                        <span className="font-bold font-mono text-slate-800" dir="ltr">{formatNum(analytics.totalSoldQty)} {product.unit || 'عدد'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">میانگین موزون قیمت فروش:</span>
                        <span className="font-bold font-mono text-blue-700" dir="ltr">{formatCur(analytics.weightedAvgSalePrice)} {currency}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">کمترین و بیشترین فی فروش:</span>
                        <span className="font-bold font-mono text-slate-700" dir="ltr">{formatNum(analytics.minSalePrice)} تا {formatNum(analytics.maxSalePrice)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">آخرین قیمت فروش ثبت‌شده:</span>
                        <span className="font-bold font-mono text-slate-800" dir="ltr">{formatCur(currentSalePrice)} {currency}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Status & Reorder Intelligence */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      analytics.isDeficit ? 'bg-rose-100 text-rose-600' :
                      analytics.isBelowMin ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {analytics.isDeficit ? <AlertCircle className="w-6 h-6" /> :
                       analytics.isBelowMin ? <AlertTriangle className="w-6 h-6" /> :
                       <CheckCircle2 className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        وضعیت موجودی انبار: {analytics.isDeficit ? 'کسری موجودی منفی' : analytics.isBelowMin ? 'زیر حداقل موجودی (هشدار سفارش)' : 'مطلوب و متعادل'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        حداقل موجودی تعیین‌شده: <strong>{formatNum(analytics.minStock)} {product.unit || 'عدد'}</strong> | موجودی مستند فعلی: <strong className="text-indigo-600">{formatNum(analytics.finalStock)} {product.unit || 'عدد'}</strong>
                      </p>
                    </div>
                  </div>
                  {analytics.isBelowMin && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-2xl text-xs font-bold">
                      پیشنهاد سفارش خرید: حداقل {formatNum(Math.max(1, (analytics.minStock * 2) - analytics.finalStock))} {product.unit || 'عدد'}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: SPECIFICATIONS & WAREHOUSE BREAKDOWN (مشخصات و موجودی انبارها) */}
            {/* ========================================================================= */}
            {activeTab === 'info' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* 4 Main Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl">
                    <span className="text-xs text-indigo-700 font-bold block mb-1">کد کالا</span>
                    <span className="text-base font-mono font-black text-slate-800">{product.code || '---'}</span>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl">
                    <span className="text-xs text-emerald-700 font-bold block mb-1">قیمت فروش فعلی</span>
                    <span className="text-base font-sans font-black text-slate-800" dir="ltr">
                      {formatCur(currentSalePrice)} <span className="text-xs font-normal text-slate-500">{currency}</span>
                    </span>
                    {lastSaleDate && <span className="text-[10px] text-emerald-800 mt-1 block">آخرین تغییر: {formatDateDisplay(lastSaleDate)}</span>}
                  </div>

                  <div className="bg-rose-50/60 border border-rose-100 p-4 rounded-2xl">
                    <span className="text-xs text-rose-700 font-bold block mb-1">قیمت خرید فعلی</span>
                    <span className="text-base font-sans font-black text-slate-800" dir="ltr">
                      {formatCur(currentPurchasePrice)} <span className="text-xs font-normal text-slate-500">{currency}</span>
                    </span>
                    {lastPurchaseDate && <span className="text-[10px] text-rose-800 mt-1 block">آخرین تغییر: {formatDateDisplay(lastPurchaseDate)}</span>}
                  </div>

                  <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-2xl">
                    <span className="text-xs text-amber-700 font-bold block mb-1">موجودی مستند کاردکس</span>
                    <span className="text-lg font-mono font-black text-slate-800" dir="ltr">
                      {formatNum(calculatedStock)} <span className="text-xs font-normal text-slate-500">{product.unit || 'عدد'}</span>
                    </span>
                    {product.secondaryUnit && product.unitRatio && (
                      <div className="text-[10px] text-amber-800 mt-1 font-bold">
                        {(() => {
                          const dir = product.unitRatioDirection || getUnitRatioDirection(product);
                          if (dir === 'main_to_secondary') {
                            return `معادل ${toPersianDigits(calculatedStock * product.unitRatio)} ${product.secondaryUnit}`;
                          } else {
                            if (calculatedStock >= product.unitRatio) {
                              return `معادل ${toPersianDigits(Math.floor(calculatedStock / product.unitRatio))} ${product.secondaryUnit} و ${toPersianDigits(calculatedStock % product.unitRatio)} ${product.unit}`;
                            }
                            return `کمتر از ۱ ${product.secondaryUnit}`;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Detailed Attributes Grid */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs">
                  <h4 className="text-xs font-black text-slate-700 mb-4 pb-2 border-b border-slate-100">مشخصات فنی و شناسنامه کالا</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1">بارکد استاندارد:</span>
                      <span className="font-mono font-bold text-slate-800">{product.barcode || '---'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">نوع کالا:</span>
                      <span className="font-bold text-slate-800">{product.type === 'service' ? 'خدمات' : 'کالای فیزیکی'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">دسته‌بندی:</span>
                      <span className="font-bold text-slate-800">{product.category || 'عمومی'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">وضعیت فعالیت:</span>
                      <span className={`font-bold ${product.isActive !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {product.isActive !== false ? 'فعال در سیستم' : 'غیرفعال'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">واحد اصلی / فرعی:</span>
                      <span className="font-bold text-slate-800">
                        {product.unit || 'عدد'}
                        {product.secondaryUnit ? ` / ${product.secondaryUnit}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">ضریب تبدیل واحد:</span>
                      <span className="font-bold text-indigo-700">
                        {product.secondaryUnit ? formatUnitConversionFormula(product.unit || 'عدد', product.secondaryUnit, product.unitRatio || 1, product.unitRatioDirection || getUnitRatioDirection(product), toPersianDigits) : 'تک واحدی'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">حداقل موجودی (نقطه هشدار):</span>
                      <span className="font-bold font-mono text-slate-800">{product.minStock || product.minStockLevel || 'تعریف نشده'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">حداکثر موجودی مجاز:</span>
                      <span className="font-bold font-mono text-slate-800">{product.maxStock || 'تعریف نشده'}</span>
                    </div>
                    <div className="col-span-2 md:col-span-4">
                      <span className="text-slate-400 block mb-1">توضیحات و مشخصات تکمیلی:</span>
                      <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                        {product.description || 'توضیحاتی برای این کالا ثبت نشده است.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stock per Warehouse breakdown */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-3xs">
                  <h4 className="text-xs font-black text-slate-700 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-600" />
                    موجودی تفکیکی به ازای تک‌تک انبارها
                  </h4>
                  {Object.keys(stockPerWarehouse).length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">گردش انباری ثبت نشده است.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(stockPerWarehouse).map(([wId, qty]) => {
                        const wh = activeWarehouses.find(w => String(w.id) === String(wId));
                        const whName = wh?.name || (wId === 'unknown' ? 'انبار عمومی / پیش‌فرض' : 'انبار نامشخص');
                        const sharePercent = calculatedStock > 0 ? Math.max(0, Math.round((qty / calculatedStock) * 100)) : 0;
                        return (
                          <div key={wId} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-slate-700 truncate max-w-[170px]">{whName}</span>
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                {sharePercent}% سهم
                              </span>
                            </div>
                            <div className="text-lg font-mono font-black text-slate-800" dir="ltr">
                              {formatNum(qty)} <span className="text-xs font-normal font-sans text-slate-500">{product.unit || 'عدد'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: WAREHOUSE DOCUMENTS (اسناد انبار - رسید و حواله) */}
            {/* ========================================================================= */}
            {activeTab === 'warehouse' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">اسناد مستقیم انبارداری (رسیدهای ورود، حواله‌های خروج و ضایعات)</span>
                  <span className="text-xs text-slate-400 font-mono">مجموع: {warehouseDocs.length} سند</span>
                </div>

                {warehouseDocs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                    <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">سند مستقیم انبارداری برای این کالا ثبت نشده است.</p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                          <tr>
                            <th className="px-3.5 py-3 whitespace-nowrap">نوع سند</th>
                            <th className="px-3.5 py-3 whitespace-nowrap">تاریخ</th>
                            <th className="px-3.5 py-3 whitespace-nowrap">شماره سند</th>
                            <th className="px-3.5 py-3">شخص / تحویل‌گیرنده</th>
                            <th className="px-3.5 py-3 whitespace-nowrap">انبار</th>
                            <th className="px-3.5 py-3 whitespace-nowrap text-center">مقدار</th>
                            <th className="px-3.5 py-3">توضیحات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {warehouseDocs.map((doc: any, idx: number) => (
                            <tr key={doc.id || idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3.5 py-3 whitespace-nowrap font-bold">
                                {doc.direction === 'in' ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    رسید انبار (ورود)
                                  </span>
                                ) : (
                                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                    حواله انبار (خروج)
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">{doc.date || '---'}</td>
                              <td className="px-3.5 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">{doc.invoiceNumber || '---'}</td>
                              <td className="px-3.5 py-3 font-bold text-slate-800 truncate max-w-[150px]">{doc.personName || '---'}</td>
                              <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">{doc.warehouseName || '---'}</td>
                              <td className="px-3.5 py-3 text-center font-mono font-black whitespace-nowrap" dir="ltr">
                                <span className={doc.direction === 'in' ? 'text-emerald-700' : 'text-rose-700'}>
                                  {doc.direction === 'in' ? '+' : '-'}{formatNum(doc.quantity)} {product.unit || 'عدد'}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 text-slate-500 text-[11px] truncate max-w-[180px]">{doc.description || '---'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: PERSONS & PARTNERS (مشتریان و تامین‌کنندگان تفکیکی) */}
            {/* ========================================================================= */}
            {activeTab === 'persons' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Switcher */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-3xs w-fit">
                  <button
                    onClick={() => setPersonTabFilter('all')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      personTabFilter === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    همه طرف‌های حساب ({partnerStats.suppliersList.length + partnerStats.customersList.length})
                  </button>
                  <button
                    onClick={() => setPersonTabFilter('suppliers')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      personTabFilter === 'suppliers' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    تامین‌کنندگان این کالا ({partnerStats.suppliersList.length})
                  </button>
                  <button
                    onClick={() => setPersonTabFilter('customers')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      personTabFilter === 'customers' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    خریداران و مشتریان ({partnerStats.customersList.length})
                  </button>
                </div>

                {/* Suppliers Table */}
                {(personTabFilter === 'all' || personTabFilter === 'suppliers') && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-4">
                    <h3 className="text-xs font-black text-emerald-800 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      تامین‌کنندگان و فروشندگان این کالا
                    </h3>
                    {partnerStats.suppliersList.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">تامین‌کننده‌ای برای این کالا ثبت نشده است.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                            <tr>
                              <th className="px-3.5 py-3">نام تامین‌کننده</th>
                              <th className="px-3.5 py-3 text-center">دفعات خرید</th>
                              <th className="px-3.5 py-3 text-center">مجموع حجم خریداری‌شده</th>
                              <th className="px-3.5 py-3 text-left">میانگین فی خرید ({currency})</th>
                              <th className="px-3.5 py-3 text-left">مجموع مبلغ خرید ({currency})</th>
                              <th className="px-3.5 py-3 whitespace-nowrap">آخرین معامله</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {partnerStats.suppliersList.map((sup, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3.5 py-3 font-bold text-slate-800">{sup.name}</td>
                                <td className="px-3.5 py-3 text-center font-mono font-bold text-slate-700">{sup.invoiceCount}</td>
                                <td className="px-3.5 py-3 text-center font-mono font-black text-emerald-700" dir="ltr">
                                  {formatNum(sup.totalQty)} {product.unit || 'عدد'}
                                </td>
                                <td className="px-3.5 py-3 text-left font-mono font-bold text-slate-700" dir="ltr">{formatCur(sup.avgPrice)}</td>
                                <td className="px-3.5 py-3 text-left font-mono font-black text-indigo-900" dir="ltr">{formatCur(sup.totalAmount)}</td>
                                <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">{sup.lastDate || '---'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Customers Table */}
                {(personTabFilter === 'all' || personTabFilter === 'customers') && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-4">
                    <h3 className="text-xs font-black text-blue-800 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-blue-600" />
                      مشتریان و خریداران این کالا
                    </h3>
                    {partnerStats.customersList.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">مشتری‌ای برای این کالا ثبت نشده است.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                            <tr>
                              <th className="px-3.5 py-3">نام مشتری</th>
                              <th className="px-3.5 py-3 text-center">دفعات خرید</th>
                              <th className="px-3.5 py-3 text-center">مجموع حجم خریداری‌شده</th>
                              <th className="px-3.5 py-3 text-left">میانگین فی فروش ({currency})</th>
                              <th className="px-3.5 py-3 text-left">مجموع مبلغ فروش ({currency})</th>
                              <th className="px-3.5 py-3 whitespace-nowrap">آخرین معامله</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {partnerStats.customersList.map((cust, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3.5 py-3 font-bold text-slate-800">{cust.name}</td>
                                <td className="px-3.5 py-3 text-center font-mono font-bold text-slate-700">{cust.invoiceCount}</td>
                                <td className="px-3.5 py-3 text-center font-mono font-black text-blue-700" dir="ltr">
                                  {formatNum(cust.totalQty)} {product.unit || 'عدد'}
                                </td>
                                <td className="px-3.5 py-3 text-left font-mono font-bold text-slate-700" dir="ltr">{formatCur(cust.avgPrice)}</td>
                                <td className="px-3.5 py-3 text-left font-mono font-black text-indigo-900" dir="ltr">{formatCur(cust.totalAmount)}</td>
                                <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">{cust.lastDate || '---'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* TAB 8: PRICE HISTORY & TRENDS CHART (نمودار و تاریخچه قیمت) */}
            {/* ========================================================================= */}
            {activeTab === 'price_chart' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {priceHistory.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                    <TrendingUp className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">سابقه‌ای برای نمایش نمودار قیمت ثبت نشده است.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs" dir="ltr">
                      <div className="flex justify-between items-center mb-4 px-2" dir="rtl">
                        <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-indigo-600" />
                          نمودار تحلیلی نوسان قیمت خرید و فروش کالا
                        </h4>
                        <div className="flex items-center gap-4 text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-blue-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> قیمت فروش
                          </span>
                          <span className="flex items-center gap-1.5 text-emerald-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> قیمت خرید
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickMargin={10} />
                            <YAxis
                              stroke="#94a3b8"
                              fontSize={11}
                              tickFormatter={(value) => new Intl.NumberFormat('fa-IR').format(value)}
                              width={75}
                            />
                            <Tooltip
                              formatter={(value: any, name: string) => [
                                new Intl.NumberFormat('fa-IR').format(value) + ` ${currency}`,
                                name === 'salePrice' ? 'قیمت فروش' : 'قیمت خرید'
                              ]}
                              labelFormatter={(label) => `تاریخ: ${label}`}
                              contentStyle={{
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                fontFamily: 'inherit'
                              }}
                              itemStyle={{ textAlign: 'right' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Line connectNulls type="monotone" dataKey="salePrice" name="قیمت فروش" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                            <Line connectNulls type="monotone" dataKey="purchasePrice" name="قیمت خرید" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Price History Table */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs">
                      <h4 className="text-xs font-black text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-600" />
                        سوابق ثبت تغییرات قیمت
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                            <tr>
                              <th className="px-3.5 py-2.5">تاریخ تغییر</th>
                              <th className="px-3.5 py-2.5">نوع قیمت</th>
                              <th className="px-3.5 py-2.5 text-left">مبلغ ({currency})</th>
                              <th className="px-3.5 py-2.5">علت / سند</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {priceHistory.slice(0, 15).map((ph, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">{formatDateDisplay(ph.date)}</td>
                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                  {ph.type === 'sale' ? (
                                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px] font-bold">فروش</span>
                                  ) : (
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px] font-bold">خرید</span>
                                  )}
                                </td>
                                <td className="px-3.5 py-2.5 text-left font-mono font-bold text-slate-800 whitespace-nowrap" dir="ltr">
                                  {formatCur(ph.price)}
                                </td>
                                <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">{ph.reason || ph.documentNumber || 'ثبت در سیستم'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {isModal && (
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            موجودی فعلی کالا: <strong className="text-slate-800">{formatNum(calculatedStock)} {product.unit || 'عدد'}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors"
          >
            بستن کارت کالا
          </button>
        </div>
      )}

      {/* Dedicated Print Kardex Modal */}
      {isPrintKardexOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden font-sans text-right" dir="rtl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-800 text-sm">پیش‌نمایش چاپ رسمی کاردکس: {product.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  چاپ سند
                </button>
                <button
                  onClick={() => setIsPrintKardexOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-6 print:p-0">
              {/* Header Box */}
              <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-black text-slate-900 mb-1">{storeSettings?.company_name || 'کسب‌وکار'}</h2>
                  <h3 className="text-sm font-bold text-indigo-700">فرم رسمی کاردکس و گردش ریالی و تعدادی کالا</h3>
                </div>
                <div className="text-xs text-slate-600 space-y-1 text-left" dir="ltr">
                  <div>تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</div>
                  <div>کد کالا: {product.code || '---'}</div>
                  <div>واحد: {product.unit || 'عدد'}</div>
                </div>
              </div>

              {/* Printable Table */}
              <table className="w-full text-right text-xs border border-slate-300 border-collapse">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="border border-slate-300 p-2 text-center w-10">ردیف</th>
                    <th className="border border-slate-300 p-2">تاریخ</th>
                    <th className="border border-slate-300 p-2">شماره سند</th>
                    <th className="border border-slate-300 p-2">شرح عملیات / طرف حساب</th>
                    <th className="border border-slate-300 p-2 text-center">وارده (+)</th>
                    <th className="border border-slate-300 p-2 text-center">صادره (-)</th>
                    <th className="border border-slate-300 p-2 text-center">مانده موجودی</th>
                    <th className="border border-slate-300 p-2 text-left">فی ({currency})</th>
                    <th className="border border-slate-300 p-2 text-left">ارزش مانده</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKardexRows.map((k, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 whitespace-nowrap">{k.date}</td>
                      <td className="border border-slate-300 p-2 font-mono">{k.invoiceNumber}</td>
                      <td className="border border-slate-300 p-2">{k.personName} - {k.description || ''}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono" dir="ltr">{k.inQuantity > 0 ? formatNum(k.inQuantity) : '-'}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono" dir="ltr">{k.outQuantity > 0 ? formatNum(k.outQuantity) : '-'}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono font-bold" dir="ltr">{formatNum(k.balanceAfter)}</td>
                      <td className="border border-slate-300 p-2 text-left font-mono" dir="ltr">{k.unitPrice ? formatNum(k.unitPrice) : '-'}</td>
                      <td className="border border-slate-300 p-2 text-left font-mono" dir="ltr">{k.balanceValue ? formatCur(k.balanceValue) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-12 border-t border-slate-300 text-center text-xs font-bold text-slate-700">
                <div className="space-y-12">
                  <span>امضای انباردار</span>
                  <div className="border-b border-dotted border-slate-400 w-32 mx-auto"></div>
                </div>
                <div className="space-y-12">
                  <span>امضای مدیر لجستیک</span>
                  <div className="border-b border-dotted border-slate-400 w-32 mx-auto"></div>
                </div>
                <div className="space-y-12">
                  <span>امضای امور مالی و حسابداری</span>
                  <div className="border-b border-dotted border-slate-400 w-32 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        {mainContent}
      </div>
    );
  }

  return <div>{mainContent}</div>;
}
