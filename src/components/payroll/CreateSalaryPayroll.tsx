import React from "react";
import { motion } from "framer-motion";
import { 
    Wallet, Info, DollarSign, User, UserPlus, CreditCard, Banknote, Plus, Trash2, Save, Calculator, Briefcase, CheckCircle, FileText, RefreshCw, Tag, AlertCircle, Package, ScanLine, Box, ArrowLeft, Minus, Edit2, Printer, Search, FileSpreadsheet
, Calendar, PlusCircle, MinusCircle} from 'lucide-react';

export default function CreateSalaryPayroll(props: any) {
  const {

    persian, persian_fa, storeSettings, formatCurrency, DatePicker, SearchableSelect, handleSubmitSalary, activePersonsOnly, getRoleName, salaryPersonId, setSalaryPersonId, renderPersonInfoBox,  salaryPeriodMonth, setSalaryPeriodMonth, salaryPeriodYear, setSalaryPeriodYear, salaryDate, setSalaryDate, salaryBaseAmount, setSalaryBaseAmount, numToPersianWords,  salaryHousingAllowance, setSalaryHousingAllowance, salaryGroceryAllowance, setSalaryGroceryAllowance, salaryOtherAllowances, setSalaryOtherAllowances,  salaryInsuranceDeduction, setSalaryInsuranceDeduction, salaryTaxDeduction, setSalaryTaxDeduction, salaryOtherDeductions, setSalaryOtherDeductions, salaryDescription, setSalaryDescription, submittingSalary, setIsPersonModalOpen,
  } = props;

  return (
    <>
      <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-right"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-extrabold text-gray-900 mb-6 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                محاسبه و ثبت فیش حقوق و دستمزد کارمند
              </h2>

              <form onSubmit={handleSubmitSalary} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1.5 justify-start">
                      <User className="w-4 h-4 text-indigo-500" />
                      انتخاب کارمند
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SearchableSelect
                          options={(activePersonsOnly || []).map((p) => ({
                            value: p.id,
                        label: p.alias || p.name,
                        subLabel: p.personCode
                          ? `کد: ${p.personCode} | ${getRoleName(p.role)}`
                          : getRoleName(p.role),
                        badge: getRoleName(p.role),
                        imageUrl: p.imageUrl,
                        searchStr: `${p.alias || ""} ${p.name || ""} ${p.title || ""} ${p.firstName || ""} ${p.lastName || ""} ${p.phone || ""} ${p.nationalId || ""} ${p.personCode || ""} ${p.companyName || ""} ${p.fatherName || ""}`,
                      }))}
                      value={salaryPersonId}
                        onChange={(val) => setSalaryPersonId(val)}
                        placeholder="-- جستجو و انتخاب کارمند --"
                        searchPlaceholder="جستجو نام، کد یا نقش..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                        className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-4 flex items-center justify-center transition-colors shadow-sm"
                        title="تعریف شخص جدید"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    </div>
                    {salaryPersonId &&
                      renderPersonInfoBox(
                        salaryPersonId,
                        "bg-slate-50 border-slate-100 text-slate-600",
                      )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1.5 justify-start">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      دوره حقوق (ماه و سال)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={salaryPeriodMonth}
                        onChange={(e) => setSalaryPeriodMonth(e.target.value)}
                        className="w-[120px] p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-sans cursor-pointer bg-white"
                      >
                        {[
                          "فروردین",
                          "اردیبهشت",
                          "خرداد",
                          "تیر",
                          "مرداد",
                          "شهریور",
                          "مهر",
                          "آبان",
                          "آذر",
                          "دی",
                          "بهمن",
                          "اسفند",
                        ].map((m, i) => (
                          <option key={String(i + 1)} value={String(i + 1)}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={salaryPeriodYear}
                        onChange={(e) => setSalaryPeriodYear(e.target.value)}
                        className="flex-1 min-w-[80px] p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-center font-mono"
                        placeholder="سال"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1.5 justify-start">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      تاریخ پرداخت/اصدار
                    </label>
                    <DatePicker
                      value={salaryDate}
                      onChange={setSalaryDate}
                      calendar={
                        storeSettings?.calendarType === "gregorian"
                          ? undefined
                          : persian
                      }
                      locale={
                        storeSettings?.calendarType === "gregorian"
                          ? undefined
                          : persian_fa
                      }
                      calendarPosition="bottom-right"
                      inputClass="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-center cursor-pointer"
                      containerClassName="w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1.5 justify-start">
                      <DollarSign className="w-4 h-4 text-indigo-500" />
                      حقوق پایه ({storeSettings.currency})
                    </label>
                    <input
                      type="number"
                      value={salaryBaseAmount}
                      onChange={(e) => setSalaryBaseAmount(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-left font-black text-indigo-950 text-base"
                      dir="ltr"
                      required
                      placeholder="0"
                    />
                    {salaryBaseAmount &&
                      !isNaN(Number(salaryBaseAmount)) &&
                      Number(salaryBaseAmount) > 0 && (
                        <div className="mt-1.5 p-2 bg-indigo-50/40 border border-indigo-100 rounded-lg text-xs leading-relaxed text-right">
                          <span className="block text-gray-500 font-semibold">
                            به حروف:{" "}
                            <strong className="text-indigo-900">
                              {numToPersianWords(Number(salaryBaseAmount))}
                            </strong>{" "}
                            {storeSettings.currency}
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Earnings */}
                  <div className="bg-emerald-50/55 p-6 rounded-2xl border border-emerald-100/50 space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-100/60 pb-3">
                      <h3 className="font-extrabold text-emerald-800 text-sm flex items-center gap-1.5">
                        <PlusCircle className="w-5 h-5 text-emerald-600" />
                        آیتم‌های مشمول دریافت (اضافات)
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          حق مسکن
                        </label>
                        <input
                          type="number"
                          value={salaryHousingAllowance}
                          onChange={(e) =>
                            setSalaryHousingAllowance(e.target.value)
                          }
                          className="w-full p-2 border border-gray-200 bg-white rounded-lg font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          بن و خواروبار
                        </label>
                        <input
                          type="number"
                          value={salaryGroceryAllowance}
                          onChange={(e) =>
                            setSalaryGroceryAllowance(e.target.value)
                          }
                          className="w-full p-2 border border-gray-200 bg-white rounded-lg font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          سایر مزایا
                        </label>
                        <input
                          type="number"
                          value={salaryOtherAllowances}
                          onChange={(e) =>
                            setSalaryOtherAllowances(e.target.value)
                          }
                          className="w-full p-2 border border-gray-200 bg-white rounded-lg font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100/50 space-y-4">
                    <div className="flex items-center justify-between border-b border-rose-100/60 pb-3">
                      <h3 className="font-extrabold text-rose-800 text-sm flex items-center gap-1.5">
                        <MinusCircle className="w-5 h-5 text-rose-600" />
                        آیتم‌های کسورات قانونی و انضباطی
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          حق بیمه سهم کارمند
                        </label>
                        <input
                          type="number"
                          value={salaryInsuranceDeduction}
                          onChange={(e) =>
                            setSalaryInsuranceDeduction(e.target.value)
                          }
                          className="w-full p-2 border border-gray-200 bg-white rounded-lg font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          مالیات حقوق
                        </label>
                        <input
                          type="number"
                          value={salaryTaxDeduction}
                          onChange={(e) =>
                            setSalaryTaxDeduction(e.target.value)
                          }
                          className="w-full p-2 border border-gray-200 bg-white rounded-lg font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">
                          سایر کسورات/جریمه
                        </label>
                        <input
                          type="number"
                          value={salaryOtherDeductions}
                          onChange={(e) =>
                            setSalaryOtherDeductions(e.target.value)
                          }
                          className="w-full p-2 border border-gray-200 bg-white rounded-lg font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-tr from-indigo-50/50 to-white p-6 rounded-2xl border border-indigo-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-5 h-5 text-indigo-500" />
                    <span className="text-sm font-bold text-indigo-900">توجه: ثبت این فیش صرفا جهت محاسبه و ایجاد بدهی حقوق (طلب شخص) است و پرداختی انجام نمی‌شود. جهت پرداخت، از بخش دریافت/پرداخت استفاده نمایید.</span>
                  </div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    بابت/شرح فیش حقوقی
                  </label>
                  <input
                    type="text"
                    value={salaryDescription}
                    onChange={(e) => setSalaryDescription(e.target.value)}
                    className="w-full p-3 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white transition-all shadow-sm"
                    placeholder="بابت فیش رسمی حقوق ماه جاری کارمند..."
                  />
                </div>

                {(() => {
                  const baseSalaryNum = Number(salaryBaseAmount) || 0;
                  const totalExtras =
                    (Number(salaryHousingAllowance) || 0) +
                    (Number(salaryGroceryAllowance) || 0) +
                    (Number(salaryOtherAllowances) || 0);
                  const totalDeductions =
                    (Number(salaryInsuranceDeduction) || 0) +
                    (Number(salaryTaxDeduction) || 0) +
                    (Number(salaryOtherDeductions) || 0);
                  const netPayable =
                    baseSalaryNum + totalExtras - totalDeductions;
                    return (
                      <div className="space-y-6">
                      {/* Realtime breakdown checklist panel */}
                      <div className="bg-gradient-to-tr from-slate-50 to-slate-100/50 rounded-2xl border border-slate-150 p-5 space-y-4 shadow-3xs">
                        <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider justify-start">
                          <Info className="w-4 h-4 text-indigo-500" />
                          خلاصه محاسبات ارقام فیش حقوقی پرسنل
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-bold">
                          <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-3xs text-right">
                            <span className="text-xs text-slate-400 font-bold">
                              حقوق پایه:
                            </span>
                            <span
                              className="text-slate-800 font-mono font-black"
                              dir="ltr"
                            >
                              {formatCurrency(baseSalaryNum)}{" "}
                              {storeSettings.currency}
                            </span>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-3xs text-right">
                            <span className="text-xs text-emerald-500 font-bold">
                              جمع کل اضافات (+):
                            </span>
                            <span
                              className="text-emerald-700 font-mono font-black"
                              dir="ltr"
                            >
                              {formatCurrency(totalExtras)}{" "}
                              {storeSettings.currency}
                            </span>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-3xs text-right">
                            <span className="text-xs text-rose-500 font-bold">
                              جمع کل کسورات (-):
                            </span>
                            <span
                              className="text-rose-700 font-mono font-black"
                              dir="ltr"
                            >
                              {formatCurrency(totalDeductions)}{" "}
                              {storeSettings.currency}
                            </span>
                          </div>
                          <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 flex flex-col gap-1 shadow-3xs text-right">
                            <span className="text-xs text-indigo-600 font-bold">
                              خالص پرداختی نهایی:
                            </span>
                            <span
                              className="text-indigo-950 font-black text-base font-mono"
                              dir="ltr"
                            >
                              {formatCurrency(netPayable)}{" "}
                              {storeSettings.currency}
                            </span>
                          </div>
                        </div>
                        {netPayable > 0 && (
                          <div className="text-xs text-slate-500 leading-relaxed text-right mt-1 font-semibold">
                            به حروف:{" "}
                            <strong className="text-indigo-900">
                              {numToPersianWords(netPayable)}
                            </strong>{" "}
                            {storeSettings.currency}
                          </div>
                        )}
                      </div>

                      {/* Submission Footer with Net Payable highlighted */}
                      <div className="flex flex-col sm:flex-row justify-between items-center bg-indigo-600/5 p-6 rounded-2xl border border-indigo-500/10 gap-4">
                        <div className="text-right">
                          <span className="text-xs text-indigo-600 font-black block mb-1">
                            مبلغ پرداختی خالص کارمند
                          </span>
                          <span
                            className="text-2xl font-black text-indigo-950 font-sans tracking-tight"
                            dir="ltr"
                          >
                            {formatCurrency(netPayable)}{" "}
                            {storeSettings.currency}
                          </span>
                        </div>
                        <button
                          type="submit"
                          disabled={submittingSalary}
                          className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer border-none"
                        >
                          {submittingSalary ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Save className="w-5 h-5" />
                          )}
                          تایید نهایی و صدور فیش حقوقی
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </form>
            </div>
          </motion.div>
    </>
  );
}
