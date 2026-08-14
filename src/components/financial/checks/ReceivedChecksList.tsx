import { toPersianDigits, getDaysRemaining } from "./utils";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  CreditCard, Plus, Edit2, Trash2, CheckCircle, Clock, X, Save, 
  ArrowDownLeft, BookOpen, ArrowUpRight, Calendar, Building2, HelpCircle, AlertTriangle, Search, TrendingUp, DollarSign, Percent, BarChart as BarChartIcon, ChevronDown, Printer, History, Activity, User, Send
, ArrowLeft} from 'lucide-react';
import DatePickerModule, { Calendar as RMCalendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export function ReceivedChecksList({ showNotification, receivedChecks, persons, checkbooks, accounts, receivedSearchQuery, setReceivedSearchQuery, receivedCheckStatusFilter, setReceivedCheckStatusFilter, receivedSortBy, setReceivedSortBy, receivedSortDir, setReceivedSortDir, filteredReceivedChecks, totalReceivedAmount, cashedReceivedAmount, inHandReceivedAmount, bouncedReceivedAmount, setViewingCheck, setUpdatingCheckId, setUpdatingCheckType, setStatusVal, setIsStatusModalOpen, setIsHistoryModalOpen, setHistoryCheck, setHistoryData, handleDeleteReceivedCheck, formatDateDisplay, storeSettings, sendNotification, getCheckAuditLogs, onEditReceiptByCheck, receivedPage, setReceivedPage, totalReceivedPages }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  return (
    <>
/* SUBTAB 3: RECEIVED CHECKS */
          <div>
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:hidden">
              <div className="bg-gradient-to-br from-indigo-50/40 to-white border border-indigo-100/60 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-indigo-900 block">مجموع چک‌های دریافتی</span>
                  <span className="text-base font-black text-indigo-950 font-sans block mt-1">{totalReceivedAmount.toLocaleString()} <span className="text-[9px] font-bold text-gray-400">{storeSettings?.currency || 'تومان'}</span></span>
                </div>
                <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50/40 to-white border border-emerald-100/60 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-emerald-950 block">مبلع وصول شده و نقد شده</span>
                  <span className="text-base font-black text-emerald-750 font-sans block mt-1">{cashedReceivedAmount.toLocaleString()} <span className="text-[9px] font-bold text-gray-400">{storeSettings?.currency || 'تومان'}</span></span>
                </div>
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50/40 to-white border border-amber-100/60 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-amber-900 block">موجود فیزیکی یا خوابانده</span>
                  <span className="text-base font-black text-amber-700 font-sans block mt-1">{inHandReceivedAmount.toLocaleString()} <span className="text-[9px] font-bold text-gray-400">{storeSettings?.currency || 'تومان'}</span></span>
                </div>
                <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 animate-pulse">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-rose-50/40 to-white border border-rose-100/60 p-4 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-rose-900 block">برگشت خورده (مشتری)</span>
                  <span className="text-base font-black text-rose-650 font-sans block mt-1">{bouncedReceivedAmount.toLocaleString()} <span className="text-[9px] font-bold text-gray-400">{storeSettings?.currency || 'تومان'}</span></span>
                </div>
                <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Status Flow Tabs */}
            <div className="flex overflow-x-auto gap-2 mb-4 pb-2 print:hidden scrollbar-hide">
              {['all', 'received', 'deposited', 'cashed', 'bounced', 'returned'].map(status => (
                <button
                  key={status}
                  onClick={() => setReceivedCheckStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${receivedCheckStatusFilter === status ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  {status === 'all' ? 'همه چک‌ها' : status === 'received' ? 'موجود صندوق' : status === 'deposited' ? 'واگذار شده' : status === 'cashed' ? 'وصول شده' : status === 'bounced' ? 'برگشتی' : 'عودت داده شده'}
                </button>
              ))}
            </div>

            {/* Actions & Filters Panel */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-gray-50/40 border border-gray-100 p-4 rounded-xl print:hidden">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={receivedSearchQuery} 
                  onChange={e => setReceivedSearchQuery(e.target.value)} 
                  placeholder="جستجو بر اساس شماره چک، نام شخص، مبلغ، بانک، سررسید..."
                  className="w-full pr-10 pl-4 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                  <select 
                    value={receivedSortBy} 
                    onChange={e => setReceivedSortBy(e.target.value as any)}
                    className="bg-transparent text-xs font-bold text-gray-700 outline-none px-2 py-1 cursor-pointer"
                  >
                    <option value="date">سررسید</option>
                    <option value="amount">مبلغ</option>
                  </select>
                  <button 
                    onClick={() => setReceivedSortDir(prev => prev === 'asc' ? 'desc' : 'asc')} 
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  >
                    {receivedSortDir === 'asc' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </button>
                </div>
                
                <button 
                  onClick={() => window.print()}
                  className="p-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
                  title="چاپ لیست"
                >
                  <Printer className="w-4 h-4" />
                </button>
                
                <span className="text-xs font-bold text-gray-550 hidden sm:inline-block">تعداد یافت شده: {filteredReceivedChecks.length}</span>
              </div>
            </div>

            <div className="print-section w-full">
              {/* Print Only Header */}
              <div className="hidden print:block mb-6 border-b-2 border-slate-800 pb-4 text-center">
                <h1 className="text-xl font-extrabold text-slate-900 font-sans">سامانه مدیریت مالی و حسابداری</h1>
                <p className="text-sm text-gray-650 font-bold mt-1.5">گزارش و لیست چک‌های دریافتی (وصولی)</p>
                <div className="flex justify-between items-center mt-5 text-xs text-slate-500 border-t border-slate-100 pt-3 font-bold">
                  <span>تاریخ چاپ: {formatDateDisplay(new Date(), storeSettings?.calendarType)}</span>
                  <span>تعداد کل اقلام: {toPersianDigits(filteredReceivedChecks.length)}</span>
                </div>
              </div>

              <div className="overflow-x-auto print:overflow-visible border border-gray-100 print:border-none rounded-2xl print:rounded-none shadow-xs print:shadow-none bg-white">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-4 font-bold">شماره چک</th>
                      <th className="px-4 py-4 font-bold">بانک صادرکننده</th>
                      <th className="px-4 py-4 font-bold">پرداخت‌کننده (طرف حساب)</th>
                      <th className="px-4 py-4 font-bold">مبلغ ({storeSettings?.currency || 'تومان'})</th>
                      <th className="px-4 py-4 font-bold">دریافت</th>
                      <th className="px-4 py-4 font-bold">سررسید و مهلت</th>
                      <th className="px-4 py-4 font-bold">وضعیت</th>
                      <th className="px-4 py-4 font-bold text-center w-36 print:hidden">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {filteredReceivedChecks.map(c => {
                      const payer = persons.find(p => p.id?.toString() === c.payerId?.toString());
                      const [selectedIds, setSelectedIds] = useState<string[]>([]);
  return (
                        <React.Fragment key={c.id}>
<tr className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div 
                              className="font-mono font-black text-gray-900 cursor-pointer hover:text-indigo-600 hover:underline transition-colors decoration-dashed underline-offset-4"
                              onClick={() => setViewingCheck && setViewingCheck({ ...c, _type: 'received' })}
                              title="مشاهده جزئیات چک"
                            >
                              {toPersianDigits(c.checkNumber)}
                            </div>
                            <div className="text-[10px] text-gray-550 font-bold mt-1 max-w-[120px] truncate">{c.receiptNumber ? `رسید: ${toPersianDigits(c.receiptNumber)}` : `بدون شناسه رسید`}</div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-indigo-950 font-bold max-w-[150px] truncate">
                            {c.bankName} {c.branchName ? `(شعبه: ${toPersianDigits(c.branchName)})` : ''}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-gray-800">{payer?.name || c.payerId || 'ناشناس'}</td>
                          <td className="px-4 py-3.5 font-sans font-black text-emerald-600">{toPersianDigits(Number(c.amount).toLocaleString())}</td>
                          <td className="px-4 py-3.5 font-sans font-medium text-gray-500 text-xs">{toPersianDigits(formatDateDisplay(c.receiveDate, storeSettings?.calendarType))}</td>
                          <td className="px-4 py-3.5">
                             <div className="font-sans font-bold text-gray-700">{toPersianDigits(formatDateDisplay(c.dueDate, storeSettings?.calendarType))}</div>
                             {(!c.status || c.status === 'received' || c.status === 'deposited') && (
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
                               c.status === 'deposited' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                               c.status === 'bounced' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                               c.status === 'returned' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                               'bg-amber-50 text-amber-700 border-amber-100'
                             }`}>
                               <select
                                 value={c.status || 'received'}
                                 onChange={(e) => {
                                   setUpdatingCheckType('received');
                                   setUpdatingCheckId(c.id);
                                   setStatusVal(e.target.value);
                                   setIsStatusModalOpen(true);
                                 }}
                                 className="appearance-none bg-transparent outline-none px-2.5 py-1 pr-6 cursor-pointer text-inherit font-bold print:pl-2.5 print:pr-2.5"
                               >
                                 <option value="received">دریافت شده</option>
                                 <option value="deposited">خوابانده دفتری</option>
                                 <option value="cashed">وصول شده</option>
                                 <option value="bounced">برگشتی</option>
                                 <option value="returned">عودت داده شده</option>
                               </select>
                               <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 print:hidden" />
                             </div>
                          </td>
                          <td className="px-4 py-3.5 print:hidden">
                            <div className="flex items-center justify-center gap-1.5">
                              {sendNotification && payer?.phone && storeSettings?.smsTemplateCheck && (
                                <button
                                  onClick={async () => {
                                    let msg = storeSettings.smsTemplateCheck
                                      .replace(/{name}/g, payer.name)
                                      .replace(/{amount}/g, Number(c.amount).toLocaleString())
                                      .replace(/{check_number}/g, c.checkNumber)
                                      .replace(/{due_date}/g, c.dueDate);
                                    await sendNotification(msg, payer.phone, storeSettings?.notify_method);
                                    if(showNotification) showNotification('پیامک یادآوری با موفقیت ارسال شد', 'success');
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100 inline-block"
                                  title="ارسال پیامک یادآوری"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={async () => {
                                  setHistoryCheck({ ...c, checkType: 'received' });
                                  const h = await getCheckAuditLogs(c.id, 'received');
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
                                onClick={() => { setUpdatingCheckId(c.id); setUpdatingCheckType('received'); setStatusVal(c.status || 'received'); setIsStatusModalOpen(true); }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 inline-block"
                                title="مدیریت وضعیت چک"
                              >
                                <Activity className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => { 
                                  if (onEditReceiptByCheck) {
                                    onEditReceiptByCheck(c, 'received');
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
                                    handleDeleteReceivedCheck(c.id);
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
                    {filteredReceivedChecks.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-gray-400 text-sm font-medium">
                        <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        هیچ چکی مطابق شرایط جستجو در سیستم یافت نشد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

            {/* Pagination Controls */}
            {totalReceivedPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6 pb-6">
                <button 
                  onClick={() => setReceivedPage(p => Math.max(1, p - 1))}
                  disabled={receivedPage === 1}
                  className="px-4 py-2 border rounded-xl text-sm font-bold bg-white text-gray-700 disabled:opacity-50"
                >
                  قبلی
                </button>
                <span className="text-sm font-bold text-gray-700">صفحه {receivedPage} از {totalReceivedPages}</span>
                <button 
                  onClick={() => setReceivedPage(p => Math.min(totalReceivedPages, p + 1))}
                  disabled={receivedPage === totalReceivedPages}
                  className="px-4 py-2 border rounded-xl text-sm font-bold bg-white text-gray-700 disabled:opacity-50"
                >
                  بعدی
                </button>
              </div>
            )}
        

      {/* BULK ACTIONS */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-6"
          >
            <div className="font-bold">
              <span className="text-indigo-400 text-lg mr-2">{selectedIds.length}</span>
              چک انتخاب شده
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                if(window.confirm('آیا از حذف گروهی این ' + selectedIds.length + ' چک اطمینان دارید؟\nاین عمل غیرقابل بازگشت است.')){
                  selectedIds.forEach(id => handleDeleteReceivedCheck(id));
                  setSelectedIds([]);
                  showNotification('حذف گروهی با موفقیت انجام شد.', 'success');
                }
              }} className="px-4 py-2 bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white rounded-lg text-sm font-bold transition-colors">
                حذف دسته‌جمعی
              </button>
              <button onClick={() => {
                const selected = receivedChecks.filter(c => selectedIds.includes(c.id));
                const allSameBank = selected.every(c => c.status === 'received' || c.status === 'deposited');
                if (!allSameBank) {
                  showNotification('فقط چک‌های نزد صندوق یا در جریان وصول قابل چاپ در فرم واگذاری هستند.', 'error');
                  return;
                }
                // We dispatch a custom event that CheckManagement or App can listen to, or we can just render the modal here!
                window.dispatchEvent(new CustomEvent('printBankTransfer', { detail: selected }));
              }} className="px-4 py-2 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white rounded-lg text-sm font-bold transition-colors">
                چاپ فرم واگذاری به بانک
              </button>
              <button onClick={() => setSelectedIds([])} className="px-4 py-2 text-slate-300 hover:text-white text-sm font-bold">
                انصراف
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
