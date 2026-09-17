import React from "react";
import { X, RefreshCw } from "lucide-react";
import BulkBarcodeGenerator from "../products/BulkBarcodeGenerator";

export default function GenerateBarcodesModal({
  isOpen,
  onClose,
  products,
  categories,
  toPersianDigits,
  updateProduct,
  fetchProducts,
  storeSettings,
  showNotification,
}: any) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 z-[9999] animate-in fade-in duration-200"
      dir="rtl"
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-l from-indigo-50/60 via-white to-white px-5 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">تولید گروهی بارکد کالاها</h2>
              <p className="text-xs text-slate-500 font-medium">ایجاد، تنظیم و تخصیص هوشمند بارکد به صورت دسته‌ای</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: The full-featured Bulk Barcode Generator component */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-50/50">
          <BulkBarcodeGenerator
            products={products}
            categories={categories}
            toPersianDigits={toPersianDigits}
            updateProduct={updateProduct}
            fetchProducts={fetchProducts}
            storeSettings={storeSettings}
            showNotification={showNotification}
            isModal={true}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
