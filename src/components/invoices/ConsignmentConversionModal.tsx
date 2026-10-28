import React, { useState, useMemo } from 'react';
import { 
  X, CheckCircle2, RotateCcw, ArrowRightLeft, FileCheck, 
  AlertTriangle, Package, Calendar, User, ShieldCheck, Printer, Check
} from 'lucide-react';
import { toPersianDigits, addCommas } from '../../utils/format';
import { Invoice, InvoiceItem } from '../../types';
import { addInvoice, updateInvoice } from '../../services/invoiceService';

interface ConsignmentConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consignmentInvoice: Invoice | null;
  mode: 'convert' | 'return' | 'receipt';
  onSuccess: () => void;
  warehouses: any[];
  products: any[];
}

export default function ConsignmentConversionModal({
  isOpen,
  onClose,
  consignmentInvoice,
  mode: initialMode,
  onSuccess,
  warehouses,
  products
}: ConsignmentConversionModalProps) {
  const [activeTab, setActiveTab] = useState<'convert' | 'return' | 'receipt'>(initialMode);
  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; selected: boolean }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNote, setSuccessNote] = useState('');

  // Sync state when invoice changes
  React.useEffect(() => {
    setActiveTab(initialMode);
    if (consignmentInvoice && consignmentInvoice.items) {
      const initial: Record<string, { quantity: number; selected: boolean }> = {};
      consignmentInvoice.items.forEach(item => {
        const remaining = (item.remainingQuantity !== undefined)
          ? item.remainingQuantity
          : Math.max(0, item.quantity - (item.settledQuantity || 0) - (item.returnedQuantity || 0));
        initial[item.id] = {
          quantity: remaining,
          selected: remaining > 0
        };
      });
      setSelectedItems(initial);
      setErrorMsg('');
      setSuccessNote('');
    }
  }, [consignmentInvoice, initialMode]);

  if (!isOpen || !consignmentInvoice) return null;

  const isOut = consignmentInvoice.type === 'consignment_out';
  const targetType = isOut ? 'sale' : 'purchase';
  const targetLabel = isOut ? 'فاکتور فروش قطعی' : 'فاکتور خرید قطعی';
  const counterpartyRole = isOut ? 'امانت‌گیرنده (مشتری)' : 'امانت‌دهنده (تامین‌کننده)';

  const remainingSummary = (consignmentInvoice.items || []).map(item => {
    const settled = item.settledQuantity || 0;
    const returned = item.returnedQuantity || 0;
    const remaining = (item.remainingQuantity !== undefined)
      ? item.remainingQuantity
      : Math.max(0, item.quantity - settled - returned);
    return {
      ...item,
      settled,
      returned,
      remaining
    };
  });

  const totalRemainingCount = remainingSummary.reduce((sum, i) => sum + i.remaining, 0);

  const handleQuantityChange = (itemId: string, max: number, val: number) => {
    const safeVal = Math.max(0, Math.min(max, isNaN(val) ? 0 : val));
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: safeVal
      }
    }));
  };

  const handleToggleSelect = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId]?.selected
      }
    }));
  };

  const handleSelectAll = (select: boolean) => {
    const updated: Record<string, { quantity: number; selected: boolean }> = {};
    remainingSummary.forEach(item => {
      updated[item.id] = {
        quantity: item.remaining,
        selected: select && item.remaining > 0
      };
    });
    setSelectedItems(updated);
  };

  // Convert to Final Invoice
  const handleConvertToFinal = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const itemsToConvert: InvoiceItem[] = [];
      const updatedOriginalItems = [...consignmentInvoice.items];

      remainingSummary.forEach(item => {
        const sel = selectedItems[item.id];
        if (sel && sel.selected && sel.quantity > 0) {
          itemsToConvert.push({
            ...item,
            id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            quantity: sel.quantity,
            totalPrice: sel.quantity * (item.unitPrice || 0),
            lineTotal: sel.quantity * (item.unitPrice || 0),
            discountPercent: 0,
            settledQuantity: undefined,
            returnedQuantity: undefined,
            remainingQuantity: undefined
          });

          // Update original item in consignment invoice
          const origIdx = updatedOriginalItems.findIndex(oi => oi.id === item.id);
          if (origIdx !== -1) {
            const currentSettled = updatedOriginalItems[origIdx].settledQuantity || 0;
            const newSettled = currentSettled + sel.quantity;
            const currentReturned = updatedOriginalItems[origIdx].returnedQuantity || 0;
            const newRemaining = Math.max(0, updatedOriginalItems[origIdx].quantity - newSettled - currentReturned);
            updatedOriginalItems[origIdx] = {
              ...updatedOriginalItems[origIdx],
              settledQuantity: newSettled,
              remainingQuantity: newRemaining
            };
          }
        }
      });

      if (itemsToConvert.length === 0) {
        setErrorMsg('حداقل یک ردیف با تعداد بیشتر از صفر برای تبدیل به فاکتور قطعی انتخاب کنید.');
        setIsSubmitting(false);
        return;
      }

      const totalAmount = itemsToConvert.reduce((s, i) => s + (i.totalPrice || 0), 0);
      const todayDate = new Date().toISOString().split('T')[0];

      // 1. Create Final Sale/Purchase Invoice
      const newFinalInvoice: Partial<Invoice> = {
        type: targetType,
        date: consignmentInvoice.date || todayDate,
        customerId: consignmentInvoice.customerId,
        customerName: consignmentInvoice.customerName,
        warehouseId: consignmentInvoice.warehouseId,
        status: 'final',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        subtotal: totalAmount,
        totalDiscount: 0,
        totalTax: 0,
        grandTotal: totalAmount,
        totalAmount: totalAmount,
        items: itemsToConvert,
        sourceInvoiceId: consignmentInvoice.id,
        sourceInvoiceNumber: String(consignmentInvoice.invoiceNumber),
        description: `تبدیل شده از فاکتور امانی شماره ${consignmentInvoice.invoiceNumber} (${isOut ? 'امانت پرداختی' : 'امانت دریافتی'})`
      };

      const createdFinal = await addInvoice(newFinalInvoice, false, false);

      // 2. Check if consignment is now fully settled
      const remainingTotal = updatedOriginalItems.reduce((acc, it) => {
        const rem = (it.remainingQuantity !== undefined) ? it.remainingQuantity : (it.quantity - (it.settledQuantity || 0) - (it.returnedQuantity || 0));
        return acc + rem;
      }, 0);

      const newConsignmentStatus = remainingTotal <= 0 ? 'settled' : 'partially_settled';

      const existingSettledList = consignmentInvoice.consignmentSettledInvoices || [];
      const updatedSettledList = [
        ...existingSettledList,
        {
          invoiceId: createdFinal.id,
          invoiceNumber: String(createdFinal.invoiceNumber || createdFinal.id),
          type: targetType,
          date: todayDate,
          itemsCount: itemsToConvert.length,
          amount: totalAmount
        }
      ];

      // 3. Update original consignment invoice
      await updateInvoice(consignmentInvoice.id, {
        ...consignmentInvoice,
        items: updatedOriginalItems,
        consignmentStatus: newConsignmentStatus,
        consignmentSettledInvoices: updatedSettledList
      });

      setSuccessNote(`فاکتور قطعی با شماره ${createdFinal.invoiceNumber || createdFinal.id} با موفقیت صادر شد و مانده امانی بروزرسانی گردید.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);

    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در صدور فاکتور قطعی');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Register Return of Consigned Goods
  const handleRegisterReturn = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const itemsToReturn: { item: InvoiceItem; quantity: number }[] = [];
      const updatedOriginalItems = [...consignmentInvoice.items];

      remainingSummary.forEach(item => {
        const sel = selectedItems[item.id];
        if (sel && sel.selected && sel.quantity > 0) {
          itemsToReturn.push({ item, quantity: sel.quantity });

          const origIdx = updatedOriginalItems.findIndex(oi => oi.id === item.id);
          if (origIdx !== -1) {
            const currentSettled = updatedOriginalItems[origIdx].settledQuantity || 0;
            const currentReturned = updatedOriginalItems[origIdx].returnedQuantity || 0;
            const newReturned = currentReturned + sel.quantity;
            const newRemaining = Math.max(0, updatedOriginalItems[origIdx].quantity - currentSettled - newReturned);
            updatedOriginalItems[origIdx] = {
              ...updatedOriginalItems[origIdx],
              returnedQuantity: newReturned,
              remainingQuantity: newRemaining
            };
          }
        }
      });

      if (itemsToReturn.length === 0) {
        setErrorMsg('حداقل یک ردیف کالا برای ثبت عودت انتخاب کنید.');
        setIsSubmitting(false);
        return;
      }

      // Check if all items now settled or returned
      const remainingTotal = updatedOriginalItems.reduce((acc, it) => {
        const rem = (it.remainingQuantity !== undefined) ? it.remainingQuantity : (it.quantity - (it.settledQuantity || 0) - (it.returnedQuantity || 0));
        return acc + rem;
      }, 0);

      const hasAnySettled = updatedOriginalItems.some(it => (it.settledQuantity || 0) > 0);
      const newStatus = remainingTotal <= 0 
        ? (hasAnySettled ? 'settled' : 'returned') 
        : 'partially_settled';

      await updateInvoice(consignmentInvoice.id, {
        ...consignmentInvoice,
        items: updatedOriginalItems,
        consignmentStatus: newStatus
      });

      setSuccessNote('عودت اقلام امانی با موفقیت ثبت شد و مانده کالاها بروزرسانی گردید.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);

    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ثبت عودت کالای امانی');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isOut ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                  مدیریت چرخه فاکتور امانی شماره {toPersianDigits(String(consignmentInvoice.invoiceNumber))}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isOut 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' 
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                }`}>
                  {isOut ? 'امانت پرداختی به دیگران' : 'امانت دریافتی از دیگران'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                طرف‌حساب: <span className="font-medium text-slate-700 dark:text-slate-200">{consignmentInvoice.customerName || 'نامشخص'}</span> | 
                تاریخ ثبت: <span className="font-mono">{toPersianDigits(String(consignmentInvoice.date || ''))}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-3 bg-white dark:bg-slate-900 gap-2">
          <button
            onClick={() => setActiveTab('convert')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'convert'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            تبدیل به فاکتور قطعی ({targetLabel})
          </button>

          <button
            onClick={() => setActiveTab('return')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'return'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            ثبت عودت کالای امانی
          </button>

          <button
            onClick={() => setActiveTab('receipt')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'receipt'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            رسید رسمی امانت‌داری
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNote && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successNote}</span>
            </div>
          )}

          {/* TAB 1: CONVERT TO FINAL */}
          {activeTab === 'convert' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-xl">
                <div className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <p className="font-semibold text-sm">تبدیل اقلام امانی به فاکتور قطعی ({targetLabel})</p>
                    <p>
                      با تایید این عملیات، اقلام انتخابی به فاکتور رسمی قطعی تبدیل می‌شوند و اثر مالی (بدهکاری/بستانکاری در معین شخص) ایجاد خواهد شد. مانده امانت این سند به صورت خودکار کسر می‌گردد.
                    </p>
                  </div>
                </div>
              </div>

              {totalRemainingCount === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 dark:text-slate-200">تمام اقلام این فاکتور امانی تسویه یا عودت شده‌اند</p>
                  <p className="text-xs text-slate-500 mt-1">هیچ مانده امانی برای تبدیل به فاکتور قطعی باقی نمانده است.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>اقلام باقیمانده برای تبدیل به فاکتور قطعی:</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleSelectAll(true)}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                      >
                        انتخاب همه
                      </button>
                      <span>|</span>
                      <button 
                        onClick={() => handleSelectAll(false)}
                        className="text-slate-500 hover:underline"
                      >
                        لغو انتخاب
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3 w-10 text-center">#</th>
                          <th className="p-3">نام و مشخصات کالا</th>
                          <th className="p-3 text-center">کل امانت</th>
                          <th className="p-3 text-center">تسویه شده</th>
                          <th className="p-3 text-center">عودت شده</th>
                          <th className="p-3 text-center font-bold text-amber-600 dark:text-amber-400">مانده امانی</th>
                          <th className="p-3 text-center w-36">تعداد جهت قطعی‌سازی</th>
                          <th className="p-3 text-left">مبلغ واحد (تومان)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                        {remainingSummary.map((item, idx) => {
                          const sel = selectedItems[item.id] || { quantity: 0, selected: false };
                          const isAvailable = item.remaining > 0;
                          return (
                            <tr key={item.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${!isAvailable ? 'opacity-50 bg-slate-50/50 dark:bg-slate-900/50' : ''}`}>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={!isAvailable}
                                  checked={sel.selected}
                                  onChange={() => handleToggleSelect(item.id)}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{item.productName || 'کالا'}</div>
                                {item.description && (
                                  <div className="text-[11px] text-slate-400 mt-0.5">{item.description}</div>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono">{toPersianDigits(item.quantity)} {item.selectedUnit || 'عدد'}</td>
                              <td className="p-3 text-center font-mono text-emerald-600 dark:text-emerald-400">{toPersianDigits(item.settled)}</td>
                              <td className="p-3 text-center font-mono text-indigo-600 dark:text-indigo-400">{toPersianDigits(item.returned)}</td>
                              <td className="p-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/5">{toPersianDigits(item.remaining)}</td>
                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={item.remaining}
                                  disabled={!isAvailable || !sel.selected}
                                  value={sel.quantity}
                                  onChange={(e) => handleQuantityChange(item.id, item.remaining, parseFloat(e.target.value))}
                                  className="w-24 text-center font-mono font-bold py-1 px-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-40"
                                />
                              </td>
                              <td className="p-3 text-left font-mono font-medium">{toPersianDigits(addCommas(item.unitPrice || 0))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: RETURN CONSIGNED GOODS */}
          {activeTab === 'return' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40 rounded-xl">
                <div className="flex items-start gap-3">
                  <RotateCcw className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-indigo-800 dark:text-indigo-300 space-y-1">
                    <p className="font-semibold text-sm">ثبت عودت کالای امانی به انبار</p>
                    <p>
                      {isOut 
                        ? 'کالاهایی که توسط مشتری بازگردانده شده‌اند را مشخص کنید تا مجدداً به موجودی انبار اضافه شده و از تعهد امانت شخص کسر شوند.'
                        : 'کالاهایی که به تامین‌کننده عودت داده شده‌اند را مشخص کنید تا از موجودی انبار کسر گردند.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {totalRemainingCount === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <CheckCircle2 className="w-12 h-12 text-indigo-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 dark:text-slate-200">تمام اقلام این سند تسویه یا عودت شده‌اند</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">نام و مشخصات کالا</th>
                        <th className="p-3 text-center">کل امانت</th>
                        <th className="p-3 text-center">قبلاً عودت شده</th>
                        <th className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">مانده نزد طرف‌حساب</th>
                        <th className="p-3 text-center w-36">تعداد جهت عودت فعلی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                      {remainingSummary.map((item) => {
                        const sel = selectedItems[item.id] || { quantity: 0, selected: false };
                        const isAvailable = item.remaining > 0;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                disabled={!isAvailable}
                                checked={sel.selected}
                                onChange={() => handleToggleSelect(item.id)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{item.productName || 'کالا'}</td>
                            <td className="p-3 text-center font-mono">{toPersianDigits(item.quantity)} {item.selectedUnit || 'عدد'}</td>
                            <td className="p-3 text-center font-mono text-indigo-600 dark:text-indigo-400">{toPersianDigits(item.returned)}</td>
                            <td className="p-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{toPersianDigits(item.remaining)}</td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={item.remaining}
                                disabled={!isAvailable || !sel.selected}
                                value={sel.quantity}
                                onChange={(e) => handleQuantityChange(item.id, item.remaining, parseFloat(e.target.value))}
                                className="w-24 text-center font-mono font-bold py-1 px-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-40"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRINTABLE CUSTODY RECEIPT */}
          {activeTab === 'receipt' && (
            <div className="space-y-4">
              <div className="flex justify-end mb-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow transition"
                >
                  <Printer className="w-4 h-4" />
                  چاپ سند رسمی امانت‌داری
                </button>
              </div>

              {/* Printable sheet container */}
              <div className="bg-white text-slate-900 p-8 border border-slate-300 rounded-xl shadow-sm text-xs space-y-6 print:border-none print:shadow-none print:p-0">
                {/* Header */}
                <div className="border-b-2 border-slate-800 pb-4 text-center relative">
                  <div className="absolute right-0 top-0 text-right text-[11px] text-slate-500 space-y-1">
                    <div>شماره سند: <span className="font-mono font-bold text-slate-900">{toPersianDigits(String(consignmentInvoice.invoiceNumber))}</span></div>
                    <div>تاریخ صدور: <span className="font-mono">{toPersianDigits(String(consignmentInvoice.date || ''))}</span></div>
                    <div>مهلت امانت: <span className="font-mono text-amber-700 font-bold">{toPersianDigits(String(consignmentInvoice.consignmentDueDate || 'تعیین نشده'))}</span></div>
                  </div>
                  <h2 className="text-xl font-black text-slate-900">رسید و تعهدنامه رسمی کالای امانی</h2>
                  <p className="text-xs text-slate-600 mt-1">
                    {isOut ? 'سند تحویل کالای امانی به شخص / همکار' : 'سند دریافت کالای امانی از شخص / تامین‌کننده'}
                  </p>
                  <div className="absolute left-0 top-0 text-left text-[11px] text-slate-500">
                    <div>وضعیت: <span className="font-bold text-slate-800">{consignmentInvoice.consignmentStatus === 'settled' ? 'تسویه شده' : 'امانت فعال'}</span></div>
                  </div>
                </div>

                {/* Parties Information */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="text-slate-500 block mb-1">مشخصات طرف‌حساب ({counterpartyRole}):</span>
                    <div className="font-bold text-sm text-slate-800">{consignmentInvoice.customerName || 'نامشخص'}</div>
                    {consignmentInvoice.driverPhone && (
                      <div className="text-slate-600 text-[11px] mt-0.5">تلفن: {toPersianDigits(consignmentInvoice.driverPhone)}</div>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">انبار مرجع و محل استقرار کالا:</span>
                    <div className="font-bold text-sm text-slate-800">
                      {warehouses.find(w => String(w.id) === String(consignmentInvoice.warehouseId))?.name || 'انبار مرکزی'}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <table className="w-full text-right border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                        <th className="p-2 border border-slate-300 text-center w-10">ردیف</th>
                        <th className="p-2 border border-slate-300">شرح کالا و مشخصات ظاهری</th>
                        <th className="p-2 border border-slate-300 text-center">تعداد / مقدار</th>
                        <th className="p-2 border border-slate-300 text-center">واحد</th>
                        <th className="p-2 border border-slate-300 text-left">ارزش تقویمی هر واحد (تومان)</th>
                        <th className="p-2 border border-slate-300 text-left">ارزش کل امانی (تومان)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(consignmentInvoice.items || []).map((item, idx) => (
                        <tr key={item.id} className="border-b border-slate-200">
                          <td className="p-2 border border-slate-300 text-center font-mono">{toPersianDigits(idx + 1)}</td>
                          <td className="p-2 border border-slate-300">
                            <span className="font-semibold text-slate-900">{item.productName || 'کالا'}</span>
                            {item.description && <div className="text-[11px] text-slate-500">{item.description}</div>}
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono font-bold">{toPersianDigits(item.quantity)}</td>
                          <td className="p-2 border border-slate-300 text-center">{item.selectedUnit || 'عدد'}</td>
                          <td className="p-2 border border-slate-300 text-left font-mono">{toPersianDigits(addCommas(item.unitPrice || 0))}</td>
                          <td className="p-2 border border-slate-300 text-left font-mono font-bold">{toPersianDigits(addCommas((item.quantity || 0) * (item.unitPrice || 0)))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                        <td colSpan={4} className="p-2 text-right">جمع کل ارزش تقویمی امانت:</td>
                        <td colSpan={2} className="p-2 text-left font-mono text-sm font-black text-slate-900">
                          {toPersianDigits(addCommas(consignmentInvoice.totalAmount || consignmentInvoice.grandTotal || 0))} تومان
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Legal Terms & Declaration */}
                <div className="p-4 border border-slate-300 rounded-xl bg-slate-50 text-[11px] leading-relaxed text-slate-700 space-y-2">
                  <div className="font-bold text-slate-900">مفاد و شرایط تعهد امانت‌داری:</div>
                  <p>
                    {consignmentInvoice.consignmentTerms || 
                      'اینجانب اقلام فوق را در کمال صحت، سلامت فیزیکی و با مشخصات ذکر شده به صورت کاملاً امانی دریافت نموده و متعهد می‌گردم در تاریخ سررسید مقرر، عین کالاها را مسترد نمایم یا نسبت به صدور فاکتور قطعی و تسویه حساب اقدام نمایم. در صورت مفقودی، عیب یا نقص متعهد به جبران کامل خسارت وارده بر مبنای ارزش تقویمی فوق خواهم بود.'}
                  </p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 pt-6">
                  <div className="border border-slate-300 rounded-xl p-4 text-center h-28 flex flex-col justify-between">
                    <span className="font-bold text-slate-800">امضا و اثر انگشت تحویل‌دهنده (امانت‌دهنده)</span>
                    <span className="text-[10px] text-slate-400">مهر / تاریخ</span>
                  </div>
                  <div className="border border-slate-300 rounded-xl p-4 text-center h-28 flex flex-col justify-between">
                    <span className="font-bold text-slate-800">امضا و اثر انگشت تحویل‌گیرنده (امانت‌گیرنده)</span>
                    <span className="text-[10px] text-slate-400">مهر / تاریخ</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="text-xs text-slate-500">
            {activeTab === 'convert' && `صدور فاکتور قطعی باعث ثبت بدهی/بستانکاری در حساب شخص می‌شود.`}
            {activeTab === 'return' && `ثبت عودت صرفاً گردش کالا در انبار را اصلاح می‌کند.`}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              انصراف
            </button>

            {activeTab === 'convert' && (
              <button
                onClick={handleConvertToFinal}
                disabled={isSubmitting || totalRemainingCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? 'در حال صدور فاکتور...' : `ثبت و صدور ${targetLabel}`}
              </button>
            )}

            {activeTab === 'return' && (
              <button
                onClick={handleRegisterReturn}
                disabled={isSubmitting || totalRemainingCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition"
              >
                <RotateCcw className="w-4 h-4" />
                {isSubmitting ? 'در حال ثبت عودت...' : 'ثبت عودت کالای امانی'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
