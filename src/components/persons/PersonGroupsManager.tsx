import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  FolderPlus,
  Palette,
  Check,
  AlertTriangle,
  RotateCw,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  getPersonGroups,
  addPersonGroup,
  updatePersonGroup,
  deletePersonGroup,
  getPersons,
  updatePerson,
} from "../../services/dataService";
import { Person, PersonGroup } from "../../types";

interface PersonGroupsManagerProps {
  showNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

const colorPresets = [
  { value: "indigo", label: "نیلی", bg: "bg-indigo-50", text: "text-indigo-850", border: "border-indigo-200", dot: "bg-indigo-500" },
  { value: "emerald", label: "زمردی", bg: "bg-emerald-50", text: "text-emerald-850", border: "border-emerald-200", dot: "bg-emerald-500" },
  { value: "rose", label: "سرخ", bg: "bg-rose-50", text: "text-rose-850", border: "border-rose-200", dot: "bg-rose-500" },
  { value: "amber", label: "کهربایی", bg: "bg-amber-50", text: "text-amber-850", border: "border-amber-200", dot: "bg-amber-500" },
  { value: "purple", label: "بنفش", bg: "bg-purple-50", text: "text-purple-850", border: "border-purple-200", dot: "bg-purple-500" },
  { value: "cyan", label: "فیروزه‌ای", bg: "bg-cyan-50", text: "text-cyan-850", border: "border-cyan-200", dot: "bg-cyan-500" },
  { value: "orange", label: "پرتقالی", bg: "bg-orange-50", text: "text-orange-850", border: "border-orange-200", dot: "bg-orange-500" },
  { value: "slate", label: "سنگی", bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200", dot: "bg-slate-500" },
];

export default function PersonGroupsManager({ showNotification }: PersonGroupsManagerProps) {
  const [groups, setGroups] = useState<PersonGroup[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupColor, setGroupColor] = useState("indigo");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupIcon, setGroupIcon] = useState("");
  const [groupParentId, setGroupParentId] = useState<string>("");
  const [groupSortOrder, setGroupSortOrder] = useState<number>(0);
  const [groupIsActive, setGroupIsActive] = useState<boolean>(true);

  const [submitting, setSubmitting] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  
  // Tree state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fetchedGroups, fetchedPersons] = await Promise.all([
        getPersonGroups(),
        getPersons(),
      ]);
      // Sort by sortOrder
      fetchedGroups.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      setGroups(fetchedGroups as any);
      setPersons(fetchedPersons as any);
      
      // Auto-expand top level
      const newExpanded = { ...expandedGroups };
      fetchedGroups.forEach((g: any) => {
          if (!g.parentId) newExpanded[g.id] = true;
      });
      setExpandedGroups(newExpanded);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      showNotification("خطا در دریافت اطلاعات", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (group: PersonGroup) => {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupColor(group.color || "indigo");
    setGroupDescription(group.description || "");
    setGroupIcon(group.icon || "");
    setGroupParentId(group.parentId || "");
    setGroupSortOrder(group.sortOrder || 0);
    setGroupIsActive(group.isActive !== undefined ? group.isActive : true);
    setIsModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingGroupId(null);
    setGroupName("");
    setGroupColor("indigo");
    setGroupDescription("");
    setGroupIcon("");
    setGroupParentId("");
    setGroupSortOrder(0);
    setGroupIsActive(true);
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showNotification("نام گروه الزامی است", "error");
      return;
    }
    
    // Prevent circular reference
    if (editingGroupId && groupParentId === editingGroupId) {
       showNotification("گروه نمی‌تواند زیرمجموعه خودش باشد", "error");
       return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: groupName,
        color: groupColor,
        description: groupDescription,
        icon: groupIcon,
        parentId: groupParentId || null,
        sortOrder: groupSortOrder,
        isActive: groupIsActive
      };

      if (editingGroupId) {
        await updatePersonGroup(editingGroupId, payload);
        showNotification("گروه با موفقیت ویرایش شد", "success");
      } else {
        await addPersonGroup(payload);
        showNotification("گروه جدید با موفقیت ایجاد شد", "success");
      }
      handleCancelEdit();
      await fetchData();
    } catch (error) {
      console.error("Error saving group:", error);
      showNotification("خطا در ذخیره گروه", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Check if it has children
      const hasChildren = groups.some(g => g.parentId === id);
      if (hasChildren) {
         showNotification("این گروه دارای زیرمجموعه است و قابل حذف نیست", "error");
         setDeletingGroupId(null);
         return;
      }
      
      const usageCount = getGroupUsageCount(id);
      if (usageCount > 0) {
        showNotification("این گروه دارای شخص وابسته است و قابل حذف نیست", "error");
        setDeletingGroupId(null);
        return;
      }

      await deletePersonGroup(id);
      showNotification("گروه با موفقیت حذف شد", "success");
      setDeletingGroupId(null);
      await fetchData();
    } catch (error) {
      console.error("Error deleting group:", error);
      showNotification("خطا در حذف گروه", "error");
    }
  };

  const getColorClasses = (colorName: string) => {
    const preset = colorPresets.find((p) => p.value === colorName);
    if (!preset) return "bg-slate-50 text-slate-700 border-slate-200";
    return `${preset.bg} ${preset.text} ${preset.border}`;
  };
  
  const getGroupUsageCount = (groupId: string) => {
      // Note: checking direct group or categories array if they use it
      return persons.filter(p => p.group === groupId || (p.categories && p.categories.includes(groupId))).length;
  };
  
  const toggleExpand = (id: string) => {
      setExpandedGroups(prev => ({...prev, [id]: !prev[id]}));
  };

  // Build tree
  const buildTree = (parentId: string | null = null): any[] => {
      return groups
          .filter(g => (g.parentId || null) === parentId)
          .map(g => ({
              ...g,
              children: buildTree(g.id)
          }));
  };
  
  const treeData = buildTree(null);

  const renderTreeNodes = (nodes: any[], level: number = 0) => {
      return nodes.map(node => {
          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = expandedGroups[node.id];
          const usageCount = getGroupUsageCount(node.id);
          
          return (
              <React.Fragment key={node.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" style={{ paddingRight: `${level * 24}px` }}>
                        {hasChildren ? (
                            <button onClick={() => toggleExpand(node.id)} className="p-1 hover:bg-slate-200 rounded-md text-slate-500">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            </button>
                        ) : (
                            <div className="w-6" /> // spacer
                        )}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shadow-sm flex items-center gap-1.5 ${getColorClasses(node.color || 'slate')}`}>
                          {node.icon && <span>{node.icon}</span>}
                          {node.name}
                        </span>
                        {!node.isActive && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black border border-slate-200">
                                غیرفعال
                            </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs text-slate-600 truncate max-w-[200px]" title={node.description || "-"}>
                          {node.description || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                       <span className="text-xs font-bold text-slate-700">{node.sortOrder || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-black text-slate-700">{usageCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {deletingGroupId === node.id ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-lg border border-rose-100">
                            <span className="text-[10px] font-black text-rose-600 px-2">مطمئن هستید؟</span>
                            <button
                              onClick={() => handleDelete(node.id)}
                              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black rounded-md cursor-pointer transition-colors"
                            >
                              بله
                            </button>
                            <button
                              onClick={() => setDeletingGroupId(null)}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black rounded-md cursor-pointer transition-colors"
                            >
                              خیر
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(node)}
                              className="flex items-center justify-center w-8 h-8 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                              title="ویرایش گروه"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingGroupId(node.id)}
                              disabled={usageCount > 0 || hasChildren}
                              className="flex items-center justify-center w-8 h-8 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={usageCount > 0 ? "گروه دارای شخص است" : hasChildren ? "گروه دارای زیرمجموعه است" : "حذف گروه"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && hasChildren && renderTreeNodes(node.children, level + 1)}
              </React.Fragment>
          );
      });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">مدیریت گروه‌های اشخاص</h1>
            <p className="text-xs text-slate-500 mt-1 font-bold">دسته‌بندی و سازماندهی درختی اشخاص</p>
          </div>
        </div>
        <button
          onClick={() => {
            handleCancelEdit();
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-600/30 active:translate-y-0 text-sm font-black cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          گروه جدید
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-indigo-600 gap-3 flex-1">
          <RotateCw className="w-8 h-8 animate-spin" />
          <span className="text-sm font-black text-slate-600">در حال دریافت اطلاعات...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <FolderPlus className="w-12 h-12 text-slate-300" />
              <p className="text-sm font-bold text-slate-500">هیچ گروهی ثبت نشده است.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
              >
                ایجاد اولین گروه
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-black text-xs">نام گروه</th>
                      <th className="px-4 py-3 font-black text-xs w-[30%]">توضیحات</th>
                      <th className="px-4 py-3 font-black text-xs text-center w-24">ترتیب</th>
                      <th className="px-4 py-3 font-black text-xs text-center w-24">اعضا</th>
                      <th className="px-4 py-3 font-black text-xs text-left w-32">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {renderTreeNodes(treeData)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standard Modal for Add / Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelEdit}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col z-10 max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                      <h2 className="text-base font-black text-slate-800">
                        {editingGroupId ? "ویرایش گروه" : "ایجاد گروه جدید"}
                      </h2>
                      <p className="text-xs text-slate-500 font-bold mt-0.5">مشخصات گروه را وارد کنید</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="p-2 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer border border-slate-200 shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                  <form id="group-form" onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-2">نام گروه <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="مثال: مشتریان عمده"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-right"
                            required
                            autoFocus
                          />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-black text-slate-700 mb-2">گروه والد (زیرمجموعه)</label>
                            <select
                                value={groupParentId}
                                onChange={(e) => setGroupParentId(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-right bg-white"
                            >
                                <option value="">(بدون والد - گروه اصلی)</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id} disabled={g.id === editingGroupId}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-black text-slate-700 mb-2">آیکون (اموجی یا متن کوتاه)</label>
                            <input
                                type="text"
                                value={groupIcon}
                                onChange={(e) => setGroupIcon(e.target.value)}
                                placeholder="مثال: 🌟"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-right"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-black text-slate-700 mb-2">ترتیب نمایش (اعداد کوچکتر بالاتر)</label>
                            <input
                                type="number"
                                value={groupSortOrder}
                                onChange={(e) => setGroupSortOrder(Number(e.target.value))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-right"
                                dir="ltr"
                            />
                        </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2.5 flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-indigo-500" />
                        رنگ گروه
                      </label>
                      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                        {colorPresets.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setGroupColor(preset.value)}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-[10px] font-black transition-all relative cursor-pointer ${
                              groupColor === preset.value
                                ? `${preset.bg} ${preset.text} border-2 border-indigo-600 scale-[1.05] shadow-md`
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full ${preset.dot} mb-2`} />
                            {preset.label}
                            {groupColor === preset.value && (
                              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm">
                                <Check className="w-3 h-3" strokeWidth={4} />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">توضیحات تکمیلی</label>
                        <textarea
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            rows={3}
                            placeholder="توضیحات درباره این گروه..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-right resize-none"
                        />
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={groupIsActive}
                            onChange={(e) => setGroupIsActive(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800">گروه فعال است</span>
                            <span className="text-xs text-slate-500 font-bold">در صورت غیرفعال کردن، این گروه در لیست‌های انتخاب نمایش داده نمی‌شود.</span>
                        </div>
                    </div>

                  </form>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-3xl">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl cursor-pointer transition-colors shadow-sm"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    form="group-form"
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-sm rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    {submitting ? (
                        <RotateCw className="w-5 h-5 animate-spin" />
                    ) : (
                        <Check className="w-5 h-5" strokeWidth={3} />
                    )}
                    <span>{editingGroupId ? "ذخیره تغییرات" : "ایجاد گروه"}</span>
                  </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
