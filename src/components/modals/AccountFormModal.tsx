import React, { useState, useEffect } from "react";
import { startAppProcessing, stopAppProcessing } from "../../utils/processingHelper";
import { motion } from "motion/react";
import CurrencyInput from "../ui/CurrencyInput";
import { CreditCard, X, Check, Plus } from "lucide-react";
import { addAccount, updateAccount, addAccountingDocument, getLedgerAccounts, ensureLedgerAccount } from "../../services/dataService";

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccountId: any;
  accounts: any[];
  storeSettings?: any;
  onSuccess: () => void;
  showNotification: (msg: string, type?: 'success'|'error'|'info'|'warning') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
}

export default function AccountFormModal({
  isOpen,
  onClose,
  editingAccountId,
  accounts,
  storeSettings,
  onSuccess,
  showNotification,
  confirmAction
}: AccountFormModalProps) {
  const [newAccountBankName, setNewAccountBankName] = useState("");
  const [newAccountBranchName, setNewAccountBranchName] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newAccountCardNumber, setNewAccountCardNumber] = useState("");
  const [newAccountShebaNumber, setNewAccountShebaNumber] = useState("");
  const [newAccountHolder, setNewAccountHolder] = useState("");
  const [newAccountIsActive, setNewAccountStatus] = useState(true);
  const [newAccountBalance, setNewAccountBalance] = useState("");
  const [submittingAccount, setSubmittingAccount] = useState(false);

  const customAlert = (msg: string) => showNotification(msg, 'error');

  useEffect(() => {
    if (isOpen) {
      if (editingAccountId) {
        const acc = accounts.find(a => a.id === editingAccountId);
        if (acc) {
          setNewAccountBankName(acc.bankName || "");
          setNewAccountBranchName(acc.branch || "");
          setNewAccountNumber(acc.accountNumber || "");
          setNewAccountCardNumber(acc.cardNumber || "");
          setNewAccountShebaNumber(acc.shaba || "");
          setNewAccountHolder(acc.owner || "");
          setNewAccountStatus(acc.status !== false);
        }
      } else {
        setNewAccountBankName("");
        setNewAccountBranchName("");
        setNewAccountNumber("");
        setNewAccountCardNumber("");
        setNewAccountShebaNumber("");
        setNewAccountHolder("");
        setNewAccountStatus(true);
      }
    }
  }, [isOpen, editingAccountId, accounts]);

