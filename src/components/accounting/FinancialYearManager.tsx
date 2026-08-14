import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Save, Trash2, Edit2, AlertTriangle, Building2, CheckCircle, X, Check, Lock, Unlock, RefreshCw, Plus } from "lucide-react";
import { getFinancialYears, getStoreSettings, addFinancialYear, closeFinancialYear } from "../../services/dataService";
import { formatDateDisplay } from "../../utils/format";
import { motion, AnimatePresence } from "motion/react";
const YearClosingChecklistModal = ({ isOpen, onClose }: any) => { return null; };
import DatePickerModule from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

import CustomDatePicker from "../ui/CustomDatePicker";
const DatePicker = CustomDatePicker;

export default function FinancialYearManager({ showNotification }: any) {
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarType, setCalendarType] = useState('jalali');

  // Form states
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirm close dialog state
  const [confirmCloseId, setConfirmCloseId] = useState<string | number | null>(null);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [selectedYearForClose, setSelectedYearForClose] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [yearsList, settings] = await Promise.all([
        getFinancialYears(),
        getStoreSettings()
      ]);
      setYears(yearsList);
      const calType = (settings as any)?.calendarType || 'jalali';
      setCalendarType(calType);
      
      // Auto pre-fill name for convenience
      if (calType === 'jalali') {
        setName('سال مالی ۱۴۰۵');
        setStartDate(new Date("2026-03-21T00:00:00Z").toISOString());
        setEndDate(new Date("2027-03-20T00:00:00Z").toISOString());
      } else {
        const yr = new Date().getFullYear();
        setName(`Financial Year ${yr}`);
        setStartDate(new Date(yr, 0, 1).toISOString());
        setEndDate(new Date(yr, 11, 31).toISOString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const activeYear = years.find(y => y.status === 'open');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      showNotification('لطفاً تمامی فیلدهای اجباری را تکمیل کنید.', 'error');
      return;
    }

    if (activeYear) {
      showNotification('در حال حاضر یک سال مالی باز در سیستم وجود دارد. ابتدا آن را ببندید.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const newYear = {
        name,
        startDate,
        endDate,
        description,
        status: 'open'
      };
      await addFinancialYear(newYear);
      showNotification('سال مالی جدید با موفقیت ایجاد و فعال شد.', 'success');
      setName('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      showNotification(err.message || 'خطا در ثبت سال مالی جدید', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseYear = async (id: string | number) => {
    try {
      await closeFinancialYear(id);
      showNotification('سال مالی با موفقیت بسته شد. سیستم هم‌اکنون آماده تعریف سال مالی جدید است.', 'success');
      setConfirmCloseId(null);
      await loadData();
    } catch (err: any) {
      showNotification(err.message || 'خطا در بستن سال مالی', 'error');
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600 shadow-sm">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">تعریف و مدیریت سال‌های مالی</h2>
            <p className="text-xs text-slate-500 mt-1">
              تنظیم محدوده تاریخی و وضعیت سال‌های مالی جهت صحت اسناد و تراکنش‌ها (تقویم فعال: {calendarType === 'jalali' ? 'شمسی جلالی' : 'میلادی'})
            </p>
          </div>
        </div>
      </div>

      {/* Info Warning Alert if no active financial year */}
      {!loading && !activeYear && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">توجه: هیچ سال مالی فعال و بازی در سیستم وجود ندارد!</p>
            <p className="text-xs mt-1">
              ثبت فاکتور، سند حسابداری، رسید دریافت/پرداخت و سایر عملیات مالی تا زمانیکه یک سال مالی باز ایجاد نکنید، غیرفعال خواهد بود.
              لطفاً از فرم زیر برای ایجاد اولین یا سال مالی جدید خود استفاده کنید.
            </p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-400 block">وضعیت سیستم</span>
            <span className={`text-sm font-black mt-1 inline-block px-2.5 py-1 rounded-full ${activeYear ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
              {activeYear ? 'فعال و آماده کار' : 'غیرفعال (بدون سال مالی باز)'}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${activeYear ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-400 block">سال مالی فعال</span>
            <span className="text-sm font-black text-slate-700 mt-1 block">
              {activeYear ? activeYear.name : 'مشخص نشده'}
            </span>
          </div>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
            <CalendarIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold text-slate-400 block">محدوده سال مالی فعال</span>
            <span className="text-sm font-bold text-slate-600 mt-1 block" dir="ltr">
              {activeYear ? `${formatDateDisplay(activeYear.startDate, calendarType)} ~ ${formatDateDisplay(activeYear.endDate, calendarType)}` : '-'}
            </span>
          </div>
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sticky top-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              تعریف سال مالی جدید
            </h3>

            {activeYear ? (
              <div className="bg-slate-50 border border-slate-200 text-slate-600 p-4 rounded-xl text-xs space-y-2.5">
                <p className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-600" />
                  ایجاد سال مالی غیرفعال است
                </p>
                <p className="leading-relaxed">
                  تا زمانی که سال مالی باز و فعال وجود دارد، نمی‌توان سال مالی جدیدی ایجاد کرد (تنها یک سال مالی می‌تواند باز باشد).
                </p>
                <p className="font-bold text-indigo-600 bg-indigo-50/50 p-2 rounded border border-indigo-100/50">
                  راهنما: برای افتتاح سال مالی جدید، ابتدا باید سال مالی جاری («{activeYear.name}») را از جدول سمت چپ ببندید.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان سال مالی *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="مثال: سال مالی ۱۴۰۵"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ شروع سال مالی *</label>
                    <div className="custom-datepicker-wrapper w-full">
                      {calendarType === 'jalali' ? (
                        <DatePicker
                          value={startDate ? new Date(startDate) : ""}
                          onChange={(d: any) => setStartDate(d?.toDate?.()?.toISOString() || '')}
                          calendar={persian}
                          locale={persian_fa}
                          calendarPosition="bottom-right"
                          className="w-full"
                          inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      ) : (
                        <input
                          type="date"
                          required
                          value={startDate ? new Date(startDate).toISOString().split("T")[0] : ""}
                          onChange={e => setStartDate(e.target.value ? new Date(e.target.value).toISOString() : "")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 text-left"
                          dir="ltr"
                        />
                      )}
                    </div>
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ پایان سال مالی *</label>
                    <div className="custom-datepicker-wrapper w-full">
                      {calendarType === 'jalali' ? (
                        <DatePicker
                          value={endDate ? new Date(endDate) : ""}
                          onChange={(d: any) => setEndDate(d?.toDate?.()?.toISOString() || '')}
                          calendar={persian}
                          locale={persian_fa}
                          calendarPosition="bottom-right"
                          className="w-full"
                          inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      ) : (
                        <input
                          type="date"
                          required
                          value={endDate ? new Date(endDate).toISOString().split("T")[0] : ""}
                          onChange={e => setEndDate(e.target.value ? new Date(e.target.value).toISOString() : "")}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 text-left"
                          dir="ltr"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">توضیحات (اختیاری)</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="توضیحات مربوط به سال مالی..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:bg-slate-300"
                >
                  <Plus className="w-4 h-4" />
                  {submitting ? 'در حال ثبت...' : 'ایجاد و افتتاح سال مالی'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Years Table list */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm min-h-[400px]">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-500" />
              لیست کل سال‌های مالی
            </h3>

            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : years.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-bold">هیچ سال مالی ثبت نشده است</p>
                <p className="text-xs mt-1">با استفاده از فرم سمت راست اولین سال مالی خود را افتتاح کنید.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <th className="p-3 font-bold text-xs">عنوان سال مالی</th>
                      <th className="p-3 font-bold text-xs">تاریخ شروع</th>
                      <th className="p-3 font-bold text-xs">تاریخ پایان</th>
                      <th className="p-3 font-bold text-xs text-center">وضعیت</th>
                      <th className="p-3 font-bold text-xs text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {years.map(y => (
                      <tr key={y.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-black text-slate-700">{y.name}</td>
                        <td className="p-3 text-slate-600 font-mono text-xs" dir="ltr">{formatDateDisplay(y.startDate, calendarType)}</td>
                        <td className="p-3 text-slate-600 font-mono text-xs" dir="ltr">{formatDateDisplay(y.endDate, calendarType)}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                            y.status === 'open' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {y.status === 'open' ? 'باز و فعال' : 'بسته شده (فقط خواندنی)'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {y.status === 'open' ? (
                            <button
                              onClick={() => { setSelectedYearForClose(y); setIsChecklistOpen(true); }}
                              className="px-3 py-1 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 font-bold transition-all"
                            >
                              بستن سال مالی
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs flex items-center justify-center gap-1">
                              <Lock className="w-3.5 h-3.5" />
                              فقط خواندنی
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Close Confirm modal */}
      <AnimatePresence>
        <YearClosingChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
        year={selectedYearForClose}
        onConfirm={(id: any) => {
          setIsChecklistOpen(false);
          handleCloseYear(id);
        }}
      />
      </AnimatePresence>
    </div>
  );
}
