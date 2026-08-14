import React, { useState } from "react";
import { motion } from "framer-motion";
import { Printer, X, Plus, Minus, Layout } from "lucide-react";
import Barcode from "react-barcode";

const formatNumber = (num: number) => new Intl.NumberFormat('fa-IR').format(num || 0);

interface PrintBarcodeModalProps {
  product?: any;
  products?: any[];
  onClose: () => void;
  storeSettings?: any;
}

const PRINT_FORMATS = [
  { 
    id: 'a4', 
    name: 'برگه A4 (۴ ستونه)', 
    css: `@page { size: A4; margin: 10mm; } .print-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; } .label-item { height: 52mm; page-break-inside: avoid; }`,
    defaultCount: 40
  },
  { 
    id: 'a5', 
    name: 'برگه A5 (۲ ستونه)', 
    css: `@page { size: A5; margin: 5mm; } .print-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3mm; } .label-item { height: 37mm; page-break-inside: avoid; }`,
    defaultCount: 12
  },
  { 
    id: 'label_50x30', 
    name: 'لیبل پرینتر (۵۰x۳۰ میلی‌متر)', 
    css: `@page { size: 50mm 30mm; margin: 0; } .print-container { display: block; } .label-item { width: 48mm; height: 28mm; margin: 1mm auto; page-break-after: always; border: none !important; }`,
    defaultCount: 1
  },
  { 
    id: 'label_80x40', 
    name: 'لیبل پرینتر (۸۰x۴۰ میلی‌متر)', 
    css: `@page { size: 80mm 40mm; margin: 0; } .print-container { display: block; } .label-item { width: 78mm; height: 38mm; margin: 1mm auto; page-break-after: always; border: none !important; }`,
    defaultCount: 1
  },
];

