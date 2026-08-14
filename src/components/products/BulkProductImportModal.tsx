import React, { useState } from 'react';
import { X, FileJson, FileText, Upload, Copy, AlertCircle, Check, Database } from 'lucide-react';
import { toPersianDigits, addCommas } from '../../utils/format';
import { InvoiceItem } from '../../types';

interface BulkProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  onImport: (items: any[]) => void;
  isPurchase: boolean;
  getLastPriceForProduct: (productId: string | number, isPurchase: boolean) => number;
}

export default function BulkProductImportModal({
  isOpen,
  onClose,
  products,
  onImport,
  isPurchase,
  getLastPriceForProduct
}: BulkProductImportModalProps) {
  const [inputText, setInputText] = useState("");
  const [importFormat, setImportFormat] = useState<'text' | 'json'>('text');
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    setError(null);
    let itemsToAdd: any[] = [];
    
    if (importFormat === 'json') {
      try {
        const parsed = JSON.parse(inputText);
        const dataArray = Array.isArray(parsed) ? parsed : [parsed];
        
        dataArray.forEach(item => {
          // JSON could have standard fields like productId, productName, quantity, etc.
          // Let's try to match by productId, barcode, code, or name
          let matchedProduct = null;
          
          if (item.productId) {
            matchedProduct = products.find(p => p.id?.toString() === item.productId?.toString());
          }
          if (!matchedProduct && item.barcode) {
            matchedProduct = products.find(p => p.barcode?.toString() === item.barcode?.toString());
          }
          if (!matchedProduct && item.code) {
            matchedProduct = products.find(p => p.code?.toString() === item.code?.toString());
          }
          if (!matchedProduct && item.name) {
            matchedProduct = products.find(p => p.name === item.name);
          }
          if (!matchedProduct && item.productName) {
            matchedProduct = products.find(p => p.name === item.productName);
          }

          if (matchedProduct) {
            const quantity = Number(item.quantity) || 1;
            let pPrice = isPurchase && matchedProduct.purchasePrice ? matchedProduct.purchasePrice : matchedProduct.price;
            if (!pPrice || pPrice === 0) {
              pPrice = getLastPriceForProduct(matchedProduct.id, isPurchase);
            }
            const unitPrice = Number(item.unitPrice) || pPrice;
            const discountPercent = Number(item.discountPercent) || 0;
            
            itemsToAdd.push({
              product: matchedProduct,
              quantity,
              unitPrice,
              discountPercent,
            });
          }
        });
      } catch (err) {
        setError("خطا در پردازش JSON. لطفاً ساختار را بررسی کنید.");
        return;
      }
    } else {
      // Text parsing (TSV from Excel/Word or CSV)
      // Assume lines are rows, columns separated by tab or comma
      const lines = inputText.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Try tab first (Excel paste), then comma, then space
        let parts = trimmed.split('\t');
        if (parts.length === 1) parts = trimmed.split(',');
        // If still 1, maybe just space separated, but names can have spaces. So we prioritize tab/comma.
        if (parts.length === 1 && trimmed.includes('  ')) {
            parts = trimmed.split(/\s{2,}/); // 2 or more spaces
        }

        parts = parts.map(p => p.trim());
        if (parts.length === 0 || !parts[0]) return;

        const identifier = parts[0];
        let quantity = 1;
        let unitPrice = 0;
        let discountPercent = 0;

        if (parts.length >= 2) {
            const parsedQ = parseFloat(parts[1].replace(/,/g, ''));
            if (!isNaN(parsedQ)) quantity = parsedQ;
        }
        if (parts.length >= 3) {
            const parsedP = parseFloat(parts[2].replace(/,/g, ''));
            if (!isNaN(parsedP)) unitPrice = parsedP;
        }
        if (parts.length >= 4) {
            const parsedD = parseFloat(parts[3].replace(/,/g, ''));
            if (!isNaN(parsedD)) discountPercent = parsedD;
        }

        let matchedProduct = products.find(p => 
          p.barcode?.toString() === identifier || 
          p.code?.toString() === identifier || 
          p.name === identifier
        );

        if (matchedProduct) {
            let defaultPrice = isPurchase && matchedProduct.purchasePrice ? matchedProduct.purchasePrice : matchedProduct.price;
            if (!defaultPrice || defaultPrice === 0) {
              defaultPrice = getLastPriceForProduct(matchedProduct.id, isPurchase);
            }
            
            itemsToAdd.push({
                product: matchedProduct,
                quantity,
                unitPrice: unitPrice > 0 ? unitPrice : defaultPrice,
                discountPercent,
            });
        }
      });
    }

    setParsedItems(itemsToAdd);
  };

  const handleImport = () => {
    onImport(parsedItems);
    onClose();
    setInputText("");
    setParsedItems([]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl flex flex-col max-h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">ورود سریع گروهی کالا</h2>
              <p className="text-xs font-bold text-slate-500 mt-0.5">پشتیبانی از کپی اکسل/ورد، CSV و JSON</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col">
            <div className="flex gap-2 mb-4 bg-slate-100 p-1.5 rounded-xl self-start">
              <button
                onClick={() => setImportFormat('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  importFormat === 'text'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" /> متن (اکسل / ورد)
              </button>
              <button
                onClick={() => setImportFormat('json')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  importFormat === 'json'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileJson className="w-4 h-4" /> فرمت JSON
              </button>
            </div>
            
            <div className="mb-2 text-sm font-bold text-slate-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              {importFormat === 'text' 
                ? "داده‌ها را از اکسل کپی کرده و اینجا پیست کنید (ستون‌ها: شناسه/نام، تعداد، قیمت، تخفیف)."
                : "آرایه‌ای از آبجکت‌ها با کلیدهای: identifier/barcode/code/name, quantity, unitPrice, discountPercent وارد کنید."}
            </div>

            <textarea
              className="w-full flex-1 min-h-[250px] p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-left font-mono text-sm leading-relaxed"
              dir="ltr"
              placeholder={importFormat === 'text' 
                ? "Barcode123\\t10\\t50000\\nProduct Name\\t5\\t120000"
                : '[\\n  { "barcode": "123", "quantity": 10, "unitPrice": 50000 }\\n]'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            ></textarea>

            <button
              onClick={handleParse}
              disabled={!inputText.trim()}
              className="mt-4 w-full py-3 bg-indigo-50 text-indigo-700 font-black rounded-xl hover:bg-indigo-100 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
            >
              <Check className="w-5 h-5" /> پردازش داده‌ها
            </button>
            {error && <p className="mt-2 text-rose-500 text-sm font-bold">{error}</p>}
          </div>

          <div className="w-full lg:w-80 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col h-[400px] lg:h-auto">
            <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3 flex justify-between items-center">
              <span>پیش‌نمایش ردیف‌ها</span>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-mono">{toPersianDigits(parsedItems.length)}</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {parsedItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                  <Database className="w-12 h-12 mb-2" />
                  <span className="text-sm font-bold">داده‌ای یافت نشد</span>
                </div>
              ) : (
                parsedItems.map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm text-xs">
                    <div className="font-bold text-slate-800 mb-1 line-clamp-1">{item.product.name}</div>
                    <div className="flex justify-between text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100 font-mono" dir="ltr">
                      <span className="font-black text-indigo-600">{toPersianDigits(addCommas(item.quantity))} ×</span>
                      <span>{toPersianDigits(addCommas(item.unitPrice))}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {parsedItems.length > 0 && (
              <button
                onClick={handleImport}
                className="mt-4 w-full py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 flex justify-center items-center gap-2"
              >
                <Upload className="w-5 h-5" /> افزودن به فاکتور
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
