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
  DollarSign,
  FileSpreadsheet,
  CheckCircle2,
  ChevronDown,
  Warehouse as WarehouseIcon,
  Tag
} from "lucide-react";
import * as XLSX from "xlsx";
import { addProduct as addProductService } from "../../services/productService";
import { safePrint } from "../../utils/printHelper";

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

export default function OrderList({
  products = [],
  categories = [],
  formatCurrency = (val: number) => Number(val || 0).toLocaleString("fa-IR"),
  toPersianDigits = (val: string | number) => String(val ?? "").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d]),
  storeSettings = {},
  showNotification,
  fetchProducts,
  setIsProductModalOpen,
  setActiveTab,
  warehouses = []
}: OrderListProps) {
  // Manual additions saved in localStorage
  const [manualItems, setManualItems] = useState<{
    id: string;
    productId: string;
    qty: number;
    note: string;
    priority?: "normal" | "urgent" | "emergency";
  }[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<"all" | "auto" | "manual">("all");

  // Quick Add / Search Product State
  const [productSearchInput, setProductSearchInput] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
  const [newQty, setNewQty] = useState<string>("1");
  const [newNote, setNewNote] = useState<string>("");
  const [newPriority, setNewPriority] = useState<"normal" | "urgent" | "emergency">("normal");

  // New Product Modal State
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isSavingNewProduct, setIsSavingNewProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: "",
    code: "",
    barcode: "",
    categoryId: "",
    unit: "عدد",
    purchasePrice: "",
    price: "",
    minStock: "5",
    initialStock: "0",
    warehouseId: "",
    orderQuantityNow: "10",
    description: ""
  });

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("app_order_list_manual");
    if (saved) {
      try {
        setManualItems(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("app_order_list_manual", JSON.stringify(manualItems));
    }
  }, [manualItems, isClient]);

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

  // Filter products for professional autocomplete dropdown
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

    // Suggest quantity based on minStock if available
    const minStock = product.minStock || product.minStockLevel || 0;
    const currentStock = product.stock || 0;
    const suggestedQty = minStock > currentStock ? (minStock - currentStock) : 1;
    setNewQty(String(suggestedQty > 0 ? suggestedQty : 1));
  };

  const handleAddManual = () => {
    if (!selectedProductToAdd) {
      if (showNotification) showNotification("error", "لطفاً ابتدا کالایی را از لیست انتخاب کنید");
      return;
    }
    const qtyNum = parseFloat(newQty) || 1;
    const newItem = {
      id: Date.now().toString(),
      productId: selectedProductToAdd.id.toString(),
      qty: qtyNum,
      note: newNote,
      priority: newPriority
    };

    setManualItems(prev => [...prev, newItem]);
    setSelectedProductToAdd(null);
    setProductSearchInput("");
    setNewQty("1");
    setNewNote("");
    setNewPriority("normal");

    if (showNotification) {
      showNotification("success", `کالای «${selectedProductToAdd.name}» به لیست سفارش افزوده شد`);
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
    setManualItems(prev => prev.map(item => item.id === id ? { ...item, qty: newQuantity } : item));
  };

  // Compute final aggregated order list items
  const orderListItems = useMemo(() => {
    const items: {
      source: "auto" | "manual";
      manualId?: string;
      product: Product;
      qty: number;
      note: string;
      priority: "normal" | "urgent" | "emergency";
    }[] = [];

    // 1. Auto items (reached reorder point)
    products.forEach(p => {
      if (p.isActive === false || p.type === "service") return;
      const minStock = Number(p.minStock || p.minStockLevel || 0);
      const currentStock = Number(p.stock || 0);
      if (minStock > 0 && currentStock <= minStock) {
        const shortage = Math.max(1, minStock - currentStock);
        const isEmergency = currentStock <= 0;
        items.push({
          source: "auto",
          product: p,
          qty: shortage,
          note: `موجودی فعلی: ${currentStock} (نقطه سفارش: ${minStock})`,
          priority: isEmergency ? "emergency" : "urgent"
        });
      }
    });

    // 2. Manual items
    manualItems.forEach(mi => {
      const p = products.find(prod => prod.id === mi.productId || prod.id.toString() === mi.productId);
      if (p) {
        items.push({
          source: "manual",
          manualId: mi.id,
          product: p,
          qty: mi.qty,
          note: mi.note || "ثبت دستی",
          priority: mi.priority || "normal"
        });
      }
    });

    return items;
  }, [products, manualItems]);

  // Summary statistics
  const totalEstimatedCost = useMemo(() => {
    return orderListItems.reduce((sum, item) => {
      const price = Number(item.product.purchasePrice || item.product.price || 0);
      return sum + (price * item.qty);
    }, 0);
  }, [orderListItems]);

  const autoCount = useMemo(() => orderListItems.filter(i => i.source === "auto").length, [orderListItems]);
  const manualCount = useMemo(() => orderListItems.filter(i => i.source === "manual").length, [orderListItems]);

  // Filter & Group
  const filteredAndGrouped = useMemo(() => {
    let filtered = orderListItems;
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(i =>
        i.product.name.toLowerCase().includes(lowerQ) ||
        (i.product.code && i.product.code.toLowerCase().includes(lowerQ)) ||
        (i.product.barcode && i.product.barcode.toLowerCase().includes(lowerQ))
      );
    }
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        i => (i.product.categoryId?.toString() === selectedCategory) || (i.product.category === selectedCategory)
      );
    }
    if (filterSource !== "all") {
      filtered = filtered.filter(i => i.source === filterSource);
    }

    const grouped: Record<string, typeof filtered> = {};
    filtered.forEach(item => {
      const catName =
        categories?.find(c => c.id?.toString() === item.product.categoryId?.toString())?.name ||
        item.product.category ||
        "عمومی و سایر";
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(item);
    });

    return grouped;
  }, [orderListItems, searchQuery, selectedCategory, filterSource, categories]);

  // Handle Quick Creation of New Product
  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name.trim()) {
      if (showNotification) showNotification("error", "نام کالا الزامی است");
      return;
    }

    setIsSavingNewProduct(true);
    try {
      const productPayload: any = {
        name: newProductForm.name.trim(),
        code: newProductForm.code.trim() || `PRD-${Date.now().toString().slice(-5)}`,
        barcode: newProductForm.barcode.trim(),
        categoryId: newProductForm.categoryId || (categories[0]?.id?.toString() || ""),
        unit: newProductForm.unit || "عدد",
        purchasePrice: parseFloat(newProductForm.purchasePrice) || 0,
        price: parseFloat(newProductForm.price) || (parseFloat(newProductForm.purchasePrice) || 0) * 1.2,
        minStock: parseFloat(newProductForm.minStock) || 0,
        stock: parseFloat(newProductForm.initialStock) || 0,
        description: newProductForm.description,
        isActive: true,
        type: "physical"
      };

      const added = await addProductService(productPayload);
      if (fetchProducts) await fetchProducts();

      // Automatically add this new product to the Order List!
      const orderQty = parseFloat(newProductForm.orderQuantityNow) || 1;
      const targetId = added?.id ? added.id.toString() : productPayload.code;

      setManualItems(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          productId: targetId,
          qty: orderQty,
          note: "کالای جدید تعریف شده",
          priority: "urgent"
        }
      ]);

      setIsNewProductModalOpen(false);
      setNewProductForm({
        name: "",
        code: "",
        barcode: "",
        categoryId: "",
        unit: "عدد",
        purchasePrice: "",
        price: "",
        minStock: "5",
        initialStock: "0",
        warehouseId: "",
        orderQuantityNow: "10",
        description: ""
      });

      if (showNotification) {
        showNotification("success", `کالای «${productPayload.name}» با موفقیت تعریف و به لیست سفارش افزوده شد`);
      }
    } catch (err: any) {
      console.error(err);
      if (showNotification) showNotification("error", err?.message || "خطا در تعریف کالای جدید");
    } finally {
      setIsSavingNewProduct(false);
    }
  };

  // Convert entire Order List into a Purchase Invoice Draft
  const handleTransferToPurchaseInvoice = () => {
    if (orderListItems.length === 0) {
      if (showNotification) showNotification("warning", "لیست سفارش خالی است");
      return;
    }

    try {
      const invoiceItems = orderListItems.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        code: item.product.code || "",
        unit: item.product.unit || "عدد",
        quantity: item.qty,
        unitPrice: Number(item.product.purchasePrice || item.product.price || 0),
        discountPercent: 0,
        discount: 0,
        tax: 0,
        totalPrice: item.qty * Number(item.product.purchasePrice || item.product.price || 0)
      }));

      // Store in localStorage draft for purchase invoice
      localStorage.setItem("app_purchase_invoice_draft_items", JSON.stringify(invoiceItems));
      if (showNotification) {
        showNotification("success", `${orderListItems.length} قلم کالا به پیش‌نویس فاکتور خرید منتقل شد`);
      }
      if (setActiveTab) {
        setActiveTab("create_purchase");
      }
    } catch (e) {
      console.error(e);
      if (showNotification) showNotification("error", "خطا در انتقال به فاکتور خرید");
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (orderListItems.length === 0) {
      if (showNotification) showNotification("warning", "آیتمی برای خروجی اکسل وجود ندارد");
      return;
    }

    try {
      const exportData = orderListItems.map((item, index) => {
        const cat = categories.find(c => c.id?.toString() === item.product.categoryId?.toString())?.name || item.product.category || "-";
        const unitPrice = Number(item.product.purchasePrice || item.product.price || 0);
        const totalPrice = unitPrice * item.qty;

        return {
          "ردیف": index + 1,
          "نام کالا": item.product.name,
          "کد کالا": item.product.code || "-",
          "بارکد": item.product.barcode || "-",
          "دسته‌بندی": cat,
          "موجودی فعلی": item.product.stock || 0,
          "نقطه سفارش (حداقل)": item.product.minStock || 0,
          "مقدار سفارش": item.qty,
          "واحد سنجش": item.product.unit || "عدد",
          "قیمت فی برآوردی (تومان)": unitPrice,
          "مبلغ کل برآوردی (تومان)": totalPrice,
          "نوع نیازسنجی": item.source === "auto" ? "کسری انبار (خودکار)" : "دستی",
          "اولویت": item.priority === "emergency" ? "اضطراری" : item.priority === "urgent" ? "فوری" : "عادی",
          "توضیحات": item.note || ""
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "لیست سفارش خرید");
      XLSX.writeFile(workbook, `Order_List_${new Date().toLocaleDateString("fa-IR").replace(/\//g, "-")}.xlsx`);

      if (showNotification) showNotification("success", "فایل اکسل سفارش خرید با موفقیت ایجاد و دانلود شد");
    } catch (err) {
      console.error(err);
      if (showNotification) showNotification("error", "خطا در ایجاد فایل اکسل");
    }
  };

  const handlePrint = () => {
    safePrint('.print-section');
  };

  const currency = storeSettings?.currency || "تومان";

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 flex flex-col h-full overflow-hidden font-sans print-section" dir="rtl">
      {/* Top Header */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20 print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">لیست سفارش و تامین کالا</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                {toPersianDigits(orderListItems.length)} قلم کالا
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              مدیریت هوشمند نیازمندی‌های خرید، اقلام به نقطه سفارش رسیده و ثبت فوری سفارش کالا
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Create New Product Button */}
          <button
            type="button"
            onClick={() => setIsNewProductModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            title="تعریف مستقیم کالای جدید و اضافه به این لیست"
          >
            <PackagePlus className="w-4 h-4" />
            <span>تعریف کالای جدید</span>
          </button>

          {/* Transfer to Purchase Invoice */}
          <button
            type="button"
            onClick={handleTransferToPurchaseInvoice}
            disabled={orderListItems.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
            title="انتقال اقلام این لیست به فاکتور خرید"
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
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            title="چاپ رسمی لیست خرید"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>چاپ لیست</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-6 p-4">
        <h1 className="text-xl font-black text-slate-900">{storeSettings?.storeName || storeSettings?.companyName || "سیستم مدیریت بازرگانی و انبار"}</h1>
        <h2 className="text-base font-bold text-slate-700 mt-1">فرم رسمی لیست سفارش و تامین موجودی کالا</h2>
        <div className="flex justify-between items-center text-xs text-slate-600 mt-3 px-4">
          <span>تاریخ گزارش: {new Date().toLocaleDateString("fa-IR")}</span>
          <span>تعداد کل اقلام سفارش: {toPersianDigits(orderListItems.length)} قلم</span>
          <span>مجموع برآورد ریالی: {formatCurrency(totalEstimatedCost)} {currency}</span>
        </div>
      </div>

      {/* Statistical Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100 print:hidden">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">کل اقلام درخواستی</span>
            <span className="text-lg font-black text-slate-800 font-mono block mt-1">
              {toPersianDigits(orderListItems.length)} <span className="text-xs font-normal font-sans text-slate-400">قلم</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">اقلام کسری انبار (خودکار)</span>
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
            <span className="text-xs font-bold text-slate-500 block">اقلام افزوده شده دستی</span>
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
            <span className="text-xs font-bold text-slate-500 block">مجموع برآورد بودجه خرید</span>
            <span className="text-lg font-black text-slate-900 font-mono block mt-1" dir="ltr">
              {formatCurrency(totalEstimatedCost)} <span className="text-xs font-bold font-sans text-slate-500">{currency}</span>
            </span>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Professional Product Search & Fast Add Bar */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-100 space-y-4 print:hidden">
        <div className="bg-gradient-to-br from-indigo-50/60 to-slate-50 p-4 sm:p-5 rounded-2xl border border-indigo-100/80">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              جستجوی حرفه‌ای و افزودن کالا به لیست سفارش
            </h2>
            <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
              امکان جستجو با نام، بارکد، کد کالا و تعیین مقدار درخواستی
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            {/* Auto-complete Search Box */}
            <div className="sm:col-span-6 relative" ref={searchContainerRef}>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>جستجو و انتخاب کالا</span>
                {selectedProductToAdd && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    انتخاب شد: {selectedProductToAdd.code || selectedProductToAdd.name}
                  </span>
                )}
              </label>
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="نام، کد کالا یا اسکن بارکد را وارد کنید..."
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
                          setNewProductForm(prev => ({ ...prev, name: productSearchInput }));
                          setIsNewProductModalOpen(true);
                        }}
                        className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center justify-center gap-1 mx-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        تعریف «{productSearchInput}» به عنوان کالای جدید
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
                              {prod.barcode && <span className="font-mono text-[10px] text-slate-400">بارکد: {prod.barcode}</span>}
                            </div>
                          </div>

                          <div className="flex flex-col items-end text-left shrink-0">
                            <span className="text-xs font-bold text-slate-700">
                              موجودی: <strong className={isLow ? "text-rose-600" : "text-emerald-600"}>{toPersianDigits(prod.stock || 0)}</strong> {prod.unit || "عدد"}
                            </span>
                            <span className="text-[11px] font-bold text-indigo-600 font-mono">
                              خرید: {formatCurrency(prod.purchasePrice || 0)} {currency}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تعداد / مقدار ({selectedProductToAdd?.unit || "واحد"})
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اولویت تامین</label>
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

            {/* Submit Button */}
            <div className="sm:col-span-2 pt-6">
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

        {/* Filters & Search Within Order List */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
            {/* Search within list */}
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="فیلتر در اقلام لیست سفارش (نام یا کد)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full sm:w-56">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">همه دسته‌بندی‌ها</option>
                {categories.map((c, i) => (
                  <option key={c.id || i} value={c.id?.toString() || c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Source Filter */}
            <div className="w-full sm:w-48">
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">همه منابع (خودکار + دستی)</option>
                <option value="auto">فقط کسری انبار (خودکار)</option>
                <option value="manual">فقط اقلام دستی</option>
              </select>
            </div>
          </div>

          {/* Clear manual items button */}
          {manualItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("آیا از پاک‌سازی تمام اقلام دستی لیست اطمینان دارید؟")) {
                  setManualItems([]);
                }
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors shrink-0"
            >
              پاک‌سازی اقلام دستی
            </button>
          )}
        </div>
      </div>

      {/* Main Order List View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40 print:p-0 print:bg-white">
        {Object.keys(filteredAndGrouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <ShoppingCart className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-base font-black text-slate-600">لیست سفارش کالا خالی است</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              هیچ کالایی به نقطه سفارش نرسیده و یا آیتم دستی افزوده نشده است. از نوار بالا می‌توانید کالایی را جستجو یا تعریف کرده و اضافه نمایید.
            </p>
            <button
              type="button"
              onClick={() => setIsNewProductModalOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <PackagePlus className="w-4 h-4" />
              <span>تعریف کالای جدید برای خرید</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(filteredAndGrouped).map(([categoryName, items]) => (
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

                {/* Items Table for Print & Screen */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3 min-w-[200px]">شرح کالا / مشخصات</th>
                        <th className="p-3 w-28 text-center">کد / بارکد</th>
                        <th className="p-3 w-24 text-center">موجودی فعلی</th>
                        <th className="p-3 w-24 text-center">نقطه سفارش</th>
                        <th className="p-3 w-32 text-center">مقدار درخواستی</th>
                        <th className="p-3 w-32 text-left">قیمت فی خرید ({currency})</th>
                        <th className="p-3 w-36 text-left">مجموع برآوردی ({currency})</th>
                        <th className="p-3 w-24 text-center">اولویت</th>
                        <th className="p-3 w-16 text-center print:hidden">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {items.map((item, idx) => {
                        const unitPrice = Number(item.product.purchasePrice || item.product.price || 0);
                        const rowTotal = unitPrice * item.qty;

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
                                {toPersianDigits(item.product.stock || 0)}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono text-slate-500">
                              {toPersianDigits(item.product.minStock || 0)}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {item.source === "manual" && item.manualId ? (
                                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateManualQty(item.manualId!, item.qty - 1)}
                                      className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 font-black print:hidden"
                                    >
                                      -
                                    </button>
                                    <span className="px-2 py-0.5 font-black text-indigo-700 font-mono text-xs">
                                      {toPersianDigits(item.qty)} {item.product.unit || "عدد"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateManualQty(item.manualId!, item.qty + 1)}
                                      className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 font-black print:hidden"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-black text-indigo-700 font-mono text-xs bg-indigo-50/80 px-2 py-1 rounded-lg border border-indigo-100">
                                    {toPersianDigits(item.qty)} {item.product.unit || "عدد"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-left font-mono font-bold text-slate-700" dir="ltr">
                              {formatCurrency(unitPrice)}
                            </td>
                            <td className="p-3 text-left font-mono font-black text-slate-900" dir="ltr">
                              {formatCurrency(rowTotal)}
                            </td>
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
                            <td className="p-3 text-center print:hidden">
                              {item.source === "manual" && item.manualId && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveManual(item.manualId!)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* QUICK DEFINE NEW PRODUCT MODAL */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PackagePlus className="w-5 h-5" />
                <h3 className="font-black text-base">تعریف سریع کالای جدید و افزودن به لیست سفارش</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateProductSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نام کامل کالا <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProductForm.name}
                    onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                    placeholder="مثال: لوله پنج لایه سایز ۱۶ نیوپایپ"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* SKU Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">کد کالا (اختیاری)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newProductForm.code}
                      onChange={(e) => setNewProductForm({ ...newProductForm, code: e.target.value })}
                      placeholder="PRD-1001"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setNewProductForm({ ...newProductForm, code: `P-${Math.floor(1000 + Math.random() * 9000)}` })}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold shrink-0"
                      title="تولید کد خودکار"
                    >
                      تولید کد
                    </button>
                  </div>
                </div>

                {/* Barcode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بارکد (اختیاری)</label>
                  <input
                    type="text"
                    value={newProductForm.barcode}
                    onChange={(e) => setNewProductForm({ ...newProductForm, barcode: e.target.value })}
                    placeholder="اسکن یا تایپ بارکد..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی</label>
                  <select
                    value={newProductForm.categoryId}
                    onChange={(e) => setNewProductForm({ ...newProductForm, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">-- بدون دسته‌بندی --</option>
                    {categories.map((c, i) => (
                      <option key={c.id || i} value={c.id?.toString() || c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">واحد سنجش</label>
                  <select
                    value={newProductForm.unit}
                    onChange={(e) => setNewProductForm({ ...newProductForm, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="عدد">عدد</option>
                    <option value="شاخه">شاخه</option>
                    <option value="متر">متر</option>
                    <option value="کیلوگرم">کیلوگرم</option>
                    <option value="بسته">بسته</option>
                    <option value="کارتن">کارتن</option>
                    <option value="حلقه">حلقه</option>
                    <option value="لیتر">لیتر</option>
                    <option value="دستگاه">دستگاه</option>
                    <option value="جفت">جفت</option>
                  </select>
                </div>

                {/* Purchase Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">قیمت برآوردی خرید ({currency})</label>
                  <input
                    type="number"
                    value={newProductForm.purchasePrice}
                    onChange={(e) => setNewProductForm({ ...newProductForm, purchasePrice: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Sales Price */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">قیمت فروش ({currency})</label>
                  <input
                    type="number"
                    value={newProductForm.price}
                    onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Min Stock */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نقطه سفارش (حداقل موجودی)</label>
                  <input
                    type="number"
                    value={newProductForm.minStock}
                    onChange={(e) => setNewProductForm({ ...newProductForm, minStock: e.target.value })}
                    placeholder="5"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Initial Order Quantity */}
                <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                  <label className="block text-xs font-black text-emerald-800 mb-1">
                    تعداد سفارش فوری در این لیست
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProductForm.orderQuantityNow}
                    onChange={(e) => setNewProductForm({ ...newProductForm, orderQuantityNow: e.target.value })}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-black text-center text-emerald-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSavingNewProduct}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSavingNewProduct ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال ذخیره...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>ثبت کالا و افزودن به لیست سفارش</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
