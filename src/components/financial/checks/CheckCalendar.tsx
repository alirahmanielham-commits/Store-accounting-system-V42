import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ArrowDownLeft, ArrowUpRight, Calendar, AlertTriangle
} from 'lucide-react';
import { Calendar as RMCalendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { toPersianDigits } from "./utils";
import { formatDateDisplay } from "../../../utils/format";

export function CheckCalendar({ storeSettings, issuedChecks, receivedChecks, persons, checkbooks, accounts, selectedCalendarDate, setSelectedCalendarDate, normalizeDate, getSelectedRange, setViewingCheck }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDate, setActiveDate] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleDateChange = (dates: any) => {
    setSelectedCalendarDate(dates || []);
    if (dates && (!Array.isArray(dates) || dates.length > 0)) {
       const dateObj = Array.isArray(dates) ? dates[dates.length - 1] : dates;
       setActiveDate(dateObj.format('YYYY/MM/DD'));
       setIsModalOpen(true);
    }
  };

  const getDayChecks = (dateStr: string) => {
    // dateStr could be from react-multi-date-picker (e.g. 1403/05/22 in English or Persian digits)
    const target = toPersianDigits(dateStr);
    
    const received = receivedChecks.filter((c: any) => toPersianDigits(formatDateDisplay(c.dueDate, storeSettings?.calendarType)) === target);
    const issued = issuedChecks.filter((c: any) => toPersianDigits(formatDateDisplay(c.dueDate, storeSettings?.calendarType)) === target);
    return { received, issued };
  };

  const isOverdue = (c: any) => {
    if (!c.dueDate) return false;
    const d = new Date(c.dueDate);
    d.setHours(0, 0, 0, 0);
    const isPending = c.status === 'issued' || c.status === 'received' || c.status === 'deposited';
    return d < today && isPending;
  };

  return (
    <>
      <div className="flex flex-col items-center max-w-4xl mx-auto">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col items-center w-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          
          <div className="w-full flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              تقویم سررسید چک‌ها
            </h3>
            <p className="text-xs text-gray-500">برای مشاهده جزئیات، روی روزهای رنگی کلیک کنید</p>
          </div>

          <div className="calendar-container w-full flex justify-center [&>.rmdp-wrapper]:w-full [&>.rmdp-wrapper]:shadow-none [&>.rmdp-wrapper]:border-0 [&_.rmdp-calendar]:w-full [&_.rmdp-day-picker]:w-full [&_.rmdp-day-picker>div]:w-full [&_.rmdp-week]:w-full [&_.rmdp-week]:justify-around [&_.rmdp-day]:w-12 [&_.rmdp-day]:h-12 [&_.rmdp-day]:text-sm">
            <RMCalendar
              calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
              locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
              value={selectedCalendarDate}
              onChange={handleDateChange}
              className="w-full !shadow-none !border-0"
              mapDays={({ date }) => {
                const dateStr = date.format('YYYY/MM/DD');
                const { received, issued } = getDayChecks(dateStr);
                
                const hasReceived = received.length > 0;
                const hasIssued = issued.length > 0;
                const hasOverdue = received.some(isOverdue) || issued.some(isOverdue);
                
                let className = "";
                if (hasOverdue) {
                  className = "bg-rose-100 text-rose-800 font-bold border-2 border-rose-500 relative animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]";
                } else if (hasIssued && hasReceived) {
                  className = "bg-indigo-100 text-indigo-800 font-bold border border-indigo-300";
                } else if (hasIssued) {
                  className = "bg-orange-50 text-orange-700 font-bold border border-orange-200";
                } else if (hasReceived) {
                  className = "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200";
                }
                
                return { 
                  className,
                  children: (
                    <div className="w-full h-full flex items-center justify-center relative">
                      {date.format('D')}
                      {hasOverdue && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full border border-white"></span>
                      )}
                    </div>
                  )
                };
              }}
            />
          </div>
          
          <div className="mt-8 w-full grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-100 pt-6">
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-xl">
              <span className="w-3 h-3 rounded-full bg-emerald-50 border border-emerald-200 block shrink-0"></span>
              چک دریافتی (سبز)
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-xl">
              <span className="w-3 h-3 rounded-full bg-orange-50 border border-orange-200 block shrink-0"></span>
              چک پرداختی (نارنجی)
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-xl">
              <span className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300 block shrink-0"></span>
              دریافتی و پرداختی
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-100">
              <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-600 block shrink-0"></span>
              سررسید گذشته (نیاز به اقدام)
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Day Details */}
      <AnimatePresence>
        {isModalOpen && activeDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white rounded-3xl shadow-2xl z-50 flex flex-col max-h-[90vh] overflow-hidden"
              dir="rtl"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800 text-lg">چک‌های سررسید شده</h3>
                    <p className="text-xs text-indigo-600 font-bold mt-0.5 font-mono">{activeDate}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Received Checks */}
                  <div className="bg-white border text-right border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-emerald-50/50 text-emerald-900 border-b border-emerald-100 px-4 py-3 font-bold text-sm flex items-center gap-2">
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                      چک‌های دریافتی روز
                      <span className="mr-auto bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs">
                        {getDayChecks(activeDate).received.length}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      {getDayChecks(activeDate).received.map(c => (
                        <div key={c.id} className={`border rounded-xl p-3 shadow-xs hover:shadow-md transition-all ${isOverdue(c) ? 'border-rose-200 bg-rose-50/30' : 'border-gray-100'}`}>
                          {isOverdue(c) && (
                            <div className="text-xs font-bold text-rose-600 mb-2 flex items-center gap-1 bg-rose-50 inline-flex px-2 py-1 rounded-md">
                              <AlertTriangle className="w-3 h-3" /> سررسید گذشته و در جریان
                            </div>
                          )}
                          <div className="flex justify-between items-center mb-2">
                            <span 
                              className="font-mono text-sm font-black text-gray-900 cursor-pointer hover:text-indigo-600 hover:underline transition-colors decoration-dashed underline-offset-4"
                              onClick={() => {
                                setIsModalOpen(false);
                                setViewingCheck && setViewingCheck({ ...c, _type: 'received' });
                              }}
                            >
                              {c.checkNumber}
                            </span>
                            <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${
                              c.status === 'cashed' ? 'bg-emerald-100 text-emerald-700' : 
                              c.status === 'bounced' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700' 
                            }`}>
                               {c.status === 'cashed' ? 'وصول شده' : c.status === 'bounced' ? 'برگشتی' : 'در جریان وصول'}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-gray-700 mb-2 truncate">
                             مشتری: {persons.find(p => p.id?.toString() === c.payerId?.toString())?.name || c.payerId}
                          </div>
                          <div className="flex justify-between items-end border-t border-dashed border-gray-200 pt-3 mt-3">
                            <span className="text-xs text-emerald-600 font-bold">مبلغ :</span>
                            <span className="font-sans text-emerald-600 font-black text-sm">{Number(c.amount).toLocaleString()} <span className="text-[10px] text-gray-400">{storeSettings?.currency || 'تومان'}</span></span>
                          </div>
                        </div>
                      ))}
                      {getDayChecks(activeDate).received.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-xs font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">چک دریافتی وجود ندارد</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Issued Checks */}
                  <div className="bg-white border text-right border-orange-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-orange-50/50 text-orange-900 border-b border-orange-100 px-4 py-3 font-bold text-sm flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-orange-600" />
                      چک‌های پرداختی روز
                      <span className="mr-auto bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">
                        {getDayChecks(activeDate).issued.length}
                      </span>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      {getDayChecks(activeDate).issued.map(c => (
                        <div key={c.id} className={`border rounded-xl p-3 shadow-xs hover:shadow-md transition-all ${isOverdue(c) ? 'border-rose-200 bg-rose-50/30' : 'border-gray-100'}`}>
                          {isOverdue(c) && (
                            <div className="text-xs font-bold text-rose-600 mb-2 flex items-center gap-1 bg-rose-50 inline-flex px-2 py-1 rounded-md">
                              <AlertTriangle className="w-3 h-3" /> نیازمند تامین موجودی / اقدام
                            </div>
                          )}
                          <div className="flex justify-between items-center mb-2">
                            <span 
                              className="font-mono text-sm font-black text-gray-900 cursor-pointer hover:text-indigo-600 hover:underline transition-colors decoration-dashed underline-offset-4"
                              onClick={() => {
                                setIsModalOpen(false);
                                setViewingCheck && setViewingCheck({ ...c, _type: 'issued' });
                              }}
                            >
                              {c.checkNumber}
                            </span>
                            <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${
                              c.status === 'cashed' ? 'bg-emerald-100 text-emerald-700' : 
                              c.status === 'bounced' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700' 
                            }`}>
                              {c.status === 'cashed' ? 'پاس شده' : c.status === 'bounced' ? 'برگشتی' : 'در جریان پرداخت'}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-gray-700 mb-2 truncate">
                             ذینفع: {persons.find(p => p.id?.toString() === c.payeeId?.toString())?.name || c.payeeId}
                          </div>
                          <div className="flex justify-between items-end border-t border-dashed border-gray-200 pt-3 mt-3">
                            <span className="text-xs text-orange-600 font-bold">مبلغ :</span>
                            <span className="font-sans text-orange-600 font-black text-sm">{Number(c.amount).toLocaleString()} <span className="text-[10px] text-gray-400">{storeSettings?.currency || 'تومان'}</span></span>
                          </div>
                        </div>
                      ))}
                      {getDayChecks(activeDate).issued.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-xs font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">چک پرداختی وجود ندارد</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
