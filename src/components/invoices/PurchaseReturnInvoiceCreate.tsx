import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import CustomDatePicker from '../ui/CustomDatePicker';
import DatePickerModule from 'react-multi-date-picker';
const DatePicker = CustomDatePicker;
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import {  
  History, CheckCircle, RefreshCw, Info, Save, Trash2, Plus, 
  ShoppingCart, Building2, UserCircle, Hash, Percent,
  Calendar, CreditCard, Banknote, FileText, Truck
, UserPlus } from 'lucide-react';
// @ts-nocheck

      export default function PurchaseReturnInvoiceCreate(props: any) {
  const {
    hasDraft,
    restoreDraft,
    clearDraft,
    successMsg,
    editingInvoiceId,
    invoiceNumber,
    toPersianDigits,
    persons,
    date,
    setDate,
    persian,
    persian_fa,
    items,
    setItems,
    handleItemChange,
    products,
    handleRemoveItem,
    
    calculateFinalTotal,
    
    
    
    
    accounts,
    
    
    
    
    
    
    
    
    
    
    
    storeSettings,
    
    CurrencyInput,
    Package,
    invoiceWarehouseId,
    setInvoiceWarehouseId,
    warehouses,
    FastBarcodeScanner,
    handleFastBarcodeScan,
    SearchableSelect,
    handleFastAddProduct,
    setIsScannerOpen,
    ScanLine,
    setIsProductModalOpen,
    Box,
    invoiceTitle,
    invoiceMode,
    setInvoiceMode,
    setInvoiceNumber,
    setInvoiceTitle, setIsPersonModalOpen,
    User,
    activePersonsOnly,
    getRoleName,
    customerId,
    setCustomerId,
    renderPersonInfoBox,
    Wallet,
    invoicePaymentAccountId,
    setInvoicePaymentAccountId,
    invoicePaymentStatus,
    setInvoicePaymentStatus,
    setInvoicePaidAmount,
    DollarSign,
    invoicePaidAmount,
    overallDiscountPercent,
    setOverallDiscountPercent,
    formatCurrency,
    invoiceOriginalTotal,
    invoiceCurrency,
    invoiceTotalDiscount,
    numToPersianWords,
    submitting,
    saveInvoiceData,
    handleInvoicePreviewTrigger,
    formatNumber,
    Calculator,
    calculateSubtotal
  } = props;
  const itemsEndRef = useRef<HTMLDivElement>(null);
  const [prevItemsLength, setPrevItemsLength] = useState((items || []).length);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  useEffect(() => {
    if ((items || []).length > prevItemsLength) {
      itemsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setPrevItemsLength((items || []).length);
  }, [items]);

  return (
    <>
      <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-right font-sans"
          >
            {hasDraft && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center text-amber-800 shadow-sm col-span-full w-full">
                <span className="font-bold flex items-center gap-2.5 mb-3 md:mb-0">
                  <History className="w-5 h-5 text-amber-500" /> یک فاکتور
                  ناتمام و ثبت نشده بازیابی شد. مایلید از آن استفاده کنید یا
                  فاکتور جدیدی آغاز کنید؟
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={restoreDraft}
                    className="px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-sm font-bold transition-colors"
                  >
                    بازیابی فاکتور ناتمام
                  </button>
                  <button
                    onClick={clearDraft}
                    className="px-4 py-2.5 bg-white border border-amber-200 hover:bg-amber-50 rounded-xl text-sm font-bold transition-colors"
                  >
                    پاک کردن و فاکتور جدید
                  </button>
                </div>
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 text-emerald-700 px-5 py-4 rounded-xl flex items-center gap-3 border border-emerald-100 font-bold shadow-sm">
                <CheckCircle className="w-5 h-5" />
                {successMsg}
              </div>
            )}
            {editingInvoiceId && (
              <div className="bg-amber-50 text-amber-900 px-5 py-4 rounded-2xl flex items-center justify-between gap-3 border border-amber-200/60 font-bold shadow-xs">
                <div className="flex items-center gap-2.5">
                  <Info className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    شما در حال ویرایش فاکتور برگشت از خرید پیش‌نویس/ثبت‌شده
                    شماره{" "}
                    <strong className="text-amber-950">
                      #{toPersianDigits(invoiceNumber)}
                    </strong>{" "}
                    هستید. تغییرات جدید جایگزین نسخه قبلی خواهد شد.
                  </span>
                </div>
                <button
                  onClick={clearDraft}
                  className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  انصراف از ویرایش
                </button>
              </div>
            )}

            {/* Header Info */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-emerald-50">
              <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3">
                <span className="bg-emerald-100/50 p-2.5 rounded-xl text-emerald-600">
                  <Plus className="w-6 h-6" />
                </span>
                {invoiceTitle}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">
                    شماره فاکتور برگشت از خرید
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={invoiceMode}
                      onChange={(e) =>
                        setInvoiceMode(e.target.value as "auto" | "manual")
                      }
                      className="p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 text-sm font-bold text-emerald-900 outline-none"
                    >
                      <option value="auto">تولید خودکار</option>
                      <option value="manual">ورود دستی</option>
                    </select>
                    {invoiceMode === "manual" ? (
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="flex-1 p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-left font-bold text-slate-800 outline-none bg-emerald-50/20"
                        dir="ltr"
                        placeholder="شماره فاکتور سیستم تامین..."
                      />
                    ) : (
                      <div className="flex-1 p-3 border border-emerald-100 rounded-xl bg-emerald-50/20 font-mono text-left font-bold text-slate-800 opacity-70 flex items-center justify-end">
                        {invoiceNumber || "در حال رزرو..."}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-500" /> عنوان
                    فاکتور
                  </label>
                  <input
                    type="text"
                    value={invoiceTitle}
                    onChange={(e) => setInvoiceTitle(e.target.value)}
                    className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 outline-none bg-emerald-50/20"
                    placeholder="عنوانی برای فاکتور وارد کنید..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-500" /> تاریخ صدور
                    فاکتور
                  </label>
                  <div className="relative">
                    <DatePicker
                      value={date}
                      onChange={setDate}
                      calendar={
                        storeSettings?.calendarType === "gregorian"
                          ? undefined
                          : persian
                      }
                      locale={
                        storeSettings?.calendarType === "gregorian"
                          ? undefined
                          : persian_fa
                      }
                      calendarPosition="bottom-right"
                      inputClass="w-full pl-11 pr-4 p-3 bg-emerald-50/30 hover:bg-emerald-50 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white text-emerald-950 font-sans font-black text-center transition-all cursor-pointer outline-none text-sm"
                      containerClassName="w-full"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-500" /> تامین کننده
                    (طرف حساب)
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 border border-emerald-100 rounded-xl bg-emerald-50/30 focus-within:ring-2 focus-within:ring-emerald-500 transition-colors">
                      <SearchableSelect
                        options={(activePersonsOnly || []).map((p) => ({
                          value: p.id,
                        label: p.alias || p.name,
                        subLabel: p.phone || undefined,
                        badge: getRoleName(p.role),
                        imageUrl: p.imageUrl,
                        searchStr: `${p.alias || ""} ${p.name || ""} ${p.title || ""} ${p.firstName || ""} ${p.lastName || ""} ${p.phone || ""} ${p.nationalId || ""} ${p.personCode || ""} ${p.companyName || ""} ${p.fatherName || ""}`,
                      }))}
                      value={customerId}
                      onChange={(val) => setCustomerId(val)}
                      placeholder="-- جستجوی تامین کننده --"
                      searchPlaceholder="جستجوی شخص یا شرکت..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-xl px-4 flex items-center justify-center transition-colors"
                    title="تعریف شخص جدید"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>
                {customerId &&
                    renderPersonInfoBox(
                      customerId,
                      "bg-emerald-50/50 border-emerald-100/50 text-slate-600",
                    )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-500" /> وضعیت پرداخت
                  </label>
                  <select
                    value={invoicePaymentStatus}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setInvoicePaymentStatus(val);
                      if (val === "paid")
                        setInvoicePaidAmount(calculateFinalTotal());
                      else if (val === "unpaid") setInvoicePaidAmount(0);
                    }}
                    className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 text-sm font-bold text-emerald-900 outline-none"
                  >
                    <option value="unpaid">پرداخت نشده</option>
                    <option value="partial">تسویه بخشی (علی‌الحساب)</option>
                    <option value="paid">تسویه کامل</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> مبلغ
                    پرداختی
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={invoicePaidAmount}
                      onChange={(e) => {
                        setInvoicePaidAmount(Number(e.target.value));
                        if (Number(e.target.value) >= calculateFinalTotal())
                          setInvoicePaymentStatus("paid");
                        else if (Number(e.target.value) > 0)
                          setInvoicePaymentStatus("partial");
                        else setInvoicePaymentStatus("unpaid");
                      }}
                      disabled={invoicePaymentStatus === "unpaid"}
                      className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-left font-bold text-slate-800 outline-none bg-emerald-50/20 disabled:opacity-50"
                      dir="ltr"
                      placeholder="0"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold text-xs select-none">
                      {invoiceCurrency}
                    </div>
                  </div>
                </div>
                {storeSettings.requireWarehouse && (
                  <div className="lg:col-span-1">
                    <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-emerald-500" /> انبار خروج
                      کالا
                    </label>
                    <select
                      value={invoiceWarehouseId}
                      onChange={(e) => setInvoiceWarehouseId(e.target.value)}
                      className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 text-base font-bold text-emerald-900 outline-none"
                    >
                      <option value="">-- لطفاً انبار را انتخاب کنید --</option>
                      {warehouses
                        .filter((w) => w.isActive !== false)
                        .map((v, index) => (
                          <option key={`${v.id}-${index}`} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            <div
              className="bg-white rounded-3xl shadow-sm border-2 border-emerald-50 "
              data-invoice-flow="purchase-return"
            >
              <div className="p-5 bg-emerald-50/30 border-b border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                  <Package className="w-5 h-5 text-emerald-600" /> لیست اقلام
                  برگشت از خرید
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right min-w-[1000px]">
                  <thead>
                    <tr className="bg-white text-xs font-black text-slate-400 border-b border-emerald-50">
                      <th className="p-5 w-12 text-center">ردیف</th>
                      <th className="p-5 min-w-[200px] w-[30%] text-right">
                        شرح کالا / خدمات
                      </th>
                      <th className="p-5 w-32 text-center border-r border-emerald-50/50">
                        تعداد
                      </th>
                      <th className="p-5 w-32 text-center border-r border-emerald-50/50">
                        واحد
                      </th>
                      <th className="p-5 w-48 border-r border-emerald-50/50 text-left text-emerald-800">
                        فی ({invoiceCurrency})
                      </th>
                      <th className="p-5 w-28 text-center border-r border-emerald-50/50">
                        تخفیف %
                      </th>
                      <th className="p-5 w-48 border-r border-emerald-50/50 text-left text-emerald-800">
                        مبلغ کل ({invoiceCurrency})
                      </th>
                      <th className="p-5 w-12 text-center border-r border-emerald-50/50">
                        عملیات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50/50">
                    {(items || []).length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-8 text-center text-emerald-400 font-bold text-sm bg-emerald-50/30"
                        >
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Box className="w-8 h-8 text-emerald-200" />
                            <span>
                              هیچ کالا یا خدماتی به این سند اضافه نشده است.
                              لطفاً جستجو کرده یا محصول جدیدی تعریف کنید.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {(items || []).map((item, index) => (
                      <tr
                        key={item.id}
                        className="hover:bg-emerald-50/20 transition-colors"
                        data-row-type="purchase-return-row"
                      >
                        <td className="p-5 text-center font-bold text-slate-300">
                          {index + 1}
                        </td>
                        <td className="p-5">
                          {item.productId ? (
                            <div className="font-black text-slate-800 flex flex-col gap-1">
                              <span>{item.productName}</span>
                              {(() => {
                                const p = products.find(
                                  (prod) => prod.id === item.productId,
                                );
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 self-start px-2 py-0.5 rounded-md">
                                      کالای سیستمی
                                    </span>
                                    {(p?.code || p?.barcode) && (
                                      <span className="text-[10px] text-emerald-500 font-mono flex gap-2">
                                        {p.code ? (
                                          <span>کد: {p.code}</span>
                                        ) : null}
                                        {p.barcode ? (
                                          <span>بارکد: {p.barcode}</span>
                                        ) : null}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="شرح دلخواه وارد کنید..."
                              value={item.productName}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "productName",
                                  e.target.value,
                                )
                              }
                              className="w-full p-2.5 bg-white border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-800 outline-none"
                            />
                          )}
                        </td>
                        <td className="p-5">
                          <div className="flex flex-col gap-1.5">
                            <CurrencyInput
                              hideWords={true}
                              storeSettings={storeSettings}
                              value={item.quantity}
                              onChange={(e: any) =>
                                handleItemChange(
                                  item.id,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                              className="w-full p-2.5 bg-emerald-50/30 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-sans text-center font-black text-slate-800 outline-none"
                            />
                          </div>
                        </td>
                        <td className="p-5">
                          {(() => {
                            const product = item.productId
                              ? products.find(
                                  (p) =>
                                    p.id.toString() === String(item.productId),
                                )
                              : null;
                            const hasSecondary = product?.secondaryUnit;
                            return (
                              <div className="flex flex-col gap-1.5">
                                {hasSecondary ? (
                                  <select
                                    value={
                                      item.isSecondaryUnit ? "true" : "false"
                                    }
                                    onChange={(e) =>
                                      handleItemChange(
                                        item.id,
                                        "isSecondaryUnit",
                                        e.target.value === "true",
                                      )
                                    }
                                    className="w-full p-2 text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-100/50 rounded-xl outline-none cursor-pointer focus:ring-2 focus:ring-emerald-400"
                                  >
                                    <option value="false">
                                      {product.unit} (اصلی) -{" "}
                                      {formatNumber(
                                        item.isSecondaryUnit
                                          ? item.unitPrice /
                                              (product.unitRatio || 1)
                                          : item.unitPrice,
                                      )}
                                    </option>
                                    <option value="true">
                                      {product.secondaryUnit} (فرعی) -{" "}
                                      {formatNumber(
                                        item.isSecondaryUnit
                                          ? item.unitPrice
                                          : item.unitPrice *
                                              (product.unitRatio || 1),
                                      )}
                                    </option>
                                  </select>
                                ) : product ? (
                                  <div className="w-full p-2 text-center text-emerald-700 font-bold bg-emerald-50/50 border border-emerald-100 rounded-xl text-sm shadow-sm">
                                    {product.unit || "-"}
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={item.selectedUnit || ""}
                                    onChange={(e) =>
                                      handleItemChange(
                                        item.id,
                                        "selectedUnit",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="واحد..."
                                    className="w-full p-2 text-center text-emerald-800 font-bold bg-white border border-emerald-200/50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                  />
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-5">
                          <CurrencyInput
                            currencyLabel={storeSettings?.currency}
                            value={item.unitPrice}
                            onChange={(e: any) =>
                              handleItemChange(
                                item.id,
                                "unitPrice",
                                e.target.value,
                              )
                            }
                            className="w-full p-2.5 bg-emerald-50/30 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-sans text-left font-black text-emerald-900 text-sm outline-none"
                          />
                        </td>
                        <td className="p-5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={item.discountPercent}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "discountPercent",
                                e.target.value,
                              )
                            }
                            className="w-full p-2.5 bg-white border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-center text-rose-600 font-black outline-none"
                            dir="ltr"
                          />
                        </td>
                        <td
                          className="p-5 font-black text-left font-sans text-emerald-950"
                          dir="ltr"
                        >
                          {formatCurrency(item.totalPrice)}
                        </td>
                        <td className="p-5 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors outline-none focus:ring-2 focus:ring-rose-500"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(items || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-16 text-center">
                          <div className="flex flex-col items-center justify-center gap-4 text-emerald-600/50">
                            <div className="bg-emerald-50 p-6 rounded-full border-2 border-emerald-100/50">
                              <Package className="w-12 h-12" />
                            </div>
                            <p className="font-extrabold text-lg text-slate-700">
                              سبد خرید خالی است
                            </p>
                            <p className="text-sm font-bold text-slate-400">
                              یک کالا از نوار جستجو انتخاب کنید یا سطر جدید
                              بسازید.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                    
                  </tbody>
                </table>
              </div>
              <div className="p-5 bg-emerald-50/30 border-t border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex-1 w-full flex flex-col md:flex-row items-center gap-2 max-w-2xl">
                  <div className="flex gap-2">
                    <FastBarcodeScanner onScan={handleFastBarcodeScan} />
                  </div>
                  <div className="flex-[2] relative z-10 w-full">
                    <div className="border hover:border-emerald-300 rounded-xl bg-white shadow-sm transition-colors relative">
                      <SearchableSelect
                        menuPlacement="top"
                        options={(products || []).filter((p) => p.isActive !== false).map((p) => ({
                          value: p.id,
                          label: p.name,
                          subLabel:
                            p.code || p.barcode
                              ? `کد: ${p.code || "-"} | بارکد: ${p.barcode || "-"}`
                              : undefined,
                          badge: p.type === "service" ? "خدمات" : "کالا",
                          searchStr: `${p.code || ""} ${p.barcode || ""}`,
                        }))}
                        value=""
                        onChange={(val) => handleFastAddProduct(String(val))}
                        placeholder="جستجو و افزودن سریع کالا به لیست خرید (نام، کد، بارکد)..."
                        searchPlaceholder="جستجوی کالای خریداری شده..."
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="p-[11px] bg-white border border-emerald-200 text-emerald-600 rounded-xl shadow-sm hover:bg-emerald-50 transition-colors focus:ring-2 focus:ring-emerald-500"
                    title="اسکن بارکد با دوربین"
                  >
                    <ScanLine className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => setIsProductModalOpen(true)}
                  className="px-5 py-3 bg-white border border-emerald-200 text-emerald-700 shadow-sm rounded-xl font-bold hover:bg-emerald-50 flex items-center gap-2 transition-colors whitespace-nowrap outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <Plus className="w-4 h-4" /> تعریف کالا / خدمات جدید
                </button>
              </div>
            </div>

            {/* Totals & Submit */}
            <div className="bg-white rounded-3xl shadow-sm border-2 border-emerald-50 ">
              <div className="p-8">
                <div className="flex flex-col lg:flex-row justify-between gap-10">
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-black text-slate-700 mb-3 ml-1">
                        تخفیف روی کل فاکتور (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={overallDiscountPercent}
                        onChange={(e) =>
                          setOverallDiscountPercent(Number(e.target.value))
                        }
                        className="w-48 p-3.5 bg-emerald-50/30 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-left font-bold text-rose-600 outline-none"
                        dir="ltr"
                      />
                      <p className="mt-2 text-xs font-bold text-slate-400 font-sans">
                        این تخفیف روی مبلغ نهایی پس از کسر تخفیف‌های سطری اعمال
                        می‌شود.
                      </p>
                    </div>
                  </div>
                  <div className="w-full lg:w-[420px] space-y-1">
                    <div className="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100/50 space-y-4">
                      <div className="flex justify-between items-center text-slate-500 font-bold">
                        <span>جمع مبالغ (بدون تخفیف):</span>
                        <span
                          className="font-sans font-black text-slate-700"
                          dir="rtl"
                        >
                          {formatCurrency(invoiceOriginalTotal())}{" "}
                          <span className="text-[10px]">{invoiceCurrency}</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-rose-500 font-bold">
                        <span>مجموع کل تخفیف‌ها:</span>
                        <span
                          className="font-sans font-black text-rose-600"
                          dir="rtl"
                        >
                          {formatCurrency(invoiceTotalDiscount())}{" "}
                          <span className="text-[10px]">{invoiceCurrency}</span>
                        </span>
                      </div>
                      <div className="h-px bg-emerald-100/30 w-full my-2"></div>
                      <div className="flex justify-between items-center text-slate-400 font-bold text-xs">
                        <span>ارزش پس از تخفیف سطری:</span>
                        <span
                          className="font-sans font-bold text-slate-600"
                          dir="rtl"
                        >
                          {formatCurrency(calculateSubtotal())}{" "}
                          <span className="text-[10px]">{invoiceCurrency}</span>
                        </span>
                      </div>
                      {overallDiscountPercent > 0 && (
                        <div className="flex justify-between items-center text-slate-400 font-bold text-xs">
                          <span>تخفیف کلی فاکتور:</span>
                          <span
                            className="font-sans font-bold text-slate-600"
                            dir="rtl"
                          >
                            % {overallDiscountPercent}
                          </span>
                        </div>
                      )}
                      <div className="h-px bg-emerald-100/60 w-full my-4"></div>
                      <div className="flex justify-between items-center text-xl font-black text-emerald-800">
                        <span>مبلغ نهایی خرید:</span>
                        <span
                          className="font-sans text-2xl text-emerald-950"
                          dir="rtl"
                        >
                          {formatCurrency(calculateFinalTotal())}{" "}
                          <span className="text-xs">{invoiceCurrency}</span>
                        </span>
                      </div>
                      {calculateFinalTotal() > 0 && (
                        <div className="mt-4 pt-4 border-t border-dashed border-emerald-200 text-right leading-relaxed text-xs font-bold text-emerald-700">
                          <span className="text-emerald-900 font-black">
                            {numToPersianWords(calculateFinalTotal())}{" "}
                            {invoiceCurrency}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-emerald-50/20 border-t border-emerald-100 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={submitting || (items || []).length === 0 || !customerId}
                  onClick={() => {
                    if (
                      confirm(
                        "آیا از ذخیره این فاکتور برگشت از خرید به عنوان پیش‌نویس اطمینان دارید؟",
                      )
                    ) {
                      saveInvoiceData(null, true);
                    }
                  }}
                  className="px-6 py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm outline-none cursor-pointer"
                >
                  <FileText className="w-5 h-5" />
                  ذخیره به عنوان پیش‌نویس
                </button>
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={submitting || (items || []).length === 0 || !customerId}
                  className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-colors shadow-sm outline-none focus:ring-4 focus:ring-emerald-500/20 cursor-pointer"
                >
                  {submitting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-6 h-6" />
                  )}
                  ثبت برگشت از خرید
                </button>
              </div>
            </div>
          </motion.div>

          {isPaymentModalOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
              <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
                <button 
                  onClick={() => setIsPaymentModalOpen(false)} 
                  className="absolute top-4 left-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div className="p-6">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-emerald-500" />
                    تعیین وضعیت دریافت وجه (برگشت از خرید)
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-500" /> وضعیت دریافت وجه
                      </label>
                      <select
                        value={invoicePaymentStatus}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInvoicePaymentStatus(val);
                          if (val === "paid")
                            setInvoicePaidAmount(calculateFinalTotal());
                          else if (val === "unpaid") setInvoicePaidAmount(0);
                        }}
                        className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 text-sm font-bold text-emerald-900 outline-none"
                      >
                        <option value="unpaid">دریافت نشده (نسیه)</option>
                        <option value="partial">دریافت بخشی (علی‌الحساب)</option>
                        <option value="paid">تسویه کامل نقدی</option>
                      </select>
                    </div>

                    {(invoicePaymentStatus === "paid" || invoicePaymentStatus === "partial") && (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-500" /> مبلغ دریافتی
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={invoicePaidAmount}
                              onChange={(e) => {
                                setInvoicePaidAmount(Number(e.target.value));
                                if (Number(e.target.value) >= calculateFinalTotal())
                                  setInvoicePaymentStatus("paid");
                                else if (Number(e.target.value) > 0)
                                  setInvoicePaymentStatus("partial");
                                else setInvoicePaymentStatus("unpaid");
                              }}
                              disabled={invoicePaymentStatus === "unpaid"}
                              className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono text-left font-bold text-slate-800 outline-none bg-emerald-50/20 disabled:opacity-50"
                              dir="ltr"
                              placeholder="0"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold text-xs select-none">
                              {invoiceCurrency}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                            واریز به صندوق / حساب بانکی
                          </label>
                          <select
                            value={invoicePaymentAccountId}
                            onChange={(e) => setInvoicePaymentAccountId(e.target.value)}
                            className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 text-sm font-bold text-emerald-900 outline-none"
                          >
                            <option value="">-- انتخاب کنید --</option>
                            {accounts?.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.title} {acc.bankName ? `(${acc.bankName})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    <div className="mt-8 flex gap-3">
                      <button
                        onClick={() => setIsPaymentModalOpen(false)}
                        className="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                      >
                        انصراف
                      </button>
                      <button
                        onClick={() => {
                          setIsPaymentModalOpen(false);
                          handleInvoicePreviewTrigger();
                        }}
                        disabled={submitting}
                        className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        {submitting ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                        تایید و ثبت نهایی
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

    </>
  );
}