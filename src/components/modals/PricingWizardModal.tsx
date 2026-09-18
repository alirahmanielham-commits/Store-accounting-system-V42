import Barcode from "react-barcode";
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Tag, X, Percent, Check, Printer, List, Eye, HelpCircle, 
  Layers, RefreshCw, Barcode as BarcodeIcon, CheckCircle2,
  Sliders, Info, FileText
} from 'lucide-react';
import { 
  getUnitRatioDirection, 
  getPriceForSelectedUnit, 
  formatUnitConversionFormula 
} from "../../utils/unitConversion";

export default function PricingWizardModal(props: any) {
  const {
    pricingWizardInvoice, setPricingWizardInvoice,
    pricingWizardItems, setPricingWizardItems,
    products, storeSettings, toPersianDigits, formatDateDisplay, formatNumber,
    setSuccessMsg, fetchProducts, updateProduct
  } = props;
  
  const [modalTab, setModalTab] = useState<"table" | "barcode_preview">("table");
  const [pricingPrintMode, setPricingPrintMode] = useState<"list" | "labels">("labels");
  const [printFormatId, setPrintFormatId] = useState('a4');
  const [labelTitleFontSize, setLabelTitleFontSize] = useState(13);
  const [labelPriceFontSize, setLabelPriceFontSize] = useState(14);
  const [labelShowTitle, setLabelShowTitle] = useState(true);
  const [labelShowPrice, setLabelShowPrice] = useState(true);
  const [labelShowStoreName, setLabelShowStoreName] = useState(true);
  const [labelShowSecondaryPrice, setLabelShowSecondaryPrice] = useState(false);
  const [labelBarcodeScale, setLabelBarcodeScale] = useState(90);
  const [isSaving, setIsSaving] = useState(false);

  const PRINT_FORMATS = [
    { 
      id: 'a4', 
      name: 'برگه A4 (۴ ستونه)', 
      css: `@page { size: A4; margin: 10mm; } .print-labels-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; } .label-item { height: 52mm; page-break-inside: avoid; }`
    },
    { 
      id: 'a5', 
      name: 'برگه A5 (۲ ستونه)', 
      css: `@page { size: A5; margin: 5mm; } .print-labels-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3mm; } .label-item { height: 37mm; page-break-inside: avoid; }`
    },
    { 
      id: 'label_50x30', 
      name: 'لیبل پرینتر (۵۰x۳۰ میلی‌متر)', 
      css: `@page { size: 50mm 30mm; margin: 0; } .print-labels-container { display: block; } .label-item { width: 48mm; height: 28mm; margin: 1mm auto; page-break-after: always; border: none !important; }`
    },
    { 
      id: 'label_80x40', 
      name: 'لیبل پرینتر (۸۰x۴۰ میلی‌متر)', 
      css: `@page { size: 80mm 40mm; margin: 0; } .print-labels-container { display: block; } .label-item { width: 78mm; height: 38mm; margin: 1mm auto; page-break-after: always; border: none !important; }`
    },
  ];
  
  const selectedFormat = PRINT_FORMATS.find(f => f.id === printFormatId) || PRINT_FORMATS[0];

  const handleSavePrices = async (shouldPrint?: "list" | "labels") => {
    setIsSaving(true);
    try {
      for (const item of pricingWizardItems) {
        const p = products.find((prod: any) => prod.id === item.productId);
        if (p) {
          await updateProduct(p.id.toString(), {
            ...p,
            price: Number(item.salePrice) || 0,
            purchasePrice: Number(item.purchasePrice) || 0,
            priceChangeDate: pricingWizardInvoice?.date || new Date().toISOString(),
          });
        }
      }
      await fetchProducts();
      setSuccessMsg("قیمت‌های خرید و فروش کالاها بر اساس واحد اصلی با موفقیت ذخیره شدند.");
      if (shouldPrint) {
        setPricingPrintMode(shouldPrint);
        setTimeout(() => window.print(), 350);
      } else {
        setPricingWizardInvoice(null);
        setPricingWizardItems([]);
      }
    } catch (err) {
      console.error("Error updating product prices:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const currency = storeSettings?.currency || "تومان";

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-barcode-section, .print-barcode-section * { visibility: visible; }
          .main-app-layout-wrapper { display: none !important; }
          .print-barcode-section { position: relative !important; width: 100%; margin: 0; padding: 0; }
          ${selectedFormat.css}
        }
      `}</style>
      {pricingWizardInvoice && (
        <div 
          key="pricingWizardInvoice-modal"
          className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:block print:overflow-visible overflow-y-auto print-barcode-section"
        >
          {/* Interactive UI */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl ring-1 ring-slate-900/5 print:hidden m-auto"
            dir="rtl"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-800 text-lg">
                      قیمت‌گذاری و چاپ بارکد کالاها
                    </h3>
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      مبنا: واحد اصلی
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">
                    فاکتور خرید شماره {toPersianDigits(pricingWizardInvoice?.invoiceNumber || pricingWizardInvoice?.id || "")} • کلیه قیمت‌ها و بارکدها بر اساس واحد اصلی ثبت می‌شوند
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Tab Switcher */}
                <div className="flex items-center bg-slate-200/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setModalTab("table")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      modalTab === "table"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    جدول قیمت‌گذاری
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab("barcode_preview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      modalTab === "barcode_preview"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <BarcodeIcon className="w-3.5 h-3.5" />
                    پیش‌نمایش بارکد و لیبل
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPricingWizardInvoice(null);
                    setPricingWizardItems([]);
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-200/60 hover:bg-rose-100 text-slate-600 hover:text-rose-600 transition-colors"
                  title="بستن"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Subheader Banner: Explaining base unit pricing conversion */}
            <div className="px-6 py-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-b border-emerald-100/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  اگر کالایی در فاکتور با <strong>واحد فرعی</strong> (کارتن، متر و...) ثبت شده باشد، قیمت خرید آن خودکار به <strong>واحد اصلی</strong> (عدد، شاخه و...) تبدیل شده و در کالا و بارکد درج می‌گردد.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-bold">فرمت چاپ لیبل:</span>
                <select
                  value={printFormatId}
                  onChange={(e) => setPrintFormatId(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                >
                  {PRINT_FORMATS.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
              {modalTab === "table" ? (
                <>
                  {/* Bulk Update Controls */}
                  {pricingWizardItems.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between bg-indigo-50/70 p-3.5 border border-indigo-100 rounded-2xl gap-3">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                        <Percent className="w-4 h-4 text-indigo-600" />
                        اعمال درصد سود یکسان روی تمام کالاها بر مبنای بهای خرید واحد اصلی:
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-xl px-2.5 py-1 focus-within:ring-2 focus-within:ring-indigo-500/30 w-32 shadow-xs">
                          <input
                            type="number"
                            min="0"
                            placeholder="مثلا ۱۵"
                            className="w-full text-center font-sans font-black text-indigo-700 bg-transparent focus:outline-none text-sm"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") return;
                              const m = Number(val);
                              if (!isNaN(m)) {
                                const newItems = pricingWizardItems.map((item: any) => ({
                                  ...item,
                                  marginPercent: m,
                                  salePrice: Math.round(item.purchasePrice * (1 + m / 100)),
                                }));
                                setPricingWizardItems(newItems);
                              }
                            }}
                          />
                          <span className="text-xs font-bold text-indigo-400">٪</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Table of items */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs">
                        <tr>
                          <th className="p-3.5 font-extrabold text-slate-700 w-12 text-center">ردیف</th>
                          <th className="p-3.5 font-extrabold text-slate-700 min-w-[200px]">شرح کالا و واحدها</th>
                          <th className="p-3.5 font-extrabold text-slate-700 w-48 border-r border-slate-100 text-center">
                            قیمت خرید واحد اصلی
                            <div className="text-[10px] text-slate-400 font-normal">تبدیل شده از فاکتور ({currency})</div>
                          </th>
                          <th className="p-3.5 font-extrabold text-slate-700 w-32 border-r border-slate-100 text-center">حاشیه سود (٪)</th>
                          <th className="p-3.5 font-extrabold text-slate-700 w-52 border-r border-slate-100 text-center">
                            قیمت فروش واحد اصلی
                            <div className="text-[10px] text-emerald-600 font-bold">ثبت در کالا و بارکد ({currency})</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pricingWizardItems.map((item: any, idx: number) => {
                          const prod = products.find((p: any) => p.id === item.productId);
                          const mainUnit = item.mainUnit || prod?.unit || 'عدد';
                          const hasSecondary = Boolean(prod?.secondaryUnit && prod?.unitRatio && prod.unitRatio > 0);
                          const dir = prod?.unitRatioDirection || item.unitRatioDirection || getUnitRatioDirection(prod);
                          
                          // Calculate secondary unit sale price as guide
                          const secSalePrice = hasSecondary 
                            ? getPriceForSelectedUnit(item.salePrice, true, prod.unitRatio, dir)
                            : null;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3.5 text-center font-sans font-bold text-slate-500 text-xs border-l border-slate-100/60">
                                {toPersianDigits(idx + 1)}
                              </td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-800 text-sm">{item.productName}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                                    واحد اصلی: <strong className="text-indigo-600">{mainUnit}</strong>
                                  </span>

                                  {item.isSecondaryUnit ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                                      در فاکتور خرید: {toPersianDigits(formatNumber(item.originalUnitPrice))} {currency} / هر {item.invoiceUnit}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px]">
                                      ثبت با واحد اصلی در فاکتور
                                    </span>
                                  )}

                                  {hasSecondary && (
                                    <span className="text-[10px] text-slate-500 font-normal">
                                      ({formatUnitConversionFormula(prod.unitRatio, prod.unit, prod.secondaryUnit, dir)})
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Base Purchase Price */}
                              <td className="p-3.5 border-r border-slate-100 text-center align-middle">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="font-sans font-black text-slate-800 text-sm bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
                                    {toPersianDigits(formatNumber(item.purchasePrice))}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500">
                                    هر {mainUnit}
                                  </span>
                                </div>
                              </td>

                              {/* Margin % */}
                              <td className="p-3.5 border-r border-slate-100 text-center align-middle">
                                <div className="flex items-center justify-center gap-1 bg-indigo-50 border border-indigo-200/80 rounded-xl px-2 py-1 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all max-w-[90px] mx-auto shadow-xs">
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full text-center font-sans font-black text-indigo-700 bg-transparent focus:outline-none text-sm"
                                    value={item.marginPercent !== undefined && item.marginPercent !== null ? item.marginPercent : ""}
                                    onChange={(e) => {
                                      const m = Number(e.target.value);
                                      const newItems = [...pricingWizardItems];
                                      newItems[idx].marginPercent = m;
                                      newItems[idx].salePrice = Math.round(item.purchasePrice * (1 + m / 100));
                                      setPricingWizardItems(newItems);
                                    }}
                                    placeholder="۰"
                                  />
                                  <span className="text-[11px] font-bold text-indigo-400">٪</span>
                                </div>
                              </td>

                              {/* Base Sale Price */}
                              <td className="p-3.5 border-r border-slate-100 text-center align-middle">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      className="w-[140px] text-center font-sans font-black text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all text-sm shadow-xs"
                                      value={item.salePrice ? toPersianDigits(formatNumber(item.salePrice)) : ""}
                                      onChange={(e) => {
                                        const raw = Number(e.target.value.replace(/\D/g, ""));
                                        const newItems = [...pricingWizardItems];
                                        newItems[idx].salePrice = raw;
                                        if (item.purchasePrice > 0) {
                                          newItems[idx].marginPercent = Math.round(
                                            ((raw - item.purchasePrice) / item.purchasePrice) * 100
                                          );
                                        }
                                        setPricingWizardItems(newItems);
                                      }}
                                      onFocus={(e) => e.target.select()}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-emerald-700">
                                    هر {mainUnit}
                                  </span>

                                  {hasSecondary && secSalePrice !== null && (
                                    <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/50">
                                      معادل هر {prod.secondaryUnit}: {toPersianDigits(formatNumber(secSalePrice))} {currency}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {pricingWizardItems.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500 font-bold">
                              هیچ کالایی برای تعیین قیمت وجود ندارد.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                /* Barcode Live Preview Tab */
                <div className="space-y-4">
                  {/* Controls bar */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-4 flex-wrap font-bold text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={labelShowStoreName}
                          onChange={(e) => setLabelShowStoreName(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        نام فروشگاه
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={labelShowTitle}
                          onChange={(e) => setLabelShowTitle(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        نام کالا
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={labelShowPrice}
                          onChange={(e) => setLabelShowPrice(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        قیمت واحد اصلی
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={labelShowSecondaryPrice}
                          onChange={(e) => setLabelShowSecondaryPrice(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        قیمت واحد فرعی (در صورت وجود)
                      </label>
                    </div>

                    <div className="flex items-center gap-3 font-bold text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span>سایز فونت قیمت:</span>
                        <input
                          type="number"
                          min="10"
                          max="22"
                          value={labelPriceFontSize}
                          onChange={(e) => setLabelPriceFontSize(Number(e.target.value) || 14)}
                          className="w-14 text-center border border-slate-300 rounded-lg py-1 bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>مقیاس بارکد:</span>
                        <input
                          type="number"
                          min="60"
                          max="130"
                          value={labelBarcodeScale}
                          onChange={(e) => setLabelBarcodeScale(Number(e.target.value) || 90)}
                          className="w-16 text-center border border-slate-300 rounded-lg py-1 bg-white"
                        />
                        <span>٪</span>
                      </div>
                    </div>
                  </div>

                  {/* Grid of Preview Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {pricingWizardItems.map((item: any, idx: number) => {
                      const prod = products.find((p: any) => p.id === item.productId);
                      const barcodeVal = prod?.barcode || prod?.code || String(item.productId);
                      const mainUnit = item.mainUnit || prod?.unit || 'عدد';
                      const hasSecondary = Boolean(prod?.secondaryUnit && prod?.unitRatio && prod.unitRatio > 0);
                      const dir = prod?.unitRatioDirection || item.unitRatioDirection || getUnitRatioDirection(prod);
                      const secSalePrice = hasSecondary 
                        ? getPriceForSelectedUnit(item.salePrice, true, prod.unitRatio, dir)
                        : null;

                      return (
                        <div
                          key={idx}
                          className="border-2 border-dashed border-slate-200 bg-white rounded-2xl p-4 flex flex-col items-center justify-between text-center shadow-xs hover:border-indigo-300 transition-colors"
                        >
                          <div className="w-full">
                            {labelShowStoreName && (
                              <div className="text-[11px] font-bold text-slate-500 mb-1 truncate">
                                {storeSettings?.storeName || "فروشگاه"}
                              </div>
                            )}
                            {labelShowTitle && (
                              <div 
                                className="font-extrabold text-slate-800 truncate px-1"
                                style={{ fontSize: `${labelTitleFontSize}px` }}
                              >
                                {item.productName}
                              </div>
                            )}
                          </div>

                          <div 
                            className="my-3 flex justify-center items-center overflow-hidden"
                            style={{ transform: `scale(${labelBarcodeScale / 100})` }}
                          >
                            {barcodeVal ? (
                              <Barcode
                                value={barcodeVal}
                                format="CODE128"
                                width={1.4}
                                height={36}
                                fontSize={11}
                                textMargin={1}
                                margin={0}
                                background="#ffffff"
                                lineColor="#000000"
                                displayValue={true}
                              />
                            ) : (
                              <div className="text-xs text-slate-400 py-4 font-mono">بدون بارکد</div>
                            )}
                          </div>

                          <div className="w-full border-t border-slate-100 pt-2">
                            {labelShowPrice && (
                              <div 
                                className="font-black text-slate-900 leading-tight"
                                style={{ fontSize: `${labelPriceFontSize}px` }}
                              >
                                <span className="text-xs font-bold text-slate-500 ml-1">
                                  هر {mainUnit}:
                                </span>
                                {item.salePrice ? toPersianDigits(formatNumber(item.salePrice)) : "---"} {currency}
                              </div>
                            )}
                            {labelShowSecondaryPrice && hasSecondary && secSalePrice !== null && (
                              <div className="text-[11px] font-bold text-slate-500 mt-1">
                                معادل هر {prod.secondaryUnit}: {toPersianDigits(formatNumber(secSalePrice))} {currency}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-500 text-center sm:text-right">
                قیمت‌های تایید شده در دیتابیس کالاها با مبنای واحد اصلی ({currency}) ثبت خواهند شد.
              </span>

              <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setPricingWizardInvoice(null);
                    setPricingWizardItems([]);
                  }}
                  className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-xs text-sm"
                >
                  انصراف
                </button>

                {/* Save Only (No print required) */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSavePrices()}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm transition-all shadow-indigo-600/20 hover:-translate-y-0.5 text-sm disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  ذخیره و ثبت قیمت‌ها
                </button>

                {/* Save & Print Labels */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSavePrices("labels")}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm transition-all shadow-emerald-600/20 hover:-translate-y-0.5 text-sm disabled:opacity-50"
                >
                  <BarcodeIcon className="w-4 h-4" />
                  ثبت قیمت و چاپ لیبل بارکد
                </button>

                {/* Save & Print List */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSavePrices("list")}
                  className="px-4 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 flex items-center gap-1.5 shadow-sm transition-all text-sm disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  چاپ لیست A4
                </button>
              </div>
            </div>
          </motion.div>

          {/* Dedicated Print-Only Layout */}
          <div
            className="hidden print:block p-8 w-full mx-auto bg-white font-sans text-slate-800"
            dir="rtl"
          >
            {pricingPrintMode === "list" && (
              <>
                <div className="flex flex-col items-center justify-center pb-6 border-b border-slate-200 mb-6">
                  <h2 className="text-3xl font-black text-slate-900 mb-3">
                    {storeSettings?.storeName || "لیست قیمت فروش کالاها"}
                  </h2>
                  <div className="flex gap-8 text-lg font-bold text-slate-600">
                    <span>
                      مرجع: فاکتور خرید{" "}
                      {toPersianDigits(
                        pricingWizardInvoice?.invoiceNumber || "",
                      )}
                    </span>
                    <span>
                      تاریخ فاکتور:{" "}
                      {formatDateDisplay(
                        pricingWizardInvoice?.date || pricingWizardInvoice?.jalaliDate,
                      )}
                    </span>
                    <span>
                      تاریخ قیمت‌گذاری: {formatDateDisplay(new Date())}
                    </span>
                  </div>
                </div>

                <table className="w-full text-base text-right border-collapse border border-slate-300">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 border border-slate-300 font-extrabold w-16 text-center">ردیف</th>
                      <th className="p-3 border border-slate-300 font-extrabold">نام کالا</th>
                      <th className="p-3 border border-slate-300 font-extrabold w-32 text-center">واحد اصلی</th>
                      <th className="p-3 border border-slate-300 font-extrabold w-48 text-center">قیمت خرید واحد اصلی</th>
                      <th className="p-3 border border-slate-300 font-extrabold w-48 text-center bg-slate-200">
                        قیمت فروش واحد اصلی ({currency})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {pricingWizardItems.map((item: any, idx: number) => {
                      const prod = products.find((p: any) => p.id === item.productId);
                      const mainUnit = item.mainUnit || prod?.unit || 'عدد';
                      return (
                        <tr key={idx}>
                          <td className="p-3 border border-slate-300 text-center font-bold">
                            {toPersianDigits(idx + 1)}
                          </td>
                          <td className="p-3 border border-slate-300 font-bold">
                            {item.productName}
                          </td>
                          <td className="p-3 border border-slate-300 text-center font-bold text-slate-600">
                            {mainUnit}
                          </td>
                          <td className="p-3 border border-slate-300 text-center font-bold" dir="ltr">
                            {toPersianDigits(formatNumber(item.purchasePrice))} {currency}
                          </td>
                          <td
                            className="p-3 border border-slate-300 text-center font-black text-xl text-slate-900"
                            dir="ltr"
                          >
                            {item.salePrice
                              ? toPersianDigits(formatNumber(item.salePrice))
                              : "---"}{" "}
                            {currency}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {pricingPrintMode === "labels" && (
              <div className="print-labels-container w-full" dir="rtl">
                {pricingWizardItems.map((item: any, idx: number) => {
                  const prod = products.find((p: any) => p.id === item.productId);
                  const barcodeVal = prod?.barcode || prod?.code || String(item.productId);
                  const mainUnit = item.mainUnit || prod?.unit || 'عدد';
                  const hasSecondary = Boolean(prod?.secondaryUnit && prod?.unitRatio && prod.unitRatio > 0);
                  const dir = prod?.unitRatioDirection || item.unitRatioDirection || getUnitRatioDirection(prod);
                  const secSalePrice = hasSecondary 
                    ? getPriceForSelectedUnit(item.salePrice, true, prod.unitRatio, dir)
                    : null;

                  return (
                    <div
                      key={idx}
                      className="label-item border border-black p-2 bg-white flex flex-col justify-center items-center overflow-hidden rounded-lg box-border"
                      style={printFormatId.includes('label_') ? {} : { borderRadius: '1rem', border: '2px solid black' }}
                    >
                      {labelShowStoreName && (
                        <div 
                          className="font-bold text-black mb-0.5 truncate px-1 w-full text-center leading-tight"
                          style={{ fontSize: `11px` }}
                        >
                          {storeSettings?.storeName || 'فروشگاه'}
                        </div>
                      )}
                      
                      {labelShowTitle && (
                        <div 
                          className="font-bold text-black mb-1 truncate px-1 w-full text-center leading-tight"
                          style={{ fontSize: `${labelTitleFontSize}px` }}
                        >
                          {item.productName}
                        </div>
                      )}
                      
                      <div 
                        className="flex justify-center text-center items-center overflow-hidden origin-top"
                        style={{ transform: `scale(${labelBarcodeScale / 100})`, marginTop: labelShowTitle ? '0' : '4px', marginBottom: labelShowPrice ? '0' : '4px' }}
                      >
                        {barcodeVal ? (
                          <Barcode
                            value={barcodeVal}
                            format="CODE128"
                            width={1.5}
                            height={34}
                            fontSize={11}
                            textMargin={1}
                            margin={0}
                            background="#ffffff"
                            lineColor="#000000"
                            displayValue={true}
                          />
                        ) : (
                          <div className="text-[10px]">بدون بارکد</div>
                        )}
                      </div>

                      {labelShowPrice && (
                        <div 
                          className="font-black text-black w-full text-center mt-1 leading-tight"
                          style={{ fontSize: `${labelPriceFontSize}px` }}
                        >
                          <span className="text-[10px] font-bold ml-1">
                            هر {mainUnit}:
                          </span>
                          {item.salePrice ? toPersianDigits(formatNumber(item.salePrice)) : "---"} {currency}
                        </div>
                      )}

                      {labelShowSecondaryPrice && hasSecondary && secSalePrice !== null && (
                        <div className="text-[9px] font-bold text-black w-full text-center mt-0.5 leading-none">
                          هر {prod.secondaryUnit}: {toPersianDigits(formatNumber(secSalePrice))} {currency}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
