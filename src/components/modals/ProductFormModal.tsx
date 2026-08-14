import React, { useState, useEffect } from "react";
import { startAppProcessing, stopAppProcessing } from "../../utils/processingHelper";
import { motion } from "motion/react";
import { Package, X, Check, Save, Plus, Trash2, Edit2, History, Pencil } from "lucide-react";
import { addCommas, removeCommas, toPersianDigits, numToPersianWords, convertToGregorian } from "../../utils/format";
import { addProduct, updateProduct, getProductPriceHistory, updateProductPriceHistory } from "../../services/dataService";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import CustomDatePicker from "../ui/CustomDatePicker";
import { productSchema } from "../../schemas/validation";
import CurrencyInput from "../ui/CurrencyInput";
const DatePicker = CustomDatePicker;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProductId: any;
  products: any[];
  productCategories: any[];
  warehouses: any[];
  storeSettings?: any;
  onSuccess: (addedProduct?: any) => void;
  showNotification: (msg: string, type?: 'success'|'error'|'info'|'warning') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
  activeTab?: string;
  handleFastAddProduct?: (id: string, p: any) => void;
}

export default function ProductFormModal({
  isOpen,
  onClose,
  editingProductId,
  products,
  productCategories,
  warehouses,
  storeSettings,
  onSuccess,
  showNotification,
  confirmAction,
  activeTab = "",
  handleFastAddProduct
}: ProductFormModalProps) {
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductPriceDate, setNewProductPriceDate] = useState(new Date().toISOString().split("T")[0]);
  const [newProductType, setNewProductType] = useState<"product" | "service">("product");
  const [newProductCategoryId, setNewProductCategoryId] = useState("");
  const [newProductCode, setNewProductCode] = useState("");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductPurchasePrice, setNewProductPurchasePrice] = useState("");
  const [newProductWarehouseId, setNewProductWarehouseId] = useState("");
  const [newProductStock, setNewProductStock] = useState("");
  const [newProductMinStock, setNewProductMinStock] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("");
  const [newProductSecondaryUnit, setNewProductSecondaryUnit] = useState("");
  const [newProductUnitRatio, setNewProductUnitRatio] = useState("");
  const [productFormTab, setProductFormTab] = useState<"general" | "inventory" | "sales" | "price_history" | "financial" | "history">("general");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductImageUrl, setNewProductImageUrl] = useState("");
  const [newProductIsActive, setNewProductIsActive] = useState(true);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  
  const [currentProductPriceHistory, setCurrentProductPriceHistory] = useState<any[]>([]);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingHistoryDate, setEditingHistoryDate] = useState<string>("");

  const customAlert = (msg: string) => showNotification(msg, 'error');
  const setNotification = (n: any) => showNotification(n.message, n.type);

  useEffect(() => {
    if (isOpen) {
      if (editingProductId) {
        const product = products.find(p => p.id === editingProductId);
        if (product) {
          setNewProductName(product.name || "");
          setNewProductPrice(product.price ? String(product.price) : "");
          setNewProductType(product.type || "product");
          setNewProductCategoryId(product.categoryId || "");
          setNewProductCode(product.code || "");
          setNewProductBarcode(product.barcode || "");
          setNewProductPurchasePrice(product.buyPrice ? String(product.buyPrice) : "");
          setNewProductWarehouseId(product.warehouseId || "");
          setNewProductStock(product.stock ? String(product.stock) : "");
          setNewProductMinStock(product.minStock ? String(product.minStock) : "");
          setNewProductUnit(product.unit || "");
          setNewProductSecondaryUnit(product.secondaryUnit || "");
          setNewProductUnitRatio(product.unitRatio ? String(product.unitRatio) : "");
          setNewProductDesc(product.description || "");
          setNewProductImageUrl(product.imageUrl || "");
          setNewProductIsActive(product.isActive !== false);
          
          if (product.id) {
            getProductPriceHistory(product.id.toString()).then(setCurrentProductPriceHistory).catch(console.error);
          }
        }
      } else {
        setNewProductName("");
        setNewProductPrice("");
        setNewProductType("product");
        setNewProductCategoryId("");
        setNewProductCode("");
        setNewProductBarcode("");
        setNewProductPurchasePrice("");
        setNewProductWarehouseId("");
        setNewProductStock("");
        setNewProductMinStock("");
        setNewProductUnit("");
        setNewProductSecondaryUnit("");
        setNewProductUnitRatio("");
        setNewProductDesc("");
        setNewProductImageUrl("");
        setNewProductIsActive(true);
        setCurrentProductPriceHistory([]);
      }
      setProductFormTab("general");
    }
  }, [isOpen, editingProductId, products]);

