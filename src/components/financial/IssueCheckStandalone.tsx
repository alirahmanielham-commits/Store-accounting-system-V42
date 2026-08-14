import React, { useState, useEffect } from "react";
import { addIssuedCheck, getCheckbooks, getPersons } from "../../services/dataService";
import { motion } from "framer-motion";
import { CheckCircle, Building2, User, CreditCard } from "lucide-react";
import Select from "react-select";
import CurrencyInput from "../common/CurrencyInput";
import CustomDatePicker from "../ui/CustomDatePicker";

export default function IssueCheckStandalone() {
  const [persons, setPersons] = useState<any[]>([]);
  const [checkbooks, setCheckbooks] = useState<any[]>([]);
  
  const [payeeId, setPayeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [checkbookId, setCheckbookId] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [sayadId, setSayadId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reason, setReason] = useState("خرید کالا");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setPersons(await getPersons());
      setCheckbooks(await getCheckbooks());
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSuccess(false);

    try {
      if (!amount || Number(amount) <= 0) throw new Error("مبلغ چک نامعتبر است");
      if (!payeeId) throw new Error("گیرنده چک را انتخاب کنید");
      if (!checkbookId) throw new Error("دسته‌چک را انتخاب کنید");
      if (!checkNumber) throw new Error("شماره چک را وارد کنید");
      if (!dueDate) throw new Error("تاریخ سررسید را مشخص کنید");

      await addIssuedCheck({
        payeeId,
        amount: Number(amount),
        checkbookId,
        checkNumber,
        sayadId,
        issueDate: issueDate || new Date().toISOString(),
        dueDate,
        reason,
        description,
        status: "issued"
      });

      setSuccess(true);
      // reset form
      setPayeeId("");
      setAmount("");
      setCheckNumber("");
      setSayadId("");
      setDueDate("");
      setDescription("");
    } catch (err: any) {
      setError(err.message || "خطا در ثبت چک");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 max-w-4xl mx-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-l from-indigo-600 to-indigo-800 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-indigo-100" />
            <h1 className="text-2xl font-bold font-['YekanBakh']">صدور چک بانکی پرداختی</h1>
          </div>
        </div>
        
        <div className="p-6 md:p-8">
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
              <span className="font-bold">صدور چک با موفقیت در سیستم ثبت شد.</span>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" /> گیرنده چک (شخص/شرکت) <span className="text-rose-500">*</span>
                </label>
                <Select
                  options={persons.map(p => ({ value: p.id, label: p.name }))}
                  value={payeeId ? { value: payeeId, label: persons.find(p => p.id === payeeId)?.name } : null}
                  onChange={(val: any) => setPayeeId(val?.value || '')}
                  placeholder="جستجو و انتخاب گیرنده..."
                  className="font-sans"
                  isClearable
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> دسته‌چک (مبدأ) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={checkbookId}
                  onChange={(e) => setCheckbookId(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 outline-none focus:border-indigo-500 transition-colors font-sans"
                >
                  <option value="">انتخاب دسته‌چک...</option>
                  {checkbooks.map((cb) => (
                    <option key={cb.id} value={cb.id}>{cb.bankName} - {cb.accountNumber}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">مبلغ چک (تومان) <span className="text-rose-500">*</span></label>
                <CurrencyInput value={amount} onChange={setAmount} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">شماره چک (سریال) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={checkNumber}
                  onChange={e => setCheckNumber(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-left font-mono focus:border-indigo-500 outline-none"
                  dir="ltr"
                  placeholder="مثال: 12345678"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">شناسه صیادی (۱۶ رقمی)</label>
                <input
                  type="text"
                  value={sayadId}
                  onChange={e => setSayadId(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-left font-mono focus:border-indigo-500 outline-none"
                  dir="ltr"
                  placeholder="مثال: 1234567890123456"
                  maxLength={16}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">بابت / دلیل صدور</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 outline-none font-sans"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">تاریخ صدور</label>
                <CustomDatePicker value={issueDate} onChange={setIssueDate} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">تاریخ سررسید <span className="text-rose-500">*</span></label>
                <CustomDatePicker value={dueDate} onChange={setDueDate} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">توضیحات تکمیلی (اختیاری)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-indigo-500 outline-none font-sans min-h-[100px]"
                placeholder="یادداشت‌ها و جزئیات بیشتر..."
              />
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? "در حال ثبت..." : "تأیید و صدور چک"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
