import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X, Save, Percent, Filter, DollarSign } from "lucide-react";

const addCommas = (num: number | string) => {
  if (num === null || num === undefined) return "";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const toPersianDigits = (num: string | number) => {
  if (num === null || num === undefined) return "";
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (x) => farsiDigits[parseInt(x)]);
};

interface GroupPriceUpdateWizardProps {
  products: any[];
  productCategories: any[];
  initialSelectedIds: (string | number)[];
  currency: string;
  onClose: () => void;
  onSave: (items: any[]) => Promise<void>;
}

export default function GroupPriceUpdateWizard({
  products,
  productCategories,
  initialSelectedIds,
  currency,
  onClose,
  onSave,
}: GroupPriceUpdateWizardProps) {
  const [items, setItems] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<"selected" | "category" | "all">(
    (initialSelectedIds || []).length > 0 ? "selected" : "category"
  );
  const [targetCategory, setTargetCategory] = useState("all");
  
  // Bulk update controls
  const [bulkVal, setBulkVal] = useState("");
  const [bulkType, setBulkType] = useState<"percent" | "fixed">("percent");
  const [bulkTarget, setBulkTarget] = useState<"sale" | "purchase" | "both">("sale");
  const [bulkDirection, setBulkDirection] = useState<"increase" | "decrease">("increase");
  
  const [isSaving, setIsSaving] = useState(false);

  // Populate items when filter changes
  useEffect(() => {
    let targets = [];
    if (filterType === "selected") {
      targets = (products || []).filter(p => initialSelectedIds.includes(p.id));
    } else if (filterType === "category") {
      if (targetCategory === "all") {
        targets = [...products];
      } else {
        targets = (products || []).filter(p => p.categoryId === targetCategory || p.category === targetCategory);
      }
    } else {
      targets = [...products];
    }
    
    setItems(targets.map(p => ({
      ...p,
      newSalePrice: Number(p.price || 0),
      newPurchasePrice: Number(p.purchasePrice || 0)
    })));
  }, [filterType, targetCategory, products, initialSelectedIds]);

  const applyBulkUpdate = () => {
    if (!bulkVal) return;
    const val = Number(bulkVal);
    if (isNaN(val) || val <= 0) return;
    
    const isInc = bulkDirection === "increase";
    const isFix = bulkType === "fixed";
    
    setItems(prevItems => prevItems.map(item => {
      let newSale = item.newSalePrice;
      let newBuy = item.newPurchasePrice;
      
      if (bulkTarget === "sale" || bulkTarget === "both") {
        if (isFix) {
          newSale = isInc ? newSale + val : Math.max(0, newSale - val);
        } else {
          newSale = isInc ? newSale * (1 + val / 100) : Math.max(0, newSale * (1 - val / 100));
        }
      }
      
      if (bulkTarget === "purchase" || bulkTarget === "both") {
        if (isFix) {
          newBuy = isInc ? newBuy + val : Math.max(0, newBuy - val);
        } else {
          newBuy = isInc ? newBuy * (1 + val / 100) : Math.max(0, newBuy * (1 - val / 100));
        }
      }
      
      return {
        ...item,
        newSalePrice: Math.round(newSale),
        newPurchasePrice: Math.round(newBuy)
      };
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(items);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl ring-1 ring-slate-900/5 m-auto"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">
                بروزرسانی گروهی قیمت کالاها
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                تغییر قیمت فروش و خرید کالاها به صورت دسته‌جمعی یا انتخابی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-200/50 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {/* Top Controls */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Filter Section */}
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                انتخاب کالاها
              </h4>
              <div className="flex gap-3 items-center">
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as any)}
                  className="p-2 border border-slate-200 rounded-xl text-sm font-bold"
                >
                  <option value="selected">موارد انتخاب شده ({(initialSelectedIds || []).length})</option>
                  <option value="category">بر اساس دسته‌بندی</option>
                  <option value="all">همه کالاها</option>
                </select>
                
                {filterType === "category" && (
                  <select
                    value={targetCategory}
                    onChange={e => setTargetCategory(e.target.value)}
                    className="p-2 border border-slate-200 rounded-xl text-sm font-bold flex-1"
                  >
                    <option value="all">همه دسته‌ها</option>
                    {productCategories.map((c, idx) => (
                      <option key={`${c.id}-${idx}`} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Bulk Apply Section */}
            <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
              <h4 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                اعمال تغییرات روی لیست زیر
              </h4>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={bulkDirection}
                  onChange={e => setBulkDirection(e.target.value as any)}
                  className="p-1.5 border border-emerald-200 rounded-lg text-xs font-bold bg-white text-emerald-800"
                >
                  <option value="increase">افزایش</option>
                  <option value="decrease">کاهش</option>
                </select>
                
                <input
                  type="number"
                  placeholder="مقدار"
                  value={bulkVal}
                  onChange={e => setBulkVal(e.target.value)}
                  className="w-20 p-1.5 border border-emerald-200 rounded-lg text-xs font-bold text-center bg-white text-emerald-800 focus:outline-none"
                />
                
                <select
                  value={bulkType}
                  onChange={e => setBulkType(e.target.value as any)}
                  className="p-1.5 border border-emerald-200 rounded-lg text-xs font-bold bg-white text-emerald-800"
                >
                  <option value="percent">درصد (%)</option>
                  <option value="fixed">مبلغ ثابت</option>
                </select>
                
                <select
                  value={bulkTarget}
                  onChange={e => setBulkTarget(e.target.value as any)}
                  className="p-1.5 border border-emerald-200 rounded-lg text-xs font-bold bg-white text-emerald-800"
                >
                  <option value="sale">قیمت فروش</option>
                  <option value="purchase">قیمت خرید</option>
                  <option value="both">هر دو</option>
                </select>

                <button
                  onClick={applyBulkUpdate}
                  className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  اعمال
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-extrabold text-slate-700 w-12 text-center">ردیف</th>
                  <th className="p-4 font-extrabold text-slate-700">نام کالا / خدمات</th>
                  <th className="p-4 font-extrabold text-slate-700 w-40 border-r border-slate-100 text-center">قیمت خرید ({currency})</th>
                  <th className="p-4 font-extrabold text-slate-700 w-40 border-r border-slate-100 text-center">قیمت فروش ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(items || []).map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 text-center font-sans font-bold text-slate-500 text-xs border-l border-slate-100/50">
                      {toPersianDigits(idx + 1)}
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      {item.name}
                      {item.code && <span className="text-xs text-slate-400 font-mono ml-2">({item.code})</span>}
                    </td>
                    <td className="p-3 border-r border-slate-100 text-center align-middle">
                      <div className="flex flex-col items-center">
                         <span className="text-[10px] text-slate-400 font-bold mb-1 line-through">{addCommas(item.purchasePrice || 0)}</span>
                         <input
                          type="text"
                          className="w-full text-center font-sans font-black text-slate-700 bg-slate-50 border border-slate-200/60 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-500/30 transition-all text-sm"
                          value={item.newPurchasePrice ? addCommas(item.newPurchasePrice) : ""}
                          onChange={(e) => {
                            const raw = Number(e.target.value.replace(/\D/g, ""));
                            const newItems = [...items];
                            newItems[idx].newPurchasePrice = raw;
                            setItems(newItems);
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    </td>
                    <td className="p-3 border-r border-slate-100 text-center align-middle">
                      <div className="flex flex-col items-center">
                         <span className="text-[10px] text-slate-400 font-bold mb-1 line-through">{addCommas(item.price || 0)}</span>
                         <input
                          type="text"
                          className="w-full text-center font-sans font-black text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all text-sm"
                          value={item.newSalePrice ? addCommas(item.newSalePrice) : ""}
                          onChange={(e) => {
                            const raw = Number(e.target.value.replace(/\D/g, ""));
                            const newItems = [...items];
                            newItems[idx].newSalePrice = raw;
                            setItems(newItems);
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {(items || []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 font-bold">
                      هیچ کالایی برای ویرایش یافت نشد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            شما در حال ویرایش {toPersianDigits((items || []).length)} کالا هستید.
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-sm"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || (items || []).length === 0}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? "در حال ثبت..." : "ذخیره تغییرات"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
