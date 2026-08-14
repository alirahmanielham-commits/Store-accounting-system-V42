import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  List,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Database,
  Package,
  ChevronDown,
  ChevronLeft
} from "lucide-react";
import ProductCategoryModal from "../modals/ProductCategoryModal";

interface ProductCategoriesViewProps {
  storeSettings?: any;
  productCategories: any[];
  products: any[];
  recalculating: boolean;
  submittingProduct?: boolean;
  handleRecalculateStocks: () => void;
  handleGenerateDemoData: () => void;
  addProductCategory: (cat: any) => Promise<any>;
  updateProductCategory: (id: string, cat: any) => Promise<any>;
  deleteProductCategory: (id: string) => Promise<any>;
  getProductCategories: () => Promise<any[]>;
  setProductCategories: (cats: any[]) => void;
  confirmAction: (msg: string, callback: () => void) => void;
  setSuccessMsg: (msg: string) => void;
}

const CategoryNode = ({ 
  node, 
  level, 
  expanded, 
  toggleExpand, 
  products, 
  onEdit, 
  onDelete 
}: any) => {
  const isExpanded = expanded[node.id];
  const hasChildren = node.children && node.children.length > 0;
  
  const prodQty = (products || []).filter(
    (p: any) =>
      String(p.categoryId) === String(node.id) ||
      p.category === node.name
  ).length;

  return (
    <div className="flex flex-col border-b border-gray-100/50 last:border-b-0">
      <div 
        className="flex items-center justify-between p-3 hover:bg-indigo-50/30 transition-colors group"
        style={{ paddingRight: `${level * 24 + 12}px` }}
      >
        <div className="flex items-center gap-2 flex-1">
          {hasChildren ? (
            <button 
              onClick={() => toggleExpand(node.id)}
              className="p-1 text-gray-400 hover:text-indigo-600 rounded-md transition-colors border-none bg-transparent cursor-pointer"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6" /> // spacer
          )}
          
          <div className="flex items-center gap-2">
            <Tag className={`w-4 h-4 ${level === 0 ? 'text-indigo-500' : 'text-gray-400'}`} />
            <span className={`${level === 0 ? 'font-extrabold text-indigo-950' : 'font-bold text-gray-700'}`}>
              {node.name}
            </span>
            {node.code && (
              <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md border border-gray-200 leading-none">
                {node.code}
              </span>
            )}
            {node.description && (
              <span className="text-[11px] text-gray-400 font-medium mr-2 hidden md:inline-block">
                ({node.description})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-24 text-center">
             {prodQty > 0 ? (
              <span className="font-sans font-black text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-xl border border-indigo-100/30 inline-block min-w-[3rem]">
                {prodQty} کالا
              </span>
            ) : (
              <span className="font-sans font-bold text-xs text-gray-400 bg-gray-50/50 px-2 py-1 rounded-xl inline-block min-w-[3rem] border border-transparent">
                ۰ کالا
              </span>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 w-16 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              title="ویرایش"
              onClick={() => onEdit(node)}
              className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg cursor-pointer border border-transparent bg-transparent transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              title="حذف"
              onClick={() => onDelete(node)}
              className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg cursor-pointer border border-transparent bg-transparent transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {node.children.map((child: any, i: number) => (
              <CategoryNode
                key={`child-${child.id}-${i}`}
                node={child}
                level={level + 1}
                expanded={expanded}
                toggleExpand={toggleExpand}
                products={products}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function ProductCategoriesView({
  productCategories,
  products,
  recalculating,
  submittingProduct,
  handleRecalculateStocks,
  handleGenerateDemoData,
  addProductCategory,
  updateProductCategory,
  deleteProductCategory,
  getProductCategories,
  setProductCategories,
  confirmAction,
  setSuccessMsg,
}: ProductCategoriesViewProps) {
  const [categorySearch, setCategorySearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatParentId, setNewCatParentId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Build tree
  const treeData = useMemo(() => {
    const map = new Map();
    productCategories.forEach(c => map.set(c.id.toString(), { ...c, children: [] }));
    const tree: any[] = [];
    
    // First, map everything
    map.forEach(node => {
      if (node.parentId && map.has(node.parentId.toString())) {
        map.get(node.parentId.toString()).children.push(node);
      } else {
        tree.push(node);
      }
    });

    // If searching, we flatten or just show matching nodes (for simplicity, if search is active, show flat list)
    if (categorySearch) {
      const lowerSearch = categorySearch.toLowerCase();
      const filtered = productCategories.filter(
        c => 
          (c.name || "").toLowerCase().includes(lowerSearch) ||
          (c.description || "").toLowerCase().includes(lowerSearch)
      );
      // return a flat tree
      return filtered.map(c => ({...c, children: []}));
    }

    return tree;
  }, [productCategories, categorySearch]);

  const resetCategoryForm = () => {
    setNewCatName("");
    setNewCatDesc("");
    setNewCatParentId("");
    setEditingCategoryId(null);
  };

  const handleOpenEdit = (cat: any) => {
    setEditingCategoryId(cat.id);
    setNewCatName(cat.name);
    setNewCatDesc(cat.description || "");
    setNewCatParentId(cat.parentId?.toString() || "");
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    resetCategoryForm();
    setIsModalOpen(true);
  };

  const handleDelete = (cat: any) => {
    confirmAction(
      `آیا از حذف گروه کالایی "${cat.name}" اطمینان دارید؟`,
      async () => {
        await deleteProductCategory(cat.id);
        setSuccessMsg("گروه‌بندی حذف شد.");
        const fc = await getProductCategories();
        setProductCategories(fc);
      }
    );
  };

  const handleSaveCategory = async () => {
    if (!newCatName) return;
    try {
      if (editingCategoryId) {
        await updateProductCategory(editingCategoryId, {
          name: newCatName,
          description: newCatDesc,
          parentId: newCatParentId || null,
        });
        setSuccessMsg("گروه‌بندی با موفقیت ویرایش شد.");
      } else {
        const codechars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let newCode = "";
        for (let i = 0; i < 3; i++) {
          newCode += codechars.charAt(
            Math.floor(Math.random() * codechars.length)
          );
        }
        await addProductCategory({
          code: newCode,
          name: newCatName,
          description: newCatDesc,
          parentId: newCatParentId || null,
        });
        setSuccessMsg("گروه‌بندی جدید ثبت شد.");
      }
      
      const fetchedCats = await getProductCategories();
      setProductCategories(fetchedCats);
      setIsModalOpen(false);
      resetCategoryForm();
    } catch (err) {
      console.error("Error saving category", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-right"
      dir="rtl"
    >
      <ProductCategoryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingCategoryId={editingCategoryId}
        productCategories={productCategories}
        newCatName={newCatName}
        setNewCatName={setNewCatName}
        newCatDesc={newCatDesc}
        setNewCatDesc={setNewCatDesc}
        newCatParentId={newCatParentId}
        setNewCatParentId={setNewCatParentId}
        handleSaveCategory={handleSaveCategory}
        resetCategoryForm={resetCategoryForm}
      />

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-150 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <List className="w-6 h-6 text-indigo-600" />
            مدیریت گروه‌بندی کالاها
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            دسته‌بندی درختی محصولات و خدمات جهت سازماندهی دقیق کالاها، گزارشات سوددهی و انبارگردانی آسان
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors text-sm font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            ثبت گروه جدید
          </button>
          
          <button
            type="button"
            disabled={recalculating}
            onClick={handleRecalculateStocks}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg flex items-center gap-2 transition-colors text-sm font-medium cursor-pointer"
            title="محاسبه مجدد موجودی انبارها بر اساس اسناد رسید و حواله"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? "animate-spin" : ""}`} />
            محاسبه مجدد موجودی
          </button>
        </div>
      </div>

      {/* Info Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">تعداد کل دسته‌ها</span>
            <span className="text-2xl font-black text-indigo-950 font-mono" dir="ltr">
              {productCategories.length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <List className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">گروه‌های اصلی</span>
            <span className="text-2xl font-black text-amber-950 font-mono" dir="ltr">
              {productCategories.filter((c) => !c.parentId).length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">زیرمجموعه‌ها</span>
            <span className="text-2xl font-black text-teal-950 font-mono" dir="ltr">
              {productCategories.filter((c) => c.parentId).length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">کالاهای دسته‌بندی شده</span>
            <span className="text-2xl font-black text-rose-950 font-mono" dir="ltr">
              {(products || []).filter((p) => p.categoryId || p.category).length}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="جستجو در گروه‌ها..."
              className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-gray-700 bg-white"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xs font-bold text-gray-500">
             {categorySearch ? `${treeData.length} نتیجه یافت شد` : "نمایش درختی گروه‌ها"}
          </div>
        </div>

        <div className="p-0">
          <div className="bg-slate-50 text-gray-500 text-xs font-bold border-b border-gray-100 flex items-center p-3">
            <div className="flex-1 pr-4">نام گروه کالایی</div>
            <div className="w-24 text-center">تعداد محصولات</div>
            <div className="w-16 text-center">عملیات</div>
          </div>
          
          <div className="flex flex-col">
            {treeData.map((node, i) => (
              <CategoryNode
                key={`node-${node.id}-${i}`}
                node={node}
                level={0}
                expanded={expanded}
                toggleExpand={toggleExpand}
                products={products}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            ))}
            {treeData.length === 0 && (
              <div className="p-12 text-center text-gray-400 font-medium flex flex-col items-center gap-2">
                <Tag className="w-8 h-8 text-gray-300" />
                <span>هیچ گروه کالایی یافت نشد.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
