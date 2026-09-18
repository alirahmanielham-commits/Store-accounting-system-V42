import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  FileCheck2,
  Calendar,
  Building2,
  Package,
  Layers,
  Coins,
  CheckCircle2,
  AlertCircle,
  Save,
  FileText
} from "lucide-react";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import CustomDatePicker from "../ui/CustomDatePicker";
import { Product, Warehouse } from "../../types";
import { updateProduct, recalculateAllWarehouseStocks } from "../../services/dataService";
import { toPersianDigits, addCommas, removeCommas, numberToWords } from "../../utils/format";
import {
  convertQuantityToBaseUnit,
  convertPriceToBaseUnit,
  getUnitRatioDirection,
  formatUnitConversionFormula
} from "../../utils/unitConversion";

interface InitialStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  warehouses: Warehouse[];
  onSaved: () => void;
}

export default function InitialStockModal({
  isOpen,
  onClose,
  product,
  warehouses,
  onSaved
}: InitialStockModalProps) {
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState<Date | null>(new Date());
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setError(null);
      // Auto-generate document number if none exists
      const existingDocNum = (product as any).initialStockDocNumber;
      if (existingDocNum) {
        setDocNumber(existingDocNum);
      } else {
        const prodCode = product.code ? product.code.replace(/[^a-zA-Z0-9]/g, '') : product.id;
        setDocNumber(`OPN-${prodCode}`);
      }

      // Existing initial date
      const existingDate = (product as any).initialStockDate;
      if (existingDate) {
        setDocDate(new Date(existingDate));
      } else if ((product as any).createdAt) {
        setDocDate(new Date((product as any).createdAt));
      } else {
        setDocDate(new Date());
      }

      // Warehouse
      const currentWh = (product as any).initialStockWarehouseId || product.warehouseId || warehouses[0]?.id || "";
      setWarehouseId(currentWh.toString());

      // Quantity & Price
      const curStock = product.stock !== undefined ? String(product.stock) : "";
      setQuantity(curStock);
      const curPrice = product.purchasePrice || (product as any).buyPrice || product.price || 0;
      setUnitPrice(curPrice ? String(curPrice) : "");

      // Description
      const curDesc = (product as any).initialStockDescription || `سند موجودی اول دوره و افتتاحیه انبار کالا (${product.name})`;
      setDescription(curDesc);
    }
  }, [isOpen, product, warehouses]);

  if (!isOpen || !product) return null;

  const numQty = Number(removeCommas(quantity)) || 0;
  const numPrice = Number(removeCommas(unitPrice)) || 0;
  const totalPrice = numQty * numPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (numQty <= 0) {
      setError("لطفاً مقدار موجودی اول دوره را بزرگتر از صفر وارد کنید.");
      return;
    }

    if (!warehouseId) {
      setError("لطفاً انبار مورد نظر را انتخاب کنید.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formattedDate = docDate
        ? docDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const jalaliDateStr = docDate
        ? docDate.toLocaleDateString("fa-IR")
        : new Date().toLocaleDateString("fa-IR");
      const ts = docDate ? docDate.getTime() : Date.now();

      const updatedFields = {
        stock: numQty,
        purchasePrice: numPrice,
        warehouseId: warehouseId,
        initialStockDocNumber: docNumber.trim() || `OPN-${product.code || product.id}`,
        initialStockDate: formattedDate,
        initialStockJalaliDate: jalaliDateStr,
        initialStockDescription: description.trim() || "سند موجودی اول دوره و افتتاحیه انبار",
        initialStockWarehouseId: warehouseId,
        initialStockRegistered: true,
        initialStockTimestamp: ts,
        initialStockUnitPrice: numPrice,
        initialStockTotalPrice: totalPrice,
      };

      await updateProduct(String(product.id), updatedFields);
      await recalculateAllWarehouseStocks();
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Error registering initial stock document:", err);
      setError(err.message || "خطا در ثبت سند موجودی اول دوره");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden font-sans"
          dir="rtl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <FileCheck2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  ثبت سند موجودی اول دوره (افتتاحیه انبار)
                </h3>
                <p className="text-xs text-amber-100 font-medium mt-0.5">
                  تراز و گردش انبار این کالا در کاردکس از این سند آغاز می‌شود
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Product Overview Ribbon */}
          <div className="bg-amber-50/70 border-b border-amber-200/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-slate-700">کالا:</span>
              <span className="font-black text-slate-900">{product.name}</span>
              {product.code && (
                <span className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-800 font-bold">
                  کد: {toPersianDigits(product.code)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <span>واحد اصلی:</span>
              <span className="font-bold text-indigo-700">{product.unit || "عدد"}</span>
              {product.secondaryUnit && (
                <span className="text-slate-500">
                  (فرعی: {product.secondaryUnit})
                </span>
              )}
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Document Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  شماره سند افتتاحیه
                </label>
                <input
                  type="text"
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="مثال: OPN-101"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
                />
              </div>

              {/* Document Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  تاریخ سند (شمسی)
                </label>
                <CustomDatePicker
                  calendar={persian}
                  locale={persian_fa}
                  value={docDate}
                  onChange={(d: any) => setDocDate(d?.toDate() || null)}
                  format="YYYY/MM/DD"
                  inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none text-center"
                />
              </div>

              {/* Warehouse Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  انبار نگهداری
                </label>
                <select
                  required
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none"
                >
                  <option value="">-- انتخاب انبار --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity in Base Unit */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    مقدار موجودی اول دوره ({product.unit || "واحد"})
                  </span>
                  {product.secondaryUnit && (
                    <span className="text-[10px] text-indigo-600 font-normal">
                      واحد اصلی
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  value={quantity ? toPersianDigits(addCommas(removeCommas(quantity))) : ""}
                  onChange={(e) => setQuantity(removeCommas(e.target.value))}
                  placeholder="۰"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-black focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none text-left"
                />
              </div>

              {/* Unit Purchase Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  بهای تمام‌شده هر واحد (تومان)
                </label>
                <input
                  type="text"
                  value={unitPrice ? toPersianDigits(addCommas(removeCommas(unitPrice))) : ""}
                  onChange={(e) => setUnitPrice(removeCommas(e.target.value))}
                  placeholder="نرخ خرید / بهای تمام‌شده"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-black focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none text-left"
                />
              </div>

              {/* Calculated Total Valuation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ارزش کل موجودی اول دوره
                </label>
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-3 py-2.5 flex items-center justify-between text-xs">
                  <span className="text-emerald-900 font-black">
                    {toPersianDigits(addCommas(Math.round(totalPrice)))} تومان
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    {totalPrice > 0 ? `${numberToWords(Math.round(totalPrice))} تومان` : "صفر تومان"}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                شرح و توضیحات سند افتتاحیه
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات مربوط به افتتاحیه و شمارش اول دوره..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md shadow-amber-200 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>ثبت سند موجودی اول دوره</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
