import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, ArrowDownToLine, ArrowUpFromLine, TableProperties, Database, 
  Settings2, FileJson, FileSpreadsheet, Plus, CheckCircle, ArrowRightLeft, ClipboardList, Eye
} from 'lucide-react';

interface PersonIOModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "import" | "export";
  setAction: (action: "import" | "export") => void;
  persons: any[];
  storeSettings: any;
  addPerson: (p: any) => Promise<any>;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  confirmAction: (msg: string, callback: () => void) => void;
  getRoleName: (roleId?: string) => string;
  fetchPersons: () => Promise<void>;
}

export default function PersonIOModal({
  isOpen, onClose, action, setAction, persons, storeSettings, addPerson, showNotification, confirmAction, getRoleName, fetchPersons
}: PersonIOModalProps) {
  const personIOAction = action;
  const setPersonIOAction = setAction;
  
  const [personsIOFileType, setPersonsIOFileType] = useState<
    "excel_pasted" | "json" | "csv"
  >("excel_pasted");
  const [pastedPersonsText, setPastedPersonsText] = useState("");
  const [importSelectedFile, setImportSelectedFile] = useState<File | null>(
    null,
  );

  // Custom CSV / Pasted Excel Parsing state
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [detectedDelimiter, setDetectedDelimiter] = useState("\t");
  const [isFirstRowHeader, setIsFirstRowHeader] = useState(true);
  const [personIOMappings, setPersonIOMappings] = useState<
    Record<string, number>
  >({
    name: -1,
    personType: -1,
    nationalId: -1,
    role: -1,
    phone: -1,
    fatherName: -1,
    companyName: -1,
    address: -1,
    bankName: -1,
    bankAccountNumber: -1,
    cardNumber: -1,
    shebaNumber: -1,
    additionalNotes: -1,
    personCode: -1,
  });


  if (!isOpen) return null;
  return (

                <div key="isPersonIOModalOpen-modal"
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
                  dir="rtl"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-2xl border border-gray-150 overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col font-sans text-right"
                  >
                    {/* Modal Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                        ورود و خروج اطلاعات اشخاص (فرمت استاندارد و خاص)
                      </h3>
                      <button
                        onClick={() => onClose()}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Tabs inside Modal */}
                    <div className="flex border-b border-slate-150 bg-slate-50">
                      <button
                        onClick={() => setPersonIOAction("export")}
                        className={`flex-1 py-3 text-sm font-bold transition-all border-none cursor-pointer ${
                          personIOAction === "export"
                            ? "bg-white text-indigo-600 border-b-2 border-indigo-600"
                            : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <ArrowDownToLine className="w-4 h-4" />
                          صدور اطلاعات (خروجی گرفتن از سیستم)
                        </div>
                      </button>
                      <button
                        onClick={() => setPersonIOAction("import")}
                        className={`flex-1 py-3 text-sm font-bold transition-all border-none cursor-pointer ${
                          personIOAction === "import"
                            ? "bg-white text-indigo-600 border-b-2 border-indigo-600"
                            : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <ArrowUpFromLine className="w-4 h-4" />
                          ورود اطلاعات (وارد کردن به سیستم)
                        </div>
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-750 space-y-6">
                      {/* EXPORT TAB content */}
                      {personIOAction === "export" && (
                        <div className="space-y-4">
                          <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl text-indigo-950 font-medium leading-relaxed">
                            در این بخش می‌توانید لیست جامع اطلاعات تمامی اشخاص
                            ثبت شده در سیستم ({(persons || []).length} شخص) را با فرمت
                            استانداردی چون JSON یا اکسل (CSV کاملاً سازگار با
                            حروف فارسی) دریافت و بر روی سیستم خود ذخیره نمایید.
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* CSV Export Option Card */}
                            <div className="p-5 border border-slate-200 rounded-2xl bg-white hover:border-indigo-400 hover:bg-indigo-50/5 transition-all flex flex-col gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                                  CSV
                                </div>
                                <div>
                                  <h4 className="text-sm font-extrabold text-slate-800">
                                    خروجی اکسل استاندارد (CSV فارسی)
                                  </h4>
                                  <span className="text-xs text-slate-400 font-medium">
                                    مناسب باز کردن مستقیم در اکسل و سایر جداول
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed min-h-12 font-medium">
                                این فرمت به همراه شناسه UTF-8 BOM ثبت می‌شود که
                                به صورت کاملاً خودکار در نرم افزار Excel با زبان
                                فارسی باز شده و در آن حروف فارسی به صورت بهم
                                ریخته دیده نمی‌شوند.
                              </p>
                              <button
                                onClick={() => {
                                  // Column mapping in standard csv
                                  const headers = [
                                    "کد شخص",
                                    "نام کامل",
                                    "نوع شخص",
                                    "کد ملی/شناسه ملی",
                                    "نقش",
                                    "شماره تماس",
                                    "نام پدر",
                                    "نام شرکت",
                                    "آدرس",
                                    "نام بانک",
                                    "شماره حساب",
                                    "شماره کارت",
                                    "شماره شبا",
                                    "یادداشت تکمیلی",
                                  ];

                                  const csvContent = [
                                    headers.join(","),
                                    ...(persons || []).map((p, index) => {
                                      const row = [
                                        p.personCode || "",
                                        p.name || "",
                                        p.personType === "legal"
                                          ? "حقوقی"
                                          : "حقیقی",
                                        p.nationalId || "",
                                        getRoleName(p.role),
                                        p.phone || "",
                                        p.fatherName || "",
                                        p.companyName || "",
                                        (p.address || "").replace(/,/g, " - "),
                                        p.bankName || "",
                                        p.bankAccountNumber || "",
                                        p.cardNumber || "",
                                        p.shebaNumber || "",
                                        (p.additionalNotes || "").replace(
                                          /[\r\n,]/g,
                                          " - ",
                                        ),
                                      ];
                                      // wrapping each cell with quotes to hand characters spacing/commas
                                      return row
                                        .map(
                                          (v) => `"${v.replace(/"/g, '""')}"`,
                                        )
                                        .join(",");
                                    }),
                                  ].join("\r\n");

                                  // BOM prefix is crucial for persian excel compatibility
                                  const blob = new Blob(
                                    [
                                      new Uint8Array([0xef, 0xbb, 0xbf]),
                                      csvContent,
                                    ],
                                    { type: "text/csv;charset=utf-8;" },
                                  );
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement("a");
                                  link.setAttribute("href", url);
                                  link.setAttribute(
                                    "download",
                                    `persons_list_export_${new Date().toLocaleDateString(storeSettings?.calendarType === "gregorian" ? "en-US" : "fa-IR").replace(/\//g, "-")}.csv`,
                                  );
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="w-full mt-2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none shadow-sm shadow-teal-50"
                              >
                                <FileSpreadsheet className="w-4 h-4" />
                                دانلود فایل اکسل CSV
                              </button>
                            </div>

                            {/* JSON Export Option Card */}
                            <div className="p-5 border border-slate-200 rounded-2xl bg-white hover:border-indigo-400 hover:bg-indigo-50/5 transition-all flex flex-col gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                  JSON
                                </div>
                                <div>
                                  <h4 className="text-sm font-extrabold text-slate-800">
                                    خروجی بک آپ سیستمی (Standard JSON)
                                  </h4>
                                  <span className="text-xs text-slate-400 font-medium">
                                    بک آپ خام دقیق جهت انتقال بین سرورها یا
                                    سیستم‌های دیگر
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed min-h-12 font-medium">
                                این فایل شامل ساختار آرایه داده کل اشخاص به روش
                                JSON است. این فرمت بسیار دقیق بوده و برای انتقال
                                بی‌نقص اطلاعات به نرم افزار حسابداری در
                                دستگاه‌های دیگر فوق‌العاده است.
                              </p>
                              <button
                                onClick={() => {
                                  const blob = new Blob(
                                    [JSON.stringify(persons, null, 2)],
                                    { type: "application/json" },
                                  );
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement("a");
                                  link.setAttribute("href", url);
                                  link.setAttribute(
                                    "download",
                                    `persons_data_export_${new Date().toLocaleDateString(storeSettings?.calendarType === "gregorian" ? "en-US" : "fa-IR").replace(/\//g, "-")}.json`,
                                  );
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none shadow-sm shadow-indigo-50"
                              >
                                <Database className="w-4 h-4" />
                                دانلود فایل پشتیبان JSON
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* IMPORT TAB content */}
                      {personIOAction === "import" && (
                        <div className="space-y-6">
                          {/* Choose Source Format Type */}
                          <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-700">
                                ۱. نوع فایل / شیوه ورود اطلاعات خود را انتخاب
                                کنید:
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setPersonsIOFileType("excel_pasted");
                                    setPastedPersonsText("");
                                    setParsedHeaders([]);
                                    setParsedRows([]);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                                    personsIOFileType === "excel_pasted"
                                      ? "bg-indigo-600 text-white shadow-sm"
                                      : "bg-slate-200 text-slate-600 hover:bg-slate-350"
                                  }`}
                                >
                                  کپی-پیست از اکسل (ساده‌ترین روش)
                                </button>
                                <button
                                  onClick={() => {
                                    setPersonsIOFileType("json");
                                    setParsedHeaders([]);
                                    setParsedRows([]);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                                    personsIOFileType === "json"
                                      ? "bg-indigo-600 text-white shadow-sm"
                                      : "bg-slate-200 text-slate-600 hover:bg-slate-350"
                                  }`}
                                >
                                  بارگذاری فایل JSON (سیستمی)
                                </button>
                                <button
                                  onClick={() => {
                                    setPersonsIOFileType("csv");
                                    setParsedHeaders([]);
                                    setParsedRows([]);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                                    personsIOFileType === "csv"
                                      ? "bg-indigo-600 text-white shadow-sm"
                                      : "bg-slate-200 text-slate-600 hover:bg-slate-350"
                                  }`}
                                >
                                  بارگذاری فایل CSV یا اکسل
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* SUB-TABS Content */}

                          {/* Method 1: excel_pasted */}
                          {personsIOFileType === "excel_pasted" && (
                            <div className="space-y-4">
                              <div className="text-slate-600 space-y-1">
                                <p className="font-extrabold text-slate-800">
                                  راهنمای کپی-پیست مستقیم از اکسل / جدول:
                                </p>
                                <p className="text-xs font-medium">
                                  ۱. در برنامه اکسل یا گوگل‌شیت، ستون‌های دلخواه
                                  از اطلاعات مشتریان خود را کپی کنید.
                                </p>
                                <p className="text-xs font-medium">
                                  ۲. اطلاعات کپی شده را مستقیماً در کادر زیر
                                  قرار دهید (Paste کنید).
                                </p>
                                <p className="text-xs font-medium">
                                  ۳. در مرحله بعدی، مشخص می‌کنید که هر کدام از
                                  ستون‌های ثبت شده متعلق به کدام ویژگی شخص است.
                                </p>
                              </div>

                              <textarea
                                value={pastedPersonsText}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPastedPersonsText(val);

                                  // Auto parse on input
                                  if (!val.trim()) {
                                    setParsedHeaders([]);
                                    setParsedRows([]);
                                    return;
                                  }

                                  const lines = val
                                    .split(/\r?\n/)
                                    .filter((line) => line.trim() !== "");
                                  if (lines.length > 0) {
                                    const matrix = lines.map((line) =>
                                      line.split("\t"),
                                    );
                                    // Let's analyze if first row looks like header
                                    if (matrix.length > 0) {
                                      setParsedHeaders(matrix[0]);
                                      setParsedRows(matrix.slice(1));
                                    }
                                  }
                                }}
                                placeholder="اطلاعات کپی شده از اکسل را در این فضا پیست کنید..."
                                rows={6}
                                className="w-full p-4 border border-slate-200 bg-slate-50 hover:bg-slate-100/50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-indigo-950 font-mono text-xs leading-relaxed transition-all shadow-xs"
                              />
                            </div>
                          )}

                          {/* Method 2: json file */}
                          {personsIOFileType === "json" && (
                            <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-6 text-center space-y-4 hover:border-indigo-400 transition-all">
                              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
                                <Database className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm">
                                  بارگذاری فایل پشتیبان JSON اشخاص
                                </p>
                                <p className="text-xs text-slate-400 font-medium mt-1">
                                  فایلی را که قبلاً صادر کرده‌اید انتخاب نمایید
                                  تا تمام اشخاص موجود در آن بازیابی شوند.
                                </p>
                              </div>
                              <div className="inline-block relative">
                                <input
                                  type="file"
                                  accept=".json"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setImportSelectedFile(file);
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        try {
                                          const parsedObj = JSON.parse(
                                            event.target?.result as string,
                                          );
                                          if (Array.isArray(parsedObj)) {
                                            // It's already the array format!
                                            setParsedRows(
                                              parsedObj.map((p) => [
                                                p.name || "",
                                                p.personType || "real",
                                                p.role || "customer",
                                                p.phone || "",
                                                p.nationalId || "",
                                                p.fatherName || "",
                                                p.companyName || "",
                                                p.address || "",
                                                p.bankName || "",
                                                p.bankAccountNumber || "",
                                                p.cardNumber || "",
                                                p.shebaNumber || "",
                                                p.additionalNotes || "",
                                                p.personCode || "",
                                              ]),
                                            );
                                            // Mock standard header
                                            setParsedHeaders([
                                              "name",
                                              "personType",
                                              "role",
                                              "phone",
                                              "nationalId",
                                              "fatherName",
                                              "companyName",
                                              "address",
                                              "bankName",
                                              "bankAccountNumber",
                                              "cardNumber",
                                              "shebaNumber",
                                              "additionalNotes",
                                              "personCode",
                                            ]);
                                            // Auto establish mapper to match index directly
                                            setPersonIOMappings({
                                              name: 0,
                                              personType: 1,
                                              role: 2,
                                              phone: 3,
                                              nationalId: 4,
                                              fatherName: 5,
                                              companyName: 6,
                                              address: 7,
                                              bankName: 8,
                                              bankAccountNumber: 9,
                                              cardNumber: 10,
                                              shebaNumber: 11,
                                              additionalNotes: 12,
                                              personCode: 13,
                                            });
                                          } else {
                                            showNotification(
                                              "فرمت فایل پشتیبانی نمی‌شود. فایل خروجی استاندارد نیست.",
                                              "error"
                                            );
                                          }
                                        } catch (err) {
                                          showNotification(
                                            "خطا در خواندن فایل JSON. از صحت فایل مطمئن شوید.",
                                            "error"
                                          );
                                        }
                                      };
                                      reader.readAsText(file);
                                    }
                                  }}
                                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                />
                                <button className="px-5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
                                  <Plus className="w-4 h-4" />
                                  انتخاب فایل از سیستم
                                </button>
                              </div>
                              {importSelectedFile && (
                                <div className="text-xs text-slate-500 font-bold bg-slate-100 inline-block px-3 py-1 rounded-lg">
                                  فایل انتخاب شده: {importSelectedFile.name}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Method 3: csv file */}
                          {personsIOFileType === "csv" && (
                            <div className="space-y-4">
                              <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-6 text-center space-y-4 hover:border-indigo-400 transition-all">
                                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center mx-auto">
                                  <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">
                                    بارگذاری فایل CSV یا فایل‌های اکسل صادر شده
                                  </p>
                                  <p className="text-xs text-slate-400 font-medium mt-1">
                                    یک فایل CSV و متنی با هر جداکننده‌ای متداول
                                    (کاما، سیمی‌کولن، تب) را بارگذاری نمایید.
                                  </p>
                                </div>
                                <div className="flex justify-center items-center gap-4">
                                  <div className="flex items-center gap-1 bg-white p-2 rounded-lg border border-slate-150 text-xs">
                                    <span className="font-bold">
                                      جداکننده ستون‌ها:
                                    </span>
                                    <select
                                      value={detectedDelimiter}
                                      onChange={(e) => {
                                        const d = e.target.value;
                                        setDetectedDelimiter(d);
                                        // Re-parse if text or file exists
                                        if (pastedPersonsText) {
                                          const lines = pastedPersonsText
                                            .split(/\r?\n/)
                                            .filter(
                                              (line) => line.trim() !== "",
                                            );
                                          const delim = d === "\	" ? "\t" : d;
                                          const matrix = lines.map((line) =>
                                            line.split(delim),
                                          );
                                          if (matrix.length > 0) {
                                            setParsedHeaders(matrix[0]);
                                            setParsedRows(matrix.slice(1));
                                          }
                                        }
                                      }}
                                      className="border-none font-bold text-indigo-700 outline-none p-1 bg-transparent"
                                    >
                                      <option value="\t">
                                        تب (Tab-spaced)
                                      </option>
                                      <option value=",">کامبل (Comma ,)</option>
                                      <option value=";">
                                        سیمی‌کولن (Semicolon ;)
                                      </option>
                                    </select>
                                  </div>
                                  <div className="relative">
                                    <input
                                      type="file"
                                      accept=".csv,.txt"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setImportSelectedFile(file);
                                          const reader = new FileReader();
                                          reader.onload = (event) => {
                                            try {
                                              const fileContent = event.target
                                                ?.result as string;
                                              setPastedPersonsText(fileContent);
                                              const lines = fileContent
                                                .split(/\r?\n/)
                                                .filter(
                                                  (line) => line.trim() !== "",
                                                );
                                              const actualDelim =
                                                detectedDelimiter === "\	"
                                                  ? "\t"
                                                  : detectedDelimiter;

                                              // Auto-detect comma or semicolon if not tab
                                              let finalDelim = actualDelim;
                                              if (lines[0]) {
                                                if (
                                                  lines[0].includes(",") &&
                                                  actualDelim === "\	"
                                                ) {
                                                  finalDelim = ",";
                                                  setDetectedDelimiter(",");
                                                } else if (
                                                  lines[0].includes(";") &&
                                                  actualDelim === "\	"
                                                ) {
                                                  finalDelim = ";";
                                                  setDetectedDelimiter(";");
                                                }
                                              }

                                              const matrix = lines.map((line) =>
                                                line.split(finalDelim),
                                              );
                                              if (matrix.length > 0) {
                                                setParsedHeaders(matrix[0]);
                                                setParsedRows(matrix.slice(1));
                                              }
                                            } catch (err) {
                                              showNotification(
                                                "خطا در خواندن فایل. لطفاً فرمت مناسبی را انتخاب نماید.",
                                                "error"
                                              );
                                            }
                                          };
                                          reader.readAsText(file);
                                        }
                                      }}
                                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                    />
                                    <button className="px-5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
                                      <Plus className="w-4 h-4" />
                                      انتخاب فایل CSV از سیستم
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* TWO: COLUMN MAPPER STEP (show when we have parsed rows and headers) */}
                          {(parsedHeaders || []).length > 0 &&
                            personsIOFileType !== "json" && (
                              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                                <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2">
                                  <ClipboardList className="w-4 h-4 text-indigo-600" />
                                  <h4 className="text-sm font-extrabold text-slate-800">
                                    ۲. مشخص کردن ستون‌ها (تناظر اطلاعات با
                                    ستون‌های اکسل شما)
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-500 font-semibold">
                                  مشخص کنید هر کدام از فیلدهای خریدار/فروشنده در
                                  سیستم شما، به کدام یک از ستون‌های موجود در
                                  جدول چسبانده شده مطابقت دارد:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {/* Name mapper (Required) */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-2xs">
                                    <label className="text-xs font-black text-slate-700 flex justify-between items-center">
                                      <span>
                                        نام و نام‌خانوادگی / عنوان شخص{" "}
                                        <span className="text-rose-500">*</span>
                                      </span>
                                    </label>
                                    <select
                                      value={personIOMappings.name}
                                      onChange={(e) =>
                                        setPersonIOMappings((prev) => ({
                                          ...prev,
                                          name: Number(e.target.value),
                                        }))
                                      }
                                      className="w-full text-xs font-bold border rounded-lg p-1.5 mt-1 text-slate-800 outline-none"
                                    >
                                      <option value={-1}>
                                        -- لطفا انتخاب کنید --
                                      </option>
                                      {parsedHeaders.map((hdr, idx) => (
                                        <option key={idx} value={idx}>
                                          ستون {idx + 1}: {hdr || "(خالی)"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Phone mapper */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-2xs">
                                    <label className="text-xs font-black text-slate-700">
                                      شماره موبایل / تماس
                                    </label>
                                    <select
                                      value={personIOMappings.phone}
                                      onChange={(e) =>
                                        setPersonIOMappings((prev) => ({
                                          ...prev,
                                          phone: Number(e.target.value),
                                        }))
                                      }
                                      className="w-full text-xs font-bold border rounded-lg p-1.5 mt-1 text-slate-800 outline-none"
                                    >
                                      <option value={-1}>
                                        -- انتخاب نشده (پیش فرض خالی/ندارد) --
                                      </option>
                                      {parsedHeaders.map((hdr, idx) => (
                                        <option key={idx} value={idx}>
                                          ستون {idx + 1}: {hdr || "(خالی)"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* National ID mapper */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-2xs">
                                    <label className="text-xs font-black text-slate-700">
                                      کد ملی / شناسه ملی ملکی
                                    </label>
                                    <select
                                      value={personIOMappings.nationalId}
                                      onChange={(e) =>
                                        setPersonIOMappings((prev) => ({
                                          ...prev,
                                          nationalId: Number(e.target.value),
                                        }))
                                      }
                                      className="w-full text-xs font-bold border rounded-lg p-1.5 mt-1 text-slate-800 outline-none"
                                    >
                                      <option value={-1}>
                                        -- انتخاب نشده --
                                      </option>
                                      {parsedHeaders.map((hdr, idx) => (
                                        <option key={idx} value={idx}>
                                          ستون {idx + 1}: {hdr || "(خالی)"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Person Type mapper */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-2xs">
                                    <label className="text-xs font-black text-slate-700">
                                      نوع شخصیت (حقیقی یا حقوقی)
                                    </label>
                                    <select
                                      value={personIOMappings.personType}
                                      onChange={(e) =>
                                        setPersonIOMappings((prev) => ({
                                          ...prev,
                                          personType: Number(e.target.value),
                                        }))
                                      }
                                      className="w-full text-xs font-bold border rounded-lg p-1.5 mt-1 text-slate-800 outline-none"
                                    >
                                      <option value={-1}>
                                        پذیرفته شده همه حقیقی
                                      </option>
                                      {parsedHeaders.map((hdr, idx) => (
                                        <option key={idx} value={idx}>
                                          ستون {idx + 1}: {hdr || "(خالی)"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Role mapper */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-2xs">
                                    <label className="text-xs font-black text-slate-700">
                                      نقش شخص در سیستم (مشتری، کارمند...)
                                    </label>
                                    <select
                                      value={personIOMappings.role}
                                      onChange={(e) =>
                                        setPersonIOMappings((prev) => ({
                                          ...prev,
                                          role: Number(e.target.value),
                                        }))
                                      }
                                      className="w-full text-xs font-bold border rounded-lg p-1.5 mt-1 text-slate-800 outline-none"
                                    >
                                      <option value={-1}>
                                        نقش پیش فرض: مشتری (Customer)
                                      </option>
                                      {parsedHeaders.map((hdr, idx) => (
                                        <option key={idx} value={idx}>
                                          ستون {idx + 1}: {hdr || "(خالی)"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Company Name */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-2xs">
                                    <label className="text-xs font-black text-slate-700">
                                      شناسه یا نام شرکت (برای حقوقی‌ها)
                                    </label>
                                    <select
                                      value={personIOMappings.companyName}
                                      onChange={(e) =>
                                        setPersonIOMappings((prev) => ({
                                          ...prev,
                                          companyName: Number(e.target.value),
                                        }))
                                      }
                                      className="w-full text-xs font-bold border rounded-lg p-1.5 mt-1 text-slate-800 outline-none"
                                    >
                                      <option value={-1}>ندارد</option>
                                      {parsedHeaders.map((hdr, idx) => (
                                        <option key={idx} value={idx}>
                                          ستون {idx + 1}: {hdr || "(خالی)"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Father Name */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-2xs">
                                    <label className="text-xs font-black text-slate-700">
                                      نام پدر
                                    </label>
                                    <select
                                      value={personIOMappings.fatherName}
                                      onChange={(e) =>
                                        setPersonIOMappings((prev) => ({
                                          ...prev,
                                          fatherName: Number(e.target.value),
                                        }))
                                      }
                                      className="w-full text-xs font-bold border rounded-lg p-1.5 mt-1 text-slate-800 outline-none"
                                    >
                                      <option value={-1}>ندارد</option>
                                      {parsedHeaders.map((hdr, idx) => (
                                        <option key={idx} value={idx}>
                                          ستون {idx + 1}: {hdr || "(خالی)"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Address mapper */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-2xs">
                                    <label className="text-xs font-black text-slate-700">
                                      آدرس محل اقامت یا سکونت
                                    </label>
                                    <select
                                      value={personIOMappings.address}
                                      onChange={(e) =>
                                        setPersonIOMappings((prev) => ({
                                          ...prev,
                                          address: Number(e.target.value),
                                        }))
                                      }
                                      className="w-full text-xs font-bold border rounded-lg p-1.5 mt-1 text-slate-800 outline-none"
                                    >
                                      <option value={-1}>ندارد</option>
                                      {parsedHeaders.map((hdr, idx) => (
                                        <option key={idx} value={idx}>
                                          ستون {idx + 1}: {hdr || "(خالی)"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Notes */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-1 shadow-2xs">
                                    <label className="text-xs font-black text-slate-700">
                                      یادداشت تکمیلی / کد شخص قدیمی
                                    </label>
                                    <select
                                      value={personIOMappings.additionalNotes}
                                      onChange={(e) =>
                                        setPersonIOMappings((prev) => ({
                                          ...prev,
                                          additionalNotes: Number(
                                            e.target.value,
                                          ),
                                        }))
                                      }
                                      className="w-full text-xs font-bold border rounded-lg p-1.5 mt-1 text-slate-800 outline-none"
                                    >
                                      <option value={-1}>ندارد</option>
                                      {parsedHeaders.map((hdr, idx) => (
                                        <option key={idx} value={idx}>
                                          ستون {idx + 1}: {hdr || "(خالی)"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Quick preview of mapping before clicking Import */}
                                <div className="bg-indigo-50/30 p-4 border border-indigo-150/50 rounded-xl space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <Eye className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-black text-indigo-900">
                                      پیش‌نمایش ستون‌های تفکیک شده (سه ردیف
                                      نخست):
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto text-[11px] font-medium text-indigo-950 max-h-36">
                                    <table className="w-full bg-white border border-slate-150 rounded-lg overflow-hidden divide-y divide-slate-100">
                                      <thead>
                                        <tr className="bg-indigo-50 text-indigo-900 font-extrabold select-none">
                                          {parsedHeaders
                                            .slice(0, 7)
                                            .map((h, i) => (
                                              <th
                                                key={i}
                                                className="py-2 px-3 text-right"
                                              >
                                                ستون {i + 1}: {h || "-"}
                                              </th>
                                            ))}
                                          {(parsedHeaders || []).length > 7 && (
                                            <th className="py-2 px-3">
                                              ... ({(parsedHeaders || []).length - 7}{" "}
                                              ستون دیگر)
                                            </th>
                                          )}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {parsedRows
                                          .slice(0, 3)
                                          .map((row, rowIdx) => (
                                            <tr key={rowIdx}>
                                              {row
                                                .slice(0, 7)
                                                .map((cell, colIdx) => (
                                                  <td
                                                    key={colIdx}
                                                    className="py-2 px-3 text-slate-700 truncate max-w-48"
                                                  >
                                                    {cell || (
                                                      <span className="text-slate-300">
                                                        -
                                                      </span>
                                                    )}
                                                  </td>
                                                ))}
                                              {(row || []).length > 7 && (
                                                <td className="py-2 px-3 text-slate-400">
                                                  ...
                                                </td>
                                              )}
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Preview Table for JSON (Standard Backups) */}
                          {(parsedHeaders || []).length > 0 &&
                            personsIOFileType === "json" && (
                              <div className="bg-emerald-50/50 border border-emerald-150/50 p-4 rounded-xl space-y-2 text-emerald-950">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-black">
                                      فایل آرشیو استاندارد با موفقیت تایید و
                                      بارگذاری شد!
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-slate-500">
                                    تعداد افراد برای ایمپورت:{" "}
                                    <strong className="text-emerald-700 font-sans font-black">
                                      {(parsedRows || []).length}
                                    </strong>{" "}
                                    نفر
                                  </span>
                                </div>
                                <p className="text-xs leading-relaxed font-semibold">
                                  فایل بارگذاری شده حاوی تمامی فیلدهای تکمیلی،
                                  کدهای سیستمی، حساب‌های بانکی و یادداشت‌های
                                  اشخاص است. با کلیک بر روی دکمه ثبت نهایی، بدون
                                  نیاز به نقشه‌برداری ستون‌ها، تمامی پرونده‌ها
                                  مستقیماً بازیابی خواهند شد.
                                </p>
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex justify-between items-center rounded-b-2xl">
                      <div className="text-xs text-slate-450 font-bold">
                        توسعه‌یافته مطابق دقیق‌ترین سناریوهای حسابداری بازرگانی
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => onClose()}
                          className="px-5 py-2.5 text-slate-700 font-extrabold hover:bg-slate-200/70 border-none bg-slate-100 rounded-xl transition-all text-sm cursor-pointer"
                        >
                          انصراف و بازگشت
                        </button>

                        {personIOAction === "import" && (
                          <button
                            type="button"
                            disabled={
                              (parsedRows || []).length === 0 ||
                              (personsIOFileType !== "json" &&
                                personIOMappings.name === -1)
                            }
                            onClick={() => {
                              const confirmMsg =
                                personsIOFileType === "json"
                                  ? `آیا از ورود نهایی ${(parsedRows || []).length} نفر شخص جدید به پایگاه داده از روی فایل پشتیبان اطمینان دارید؟`
                                  : `آیا از ثبت گروهی ${(parsedRows || []).length} شخص طبق تناظر ستونی انتخاب‌شده اطمینان دارید؟`;

                              confirmAction(confirmMsg, async () => {
                                let successCount = 0;

                                for (const row of parsedRows) {
                                  let mappedName = "";

                                  if (personsIOFileType === "json") {
                                    mappedName = row[0] || "";
                                  } else {
                                    const nameIdx = personIOMappings.name;
                                    if (nameIdx !== -1 && row[nameIdx]) {
                                      mappedName = row[nameIdx].trim();
                                    }
                                  }

                                  if (!mappedName) continue; // Skip rows with no name

                                  let mappedType: "real" | "legal" = "real";
                                  let mappedRole:
                                    "customer" | "supplier" | "employee" =
                                    "customer";
                                  let phone = "";
                                  let nationalId = "";
                                  let fatherName = "";
                                  let companyName = "";
                                  let address = "";
                                  let bankName = "";
                                  let bankAccountNumber = "";
                                  let cardNumber = "";
                                  let shebaNumber = "";
                                  let additionalNotes = "";
                                  let personCode = "";

                                  if (personsIOFileType === "json") {
                                    mappedType = (row[1] || "real") as any;
                                    mappedRole = (row[2] || "customer") as any;
                                    phone = row[3] || "";
                                    nationalId = row[4] || "";
                                    fatherName = row[5] || "";
                                    companyName = row[6] || "";
                                    address = row[7] || "";
                                    bankName = row[8] || "";
                                    bankAccountNumber = row[9] || "";
                                    cardNumber = row[10] || "";
                                    shebaNumber = row[11] || "";
                                    additionalNotes = row[12] || "";
                                    personCode = row[13] || "";
                                  } else {
                                    // Custom Mapper Parser
                                    const phoneIdx = personIOMappings.phone;
                                    if (phoneIdx !== -1 && row[phoneIdx])
                                      phone = row[phoneIdx].trim();

                                    const idIdx = personIOMappings.nationalId;
                                    if (idIdx !== -1 && row[idIdx])
                                      nationalId = row[idIdx].trim();

                                    const fatIdx = personIOMappings.fatherName;
                                    if (fatIdx !== -1 && row[fatIdx])
                                      fatherName = row[fatIdx].trim();

                                    const cmpIdx = personIOMappings.companyName;
                                    if (cmpIdx !== -1 && row[cmpIdx])
                                      companyName = row[cmpIdx].trim();

                                    const adrIdx = personIOMappings.address;
                                    if (adrIdx !== -1 && row[adrIdx])
                                      address = row[adrIdx].trim();

                                    const noteIdx =
                                      personIOMappings.additionalNotes;
                                    if (noteIdx !== -1 && row[noteIdx])
                                      additionalNotes = row[noteIdx].trim();

                                    // Auto-detect type
                                    const typeIdx = personIOMappings.personType;
                                    if (typeIdx !== -1 && row[typeIdx]) {
                                      const tVal = row[typeIdx]
                                        .trim()
                                        .toLowerCase();
                                      if (
                                        tVal.includes("حقوق") ||
                                        tVal.includes("legal") ||
                                        tVal.includes("co") ||
                                        tVal.includes("شرکت")
                                      ) {
                                        mappedType = "legal";
                                      }
                                    }

                                    // Auto-detect role
                                    const rIdx = personIOMappings.role;
                                    if (rIdx !== -1 && row[rIdx]) {
                                      const rVal = row[rIdx]
                                        .trim()
                                        .toLowerCase();
                                      if (
                                        rVal.includes("تامین") ||
                                        rVal.includes("supplier") ||
                                        rVal.includes("فروشنده")
                                      ) {
                                        mappedRole = "supplier";
                                      } else if (
                                        rVal.includes("کارم") ||
                                        rVal.includes("employ") ||
                                        rVal.includes("پرسنل")
                                      ) {
                                        mappedRole = "employee";
                                      }
                                    }
                                  }

                                  let alias =
                                    mappedType === "legal"
                                      ? companyName || mappedName
                                      : mappedName;
                                  if (mappedType === "real" && fatherName) {
                                    alias += `(${fatherName})`;
                                  }

                                  // Call API to append
                                  await addPerson({
                                    name: mappedName,
                                    alias,
                                    personType: mappedType,
                                    role: mappedRole,
                                    phone,
                                    nationalId,
                                    fatherName,
                                    companyName:
                                      mappedType === "legal"
                                        ? companyName || mappedName
                                        : companyName,
                                    address,
                                    bankName,
                                    bankAccountNumber,
                                    cardNumber,
                                    shebaNumber,
                                    additionalNotes,
                                  });

                                  successCount++;
                                }

                                // Refresh lists
                                await fetchPersons();
                                onClose();
                                showNotification(
                                  `تعداد ${successCount} پرونده شخص با موفقیت به سیستم اضافه گردید.`,
                                  'success'
                                );

                                // clear forms
                                setPastedPersonsText("");
                                setParsedHeaders([]);
                                setParsedRows([]);
                              });
                            }}
                            className={`px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none shadow-md ${
                              (parsedRows || []).length > 0 &&
                              (personsIOFileType === "json" ||
                                personIOMappings.name !== -1)
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100/60 active:scale-98"
                                : "bg-indigo-100 text-indigo-400 cursor-not-allowed"
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            تایید و ایمپورت نهایی به سیستم
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              
  );
}
