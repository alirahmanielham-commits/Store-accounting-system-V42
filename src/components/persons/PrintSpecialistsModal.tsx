import React, { useState, useRef } from "react";
import {
  Printer,
  X,
  Phone,
  User,
  Hammer,
  MapPin,
  Check,
  FileText,
  Sliders,
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Person, PersonSpecialty } from "../../types";
import { getSpecialtyById } from "../../services/specialistService";

interface PrintSpecialistsModalProps {
  specialists: Person[];
  catalog: PersonSpecialty[];
  onClose: () => void;
  showNotification?: (message: string, type: "success" | "error" | "warning" | "info") => void;
}

export default function PrintSpecialistsModal({
  specialists = [],
  catalog = [],
  onClose,
  showNotification,
}: PrintSpecialistsModalProps) {
  const [printLayout, setPrintLayout] = useState<"table" | "cards">("table");
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("large");
  const [includeNotes, setIncludeNotes] = useState(true);
  const [customTitle, setCustomTitle] = useState("لیست تماس و ویترین متخصصین و استادکاران");
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const copyAllNumbers = () => {
    const list = specialists
      .map((p) => {
        const specs = (p.specialties || [])
          .map((id) => getSpecialtyById(id, catalog)?.name || id)
          .join("، ");
        const phone = p.mobile || p.phone || "بدون شماره";
        return `${p.name || `${p.firstName || ""} ${p.lastName || ""}`}: ${phone} (${specs || "عمومی"})`;
      })
      .join("\n");

    navigator.clipboard.writeText(list);
    showNotification?.("لیست نام و شماره تماس متخصصین در حافظه کپی شد", "success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 text-right dir-rtl font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:m-0 print:p-0 print:border-none print:shadow-none print:max-h-none print:w-full print:fixed print:inset-0 print:bg-white print:z-[9999]">
        
        {/* Modal Controls Header (Hidden during actual print) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>چاپ سریع و خروجی متخصصین</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono">
                  {specialists.length} نفر
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                تنظیم فرمت چاپ، اندازه فونت شماره تلفن و خروجی چاپی A4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={copyAllNumbers}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="کپی متن تمام اسامی و شماره‌ها"
            >
              <Copy className="w-3.5 h-3.5 text-amber-400" />
              <span>کپی متنی شماره‌ها</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>شروع چاپ (Print)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Configuration Toolbar (Hidden during actual print) */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Title Input */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">عنوان برگه:</span>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 min-w-[200px]"
              />
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setPrintLayout("table")}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  printLayout === "table" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span>جدول فشرده A4</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout("cards")}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  printLayout === "cards" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>کارت‌های درشت چاپی</span>
              </button>
            </div>

            {/* Phone Font Size Toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-bold px-1 text-[11px]">اندازه شماره:</span>
              <button
                type="button"
                onClick={() => setFontSize("normal")}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  fontSize === "normal" ? "bg-indigo-600 text-white" : "text-slate-600"
                }`}
              >
                عادی
              </button>
              <button
                type="button"
                onClick={() => setFontSize("large")}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  fontSize === "large" ? "bg-indigo-600 text-white" : "text-slate-600"
                }`}
              >
                درشت
              </button>
              <button
                type="button"
                onClick={() => setFontSize("xlarge")}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${
                  fontSize === "xlarge" ? "bg-indigo-600 text-white" : "text-slate-600"
                }`}
              >
                خیلی درشت
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span>نمایش یادداشت‌ها و تجهیزات در چاپ</span>
          </label>
        </div>

        {/* Printable Area */}
        <div
          ref={printAreaRef}
          className="p-6 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible text-slate-900 font-sans"
        >
          {/* Print Sheet Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {customTitle}
              </h1>
              <p className="text-xs text-slate-600 font-bold mt-1">
                تاریخ چاپ: {new Date().toLocaleDateString("fa-IR")} · تعداد متخصصین: {specialists.length} نفر
              </p>
            </div>
            <div className="text-left font-mono text-xs text-slate-500 dir-ltr">
              <span className="font-bold block text-slate-800">سامانه مدیریت متخصصین</span>
              <span>تلفن‌های ارتباط سریع</span>
            </div>
          </div>

          {/* LAYOUT 1: COMPACT A4 TABLE SHEET */}
          {printLayout === "table" ? (
            <table className="w-full text-right text-xs border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-black border-b-2 border-slate-400">
                  <th className="p-2.5 border border-slate-300 w-12 text-center">ردیف</th>
                  <th className="p-2.5 border border-slate-300">نام و نام خانوادگی</th>
                  <th className="p-2.5 border border-slate-300 text-center">شماره تماس (درشت)</th>
                  <th className="p-2.5 border border-slate-300">تخصص‌ها و مهارت‌ها</th>
                  <th className="p-2.5 border border-slate-300">شهر / وضعیت</th>
                  {includeNotes && <th className="p-2.5 border border-slate-300">تجهیزات و سوابق</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {specialists.map((person, index) => {
                  const phoneNum = person.mobile || person.phone || "---";
                  const specsList = (person.specialties || [])
                    .map((id) => getSpecialtyById(id, catalog)?.name || id)
                    .join(" ، ");
                  const statusText =
                    person.availabilityStatus === "available"
                      ? "🟢 آماده"
                      : person.availabilityStatus === "busy"
                      ? "🟡 سر پروژه"
                      : "⚪ غیرفعال";

                  return (
                    <tr key={person.id} className="odd:bg-white even:bg-slate-50/50">
                      <td className="p-2.5 border border-slate-300 text-center font-bold font-mono">
                        {index + 1}
                      </td>
                      <td className="p-2.5 border border-slate-300 font-black text-slate-900">
                        <span className="text-sm">{person.name || `${person.firstName || ""} ${person.lastName || ""}`}</span>
                        {person.personCode && (
                          <span className="text-[10px] text-slate-500 font-mono block">کد: {person.personCode}</span>
                        )}
                      </td>
                      <td className="p-2.5 border border-slate-300 text-center dir-ltr">
                        <span
                          className={`font-mono font-black text-slate-950 block tracking-wider ${
                            fontSize === "normal"
                              ? "text-xs"
                              : fontSize === "large"
                              ? "text-sm sm:text-base text-amber-900"
                              : "text-base sm:text-lg text-amber-950 underline"
                          }`}
                        >
                          {phoneNum}
                        </span>
                      </td>
                      <td className="p-2.5 border border-slate-300 font-bold text-slate-800">
                        {specsList || "بدون عنوان تخصص"}
                      </td>
                      <td className="p-2.5 border border-slate-300 text-slate-700">
                        <div>{person.city || "نامشخص"}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{statusText}</div>
                      </td>
                      {includeNotes && (
                        <td className="p-2.5 border border-slate-300 text-slate-600 text-[11px]">
                          {person.skillNotes || "---"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            /* LAYOUT 2: CARDS SHEET GRID */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {specialists.map((person, index) => {
                const phoneNum = person.mobile || person.phone || "---";
                const specs = (person.specialties || []).map((id) =>
                  getSpecialtyById(id, catalog)
                );

                return (
                  <div
                    key={person.id}
                    className="p-4 border-2 border-slate-800 rounded-2xl bg-white flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Name Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono text-xs flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <h3 className="text-base font-black text-slate-950">
                            {person.name || `${person.firstName || ""} ${person.lastName || ""}`}
                          </h3>
                        </div>
                        {person.city && (
                          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {person.city}
                          </span>
                        )}
                      </div>

                      {/* Prominent Call Phone Box */}
                      <div className="my-3 p-3 bg-slate-900 text-white rounded-xl border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-slate-300">شماره تماس مستقیم:</span>
                        </div>
                        <span
                          className={`font-mono font-black text-amber-300 tracking-wider dir-ltr ${
                            fontSize === "normal"
                              ? "text-sm"
                              : fontSize === "large"
                              ? "text-base sm:text-lg"
                              : "text-lg sm:text-xl underline"
                          }`}
                          dir="ltr"
                        >
                          {phoneNum}
                        </span>
                      </div>

                      {/* Specialties List */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">تخصص‌ها و مهارت‌های ثبت‌شده:</span>
                        <div className="flex flex-wrap gap-1">
                          {specs.map((spec) => (
                            <span
                              key={spec.id}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold"
                            >
                              {spec.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Notes if enabled */}
                      {includeNotes && person.skillNotes && (
                        <div className="mt-2.5 text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <span className="font-bold text-slate-500 block text-[10px]">یادداشت / ابزار:</span>
                          <p className="line-clamp-2">{person.skillNotes}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                      <span>وضعیت: {person.availabilityStatus === "available" ? "آماده به کار" : "در حال اجرای پروژه"}</span>
                      {person.dailyWage ? <span>دستمزد روزانه: {person.dailyWage.toLocaleString("fa-IR")} تومان</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note for printed sheets */}
          <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-bold print:block">
            <span>تهیه‌شده توسط سیستم حسابداری و مدیریت نیروها</span>
            <span>صفحه ۱ از ۱</span>
          </div>
        </div>
      </div>
    </div>
  );
}
