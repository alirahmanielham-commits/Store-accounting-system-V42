import React, { useState, useEffect } from "react";
import { startAppProcessing, stopAppProcessing } from "../../utils/processingHelper";
import { motion } from "motion/react";
import { Store, X, Check, Plus, Box } from "lucide-react";
import { addWarehouse, updateWarehouse } from "../../services/dataService";

interface WarehouseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWarehouseId: any;
  warehouses: any[];
  storeSettings?: any;
  onSuccess: () => void;
  showNotification: (msg: string, type?: 'success'|'error'|'info'|'warning') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
}

export default function WarehouseFormModal({
  isOpen,
  onClose,
  editingWarehouseId,
  warehouses,
  storeSettings,
  onSuccess,
  showNotification,
  confirmAction
}: WarehouseFormModalProps) {
  const [newWarehouseName, setNewWarehouseName] = useState("");
  const [newWarehouseManager, setNewWarehouseManager] = useState("");
  const [newWarehouseLocation, setNewWarehouseLocation] = useState("");
  const [newWarehouseIsActive, setNewWarehouseIsActive] = useState(true);
  const [newWarehouseStatus, setNewWarehouseStatus] = useState(true);
  const [submittingWarehouse, setSubmittingWarehouse] = useState(false);

  const customAlert = (msg: string) => showNotification(msg, 'error');

  useEffect(() => {
    if (isOpen) {
      if (editingWarehouseId) {
        const wh = warehouses.find(w => w.id === editingWarehouseId);
        if (wh) {
          setNewWarehouseName(wh.name || "");
          setNewWarehouseManager(wh.manager || "");
          setNewWarehouseLocation(wh.location || "");
          setNewWarehouseStatus(wh.status !== false);
        }
      } else {
        setNewWarehouseName("");
        setNewWarehouseManager("");
        setNewWarehouseLocation("");
        setNewWarehouseStatus(true);
      }
    }
  }, [isOpen, editingWarehouseId, warehouses]);

const handleSubmitWarehouse = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      try { e.preventDefault(); } catch (err) {}
    }
    if (!newWarehouseName) return;
    setSubmittingWarehouse(true); startAppProcessing('شروع فرآیند ثبت Warehouse...');
    try {
      const isEdit = editingWarehouseId !== null;
      const payload = {
        name: newWarehouseName,
        manager: newWarehouseManager,
        location: newWarehouseLocation,
        isActive: newWarehouseIsActive,
      };

      if (isEdit) {
        await updateWarehouse(editingWarehouseId.toString(), payload as any);
      } else {
        await addWarehouse(payload as any);
      }

      await onSuccess();
      setNewWarehouseName("");
      setNewWarehouseManager("");
      setNewWarehouseLocation("");
      setNewWarehouseIsActive(true);
      
      onClose();
      showNotification(
        isEdit ? "انبار با موفقیت ویرایش شد" : "انبار با موفقیت ثبت شد",
      );
    } catch (error) {
      console.error("Error saving warehouse", error);
      showNotification("خطا در ثبت انبار");
    } finally {
      setSubmittingWarehouse(false); stopAppProcessing();
    }
  };

  

  if (!isOpen) return null;

  return (
<div key="isWarehouseModalOpen-modal"
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
                  dir="rtl"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full max-w-md max-h-[90vh] flex flex-col"
                  >
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Box className="w-5 h-5 text-indigo-500" />
                        ثبت انبار جدید
                      </h3>
                      <button
                        onClick={() => onClose()}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                      <form
                        id="warehouseForm"
                        onSubmit={(e) => {
                          e.preventDefault();
                          confirmAction("آیا از ثبت انبار اطمینان دارید؟", () =>
                            handleSubmitWarehouse(e as any),
                          );
                        }}
                        className="flex flex-col gap-5"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="w-full text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              نام انبار <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newWarehouseName}
                              onChange={(e) =>
                                setNewWarehouseName(e.target.value)
                              }
                              placeholder="مثال: انبار مرکزی"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-900"
                              required
                            />
                          </div>

                          <div className="w-full text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              مسئول انبار (انباردار)
                            </label>
                            <input
                              type="text"
                              value={newWarehouseManager}
                              onChange={(e) =>
                                setNewWarehouseManager(e.target.value)
                              }
                              placeholder="مثال: علی احمدی"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-900"
                            />
                          </div>

                          <div className="w-full text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              موقعیت مکانی یا آدرس
                            </label>
                            <input
                              type="text"
                              value={newWarehouseLocation}
                              onChange={(e) =>
                                setNewWarehouseLocation(e.target.value)
                              }
                              placeholder="مثال: سوله‌ی شماره ۲"
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-900"
                            />
                          </div>

                          <div className="w-full text-right flex items-center justify-between border border-gray-100 p-4 rounded-xl mt-2 bg-slate-50">
                            <label
                              className="text-sm font-bold text-gray-700 cursor-pointer select-none"
                              onClick={() =>
                                setNewWarehouseIsActive(!newWarehouseIsActive)
                              }
                            >
                              وضعیت انبار (فعال / غیرفعال)
                            </label>
                            <div
                              className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors flex items-center ${newWarehouseIsActive ? "bg-emerald-500" : "bg-gray-300"}`}
                              onClick={() =>
                                setNewWarehouseIsActive(!newWarehouseIsActive)
                              }
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${newWarehouseIsActive ? "-translate-x-[24px]" : "translate-x-0"}`}
                              />
                            </div>
                          </div>
                        </div>
                      </form>
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
                        form="warehouseForm"
                        disabled={submittingWarehouse}
                        className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {submittingWarehouse ? (
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
                        {editingWarehouseId ? "ذخیره انبار" : "ثبت انبار"}
                      </button>
                    </div>
                  </motion.div>
                </div>
              

  );
}
