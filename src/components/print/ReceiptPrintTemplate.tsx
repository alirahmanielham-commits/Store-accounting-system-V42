import React from 'react';
import { toPersianDigits, formatDateDisplay, numToPersianWords } from '../../utils/format';

export default function ReceiptPrintTemplate({ data, storeSettings, persons, getPersonDisplayName, formatCurrency }: any) {
  if (!data) return null;
  const isReceive = data.type === 'receive';
  
  let formattedDate = '';
  try {
    formattedDate = toPersianDigits(formatDateDisplay(data.date, storeSettings?.calendarType));
  } catch (e) {
    formattedDate = toPersianDigits(formatDateDisplay(data.date, storeSettings?.calendarType));
  }

  const amountStr = toPersianDigits(formatCurrency(data.amount));
  const amountWords = numToPersianWords(data.amount);
  const currency = storeSettings?.currency || 'ریال';
  const docTitle = isReceive ? 'رسید دریافت وجه' : 'رسید پرداخت وجه';

  return (
    <>
    <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A5 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-border { border: 2px solid #0f172a !important; padding: 2px !important; }
          .print-inner-border { border: 1px solid #0f172a !important; }
        }
      `}} />
    <div className="w-full bg-white text-slate-800 font-sans mx-auto max-w-5xl print:max-w-none print:m-0" dir="rtl">
      
      {/* Outer Border for Official Look */}
      <div className="print-border border-4 border-double border-slate-800 p-1 m-4 print:m-0 rounded-sm bg-white">
        <div className="print-inner-border border-2 border-slate-800 rounded-sm p-6 min-h-[11cm] p-4 print:p-2 flex flex-col relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
            <div className="w-1/3 flex flex-col gap-2">
              <h1 className="text-xl font-black text-slate-900 bg-white inline-block px-2">{storeSettings?.storeName || 'نام مجموعه'}</h1>
              {storeSettings?.phone && (
                <p className="text-slate-800 font-bold text-sm bg-white inline-block px-2">تلفن: {toPersianDigits(storeSettings.phone)}</p>
              )}
              {storeSettings?.address && (
                <p className="text-slate-700 text-sm leading-relaxed bg-white inline-block px-2">{storeSettings.address}</p>
              )}
            </div>
            
            <div className="w-1/3 text-center flex flex-col items-center justify-center pt-2">
              <div className="inline-block border-2 border-slate-800 rounded-lg px-8 py-3 bg-white shadow-sm">
                 <h2 className="text-xl font-black text-slate-900 tracking-tight">
                   {docTitle}
                 </h2>
              </div>
            </div>

            <div className="w-1/3 flex justify-end pl-2">
              <div className="inline-block border-2 border-slate-800 rounded-lg p-3 text-right bg-white shadow-sm w-48">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-700 font-bold text-sm">شماره:</span>
                  <span className="font-black text-slate-900 text-base">{toPersianDigits(data.receiptNumber || data.id)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-bold text-sm">تاریخ:</span>
                  <span className="font-black text-slate-900 text-base">{formattedDate}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Body */}
          <div className="flex-1 space-y-5 print:space-y-4 bg-white/90 p-4 rounded-xl border border-slate-200 shadow-sm relative z-10">
            <div className="flex flex-wrap items-center gap-y-2 gap-x-2 text-base print:text-sm">
              <span className="font-bold text-slate-800 shrink-0">{isReceive ? 'مبلغ' : 'مبلغ'}</span>
              <span className="font-black text-base print:text-sm border-b-2 border-dotted border-slate-800 pb-1 px-4 inline-block font-mono tracking-wider">
                {amountStr} <span className="text-base font-bold text-slate-600 mr-1">{currency}</span>
              </span>
              <span className="font-bold text-slate-800 shrink-0 mr-2">معادل حروف:</span>
              <span className="font-black text-base print:text-sm border-b-2 border-dotted border-slate-800 pb-1 flex-1 px-2 text-center">
                {amountWords} {currency}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-2 text-base print:text-sm">
              <span className="font-bold text-slate-800 shrink-0">{isReceive ? 'از جناب آقای / سرکار خانم / شرکت :' : 'به جناب آقای / سرکار خانم / شرکت :'}</span>
              <span className="font-black text-base print:text-sm border-b-2 border-dotted border-slate-800 pb-1 flex-1 px-4">
                {getPersonDisplayName(persons?.find((p: any) => p.id?.toString() === data.personId?.toString()))}
              </span>
            </div>

            <div className="flex flex-wrap items-start gap-y-2 gap-x-2 text-base print:text-sm">
              <span className="font-bold text-slate-800 shrink-0 pt-1">بابت :</span>
              <span className="font-bold text-slate-900 border-b-2 border-dotted border-slate-800 pb-1 flex-1 px-4 min-h-[2.5rem] leading-loose break-words">
                {data.description || '..................................................................'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-2 text-base print:text-sm">
              <span className="font-bold text-slate-800 shrink-0">به صورت :</span>
              <span className="font-bold text-slate-900 border-b-2 border-dotted border-slate-800 pb-1 px-4 inline-block min-w-[200px] text-center">
                {data.method === 'cash' ? 'نقدی / فیش بانکی' : data.method === 'check' ? 'چک' : data.method === 'transfer' ? 'حواله' : 'کارت خوان'}
              </span>
              <span className="font-bold text-slate-800 shrink-0 mr-4">{isReceive ? 'دریافت گردید.' : 'پرداخت گردید.'}</span>
            </div>

            {data.method === 'check' && (
              <div className="flex items-center gap-4 text-base bg-slate-100 p-3 print:p-2 rounded-lg border border-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-bold">شماره چک:</span>
                  <span className="font-black text-base print:text-sm">{toPersianDigits(data.checkNumber)}</span>
                </div>
                <div className="h-6 w-px bg-slate-300 mx-2"></div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-bold">تاریخ سررسید:</span>
                  <span className="font-black text-base print:text-sm">{toPersianDigits(data.checkDueDate)}</span>
                </div>
                {data.checkBankName && (
                  <>
                    <div className="h-6 w-px bg-slate-300 mx-2"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 font-bold">عهده بانک:</span>
                      <span className="font-black text-base print:text-sm">{data.checkBankName}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="mt-8 print:mt-6 grid grid-cols-2 gap-12 px-12 text-center pb-8 z-10 relative bg-white">
            <div className="flex flex-col items-center">
              <div className="text-base font-bold text-slate-800 mb-12 print:mb-10 print:text-sm">{isReceive ? 'مهر و امضاء پرداخت کننده' : 'مهر و امضاء تایید کننده'}</div>
              <div className="w-48 border-t-2 border-dotted border-slate-800"></div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-base font-bold text-slate-800 mb-12 print:mb-10 print:text-sm">{isReceive ? 'مهر و امضاء دریافت کننده' : 'مهر و امضاء پرداخت کننده'}</div>
              <div className="w-48 border-t-2 border-dotted border-slate-800"></div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="absolute bottom-2 left-4 text-xs font-bold text-slate-400">
             صادر شده از سیستم حسابداری
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
