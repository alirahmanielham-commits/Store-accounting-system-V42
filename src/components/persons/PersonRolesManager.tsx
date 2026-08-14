import React, { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  ShieldAlert,
  Palette,
  Check,
  AlertTriangle,
  RotateCw,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  getPersonRoles,
  addPersonRole,
  updatePersonRole,
  deletePersonRole,
  getPersons,
  updatePerson,
} from "../../services/dataService";
import { Person, PersonRole } from "../../types";

interface PersonRolesManagerProps {
  showNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

const colorPresets = [
  { value: "bg-emerald-50 text-emerald-800 border-emerald-150", label: "سبز زمردی", dot: "bg-emerald-500" },
  { value: "bg-orange-50 text-orange-850 border-orange-150", label: "نارنجی", dot: "bg-orange-500" },
  { value: "bg-purple-50 text-purple-800 border-purple-150", label: "بنفش", dot: "bg-purple-500" },
  { value: "bg-indigo-50 text-indigo-800 border-indigo-150", label: "آبی نیلی", dot: "bg-indigo-500" },
  { value: "bg-rose-50 text-rose-800 border-rose-150", label: "قرمز سرخ", dot: "bg-rose-500" },
  { value: "bg-amber-50 text-amber-800 border-amber-150", label: "زرد کهربایی", dot: "bg-amber-500" },
  { value: "bg-cyan-50 text-cyan-800 border-cyan-150", label: "فیروزه‌ای", dot: "bg-cyan-500" },
  { value: "bg-slate-50 text-slate-800 border-slate-150", label: "خاکستری", dot: "bg-slate-500" },
];

export default function PersonRolesManager({ showNotification }: PersonRolesManagerProps) {
  const [roles, setRoles] = useState<PersonRole[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [roleColor, setRoleColor] = useState("bg-indigo-50 text-indigo-800 border-indigo-150");
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm State
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedRoles = await getPersonRoles();
      const fetchedPersons = await getPersons();
      setRoles(fetchedRoles || []);
      setPersons(fetchedPersons || []);
    } catch (error) {
      console.error("Error loading roles data", error);
      showNotification("خطا در بارگذاری اطلاعات نقش‌ها", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleCode("");
    setRoleColor("bg-indigo-50 text-indigo-800 border-indigo-150");
    setIsModalOpen(true);
  };

  const handleStartEdit = (role: PersonRole) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleCode(role.code || "");
    setRoleColor(role.color || "bg-indigo-50 text-indigo-800 border-indigo-150");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      showNotification("لطفاً نام نقش را وارد کنید", "error");
      return;
    }
    if (!roleCode.trim()) {
      showNotification("لطفاً کد معین نقش را وارد کنید", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (editingRoleId) {
        await updatePersonRole(editingRoleId, {
          name: roleName.trim(),
          code: roleCode.trim(),
          color: roleColor,
        });
        showNotification("نقش با موفقیت ویرایش شد", "success");
      } else {
        // Simple check for duplicate role ID or code
        const isDuplicate = roles.some((r) => r.id === roleName.trim() || r.code === roleCode.trim());
        if (isDuplicate) {
          showNotification("نقش یا کد معین وارد شده از قبل وجود دارد", "warning");
          setSubmitting(false);
          return;
        }

        // Generate a simple key-safe ID from English characters or Random id
        const roleId = Math.random().toString(36).substring(2, 9);
        await addPersonRole({
          id: roleId,
          name: roleName.trim(),
          code: roleCode.trim(),
          color: roleColor,
        });
        showNotification("نقش جدید با موفقیت ایجاد شد", "success");
      }

      // Reset Form and reload
      setRoleName("");
      setRoleCode("");
      setRoleColor("bg-indigo-50 text-indigo-800 border-indigo-150");
      setEditingRoleId(null);
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error saving role", error);
      showNotification("خطا در ذخیره‌سازی نقش", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsModalOpen(false);
    setEditingRoleId(null);
    setRoleName("");
    setRoleCode("");
    setRoleColor("bg-indigo-50 text-indigo-800 border-indigo-150");
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePersonRole(id);

      // Reset roles for persons affected
      const affectedPersons = (persons || []).filter((p) => p.role === id);
      let updatedCount = 0;
      for (const p of affectedPersons) {
        if (p.id) {
          await updatePerson(p.id as string, { ...p, role: "customer" }); // Fallback to customer
          updatedCount++;
        }
      }

      showNotification(
        `نقش با موفقیت حذف شد. ${updatedCount > 0 ? `${updatedCount} شخص به نقش پیش‌فرض (مشتری) منتقل شدند.` : ""}`,
        "success"
      );
      setDeletingRoleId(null);
      await loadData();
    } catch (error) {
      console.error("Error deleting role", error);
      showNotification("خطا در حذف نقش", "error");
    }
  };

  const getRoleMembersCount = (roleId: string) => {
    return (persons || []).filter((p) => p.role === roleId).length;
  };

  return (
    <div className="font-sans w-full" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Shield className="w-5 h-5" />
            </span>
            مدیریت نقش‌های اشخاص
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تعیین نقش‌های کاربری، تخصیص کدهای معین حسابداری و ویرایش قالب‌های رنگی نقش‌ها در نمای تمام‌صفحه
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            به‌روزرسانی
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-750 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Plus className="w-4 h-4" />
            افزودن نقش جدید
          </button>
        </div>
      </div>

      {loading && roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm w-full">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <Shield className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-xs font-bold text-slate-500 mt-4">در حال دریافت اطلاعات نقش‌ها...</p>
        </div>
      ) : (
        /* Full-Width Roles List Panel */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden w-full">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Shield className="w-4 h-4" />
              </span>
              لیست نقش‌های تعریف‌شده
            </h2>
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black">
              {roles.length} نقش فعال
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 bg-slate-50/30">
                  <th className="px-6 py-4 w-16">ردیف</th>
                  <th className="px-6 py-4">عنوان نقش (رنگ متمایز)</th>
                  <th className="px-6 py-4">کد معین حسابداری</th>
                  <th className="px-6 py-4 w-48">تعداد اعضای فعال</th>
                  <th className="px-6 py-4 w-60 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roles.map((role, index) => {
                  const membersCount = getRoleMembersCount(role.id);
                  const isPendingDelete = deletingRoleId === role.id;
                  const isDefaultRole = ["customer", "supplier", "employee"].includes(role.id);

                  return (
                    <tr
                      key={role.id}
                      className={`transition-all hover:bg-slate-50/40 ${
                        isPendingDelete ? "bg-rose-50/30" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-xs font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-black border ${role.color || "bg-indigo-50 text-indigo-800 border-indigo-150"}`}>
                          {role.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100/60 px-2.5 py-1 rounded-md border border-slate-100">
                          {role.code || "---"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold">
                          <strong>{membersCount}</strong> عضو فعال
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {isPendingDelete ? (
                            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-rose-100 shadow-sm animate-pulse">
                              <span className="text-[10px] font-bold text-rose-700 px-2.5 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                حذف قطعی شود؟
                              </span>
                              <button
                                onClick={() => handleDelete(role.id)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                              >
                                بله، حذف شود
                              </button>
                              <button
                                onClick={() => setDeletingRoleId(null)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                              >
                                انصراف
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(role)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                title="ویرایش نقش"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>ویرایش</span>
                              </button>
                              {!isDefaultRole && (
                                <button
                                  onClick={() => setDeletingRoleId(role.id)}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  title="حذف نقش"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>حذف</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Standard Modal for Add / Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelEdit}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col z-10"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <ShieldAlert className="w-4 h-4" />
                  </span>
                  <h2 className="text-sm font-black text-slate-800">
                    {editingRoleId ? "ویرایش اطلاعات نقش" : "ایجاد نقش جدید اشخاص"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer border border-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-2">عنوان نقش <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="مثال: بازاریاب، کارمند، نماینده توزیع..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-right"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-2">کد معین حسابداری <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    placeholder="مثال: 103، 201..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-right font-mono"
                    required
                  />
                  <p className="text-[10px] text-slate-450 mt-1.5 leading-relaxed">
                    کدینگ معین حسابداری جهت ثبت اسناد و رویدادهای مالی مربوط به اشخاص دارای این نقش مورد استفاده قرار می‌گیرد.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-2.5 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-indigo-500" />
                    رنگ و جلوه ظاهری متمایز
                  </label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setRoleColor(preset.value)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-[10px] font-black transition-all relative cursor-pointer ${
                          roleColor === preset.value
                            ? `${preset.value} border-2 border-indigo-600 scale-[1.03] shadow-sm`
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-350"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${preset.dot} mb-1.5`} />
                        {preset.label}
                        {roleColor === preset.value && (
                          <span className="absolute top-1 left-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm">
                            <Check className="w-2.5 h-2.5" strokeWidth={4} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="pt-4 border-t border-slate-100 bg-slate-50/40 p-4 rounded-xl border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">پیش‌نمایش نقش</label>
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm ${roleColor}`}>
                      {roleName || "عنوان نقش شما"}
                    </span>
                    <span className="text-xs text-slate-600 font-bold bg-white px-3 py-1 rounded-md border border-slate-100 font-mono">
                      کد معین: {roleCode || "---"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-750 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-md shadow-indigo-600/15 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{editingRoleId ? "ثبت تغییرات نقش" : "ایجاد و ذخیره نقش"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
