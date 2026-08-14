import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Save, Calendar, Tag, AlertCircle } from 'lucide-react';
import { updateProduct, appendLocalData, generateId } from '../../services/dataService';
const addCommas = (num: number | string) => {
  if (!num) return "";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
const removeCommas = (num: string) => num.replace(/,/g, "");

const CurrencyInput = ({ value, onChange, placeholder, className }: any) => {
  const [localVal, setLocalVal] = useState(value ? addCommas(value) : "");
  React.useEffect(() => {
    if (value !== undefined) setLocalVal(addCommas(value));
  }, [value]);
  return (
    <input
      type="text"
      value={localVal}
      onChange={(e) => {
        const clean = removeCommas(e.target.value).replace(/[^0-9-]/g, "");
        setLocalVal(addCommas(clean));
        onChange({ target: { value: clean } });
      }}
      placeholder={placeholder}
      className={className}
      dir="ltr"
    />
  );
};


interface ProductPriceChangeModalProps {
  product: any;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
  showNotification: (msg: string, type: 'success' | 'error') => void;
}

export default function ProductPriceChangeModal({ product, currency, onClose, onSuccess, showNotification }: ProductPriceChangeModalProps) {
  const [salePrice, setSalePrice] = useState(product.price?.toString() || '');
  const [purchasePrice, setPurchasePrice] = useState(product.purchasePrice?.toString() || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salePrice) {
      showNotification('لطفاً قیمت فروش را وارد کنید.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newSale = Number(salePrice);
      const newPurchase = Number(purchasePrice || 0);
      
      const payload = {
        ...product,
        price: newSale,
        purchasePrice: newPurchase,
        priceChangeDate: date ? new Date(date).toISOString() : new Date().toISOString()
      };
      
      await updateProduct(product.id.toString(), payload);
      
      showNotification('قیمت کالا با موفقیت بروزرسانی شد و در سوابق ثبت گردید.', 'success');
      onSuccess();
    } catch (err) {
      console.error(err);
      showNotification('خطا در بروزرسانی قیمت کالا', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100"
      >
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            تغییر قیمت تکی کالا
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 bg-indigo-50/50 border-b border-indigo-100 flex flex-col gap-1">
          <span className="text-xs font-bold text-indigo-600">نام کالا / خدمات</span>
          <span className="font-black text-indigo-950 text-lg">{product.name}</span>
          <span className="text-xs text-indigo-700 font-mono mt-1">کد: {product.code || '---'}</span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">قیمت فروش جدید ({currency})</label>
            <CurrencyInput
              value={salePrice}
              onChange={(e: any) => setSalePrice(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm font-mono text-left font-bold text-slate-900"
              placeholder="مثال: 150000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">قیمت خرید جدید ({currency}) <span className="text-xs font-normal text-slate-400">(اختیاری)</span></label>
            <CurrencyInput
              value={purchasePrice}
              onChange={(e: any) => setPurchasePrice(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm font-mono text-left font-bold text-slate-900"
              placeholder="مثال: 120000"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              تاریخ اعمال قیمت
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm font-mono text-left text-slate-900"
              dir="ltr"
            />
          </div>
          
          <div className="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-100 flex gap-2 text-xs font-bold items-start leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <p>این قیمت در بخش سوابق قیمت کالا ثبت خواهد شد و در نمودار قیمت‌های کالا قابل مشاهده خواهد بود.</p>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm flex justify-center items-center gap-2"
            >
              {isSubmitting ? 'در حال ثبت...' : (
                <><Save className="w-4 h-4" /> اعمال و ذخیره قیمت</>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors shadow-sm"
            >
              انصراف
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
