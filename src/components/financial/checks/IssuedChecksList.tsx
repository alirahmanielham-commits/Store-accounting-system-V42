import { toPersianDigits, getDaysRemaining } from "./utils";
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  CreditCard, Plus, Edit2, Trash2, CheckCircle, Clock, X, Save, 
  ArrowDownLeft, BookOpen, ArrowUpRight, Calendar, Building2, HelpCircle, AlertTriangle, Search, TrendingUp, DollarSign, Percent, BarChart as BarChartIcon, ChevronDown, Printer, History, Activity, User, Send
, ArrowLeft} from 'lucide-react';
import DatePickerModule, { Calendar as RMCalendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export function IssuedChecksList({ showNotification, onEditReceiptByCheck, issuedChecks, persons, checkbooks, accounts, issuedSearchQuery, setIssuedSearchQuery, issuedCheckStatusFilter, setIssuedCheckStatusFilter, issuedCheckbookFilter, setIssuedCheckbookFilter, issuedSortBy, setIssuedSortBy, issuedSortDir, setIssuedSortDir, filteredIssuedChecks, totalIssuedAmount, cashedIssuedAmount, pendingIssuedAmount, bouncedIssuedAmount, setViewingCheck, setUpdatingCheckId, setUpdatingCheckType, setStatusVal, setIsStatusModalOpen, setIsHistoryModalOpen, setHistoryCheck, setHistoryData, handleDeleteIssuedCheck, formatDateDisplay, storeSettings, sendNotification, getCheckAuditLogs, issuedPage, setIssuedPage, totalIssuedPages }) {
  return (
    <>
/* SUBTAB 2: ISSUED CHECKS */
          <div>
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:hidden">
              <div className="bg-gradient-to-br from-indigo-50/40 to-white border border-indigo-100/60 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-indigo-900 block">کل چک‌های صادره</span>
                  <span className="text-base font-black text-indigo-950 font-sans block mt-1">{totalIssuedAmount.toLocaleString()} <span className="text-[9px] font-bold text-gray-400">{storeSettings?.currency || 'تومان'}</span></span>
                </div>
                <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50/40 to-white border border-emerald-100/60 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-emerald-950 block">مبلغ وصول شده (پاس شده)</span>
                  <span className="text-base font-black text-emerald-700 font-sans block mt-1">{cashedIssuedAmount.toLocaleString()} <span className="text-[9px] font-bold text-gray-400">{storeSettings?.currency || 'تومان'}</span></span>
                </div>
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50/40 to-white border border-amber-100/60 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-amber-900 block">در جریان سررسید</span>
                  <span className="text-base font-black text-amber-700 font-sans block mt-1">{pendingIssuedAmount.toLocaleString()} <span className="text-[9px] font-bold text-gray-400">{storeSettings?.currency || 'تومان'}</span></span>
                </div>
                <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 animate-pulse">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-rose-50/40 to-white border border-rose-100/60 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-rose-900 block">برگشت خورده (بک‌خورده)</span>
                  <span className="text-base font-black text-rose-600 font-sans block mt-1">{bouncedIssuedAmount.toLocaleString()} <span className="text-[9px] font-bold text-gray-400">{storeSettings?.currency || 'تومان'}</span></span>
                </div>
                <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Status Flow Tabs */}
            <div className="flex overflow-x-auto gap-2 mb-4 pb-2 print:hidden scrollbar-hide">
              {['all', 'blank', 'issued', 'cashed', 'bounced', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setIssuedCheckStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${issuedCheckStatusFilter === status ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  {status === 'all' ? 'همه چک‌ها' : status === 'blank' ? 'برگ سفید' : status === 'issued' ? 'در جریان (صادره)' : status === 'cashed' ? 'پاس شده' : status === 'bounced' ? 'برگشتی' : 'باطل شده'}
                </button>
              ))}
            </div>

            {/* Actions & Filters Panel */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-gray-50/40 border border-gray-100 p-4 rounded-xl print:hidden">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={issuedSearchQuery} 
                    onChange={e => setIssuedSearchQuery(e.target.value)} 
                    placeholder="جستجو بر اساس شماره چک، شخص..."
                    className="w-full pr-10 pl-4 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                
                {/* Export Dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors">
                    <Printer className="w-4 h-4" />
                    خروجی
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 flex flex-col overflow-hidden">
                    <button 
                      onClick={async () => {
                        const { exportToExcel } = await import('../../../utils/exportUtils');
                        exportToExcel({
                          filename: 'چک‌های-پرداختی',
                          title: 'گزارش چک‌های پرداختی',
                          columns: [
                            { header: 'شماره چک', key: 'checkNumber' },
                            { header: `مبلغ (${storeSettings?.currency || 'تومان'})`, key: 'amount' },
                            { header: 'سررسید', key: 'dueDate' },
                            { header: 'وضعیت', key: 'statusLabel' }
                          ],
                          data: filteredIssuedChecks.map((c: any) => ({
                            ...c,
                            dueDate: formatDateDisplay(c.dueDate, storeSettings?.calendarType),
                            statusLabel: c.status === 'issued' ? 'در جریان' : c.status === 'cashed' ? 'پاس شده' : c.status === 'bounced' ? 'برگشتی' : 'نامشخص'
                          }))
                        });
                      }}
                      className="px-4 py-2.5 text-xs text-right hover:bg-gray-50 text-gray-700 font-bold border-b border-gray-50"
                    >
                      خروجی Excel (XLSX)
                    </button>
                    <button 
                      onClick={async () => {
                        const { exportToPDF } = await import('../../../utils/exportUtils');
                        exportToPDF({
                          filename: 'چک‌های-پرداختی',
                          title: 'گزارش چک‌های پرداختی',
                          columns: [
                            { header: 'شماره چک', key: 'checkNumber' },
                            { header: `مبلغ (${storeSettings?.currency || 'تومان'})`, key: 'amount' },
                            { header: 'سررسید', key: 'dueDate' },
                            { header: 'وضعیت', key: 'statusLabel' }
                          ],
                          data: filteredIssuedChecks.map((c: any) => ({
                            ...c,
                            dueDate: formatDateDisplay(c.dueDate, storeSettings?.calendarType),
                            statusLabel: c.status === 'issued' ? 'در جریان' : c.status === 'cashed' ? 'پاس شده' : c.status === 'bounced' ? 'برگشتی' : 'نامشخص'
                          }))
                        });
                      }}
                      className="px-4 py-2.5 text-xs text-right hover:bg-gray-50 text-gray-700 font-bold"
                    >
                      خروجی PDF
                    </button>
                  </div>
                </div>
              </div>


              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                  <select 
                    value={issuedCheckbookFilter}
                    onChange={e => setIssuedCheckbookFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-700 outline-none px-2 py-1 cursor-pointer max-w-[120px] truncate"
                  >
                    <option value="all">همه دسته‌چک‌ها</option>
                    {(checkbooks || []).map(cb => {
                      const bank = accounts.find(a => a.id == cb.accountId)?.bankName || 'حساب';
                      return <option key={cb.id} value={cb.id.toString()}>{bank} ({cb.startNumber})</option>
                    })}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                  <select 
                    value={issuedSortBy} 
                    onChange={e => setIssuedSortBy(e.target.value as any)}
                    className="bg-transparent text-xs font-bold text-gray-700 outline-none px-2 py-1 cursor-pointer"
                  >
                    <option value="date">سررسید</option>
                    <option value="amount">مبلغ</option>
                  </select>
                  <button 
                    onClick={() => setIssuedSortDir(prev => prev === 'asc' ? 'desc' : 'asc')} 
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  >
                    {issuedSortDir === 'asc' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </button>
                </div>
                
                <button 
                  onClick={() => window.print()}
                  className="p-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
                  title="چاپ لیست"
                >
                  <Printer className="w-4 h-4" />
                </button>
                
                <span className="text-xs font-bold text-gray-550 hidden sm:inline-block">تعداد یافت شده: {filteredIssuedChecks.length}</span>
              </div>
            </div>

            <div className="print-section w-full">
              {/* Print Only Header */}
              <div className="hidden print:block mb-6 border-b-2 border-slate-800 pb-4 text-center">
                <h1 className="text-xl font-extrabold text-slate-900 font-sans">سامانه مدیریت مالی و حسابداری</h1>
                <p className="text-sm text-gray-650 font-bold mt-1.5">گزارش و لیست چک‌های صادره (پرداختنی)</p>
                <div className="flex justify-between items-center mt-5 text-xs text-slate-500 border-t border-slate-100 pt-3 font-bold">
                  <span>تاریخ چاپ: {formatDateDisplay(new Date(), storeSettings?.calendarType)}</span>
                  <span>تعداد کل اقلام: {toPersianDigits(filteredIssuedChecks.length)}</span>
                </div>
              </div>

              <div className="overflow-x-auto print:overflow-visible border border-gray-100 print:border-none rounded-2xl print:rounded-none shadow-xs print:shadow-none bg-white">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-4 font-bold">شماره چک</th>
                      <th className="px-4 py-4 font-bold">دسته چک / حساب</th>
                      <th className="px-4 py-4 font-bold">بابت (گیرنده چک)</th>
                      <th className="px-4 py-4 font-bold">مبلغ ({storeSettings?.currency || 'تومان'})</th>
                      <th className="px-4 py-4 font-bold">سررسید و مهلت</th>
                      <th className="px-4 py-4 font-bold">وضعیت</th>
                      <th className="px-4 py-4 font-bold text-center w-36 print:hidden">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {filteredIssuedChecks.map(c => {
                      const cb = checkbooks.find(x => x.id == c.checkbookId);
                      const acc = accounts.find(a => a.id == cb?.accountId);
                      const bankName = acc?.bankName || 'پرداخت نقدی/مستقیم';
                      const payee = persons.find(p => p.id?.toString() === c.payeeId?.toString());
                      return (
                        <React.Fragment key={c.id}>
<tr className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div 
                              className="font-mono font-black text-gray-900 cursor-pointer hover:text-indigo-600 hover:underline transition-colors decoration-dashed underline-offset-4"
                              onClick={() => setViewingCheck && setViewingCheck({ ...c, _type: 'issued' })}
                              title="مشاهده جزئیات چک"
                            >
                              {toPersianDigits(c.checkNumber)}
                            </div>
                            <div className="text-[10px] text-gray-550 font-bold mt-1 max-w-[120px] truncate">{c.receiptNumber ? `رسید: ${toPersianDigits(c.receiptNumber)}` : `بدون شناسه رسید`}</div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-indigo-950 font-bold max-w-[150px] truncate">{bankName}</td>
                          <td className="px-4 py-3.5 font-bold text-gray-800">{payee?.name || c.payeeId || 'ناشناس'}</td>
                          <td className="px-4 py-3.5 font-sans font-black text-rose-600">{toPersianDigits(Number(c.amount).toLocaleString())}</td>
                          <td className="px-4 py-3.5">
                             <div className="font-sans font-medium text-gray-700">{toPersianDigits(formatDateDisplay(c.dueDate, storeSettings?.calendarType))}</div>
                             {(!c.status || c.status === 'issued') && (
                               <div className="mt-2 flex items-center gap-2 print:hidden w-32">
                                 <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                   <div className={`h-full ${getDaysRemaining(c.dueDate) < 0 ? 'bg-rose-500' : getDaysRemaining(c.dueDate) <= 3 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.max(5, (30 - getDaysRemaining(c.dueDate)) / 30 * 100))}%` }}></div>
                                 </div>
                                 <span className={`text-[10px] font-bold ${getDaysRemaining(c.dueDate) < 0 ? 'text-rose-600' : getDaysRemaining(c.dueDate) <= 3 ? 'text-amber-600' : 'text-gray-500'}`}>
                                   {getDaysRemaining(c.dueDate) < 0 ? `${toPersianDigits(Math.abs(getDaysRemaining(c.dueDate)))} روز گذشته` : getDaysRemaining(c.dueDate) === 0 ? 'امروز' : `${toPersianDigits(getDaysRemaining(c.dueDate))} روز`}
                                 </span>
                               </div>
                             )}
                          </td>
                          <td className="px-4 py-3.5">
                             <div className={`relative inline-block rounded-lg text-xs font-bold border ${
                               c.status === 'cashed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                               c.status === 'bounced' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                               c.status === 'cancelled' ? 'bg-gray-100 text-gray-600 border-gray-200 line-through' :
                               'bg-amber-50 text-amber-700 border-amber-100'
                             }`}>
                               <span>{c.status === "cashed" ? "پاس شده" : c.status === "bounced" ? "برگشتی" : c.status === "cancelled" ? "باطل شده" : "در جریان (صادره)"}</span>
                             </div>
                          </td>
                          <td className="px-4 py-3.5 print:hidden">
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                onClick={async () => {
                                  setHistoryCheck({ ...c, checkType: 'issued' });
                                  const h = await getCheckAuditLogs(c.id, 'issued');
                                  const oldHistory = c.history || [];
                                  const combined = [...oldHistory, ...h].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                  setHistoryData(combined);
                                  setIsHistoryModalOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 inline-block"
                                title="مشاهده سوابق و رهگیری وضعیت"
                              >
                                <History className="w-4 h-4" />
                              </button>
                                                            <button 
                                onClick={() => { setUpdatingCheckId(c.id); setUpdatingCheckType('issued'); setStatusVal(c.status || 'issued'); setIsStatusModalOpen(true); }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 inline-block"
                                title="مدیریت وضعیت چک"
                              >
                                <Activity className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => { 
                                  if (onEditReceiptByCheck) {
                                    onEditReceiptByCheck(c, 'issued');
                                  } else {
                                    showNotification('این چک بدون فرم رسید ثبت شده است و قابلیت ویرایش از طریق رسید را ندارد. در صورت نیاز آن را حذف کرده و مجدداً از طریق فرم رسید ثبت نمایید.', 'error');
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 inline-block"
                                title="ویرایش چک"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (c.status === 'cashed') {
                                    alert('حذف چک وصول شده امکان‌پذیر نیست. ابتدا وضعیت آن را تغییر دهید.');
                                    return;
                                  }
                                  if (window.confirm('آیا از حذف این چک اطمینان دارید؟ توجه: این عملیات غیرقابل بازگشت است و اسناد مرتبط حذف خواهند شد.')) {
                                    handleDeleteIssuedCheck(c.id);
                                  }
                                }} 
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 inline-block"
                                title="حذف چک"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

</React.Fragment>
);
})}
                    {filteredIssuedChecks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-gray-400 text-sm font-medium">
                          <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          هیچ چکی مطابق شرایط جستجو در سیستم صادر نشده است
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

            {/* Pagination Controls */}
            {totalIssuedPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6 pb-6">
                <button 
                  onClick={() => setIssuedPage(p => Math.max(1, p - 1))}
                  disabled={issuedPage === 1}
                  className="px-4 py-2 border rounded-xl text-sm font-bold bg-white text-gray-700 disabled:opacity-50"
                >
                  قبلی
                </button>
                <span className="text-sm font-bold text-gray-700">صفحه {issuedPage} از {totalIssuedPages}</span>
                <button 
                  onClick={() => setIssuedPage(p => Math.min(totalIssuedPages, p + 1))}
                  disabled={issuedPage === totalIssuedPages}
                  className="px-4 py-2 border rounded-xl text-sm font-bold bg-white text-gray-700 disabled:opacity-50"
                >
                  بعدی
                </button>
              </div>
            )}
          
    </>
  );
}
