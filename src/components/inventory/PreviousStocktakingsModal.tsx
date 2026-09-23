import React, { useState, useMemo } from 'react';
import { 
  X, History, Search, Building2, Calendar, 
  CheckCircle2, Clock, Eye, Printer, AlertTriangle,
  ArrowDownRight, ArrowUpRight, ChevronLeft
} from 'lucide-react';
import { Stocktaking, Product, Warehouse, CompanySettings } from '../../types';
import StocktakingDetailModal from './StocktakingDetailModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stocktakings: Stocktaking[];
  currentWarehouseId?: string | number;
  products: Product[];
  warehouses: Warehouse[];
  companySettings?: CompanySettings | null;
  onOpenPrint?: (session: Stocktaking) => void;
  onSelectSessionToView?: (session: Stocktaking) => void;
}

export default function PreviousStocktakingsModal({
  isOpen,
  onClose,
  stocktakings,
  currentWarehouseId,
  products,
  warehouses,
  companySettings,
  onOpenPrint,
  onSelectSessionToView,
}: Props) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    currentWarehouseId ? String(currentWarehouseId) : 'all'
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'applied' | 'in_progress'>('all');
  const [detailSession, setDetailSession] = useState<Stocktaking | null>(null);

  const toPersian = (n: number | string | null | undefined) =>
    n === null || n === undefined
      ? '-'
      : n.toString().replace(/\d/g, x => ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'][parseInt(x)]);

  const formatCurrency = (amount: number) => {
    return Math.round(amount).toLocaleString('fa-IR') + ' ' + (companySettings?.currency || 'ریال');
  };

  const filteredSessions = useMemo(() => {
    return (stocktakings || []).filter(st => {
      // Warehouse filter
      if (selectedWarehouseId !== 'all' && String(st.warehouseId) !== selectedWarehouseId) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && st.status !== statusFilter) {
        return false;
      }
      // Search term
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const idMatch = String(st.id).toLowerCase().includes(term);
        const dateMatch = String(st.date).toLowerCase().includes(term);
        const descMatch = String(st.description || '').toLowerCase().includes(term);
        const verifierMatch = String(st.verifierName || '').toLowerCase().includes(term);
        const counterMatch = String(st.counterName || '').toLowerCase().includes(term);
        const whObj = warehouses.find(w => String(w.id) === String(st.warehouseId));
        const whMatch = whObj?.name.toLowerCase().includes(term);

        if (!idMatch && !dateMatch && !descMatch && !verifierMatch && !counterMatch && !whMatch) {
          return false;
        }
      }
      return true;
    });
  }, [stocktakings, selectedWarehouseId, statusFilter, search, warehouses]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-right">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">
                سوابق و لیست انبارگردانی‌های قبلی
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مشاهده، بررسی و چاپ جلسات انبارگردانی گذشته
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Warehouse Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">انبار:</span>
              <select
                value={selectedWarehouseId}
                onChange={e => setSelectedWarehouseId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="all">همه انبارها</option>
                {warehouses.map(w => (
                  <option key={w.id} value={String(w.id)}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Status Select */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  statusFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                همه ({toPersian(stocktakings.length)})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('applied')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  statusFilter === 'applied' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                اعمال شده
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  statusFilter === 'in_progress' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                باز / در جریان
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="جستجو بر اساس شماره، تاریخ، ناظر..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
          </div>
        </div>

        {/* Sessions List */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
          {filteredSessions.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <History className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">هیچ انبارگردانی قبلی یافت نشد</h4>
              <p className="text-xs text-slate-400 mt-1">
                برای انبار یا فیلترهای انتخابی، سابقه‌ای ثبت نشده است.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSessions.map(st => {
                const wh = warehouses.find(w => String(w.id) === String(st.warehouseId));
                const isApplied = st.status === 'applied';
                const itemsCount = st.items?.length || 0;
                const countedCount = st.items?.filter(i => i.countedStock !== null).length || 0;
                const deficitVal = st.totalDeficitValue || 0;
                const surplusVal = st.totalSurplusValue || 0;

                return (
                  <div
                    key={st.id}
                    className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl p-4 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            #{toPersian(st.id)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                            isApplied ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isApplied ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>اعمال شده</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>در جریان</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{toPersian(st.date)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 font-bold flex items-center gap-1.5 mb-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{wh?.name || 'انبار اصلی'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 bg-slate-50 rounded-xl p-2.5 mb-3 border border-slate-100">
                        <div>
                          اقلام شمارش شده: <strong className="text-slate-700 font-bold">{toPersian(countedCount)}</strong> از {toPersian(itemsCount)}
                        </div>
                        <div>
                          مسئول: <span className="text-slate-700">{st.counterName || st.createdBy || '-'}</span>
                        </div>
                        {isApplied && (
                          <>
                            <div className="text-emerald-700 font-bold">
                              مازاد: {surplusVal > 0 ? `+${formatCurrency(surplusVal)}` : '۰'}
                            </div>
                            <div className="text-rose-700 font-bold">
                              کسری: {deficitVal > 0 ? `-${formatCurrency(deficitVal)}` : '۰'}
                            </div>
                          </>
                        )}
                      </div>

                      {st.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mb-3">
                          {st.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailSession(st)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>مشاهده کامل</span>
                        </button>

                        {onOpenPrint && (
                          <button
                            type="button"
                            onClick={() => onOpenPrint(st)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="چاپ صورتجلسه"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {onSelectSessionToView && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectSessionToView(st);
                            onClose();
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>بارگذاری در فرم</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            تعداد کل جلسات یافت شده: <strong className="text-slate-800 font-bold">{toPersian(filteredSessions.length)}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>

      </div>

      {/* Embedded Detail Modal */}
      {detailSession && (
        <StocktakingDetailModal
          isOpen={Boolean(detailSession)}
          onClose={() => setDetailSession(null)}
          session={detailSession}
          products={products}
          warehouses={warehouses}
          companySettings={companySettings}
          onOpenPrint={onOpenPrint}
        />
      )}
    </div>
  );
}
