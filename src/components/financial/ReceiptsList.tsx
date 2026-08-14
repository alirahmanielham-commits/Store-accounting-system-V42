import React, { useState } from 'react';
import { motion } from 'motion/react';
import * as lucide from 'lucide-react';
const { Search, Plus, Filter, FileText, Download, CheckCircle, Edit2, Trash2, Printer, Check, X, ArrowUpRight, ArrowDownRight, ArrowRight, CornerDownLeft, Package, User, Clock, CheckCircle2, ChevronLeft, ChevronRight, Share2, Eye, Truck, MoreVertical, DollarSign, RefreshCw, XCircle, List } = lucide as any;

export default function ReceiptsList(props: any) {
  const {
    transactions, activeTab, persons, getPersonDisplayName, formatCurrency, formatDateDisplay, setViewingTransaction,
    renderPersonLink, storeSettings, setActiveTab, invoiceSearchQuery, setInvoiceSearchQuery, toPersianDigits, accounts, cashboxes, formatNumber, numToPersianWords, openPayslip, setPrintingTransaction, setEditingReceipt, setIsEditReceiptModalOpen, confirmAction, deleteTransaction, fetchTransactions, setPreviewReceiptData,
    ...rest
  } = props;

  const targetType = activeTab === "list_pay_receipt" ? "pay" : "receive";

  const filteredTxs = (transactions || []).filter((tx: any) => {
    if (tx.type !== targetType) return false;

    if (!invoiceSearchQuery) return true;
    const term = invoiceSearchQuery.toLowerCase();
    const personName = (
      persons.find((p: any) => p.id.toString() === tx.personId?.toString())?.name || "نامشخص"
    ).toLowerCase();
    const receiptNum = (
      tx.receiptNumber || `#${tx.id}`
    ).toLowerCase();
    return personName.includes(term) || receiptNum.includes(term);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-right pb-24 md:pb-6"
    >
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-200 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between md:justify-start gap-4">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <List className="w-6 h-6 text-slate-600" />
              {targetType === "receive" ? "لیست رسیدهای دریافت" : "لیست رسیدهای پرداخت"}
            </h2>
            <div className="flex gap-2">
              {targetType === "receive" && (
              <button
                onClick={() => setActiveTab?.("create_receive_receipt")}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                ثبت دریافت جدید
              </button>
              )}
              {targetType === "pay" && (
              <button
                onClick={() => setActiveTab?.("create_pay_receipt")}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                ثبت پرداخت جدید
              </button>
              )}
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 opacity-50 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در نام شخص، شماره رسید و..."
              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-slate-500 text-sm font-medium transition-all"
              value={invoiceSearchQuery}
              onChange={(e) => setInvoiceSearchQuery(e.target.value)}
            />
            {invoiceSearchQuery && (
              <button
                onClick={() => setInvoiceSearchQuery("")}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {filteredTxs.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <span className="text-slate-400 font-bold text-sm">هیچ رسیدی یافت نشد.</span>
          </div>
        ) : (
          filteredTxs.map((tx: any) => {
            const isRec = tx.type === "receive";
            const person = persons.find((p: any) => p.id.toString() === tx.personId?.toString());
            const resourceLabel =
              tx.method === "check"
                ? `چک (${toPersianDigits(tx.checkNumber || "")})`
                : tx.resourceType === "bank"
                  ? `حساب: ${accounts.find((a: any) => a.id.toString() === tx.resourceId?.toString())?.bankName || "نامشخص"}`
                  : `صندوق: ${cashboxes.find((cb: any) => cb.id.toString() === tx.resourceId?.toString())?.name || "نامشخص"}`;
            
            return (
              <div key={tx.id} className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${isRec ? "border-l-emerald-500 border-y-slate-200 border-r-slate-200" : "border-l-rose-500 border-y-slate-200 border-r-slate-200"} flex flex-col gap-3 relative`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-800 text-sm mb-1">{renderPersonLink(person?.id, person?.name)}</div>
                    <div className="text-xs text-slate-500 font-sans font-medium">{formatDateDisplay(tx.date || tx.jalaliDate)}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-[10px] font-black ${isRec ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {isRec ? "دریافت" : "پرداخت"}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <div className="flex flex-col">
                     <span className="text-[10px] text-slate-400 font-bold mb-0.5">مبلغ</span>
                     <span className="font-black text-slate-900 font-sans text-sm">{toPersianDigits(formatNumber(tx.amount))} {storeSettings.currency}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 font-bold mb-0.5 block">شماره رسید</span>
                    <span 
                      onClick={() => tx.type === "salary" ? openPayslip(tx) : setPrintingTransaction(tx)}
                      className="text-indigo-600 font-bold text-xs cursor-pointer font-sans"
                    >
                      {toPersianDigits(tx.receiptNumber) || `#${toPersianDigits(tx.id)}`}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-1">
                  <span className="font-bold ml-1 text-slate-500">منبع:</span> 
                  {resourceLabel}
                  {tx.note && <div className="text-[10px] text-slate-500 mt-1">{tx.note}</div>}
                </div>

                <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (tx.type === "salary") openPayslip(tx);
                      else setPrintingTransaction(tx);
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    چاپ
                  </button>
                  <button
                    onClick={() => {
                      setEditingReceipt(tx);
                      setIsEditReceiptModalOpen(true);
                    }}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 bg-indigo-50/50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      confirmAction(
                        "حذف این مورد غیرقابل بازگشت است.",
                        () => deleteTransaction(tx.id.toString()).then(fetchTransactions),
                      )
                    }
                    className="p-2 text-rose-600 hover:bg-rose-50 bg-rose-50/50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-white rounded-3xl p-6 shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b-2 border-slate-100">
                <th className="p-4 font-black">شماره رسید</th>
                <th className="p-4 font-black">نوع</th>
                <th className="p-4 font-black">طرف حساب</th>
                <th className="p-4 font-black">تاریخ سند</th>
                <th className="p-4 font-black">منبع مالی</th>
                <th className="p-4 font-black">مبلغ تراکنش</th>
                <th className="p-4 font-black text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    هیچ رسیدی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx: any) => {
                  const isRec = tx.type === "receive";
                  const person = persons.find((p: any) => p.id.toString() === tx.personId?.toString());
                  const resourceLabel =
                    tx.method === "check"
                      ? `چک (${toPersianDigits(tx.checkNumber || "")})`
                      : tx.resourceType === "bank"
                        ? `حساب بانکی: ${accounts.find((a: any) => a.id.toString() === tx.resourceId?.toString())?.bankName || "نامشخص"}`
                        : `صندوق: ${cashboxes.find((cb: any) => cb.id.toString() === tx.resourceId?.toString())?.name || "نامشخص"}`;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-sans font-bold text-sm text-indigo-600 whitespace-nowrap">
                        <span
                          onClick={() => tx.type === "salary" ? openPayslip(tx) : setPrintingTransaction(tx)}
                          className="cursor-pointer hover:text-indigo-800 hover:underline transition-colors decoration-dashed underline-offset-4"
                        >
                          {toPersianDigits(tx.receiptNumber) || `#${toPersianDigits(tx.id)}`}
                        </span>
                      </td>
                      <td className="p-4 font-bold">
                        <span className={`px-2 py-1 rounded text-xs ${isRec ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          {isRec ? "دریافت" : "پرداخت"}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {renderPersonLink(person?.id, person?.name)}
                      </td>
                      <td className="p-4 font-sans text-slate-600 font-bold text-xs">
                        {formatDateDisplay(tx.date || tx.jalaliDate)}
                      </td>
                      <td className="p-4 text-xs font-black text-slate-600 text-right">
                        <div>{resourceLabel}</div>
                        {tx.note && <div className="text-[10px] text-gray-500 mt-1 font-normal opacity-80">{tx.note}</div>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-sans font-black text-slate-900 text-sm">
                          {toPersianDigits(formatNumber(tx.amount))} {storeSettings.currency}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                          {numToPersianWords(tx.amount)} {storeSettings.currency}
                        </div>
                      </td>
                      <td className="p-4 text-center flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (tx.type === "salary") openPayslip(tx);
                            else setPrintingTransaction(tx);
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> چاپ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReceipt(tx);
                            setIsEditReceiptModalOpen(true);
                          }}
                          className="p-2 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            confirmAction(
                              "حذف این مورد غیرقابل بازگشت است.",
                              () => deleteTransaction(tx.id.toString()).then(fetchTransactions),
                            )
                          }
                          className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
