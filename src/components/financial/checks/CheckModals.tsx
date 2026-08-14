import { convertToGregorian } from "../../../utils/format";
import { toPersianDigits, getDaysRemaining, safeParseDate } from "./utils";
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Bar } from "recharts";
import { 
  CreditCard, Plus, Edit2, Trash2, CheckCircle, Clock, X, Save, 
  ArrowDownLeft, BookOpen, ArrowUpRight, Calendar, Building2, HelpCircle, AlertTriangle, Search, TrendingUp, DollarSign, Percent, BarChart as BarChartIcon, ChevronDown, Printer, History, Activity, User, Send
, ArrowLeft} from 'lucide-react';
import DatePickerModule, { Calendar as RMCalendar } from "react-multi-date-picker";
import CustomDatePicker from "../../ui/CustomDatePicker";
const DatePicker = CustomDatePicker;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export function CheckModals({ issuedChecks, showNotification, receivedChecks, setHistoryCheck, 
isIssuedModalOpen, setIsIssuedModalOpen,
isReceivedModalOpen, setIsReceivedModalOpen,
isStatusModalOpen, setIsStatusModalOpen,
isHistoryModalOpen, setIsHistoryModalOpen,
editingIssuedCheckId, setEditingIssuedCheckId,
editingReceivedCheckId, setEditingReceivedCheckId,
icCheckbookId, setIcCheckbookId,
icCheckNumber, setIcCheckNumber,
    icSayadId, setIcSayadId,
    icReason, setIcReason,
icPayeeId, setIcPayeeId,
icAmount, setIcAmount,
icIssueDate, setIcIssueDate,
icDueDate, setIcDueDate,
icDescription, setIcDescription,
icAttachments, setIcAttachments,
rcPayerId, setRcPayerId,
rcBankName, setRcBankName,
rcBranchName, setRcBranchName,
rcCheckNumber, setRcCheckNumber,
    rcSayadId, setRcSayadId,
    rcReason, setRcReason,
rcAmount, setRcAmount,
rcReceiveDate, setRcReceiveDate,
rcDueDate, setRcDueDate,
rcDescription, setRcDescription,
rcAttachments, setRcAttachments,
updatingCheckType, setUpdatingCheckType,
updatingCheckId, setUpdatingCheckId,
statusVal, setStatusVal,
statusDesc, setStatusDesc,
depositAccountId, setDepositAccountId,
assignedVendorId, setAssignedVendorId,
currentCheckForStatus,
currentActualStatus,
validTransitions,
handleIssueCheckSubmit,
handleReceiveCheckSubmit,
handleUpdateStatus,
persons, checkbooks, accounts, historyCheck, historyData,
formatDateDisplay, storeSettings, toPersianDigits}) {
  return (
    <>
<AnimatePresence>
<AnimatePresence>

        {/* MODAL 2: ISSUE NEW CHECK */}
        {isIssuedModalOpen && (
          <div key="isIssuedModalOpen-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" dir="rtl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-xl border flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4 border-b pb-3 shrink-0">
                <h3 className="text-base font-black text-rose-950 flex items-center gap-1.5">
                  <ArrowUpRight className="w-5 h-5 text-rose-600" />
                  {editingIssuedCheckId ? 'ویرایش صدور چک' : 'دستور صدور چک جدید (پرداختنی)'}
                </h3>
                <button onClick={() => setIsIssuedModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 pl-1 pr-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <form onSubmit={handleIssueCheckSubmit} className="space-y-4 text-right">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">دسته چک بانکی مرجع</label>
                    <select value={icCheckbookId} onChange={e => {
                      setIcCheckbookId(e.target.value);
                      const selectedCb = checkbooks.find(x => x.id == e.target.value);
                      if (selectedCb) {
                        const availableCheck = issuedChecks.find(ic => String(ic.checkbookId) === String(selectedCb.id) && ic.status === 'blank');
                        if (availableCheck) setIcCheckNumber(availableCheck.checkNumber);
                      }
                    }} className="w-full border rounded-xl px-4 py-2 text-sm bg-white">
                      <option value="">-- بدون انتخاب (صدور مستقیم) --</option>
                      {(checkbooks || []).map(cb => {
                        const acc = accounts.find(a => a.id == cb.accountId);
                        return <option key={cb.id} value={cb.id}>{acc?.bankName || 'نامشخص'} (برگه‌های: {cb.startNumber} تا {cb.endNumber})</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">شماره چک *</label>
                    {icCheckbookId ? (
                      <select required value={icCheckNumber} onChange={e => setIcCheckNumber(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-sm font-mono text-center bg-white" dir="ltr">
                        <option value="">-- انتخاب از برگ‌های سفید --</option>
                        {(issuedChecks || []).filter(ic => String(ic.checkbookId) === String(icCheckbookId) && ic.status === 'blank').map(c => (
                          <option key={c.id} value={c.checkNumber}>{c.checkNumber}</option>
                        ))}
                      </select>
                    ) : (
                      <input required type="text" value={icCheckNumber} onChange={e => setIcCheckNumber(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-sm font-mono text-center" dir="ltr" placeholder="مثلا 45203" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">گیرنده چک (طرف حساب ذینفع) *</label>
                  <select required value={icPayeeId} onChange={e => setIcPayeeId(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-sm bg-white">
                    <option value="">-- انتخاب طرف حساب --</option>
                    {(persons || []).filter(p => p.isActive !== false).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.role === 'customer' ? 'مشتری' : p.role === 'supplier' ? 'تامین کننده' : 'همکار'})</option>
                    ))}
                  </select>
                </div>

                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">شناسه صیادی (۱۶ رقم) *</label>
                    <input required type="text" value={icSayadId || ''} onChange={e => setIcSayadId(e.target.value)} pattern="\\d{16}" title="شناسه صیادی باید دقیقاً ۱۶ رقم باشد" className="w-full border rounded-xl px-4 py-2 text-sm font-mono text-center focus:ring-2 focus:ring-indigo-500" dir="ltr" placeholder="1234567890123456" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">بابت *</label>
                    <select required value={icReason || 'خرید کالا'} onChange={e => setIcReason(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="خرید کالا">خرید کالا</option>
                      <option value="تسویه بدهی">تسویه بدهی</option>
                      <option value="حقوق و دستمزد">حقوق و دستمزد</option>
                      <option value="سایر">سایر</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">مبلغ چک ({storeSettings?.currency || 'تومان'}) *</label>
                  <input required type="number" min="1" value={icAmount} onChange={e => setIcAmount(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-sm font-mono text-left block text-indigo-950 font-black" dir="ltr" placeholder="10,000,000" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">تاریخ صدور</label>
                    <div className="relative">
                       <DatePicker
                         value={icIssueDate as any || ''}
                         onChange={(d: any) => setIcIssueDate(d ? d.format('YYYY/MM/DD') : '')}
                         calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                         locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                         calendarPosition="bottom-right"
                         containerClassName="w-full"
                         inputClass="w-full border rounded-xl px-4 py-2 text-sm text-center font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         placeholder="انتخاب تاریخ"
                       />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">تاریخ سررسید چک *</label>
                    <div className="relative">
                       <DatePicker
                         value={safeParseDate(icDueDate)}
                         onChange={(d: any) => setIcDueDate((d ? convertToGregorian(d) : ""))}
                         calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                         locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                         calendarPosition="bottom-right"
                         containerClassName="w-full"
                         inputClass="w-full border rounded-xl px-4 py-2 text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         placeholder="انتخاب تاریخ"
                       />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">توضیحات و بابت</label>
                  <textarea rows={2} value={icDescription} onChange={e => setIcDescription(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-xs" placeholder="بابت فاکتور خرید فلان یا هرگونه یادداشت اضافی..."></textarea>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">تصویر چک (اختیاری)</label>
                  <div className="flex flex-col gap-2">
                    <input type="file" accept="image/*" multiple onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach(file => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setIcAttachments(prev => [...(prev || []), reader.result as string]);
                        };
                        reader.readAsDataURL(file);
                      });
                    }} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    {icAttachments?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {icAttachments.map((att, i) => (
                          <div key={i} className="relative group w-16 h-16 rounded-xl border overflow-hidden">
                            <img src={att} alt="attachment" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setIcAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t">
                  <button type="button" onClick={() => setIsIssuedModalOpen(false)} className="px-4 py-2 border bg-white border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50">انصراف</button>
                  <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm">{editingIssuedCheckId ? 'ذخیره تغییرات' : 'تایید و صدور برگه چک'}</button>
                </div>
              </form>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col h-full min-h-[350px]">
                    <h4 className="text-sm font-black text-slate-700 mb-6 flex items-center gap-2">
                      <BarChartIcon className="w-5 h-5 text-indigo-500" />
                      تعهدات پرداختی در محدوده سررسید (بازه ۱ ماهه)
                    </h4>
                    {icDueDate ? (
                      <div className="flex-1 w-full h-full">
                        {(() => {
                           const targetDate = new Date(icDueDate);
                           const start = new Date(targetDate); start.setDate(start.getDate() - 15);
                           const end = new Date(targetDate); end.setDate(end.getDate() + 15);
                           const filtered = issuedChecks.filter(c => {
                             if (!c.dueDate || c.status === 'blank' || c.status === 'cancelled' || c.status === 'bounced') return false;
                             const d = new Date(c.dueDate);
                             return d >= start && d <= end;
                           });
                           
                           if (filtered.length === 0) {
                             return <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3"><CheckCircle className="w-12 h-12 text-emerald-200" /><span className="text-sm font-bold">هیچ پرداختی در این بازه زمانی وجود ندارد.</span></div>;
                           }
                           
                           const grouped = {};
                           filtered.forEach(c => {
                             let dStr;
                             try {
                               dStr = formatDateDisplay(c.dueDate, storeSettings?.calendarType);
                             } catch (e) {
                               dStr = c.dueDate;
                             }
                             grouped[dStr] = (grouped[dStr] || 0) + Number(c.amount);
                           });
                           
                           const chartData = Object.entries(grouped).map(([date, amount]) => ({ date, amount })).sort((a,b) => a.date.localeCompare(b.date));
                           
                           return (
                             <ResponsiveContainer width="100%" height={280}>
                               <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                 <XAxis dataKey="date" tick={{fontSize: 10, fill: '#6B7280'}} tickMargin={10} axisLine={false} tickLine={false} />
                                 <YAxis tickFormatter={(val) => (val/1000000).toFixed(0) + 'm'} tick={{fontSize: 10, fill: '#6B7280'}} axisLine={false} tickLine={false} />
                                 <Tooltip formatter={(value) => [Number(value).toLocaleString() + ' ' + (storeSettings?.currency || 'تومان'), 'جمع مبالغ پرداختی']} labelStyle={{color: '#374151', fontWeight: 'bold'}} />
                                 <Bar dataKey="amount" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={40} />
                               </BarChart>
                             </ResponsiveContainer>
                           );
                        })()}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-400 text-center space-y-3">
                        <Calendar className="w-12 h-12 text-slate-200" />
                        <span className="font-bold">برای مشاهده نمودار، ابتدا تاریخ سررسید را انتخاب کنید.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 3: RECEIVE NEW CHECK */}
        {isReceivedModalOpen && (
          <div key="isReceivedModalOpen-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" dir="rtl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-xl border flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4 border-b pb-3 shrink-0">
                <h3 className="text-base font-black text-emerald-950 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                  {editingReceivedCheckId ? 'ویرایش دریافت چک' : 'ثبت و دریافت چک جدید (وصولی)'}
                </h3>
                <button onClick={() => setIsReceivedModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 pl-1 pr-1">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <form onSubmit={handleReceiveCheckSubmit} className="space-y-4 text-right">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">پرداخت‌کننده (طرف حساب متعهد چک) *</label>
                  <select required value={rcPayerId} onChange={e => setRcPayerId(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-sm bg-white">
                    <option value="">-- انتخاب پرداخت‌کننده --</option>
                    {(persons || []).filter(p => p.isActive !== false).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.role === 'customer' ? 'مشتری' : p.role === 'supplier' ? 'تامین کننده' : 'همکار'})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">بانک صادرکننده چک *</label>
                    <input required type="text" value={rcBankName} onChange={e => setRcBankName(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-sm" placeholder="ملی، صادرات، پاسارگاد..." />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">شعبه / کد شعبه</label>
                    <input type="text" value={rcBranchName} onChange={e => setRcBranchName(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-sm" placeholder="شعبه مرکزی، کد 123" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">شناسه صیادی (۱۶ رقم) *</label>
                    <input required type="text" value={rcSayadId || ''} onChange={e => setRcSayadId(e.target.value)} pattern="\\d{16}" title="شناسه صیادی باید دقیقاً ۱۶ رقم باشد" className="w-full border rounded-xl px-4 py-2 text-sm font-mono text-center focus:ring-2 focus:ring-indigo-500" dir="ltr" placeholder="1234567890123456" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">بابت *</label>
                    <select required value={rcReason || 'تسویه بدهی'} onChange={e => setRcReason(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="خرید کالا">خرید کالا</option>
                      <option value="تسویه بدهی">تسویه بدهی</option>
                      <option value="سایر">سایر</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">شماره چک *</label>
                    <input required type="text" value={rcCheckNumber} onChange={e => setRcCheckNumber(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-sm font-mono text-center" dir="ltr" placeholder="مثلا 12345/67" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">مبلغ چک ({storeSettings?.currency || 'تومان'}) *</label>
                    <input required type="number" min="1" value={rcAmount} onChange={e => setRcAmount(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-sm font-mono text-left block text-indigo-950 font-black" dir="ltr" placeholder="25,000,000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">تاریخ دریافت چک</label>
                    <div className="relative">
                       <DatePicker
                         value={safeParseDate(rcReceiveDate)}
                         onChange={(d: any) => setRcReceiveDate((d ? convertToGregorian(d) : ""))}
                         calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                         locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                         calendarPosition="top-right"
                         containerClassName="w-full"
                         inputClass="w-full border rounded-xl px-4 py-2 text-sm text-center font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500"
                         placeholder="انتخاب تاریخ"
                       />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">تاریخ سررسید چک *</label>
                    <div className="relative">
                       <DatePicker
                         value={safeParseDate(rcDueDate)}
                         onChange={(d: any) => setRcDueDate((d ? convertToGregorian(d) : ""))}
                         calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                         locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                         calendarPosition="top-right"
                         containerClassName="w-full"
                         inputClass="w-full border rounded-xl px-4 py-2 text-sm text-center font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                         placeholder="انتخاب تاریخ"
                       />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">بابت و توضیحات چک</label>
                  <textarea rows={2} value={rcDescription} onChange={e => setRcDescription(e.target.value)} className="w-full border rounded-xl px-4 py-2 text-xs" placeholder="بابت فاکتور فروش یا هرگونه یادداشت..."></textarea>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">تصویر چک (اختیاری)</label>
                  <div className="flex flex-col gap-2">
                    <input type="file" accept="image/*" multiple onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach(file => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setRcAttachments(prev => [...(prev || []), reader.result as string]);
                        };
                        reader.readAsDataURL(file);
                      });
                    }} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                    {rcAttachments?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rcAttachments.map((att, i) => (
                          <div key={i} className="relative group w-16 h-16 rounded-xl border overflow-hidden">
                            <img src={att} alt="attachment" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setRcAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t">
                  <button type="button" onClick={() => setIsReceivedModalOpen(false)} className="px-4 py-2 border bg-white border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50">انصراف</button>
                  <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm">{editingReceivedCheckId ? 'ذخیره تغییرات' : 'ثبت و ذخیره چک'}</button>
                </div>
              </form>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col h-full min-h-[350px]">
                    <h4 className="text-sm font-black text-slate-700 mb-6 flex items-center gap-2">
                      <BarChartIcon className="w-5 h-5 text-indigo-500" />
                      درآمدهای وصولی در محدوده سررسید (بازه ۱ ماهه)
                    </h4>
                    {rcDueDate ? (
                      <div className="flex-1 w-full h-full">
                        {(() => {
                           const targetDate = new Date(rcDueDate);
                           const start = new Date(targetDate); start.setDate(start.getDate() - 15);
                           const end = new Date(targetDate); end.setDate(end.getDate() + 15);
                           const filtered = receivedChecks.filter(c => {
                             if (!c.dueDate || c.status === 'returned' || c.status === 'bounced' || c.status === 'bounced_assigned') return false;
                             const d = new Date(c.dueDate);
                             return d >= start && d <= end;
                           });
                           
                           if (filtered.length === 0) {
                             return <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3"><CheckCircle className="w-12 h-12 text-emerald-200" /><span className="text-sm font-bold">هیچ وصولی در این بازه زمانی وجود ندارد.</span></div>;
                           }
                           
                           const grouped = {};
                           filtered.forEach(c => {
                             let dStr;
                             try {
                               dStr = formatDateDisplay(c.dueDate, storeSettings?.calendarType);
                             } catch (e) {
                               dStr = c.dueDate;
                             }
                             grouped[dStr] = (grouped[dStr] || 0) + Number(c.amount);
                           });
                           
                           const chartData = Object.entries(grouped).map(([date, amount]) => ({ date, amount })).sort((a,b) => a.date.localeCompare(b.date));
                           
                           return (
                             <ResponsiveContainer width="100%" height={280}>
                               <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                 <XAxis dataKey="date" tick={{fontSize: 10, fill: '#6B7280'}} tickMargin={10} axisLine={false} tickLine={false} />
                                 <YAxis tickFormatter={(val) => (val/1000000).toFixed(0) + 'm'} tick={{fontSize: 10, fill: '#6B7280'}} axisLine={false} tickLine={false} />
                                 <Tooltip formatter={(value) => [Number(value).toLocaleString() + ' ' + (storeSettings?.currency || 'تومان'), 'جمع مبالغ وصولی']} labelStyle={{color: '#374151', fontWeight: 'bold'}} />
                                 <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                               </BarChart>
                             </ResponsiveContainer>
                           );
                        })()}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-sm text-slate-400 text-center space-y-3">
                        <Calendar className="w-12 h-12 text-slate-200" />
                        <span className="font-bold">برای مشاهده نمودار، ابتدا تاریخ سررسید را انتخاب کنید.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 4: ADJUST STATUS */}
        {isStatusModalOpen && (
          <div key="isStatusModalOpen-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" dir="rtl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-base font-black text-gray-950">تغییر وضعیت برگه چک</h3>
                <button onClick={() => setIsStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); if (window.confirm('آیا از تغییر وضعیت این چک اطمینان دارید؟')) handleUpdateStatus(e); }} className="space-y-4 text-right">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-2.5">انتخاب وضعیت جدید</label>
                    <div className="flex gap-2 flex-wrap items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {updatingCheckType === 'issued' ? (
                        <>
                          <div className="text-xs font-bold text-gray-500 bg-white border px-3 py-2 rounded-lg">وضعیت فعلی: {currentActualStatus === 'issued' ? 'در جریان' : currentActualStatus === 'cashed' ? 'پاس شده' : currentActualStatus === 'bounced' ? 'برگشتی' : currentActualStatus === 'cancelled' ? 'باطل شده' : 'سفید'}</div>
                          {validTransitions.length > 0 && <ArrowLeft className="w-3 h-3 text-gray-300 mx-1" />}
                          {validTransitions.includes('issued') && (
                            <button type="button" onClick={() => setStatusVal('issued')} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${statusVal === 'issued' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-105' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}>در جریان (صادره)</button>
                          )}
                          {validTransitions.includes('cashed') && (
                            <button type="button" onClick={() => setStatusVal('cashed')} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${statusVal === 'cashed' ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}>پاس شده</button>
                          )}
                          {validTransitions.includes('bounced') && (
                            <button type="button" onClick={() => setStatusVal('bounced')} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${statusVal === 'bounced' ? 'bg-rose-600 text-white border-rose-700 shadow-md scale-105' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'}`}>برگشتی</button>
                          )}
                          {validTransitions.includes('cancelled') && (
                            <button type="button" onClick={() => setStatusVal('cancelled')} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${statusVal === 'cancelled' ? 'bg-slate-600 text-white border-slate-700 shadow-md scale-105' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>باطل شده</button>
                          )}
                          {validTransitions.length === 0 && <span className="text-xs text-rose-500 font-bold mr-2">هیچ انتقال مجازی از این وضعیت تعریف نشده است.</span>}
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-bold text-gray-500 bg-white border px-3 py-2 rounded-lg">وضعیت فعلی: {currentActualStatus === 'received' ? 'دریافت شده' : currentActualStatus === 'deposited' ? 'خوابانده به حساب' : currentActualStatus === 'cashed' ? 'وصول شده' : currentActualStatus === 'assigned' ? 'خرج شده' : currentActualStatus === 'bounced_assigned' ? 'برگشتی خرج شده' : currentActualStatus === 'bounced' ? 'برگشتی موجود' : currentActualStatus === 'returned' ? 'عودت داده شده' : 'نامشخص'}</div>
                          {validTransitions.length > 0 && <ArrowLeft className="w-3 h-3 text-gray-300 mx-1" />}
                          {validTransitions.includes('received') && (
                            <button type="button" onClick={() => setStatusVal('received')} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${statusVal === 'received' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-105' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}>دریافت شده</button>
                          )}
                          {validTransitions.includes('deposited') && (
                            <button type="button" onClick={() => setStatusVal('deposited')} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${statusVal === 'deposited' ? 'bg-teal-600 text-white border-teal-700 shadow-md scale-105' : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'}`}>خوابانده به حساب</button>
                          )}
                          {validTransitions.includes('cashed') && (
                            <button type="button" onClick={() => setStatusVal('cashed')} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${statusVal === 'cashed' ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}>وصول شده</button>
                          )}
                          {validTransitions.includes('assigned') && (
                            <button type="button" onClick={() => setStatusVal('assigned')} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${statusVal === 'assigned' ? 'bg-orange-600 text-white border-orange-700 shadow-md scale-105' : 'bg-white text-orange-700 border-orange-200 hover:bg-orange-50'}`}>خرج شده (واگذاری)</button>
                          )}
                          {validTransitions.includes('bounced_assigned') && (
                            <button type="button" onClick={() => setStatusVal('bounced_assigned')} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${statusVal === 'bounced_assigned' ? 'bg-rose-600 text-white border-rose-700 shadow-md scale-105' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'}`}>برگشتی (خرج شده)</button>
                          )}
                          {validTransitions.includes('bounced') && (
                            <button type="button" onClick={() => setStatusVal('bounced')} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${statusVal === 'bounced' ? 'bg-rose-600 text-white border-rose-700 shadow-md scale-105' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'}`}>برگشتی (موجود)</button>
                          )}
                          {validTransitions.includes('returned') && (
                            <button type="button" onClick={() => setStatusVal('returned')} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all border ${statusVal === 'returned' ? 'bg-slate-600 text-white border-slate-700 shadow-md scale-105' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>عودت داده شده</button>
                          )}
                          {validTransitions.length === 0 && <span className="text-xs text-rose-500 font-bold mr-2">هیچ انتقال مجازی از این وضعیت تعریف نشده است.</span>}
                        </>
                      )}
                    </div>
                  </div>

                  {updatingCheckType === 'received' && (statusVal === 'cashed' || statusVal === 'deposited') && (
                    <div className="bg-amber-50/50 p-3.5 border border-amber-100 rounded-xl space-y-1 mt-3 animate-fadeIn">
                       <label className="block text-[10px] font-black text-amber-900 mb-0.5">بانک مقصد جهت واریز وجه چک *</label>
                       <select
                          required
                          value={depositAccountId}
                          onChange={e => setDepositAccountId(e.target.value)} 
                          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-xs bg-white font-bold"
                       >
                         <option value="">-- انتخاب حساب بانکی --</option>
                         {(accounts || []).map((a, idx) => (
                           <option key={a.id ? "cm-dep-acc-" + a.id + "-" + idx : "cm-dep-idx-" + idx} value={a.id}>{a.bankName} - {a.accountNumber || a.cardNumber}</option>
                         ))}
                       </select>
                       <p className="text-[9px] text-amber-700 font-bold mt-1">با تایید وصولی، موجودی حساب فوق افزایش می‌یابد و سند دریافت درج خواهد شد.</p>
                    </div>
                  )}
                  
                  {updatingCheckType === 'issued' && statusVal === 'cashed' && (
                    <div className="bg-amber-50/50 p-3.5 border border-amber-100 rounded-xl space-y-1 mt-3 animate-fadeIn">
                       <label className="block text-[10px] font-black text-amber-900 mb-0.5">بانک مبدا جهت کسر وجه چک *</label>
                       <select
                          required
                          value={depositAccountId}
                          onChange={e => setDepositAccountId(e.target.value)} 
                          className="w-full border border-amber-200 rounded-lg px-3 py-2 text-xs bg-white font-bold"
                       >
                         <option value="">-- انتخاب حساب بانکی --</option>
                         {(accounts || []).map((a, idx) => (
                           <option key={a.id ? "cm-src-acc-" + a.id + "-" + idx : "cm-src-idx-" + idx} value={a.id}>{a.bankName} - {a.accountNumber || a.cardNumber}</option>
                         ))}
                       </select>
                       <p className="text-[9px] text-amber-700 font-bold mt-1">با تایید پاس شدن، موجودی حساب فوق کسر می‌گردد.</p>
                    </div>
                  )}

                  {updatingCheckType === 'received' && statusVal === 'assigned' && (
                    <div className="bg-amber-50/50 p-3.5 border border-amber-100 rounded-xl space-y-1 mt-3 animate-fadeIn">
                       <label className="block text-[10px] font-black text-amber-900 mb-0.5">شخص گیرنده چک (فروشنده) *</label>
                       <select
                          required
                          value={assignedVendorId}
                          onChange={e => setAssignedVendorId(e.target.value)} 
                          className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-amber-500/20"
                       >
                          <option value="">-- انتخاب شخص --</option>
                          {(persons || []).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                       </select>
                    </div>
                  )}
                  
                  <div className="mt-3">
                    <label className="block text-xs font-black text-gray-700 mb-1.5">توضیحات و سوابق (اختیاری)</label>
                    <textarea value={statusDesc} onChange={e => setStatusDesc(e.target.value)} placeholder="دلیل تغییر وضعیت یا تاریخچه..." className="w-full border rounded-xl px-4 py-2.5 text-sm bg-white" rows={2}></textarea>
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={statusVal === currentActualStatus} className={`w-full text-white rounded-xl py-3 text-sm font-bold shadow-lg transition-all ${statusVal === currentActualStatus ? 'bg-gray-300 shadow-none cursor-not-allowed' : 'bg-black shadow-black/20 hover:shadow-black/30 hover:-translate-y-0.5'}`}>تایید و اعمال وضعیت</button>
                  </div>
</form>
            </motion.div>
          </div>
        )}
        {/* MODAL: CHECK HISTORY */}
        {isHistoryModalOpen && historyCheck && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm print:absolute print:inset-0 print:p-0 print:bg-white" dir="rtl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none">
              <div className="flex justify-between items-center p-6 border-b print:hidden">
                <h3 className="text-base font-black text-gray-950 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  سوابق و تاریخچه عملیات چک 
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => window.print()} className="text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-lg transition-colors border border-gray-200" title="چاپ تاریخچه"><Printer className="w-4 h-4" /></button>
                  <button onClick={() => { setIsHistoryModalOpen(false); setHistoryCheck(null); }} className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-2 rounded-lg transition-colors border border-transparent"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto print:p-0 print:pt-4">
                {/* Print Header inside modal */}
                <div className="hidden print:block mb-6 text-center border-b pb-4">
                  <h2 className="text-xl font-black text-gray-900 mb-2">گزارش وضعیت و سوابق چک</h2>
                  <p className="text-sm font-bold text-gray-700">شماره چک: {historyCheck.checkNumber}</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-1">نوع چک:</span>
                    <span className="font-bold text-gray-900">{historyCheck.checkType === 'issued' ? 'صادره (پرداختی)' : 'دریافتی'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">شماره چک:</span>
                    <span className="font-mono font-black text-gray-900 text-sm">{historyCheck.checkNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">مبلغ:</span>
                    <span className="font-sans font-black text-emerald-600 tracking-tight text-sm text-left block" dir="ltr">{Number(historyCheck.amount).toLocaleString()} <span className="text-[10px] text-gray-400">{storeSettings?.currency || 'تومان'}</span></span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">تاریخ سررسید:</span>
                    <span className="font-bold text-gray-900">{formatDateDisplay(historyCheck.dueDate, storeSettings?.calendarType)}</span>
                  </div>
                  <div className="col-span-2">
                     <span className="text-gray-500 block mb-1">طرف حساب:</span>
                     <span className="font-bold text-gray-900">{persons.find(p => p.id === historyCheck.payerId || p.id === historyCheck.payeeId)?.name || historyCheck.payerId || historyCheck.payeeId}</span>
                  </div>
                </div>

                <h4 className="font-black text-sm text-gray-800 mb-4 pb-2 border-b flex items-center gap-2"><Activity className="w-4 h-4 text-gray-400" /> گردش وضعیت</h4>
                <div className="space-y-4">
                  {(!historyData || historyData.length === 0) ? (
                    <div className="text-center py-6 text-xs font-bold text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      تاکنون تاریخچه‌ای برای تغییر وضعیت این چک ثبت نشده است. (وضعیت اولیه)
                    </div>
                  ) : (
                    <div className="relative border-r-2 border-slate-100 pr-4 space-y-6 max-h-[40vh] overflow-y-auto print:max-h-none print:overflow-visible my-2">
                       {historyData.map((h: any, i: number) => {
                          const dateObj = new Date(h.date);
                          const formattedDate = formatDateDisplay(dateObj, storeSettings?.calendarType);
                          const formattedTime = dateObj.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={i} className="relative">
                              <span className="absolute -right-[23px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white print:border-none shadow-sm"></span>
                              <div className="text-xs text-gray-400 mb-1 border-b border-gray-50 pb-1.5 flex justify-between">
                                 <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">
                                   {
                                     h.status === 'issued' ? 'صدور چک' :
                                     h.status === 'received' ? 'دریافت چک' :
                                     h.status === 'deposited' ? 'واگذاری به بانک (خوابانده)' :
                                     h.status === 'cashed' ? 'وصول/پاس شده' :
                                     h.status === 'bounced' ? 'برگشت خورده' :
                                     h.status === 'returned' ? 'عودت داده شده' :
                                     h.status === 'cancelled' ? 'باطل شده' : h.status
                                   }
                                 </span>
                                 <div dir="ltr" className="flex gap-2 items-center text-gray-500 font-mono text-[10px]">
                                    <span>{formattedTime}</span>
                                    <span>{formattedDate}</span>
                                 </div>
                              </div>
                              <div className="flex justify-between items-start mt-1.5">
                                {h.desc ? (
                                  <p className="text-xs font-medium text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 leading-relaxed shadow-sm flex-1 ml-4">{h.desc}</p>
                                ) : (
                                  <p className="text-[10px] text-gray-400 italic flex-1 ml-4">بدون توضیحات اضافی</p>
                                )}
                                {h.user && (
                                  <div className="flex flex-col items-center gap-1 bg-slate-50 border border-slate-100 rounded px-2 py-1 shrink-0 mt-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    <span className="text-[9px] font-bold text-slate-600 truncate max-w-[80px]">{h.user}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                       })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

</AnimatePresence>
    </>
  );
}