export default function PrintBarcodeModal({ product, products, onClose, storeSettings }: PrintBarcodeModalProps) {
  const targetProducts = products && products.length > 0 ? products : product ? [product] : [];
  
  const [formatId, setFormatId] = useState('a5');
  
  const selectedFormat = PRINT_FORMATS.find(f => f.id === formatId) || PRINT_FORMATS[1];
  const [labelCount, setLabelCount] = useState(selectedFormat.defaultCount);
  
  const [titleFontSize, setTitleFontSize] = useState(13);
  const [priceFontSize, setPriceFontSize] = useState(15);
  const [showTitle, setShowTitle] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [barcodeScale, setBarcodeScale] = useState(100);
  const [printLayout, setPrintLayout] = useState('a4'); // 'a4' | 'thermal'

  const handleFormatChange = (newFormatId: string) => {
    setFormatId(newFormatId);
    const newFormat = PRINT_FORMATS.find(f => f.id === newFormatId);
    if (newFormat) {
      setLabelCount(newFormat.defaultCount);
    }
  };

  const previewProduct = targetProducts[0] || {};
  const barcodeValue = previewProduct.barcode || previewProduct.code;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:bg-white print:p-0 print:relative print:z-auto print:block"
      dir="rtl"
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .main-app-layout-wrapper { display: none !important; }
          .print-container {
            position: relative !important;


            width: 100%;
          }
          ${selectedFormat.css}
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col print:shadow-none print:w-full print:h-auto print:max-w-none print:max-h-none print:overflow-visible print:p-0 print:m-0 print:bg-transparent"
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 print:hidden">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-500" />
            چاپ لیبل قیمت
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto print:hidden">
          <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Layout className="w-4 h-4 text-slate-500" />
              تنظیمات چاپ
            </h4>
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center justify-between flex-1">
                  <span className="text-sm font-bold text-slate-600">فرمت چاپ:</span>
                  <select
                    value={formatId}
                    onChange={(e) => handleFormatChange(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                  >
                    {PRINT_FORMATS.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between flex-1">
                  <span className="text-sm font-bold text-slate-600">تعداد لیبل:</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setLabelCount(Math.max(1, labelCount - 1))}
                      className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-bold text-lg w-8 text-center">{labelCount}</span>
                    <button
                      onClick={() => setLabelCount(labelCount + 1)}
                      className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 pt-4 border-t border-slate-100">
                
              <div className="flex flex-col gap-2 sm:col-span-2">
                  <label className="text-sm font-bold text-slate-600">قالب چاپ</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={printLayout === 'a4'} onChange={() => setPrintLayout('a4')} className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm text-slate-700">کاغذ A4 (لیبل شیت)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={printLayout === 'thermal'} onChange={() => setPrintLayout('thermal')} className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm text-slate-700">لیبل پرینتر حرارتی (50x30)</span>
                    </label>
                  </div>
              </div>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-bold text-slate-600">نمایش نام کالا</span>
                    <input type="checkbox" checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                  </label>
                  {showTitle && (
                    <div className="flex items-center justify-between pl-4">
                      <span className="text-xs text-slate-500">سایز فونت نام:</span>
                      <input type="range" min="8" max="18" value={titleFontSize} onChange={(e) => setTitleFontSize(Number(e.target.value))} className="w-24" />
                      <span className="text-xs font-mono w-4 text-left">{titleFontSize}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-bold text-slate-600">نمایش قیمت</span>
                    <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                  </label>
                  {showPrice && (
                    <div className="flex items-center justify-between pl-4">
                      <span className="text-xs text-slate-500">سایز فونت قیمت:</span>
                      <input type="range" min="8" max="24" value={priceFontSize} onChange={(e) => setPriceFontSize(Number(e.target.value))} className="w-24" />
                      <span className="text-xs font-mono w-4 text-left">{priceFontSize}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between sm:col-span-2 pl-4">
                  <span className="text-xs font-bold text-slate-600">اندازه بارکد (%):</span>
                  <input type="range" min="50" max="150" value={barcodeScale} onChange={(e) => setBarcodeScale(Number(e.target.value))} className="flex-1 mx-4" />
                  <span className="text-xs font-mono w-8 text-left">{barcodeScale}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 p-4 rounded-xl shadow-sm text-center w-full max-w-xs mx-auto bg-white flex flex-col justify-center items-center">
            {showTitle && (
              <div className="font-extrabold text-slate-900 mb-2 truncate px-2 w-full" style={{ fontSize: `${titleFontSize}px` }}>
                {previewProduct.name}
              </div>
            )}
            <div className="flex justify-center my-2 text-center w-full overflow-hidden" style={{ transform: `scale(${barcodeScale / 100})`, marginTop: showTitle ? '0' : '8px', marginBottom: showPrice ? '0' : '8px' }}>
              {barcodeValue ? (
                <Barcode
                  value={barcodeValue}
                  format="CODE128"
                  width={1.5}
                  height={40}
                  fontSize={12}
                  textMargin={2}
                  margin={0}
                  background="#ffffff"
                  lineColor="#000000"
                />
              ) : (
                <div className="py-6 text-slate-400 text-xs font-bold bg-slate-50 rounded-lg w-full border border-slate-100">
                  بدون کد/بارکد
                </div>
              )}
            </div>
            {showPrice && (
              <div className="font-black text-indigo-700 flex justify-between w-full mt-2 px-1" style={{ fontSize: `${priceFontSize}px` }}>
                <span>قیمت:</span>
                <span>
                  {formatNumber(previewProduct.price)} {storeSettings?.currency || "تومان"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Print Layout */}
        <style>{printLayout === 'thermal' ? `@media print { @page { size: 50mm 30mm; margin: 0; } body { margin: 0; } }` : `@media print { @page { size: A4; margin: 10mm; } }`}</style>
        <div className={`hidden print:grid ${printLayout === 'a4' ? 'print:grid-cols-4 print:gap-4 print:p-4' : 'print:grid-cols-1 print:w-[50mm] print:gap-1'} print-section`} dir="rtl">
          
          {targetProducts.map((prod, pIdx) => {
            const bVal = prod.barcode || prod.code;
            return Array.from({ length: labelCount }).map((_, index) => (
            <div key={`${pIdx}-${index}`} className={`label-item border border-black p-2 bg-white flex flex-col justify-center items-center overflow-hidden box-border ${printLayout === 'a4' ? 'rounded-lg w-full h-[120px]' : 'w-[50mm] h-[30mm]'}`}>
              <div 
                className="font-bold text-black mb-1 truncate px-1 w-full text-center leading-tight"
                style={{ fontSize: `12px` }}
              >
                {storeSettings?.storeName || 'فروشگاه'}
              </div>
              {showTitle && (
                <div 
                  className="font-bold text-black mb-1 truncate px-1 w-full text-center leading-tight"
                  style={{ fontSize: `${titleFontSize}px` }}
                >
                  {prod.name}
                </div>
              )}
              <div 
                className="flex justify-center text-center items-center overflow-hidden origin-top"
                style={{ transform: `scale(${barcodeScale / 100})`, marginTop: showTitle ? '0' : '4px', marginBottom: showPrice ? '0' : '4px' }}
              >
                {bVal ? (
                  <Barcode
                    value={bVal}
                    format="CODE128"
                    width={1.5}
                    height={35}
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
              {showPrice && (
                <div 
                  className="font-black text-black w-full text-center mt-1"
                  style={{ fontSize: `${priceFontSize}px` }}
                >
                  {formatNumber(prod.price)} {storeSettings?.currency || "تومان"}
                </div>
              )}
            </div>
          ))
          })}

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold transition-all shadow-sm cursor-pointer"
          >
            بستن
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            disabled={!barcodeValue}
          >
            <Printer className="w-4 h-4" />
            چاپ لیبل
          </button>
        </div>
      </motion.div>
    </div>
  );
}
