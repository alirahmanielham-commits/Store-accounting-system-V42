import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as lucide from 'lucide-react';
import { Menu, CloudOff } from 'lucide-react';
import { addProduct, updateProduct, deleteProduct,  } from '../../services/dataService';
import FastBarcodeScanner from '../modals/BarcodeScannerModal';

export default function ProductsTab(props: any) {
  const {
    products, setProducts, categories, setCategories, formatCurrency, toPersianDigits,
    fetchProducts, confirmAction, customAlert, showNotification, 
    handleExportProductsData, handleDownloadProductsTemplate, handleImportProductsData,
    handleDuplicateProduct, handleFastBarcodeScan, getCategoryName,
    numToPersianWords, DatePicker, persian, persian_fa,
    storeSettings, user,
    
    setIsProductModalOpen,
    successMsg,
    setIsGenerateBarcodesModalOpen,
    productCategories,
    setActiveTab,
    productSearchTerm,
    setProductSearchTerm,
    setSelectedProductCategory,
    selectedProductCategory,
    productPageSize,
    productCurrentPage,
    selectedProductIds,
    setSelectedProductIds,
    calculateProductCurrentStock,
    formatNumber,
    setViewingProduct,
    setPriceChangeProduct,
    handleEditProduct,
    setHistoryProductId,
    setPrintingBarcodeProduct,
    handleDeleteProduct,
    setProductCurrentPage,
    AIProductSearchModal,
    isAIProductSearchOpen,
    setIsAIProductSearchOpen,
    handleAIProductsAdd,
    setGroupUpdateType,
    setIsGroupPriceModalOpen,
    setShowProductBarcodesList
  ,
    setIsProductActionsMenuOpen,
    isProductActionsMenuOpen,
    setIsFastProductModalOpen,
    setEditingProductId,
    ...rest
  } = props;
  
  // Destruct icons
  const { Percent, ArrowDownToLine, ArrowUpFromLine, FileSpreadsheet, Sparkles, Zap, CheckCircle, Tag, Activity, Printer, Edit2, Package, Plus, Search, Filter, ArrowUpDown, MoreVertical, Edit, Trash2, 
    X, Check, AlertCircle, ChevronDown, ChevronUp, Download, Upload, 
    Copy, Barcode, Eye, FileText, Image
  } = lucide;

  const [openDropdownId, setOpenDropdownId] = useState<string | number | null>(null);

  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdownId !== null) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdownId]);

  return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <div className="bg-gradient-to-l from-indigo-50 to-white p-4 md:px-8 md:py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                          <Package className="w-6 h-6 text-indigo-600" />
                          مدیریت کالا / خدمات
                        </h1>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                          تعریف و بروزرسانی بارکد، قیمت و اطلاعات پایه کلیه
                          محصولات و سرویس‌ها
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
{selectedProductIds.length > 0 && (
  <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 mr-2">
    <span className="text-sm font-bold text-indigo-700">{toPersianDigits(selectedProductIds.length)} مورد انتخاب شده:</span>
    <button
      onClick={() => setIsGroupPriceModalOpen(true)}
      className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-600 rounded-lg flex items-center gap-2 transition-colors text-sm font-bold border border-indigo-200 shadow-sm"
    >
      <Tag className="w-4 h-4" />
      تغییر قیمت
    </button>
    <button
      onClick={() => setPrintingBarcodeProduct(products.filter(p => selectedProductIds.includes(p.id)))}
      className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-600 rounded-lg flex items-center gap-2 transition-colors text-sm font-bold border border-indigo-200 shadow-sm"
    >
      <Printer className="w-4 h-4" />
      چاپ بارکد
    </button>
  </div>
)}

                        <div className="relative" tabIndex={0} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setIsProductActionsMenuOpen(false); } }}>

                          <button
                            onClick={() => setIsProductActionsMenuOpen(!isProductActionsMenuOpen)}
                            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl flex items-center gap-2 transition-colors text-sm font-bold border border-slate-200 shadow-sm"
                          >
                            <MoreVertical className="w-4 h-4" />
                            عملیات بیشتر
                            <ChevronDown className={`w-3 h-3 transition-transform ${isProductActionsMenuOpen ? "rotate-180" : ""}`} />
                          </button>
                          <AnimatePresence>
                            {isProductActionsMenuOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden"
                              >
                                <button
                                  onClick={() => {
                                    handleExportProductsData();
                                    setIsProductActionsMenuOpen(false);
                                  }}
                                  className="w-full px-4 py-2 text-right text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2 font-medium"
                                >
                                  <Download className="w-4 h-4" />
                                  صدور اکسل
                                </button>
                                <button
                                  onClick={() => {
                                    handleImportProductsData();
                                    setIsProductActionsMenuOpen(false);
                                  }}
                                  className="w-full px-4 py-2 text-right text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2 font-medium"
                                >
                                  <Upload className="w-4 h-4" />
                                  ورود اطلاعات از اکسل
                                </button>
                                <button
                                  onClick={() => {
                                    handleDownloadProductsTemplate();
                                    setIsProductActionsMenuOpen(false);
                                  }}
                                  className="w-full px-4 py-2 text-right text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2 font-medium"
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                  دانلود قالب استاندارد
                                </button>
                                <button
                                  onClick={() => {
                                    setIsAIProductSearchOpen(true);
                                    setIsProductActionsMenuOpen(false);
                                  }}
                                  className="w-full px-4 py-2 text-right text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2 font-medium border-t border-slate-100 mt-1 pt-2"
                                >
                                  <Sparkles className="w-4 h-4 text-amber-500" />
                                  استخراج هوشمند کالاها
                                </button>
                                <button
                                  onClick={() => {
                                    setIsGenerateBarcodesModalOpen(true);
                                    setIsProductActionsMenuOpen(false);
                                  }}
                                  className="w-full px-4 py-2 text-right text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2 font-medium"
                                >
                                  <Barcode className="w-4 h-4" />
                                  تولید گروهی بارکد
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveTab('inventory');
                                    setIsProductActionsMenuOpen(false);
                                  }}
                                  className="w-full px-4 py-2 text-right text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2 font-medium border-t border-slate-100 mt-1 pt-2"
                                >
                                  <Activity className="w-4 h-4 text-emerald-500" />
                                  بروزرسانی سریع موجودی
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                          
                        <button
                          onClick={() => {
                            setEditingProductId(null);
                            setIsProductModalOpen(true);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition-colors text-sm font-bold shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          ثبت کالا/خدمات
                        </button>
                      </div>
                    </div>

                    {successMsg && (
                      <div className="mx-6 mt-6 bg-green-50 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 border border-green-100">
                        <CheckCircle className="w-5 h-5" />
                        {successMsg}
                      </div>
                    )}

                    {/* Premium Product Statistics Cards */}
                    <div className="mx-6 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-400">
                              کل کالاها و خدمات
                            </p>
                            <h4 className="text-lg font-black text-slate-800 mt-0.5">
                              {(products || []).length.toLocaleString("fa-IR")}
                            </h4>
                          </div>
                        </div>
                        <div className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-bold">
                          {(products || [])
                            .filter((p) => p.type === "service")
                            .length.toLocaleString("fa-IR")}{" "}
                          خدمات
                        </div>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100/50 flex items-center justify-center text-amber-600">
                            <Barcode className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-400">
                              کالاهای بدون بارکد
                            </p>
                            <h4 className="text-lg font-black text-amber-600 mt-0.5 animate-pulse">
                              {(products || [])
                                .filter(
                                  (p) => !p.barcode || p.barcode.trim() === "",
                                )
                                .length.toLocaleString("fa-IR")}
                            </h4>
                          </div>
                        </div>
                        {(products || []).filter(
                          (p) => !p.barcode || p.barcode.trim() === "",
                        ).length > 0 && (
                          <button
                            onClick={() => setIsGenerateBarcodesModalOpen(true)}
                            className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-xl font-bold transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
                          >
                            تولید بارکد
                          </button>
                        )}
                      </div>

                      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-600">
                            <Tag className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 font-bold">
                              گروه‌های تعریف‌شده
                            </p>
                            <h4 className="text-lg font-black text-slate-800 mt-0.5">
                              {(productCategories || []).length.toLocaleString("fa-IR")}
                            </h4>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab("product_categories")}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer"
                        >
                          مدیریت گروه‌ها
                        </button>
                      </div>
                    </div>

                    {/* Beautifully Crafted Advanced Filters and Search Box */}
                    <div className="mx-6 mt-6 p-5 rounded-2xl border border-slate-100 bg-slate-50/30 shadow-sm space-y-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-indigo-500/80" />
                          </div>
                          <input
                            type="text"
                            className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white text-slate-900 font-bold text-sm transition-all placeholder:text-slate-400 placeholder:font-normal"
                            placeholder="جستجوی پیشرفته بر اساس نام، بارکد، کد کالا یا توضیحات..."
                            value={productSearchTerm}
                            onChange={(e) =>
                              setProductSearchTerm(e.target.value)
                            }
                          />
                          {productSearchTerm && (
                            <button
                              onClick={() => setProductSearchTerm("")}
                              className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                              پاک کردن
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100/80">
                        <span className="text-xs font-black text-slate-500 flex items-center gap-1.5 ml-2">
                          <Tag className="w-3.5 h-3.5 text-indigo-500" />
                          فیلتر بر اساس گروه کالا:
                        </span>

                        <div className="flex flex-wrap gap-1.5 items-center">
                          <button
                            onClick={() => setSelectedProductCategory("all")}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              selectedProductCategory === "all"
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            همه کالاها
                          </button>

                          {(productCategories || []).slice(0, 5).map((cat, idx) => (
                            <button
                              key={cat.id ? `cat-${cat.id}` : `cat-idx-${idx}`}
                              onClick={() =>
                                setSelectedProductCategory(cat.id.toString())
                              }
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                selectedProductCategory === cat.id.toString()
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              {cat.name}
                            </button>
                          ))}

                          {(productCategories || []).length > 5 && (
                            <div className="relative">
                              <select
                                value={
                                  selectedProductCategory !== "all" &&
                                  (productCategories || []).find(
                                    (c) =>
                                      c.id.toString() ===
                                      selectedProductCategory,
                                  )
                                    ? selectedProductCategory
                                    : ""
                                }
                                onChange={(e) => {
                                  if (e.target.value)
                                    setSelectedProductCategory(e.target.value);
                                }}
                                className="appearance-none bg-white border border-slate-200 font-bold text-xs text-slate-600 rounded-xl pl-8 pr-4 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer outline-none hover:bg-slate-50 hover:text-slate-900 transition-all"
                              >
                                <option value="" disabled>
                                  سایر گروه‌ها...
                                </option>
                                {(productCategories || []).slice(5).map((cat, idx) => (
                                  <option
                                    key={cat.id ? `cat-${cat.id}` : `cat-idx-${idx}`}
                                    value={cat.id.toString()}
                                  >
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                <svg
                                  className="w-3.5 h-3.5 text-slate-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-0 overflow-x-auto mt-6">
                      {(() => {
                        const filteredProducts = (products || []).filter((p) => {
                          const matchString = (
                            p.name +
                            " " +
                            (p.code || "") +
                            " " +
                            (p.barcode || "") +
                            " " +
                            (p.description || "")
                          ).toLowerCase();
                          const matchesSearch = matchString.includes(
                            (productSearchTerm || "").toLowerCase(),
                          );
                          const matchesCat =
                            selectedProductCategory === "all" ||
                            p.categoryId?.toString() ===
                              selectedProductCategory.toString();
                          return matchesSearch && matchesCat;
                        });

                        const totalPages = Math.ceil(
                          filteredProducts.length / productPageSize,
                        );
                        const safeCurrentPage = Math.max(
                          1,
                          Math.min(productCurrentPage, totalPages),
                        );
                        const paginatedProducts = filteredProducts.slice(
                          (safeCurrentPage - 1) * productPageSize,
                          safeCurrentPage * productPageSize,
                        );

                        const getPaginationItems = () => {
                          const items: (number | string)[] = [];
                          if (totalPages <= 7) {
                            for (let i = 1; i <= totalPages; i++) items.push(i);
                          } else {
                            if (safeCurrentPage <= 4) {
                              items.push(1, 2, 3, 4, 5, "...", totalPages);
                            } else if (safeCurrentPage >= totalPages - 3) {
                              items.push(
                                1,
                                "...",
                                totalPages - 4,
                                totalPages - 3,
                                totalPages - 2,
                                totalPages - 1,
                                totalPages,
                              );
                            } else {
                              items.push(
                                1,
                                "...",
                                safeCurrentPage - 1,
                                safeCurrentPage,
                                safeCurrentPage + 1,
                                "...",
                                totalPages,
                              );
                            }
                          }
                          return items;
                        };

                        return filteredProducts.length === 0 ? (
                          <div className="p-12 text-center text-gray-500">
                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p>هیچ کالایی یافت نشد.</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="overflow-x-auto min-h-[300px] pb-32">
                              <table className="w-full text-right min-w-[1000px]">
                                <thead>
                                  <tr className="text-xs font-bold text-gray-500 border-b border-gray-100 bg-gray-50/50 uppercase tracking-wider">
                                    <th className="py-4 px-4 text-center w-12">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                        checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id))}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            const newIds = new Set(selectedProductIds);
                                            filteredProducts.forEach(p => newIds.add(p.id));
                                            setSelectedProductIds(Array.from(newIds));
                                          } else {
                                            const newIds = new Set(selectedProductIds);
                                            filteredProducts.forEach(p => newIds.delete(p.id));
                                            setSelectedProductIds(Array.from(newIds));
                                          }
                                        }}
                                      />
                                    </th>
                                    <th className="py-4 px-4 text-center w-16">
                                      ردیف
                                    </th>
                                    <th className="py-4 px-6 text-right">
                                      عنوان کالا / خدمات
                                    </th>
                                    <th className="py-4 px-6 text-right">
                                      گروه کالا
                                    </th>
                                    <th className="py-4 px-6 text-center">
                                      نوع کالا
                                    </th>
                                    <th className="py-4 px-6 text-right">
                                      کد / بارکد
                                    </th>
                                    <th className="py-4 px-6 text-center">
                                      موجودی
                                    </th>
                                    <th className="py-4 px-6 text-right">
                                      قیمت فروش
                                    </th>
                                    <th className="py-4 px-6 text-center w-28">
                                      عملیات
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-sm">
                                  {paginatedProducts.map((p, index) => (
                                    <tr
                                      key={p.id ? `id-${p.id}-${index}` : `idx-${index}`}
                                      className={`hover:bg-slate-50/80 transition-colors group ${p.isActive === false ? "opacity-50 grayscale" : ""}`}
                                    >
                                      <td className="py-4 px-4 text-center">
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                          checked={selectedProductIds.includes(p.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedProductIds([...selectedProductIds, p.id]);
                                            } else {
                                              setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                                            }
                                          }}
                                        />
                                      </td>
                                      <td className="py-4 px-4 text-gray-400 font-sans text-center">
                                        <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center mx-auto text-[10px] font-bold shadow-sm">
                                          {(
                                            (safeCurrentPage - 1) *
                                              productPageSize +
                                            index +
                                            1
                                          ).toLocaleString("fa-IR")}
                                        </div>
                                      </td>
                                      <td className="py-4 px-6">
                                        <div className="flex gap-3 items-center">
                                          {p.imageUrl ? (
                                            <div className="w-10 h-10 rounded border border-gray-200 overflow-hidden shrink-0">
                                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                            </div>
                                          ) : (
                                            <div className="w-10 h-10 rounded border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0 text-gray-400">
                                              <Package className="w-5 h-5" />
                                            </div>
                                          )}
                                          <div className="flex flex-col gap-1.5 items-start">
                                          <div className="flex items-center gap-2">
                                            <button
                                            onClick={() => {
                                              setViewingProduct(p);
                                              setActiveTab("product_view");
                                            }}
                                            className="font-extrabold text-indigo-700 hover:text-indigo-900 text-right transition-colors hover:underline text-sm"
                                          >
                                            {p.name}
                                          </button>
                                          {p.isLocalUnsynced && (
                                            <span className="mr-2 inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-200/50 align-middle shrink-0" title="ذخیره محلی - در صف ارسال">
                                              <CloudOff className="w-3 h-3" />
                                              در صف
                                            </span>
                                          )}
                                          {p.isActive === false && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200 shadow-sm shrink-0">غیرفعال</span>
                                          )}
                                          </div>
                                        </div>
                                        </div>
                                      </td>
                                      <td className="py-4 px-6">
                                        {p.category ? (
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                            {p.category}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400 text-xs">---</span>
                                        )}
                                      </td>
                                      <td className="py-4 px-6 text-center">
                                        <span
                                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center ${p.type === "service" ? "bg-orange-50 text-orange-700 border border-orange-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}
                                        >
                                          {p.type === "service"
                                            ? "خدمات"
                                            : "کالا"}
                                        </span>
                                      </td>
                                      <td className="py-4 px-6 font-mono text-xs text-gray-500">
                                        {p.code ? (
                                          <div className="mb-0.5">
                                            <span className="text-gray-400 ml-1">
                                              کد:
                                            </span>
                                            {p.code}
                                          </div>
                                        ) : null}
                                        {p.barcode ? (
                                          <div>
                                            <span className="text-gray-400 ml-1">
                                              بارکد:
                                            </span>
                                            {p.barcode}
                                          </div>
                                        ) : null}
                                        {!p.code && !p.barcode && "---"}
                                      </td>
                                      <td className="py-4 px-6 text-center">
                                        {p.type === "service" ? (
                                          <span className="text-gray-400">
                                            -
                                          </span>
                                        ) : (
                                          <div className="flex flex-col items-center gap-1">
                                            <span className="font-sans font-bold text-gray-700 text-base">
                                              {calculateProductCurrentStock(
                                                p.id,
                                              )}
                                            </span>
                                            {p.unit && (
                                              <span className="text-[10px] text-gray-500">
                                                {p.unit}
                                              </span>
                                            )}
                                            {calculateProductCurrentStock(
                                              p.id,
                                            ) <= (p.minStock || 0) &&
                                              (p.minStock || 0) > 0 && (
                                                <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-bold border border-rose-100 mt-1">
                                                  نیاز به شارژ
                                                </span>
                                              )}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-4 px-6 font-sans font-black text-indigo-600 text-base">
                                        {formatNumber(p.price)}
                                      </td>
                                      <td className="py-4 px-6 text-center">
                                        <div className="relative inline-block text-left">
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownId(openDropdownId === p.id ? null : p.id);
                                            }}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center justify-center w-8 h-8"
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </button>
                                          <div className={`absolute left-4 mt-2 w-48 origin-top-left rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none transition-all z-50 ${openDropdownId === p.id ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                                            <div className="py-1">
                                              <button
                                                onClick={() => {
                                                  setViewingProduct(p);
                                                  setActiveTab("product_view");
                                                }}
                                                className="text-gray-700 group/item flex w-full items-center px-4 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-right"
                                              >
                                                <Eye className="ml-3 h-4 w-4 text-gray-400 group-hover/item:text-indigo-600" aria-hidden="true" />
                                                مشاهده کارت کالا
                                              </button>
                                              <button
                                                onClick={() => handleEditProduct(p)}
                                                className="text-gray-700 group/item flex w-full items-center px-4 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-right"
                                              >
                                                <Edit2 className="ml-3 h-4 w-4 text-gray-400 group-hover/item:text-indigo-600" aria-hidden="true" />
                                                ویرایش کالا
                                              </button>
                                              
                                              <button
                                                onClick={() =>
                                                  setHistoryProductId(
                                                    p.id.toString(),
                                                  )
                                                }
                                                className="text-gray-700 group/item flex w-full items-center px-4 py-2 text-sm hover:bg-emerald-50 hover:text-emerald-600 transition-colors text-right"
                                              >
                                                <Activity className="ml-3 h-4 w-4 text-gray-400 group-hover/item:text-emerald-600" aria-hidden="true" />
                                                سابقه قیمت‌ها
                                              </button>
                                              
                                              <button
                                                onClick={() =>
                                                  handleDuplicateProduct(p)
                                                }
                                                className="text-gray-700 group/item flex w-full items-center px-4 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-right"
                                              >
                                                <Copy className="ml-3 h-4 w-4 text-gray-400 group-hover/item:text-indigo-600" aria-hidden="true" />
                                                کپی کردن کالا
                                              </button>
                                              <button
                                                onClick={() =>
                                                  confirmAction(
                                                    "آیا از حذف این کالا اطمینان دارید؟",
                                                    () => handleDeleteProduct(p.id),
                                                    <div className="flex flex-col gap-2">
                                                      <div><strong>کد:</strong> {p.code}</div>
                                                      <div><strong>نام:</strong> {p.name}</div>
                                                      {p.category && <div><strong>گروه:</strong> {p.category}</div>}
                                                    </div>
                                                  )
                                                }
                                                className="text-gray-700 group/item flex w-full items-center px-4 py-2 text-sm hover:bg-rose-50 hover:text-rose-600 transition-colors text-right"
                                              >
                                                <Trash2 className="ml-3 h-4 w-4 text-gray-400 group-hover/item:text-rose-600" aria-hidden="true" />
                                                حذف کالا
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Beautiful Pagination Footer */}
                            {totalPages > 1 && (
                              <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 rounded-xl">
                                <div className="text-xs text-slate-500 font-bold">
                                  نمایش ردیف‌های{" "}
                                  <span className="text-slate-850 font-sans font-black">
                                    {(
                                      (safeCurrentPage - 1) * productPageSize +
                                      1
                                    ).toLocaleString("fa-IR")}
                                  </span>{" "}
                                  تا{" "}
                                  <span className="text-slate-850 font-sans font-black">
                                    {Math.min(
                                      filteredProducts.length,
                                      safeCurrentPage * productPageSize,
                                    ).toLocaleString("fa-IR")}
                                  </span>{" "}
                                  از مجموع{" "}
                                  <span className="text-indigo-600 font-sans font-bold">
                                    {filteredProducts.length.toLocaleString(
                                      "fa-IR",
                                    )}
                                  </span>{" "}
                                  کالا یافت‌شده
                                </div>

                                <div
                                  className="flex items-center gap-1.5"
                                  dir="ltr"
                                >
                                  <button
                                    disabled={safeCurrentPage === 1}
                                    onClick={() =>
                                      setProductCurrentPage((prev) =>
                                        Math.max(1, prev - 1),
                                      )
                                    }
                                    className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                                    title="صفحه قبل"
                                  >
                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                  </button>

                                  {getPaginationItems().map((pg, idx) => {
                                    if (pg === "...") {
                                      return (
                                        <span
                                          key={`ellipsis-${idx}`}
                                          className="px-2 text-slate-400 font-black tracking-widest flex items-end pb-1"
                                        >
                                          ...
                                        </span>
                                      );
                                    }
                                    const isCurrent = pg === safeCurrentPage;
                                    return (
                                      <button
                                        key={`${pg}-${idx}`}
                                        onClick={() =>
                                          setProductCurrentPage(pg as number)
                                        }
                                        className={`w-8 h-8 rounded-xl text-xs font-black transition-all flex items-center justify-center border cursor-pointer ${
                                          isCurrent
                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                                        }`}
                                      >
                                        {Number(pg).toLocaleString("fa-IR")}
                                      </button>
                                    );
                                  })}

                                  <button
                                    disabled={safeCurrentPage === totalPages}
                                    onClick={() =>
                                      setProductCurrentPage((prev) =>
                                        Math.min(totalPages, prev + 1),
                                      )
                                    }
                                    className="p-2 border border-slate-200 hover:bg-slate-150 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                                    title="صفحه بعد"
                                  >
                                    <ChevronDown className="w-4 h-4 -rotate-90" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <AIProductSearchModal
                      isOpen={isAIProductSearchOpen}
                      onClose={() => setIsAIProductSearchOpen(false)}
                      categories={productCategories}
                      onAddProducts={handleAIProductsAdd}
                    />
                    
                    {/* Floating Bulk Actions Bar */}
                    {(selectedProductIds || []).length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-indigo-100 p-3 flex items-center gap-4 z-40"
                      >
                        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-black text-sm">
                          {(selectedProductIds || []).length} مورد انتخاب شده
                        </div>
                        <button
                          onClick={() => {
                            setGroupUpdateType("selected");
                            setIsGroupPriceModalOpen(true);
                          }}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                          <Percent className="w-4 h-4" />
                          قیمت‌گذاری گروهی
                        </button>
                        <button
                          onClick={() => {
                            setPrintingBarcodeProduct(products.filter(p => selectedProductIds.includes(p.id)));
                          }}
                          className="bg-slate-50 text-slate-700 hover:bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                          چاپ بارکد
                        </button>
                        <button
                          onClick={() => setSelectedProductIds([])}
                          className="text-gray-400 hover:text-gray-600 p-2"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </motion.div>
                    )}
                  </motion.div>

  );
}
