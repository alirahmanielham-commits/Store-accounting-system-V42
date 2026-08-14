import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Clock, Tag } from "lucide-react";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export default function ProductPriceHistoryModal({
  isOpen,
  onClose,
  productId,
  products,
  invoices,
  formatCurrency,
  toPersianDigits,
}: any) {
  const [history, setHistory] = useState<any[]>([]);
  const product = products?.find((p: any) => p.id?.toString() === productId?.toString());

  useEffect(() => {
    if (!isOpen || !productId || !invoices) return;
    const items: any[] = [];
    invoices.forEach((inv: any) => {
      if (inv.isDeleted || inv.isDraft) return;
      inv.items?.forEach((item: any) => {
        if (item.productId?.toString() === productId?.toString()) {
          items.push({
            type: inv.type, // 'purchase' or 'sale'
            price: Number(item.price),
            date: inv.date,
            invoiceNumber: inv.invoiceNumber,
          });
        }
      });
    });
    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setHistory(items);
  }, [isOpen, productId, invoices]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        dir="rtl"
      >
        <div className="bg-gradient-to-l from-indigo-50 to-white px-6 py-4 flex items-center justify-between border-b border-indigo-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-indigo-900">سابقه قیمت‌ها</h2>
              <p className="text-xs text-indigo-600/70 font-bold mt-1">
                {product?.name || 'نامشخص'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-medium">
              هیچ سابقه‌ای برای این کالا یافت نشد.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((h, i) => (
                <div key={i} className={`p-4 rounded-xl border ${h.type === 'purchase' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-blue-50/50 border-blue-100'} flex justify-between items-center`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${h.type === 'purchase' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      {h.type === 'purchase' ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">
                        {h.type === 'purchase' ? 'خرید' : 'فروش'}
                        <span className="text-slate-400 font-normal text-xs mr-2">
                          (فاکتور {toPersianDigits(h.invoiceNumber)})
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-500 mt-1">
                        {toPersianDigits(new DateObject(new Date(h.date)).convert(persian, persian_fa).format("YYYY/MM/DD HH:mm"))}
                      </div>
                    </div>
                  </div>
                  <div className={`font-black text-lg ${h.type === 'purchase' ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {formatCurrency(h.price)}
                    <span className="text-xs font-bold mr-1 opacity-70 text-slate-500">تومان</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-all shadow-sm cursor-pointer"
          >
            بستن
          </button>
        </div>
      </motion.div>
    </div>
  );
}
