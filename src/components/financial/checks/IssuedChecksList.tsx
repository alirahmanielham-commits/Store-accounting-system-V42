import { toPersianDigits, getDaysRemaining } from "./utils";
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, Clock, Search, DollarSign, AlertTriangle, 
  History, Activity, Edit2, Trash2, BookOpen, ChevronDown, 
  Filter, MoreHorizontal, ArrowUpRight, ArrowDownLeft, Wallet, Printer
} from 'lucide-react';
import DatePickerModule, { Calendar as RMCalendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export function IssuedChecksList({ 
  showNotification, onEditReceiptByCheck, issuedChecks, persons, checkbooks, accounts, 
  issuedSearchQuery, setIssuedSearchQuery, issuedCheckStatusFilter, setIssuedCheckStatusFilter, 
  issuedCheckbookFilter, setIssuedCheckbookFilter, issuedSortBy, setIssuedSortBy, 
  issuedSortDir, setIssuedSortDir, filteredIssuedChecks, totalIssuedAmount, 
  cashedIssuedAmount, pendingIssuedAmount, bouncedIssuedAmount, setViewingCheck, 
  setUpdatingCheckId, setUpdatingCheckType, setStatusVal, setIsStatusModalOpen, 
  setIsHistoryModalOpen, setHistoryCheck, setHistoryData, handleDeleteIssuedCheck, 
  formatDateDisplay, storeSettings, sendNotification, getCheckHistoryLogs, 
  issuedPage, setIssuedPage, totalIssuedPages 
}) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cashed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/50"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>پاس شده</span>;
      case 'bounced':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-100/50"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>برگشتی</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200/50"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>باطل شده</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100/50"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>در جریان</span>;
    }
  };

  const totalChecksCount = issuedChecks?.length || 0;
  
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* KPI Cards - Modern Accounting Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500 rounded-r-2xl"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{toPersianDigits(totalChecksCount)} فقره</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">کل چک‌های پرداختی</span>
            <span className="text-xl font-black text-slate-800 font-sans tracking-tight">
              {toPersianDigits(totalIssuedAmount.toLocaleString())} <span className="text-[10px] font-bold text-slate-400">{storeSettings?.currency || 'تومان'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 rounded-r-2xl"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">مبلغ پاس شده (وصول)</span>
            <span className="text-xl font-black text-emerald-700 font-sans tracking-tight">
              {toPersianDigits(cashedIssuedAmount.toLocaleString())} <span className="text-[10px] font-bold text-emerald-600/50">{storeSettings?.currency || 'تومان'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500 rounded-r-2xl"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">در جریان سررسید</span>
            <span className="text-xl font-black text-amber-700 font-sans tracking-tight">
              {toPersianDigits(pendingIssuedAmount.toLocaleString())} <span className="text-[10px] font-bold text-amber-600/50">{storeSettings?.currency || 'تومان'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500 rounded-r-2xl"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">برگشت خورده</span>
            <span className="text-xl font-black text-rose-600 font-sans tracking-tight">
              {toPersianDigits(bouncedIssuedAmount.toLocaleString())} <span className="text-[10px] font-bold text-rose-500/50">{storeSettings?.currency || 'تومان'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
        
        {/* Status Tabs */}
        <div className="flex overflow-x-auto gap-1.5 pb-1 xl:pb-0 scrollbar-hide">
          {['all', 'issued', 'cashed', 'bounced', 'cancelled'].map(status => {
            const isSelected = issuedCheckStatusFilter === status;
            const labels: Record<string, string> = {
              'all': 'همه چک‌ها',
              'issued': 'در جریان',
              'cashed': 'پاس شده',
              'bounced': 'برگشتی',
              'cancelled': 'باطل شده'
            };
            return (
              <button
                key={status}
                onClick={() => setIssuedCheckStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  isSelected 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {labels[status]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          {/* Export Button */}
          <button 
            onClick={async () => {
              try {
                const { exportToExcel } = await import('../../../utils/exportUtils');
                
                const data = filteredIssuedChecks.map((c: any) => {
                  const payee = persons.find((p: any) => p.id === c.payeeId);
                  const cb = checkbooks.find((b: any) => b.id === c.checkbookId);
                  
                  return {
                    'شماره چک': c.checkNumber,
                    'تاریخ سررسید': formatDateDisplay(c.dueDate, storeSettings?.calendarType),
                    'مبلغ (تومان)': c.amount,
                    'گیرنده': payee?.name || c.payeeId || 'ناشناس',
                    'بابت': c.description || '',
                    'بانک': cb ? `${cb.bankName} - ${cb.accountNumber}` : (c.bankName || ''),
                    'وضعیت': c.status === 'cashed' ? 'پاس شده' : c.status === 'bounced' ? 'برگشتی' : c.status === 'cancelled' ? 'باطل شده' : 'در جریان'
                  };
                });
                
                exportToExcel({ filename: 'چک‌های_پرداختی', title: 'گزارش چک‌های پرداختی', data });
              } catch (err) {
                console.error("Export failed:", err);
                showNotification?.('خطا در دریافت فایل خروجی', 'error');
              }
            }}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm w-full sm:w-auto justify-center whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            اکسل
          </button>

          {/* Checkbook Filter */}
          <div className="relative w-full sm:w-48">
             <select 
               value={issuedCheckbookFilter}
               onChange={(e) => setIssuedCheckbookFilter(e.target.value)}
               className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
             >
               <option value="all">همه دسته‌چک‌ها</option>
               {checkbooks.map((cb: any) => (
                 <option key={cb.id} value={cb.id}>{cb.bankName} - {cb.accountNumber}</option>
               ))}
             </select>
             <BookOpen className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
             <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={issuedSearchQuery}
              onChange={e => setIssuedSearchQuery(e.target.value)}
              placeholder="جستجو (شماره چک، گیرنده، مبلغ)..."
              className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="px-5 py-4 text-xs font-black text-slate-500 w-16 text-center">ردیف</th>
                <th className="px-5 py-4 text-xs font-black text-slate-500">شماره چک</th>
                <th className="px-5 py-4 text-xs font-black text-slate-500">گیرنده (در وجه)</th>
                <th className="px-5 py-4 text-xs font-black text-slate-500">مبلغ</th>
                <th className="px-5 py-4 text-xs font-black text-slate-500">سررسید</th>
                <th className="px-5 py-4 text-xs font-black text-slate-500">وضعیت</th>
                <th className="px-5 py-4 text-xs font-black text-slate-500 text-center print:hidden">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIssuedChecks.map((c: any, index: number) => {
                const payee = persons.find((p: any) => p.id === c.payeeId);
                const isOverdue = (!c.status || c.status === 'issued') && getDaysRemaining(c.dueDate) < 0;
                const daysRemaining = getDaysRemaining(c.dueDate);
                
                return (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-4 text-center">
                      <span className="text-xs font-bold text-slate-400">{toPersianDigits((issuedPage - 1) * 20 + index + 1)}</span>
                    </td>
                    
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-black text-slate-800 text-sm tracking-widest">{toPersianDigits(c.checkNumber)}</span>
                        {c.bankName && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded w-max">{c.bankName}</span>}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs shrink-0">
                          {(payee?.name || c.payeeId || '؟').charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{payee?.name || c.payeeId || 'ناشناس'}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-sans font-black text-slate-800 text-base">
                        {toPersianDigits(Number(c.amount).toLocaleString())}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`text-sm font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                          {toPersianDigits(formatDateDisplay(c.dueDate, storeSettings?.calendarType))}
                        </span>
                        
                        {(!c.status || c.status === 'issued') && (
                          <div className="flex items-center gap-2 print:hidden w-32">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${daysRemaining < 0 ? 'bg-rose-500' : daysRemaining <= 3 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${Math.min(100, Math.max(5, (30 - daysRemaining) / 30 * 100))}%` }}
                              ></div>
                            </div>
                            <span className={`text-[9px] font-black whitespace-nowrap ${daysRemaining < 0 ? 'text-rose-600' : daysRemaining <= 3 ? 'text-amber-600' : 'text-slate-400'}`}>
                              {daysRemaining < 0 ? `${toPersianDigits(Math.abs(daysRemaining))} روز قبل` : daysRemaining === 0 ? 'امروز' : `${toPersianDigits(daysRemaining)} روز`}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {getStatusBadge(c.status || 'issued')}
                    </td>

                    <td className="px-5 py-4 print:hidden">
                      <div className="flex items-center justify-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={async () => {
                            setHistoryCheck({ ...c, checkType: 'issued' });
                            const h = await getCheckHistoryLogs(c.id, 'issued');
                            const oldHistory = c.history || [];
                            const combined = [...oldHistory, ...h].sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
                            setHistoryData(combined);
                            setIsHistoryModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="تاریخچه و گردش"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => { setUpdatingCheckId(c.id); setUpdatingCheckType('issued'); setStatusVal(c.status || 'issued'); setIsStatusModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="تغییر وضعیت چک"
                        >
                          <Activity className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (onEditReceiptByCheck) {
                              onEditReceiptByCheck(c, 'issued');
                            } else {
                              showNotification('این چک بدون فرم رسید ثبت شده است.', 'error');
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                          title="ویرایش چک"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (c.status === 'cashed') {
                              showNotification('حذف چک وصول شده امکان‌پذیر نیست.', 'error');
                              return;
                            }
                            if (window.confirm('آیا از حذف این چک اطمینان دارید؟')) {
                              handleDeleteIssuedCheck(c.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredIssuedChecks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <Search className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-500">هیچ چکی یافت نشد</p>
                      <p className="text-xs mt-1 text-slate-400">با تغییر فیلترها مجدداً تلاش کنید.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        {totalIssuedPages > 1 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              نمایش صفحه {toPersianDigits(issuedPage)} از {toPersianDigits(totalIssuedPages)}
            </span>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setIssuedPage((p: number) => Math.max(1, p - 1))}
                disabled={issuedPage === 1}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                قبلی
              </button>
              <button 
                onClick={() => setIssuedPage((p: number) => Math.min(totalIssuedPages, p + 1))}
                disabled={issuedPage === totalIssuedPages}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                بعدی
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