const handleSubmitProduct = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      try { e.preventDefault(); } catch (err) {}
    }
    if (!newProductName) return;

    setSubmittingProduct(true); startAppProcessing('شروع فرآیند ثبت Product...');
    try {
      const isEdit = editingProductId !== null;
      const catName =
        productCategories.find(
          (c) => String(c.id) === String(newProductCategoryId),
        )?.name || "عمومی";

      let finalCode = newProductCode;
      if (!isEdit && !finalCode) {
        const cat = productCategories.find(
          (c) => String(c.id) === String(newProductCategoryId),
        );
        let catCode = cat?.code;
        if (!catCode) {
          catCode = "GEN";
        }
        const existingProducts = (products || []).filter(
          (p) => typeof p.code === "string" && p.code.startsWith(catCode),
        );
        const maxCode = existingProducts
          .map((p) => parseInt(p.code.replace(catCode, ""), 10))
          .filter((n) => !isNaN(n))
          .reduce((a, b) => Math.max(a, b), 0);
        finalCode = `${catCode}${String(maxCode + 1).padStart(4, "0")}`;
      }

      const duplicateName = products.find(
        (p) => p.name === newProductName && p.id !== editingProductId,
      );
      if (duplicateName) {
        customAlert(
          `کالایی با نام "${newProductName}" قبلا ثبت شده است. لطفا نام دیگری انتخاب کنید.`,
        );
        setSubmittingProduct(false); stopAppProcessing();
        return;
      }

      const duplicateCode = products.find(
        (p) => p.code === finalCode && p.id !== editingProductId,
      );
      if (duplicateCode) {
        customAlert(
          `کد کالا (${finalCode}) تکراری است. لطفا کد دیگری وارد کنید.`,
        );
        setSubmittingProduct(false); stopAppProcessing();
        return;
      }

      if (newProductBarcode) {
        const duplicateBarcode = products.find(
          (p) => p.barcode === newProductBarcode && p.id !== editingProductId,
        );
        if (duplicateBarcode) {
          customAlert(`بارکد (${newProductBarcode}) تکراری است.`);
          setSubmittingProduct(false); stopAppProcessing();
          return;
        }
      }

      const payload = {
        name: newProductName,
        price: Number(newProductPrice || 0),
        buyPrice: Number(newProductPurchasePrice || 0),
        sellPrice: Number(newProductPrice || 0),
        priceChangeDate: newProductPriceDate ? new Date(newProductPriceDate).toISOString() : new Date().toISOString(),
        type: newProductType,
        categoryId: newProductCategoryId,
        category: catName,
        code: finalCode,
        barcode: newProductBarcode,
        purchasePrice: Number(newProductPurchasePrice || 0),
        stock: Number(newProductStock || 0),
        warehouseId: newProductWarehouseId,
        minStock: Number(newProductMinStock || 0),
        unit: newProductUnit || "عدد",
        secondaryUnit: newProductSecondaryUnit,
        unitRatio: Number(newProductUnitRatio || 1),
        description: newProductDesc,
        imageUrl: newProductImageUrl,
        isActive: newProductIsActive,
      };

      const validation = productSchema.safeParse(payload);
      if (!validation.success) {
        customAlert((validation.error as any).errors[0].message);
        setSubmittingProduct(false); stopAppProcessing();
        return;
      }

      if (isEdit) {
        await updateProduct(editingProductId.toString(), payload);
        showNotification("کالا با موفقیت ویرایش شد.", "success");
      } else {
        const addedProduct = await addProduct(payload);
        showNotification("کالای جدید با موفقیت ثبت شد.", "success");

        if (
          ["create_sale", "create_purchase", "create_warehouse_doc"].includes(
            activeTab,
          )
        ) {
          handleFastAddProduct(addedProduct.id.toString(), addedProduct);
          setNotification({
            message: "کالا به عنوان ردیف جدید به فاکتور اضافه شد.",
            type: "info",
          });
          setTimeout(() => setNotification(null), 3000);
        }
      }



      onSuccess();
      setNewProductName("");
      setNewProductPrice("");
      setNewProductType("product");
      setNewProductCategoryId("");
      setNewProductCode("");
      setNewProductBarcode("");
      setNewProductPurchasePrice("");
      setNewProductWarehouseId("");
      setNewProductStock("");
      setNewProductMinStock("");
      setNewProductUnit("");
      setNewProductSecondaryUnit("");
      setNewProductUnitRatio("");
      setNewProductDesc("");
        setNewProductImageUrl("");
      setNewProductIsActive(true);
      setProductFormTab("general");
      
      onClose();
    } catch (error) {
      console.error("Error saving product", error);
      showNotification("خطا در ثبت کالا."); // We don't have showError apparently
    } finally {
      setSubmittingProduct(false); stopAppProcessing();
    }
  };

  

  const handleSaveHistoryDate = async (h: any) => {
    try {
      await updateProductPriceHistory(h.id, { ...h, changeDate: editingHistoryDate });
      const updatedHistory = await getProductPriceHistory(editingProductId!.toString());
      setCurrentProductPriceHistory(updatedHistory);
      setEditingHistoryId(null);
      setEditingHistoryDate("");
      showNotification("تاریخ با موفقیت ویرایش شد", 'success');
    } catch (error) {
      console.error(error);
      showNotification("خطا در ویرایش تاریخ", 'error');
    }
  };

  if (!isOpen) return null;

  return (
<div key="isProductModalOpen-modal"
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
                        <Package className="w-5 h-5 text-indigo-500" />
                        ثبت کالا / خدمات جدید
                      </h3>
                      <button
                        onClick={() => onClose()}
                        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-0 overflow-y-auto flex-1">
                      <div className="flex border-b border-gray-200 px-6 pt-4 gap-6 sticky top-0 bg-white z-10">
                        <button
                          type="button"
                          onClick={() => setProductFormTab("general")}
                          className={`pb-3 font-bold text-sm border-b-2 transition-colors ${productFormTab === "general" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                        >
                          اطلاعات عمومی
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductFormTab("financial")}
                          className={`pb-3 font-bold text-sm border-b-2 transition-colors ${productFormTab === "financial" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                        >
                          اطلاعات مالی
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductFormTab("inventory")}
                          className={`pb-3 font-bold text-sm border-b-2 transition-colors ${productFormTab === "inventory" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                        >
                          انبار و تکمیلی
                        </button>
                        {editingProductId && (
                          <button
                            type="button"
                            onClick={() => setProductFormTab("history")}
                            className={`pb-3 font-bold text-sm border-b-2 transition-colors ${productFormTab === "history" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                          >
                            تاریخچه قیمت‌ها
                          </button>
                        )}
                      </div>

                      <form
                        id="productForm"
                        onSubmit={(e) => {
                          e.preventDefault();
                          confirmAction(
                            "آیا از ثبت اطلاعات کالا/خدمات اطمینان دارید؟",
                            () => handleSubmitProduct(e as any),
                          );
                        }}
                        className="p-6"
                      >
                        {/* General Info Tab */}
                        {productFormTab === "general" && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="w-full md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                  عنوان کالا / خدمات{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={newProductName}
                                  onChange={(e) =>
                                    setNewProductName(e.target.value)
                                  }
                                  placeholder="مثال: گوشی موبایل سامسونگ S23"
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors text-gray-900 bg-gray-50 focus:bg-white"
                                  required
                                />
                              </div>
                              <div className="w-full">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                  نوع <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={newProductType}
                                  onChange={(e) =>
                                    setNewProductType(
                                      e.target.value as "product" | "service",
                                    )
                                  }
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors text-gray-900 bg-white"
                                >
                                  <option value="product">کالا (فیزیکی)</option>
                                  <option value="service">
                                    خدمات (غیرفیزیکی)
                                  </option>
                                </select>
                              </div>
                              <div className="w-full">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                  گروه‌بندی
                                </label>
                                <select
                                  value={newProductCategoryId}
                                  onChange={(e) =>
                                    setNewProductCategoryId(e.target.value)
                                  }
                                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors text-gray-900 bg-white"
                                >
                                  <option value="">بدون گروه (عمومی)</option>
                                  {productCategories.map((cat, index) => (
                                    <option key={`${cat.id}-${index}`} value={cat.id}>
                                      {cat.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* وضعیت کالا */}
                            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl flex items-center justify-between">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold text-gray-800">وضعیت فعال بودن کالا / خدمت</span>
                                <span className="text-xs text-gray-500">کالاهای غیرفعال در بخش‌های فاکتوردهی و انبارداری نمایش داده نمی‌شوند.</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={newProductIsActive}
                                    onChange={(e) => setNewProductIsActive(e.target.checked)}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                                <span className={`text-xs font-black ${newProductIsActive ? "text-emerald-600 bg-emerald-50 px-2 py-1 rounded" : "text-rose-600 bg-rose-50 px-2 py-1 rounded"}`}>
                                  {newProductIsActive ? "فعال" : "غیرفعال"}
                                </span>
                              </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
                              <h4 className="text-sm font-black text-blue-800 mb-4 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                تعریف واحد شمارش
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="w-full">
                                  <label className="block text-xs font-bold text-blue-800 mb-2">
                                    واحد اصلی (کوچکترین جزء)
                                  </label>
                                  <input
                                    type="text"
                                    value={newProductUnit}
                                    onChange={(e) =>
                                      setNewProductUnit(e.target.value)
                                    }
                                    placeholder="مثال: عدد، کیلوگرم"
                                    className="w-full px-3 py-2.5 rounded-lg border border-blue-200 focus:ring-max focus:ring-blue-500 shadow-sm text-sm"
                                  />
                                </div>
                                <div className="w-full">
                                  <label className="block text-xs font-bold text-blue-800 mb-2">
                                    واحد فرعی (بسته‌بندی بزرگتر)
                                  </label>
                                  <input
                                    type="text"
                                    value={newProductSecondaryUnit}
                                    onChange={(e) =>
                                      setNewProductSecondaryUnit(e.target.value)
                                    }
                                    placeholder="مثال: کارتن، بسته"
                                    className="w-full px-3 py-2.5 rounded-lg border border-blue-200 focus:ring-max focus:ring-blue-500 shadow-sm text-sm"
                                  />
                                  <p className="text-[10px] text-blue-600 mt-1 opacity-80">
                                    (اختیاری)
                                  </p>
                                </div>
                                <div className="w-full">
                                  <label className="block text-xs font-bold text-blue-800 mb-2">
                                    ضریب تبدیل (هر واحد فرعی چند واحد اصلی است؟)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={newProductUnitRatio}
                                    onChange={(e) =>
                                      setNewProductUnitRatio(e.target.value)
                                    }
                                    placeholder="مثال: 2.5 یا 24"
                                    className="w-full px-3 py-2.5 rounded-lg border border-blue-200 focus:ring-max focus:ring-blue-500 shadow-sm text-sm"
                                    disabled={!newProductSecondaryUnit}
                                  />
                                  {newProductSecondaryUnit &&
                                    newProductUnitRatio &&
                                    Number(newProductUnitRatio) > 0 &&
                                    newProductUnit && (
                                      <p className="text-xs font-bold text-emerald-600 mt-2">
                                        1 {newProductSecondaryUnit} ={" "}
                                        {newProductUnitRatio} {newProductUnit}
                                      </p>
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Financial Info Tab */}
                        {productFormTab === "financial" && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="w-full md:col-span-2">
                                <label className="block text-sm font-bold text-emerald-950 mb-2">
                                  تاریخ ثبت / تغییر قیمت
                                </label>
                                <DatePicker
                                  value={newProductPriceDate}
                                  onChange={(date: any) => setNewProductPriceDate(date ? (convertToGregorian(date)) : new Date().toISOString())}
                                  calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                                  locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                                  calendarPosition="bottom-right"
                                  inputClass="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm transition-colors text-emerald-900 font-mono text-left bg-white"
                                />
                              </div>
                              <div className="w-full">
                                <label className="block text-sm font-bold text-emerald-950 mb-2">
                                  قیمت خرید بر اساس کوچکترین واحد (
                                  {newProductUnit || "واحد اصلی"}) (
                                  {storeSettings?.currency || "تومان"})
                                </label>
                                <CurrencyInput
                                  value={newProductPurchasePrice}
                                  onChange={(e: any) =>
                                    setNewProductPurchasePrice(e.target.value)
                                  }
                                  placeholder="مثال: 100000"
                                  className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm transition-colors text-emerald-900 font-mono text-left font-bold bg-white"
                                />
                                {newProductSecondaryUnit &&
                                  newProductUnitRatio &&
                                  Number(newProductUnitRatio) > 0 &&
                                  newProductPurchasePrice && (
                                    <p className="text-xs font-bold text-emerald-700 mt-1.5 bg-emerald-100/50 px-3 py-1.5 rounded-lg border border-emerald-200">
                                      معادل{" "}
                                      <span className="font-mono text-sm font-black text-indigo-700">
                                        {Number(
                                          Number(
                                            newProductPurchasePrice.replace(
                                              /,/g,
                                              "",
                                            ),
                                          ) * Number(newProductUnitRatio),
                                        )}
                                      </span>{" "}
                                      {storeSettings?.currency || "تومان"} به
                                      ازای هر{" "}
                                      <span className="underline">
                                        {newProductSecondaryUnit}
                                      </span>{" "}
                                      (ضریب {newProductUnitRatio})
                                    </p>
                                  )}
                              </div>
                              <div className="w-full">
                                <label className="block text-sm font-bold text-emerald-950 mb-2">
                                  قیمت فروش بر اساس کوچکترین واحد (
                                  {newProductUnit || "واحد اصلی"}) (
                                  {storeSettings?.currency || "تومان"})
                                </label>
                                <CurrencyInput
                                  value={newProductPrice}
                                  onChange={(e: any) =>
                                    setNewProductPrice(e.target.value)
                                  }
                                  placeholder="مثال: 150000"
                                  className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm transition-colors text-emerald-900 font-mono text-left font-bold bg-white"
                                />
                                {newProductSecondaryUnit &&
                                  newProductUnitRatio &&
                                  Number(newProductUnitRatio) > 0 &&
                                  newProductPrice && (
                                    <p className="text-xs font-bold text-indigo-700 mt-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                      معادل{" "}
                                      <span className="font-mono text-sm font-black text-indigo-800">
                                        {Number(
                                          Number(
                                            newProductPrice.replace(/,/g, ""),
                                          ) * Number(newProductUnitRatio),
                                        )}
                                      </span>{" "}
                                      {storeSettings?.currency || "تومان"} به
                                      ازای هر{" "}
                                      <span className="underline">
                                        {newProductSecondaryUnit}
                                      </span>{" "}
                                      (ضریب {newProductUnitRatio})
                                    </p>
                                  )}
                              </div>
                            </div>

                            <div className="flex justify-between items-center bg-gray-50 border border-gray-100 p-4 rounded-xl">
                              <div>
                                <p className="text-sm font-bold text-gray-700">
                                  حاشیه سود حدودی:
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  تفاوت قیمت فروش و خرید
                                </p>
                              </div>
                              <div
                                className="font-mono text-lg font-black text-indigo-600"
                                dir="ltr"
                              >
                                {newProductPrice && newProductPurchasePrice ? (
                                  (() => {
                                    const diff =
                                      Number(newProductPrice) -
                                      Number(newProductPurchasePrice);
                                    const percent =
                                      Number(newProductPurchasePrice) > 0
                                        ? (
                                            (diff /
                                              Number(newProductPurchasePrice)) *
                                            100
                                          ).toFixed(1)
                                        : 100;
                                    return (
                                      <span
                                        className={
                                          diff > 0
                                            ? "text-emerald-600"
                                            : "text-rose-600"
                                        }
                                      >
                                        {Number(diff)}{" "}
                                        {storeSettings.currency}{" "}
                                        <span className="text-sm">
                                          ({percent}%)
                                        </span>
                                      </span>
                                    );
                                  })()
                                ) : (
                                  <span className="text-gray-400">---</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Inventory & Advanced Tab */}
                        {productFormTab === "inventory" && (
                          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {newProductType === "product" && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <div className="w-full">
                                  <label className="block text-sm font-bold text-gray-700 mb-2">
                                    انبار مرجع
                                  </label>
                                  <select
                                    value={newProductWarehouseId}
                                    onChange={(e) =>
                                      setNewProductWarehouseId(e.target.value)
                                    }
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors text-gray-900 bg-white"
                                  >
                                    <option value="">
                                      بدون انبار (موجودی کلی)
                                    </option>
                                    {warehouses
                                      .filter((w) => w.isActive)
                                      .map((wh, index) => (
                                        <option key={`${wh.id}-${index}`} value={wh.id}>
                                          {wh.name}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                                <div className="w-full">
                                  <label className="block text-sm font-bold text-gray-700 mb-2">
                                    موجودی اولیه در انبار
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={newProductStock}
                                    onChange={(e) =>
                                      setNewProductStock(e.target.value)
                                    }
                                    placeholder="تعداد در انبار"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors text-gray-900 font-mono text-left"
                                  />
                                </div>
                                <div className="w-full">
                                  <label className="block text-sm font-bold text-gray-700 mb-2">
                                    حداقل موجودی (هشدار شارژ)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={newProductMinStock}
                                    onChange={(e) =>
                                      setNewProductMinStock(e.target.value)
                                    }
                                    placeholder="مثال: 5"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors text-gray-900 font-mono text-left"
                                  />
                                </div>
                                <div className="w-full">
                                  <label className="block text-sm font-bold text-gray-700 mb-2">
                                    کد کالا (سیستمی)
                                  </label>
                                  <input
                                    type="text"
                                    value={newProductCode}
                                    onChange={(e) =>
                                      setNewProductCode(e.target.value)
                                    }
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors text-gray-900 font-mono text-left"
                                    dir="ltr"
                                  />
                                </div>
                                <div className="w-full">
                                  <label className="block text-sm font-bold text-gray-700 mb-2">
                                    بارکد
                                  </label>
                                  <input
                                    type="text"
                                    value={newProductBarcode}
                                    onChange={(e) =>
                                      setNewProductBarcode(e.target.value)
                                    }
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors text-gray-900 font-mono text-left tracking-widest"
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="w-full">
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                توضیحات تکمیلی
                              </label>
                              <textarea
                                value={newProductDesc}
                                onChange={(e) =>
                                  setNewProductDesc(e.target.value)
                                }
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors text-gray-900 min-h-[100px] resize-y"
                                rows={3}
                                placeholder="توضیحات کالا که ممکن است در فاکتور چاپ شود..."
                              />
                            </div>

                            <div className="w-full">
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                آدرس تصویر کالا
                              </label>
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={newProductImageUrl}
                                  onChange={(e) =>
                                    setNewProductImageUrl(e.target.value)
                                  }
                                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors text-gray-900 text-left"
                                  placeholder="https://example.com/image.jpg"
                                  dir="ltr"
                                />
                                {newProductImageUrl && (
                                  <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden shrink-0 bg-white shadow-sm flex items-center justify-center">
                                    <img src={newProductImageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} onLoad={(e) => (e.currentTarget.style.display = 'block')} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* History Tab */}
                        {productFormTab === "history" && (
                          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            
                            {/* Purchase Price History */}
                            <div className="space-y-3">
                              <h3 className="text-lg font-extrabold text-gray-900">
                                تاریخچه تغییرات قیمت خرید
                              </h3>
                              <div className="bg-white border flex-1 border-gray-100 shadow-sm rounded-xl overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-100">
                                  <thead className="bg-gray-50/50">
                                    <tr>
                                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">
                                        تاریخ و زمان
                                      </th>
                                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">
                                        قیمت خرید
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {(() => {
                                      const purchaseHistory = currentProductPriceHistory.filter(h => h.type === 'purchase');
                                      if (purchaseHistory.length === 0) {
                                        return (
                                          <tr>
                                            <td
                                              colSpan={2}
                                              className="text-center py-6 text-sm text-gray-500"
                                            >
                                              تاریخچه‌ای برای این کالا ثبت نشده
                                              است.
                                            </td>
                                          </tr>
                                        );
                                      }
                                      return purchaseHistory
                                        .sort(
                                          (a, b) =>
                                            new Date(b.date).getTime() -
                                            new Date(a.date).getTime(),
                                        )
                                        .map((h, i) => (
                                          <tr
                                            key={i}
                                            className="hover:bg-slate-50"
                                          >
                                            <td className="px-4 py-3 text-sm text-gray-700" dir="ltr">
                                              {editingHistoryId === h.id ? (
                                                <div className="flex items-center gap-2">
                                                  <DatePicker
                                                    value={editingHistoryDate}
                                                    onChange={(date: any) => setEditingHistoryDate(date ? (convertToGregorian(date)) : new Date().toISOString())}
                                                    calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                                                    locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                                                    calendarPosition="bottom-right"
                                                    inputClass="w-full px-2 py-1 rounded border border-gray-300 text-sm"
                                                  />
                                                </div>
                                              ) : (
                                                new Date(h.date).toLocaleString("fa-IR")
                                              )}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-900 flex justify-between items-center">
                                              <span>{addCommas(h.price)}</span>
                                              {editingHistoryId === h.id ? (
                                                <div className="flex gap-2">
                                                  <button onClick={() => handleSaveHistoryDate(h)} className="text-green-600 hover:bg-green-50 p-1 rounded">
                                                    <Check className="w-4 h-4" />
                                                  </button>
                                                  <button onClick={() => setEditingHistoryId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                                                    <X className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => {
                                                    setEditingHistoryId(h.id);
                                                    setEditingHistoryDate(h.date);
                                                  }}
                                                  className="text-gray-400 hover:text-indigo-600 p-1 rounded"
                                                >
                                                  <Pencil className="w-4 h-4" />
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        ));
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Sale Price History */}
                            <div className="space-y-3">
                              <h3 className="text-lg font-extrabold text-gray-900">
                                تاریخچه تغییرات قیمت فروش
                              </h3>
                              <div className="bg-white border flex-1 border-gray-100 shadow-sm rounded-xl overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-100">
                                  <thead className="bg-gray-50/50">
                                    <tr>
                                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">
                                        تاریخ و زمان
                                      </th>
                                      <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">
                                        قیمت فروش
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {(() => {
                                      const saleHistory = currentProductPriceHistory.filter(h => h.type === 'sale');
                                      if (saleHistory.length === 0) {
                                        return (
                                          <tr>
                                            <td
                                              colSpan={2}
                                              className="text-center py-6 text-sm text-gray-500"
                                            >
                                              تاریخچه‌ای برای این کالا ثبت نشده
                                              است.
                                            </td>
                                          </tr>
                                        );
                                      }
                                      return saleHistory
                                        .sort(
                                          (a, b) =>
                                            new Date(b.date).getTime() -
                                            new Date(a.date).getTime(),
                                        )
                                        .map((h, i) => (
                                          <tr
                                            key={i}
                                            className="hover:bg-slate-50"
                                          >
                                            <td className="px-4 py-3 text-sm text-gray-700" dir="ltr">
                                              {editingHistoryId === h.id ? (
                                                <div className="flex items-center gap-2">
                                                  <DatePicker
                                                    value={editingHistoryDate}
                                                    onChange={(date: any) => setEditingHistoryDate(date ? (convertToGregorian(date)) : new Date().toISOString())}
                                                    calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                                                    locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                                                    calendarPosition="bottom-right"
                                                    inputClass="w-full px-2 py-1 rounded border border-gray-300 text-sm"
                                                  />
                                                </div>
                                              ) : (
                                                new Date(h.date).toLocaleString("fa-IR")
                                              )}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-900 flex justify-between items-center">
                                              <span>{addCommas(h.price)}</span>
                                              {editingHistoryId === h.id ? (
                                                <div className="flex gap-2">
                                                  <button onClick={() => handleSaveHistoryDate(h)} className="text-green-600 hover:bg-green-50 p-1 rounded">
                                                    <Check className="w-4 h-4" />
                                                  </button>
                                                  <button onClick={() => setEditingHistoryId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                                                    <X className="w-4 h-4" />
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => {
                                                    setEditingHistoryId(h.id);
                                                    setEditingHistoryDate(h.date);
                                                  }}
                                                  className="text-gray-400 hover:text-indigo-600 p-1 rounded"
                                                >
                                                  <Pencil className="w-4 h-4" />
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        ));
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Hidden required fields for HTML5 validation validation to still work across tabs */}
                        <div className="hidden">
                          <input
                            type="text"
                            required
                            value={newProductName}
                            onChange={() => {}}
                          />
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
                        form="productForm"
                        disabled={submittingProduct}
                        className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {submittingProduct ? (
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
                        <span>ثبت کالا / خدمات</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
  );
}
