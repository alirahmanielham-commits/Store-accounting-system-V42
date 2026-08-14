import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Package, Barcode, HelpCircle, ArrowRight, Tag, Info, 
  MonitorCheck, Percent, Layers, ShieldCheck, RefreshCw, X, 
  Eye, EyeOff, TrendingUp, Coins, Sparkles, ShoppingBag, Box, ChevronLeft,
  AlertTriangle, CheckCircle2, AlertCircle, Sparkle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { addCommas, toPersianDigits } from '../../utils/format';
import { Product } from '../../types';

interface QuickPriceInquiryProps {
  products: Product[];
  settings: any;
}

export default function QuickPriceInquiry({ products, settings }: QuickPriceInquiryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [partnerMode, setPartnerMode] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search input on mount
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Handle exact barcode or code match automatically
    if (searchTerm) {
      const exactMatch = products.find(p => p.isActive !== false && 
        ((p.barcode && p.barcode === searchTerm) || 
        (p.code && p.code === searchTerm))
      );
      
      if (exactMatch) {
        setSelectedProduct(exactMatch);
        setSearchTerm('');
      }
    }
  }, [searchTerm, products]);

  // Suggestions should always be calculated when searchTerm has length >= 2
  // We removed the "!selectedProduct" restriction so searching always works!
  const suggestedProducts = searchTerm.length >= 2 
    ? (products || []).filter(p => 
        p.isActive !== false && (
        p.name.includes(searchTerm) || 
        (p.code && p.code.includes(searchTerm)) || 
        (p.barcode && p.barcode.includes(searchTerm))
        )
      ).slice(0, 5) // Show top 5 suggestions
    : [];

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm('');
    if (searchInputRef.current) {
        searchInputRef.current.focus();
    }
  };

  const currency = settings?.currency || 'تومان';

  // Find other products in the same category as the selected one (up to 3)
  const alternativeProducts = selectedProduct && selectedProduct.category
    ? (products || []).filter(p => 
        p.category === selectedProduct.category && 
        p.id !== selectedProduct.id &&
        p.isActive !== false
      ).slice(0, 3)
    : [];

  // Profit margin calculation for Partner Mode
  const purchasePrice = selectedProduct?.purchasePrice || 0;
  const salePrice = selectedProduct?.price || 0;
  const profitAmount = salePrice - purchasePrice;
  const profitMarginPercent = purchasePrice > 0 
    ? Math.round((profitAmount / purchasePrice) * 100) 
    : 0;

  // Stock level styling helper
  const getStockStatus = (p: Product) => {
    const stock = p.stock || 0;
    const minStock = p.minStock || p.minStockLevel || 0;
    
    if (stock <= 0) {
      return {
        label: 'ناموجود در انبار',
        colorClass: 'text-rose-600 bg-rose-50 border-rose-100',
        dotClass: 'bg-rose-500',
        icon: <AlertCircle className="w-4 h-4 text-rose-500" />
      };
    } else if (stock <= minStock) {
      return {
        label: `رو به اتمام (${toPersianDigits(stock)} ${p.unit || 'عدد'})`,
        colorClass: 'text-amber-700 bg-amber-50 border-amber-100',
        dotClass: 'bg-amber-500',
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />
      };
    } else {
      return {
        label: `موجود (${toPersianDigits(stock)} ${p.unit || 'عدد'})`,
        colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-100',
        dotClass: 'bg-emerald-500',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      };
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4" dir="rtl">
      {/* Visual Page Header */}
      <div className="mb-6 flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <MonitorCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">صندوق استعلام سریع قیمت</h1>
            <p className="text-xs text-slate-500 mt-0.5">بررسی آنی قیمت، بارکد، موجودی انبار و کالاهای مشابه به صورت یکپارچه</p>
          </div>
        </div>
        <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50">
          تعداد کل کالاها: {toPersianDigits(products?.length || 0)}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-[0_12px_40px_rgba(0,0,0,0.03)] overflow-hidden border border-slate-100/80 flex flex-col md:flex-row min-h-[650px]">
        
        {/* Left Column - Search & Suggestions */}
        <div className="w-full md:w-5/12 bg-slate-50/50 p-6 md:p-8 border-b md:border-b-0 md:border-l border-slate-100 flex flex-col relative z-20">
          <div className="mb-6">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-500" />
              جستجو و اسکن کالا
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">
              بارکد کالا را با دستگاه اسکنر خوانده یا نام، کد و مشخصات آن را تایپ کنید.
            </p>
          </div>

          <div className="relative group mb-4">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-2xl border-0 py-4 pr-11 pl-10 text-slate-800 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 text-sm font-bold bg-white transition-all shadow-inner"
              placeholder="جستجوی نام کالا، کد یا بارکد..."
              autoComplete="off"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4 bg-slate-100 hover:bg-slate-200 p-0.5 rounded-full" />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown (Now always works even if a product is selected!) */}
          <div className="relative flex-1 flex flex-col min-h-0">
            <AnimatePresence>
              {suggestedProducts.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-slate-150 shadow-lg overflow-hidden flex flex-col max-h-[360px]"
                >
                  <div className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span>نتایج پیشنهادی یافت شده</span>
                    <span>{toPersianDigits(suggestedProducts.length)} مورد</span>
                  </div>
                  <ul className="divide-y divide-slate-100 overflow-y-auto custom-scrollbar">
                    {suggestedProducts.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => handleSelectProduct(p)}
                          className="w-full text-right p-3.5 hover:bg-indigo-50/40 transition-colors flex items-center justify-between group/item"
                        >
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="font-bold text-slate-800 text-xs truncate pl-2">{p.name}</span>
                            {(p.barcode || p.code) && (
                               <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-2">
                                 {p.barcode && <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><Barcode className="w-3 h-3 text-slate-400"/> {p.barcode}</span>}
                                 {p.code && <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><Tag className="w-3 h-3 text-slate-400"/> {p.code}</span>}
                               </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                              {toPersianDigits(addCommas(p.price))} {currency}
                            </span>
                            <ChevronLeft className="w-4 h-4 text-slate-300 group-hover/item:text-indigo-500 group-hover/item:translate-x-1 transition-all" />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {!selectedProduct && suggestedProducts.length === 0 && searchTerm.length >= 2 && (
               <div className="mt-6 text-center flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  <HelpCircle className="w-10 h-10 mb-2.5 text-slate-300" />
                  <p className="font-extrabold text-xs text-slate-600">کالایی با این مشخصات یافت نشد</p>
                  <p className="text-[10px] text-slate-400 mt-1">تلفظ یا بارکد کالا را مجدداً بررسی کنید</p>
               </div>
            )}
            
            <div className="mt-auto pt-6 border-t border-slate-100/80">
               <button
                 onClick={() => {
                   setSelectedProduct(null);
                   setSearchTerm('');
                   setPartnerMode(false);
                   if (searchInputRef.current) searchInputRef.current.focus();
                 }}
                 className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50 hover:text-slate-850 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
               >
                  <RefreshCw className="w-4 h-4" />
                  پاک‌سازی و استعلام مجدد
               </button>
            </div>
          </div>
        </div>

        {/* Right Column - Beautiful Live Results & Alternatives */}
        <div className="w-full md:w-7/12 p-6 md:p-8 relative flex flex-col justify-center bg-white min-h-[450px]">
           {/* Grid decorative overlay */}
           <div className="absolute inset-0 pointer-events-none opacity-[0.015] z-0">
             <div className="absolute inset-0 bg-[radial-gradient(#000_1.5px,transparent_1.5px)] [background-size:24px_24px]"></div>
           </div>

           <div className="relative z-10 w-full">
             <AnimatePresence mode="wait">
               {selectedProduct ? (
                 <motion.div 
                   key={selectedProduct.id}
                   initial={{ opacity: 0, scale: 0.98, y: 15 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.98, y: -15 }}
                   transition={{ duration: 0.3 }}
                   className="w-full space-y-5"
                 >
                   {/* Product Header */}
                   <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 border-b border-slate-100">
                     {/* Product Image or Icon placeholder */}
                     <div className="shrink-0">
                       {selectedProduct.imageUrl ? (
                          <div className="w-24 h-24 rounded-2xl bg-white shadow-md border border-slate-150 p-1.5 relative overflow-hidden group">
                            <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover rounded-xl" />
                            {(!selectedProduct.isActive) && (
                               <div className="absolute top-1 right-1 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">غیرفعال</div>
                            )}
                          </div>
                       ) : (
                          <div className="w-24 h-24 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-inner relative">
                            <Package className="w-10 h-10 text-indigo-300 animate-pulse" />
                            {(!selectedProduct.isActive) && (
                               <div className="absolute top-1 right-1 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">غیرفعال</div>
                            )}
                          </div>
                       )}
                     </div>

                     {/* Product Identity */}
                     <div className="text-center sm:text-right flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-indigo-100">
                            {selectedProduct.category || "دسته‌بندی نشده"}
                          </span>
                          {selectedProduct.isActive === false && (
                            <span className="bg-rose-50 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-rose-100">
                              غیرفعال در سیستم
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-slate-800 leading-snug">
                          {selectedProduct.name}
                        </h3>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs font-bold text-slate-400 font-mono">
                          {selectedProduct.code && (
                             <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"><Tag className="w-3.5 h-3.5 text-slate-400"/> {selectedProduct.code}</span>
                          )}
                          {selectedProduct.barcode && (
                             <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"><Barcode className="w-3.5 h-3.5 text-slate-400"/> {selectedProduct.barcode}</span>
                          )}
                        </div>
                     </div>
                   </div>

                   {/* Pricing Giant Card */}
                   <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-3xl p-5 text-white shadow-xl shadow-indigo-600/15 text-center relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.06)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] group-hover:animate-[shimmer_2.5s_infinite]"></div>
                      <span className="block text-indigo-200 text-[10px] font-black uppercase tracking-wider mb-1.5 relative z-10">قیمت فروش نهایی کالا</span>
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        <span className="text-3xl md:text-4xl font-black tracking-tight" dir="ltr">
                          {toPersianDigits(addCommas(selectedProduct.price || 0))}
                        </span>
                        <span className="text-sm font-bold text-indigo-100 mt-2">{currency}</span>
                      </div>
                   </div>

                   {/* Multi-info details grid */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Inventory Stock Status */}
                      <div className={`rounded-2xl p-3.5 border flex items-center justify-between transition-all ${getStockStatus(selectedProduct).colorClass}`}>
                         <div className="flex items-center gap-2.5">
                           {getStockStatus(selectedProduct).icon}
                           <div className="flex flex-col">
                             <span className="text-[10px] font-black text-slate-400">موجودی انبار</span>
                             <span className="font-extrabold text-xs mt-0.5">{getStockStatus(selectedProduct).label}</span>
                           </div>
                         </div>
                         <div className="bg-white/80 px-2 py-1 rounded-lg text-[10px] font-black border border-inherit">
                           واحد: {selectedProduct.unit || 'عدد'}
                         </div>
                      </div>

                      {/* Default Discount info */}
                      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between">
                         <div className="flex items-center gap-2.5">
                           <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                             <Percent className="w-4 h-4" />
                           </div>
                           <div className="flex flex-col">
                             <span className="text-[10px] font-black text-slate-400">تخفیف پیش‌فرض</span>
                             <span className="font-extrabold text-xs text-slate-700 mt-0.5">
                               {selectedProduct.discountPercent && selectedProduct.discountPercent > 0 
                                 ? `${toPersianDigits(selectedProduct.discountPercent)} درصد تخفیف` 
                                 : 'فاقد تخفیف پیش‌فرض'}
                             </span>
                           </div>
                         </div>
                      </div>
                   </div>

                   {/* Toggle Partner / Advanced Profit Mode (Incredibly practical!) */}
                   <div className="bg-amber-50/55 rounded-2xl border border-amber-100/70 overflow-hidden">
                     <button
                       onClick={() => setPartnerMode(!partnerMode)}
                       className="w-full px-4 py-3.5 flex items-center justify-between bg-amber-50/20 hover:bg-amber-50/40 transition-colors text-right cursor-pointer"
                     >
                       <div className="flex items-center gap-2">
                         <Coins className="w-4.5 h-4.5 text-amber-600" />
                         <span className="text-xs font-black text-amber-900">نمایش حاشیه سود و بهای تمام‌شده (ویژه همکار)</span>
                       </div>
                       <div className="flex items-center gap-1.5">
                         <span className="text-[10px] font-bold text-amber-700">{partnerMode ? "پنهان‌سازی" : "نمایش اطلاعات"}</span>
                         {partnerMode ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4 text-amber-600" />}
                       </div>
                     </button>

                     <AnimatePresence>
                       {partnerMode && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: "auto", opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ duration: 0.25 }}
                           className="border-t border-amber-100/50 bg-amber-50/10 p-4"
                         >
                           <div className="grid grid-cols-3 gap-3 text-center">
                             <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-sm">
                               <span className="block text-[10px] font-black text-slate-400 mb-1">قیمت خرید کالا</span>
                               <span className="text-xs font-black text-amber-800 font-sans">
                                 {purchasePrice > 0 ? `${toPersianDigits(addCommas(purchasePrice))} ${currency}` : 'ثبت نشده'}
                               </span>
                             </div>
                             <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-sm">
                               <span className="block text-[10px] font-black text-slate-400 mb-1">سود ناخالص هر واحد</span>
                               <span className="text-xs font-black text-emerald-700 font-sans">
                                 {purchasePrice > 0 ? `${toPersianDigits(addCommas(profitAmount))} ${currency}` : 'نامشخص'}
                               </span>
                             </div>
                             <div className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-sm">
                               <span className="block text-[10px] font-black text-slate-400 mb-1">درصد حاشیه سود</span>
                               <span className="text-xs font-black text-indigo-700 font-sans">
                                 {purchasePrice > 0 ? `٪ ${toPersianDigits(profitMarginPercent)}` : 'نامشخص'}
                               </span>
                             </div>
                           </div>
                           <p className="text-[9px] text-amber-600/95 font-bold text-center mt-3">
                             * اطلاعات حاشیه سود محرمانه بوده و تنها برای همکاران و مدیران سیستم به جهت تخفیف‌دهی نمایش داده می‌شود.
                           </p>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>

                   {/* Alternative recommendations in the same category (Highly practical UX addition!) */}
                   {alternativeProducts.length > 0 && (
                     <div className="pt-3 border-t border-slate-100">
                       <h4 className="text-xs font-black text-slate-700 mb-3 flex items-center gap-1.5">
                         <Sparkle className="w-4 h-4 text-indigo-500 fill-indigo-100" />
                         سایر کالاهای این گروه (جایگزین‌های پیشنهادی)
                       </h4>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                         {alternativeProducts.map((alt) => (
                           <div 
                             key={alt.id}
                             onClick={() => handleSelectProduct(alt)}
                             className="bg-white hover:bg-slate-50 p-3 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all cursor-pointer shadow-sm flex flex-col justify-between group/alt text-right"
                           >
                             <div className="mb-2">
                               <p className="font-bold text-[11px] text-slate-700 line-clamp-2 leading-relaxed group-hover/alt:text-indigo-600 transition-colors">
                                 {alt.name}
                               </p>
                             </div>
                             <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                               <span className="text-[10px] font-black text-indigo-600">
                                 {toPersianDigits(addCommas(alt.price))} {currency}
                               </span>
                               <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                 (alt.stock || 0) <= 0 
                                   ? "text-rose-600 bg-rose-50" 
                                   : "text-emerald-600 bg-emerald-50"
                               }`}>
                                 {(alt.stock || 0) <= 0 ? "ناموجود" : "موجود"}
                               </span>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                 </motion.div>
               ) : (
                 /* Scanner placeholder screen */
                 <motion.div 
                   key="placeholder"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="text-center flex flex-col items-center justify-center text-slate-400 p-8"
                 >
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 relative border border-slate-100">
                      <Barcode className="w-10 h-10 text-slate-300 relative z-10" />
                      <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping scale-75 opacity-75"></div>
                    </div>
                    <h3 className="text-base font-black text-slate-700 mb-2">در انتظار اسکن یا انتخاب کالا</h3>
                    <p className="text-xs font-bold max-w-[260px] leading-relaxed text-slate-400">
                      کادر جستجوی سمت راست را تکمیل نمایید و یا بارکد کالا را با بارکدخوان بخوانید تا مشخصات و قیمت کالا در این قسمت نمایش داده شود.
                    </p>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>
        </div>

      </div>
    </div>
  );
}
