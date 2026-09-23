import React, { useState, useMemo } from 'react';
import { 
  X, Printer, CheckCircle2, Clock, AlertTriangle, 
  Search, ArrowDownRight, ArrowUpRight, Check, FileText, 
  Building2, User, Calendar, ShieldCheck, Tag
} from 'lucide-react';
import { Stocktaking, Product, Warehouse, CompanySettings } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  session: Stocktaking;
  products: Product[];
  warehouses: Warehouse[];
  companySettings?: CompanySettings | null;
  onOpenPrint?: (session: Stocktaking) => void;
  onEditSession?: (session: Stocktaking) => void;
}

export default function StocktakingDetailModal({
  isOpen,
  onClose,
  session,
  products,
  warehouses,
  companySettings,
  onOpenPrint,
  onEditSession,
}: Props) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'discrepancy' | 'deficit' | 'surplus' | 'match'>('all');

  const toPersian = (n: number | string | null | undefined) =>
    n === null || n === undefined
      ? '-'
      : n.toString().replace(/\d/g, x => ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'][parseInt(x)]);

  const formatCurrency = (amount: number) => {
    return Math.round(amount).toLocaleString('fa-IR') + ' ' + (companySettings?.currency || 'ریال');
  };

  const warehouse = warehouses.find(w => String(w.id) === String(session.warehouseId));
  const isApplied = session.status === 'applied';

  const items = session.items || [];

  // Metrics
  const stats = useMemo(() => {
    let totalItems = items.length;
    let countedCount = 0;
    let deficitCount = 0;
    let surplusCount = 0;
    let matchCount = 0;
    let totalDeficitVal = 0;
    let totalSurplusVal = 0;

    items.forEach(it => {
      if (it.countedStock !== null && it.countedStock !== undefined) {
        countedCount++;
        const p = products.find(prod => String(prod.id) === String(it.productId));
        const cost = Number(it.unitPrice || p?.purchasePrice || p?.price || 0);
        const diff = Number(it.difference || (Number(it.countedStock) - Number(it.expectedStock)));

        if (diff < 0) {
          deficitCount++;
          totalDeficitVal += Math.abs(diff) * cost;
        } else if (diff > 0) {
          surplusCount++;
          totalSurplusVal += diff * cost;
        } else {
          matchCount++;
        }
      }
    });

    return {
      totalItems,
      countedCount,
      deficitCount,
      surplusCount,
      matchCount,
      discrepancyCount: deficitCount + surplusCount,
      totalDeficitVal: session.totalDeficitValue ?? totalDeficitVal,
      totalSurplusVal: session.totalSurplusValue ?? totalSurplusVal,
      netValue: (session.totalSurplusValue ?? totalSurplusVal) - (session.totalDeficitValue ?? totalDeficitVal),
    };
  }, [items, products, session]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const p = products.find(prod => String(prod.id) === String(it.productId));
      const pName = it.productName || p?.name || '';
      const pCode = p?.code || '';
      const pBarcode = p?.barcode || '';
      const s = search.toLowerCase();

      const matchesSearch = !s || 
        pName.toLowerCase().includes(s) || 
        pCode.toLowerCase().includes(s) || 
        pBarcode.toLowerCase().includes(s);

      if (!matchesSearch) return false;

      const diff = Number(it.difference || (it.countedStock !== null ? Number(it.countedStock) - Number(it.expectedStock) : 0));

      if (filterType === 'discrepancy') return it.countedStock !== null && diff !== 0;
      if (filterType === 'deficit') return it.countedStock !== null && diff < 0;
      if (filterType === 'surplus') return it.countedStock !== null && diff > 0;
      if (filterType === 'match') return it.countedStock !== null && diff === 0;

      return true;
    });
  }, [items, products, search, filterType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-right">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isApplied ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-800 text-base">
                  جزئیات جلسه انبارگردانی شماره {toPersian(session.id)}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isApplied ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isApplied ? 'اعمال شده و نهایی' : 'در حال شمارش / باز'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                انبار: <strong className="text-slate-700">{warehouse?.name || 'نامشخص'}</strong> | تاریخ: {toPersian(session.date)}
                {session.appliedDate && ` | اعمال نهایی: ${toPersian(session.appliedDate)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPrint && (
              <button
                type="button"
                onClick={() => onOpenPrint(session)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ صورتجلسه</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">

          {/* Quick Info & Documents Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>انبار هدف</span>
              </div>
              <div className="font-bold text-slate-800 text-sm">{warehouse?.name || 'انبار اصلی'}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>تاریخ جلسه</span>
              </div>
              <div className="font-bold text-slate-800 text-sm">{toPersian(session.date)}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ناظر انبارگردانی</span>
              </div>
              <div className="font-bold text-slate-800 text-sm">{session.verifierName || 'ثبت نشده'}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <User className="w-3.5 h-3.5" />
                <span>مسئول شمارش</span>
              </div>
              <div className="font-bold text-slate-800 text-sm">{session.counterName || session.createdBy || 'ثبت نشده'}</div>
            </div>
          </div>

          {/* Linked Documents (if applied) */}
          {isApplied && (session.receiptNumber || session.remittanceNumber || session.accountingDocNumber) && (
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>اسناد سیستمی صادر شده برای این انبارگردانی:</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {session.receiptNumber && (
                  <span className="bg-white border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg font-bold shadow-xs">
                    رسید ورود مازاد: {toPersian(session.receiptNumber)}
                  </span>
                )}
                {session.remittanceNumber && (
                  <span className="bg-white border border-rose-200 text-rose-800 px-2.5 py-1 rounded-lg font-bold shadow-xs">
                    حواله خروج کسری: {toPersian(session.remittanceNumber)}
                  </span>
                )}
                {session.accountingDocNumber && (
                  <span className="bg-white border border-indigo-200 text-indigo-800 px-2.5 py-1 rounded-lg font-bold shadow-xs">
                    سند حسابداری تعدیل: {toPersian(session.accountingDocNumber)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-500 font-medium mb-1">اقلام شمارش شده</div>
              <div className="text-lg font-black text-slate-800">
                {toPersian(stats.countedCount)} <span className="text-xs text-slate-500 font-normal">از {toPersian(stats.totalItems)}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                ({toPersian(stats.totalItems > 0 ? Math.round((stats.countedCount / stats.totalItems) * 100) : 0)}٪ پیشرفت)
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
              <div className="text-xs text-emerald-700 font-medium mb-1">مازاد انبار (اضافه)</div>
              <div className="text-lg font-black text-emerald-700">
                {toPersian(stats.surplusCount)} <span className="text-xs text-emerald-600 font-normal">قلم</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-600 mt-1" dir="ltr">
                +{formatCurrency(stats.totalSurplusVal)}
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-center">
              <div className="text-xs text-rose-700 font-medium mb-1">کسری انبار</div>
              <div className="text-lg font-black text-rose-700">
                {toPersian(stats.deficitCount)} <span className="text-xs text-rose-600 font-normal">قلم</span>
              </div>
              <div className="text-[11px] font-bold text-rose-600 mt-1" dir="ltr">
                -{formatCurrency(stats.totalDeficitVal)}
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-center">
              <div className="text-xs text-blue-700 font-medium mb-1">منطبق بدون مغایرت</div>
              <div className="text-lg font-black text-blue-700">
                {toPersian(stats.matchCount)} <span className="text-xs text-blue-600 font-normal">قلم</span>
              </div>
              <div className="text-[10px] text-blue-500 mt-1">
                دفتری = فیزیکی
              </div>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
              <div className="text-xs text-indigo-700 font-medium mb-1">خالص ارزش تعدیل</div>
              <div className={`text-base font-black ${stats.netValue >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} dir="ltr">
                {stats.netValue > 0 ? '+' : ''}{formatCurrency(stats.netValue)}
              </div>
              <div className="text-[10px] text-indigo-500 mt-1">
                {stats.netValue >= 0 ? 'مازاد کلی' : 'کسری کلی'}
              </div>
            </div>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="جستجوی کالا بر اساس نام، کد، بارکد..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                همه اقلام ({toPersian(items.length)})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('discrepancy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  filterType === 'discrepancy'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                دارای مغایرت ({toPersian(stats.discrepancyCount)})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('deficit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  filterType === 'deficit'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                }`}
              >
                کسری‌ها ({toPersian(stats.deficitCount)})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('surplus')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  filterType === 'surplus'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                مازادها ({toPersian(stats.surplusCount)})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('match')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  filterType === 'match'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                }`}
              >
                منطبق ({toPersian(stats.matchCount)})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[380px] custom-scrollbar">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">ردیف</th>
                    <th className="py-2.5 px-3 min-w-[200px]">شرح و کد کالا</th>
                    <th className="py-2.5 px-3 w-20 text-center">واحد</th>
                    <th className="py-2.5 px-3 text-center font-bold">موجودی دفتری</th>
                    <th className="py-2.5 px-3 text-center">شمارش ۱</th>
                    <th className="py-2.5 px-3 text-center">شمارش ۲</th>
                    <th className="py-2.5 px-3 text-center">شمارش ۳</th>
                    <th className="py-2.5 px-3 text-center font-black bg-indigo-50/50">شمارش نهایی</th>
                    <th className="py-2.5 px-3 text-center font-black">مغایرت</th>
                    <th className="py-2.5 px-3 text-left">فی (ریال)</th>
                    <th className="py-2.5 px-3 text-left font-bold">ارزش مغایرت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-slate-400">
                        موردی برای نمایش یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((it, idx) => {
                      const p = products.find(prod => String(prod.id) === String(it.productId));
                      const diff = Number(it.difference || (it.countedStock !== null ? Number(it.countedStock) - Number(it.expectedStock) : 0));
                      const cost = Number(it.unitPrice || p?.purchasePrice || p?.price || 0);
                      const diffVal = diff * cost;
                      const hasCount = it.countedStock !== null && it.countedStock !== undefined;

                      return (
                        <tr 
                          key={it.productId || idx} 
                          className={`hover:bg-slate-50 transition-colors ${
                            !hasCount ? 'opacity-60 bg-slate-50/30' :
                            diff < 0 ? 'bg-rose-50/20' : 
                            diff > 0 ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                            {toPersian(idx + 1)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">{it.productName || p?.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {p?.code ? `کد: ${toPersian(p.code)}` : ''}
                              {p?.barcode ? ` | بارکد: ${p.barcode}` : ''}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">
                            {it.unit || p?.unit || 'عدد'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            {toPersian(it.expectedStock)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">
                            {toPersian(it.countRound1)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">
                            {toPersian(it.countRound2)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">
                            {toPersian(it.countRound3)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-black bg-indigo-50/30 text-indigo-900">
                            {toPersian(it.countedStock)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {!hasCount ? (
                              <span className="text-slate-400 text-xs">شمارش نشده</span>
                            ) : diff === 0 ? (
                              <span className="inline-flex items-center gap-1 text-slate-600 font-bold">
                                <Check className="w-3.5 h-3.5 text-blue-500" />
                                <span>۰ (منطبق)</span>
                              </span>
                            ) : diff > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>+{toPersian(diff)} (مازاد)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black">
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                <span>{toPersian(diff)} (کسری)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono text-slate-600">
                            {cost > 0 ? Math.round(cost).toLocaleString('fa-IR') : '۰'}
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono font-bold" dir="ltr">
                            {diffVal > 0 ? (
                              <span className="text-emerald-700">+{Math.round(diffVal).toLocaleString('fa-IR')}</span>
                            ) : diffVal < 0 ? (
                              <span className="text-rose-700">-{Math.round(Math.abs(diffVal)).toLocaleString('fa-IR')}</span>
                            ) : (
                              <span className="text-slate-400">۰</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {session.description && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600">
              <span className="font-bold text-slate-700 ml-1">توضیحات و یادداشت جلسه:</span>
              <span>{session.description}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            شناسه انبارگردانی: <span className="font-mono font-bold text-slate-700">{session.id}</span>
          </div>

          <div className="flex items-center gap-2">
            {!isApplied && onEditSession && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditSession(session);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ویرایش و ادامه شمارش
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
