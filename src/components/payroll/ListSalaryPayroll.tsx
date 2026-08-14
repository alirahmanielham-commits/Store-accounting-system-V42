import React from "react";
import { motion } from "framer-motion";
import { 
    Wallet, Eye, DollarSign, User, CreditCard, Banknote, Plus, Trash2, Save, Calculator, Briefcase, CheckCircle, FileText, RefreshCw, Tag, AlertCircle, Package, ScanLine, Box, ArrowLeft, Minus, Edit2, Printer, Search, FileSpreadsheet
} from 'lucide-react';

export default function ListSalaryPayroll(props: any) {
  const {


    persons, storeSettings, formatCurrency, Trash2, confirmAction
  , transactions
  , List, toPersianDigits, renderPersonLink, formatDateDisplay, payslips, numToPersianWords, openPayslip, Eye, deleteTransaction, fetchTransactions
  } = props;

  const salaryTxs = (transactions || []).filter((t: any) => t.type === "salary");
  return (
    <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-right"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <List className="w-6 h-6 text-indigo-600" />
                فیش‌های حقوق و دستمزد پرسنل صادر شده
              </h2>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right divide-y divide-gray-150">
                  <thead>
                    <tr className="bg-gray-50 text-sm text-gray-500 border-b border-gray-100">
                      <th className="p-4 font-bold text-right">شماره فیش</th>
                      <th className="p-4 font-bold text-right">نام کارمند</th>
                      <th className="p-4 font-bold text-right">تاریخ فیش</th>
                      <th className="p-4 font-bold text-right">تسویه مستقیم</th>
                      <th className="p-4 font-bold text-right">حقوق خالص</th>
                      <th className="p-4 font-bold text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {salaryTxs.map((tx) => {
                      const person = persons.find(
                        (p) => p.id.toString() === tx.personId?.toString(),
                      );
                      const isDirectPay = tx.resourceType !== "none";
                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-4 font-mono font-bold text-indigo-600">
                            {tx.receiptNumber
                              ? toPersianDigits(tx.receiptNumber)
                              : `#${toPersianDigits(tx.id)}`}
                          </td>
                          <td className="p-4 font-bold text-gray-800">
                            {renderPersonLink(person?.id, person?.name)}
                          </td>
                          <td className="p-4 text-gray-500 text-right">
                            <div className="font-mono text-sm mb-1" dir="ltr">
                              {formatDateDisplay(
                                tx.date || tx.jalaliDate,
                              )}
                            </div>
                            {(() => {
                              try {
                                let parsed = payslips.find(p => String(p.transactionId) === String(tx.id));
                                if (!parsed && typeof tx.description === "string" && tx.description.includes("isPayslip")) {
                                    parsed = JSON.parse(tx.description);
                                }
                                if (
                                  parsed &&
                                  parsed.periodMonth &&
                                  parsed.periodYear
                                ) {
                                  const pMonthName = [
                                    "فروردین",
                                    "اردیبهشت",
                                    "خرداد",
                                    "تیر",
                                    "مرداد",
                                    "شهریور",
                                    "مهر",
                                    "آبان",
                                    "آذر",
                                    "دی",
                                    "بهمن",
                                    "اسفند",
                                  ][Number(parsed.periodMonth) - 1];
                                  return (
                                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                      {pMonthName} {parsed.periodYear}
                                    </span>
                                  );
                                }
                              } catch (e) {}
                              return null;
                            })()}
                          </td>
                          <td className="p-4 text-xs font-semibold text-gray-600 text-right">
                            {isDirectPay ? (
                              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg">
                                بله، تسویه شده
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg">
                                خیر، ثبت بدهی
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div
                              className="font-mono font-black text-indigo-950 text-sm"
                              dir="ltr"
                            >
                              {formatCurrency(tx.amount)}{" "}
                              {storeSettings.currency}
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold mt-0.5 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                              {numToPersianWords(tx.amount)}{" "}
                              {storeSettings.currency}
                            </div>
                          </td>
                          <td className="p-4 text-center flex items-center justify-center gap-2">
                            <button
                              onClick={() => openPayslip(tx)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 text-xs font-bold transition-all cursor-pointer border border-transparent bg-transparent"
                            >
                              <Eye className="w-4 h-4" /> مشاهده فیش حقوقی
                            </button>
                            <button
                              onClick={() =>
                                confirmAction(
                                  "حذف این فیش حقوقی غیرقابل بازگشت است.",
                                  () =>
                                    deleteTransaction(tx.id.toString()).then(
                                      fetchTransactions,
                                    ),
                                )
                              }
                              className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg cursor-pointer border-none bg-transparent"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {salaryTxs.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-gray-400 font-medium"
                        >
                          هیچ فیش حقوقی یافت نشد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
    </>
  );
}
