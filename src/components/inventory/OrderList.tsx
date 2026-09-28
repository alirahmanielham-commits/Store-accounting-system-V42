import React, { useState, useMemo, useEffect, useRef } from "react";
import { Product } from "../../types";
import {
  Plus,
  Trash2,
  ShoppingCart,
  Search,
  Filter,
  Printer,
  FileText,
  AlertCircle,
  AlertTriangle,
  PackagePlus,
  Check,
  X,
  Download,
  ArrowRight,
  Barcode,
  Layers,
  Sparkles,
  RefreshCw,
  TrendingDown,
  FileSpreadsheet,
  CheckCircle2,
  ChevronDown,
  Warehouse as WarehouseIcon,
  Tag as TagIcon,
  Hash,
  Boxes,
  Edit3
} from "lucide-react";
import * as XLSX from "xlsx";
import { safePrint } from "../../utils/printHelper";
import { convertQuantityToBaseUnit, getUnitRatioDirection, UnitRatioDirection } from "../../utils/unitConversion";

interface OrderItem {
  id: string;
  productId: string;
  source: "auto" | "manual";
  qty: number;
  unitType: "main" | "secondary";
  selectedUnit: string;
  baseQty: number;
  note: string;
  priority: "normal" | "urgent" | "emergency";
  tags: string[];
}

interface OrderListProps {
  products: Product[];
  categories: any[];
  formatCurrency?: (val: number) => string;
  toPersianDigits?: (val: string | number) => string;
  storeSettings?: any;
  showNotification?: (type: string, message: string) => void;
  fetchProducts?: () => Promise<void> | void;
  setIsProductModalOpen?: (isOpen: boolean) => void;
  setIsFastProductModalOpen?: (isOpen: boolean) => void;
  setActiveTab?: (tab: string) => void;
  warehouses?: any[];
  setItems?: React.Dispatch<React.SetStateAction<any[]>>;
}

const POPULAR_TAGS = [
  "تامین فوری",
  "سفارش مشتری",
  "پروژه",
  "خرید محلی",
  "انبار مرکزی",
  "تولید و مونتاژ",
  "فصلی",
  "خرید عمده",
  "کسری خط فروش"
];

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "تامین فوری": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  "سفارش مشتری": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  "پروژه": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "خرید محلی": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "انبار مرکزی": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "تولید و مونتاژ": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  "فصلی": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "خرید عمده": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "کسری خط فروش": { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" }
};

