import React, { useState, useEffect } from "react";
import Select from "react-select";
import { Plus, Save, FileText, ArrowRight, User, Search, ChevronDown } from "lucide-react";
import { useRef } from "react";
import { getLedgerAccounts, getPersons, addAccountingDocument, getStoreSettings, ensureLedgerAccount, getActiveFinancialYear } from "../../services/dataService";
import { LedgerAccount } from "../../types";
import CustomDatePicker from "../ui/CustomDatePicker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { addCommas, removeCommas, convertToGregorian } from "../../utils/format";

const DatePicker = CustomDatePicker;


function PersonSearchSelect({ persons, value, onChange }: any) {
  const options = [
    { value: "", label: "بدون شخص (حساب کل)" },
    ...(persons || []).map((p: any) => ({
      value: p.id.toString(),
      label: `${p.name} ${p.family || ""} ${p.nationalId ? `(${p.nationalId})` : ""} ${p.phone ? `(${p.phone})` : ""}`,
      person: p
    }))
  ];
  
  const customPersonFilter = (option: any, rawInput: string) => {
    if (!rawInput) return true;
    const input = rawInput.toLowerCase();
    const p = option.data.person;
    if (!p) return option.label.toLowerCase().includes(input);
    return (
      p.name?.toLowerCase().includes(input) ||
      p.family?.toLowerCase().includes(input) ||
      p.nationalId?.includes(input) ||
      p.phone?.includes(input) ||
      p.personCode?.includes(input)
    );
  };

  return (
    <Select
      options={options}
      value={options.find(o => o.value === value) || options[0]}
      onChange={(sel: any) => onChange(sel ? sel.value : "")}
      filterOption={customPersonFilter}
      placeholder="جستجوی شخص (نام، کدملی، موبایل)..."
      isClearable
      className="react-select-container"
      classNamePrefix="react-select"
    />
  );
}
export default function OpeningBalances({ showNotification, onBack }: any) {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any | null>(null);
  
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [balanceType, setBalanceType] = useState<"debtor" | "creditor">("debtor");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<any>(new Date().toISOString());
  const [activeYearObj, setActiveYearObj] = useState<any>(null);
  const [description, setDescription] = useState("بابت ثبت مانده اول دوره");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [accs, pers, settings, activeYear] = await Promise.all([
      getLedgerAccounts(),
      getPersons(),
      getStoreSettings(),
      getActiveFinancialYear()
    ]);
    setAccounts(accs);
    setPersons(pers);
    setStoreSettings(settings);
    setActiveYearObj(activeYear);
    if (activeYear && activeYear.startDate) {
      setDate(activeYear.startDate);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAccountId && !selectedPersonId) {
      showNotification("انتخاب حساب یا شخص الزامی است", "error");
      return;
    }
    
    const numAmount = Number(amount.replace(/,/g, ""));
    if (!numAmount || numAmount <= 0) {
      showNotification("مبلغ معتبر نیست", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find or create "تراز افتتاحیه" account
      const equityAcc = accounts.find(a => a.code === '3'); // حقوق صاحبان سهام
      const openingBalanceTitle = "تراز افتتاحیه";
      let openingBalanceAcc = accounts.find(a => a.title === openingBalanceTitle);
      
      if (!openingBalanceAcc) {
         const newAccCode = '3999'; // Some code for opening balance under equity
         const res = await ensureLedgerAccount(
             { accountingCode: newAccCode }, 
             '3', 
             newAccCode, 
             openingBalanceTitle, 
             openingBalanceTitle, 
             'credit'
         );
         const updatedAccs = await getLedgerAccounts();
         openingBalanceAcc = updatedAccs.find(a => a.title === openingBalanceTitle);
      }

      if (!openingBalanceAcc) {
        throw new Error("خطا در یافتن یا ایجاد حساب تراز افتتاحیه");
      }

      let mainLedgerId = selectedAccountId;
      
      // If only person is selected but no account, default to Account Receivable / Payable based on debtor/creditor
      if (!mainLedgerId && selectedPersonId) {
         if (balanceType === 'debtor') {
            const accRec = accounts.find(a => a.code === '12'); // حساب‌ها و اسناد دریافتنی تجاری
            mainLedgerId = accRec ? String(accRec.id) : '';
         } else {
            const accPay = accounts.find(a => a.code === '21'); // حساب‌ها و اسناد پرداختنی تجاری
            mainLedgerId = accPay ? String(accPay.id) : '';
         }
      }

      if (!mainLedgerId) {
          throw new Error("لطفا حساب معین مربوطه را انتخاب کنید");
      }

      const items = [
        {
          ledgerAccountId: String(mainLedgerId),
          detailedAccountId: String(selectedPersonId || ""),
          description: description,
          debit: balanceType === "debtor" ? numAmount : 0,
          credit: balanceType === "creditor" ? numAmount : 0
        },
        {
          ledgerAccountId: String(openingBalanceAcc.id),
          detailedAccountId: "",
          description: "تراز افتتاحیه",
          debit: balanceType === "creditor" ? numAmount : 0,
          credit: balanceType === "debtor" ? numAmount : 0
        }
      ];

      const docDate = convertToGregorian(date);

      await addAccountingDocument({
        date: docDate,
        description: description,
        status: "approved",
        items: items,
        sourceType: "manual"
      });

      showNotification("سند افتتاحیه با موفقیت ثبت شد", "success");
      
      // Reset form
      setAmount("");
      setSelectedAccountId("");
      setSelectedPersonId("");
      
    } catch (err: any) {
      showNotification(err.message || "خطا در ثبت سند افتتاحیه", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
             <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">ثبت سند افتتاحیه</h2>
            <p className="text-sm text-slate-500 mt-1">ثبت مانده اولیه حساب‌ها (اشخاص، بانک‌ها، صندوق و ...)</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                حساب معین <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
              >
                <option value="">-- انتخاب حساب --</option>
                {(accounts || []).filter(a => ['general', 'subsidiary', 'detailed'].includes(a.type)).map(a => (
                  <option key={a.id} value={a.id}>{a.code} - {a.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                شخص / حساب تفصیلی (اختیاری)
              </label>
              <PersonSearchSelect persons={persons} value={selectedPersonId} onChange={setSelectedPersonId} />
            </div>
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2">
               ماهیت مانده افتتاحیه <span className="text-rose-500">*</span>
             </label>
             <div className="grid grid-cols-2 gap-4">
               <button
                 type="button"
                 onClick={() => setBalanceType("debtor")}
                 className={`py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                   balanceType === "debtor"
                     ? "bg-rose-50 text-rose-700 border-rose-500 shadow-sm"
                     : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                 }`}
               >
                 بدهکار
               </button>
               <button
                 type="button"
                 onClick={() => setBalanceType("creditor")}
                 className={`py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                   balanceType === "creditor"
                     ? "bg-emerald-50 text-emerald-700 border-emerald-500 shadow-sm"
                     : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                 }`}
               >
                 بستانکار
               </button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                مبلغ مانده ({storeSettings?.currency || "تومان"}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={amount ? addCommas(amount) : ""}
                onChange={(e) => {
                  const val = removeCommas(e.target.value);
                  if (val === "" || !isNaN(Number(val))) setAmount(val);
                }}
                placeholder="مثلا: 10,000,000"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-lg font-sans font-black text-slate-800 tracking-wider bg-slate-50 text-left"
                dir="ltr"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ سند <span className="text-rose-500">*</span></label>
              <DatePicker
                value={date}
                onChange={setDate}
                calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                calendarPosition="bottom-right"
                disabled={!!activeYearObj}
                inputClass={`w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-sans focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 ${activeYearObj ? 'opacity-70 cursor-not-allowed' : ''}`}
              />
              {activeYearObj && (
                 <p className="text-xs text-slate-500 mt-2 font-medium">تاریخ سند معادل تاریخ شروع سال مالی فعال در نظر گرفته می‌شود.</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">شرح سند</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
              rows={2}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <Save className="w-5 h-5" />
              {isSubmitting ? "در حال ثبت..." : "ثبت سند افتتاحیه"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
