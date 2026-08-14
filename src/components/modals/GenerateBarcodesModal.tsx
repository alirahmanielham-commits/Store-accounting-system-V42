import React, { useState, useMemo } from "react";
import { X, Check, AlertTriangle } from "lucide-react";

export default function GenerateBarcodesModal({ 
  isOpen, 
  onClose, 
  barcodeFormat, 
  setBarcodeFormat, 
  barcodePrefix, 
  setBarcodePrefix, 
  barcodeLength, 
  setBarcodeLength,
  barcodeStartNumber,
  setBarcodeStartNumber,
  handleGenerateBarcodes,
  products
}: any) {
  const [generating, setGenerating] = useState(false);

  const duplicateBarcodes = useMemo(() => {
    if (!products) return [];
    const barcodeCounts = new Map();
    products.forEach((p) => {
      if (p.barcode && p.barcode.trim() !== "") {
        barcodeCounts.set(p.barcode, (barcodeCounts.get(p.barcode) || 0) + 1);
      }
    });
    const duplicates = [];
    barcodeCounts.forEach((count, barcode) => {
      if (count > 1) duplicates.push({ barcode, count });
    });
    return duplicates;
  }, [products]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-l from-amber-50 to-white px-6 py-4 flex items-center justify-between border-b border-amber-100">
          <h2 className="text-xl font-black text-amber-800">تولید بارکد گروهی</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {duplicateBarcodes.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-rose-700 font-bold mb-2">
                <AlertTriangle className="w-5 h-5" />
                خطا: بارکدهای تکراری یافت شد
              </div>
              <p className="text-sm text-rose-600 mb-2">
                برخی کالاها دارای بارکد یکسان هستند. لطفا قبل از تولید بارکد جدید این موارد را در لیست کالاها اصلاح کنید:
              </p>
              <ul className="text-xs text-rose-600 space-y-1 list-disc list-inside max-h-32 overflow-y-auto pr-2 styled-scrollbar">
                {duplicateBarcodes.map((d, i) => (
                  <li key={i}>بارکد <strong>{d.barcode}</strong> در {d.count} کالا تکرار شده است.</li>
                ))}
              </ul>
            </div>
          )}
          <div>

            <label className="block text-sm font-bold text-slate-700 mb-1.5">فرمت بارکد</label>
            <select
              value={barcodeFormat}
              onChange={(e) => setBarcodeFormat(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
            >
              <option value="numeric_only">عدد تصادفی / سریال</option>
              <option value="ean13">EAN-13 (استاندارد جهانی)</option>
              <option value="prefix_serial">پیشوند + سریال</option>
              <option value="date_prefix">تاریخ + سریال</option>
              <option value="random_alphanumeric">حروف و اعداد تصادفی</option>
            </select>
          </div>
          {(barcodeFormat === "prefix_serial" || barcodeFormat === "random_alphanumeric" || barcodeFormat === "ean13") && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">پیشوند (اختیاری)</label>
              <input
                type="text"
                value={barcodePrefix}
                onChange={(e) => setBarcodePrefix(e.target.value)}
                placeholder={barcodeFormat === "ean13" ? "پیشوند کشور/شرکت (مثال: 626)" : "مثال: PRD"}
                maxLength={barcodeFormat === "ean13" ? 11 : undefined}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none text-left dir-ltr"
              />
            </div>
          )}
          {(barcodeFormat === "prefix_serial" || barcodeFormat === "numeric_only" || barcodeFormat === "date_prefix" || barcodeFormat === "ean13") && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">شماره شروع سریال</label>
              <input
                type="number"
                value={barcodeStartNumber || ''}
                onChange={(e) => setBarcodeStartNumber && setBarcodeStartNumber(Number(e.target.value))}
                placeholder="مثال: 1000"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none text-left dir-ltr"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">طول بارکد / تعداد ارقام سریال</label>
            <input
              type="number"
              value={barcodeLength}
              onChange={(e) => setBarcodeLength(e.target.value)}
              placeholder="مثال: 8"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none text-left dir-ltr"
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 flex items-center gap-3">
          <button
            onClick={async () => {
              setGenerating(true);
              await handleGenerateBarcodes();
              setGenerating(false);
            }}
            disabled={generating}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
          >
            {generating ? (
              <span className="animate-pulse">در حال تولید...</span>
            ) : (
              <>
                <Check className="w-5 h-5" />
                تایید و تولید
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