export default function OrderList({
  products = [],
  categories = [],
  toPersianDigits = (val: string | number) => String(val ?? "").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d]),
  storeSettings = {},
  showNotification,
  fetchProducts,
  setIsProductModalOpen,
  setActiveTab,
  warehouses = []
}: OrderListProps) {
  // Manual items saved in localStorage
  const [manualItems, setManualItems] = useState<OrderItem[]>([]);
  // Custom unit/tag overrides for auto items
  const [autoOverrides, setAutoOverrides] = useState<Record<string, Partial<OrderItem>>>({});
  const [isClient, setIsClient] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<"all" | "auto" | "manual">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "normal" | "urgent" | "emergency">("all");

  // Quick Add / Search Product State
  const [productSearchInput, setProductSearchInput] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
  const [selectedUnitType, setSelectedUnitType] = useState<"main" | "secondary">("main");
  const [newQty, setNewQty] = useState<string>("1");
  const [newNote, setNewNote] = useState<string>("");
  const [newPriority, setNewPriority] = useState<"normal" | "urgent" | "emergency">("normal");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");

  // Tag Editing Modal for a specific row
  const [tagModalItem, setTagModalItem] = useState<{ id: string; name: string; currentTags: string[]; isAuto: boolean; productId: string } | null>(null);
  const [modalCustomTagInput, setModalCustomTagInput] = useState("");

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("app_order_list_manual_v2");
    if (saved) {
      try {
        setManualItems(JSON.parse(saved));
      } catch (e) {}
    }
    const savedOverrides = localStorage.getItem("app_order_list_auto_overrides");
    if (savedOverrides) {
      try {
        setAutoOverrides(JSON.parse(savedOverrides));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("app_order_list_manual_v2", JSON.stringify(manualItems));
    }
  }, [manualItems, isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("app_order_list_auto_overrides", JSON.stringify(autoOverrides));
    }
  }, [autoOverrides, isClient]);

  // Click outside search container to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter products for autocomplete dropdown
  const filteredSearchProducts = useMemo(() => {
    if (!productSearchInput.trim()) {
      return products
        .filter(p => p.isActive !== false && p.type !== "service")
        .slice(0, 15);
    }
    const q = productSearchInput.trim().toLowerCase();
    return products
      .filter(p => {
        if (p.isActive === false || p.type === "service") return false;
        const nameMatch = p.name?.toLowerCase().includes(q);
        const codeMatch = p.code?.toLowerCase().includes(q);
        const barcodeMatch = p.barcode?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        return nameMatch || codeMatch || barcodeMatch || catMatch;
      })
      .slice(0, 20);
  }, [products, productSearchInput]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProductToAdd(product);
    setProductSearchInput(product.name);
    setIsDropdownOpen(false);
    setSelectedUnitType("main");

    // Suggest quantity based on minStock if available
    const minStock = product.minStock || product.minStockLevel || 0;
    const currentStock = product.stock || 0;
    const suggestedQty = minStock > currentStock ? (minStock - currentStock) : 1;
    setNewQty(String(suggestedQty > 0 ? suggestedQty : 1));
  };

  const handleToggleNewTag = (tag: string) => {
    setNewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleAddCustomTag = () => {
    if (!customTagInput.trim()) return;
    const clean = customTagInput.trim();
    if (!newTags.includes(clean)) {
      setNewTags(prev => [...prev, clean]);
    }
    setCustomTagInput("");
  };

  const handleAddManual = () => {
    if (!selectedProductToAdd) {
      if (showNotification) showNotification("error", "لطفاً ابتدا کالایی را از لیست انتخاب کنید");
      return;
    }
    const qtyNum = parseFloat(newQty) || 1;
    const isSec = selectedUnitType === "secondary" && Boolean(selectedProductToAdd.secondaryUnit);
    const unitName = isSec ? (selectedProductToAdd.secondaryUnit || selectedProductToAdd.unit || "عدد") : (selectedProductToAdd.unit || "عدد");

    const ratio = Number(selectedProductToAdd.unitRatio || 1);
    const direction = getUnitRatioDirection(selectedProductToAdd);
    const baseQuantity = convertQuantityToBaseUnit(qtyNum, isSec, ratio, direction);

    const newItem: OrderItem = {
      id: Date.now().toString(),
      productId: selectedProductToAdd.id.toString(),
      source: "manual",
      qty: qtyNum,
      unitType: isSec ? "secondary" : "main",
      selectedUnit: unitName,
      baseQty: baseQuantity,
      note: newNote,
      priority: newPriority,
      tags: [...newTags]
    };

    setManualItems(prev => [...prev, newItem]);
    setSelectedProductToAdd(null);
    setProductSearchInput("");
    setNewQty("1");
    setNewNote("");
    setNewPriority("normal");
    setNewTags([]);
    setSelectedUnitType("main");

    if (showNotification) {
      showNotification("success", `کالای «${selectedProductToAdd.name}» با واحد ${unitName} به لیست سفارش افزوده شد`);
    }
  };

  const handleRemoveManual = (id: string) => {
    setManualItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateManualQty = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveManual(id);
      return;
    }
    setManualItems(prev => prev.map(item => {
      if (item.id === id) {
        const prod = products.find(p => p.id?.toString() === item.productId);
        const isSec = item.unitType === "secondary";
        const ratio = Number(prod?.unitRatio || 1);
        const dir = getUnitRatioDirection(prod);
        const baseQuantity = convertQuantityToBaseUnit(newQuantity, isSec, ratio, dir);
        return { ...item, qty: newQuantity, baseQty: baseQuantity };
      }
      return item;
    }));
  };

  const handleToggleItemUnit = (item: OrderItem, product: Product) => {
    if (!product.secondaryUnit) return;
    const nextUnitType = item.unitType === "main" ? "secondary" : "main";
    const isSec = nextUnitType === "secondary";
    const nextUnitName = isSec ? (product.secondaryUnit || product.unit || "عدد") : (product.unit || "عدد");

    const ratio = Number(product.unitRatio || 1);
    const dir = getUnitRatioDirection(product);

    // Calculate converted quantity
    let convertedQty = item.qty;
    if (ratio > 0) {
      if (nextUnitType === "secondary") {
        // e.g. from 24 pcs to carton (1 carton = 24 pcs) => 24 / 24 = 1 carton
        convertedQty = dir === "main_to_secondary" ? item.qty * ratio : Math.max(0.1, parseFloat((item.qty / ratio).toFixed(2)));
      } else {
        // from carton to pcs => 1 carton * 24 = 24 pcs
        convertedQty = dir === "main_to_secondary" ? Math.max(0.1, parseFloat((item.qty / ratio).toFixed(2))) : item.qty * ratio;
      }
    }

    const baseQuantity = convertQuantityToBaseUnit(convertedQty, isSec, ratio, dir);

    if (item.source === "manual") {
      setManualItems(prev => prev.map(mi => mi.id === item.id ? {
        ...mi,
        unitType: nextUnitType,
        selectedUnit: nextUnitName,
        qty: convertedQty,
        baseQty: baseQuantity
      } : mi));
    } else {
      // Auto item override
      setAutoOverrides(prev => ({
        ...prev,
        [item.productId]: {
          ...prev[item.productId],
          unitType: nextUnitType,
          selectedUnit: nextUnitName,
          qty: convertedQty,
          baseQty: baseQuantity
        }
      }));
    }
  };

  // Open Tag Edit Modal for an item
  const handleOpenTagModal = (item: OrderItem, product: Product) => {
    setTagModalItem({
      id: item.id,
      name: product.name,
      currentTags: item.tags || [],
      isAuto: item.source === "auto",
      productId: item.productId
    });
    setModalCustomTagInput("");
  };

  const handleSaveModalTags = (tags: string[]) => {
    if (!tagModalItem) return;
    if (tagModalItem.isAuto) {
      setAutoOverrides(prev => ({
        ...prev,
        [tagModalItem.productId]: {
          ...prev[tagModalItem.productId],
          tags: tags
        }
      }));
    } else {
      setManualItems(prev => prev.map(mi => mi.id === tagModalItem.id ? { ...mi, tags: tags } : mi));
    }
    setTagModalItem(null);
  };

  // Compute final aggregated order list items
  const orderListItems = useMemo(() => {
    const items: (OrderItem & { product: Product })[] = [];

    // 1. Auto items (reached reorder point)
    products.forEach(p => {
      if (p.isActive === false || p.type === "service") return;
      const minStock = Number(p.minStock || p.minStockLevel || 0);
      const currentStock = Number(p.stock || 0);
      if (minStock > 0 && currentStock <= minStock) {
        const defaultShortage = Math.max(1, minStock - currentStock);
        const isEmergency = currentStock <= 0;
        const override = autoOverrides[p.id?.toString()];

        const unitType = override?.unitType || "main";
        const selectedUnit = override?.selectedUnit || p.unit || "عدد";
        const qty = override?.qty !== undefined ? override.qty : defaultShortage;
        const isSec = unitType === "secondary";
        const ratio = Number(p.unitRatio || 1);
        const dir = getUnitRatioDirection(p);
        const baseQty = convertQuantityToBaseUnit(qty, isSec, ratio, dir);

        const autoTags = override?.tags !== undefined
          ? override.tags
          : (isEmergency ? ["تامین فوری", "کسری خط فروش"] : ["کسری خط فروش"]);

        items.push({
          id: `auto-${p.id}`,
          productId: p.id.toString(),
          source: "auto",
          product: p,
          qty: qty,
          unitType: unitType,
          selectedUnit: selectedUnit,
          baseQty: baseQty,
          note: override?.note || `موجودی: ${currentStock} (حداقل: ${minStock})`,
          priority: override?.priority || (isEmergency ? "emergency" : "urgent"),
          tags: autoTags
        });
      }
    });

    // 2. Manual items
    manualItems.forEach(mi => {
      const p = products.find(prod => prod.id === mi.productId || prod.id.toString() === mi.productId);
      if (p) {
        items.push({
          ...mi,
          product: p
        });
      }
    });

    return items;
  }, [products, manualItems, autoOverrides]);

  // All unique tags across all order list items
  const allAvailableTags = useMemo(() => {
    const tagSet = new Set<string>();
    POPULAR_TAGS.forEach(t => tagSet.add(t));
    orderListItems.forEach(item => {
      (item.tags || []).forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet);
  }, [orderListItems]);

  // Filter & Group according to active filters (category, tag, priority, search)
  const filteredOrderItems = useMemo(() => {
    let list = orderListItems;

    // Search query
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase().trim();
      list = list.filter(i =>
        i.product.name.toLowerCase().includes(lowerQ) ||
        (i.product.code && i.product.code.toLowerCase().includes(lowerQ)) ||
        (i.product.barcode && i.product.barcode.toLowerCase().includes(lowerQ)) ||
        (i.note && i.note.toLowerCase().includes(lowerQ)) ||
        (i.tags && i.tags.some(t => t.toLowerCase().includes(lowerQ)))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      list = list.filter(
        i => (i.product.categoryId?.toString() === selectedCategory) || (i.product.category === selectedCategory)
      );
    }

    // Tag filter
    if (selectedTagFilter !== "all") {
      list = list.filter(i => (i.tags || []).includes(selectedTagFilter));
    }

    // Source filter
    if (filterSource !== "all") {
      list = list.filter(i => i.source === filterSource);
    }

    // Priority filter
    if (filterPriority !== "all") {
      list = list.filter(i => i.priority === filterPriority);
    }

    return list;
  }, [orderListItems, searchQuery, selectedCategory, selectedTagFilter, filterSource, filterPriority]);

  // Group filtered items by category for clean presentation & print
  const groupedFilteredItems = useMemo(() => {
    const grouped: Record<string, typeof filteredOrderItems> = {};
    filteredOrderItems.forEach(item => {
      const catName =
        categories?.find(c => c.id?.toString() === item.product.categoryId?.toString())?.name ||
        item.product.category ||
        "عمومی و سایر";
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(item);
    });
    return grouped;
  }, [filteredOrderItems, categories]);

  // Summary statistics
  const totalItemCount = filteredOrderItems.length;
  const autoCount = filteredOrderItems.filter(i => i.source === "auto").length;
  const manualCount = filteredOrderItems.filter(i => i.source === "manual").length;
  const emergencyCount = filteredOrderItems.filter(i => i.priority === "emergency").length;

  // Convert filtered order list into a Purchase Invoice Draft
  const handleTransferToPurchaseInvoice = () => {
    if (filteredOrderItems.length === 0) {
      if (showNotification) showNotification("warning", "لیست سفارش برای انتقال خالی است");
      return;
    }

    try {
      const invoiceItems = filteredOrderItems.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        code: item.product.code || "",
        unit: item.selectedUnit || item.product.unit || "عدد",
        quantity: item.qty,
        unitPrice: Number(item.product.purchasePrice || item.product.price || 0),
        discountPercent: 0,
        discount: 0,
        tax: 0,
        totalPrice: item.qty * Number(item.product.purchasePrice || item.product.price || 0)
      }));

      localStorage.setItem("app_purchase_invoice_draft_items", JSON.stringify(invoiceItems));
      if (showNotification) {
        showNotification("success", `${filteredOrderItems.length} قلم کالا به پیش‌نویس فاکتور خرید منتقل شد`);
      }
      if (setActiveTab) {
        setActiveTab("create_purchase");
      }
    } catch (e) {
      console.error(e);
      if (showNotification) showNotification("error", "خطا در انتقال به فاکتور خرید");
    }
  };

  // Excel Export (Quantities, Units, Tags, Reorder Points, Notes)
  const handleExportExcel = () => {
    if (filteredOrderItems.length === 0) {
      if (showNotification) showNotification("warning", "آیتمی برای خروجی اکسل وجود ندارد");
      return;
    }

    try {
      const exportData = filteredOrderItems.map((item, index) => {
        const cat = categories.find(c => c.id?.toString() === item.product.categoryId?.toString())?.name || item.product.category || "-";
        return {
          "ردیف": index + 1,
          "نام کالا": item.product.name,
          "کد کالا": item.product.code || "-",
          "بارکد": item.product.barcode || "-",
          "دسته‌بندی": cat,
          "موجودی فعلی": item.product.stock || 0,
          "نقطه سفارش (حداقل)": item.product.minStock || 0,
          "مقدار سفارش": item.qty,
          "واحد سفارش": item.selectedUnit || item.product.unit || "عدد",
          "نوع واحد": item.unitType === "secondary" ? "واحد فرعی" : "واحد اصلی",
          "معادل واحد اصلی": item.unitType === "secondary" ? `${item.baseQty} ${item.product.unit || "عدد"}` : "-",
          "برچسب‌ها / تگ‌ها": (item.tags || []).join("، "),
          "نوع نیازسنجی": item.source === "auto" ? "کسری انبار (خودکار)" : "دستی",
          "اولویت": item.priority === "emergency" ? "اضطراری" : item.priority === "urgent" ? "فوری" : "عادی",
          "توضیحات": item.note || ""
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "لیست سفارش خرید");
      XLSX.writeFile(workbook, `Order_List_${new Date().toLocaleDateString("fa-IR").replace(/\//g, "-")}.xlsx`);

      if (showNotification) showNotification("success", "فایل اکسل سفارش با موفقیت ایجاد و دانلود شد");
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("error", "خطا در ایجاد فایل اکسل");
    }
  };

  const handlePrint = () => {
    safePrint("#order-list-printable-section", { timeoutMs: 2500 });
  };

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === "all") return "همه دسته‌بندی‌ها";
    return categories.find(c => c.id?.toString() === selectedCategory)?.name || selectedCategory;
  }, [selectedCategory, categories]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col h-full overflow-hidden font-sans print-section" id="order-list-printable-section" dir="rtl">
      {/* Top Header */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20 print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">لیست سفارش و نیازمندی‌های خرید</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                {toPersianDigits(filteredOrderItems.length)} قلم کالا
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              مدیریت نیازسنجی اقلام، سفارش‌گذاری با واحدهای اصلی و فرعی، دسته‌بندی بر اساس تگ‌ها و خروجی چاپی
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Open Standard System Product Modal */}
          <button
            type="button"
            onClick={() => {
              if (setIsProductModalOpen) {
                setIsProductModalOpen(true);
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            title="باز کردن فرم استاندارد تعریف کالای جدید سیستم"
          >
            <PackagePlus className="w-4 h-4" />
            <span>تعریف کالای جدید</span>
          </button>

          {/* Transfer to Purchase Invoice */}
          <button
            type="button"
            onClick={handleTransferToPurchaseInvoice}
            disabled={filteredOrderItems.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
            title="انتقال اقلام فیلتر شده به فاکتور خرید"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>صدور فاکتور خرید</span>
          </button>

          {/* Excel Export */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            title="دانلود فایل اکسل"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">خروجی اکسل</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            title="چاپ لیست طبق فیلترها و تگ‌های انتخابی"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>چاپ لیست (طبق فیلتر)</span>
          </button>
        </div>
      </div>

      {/* Print-Only Official Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-6 p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="text-right">
            <h1 className="text-xl font-black text-slate-900">{storeSettings?.storeName || storeSettings?.companyName || "سیستم جامع مدیریت و انبار"}</h1>
            <h2 className="text-sm font-bold text-slate-700 mt-1">فرم رسمی لیست سفارش و تدارکات کالا</h2>
          </div>
          <div className="text-left text-xs font-mono text-slate-600 space-y-1">
            <div>تاریخ چاپ: {new Date().toLocaleDateString("fa-IR")}</div>
            <div>تعداد اقلام: {toPersianDigits(filteredOrderItems.length)} ردیف</div>
          </div>
        </div>

        {/* Active Filters in Print Header */}
        <div className="flex flex-wrap gap-3 items-center justify-start bg-slate-100 p-2 rounded-lg text-xs font-bold text-slate-800 mt-2 border border-slate-300">
          <span>فیلترهای اعمال‌شده:</span>
          {selectedCategory !== "all" && (
            <span className="bg-white px-2 py-0.5 rounded border border-slate-300">دسته‌بندی: {selectedCategoryName}</span>
          )}
          {selectedTagFilter !== "all" && (
            <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-300">تگ انتخابی: {selectedTagFilter}</span>
          )}
          {filterPriority !== "all" && (
            <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-300">اولویت: {filterPriority === "emergency" ? "اضطراری" : filterPriority === "urgent" ? "فوری" : "عادی"}</span>
          )}
          {searchQuery && (
            <span className="bg-white px-2 py-0.5 rounded border border-slate-300">جستجو: {searchQuery}</span>
          )}
          {selectedCategory === "all" && selectedTagFilter === "all" && filterPriority === "all" && !searchQuery && (
            <span className="text-slate-500 font-normal">نمایش کلیه اقلام لیست سفارش بدون محدودیت فیلتر</span>
          )}
        </div>
      </div>

      {/* Statistical Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100 print:hidden">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">اقلام سفارش جاری (فیلترشده)</span>
            <span className="text-lg font-black text-slate-800 font-mono block mt-1">
              {toPersianDigits(totalItemCount)} <span className="text-xs font-normal font-sans text-slate-400">ردیف</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">اقلام زیر نقطه سفارش (کسری)</span>
            <span className="text-lg font-black text-amber-600 font-mono block mt-1">
              {toPersianDigits(autoCount)} <span className="text-xs font-normal font-sans text-slate-400">کالا</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">اقلام ثبت‌شده دستی</span>
            <span className="text-lg font-black text-emerald-600 font-mono block mt-1">
              {toPersianDigits(manualCount)} <span className="text-xs font-normal font-sans text-slate-400">کالا</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">اقلام با اولویت اضطراری</span>
            <span className="text-lg font-black text-rose-600 font-mono block mt-1">
              {toPersianDigits(emergencyCount)} <span className="text-xs font-normal font-sans text-slate-400">مورد</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Professional Product Search, Unit & Tag Selector Bar */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-100 space-y-4 print:hidden">
        <div className="bg-gradient-to-br from-indigo-50/60 to-slate-50 p-4 sm:p-5 rounded-2xl border border-indigo-100/80">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              افزودن سریع کالا به لیست سفارش با تعیین واحد اصلی/فرعی و تگ
            </h2>
            <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
              پشتیبانی از واحد فرعی با ضریب تبدیل و برچسب‌گذاری چندگانه
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            {/* Auto-complete Search Box */}
            <div className="sm:col-span-5 relative" ref={searchContainerRef}>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>انتخاب کالا</span>
                {selectedProductToAdd && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {selectedProductToAdd.name}
                  </span>
                )}
              </label>
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="جستجوی نام کالا، کد یا اسکن بارکد..."
                  value={productSearchInput}
                  onChange={(e) => {
                    setProductSearchInput(e.target.value);
                    setIsDropdownOpen(true);
                    if (selectedProductToAdd && selectedProductToAdd.name !== e.target.value) {
                      setSelectedProductToAdd(null);
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm font-bold text-slate-800 transition-all shadow-2xs"
                />
                {productSearchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearchInput("");
                      setSelectedProductToAdd(null);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Rich Live Dropdown */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-72 overflow-y-auto z-50 divide-y divide-slate-100">
                  {filteredSearchProducts.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      <p className="text-xs font-bold">کالایی با این مشخصات یافت نشد.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          if (setIsProductModalOpen) setIsProductModalOpen(true);
                        }}
                        className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center justify-center gap-1 mx-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        تعریف کالا در فرم استاندارد محصولات
                      </button>
                    </div>
                  ) : (
                    filteredSearchProducts.map((prod) => {
                      const isLow = (prod.stock || 0) <= (prod.minStock || 0) && (prod.minStock || 0) > 0;
                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleSelectProduct(prod)}
                          className={`p-3 hover:bg-indigo-50/70 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                            selectedProductToAdd?.id === prod.id ? "bg-indigo-50 font-bold" : ""
                          }`}
                        >
                          <div className="flex flex-col text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-800">{prod.name}</span>
                              {isLow && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                                  زیر نقطه سفارش
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              {prod.code && <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-[11px]">کد: {prod.code}</span>}
                              {prod.category && <span>دسته‌بندی: {prod.category}</span>}
                              {prod.secondaryUnit && (
                                <span className="text-indigo-600 font-bold">
                                  (فرعی: {prod.secondaryUnit} با ضریب {prod.unitRatio || 1})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end text-left shrink-0">
                            <span className="text-xs font-bold text-slate-700">
                              موجودی: <strong className={isLow ? "text-rose-600 font-mono" : "text-emerald-600 font-mono"}>{toPersianDigits(prod.stock || 0)}</strong> {prod.unit || "عدد"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              نقطه سفارش: {toPersianDigits(prod.minStock || 0)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Unit Selector (Main vs Secondary Unit) */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                واحد سنجش کالا
              </label>
              {selectedProductToAdd?.secondaryUnit ? (
                <div className="flex rounded-xl p-1 bg-slate-200/80 border border-slate-300 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSelectedUnitType("main")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                      selectedUnitType === "main"
                        ? "bg-white text-indigo-700 shadow-sm font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    اصلی ({selectedProductToAdd.unit || "عدد"})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUnitType("secondary")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                      selectedUnitType === "secondary"
                        ? "bg-white text-indigo-700 shadow-sm font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    فرعی ({selectedProductToAdd.secondaryUnit})
                  </button>
                </div>
              ) : (
                <div className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                  {selectedProductToAdd ? `واحد اصلی (${selectedProductToAdd.unit || "عدد"})` : "ابتدا کالا را انتخاب کنید"}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                مقدار سفارش
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                placeholder="1"
                className="w-full px-3 py-2.5 bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-sm font-black text-center text-slate-900 transition-all shadow-2xs font-mono"
              />
            </div>

            {/* Priority */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اولویت</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-xs font-bold text-slate-800 transition-all shadow-2xs"
              >
                <option value="normal">عادی</option>
                <option value="urgent">فوری</option>
                <option value="emergency">اضطراری (کسری)</option>
              </select>
            </div>

            {/* Tags Selector */}
            <div className="sm:col-span-10 pt-1">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>برچسب‌ها / تگ‌های این قلم سفارش:</span>
              </label>
              <div className="flex flex-wrap gap-1.5 items-center">
                {POPULAR_TAGS.map((tag) => {
                  const isSelected = newTags.includes(tag);
                  const style = TAG_COLORS[tag] || { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleNewTag(tag)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? `${style.bg} ${style.text} ${style.border} ring-2 ring-indigo-500/30 font-black`
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {tag}
                      {isSelected && <Check className="w-3 h-3 inline-block mr-1" />}
                    </button>
                  );
                })}

                {/* Custom Tag Input */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5">
                  <input
                    type="text"
                    placeholder="تگ دلخواه..."
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    className="text-xs outline-none w-24 font-bold text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-2 pt-5">
              <button
                type="button"
                onClick={handleAddManual}
                disabled={!selectedProductToAdd}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن به لیست</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Toolbar: Categories, Tags, Priorities & Search */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2.5 items-center flex-1 w-full">
            {/* Search within list */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو در لیست سفارش (کد، نام، تگ یا یادداشت)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">همه دسته‌بندی‌ها</option>
                {categories.map((c, i) => (
                  <option key={c.id || i} value={c.id?.toString() || c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div className="w-full sm:w-48">
              <select
                value={selectedTagFilter}
                onChange={(e) => setSelectedTagFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-indigo-200 rounded-xl text-xs font-black text-indigo-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">همه تگ‌ها و برچسب‌ها</option>
                {allAvailableTags.map((tag) => (
                  <option key={tag} value={tag}>تگ: {tag}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="w-full sm:w-36">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">همه اولویت‌ها</option>
                <option value="emergency">فقط اضطراری</option>
                <option value="urgent">فقط فوری</option>
                <option value="normal">عادی</option>
              </select>
            </div>

            {/* Source Filter */}
            <div className="w-full sm:w-36">
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">همه منابع</option>
                <option value="auto">کسری انبار (خودکار)</option>
                <option value="manual">دستی</option>
              </select>
            </div>
          </div>

          {/* Clear Filter / Clear manual items */}
          <div className="flex items-center gap-2 shrink-0">
            {(selectedCategory !== "all" || selectedTagFilter !== "all" || filterPriority !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedTagFilter("all");
                  setFilterPriority("all");
                  setSearchQuery("");
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                حذف فیلترها
              </button>
            )}

            {manualItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("آیا از پاک‌سازی اقلام دستی این لیست اطمینان دارید؟")) {
                    setManualItems([]);
                  }
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                حذف اقلام دستی
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Order List Table View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40 print:p-0 print:bg-white">
        {Object.keys(groupedFilteredItems).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <ShoppingCart className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-base font-black text-slate-600">آیتمی منطبق با فیلترهای انتخابی یافت نشد</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              می‌توانید فیلترها را تغییر داده یا از فرم بالا کالایی را جستجو یا به عنوان کالای جدید تعریف کنید.
            </p>
            <button
              type="button"
              onClick={() => {
                if (setIsProductModalOpen) setIsProductModalOpen(true);
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>تعریف کالای جدید در سیستم</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFilteredItems).map(([categoryName, items]) => (
              <div key={categoryName} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs print:border-slate-400 print:rounded-none">
                {/* Category Header */}
                <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between print:bg-slate-100">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                    <span>دسته‌بندی: {categoryName}</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 print:border-none font-mono">
                    {toPersianDigits(items.length)} ردیف کالا
                  </span>
                </div>

                {/* Items Table for Print & Screen (WITHOUT PURCHASE PRICES) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3 min-w-[200px]">شرح کالا / مشخصات</th>
                        <th className="p-3 w-28 text-center">کد / بارکد</th>
                        <th className="p-3 w-24 text-center">موجودی فعلی</th>
                        <th className="p-3 w-24 text-center">نقطه سفارش</th>
                        <th className="p-3 w-36 text-center">مقدار و واحد درخواستی</th>
                        <th className="p-3 min-w-[150px]">تگ‌ها / برچسب‌ها</th>
                        <th className="p-3 w-24 text-center">اولویت</th>
                        <th className="p-3 w-16 text-center print:hidden">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {items.map((item, idx) => {
                        const hasSecUnit = Boolean(item.product.secondaryUnit);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3 text-center text-slate-400 font-mono">{toPersianDigits(idx + 1)}</td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-black text-slate-900 text-xs sm:text-sm">{item.product.name}</span>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                  {item.source === "auto" ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                      <AlertCircle className="w-3 h-3" /> خودکار (کسری انبار)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                      دستی
                                    </span>
                                  )}
                                  {item.note && <span className="text-slate-400">| {item.note}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono text-slate-600">
                              {item.product.code || item.product.barcode || "-"}
                            </td>
                            <td className="p-3 text-center font-bold">
                              <span className={(item.product.stock || 0) <= 0 ? "text-rose-600 font-black" : "text-slate-700 font-mono"}>
                                {toPersianDigits(item.product.stock || 0)} {item.product.unit || "عدد"}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono text-slate-500">
                              {toPersianDigits(item.product.minStock || 0)} {item.product.unit || "عدد"}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center justify-center gap-1">
                                {item.source === "manual" ? (
                                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateManualQty(item.id, item.qty - 1)}
                                      className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 font-black print:hidden"
                                    >
                                      -
                                    </button>
                                    <span className="px-2 py-0.5 font-black text-indigo-700 font-mono text-xs">
                                      {toPersianDigits(item.qty)} {item.selectedUnit}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateManualQty(item.id, item.qty + 1)}
                                      className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 font-black print:hidden"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-black text-indigo-700 font-mono text-xs bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-100">
                                    {toPersianDigits(item.qty)} {item.selectedUnit}
                                  </span>
                                )}

                                {/* Main/Secondary unit switcher badge */}
                                {hasSecUnit && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleItemUnit(item, item.product)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition-colors print:hidden cursor-pointer"
                                    title="تغییر واحد بین اصلی و فرعی"
                                  >
                                    {item.unitType === "secondary" ? `واحد فرعی (معادل ${toPersianDigits(item.baseQty)} ${item.product.unit})` : `واحد اصلی (تبدیل به ${item.product.secondaryUnit})`}
                                  </button>
                                )}
                                {hasSecUnit && item.unitType === "secondary" && (
                                  <span className="text-[10px] text-slate-400 font-bold hidden print:inline">
                                    معادل {toPersianDigits(item.baseQty)} {item.product.unit}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Tags list */}
                            <td className="p-3">
                              <div className="flex flex-wrap items-center gap-1">
                                {(item.tags || []).map((t, tIdx) => {
                                  const color = TAG_COLORS[t] || { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
                                  return (
                                    <span
                                      key={tIdx}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${color.bg} ${color.text} ${color.border}`}
                                    >
                                      {t}
                                    </span>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => handleOpenTagModal(item, item.product)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors print:hidden"
                                  title="ویرایش تگ‌ها"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* Priority */}
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  item.priority === "emergency"
                                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                                    : item.priority === "urgent"
                                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                              >
                                {item.priority === "emergency" ? "اضطراری" : item.priority === "urgent" ? "فوری" : "عادی"}
                              </span>
                            </td>

                            {/* Operations */}
                            <td className="p-3 text-center print:hidden">
                              {item.source === "manual" && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveManual(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="حذف از لیست"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Print Signatures Block */}
        <div className="hidden print:grid grid-cols-3 gap-6 pt-12 mt-12 border-t border-slate-300 text-center text-xs text-slate-800">
          <div className="space-y-16">
            <span className="font-bold">مسئول انبار / متقاضی</span>
            <div className="border-t border-dashed border-slate-400 w-3/4 mx-auto pt-2 text-[10px] text-slate-500">امضا و تاریخ</div>
          </div>
          <div className="space-y-16">
            <span className="font-bold">مدیر تدارکات و خرید</span>
            <div className="border-t border-dashed border-slate-400 w-3/4 mx-auto pt-2 text-[10px] text-slate-500">امضا و تاریخ</div>
          </div>
          <div className="space-y-16">
            <span className="font-bold">مدیریت عامل / تایید نهایی</span>
            <div className="border-t border-dashed border-slate-400 w-3/4 mx-auto pt-2 text-[10px] text-slate-500">امضا و تاریخ</div>
          </div>
        </div>
      </div>

      {/* Edit Tags Modal */}
      {tagModalItem && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 print:hidden" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-800">ویرایش تگ‌های: {tagModalItem.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setTagModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">انتخاب از تگ‌های پرکاربرد:</label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_TAGS.map(tag => {
                    const isSelected = tagModalItem.currentTags.includes(tag);
                    const color = TAG_COLORS[tag] || { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" };
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? tagModalItem.currentTags.filter(t => t !== tag)
                            : [...tagModalItem.currentTags, tag];
                          setTagModalItem({ ...tagModalItem, currentTags: next });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          isSelected
                            ? `${color.bg} ${color.text} ${color.border} font-black ring-2 ring-indigo-500/20`
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {tag} {isSelected && <Check className="w-3 h-3 inline-block mr-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">افزودن تگ سفارشی:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="عنوان تگ..."
                    value={modalCustomTagInput}
                    onChange={(e) => setModalCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (modalCustomTagInput.trim() && !tagModalItem.currentTags.includes(modalCustomTagInput.trim())) {
                          setTagModalItem({
                            ...tagModalItem,
                            currentTags: [...tagModalItem.currentTags, modalCustomTagInput.trim()]
                          });
                          setModalCustomTagInput("");
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (modalCustomTagInput.trim() && !tagModalItem.currentTags.includes(modalCustomTagInput.trim())) {
                        setTagModalItem({
                          ...tagModalItem,
                          currentTags: [...tagModalItem.currentTags, modalCustomTagInput.trim()]
                        });
                        setModalCustomTagInput("");
                      }
                    }}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                  >
                    افزودن
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveModalTags(tagModalItem.currentTags)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm"
                >
                  ذخیره تگ‌ها
                </button>
                <button
                  type="button"
                  onClick={() => setTagModalItem(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
