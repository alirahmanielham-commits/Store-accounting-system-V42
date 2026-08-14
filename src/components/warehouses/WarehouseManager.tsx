import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Box,
    Search,
    Plus,
    Edit2,
    Trash2,
    CheckCircle,
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    ChevronRight,
    ChevronLeft,
    MapPin,
    User,
    Activity,
    X
, RefreshCw} from "lucide-react";

export default function WarehouseManager(props: any) {
  const {

    warehouseSubTab,
    setWarehouseSubTab,
    warehouses,
    products,
    setEditingWarehouseId,
    setIsWarehouseModalOpen
  ,
    setNewWarehouseName,
    setNewWarehouseManager,
    setNewWarehouseLocation,
    setNewWarehouseIsActive,
    recalculating,
    handleRecalculateStocks,
    handleEditWarehouse,
    confirmAction,
    handleDeleteWarehouse,
    whStockSearch,
    setWhStockSearch,
    warehouseStocks,
    formatNumber
  } = props;

  return (
    <>
      <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    {/* Header with Switcher Tab */}
                    <div className="bg-gradient-to-l from-indigo-50 to-white px-8 py-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div>
                          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                            <Box className="w-6 h-6 text-indigo-600" />
                            {warehouseSubTab === "list"
                              ? "مدیریت و شعب انبارها"
                              : "موجودی و موازنه کالاها"}
                          </h1>
                          <p className="text-sm text-gray-500 font-medium mt-1">
                            {warehouseSubTab === "list"
                              ? "مدیریت انبارهای فیزیکی، شعبه‌ها و مسیرهای نگهداری کالا"
                              : "مشاهده و موازنه دقیق‌ترین موجودی لحظه‌ای فیزیکی، رزرو شده و آماده فروش کالاها"}
                          </p>
                        </div>

                        {/* Sub-tab segment bar */}
                        <div className="flex gap-1.5 bg-indigo-150 p-1.5 rounded-xl border border-indigo-150/40">
                          <button
                            type="button"
                            onClick={() => setWarehouseSubTab("list")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${warehouseSubTab === "list" ? "bg-indigo-600 text-white shadow-xs" : "text-indigo-800 hover:bg-indigo-200/50"}`}
                          >
                            شعبه‌ها و انبارها
                          </button>
                          <button
                            type="button"
                            onClick={() => setWarehouseSubTab("stocks")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${warehouseSubTab === "stocks" ? "bg-indigo-600 text-white shadow-xs" : "text-indigo-800 hover:bg-indigo-200/50"}`}
                          >
                            تراز موجودی انبارها
                          </button>
                        </div>
                      </div>

                      {warehouseSubTab === "list" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWarehouseId(null);
                            setNewWarehouseName("");
                            setNewWarehouseManager("");
                            setNewWarehouseLocation("");
                            setNewWarehouseIsActive(true);
                            setIsWarehouseModalOpen(true);
                          }}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-sm font-semibold self-start lg:self-auto cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          انبار جدید
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={recalculating}
                          onClick={handleRecalculateStocks}
                          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 text-sm font-semibold self-start lg:self-auto cursor-pointer"
                          title="محاسبه مجدد موجودی بر اساس اسناد رسید و حواله"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${recalculating ? "animate-spin" : ""}`}
                          />
                          محاسبه مجدد موجودی انبارها
                        </button>
                      )}
                    </div>

                    {/* Sub-tab panels */}
                    {warehouseSubTab === "list" ? (
                      <div className="overflow-x-auto">
                        {warehouses.length === 0 ? (
                          <div className="py-12 text-center text-gray-500 font-medium">
                            هیچ انباری ثبت نشده است. برای شروع یک انبار جدید ثبت
                            کنید.
                          </div>
                        ) : (
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                                <th className="py-4 px-6 font-semibold">
                                  ردیف
                                </th>
                                <th className="py-4 px-6 font-semibold">
                                  نام انبار
                                </th>
                                <th className="py-4 px-6 font-semibold">
                                  مسئول انبار
                                </th>
                                <th className="py-4 px-6 font-semibold">
                                  موقعیت / مکان
                                </th>
                                <th className="py-4 px-6 font-semibold">
                                  وضعیت فعالیت
                                </th>
                                <th className="py-4 px-6 font-semibold text-center w-24">
                                  عملیات
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {(warehouses || []).map((wh, index) => (
                                <tr
                                  key={wh.id}
                                  className="hover:bg-gray-50/50 transition-colors text-gray-700"
                                >
                                  <td className="py-4 px-6 font-medium text-gray-400">
                                    {index + 1}
                                  </td>
                                  <td className="py-4 px-6 font-semibold text-gray-950">
                                    <span className="flex items-center gap-2">
                                      <Box className="w-4 h-4 text-indigo-500" />
                                      {wh.name}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-sm">
                                    {wh.manager || "-"}
                                  </td>
                                  <td className="py-4 px-6 text-sm">
                                    {wh.location || "-"}
                                  </td>
                                  <td className="py-4 px-6 text-sm">
                                    {wh.isActive ? (
                                      <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">
                                        فعال
                                      </span>
                                    ) : (
                                      <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded text-xs font-bold">
                                        غیرفعال
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 px-6 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleEditWarehouse(wh)}
                                        className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors inline-block cursor-pointer"
                                        title="ویرایش انبار"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          confirmAction(
  "آیا از حذف این انبار اطمینان دارید؟",
  () => handleDeleteWarehouse(wh.id),
  <div className="flex flex-col gap-2">
    <div><strong>نام انبار:</strong> {wh.name}</div>
  </div>
)
                                        }
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-block cursor-pointer"
                                        title="حذف انبار"
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
                    ) : (
                      <div>
                        {/* Search Stocks bar */}
                        <div className="p-5 border-b border-gray-100 bg-gray-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1 max-w-md relative">
                            <span className="absolute inset-y-0 right-3 flex items-center pr-1 text-gray-400 pointer-events-none">
                              <Search className="w-4 h-4" />
                            </span>
                            <input
                              type="text"
                              value={whStockSearch}
                              onChange={(e) => setWhStockSearch(e.target.value)}
                              placeholder="جستجوی سریع بر اساس کالا یا انبار..."
                              className="w-full pr-10 pl-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                            />
                          </div>

                          <div className="text-right text-xs text-gray-400 font-bold">
                            تعداد رکوردهای تراز:{" "}
                            <span className="text-indigo-650 font-black font-sans">
                              {
                                warehouseStocks.filter((stock) => {
                                  const prodName =
                                    products.find(
                                      (p) =>
                                        p.id?.toString() ===
                                        stock.productId?.toString(),
                                    )?.name || "";
                                  const whName =
                                    warehouses.find(
                                      (w) =>
                                        w.id?.toString() ===
                                        stock.warehouseId?.toString(),
                                    )?.name || "";
                                  const searchLower =
                                    whStockSearch.toLowerCase();
                                  return (
                                    prodName
                                      .toLowerCase()
                                      .includes(searchLower) ||
                                    whName.toLowerCase().includes(searchLower)
                                  );
                                }).length
                              }
                            </span>{" "}
                            کالا-انبار
                          </div>
                        </div>

                        {/* Recalculated stock logs table */}
                        <div className="overflow-x-auto">
                          {(() => {
                            const filteredStocks = warehouseStocks.filter(
                              (stock) => {
                                const prodName =
                                  products.find(
                                    (p) =>
                                      p.id?.toString() ===
                                      stock.productId?.toString(),
                                  )?.name || "";
                                const whName =
                                  warehouses.find(
                                    (w) =>
                                      w.id?.toString() ===
                                      stock.warehouseId?.toString(),
                                  )?.name || "";
                                const searchLower = whStockSearch.toLowerCase();
                                return (
                                  prodName
                                    .toLowerCase()
                                    .includes(searchLower) ||
                                  whName.toLowerCase().includes(searchLower)
                                );
                              },
                            );

                            if (filteredStocks.length === 0) {
                              return (
                                <div className="py-12 text-center text-gray-500 font-medium">
                                  {whStockSearch
                                    ? "هیچ رکوردی منطبق با عبارت جستجو پیدا نشد."
                                    : "هیچ رکورد موجودی ثبت نشده است. ابتدا اسناد ورود و خروج ثبت کنید."}
                                </div>
                              );
                            }

                            return (
                              <table className="w-full text-right border-collapse">
                                <thead>
                                  <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                                    <th className="py-4 px-6 font-semibold w-16 text-center">
                                      ردیف
                                    </th>
                                    <th className="py-4 px-6 font-semibold">
                                      نام کالا
                                    </th>
                                    <th className="py-4 px-6 font-semibold">
                                      انبار ذخیره‌سازی
                                    </th>
                                    <th className="py-4 px-6 font-semibold text-center bg-gray-100/30">
                                      موجودی فیزیکی
                                    </th>
                                    <th className="py-4 px-6 font-semibold text-center bg-amber-50/20">
                                      رزرو شده
                                    </th>
                                    <th className="py-4 px-6 font-semibold text-center bg-emerald-50/20 text-emerald-900">
                                      آماده فروش و تحویل
                                    </th>
                                    <th className="py-4 px-6 font-semibold text-center w-28">
                                      واحد
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 font-sans font-bold">
                                  {filteredStocks.map((stock, index) => {
                                    const associatedProd = products.find(
                                      (p) =>
                                        p.id?.toString() ===
                                        stock.productId?.toString(),
                                    );
                                    const associatedWh = warehouses.find(
                                      (w) =>
                                        w.id?.toString() ===
                                        stock.warehouseId?.toString(),
                                    );

                                    // Highlight low stock
                                    const isNegative = stock.availableStock < 0;
                                    const isZero = stock.availableStock === 0;

                                    return (
                                      <tr
                                        key={`${stock.productId}-${stock.warehouseId}`}
                                        className="hover:bg-slate-50/50 transition-colors text-gray-700"
                                      >
                                        <td className="py-4 px-6 text-center text-gray-400 font-medium">
                                          {index + 1}
                                        </td>
                                        <td className="py-4 px-6 text-gray-950 font-semibold">
                                          <span className="flex flex-col">
                                            <span className="font-extrabold text-slate-900">
                                              {associatedProd?.name ||
                                                "کالای ناشناخته"}
                                            </span>
                                            {associatedProd?.code && (
                                              <span className="text-[10px] text-gray-400 mt-0.5">
                                                کد کالا: {associatedProd.code}
                                              </span>
                                            )}
                                          </span>
                                        </td>
                                        <td className="py-4 px-6 text-indigo-900">
                                          <span className="flex items-center gap-1.5 text-xs text-indigo-950">
                                            <Box className="w-3.5 h-3.5 text-indigo-500" />
                                            {associatedWh?.name ||
                                              "انبار صادرکننده"}
                                          </span>
                                        </td>
                                        <td className="py-4 px-6 text-center bg-gray-100/10 font-bold text-gray-800 text-sm">
                                          {formatNumber(stock.physicalStock)}
                                        </td>
                                        <td className="py-4 px-6 text-center bg-amber-50/10 font-bold text-amber-700 text-sm">
                                          {formatNumber(stock.reservedStock)}
                                        </td>
                                        <td
                                          className={`py-4 px-6 text-center font-black text-sm bg-emerald-50/10 ${
                                            isNegative
                                              ? "text-red-650 bg-rose-50/30"
                                              : isZero
                                                ? "text-gray-400"
                                                : "text-emerald-700"
                                          }`}
                                        >
                                          <span className="inline-flex items-center gap-1.5">
                                            {formatNumber(stock.availableStock)}
                                            {isNegative && (
                                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">
                                                کسری موجودی
                                              </span>
                                            )}
                                          </span>
                                        </td>
                                        <td className="py-4 px-6 text-center text-xs text-gray-500">
                                          {associatedProd?.unit || "عدد"}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </motion.div>
    </>
  );
}
