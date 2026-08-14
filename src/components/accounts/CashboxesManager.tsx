import React from "react";
import { motion } from "framer-motion";
import { Wallet, Plus, CheckCircle, Database, Edit2, Trash2 } from "lucide-react";

export default function CashboxesManager(props: any) {
  const {
    setEditingCashboxId,
    setNewCashboxName,
    setNewCashboxManager,
    setNewCashboxBalance,
    setIsCashboxModalOpen,
    successMsg,
    cashboxes,
    formatNumber,
    handleEditCashbox,
    confirmAction,
    handleDeleteCashbox,
    toPersianDigits,
    storeSettings
  } = props;

  return (
    <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <div className="bg-gradient-to-l from-indigo-50 to-white px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                          <Wallet className="w-6 h-6 text-indigo-600" />
                          مدیریت صندوق‌ها و تنخواه
                        </h1>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                          مدیریت صندوق‌های نقدی درون‌سازمانی و تنخواه‌گردان‌ها
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingCashboxId(null);
                          setIsCashboxModalOpen(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        ثبت صندوق جدید
                      </button>
                    </div>

                    {successMsg && (
                      <div className="mx-6 mt-6 bg-green-50 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 border border-green-100">
                        <CheckCircle className="w-5 h-5" />
                        {successMsg}
                      </div>
                    )}

                    <div className="p-0 overflow-x-auto">
                      {(!cashboxes || cashboxes.length === 0) ? (
                        <div className="py-12 text-center text-gray-500 font-medium">
                          هیچ صندوق یا تنخواه‌گردانی ثبت نشده است. برای شروع یک
                          مورد جدید ثبت کنید.
                        </div>
                      ) : (
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                              <th className="py-4 px-6 font-semibold">ردیف</th>
                              <th className="py-4 px-6 font-semibold">
                                نام صندوق / تنخواه
                              </th>
                              <th className="py-4 px-6 font-semibold">
                                مسئول صندوق
                              </th>
                              <th className="py-4 px-6 font-semibold">
                                شماره حساب
                              </th>
                              <th className="py-4 px-6 font-semibold">
                                موجودی فعلی ({storeSettings?.currency || "تومان"})
                              </th>
                              <th className="py-4 px-6 font-semibold text-center w-24">
                                عملیات
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {(cashboxes || []).map((box, index) => (
                              <tr
                                key={box.id ? `box-${box.id}` : `box-idx-${index}`}
                                className="hover:bg-gray-50/50 transition-colors text-gray-700"
                              >
                                <td className="py-4 px-6 font-medium text-gray-400">
                                  {index + 1}
                                </td>
                                <td className="py-4 px-6 font-semibold text-gray-950">
                                  <span className="flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-indigo-500" />
                                    {box.name}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-sm">
                                  {box.manager || "نامشخص"}
                                </td>
                                <td className="py-4 px-6 text-sm font-mono text-left" dir="ltr">
                                  {box.accountNumber || "-"}
                                </td>
                                <td
                                  className="py-4 px-6 text-sm font-semibold text-teal-600 font-mono text-left"
                                  dir="ltr"
                                >
                                  {formatNumber(box.balance)}{" "}
                                  <span className="text-xs font-normal font-sans ml-1">
                                    {storeSettings.currency}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleEditCashbox(box)}
                                      className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors inline-block"
                                      title="ویرایش صندوق"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        confirmAction(
  "آیا از حذف این صندوق اطمینان دارید؟",
  () => handleDeleteCashbox(box.id),
  <div className="flex flex-col gap-2">
    <div><strong>نام صندوق:</strong> {box.name}</div>
  </div>
)}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-block"
                                      title="حذف صندوق"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </motion.div>
  );
}