const handleSubmitAccount = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      try { e.preventDefault(); } catch (err) {}
    }
    if (!newAccountBankName) return;
    setSubmittingAccount(true); startAppProcessing('شروع فرآیند ثبت Account...');
    try {
      const isEdit = editingAccountId !== null;
      const payload = {
        bankName: newAccountBankName,
        branchName: newAccountBranchName,
        accountNumber: newAccountNumber,
        cardNumber: newAccountCardNumber,
        sheba: newAccountShebaNumber,
        shebaNumber: newAccountShebaNumber,
        initialBalance: Number(newAccountBalance) || 0,
        balance: Number(newAccountBalance) || 0,
        accountHolder: newAccountHolder,
      };

      let savedAccount;
      if (isEdit) {
        savedAccount = await updateAccount(editingAccountId.toString(), payload as any);
      } else {
        savedAccount = await addAccount(payload as any);
        
        if (payload.initialBalance > 0 && savedAccount?.accountingCode) {
           const accounts = await getLedgerAccounts();
           const openingBalanceTitle = "تراز افتتاحیه";
           let openingBalanceAcc = accounts.find(a => a.title === openingBalanceTitle);
           if (!openingBalanceAcc) {
              const newAccCode = '3999';
              await ensureLedgerAccount({ accountingCode: newAccCode }, '3', newAccCode, openingBalanceTitle, openingBalanceTitle, 'credit');
              const updatedAccs = await getLedgerAccounts();
              openingBalanceAcc = updatedAccs.find(a => a.title === openingBalanceTitle);
           }
           
           const bankAcc = (await getLedgerAccounts()).find(a => a.code === savedAccount.accountingCode);
           if (bankAcc && openingBalanceAcc) {
              await addAccountingDocument({
                  date: new Date().toISOString().split('T')[0],
                  description: `ثبت موجودی اولیه حساب بانکی ${savedAccount.bankName}`,
                  status: "approved",
                  sourceType: "manual",
                  items: [
                     {
                        ledgerAccountId: String(bankAcc.id),
                        detailedAccountId: "",
                        description: "موجودی اولیه حساب",
                        debit: payload.initialBalance,
                        credit: 0
                     },
                     {
                        ledgerAccountId: String(openingBalanceAcc.id),
                        detailedAccountId: "",
                        description: "تراز افتتاحیه",
                        debit: 0,
                        credit: payload.initialBalance
                     }
                  ]
              });
           }
        }
      }

      await onSuccess();
      setNewAccountBankName("");
      setNewAccountBranchName("");
      setNewAccountNumber("");
      setNewAccountCardNumber("");
      setNewAccountShebaNumber("");
      setNewAccountBalance("");
      setNewAccountHolder("");
      
      onClose();
      showNotification(
        isEdit
          ? "حساب بانکی با موفقیت ویرایش شد"
          : "حساب بانکی با موفقیت ثبت شد",
      );
    } catch (error) {
      console.error("Error saving account", error);
    } finally {
      setSubmittingAccount(false); stopAppProcessing();
    }
  };

  

  if (!isOpen) return null;

  return (
<div key="isAccountModalOpen-modal"
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
                  dir="rtl"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white md:rounded-2xl shadow-xl md:border border-gray-100 overflow-hidden w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] flex flex-col"
                  >
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-500" />
                        ثبت حساب بانکی جدید
                      </h3>
                      <button
                        onClick={() => onClose()}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form
                      id="accountForm"
                      onSubmit={(e) => {
                        e.preventDefault();
                        confirmAction(
                          "آیا از ثبت حساب بانکی اطمینان دارید؟",
                          () => handleSubmitAccount(e as any),
                        );
                      }}
                      className="flex flex-col flex-1 overflow-hidden"
                    >
                      <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-right">
                          <div className="w-full text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              نام بانک <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newAccountBankName}
                              onChange={(e) =>
                                setNewAccountBankName(e.target.value)
                              }
                              placeholder="مثال: بانک ملی، بانک ملت"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-900"
                              required
                            />
                          </div>

                          <div className="w-full text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              نام صاحب حساب{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newAccountHolder}
                              onChange={(e) =>
                                setNewAccountHolder(e.target.value)
                              }
                              placeholder="مثال: علی محمدی"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-900"
                              required
                            />
                          </div>

                          <div className="w-full text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              شماره حساب
                            </label>
                            <input
                              type="text"
                              value={newAccountNumber}
                              onChange={(e) =>
                                setNewAccountNumber(e.target.value)
                              }
                              placeholder="مثال: 0102030405"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-900 text-left"
                              dir="ltr"
                            />
                          </div>

                          <div className="w-full text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              شماره کارت
                            </label>
                            <input
                              type="text"
                              value={newAccountCardNumber}
                              onChange={(e) =>
                                setNewAccountCardNumber(e.target.value)
                              }
                              placeholder="16 رقمی"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-900 text-left"
                              dir="ltr"
                            />
                          </div>

                          <div className="w-full text-right md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              شماره شبا (IBAN)
                            </label>
                            <input
                              type="text"
                              value={newAccountShebaNumber}
                              onChange={(e) =>
                                setNewAccountShebaNumber(e.target.value)
                              }
                              placeholder="مثال: IR12017000000000..."
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-900 text-left"
                              dir="ltr"
                            />
                          </div>

                          <div className="w-full text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              نام شعبه
                            </label>
                            <input
                              type="text"
                              value={newAccountBranchName}
                              onChange={(e) =>
                                setNewAccountBranchName(e.target.value)
                              }
                              placeholder="مثال: شعبه مرکزی"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-900"
                            />
                          </div>

                          <div className="w-full text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              موجودی اولیه ({storeSettings?.currency || "تومان"})
                            </label>
                            <CurrencyInput
                              value={newAccountBalance}
                              onChange={(e: any) =>
                                setNewAccountBalance(e.target.value)
                              }
                              placeholder="0"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-900 text-left"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 mt-auto">
                        <button
                          type="button"
                          onClick={() => onClose()}
                          className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors shadow-sm"
                        >
                          انصراف
                        </button>
                        <button
                          type="submit"
                          disabled={submittingAccount}
                          className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {submittingAccount ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                repeat: Infinity,
                                duration: 1,
                                ease: "linear",
                              }}
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                            />
                          ) : (
                            <Plus className="w-5 h-5" />
                          )}
                          <span>ثبت حساب</span>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
  );
}
