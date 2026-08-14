import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as lucide from 'lucide-react';
const { Tag, Wallet, Ban, ChevronDown, Search, Plus, Filter, FileText, Download, CheckCircle, Edit2, Trash2, Printer, Check, X, ArrowUpRight, ArrowDownRight, ArrowRight, CornerDownLeft, Package, User, Clock, CheckCircle2, ChevronLeft, ChevronRight, Share2, Eye, Truck, MoreVertical, DollarSign, RefreshCw, XCircle } = lucide as any;

export default function InvoicesList(props: any) {
  const {
    invoices, invoiceSearchQuery, setInvoiceSearchQuery, persons, activeTab, setActiveTab,
    purchaseFilter, setPurchaseFilter, formatCurrency, getPersonDisplayName, formatDateDisplay,
    calculateInvoiceTotal, numToPersianWords, setInvoiceWarehouseId, warehouses, setCustomerId,
    handlePrintInvoice, getRoleName, setEditingInvoiceId, handleDeleteInvoice, handleConvertProformaToSale,
    handlePayPurchase, handleReturnSale, handleReturnPurchase, storeSettings,
    invoiceCurrentPage, setInvoiceCurrentPage, invoicePageSize, setInvoicePageSize, toPersianDigits,
    listFilter, setListFilter, invoiceGroupMode, setInvoiceGroupMode, List, clearDraft, setInvoiceType, setWarehouseOperationType, Calendar, renderPersonLink,
    products, setPricingWizardItems, setPricingWizardInvoice, setSuccessMsg, setReceiptPersonId, setViewingInvoice, handleEditInvoiceAction, handleVoidInvoice, handleFastWarehouseReceipt,
    ...rest
  } = props;

  
  const [fastReceiptInvoice, setFastReceiptInvoice] = useState<any>(null);
  const [fastReceiptWarehouseId, setFastReceiptWarehouseId] = useState("");

  const [invoiceTabFilter, setInvoiceTabFilter] = useState("all");

  useEffect(() => {
    setInvoiceTabFilter("all");
  }, [activeTab]);

  const getInvoiceWarehouseStatus = (inv: any) => {
    if (!inv) return "pending";
    const isReceiptType = inv.type === "purchase" || inv.type === "sale_return";
    const docType = isReceiptType ? "warehouse_receipt" : "warehouse_remittance";

    const linkedDocs = (invoices || []).filter(
      (wh: any) =>
        wh.type === docType &&
        wh.sourceInvoiceId?.toString() === inv.id?.toString() &&
        wh.status !== "voided" &&
        !wh.isDeleted,
    );

    if (!linkedDocs || linkedDocs.length === 0) {
      return "pending";
    }

    const processedAmounts: Record<string, number> = {};
    let totalProcessedQty = 0;

    linkedDocs.forEach((doc: any) => {
      if (doc.items) {
        doc.items.forEach((item: any) => {
          const key = String(item.productId || item.productName || "");
          if (!key) return;
          const qty = Number(item.quantity) || 0;
          processedAmounts[key] = (processedAmounts[key] || 0) + qty;
          totalProcessedQty += qty;
        });
      }
    });

    if (totalProcessedQty <= 0) {
      return "pending";
    }

    const invItems = inv.items || [];
    let hasRemaining = false;
    let hasPhysicalItems = false;

    for (const it of invItems) {
      const prod = (products || []).find(
        (p: any) => p.id?.toString() === it.productId?.toString(),
      );
      if (prod?.type === "service") continue;

      hasPhysicalItems = true;
      const key = String(it.productId || it.productName || "");
      const processed = key ? processedAmounts[key] || 0 : 0;
      const required = Number(it.quantity) || 0;

      if (required - processed > 0.0001) {
        hasRemaining = true;
      }
    }

    if (!hasPhysicalItems) {
      return "completed";
    }

    if (hasRemaining) {
      return "partial";
    } else {
      return "completed";
    }
  };

        const activePurchases = invoices
          .filter((i) => i.type === "purchase")
          .filter((inv) => {
            if (!invoiceSearchQuery) return true;
            const term = invoiceSearchQuery.toLowerCase();
            const p = persons.find(
              (p) => p.id.toString() === inv.customerId.toString(),
            );
            const pName = (p?.alias || p?.name || "نامشخص").toLowerCase();
            const invNum = (inv.invoiceNumber || "").toLowerCase();
            const sellNum = (inv.sellerInvoiceNumber || "").toLowerCase();
            return (
              pName.includes(term) ||
              invNum.includes(term) ||
              sellNum.includes(term)
            );
          });

        const totalPurchasesCount = activePurchases.length;
        const receivedPurchasesCount = activePurchases.filter((inv) =>
          getInvoiceWarehouseStatus(inv) !== "pending",
        ).length;
        const pendingPurchasesCount = Math.max(
          0,
          totalPurchasesCount - receivedPurchasesCount,
        );

        const filteredInvoicesList = invoices
          .filter((i) => {
            if (activeTab === "list_sale") {
              if (i.type !== "sale" && i.type !== "proforma") return false;
              
              const isRemitted = getInvoiceWarehouseStatus(i) !== "pending";
              
              if (invoiceTabFilter === "proforma") return i.type === "proforma";
              if (invoiceTabFilter === "sale") return i.type === "sale";
              if (invoiceTabFilter === "remitted") return i.type === "sale" && isRemitted;
              if (invoiceTabFilter === "pending_remit") return i.type === "sale" && !isRemitted;
              if (invoiceTabFilter === "paid") return i.type === "sale" && i.paymentStatus === "paid";
              if (invoiceTabFilter === "unpaid") return i.type === "sale" && (i.paymentStatus === "unpaid" || i.paymentStatus === "partial");
              
              return true;
            } else if (activeTab === "list_purchase") {
              if (i.type !== "purchase") return false;
              const isReceived = getInvoiceWarehouseStatus(i) !== "pending";
              
              if (invoiceTabFilter === "received") return isReceived;
              if (invoiceTabFilter === "pending_receive") return !isReceived;
              if (invoiceTabFilter === "paid") return i.paymentStatus === "paid";
              if (invoiceTabFilter === "unpaid") return i.paymentStatus === "unpaid" || i.paymentStatus === "partial";
              
              return true;
            } else if (activeTab === "list_warehouse_docs") {
              return typeof listFilter !== "undefined" &&
                listFilter === "receipt"
                ? i.type === "warehouse_receipt"
                : typeof listFilter !== "undefined" &&
                    listFilter === "remittance"
                  ? i.type === "warehouse_remittance"
                  : i.type === "warehouse_receipt" ||
                    i.type === "warehouse_remittance";
            } else if (activeTab === "list_sale_return") {
              return i.type === "sale_return";
            } else if (activeTab === "list_purchase_return") {
              return i.type === "purchase_return";
            }
            return false;
          })
          .filter((inv) => {
            if (!invoiceSearchQuery) return true;
            const term = invoiceSearchQuery.toLowerCase();
            const p = persons.find(
              (p) => p.id.toString() === inv.customerId?.toString(),
            );
            const pName = (p?.alias || p?.name || "نامشخص").toLowerCase();
            const invNum = (inv.invoiceNumber || "").toLowerCase();
            const sellNum = (inv.sellerInvoiceNumber || "").toLowerCase();
            return (
              pName.includes(term) ||
              invNum.includes(term) ||
              sellNum.includes(term)
            );
          });

        const invoiceTotalPages = Math.ceil(
          filteredInvoicesList.length / invoicePageSize,
        );
        const invoiceSafeCurrentPage = Math.max(
          1,
          Math.min(invoiceCurrentPage, invoiceTotalPages),
        );
        const paginatedFilteredInvoicesList = filteredInvoicesList.slice(
          (invoiceSafeCurrentPage - 1) * invoicePageSize,
          invoiceSafeCurrentPage * invoicePageSize,
        );

        let groupedInvoices: { groupName: string; invoices: any[] }[] = [];
        if (invoiceGroupMode === "none") {
          groupedInvoices = [
            { groupName: "همه", invoices: paginatedFilteredInvoicesList },
          ];
        } else {
          const groupMap = new Map<string, any[]>();
          paginatedFilteredInvoicesList.forEach((inv) => {
            let gName = "نامشخص";
            if (inv.date || inv.jalaliDate) {
              const parts = inv.date || inv.jalaliDate.split("/");
              if (parts.length === 3) {
                const m = parseInt(parts[1], 10);
                if (invoiceGroupMode === "month") {
                  const months = [
                    "فروردین",
                    "اردیبهشت",
                    "خرداد",
                    "تیر",
                    "مرداد",
                    "شهریور",
                    "مهر",
                    "آبان",
                    "آذر",
                    "دی",
                    "بهمن",
                    "اسفند",
                  ];
                  gName = `${months[m - 1] || m} ${parts[0]}`;
                } else if (invoiceGroupMode === "season") {
                  const seasons = [
                    "فصل بهار",
                    "فصل تابستان",
                    "فصل پاییز",
                    "فصل زمستان",
                  ];
                  const sIdx = Math.floor((m - 1) / 3);
                  gName = `${seasons[sIdx] || "نامشخص"} ${parts[0]}`;
                }
              }
            }
            if (!groupMap.has(gName)) groupMap.set(gName, []);
            groupMap.get(gName)!.push(inv);
          });
          groupedInvoices = Array.from(groupMap.entries()).map(([k, v]) => ({
            groupName: k,
            invoices: v,
          }));
        }

        return (
    <>
      <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                <div className="flex flex-wrap items-center gap-4">
                  <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                    <List className="w-6 h-6 text-indigo-600" />
                    {activeTab === "list_sale"
                      ? "لیست فاکتورهای فروش"
                      : activeTab === "list_purchase"
                        ? "لیست فاکتورهای خرید"
                        : activeTab === "list_sale_return"
                          ? "لیست فاکتور برگشت از فروش"
                          : activeTab === "list_purchase_return"
                            ? "لیست فاکتور برگشت از خرید"
                            : "اسناد انبار (رسید و حواله)"}
                  </h2>
                  <div className="flex gap-2">
                     
                              <button
                        onClick={() => {
                           clearDraft();
                           if (activeTab === "list_sale") setActiveTab("create_sale");
                           else if (activeTab === "list_purchase") setActiveTab("create_purchase");
                           else if (activeTab === "list_sale_return") setActiveTab("create_sale_return");
                           else if (activeTab === "list_purchase_return") setActiveTab("create_purchase_return");
                           else if (activeTab === "list_warehouse_docs") {
                               setInvoiceType("warehouse_receipt");
                               setWarehouseOperationType("purchase_invoice");
                               setActiveTab("create_warehouse_doc");
                           }
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
                     >
                        <Plus className="w-4 h-4" /> 
                        {activeTab === "list_sale" ? "ثبت فاکتور فروش جدید"
                          : activeTab === "list_purchase" ? "ثبت فاکتور خرید جدید"
                          : activeTab === "list_sale_return" ? "ثبت برگشت از فروش جدید"
                          : activeTab === "list_purchase_return" ? "ثبت برگشت از خرید جدید"
                          : "ثبت رسید انبار جدید"}
                     </button>
                     {activeTab === "list_warehouse_docs" && (
                        <button
                           onClick={() => {
                               setInvoiceType("warehouse_remittance");
                               setWarehouseOperationType("sales_invoice");
                               setActiveTab("create_warehouse_doc");
                           }}
                           className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-sm"
                        >
                           <Plus className="w-4 h-4" /> ثبت حواله انبار جدید
                        </button>
                     )}
                  </div>
                </div>
                <div className="relative w-full md:w-96">
                  <Search className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="جستجوی حرفه‌ای (شماره، شخص)..."
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold placeholder-gray-400 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="w-full flex-wrap flex items-center justify-between gap-4 px-2 py-3 bg-slate-50/50 rounded-xl border border-slate-100/50 mt-2">
                {(activeTab === "list_sale" ||
                  activeTab === "list_purchase") && (
                  <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-500 mr-2 ml-1">
                      گروه‌بندی:
                    </span>
                    <button
                      onClick={() => setInvoiceGroupMode("none")}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${invoiceGroupMode === "none" ? "bg-indigo-100 text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      بدون گروه
                    </button>
                    <button
                      onClick={() => setInvoiceGroupMode("month")}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${invoiceGroupMode === "month" ? "bg-indigo-100 text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      براساس ماه
                    </button>
                    <button
                      onClick={() => setInvoiceGroupMode("season")}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${invoiceGroupMode === "season" ? "bg-indigo-100 text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      براساس فصل
                    </button>
                  </div>
                )}
                {activeTab === "list_warehouse_docs" && (
                  <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
                    <button
                      onClick={() => setListFilter("all")}
                      className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${listFilter === "all" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}
                    >
                      همه اسناد
                    </button>
                    <button
                      onClick={() => setListFilter("receipt")}
                      className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${listFilter === "receipt" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}
                    >
                      ⬇️ رسید (ورود)
                    </button>
                    <button
                      onClick={() => setListFilter("remittance")}
                      className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${listFilter === "remittance" ? "bg-rose-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}
                    >
                      ⬆️ حواله (خروج)
                    </button>
                  </div>
                )}
                {activeTab === "list_sale" && (
                  <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto">
                    <button onClick={() => setInvoiceTabFilter("all")} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${invoiceTabFilter === "all" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}>
                      همه موارد
                    </button>
                    <button onClick={() => setInvoiceTabFilter("sale")} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${invoiceTabFilter === "sale" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}>
                      فقط فاکتورها
                    </button>
                    <button onClick={() => setInvoiceTabFilter("proforma")} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${invoiceTabFilter === "proforma" ? "bg-slate-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}>
                      فقط پیش‌فاکتورها
                    </button>
                    <button onClick={() => setInvoiceTabFilter("remitted")} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${invoiceTabFilter === "remitted" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}>
                      حواله شده
                    </button>
                    <button onClick={() => setInvoiceTabFilter("paid")} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${invoiceTabFilter === "paid" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}>
                      تسویه شده
                    </button>
                    <button onClick={() => setInvoiceTabFilter("unpaid")} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${invoiceTabFilter === "unpaid" ? "bg-rose-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}>
                      تسویه نشده
                    </button>
                  </div>
                )}
                {activeTab === "list_purchase" && (
                  <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto">
                    <button onClick={() => setInvoiceTabFilter("all")} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${invoiceTabFilter === "all" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}>
                      همه فاکتورها
                    </button>
                    <button onClick={() => setInvoiceTabFilter("received")} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${invoiceTabFilter === "received" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}>
                      رسید شده
                    </button>
                    <button onClick={() => setInvoiceTabFilter("pending_receive")} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${invoiceTabFilter === "pending_receive" ? "bg-rose-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}>
                      رسید نشده
                    </button>
                    <button onClick={() => setInvoiceTabFilter("paid")} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${invoiceTabFilter === "paid" ? "bg-emerald-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}>
                      تسویه شده
                    </button>
                    <button onClick={() => setInvoiceTabFilter("unpaid")} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${invoiceTabFilter === "unpaid" ? "bg-rose-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"}`}>
                      تسویه نشده
                    </button>
                  </div>
                )}
              </div>

              <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 text-slate-600 border-b border-gray-200 uppercase font-black text-xs">
                    <tr>
                      <th className="p-4">شماره</th>
                      {[
                        "list_purchase",
                        "list_sale",
                        "list_sale_return",
                        "list_purchase_return",
                      ].includes(activeTab) && (
                        <th className="p-4">عنوان / شرح</th>
                      )}
                      {activeTab.includes("warehouse") && (
                        <th className="p-4">نوع سند</th>
                      )}
                      <th className="p-4">طرف حساب</th>
                      <th className="p-4">تاریخ</th>
                      {activeTab.includes("warehouse") ? (
                        <th className="p-4 text-center">انبار</th>
                      ) : (
                        <th className="p-4 text-left">مبلغ کل</th>
                      )}
                      {[
                        "list_purchase",
                        "list_sale",
                        "list_sale_return",
                        "list_purchase_return",
                      ].includes(activeTab) && (
                        <>
                          <th className="p-4 text-left">دریافتی/پرداختی</th>
                          <th className="p-4 text-left">مانده فاکتور</th>
                          <th className="p-4 text-center">وضعیت تسویه</th>
                          <th className="p-4 text-center">وضعیت انبار</th>
                        </>
                      )}
                      <th className="p-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {groupedInvoices.map((group) => (
                      <React.Fragment key={group.groupName}>
                        {invoiceGroupMode !== "none" &&
                          group.invoices.length > 0 && (
                            <tr className="bg-slate-100/60 border-y border-slate-200 shadow-sm relative z-10">
                              <td colSpan={10} className="p-3 text-right">
                                <div className="flex justify-between items-center px-2">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-white text-indigo-600 p-1.5 rounded-lg shadow-sm border border-indigo-100">
                                      {invoiceGroupMode === "month" ? (
                                        <Calendar className="w-4 h-4" />
                                      ) : (
                                        <List className="w-4 h-4" />
                                      )}
                                    </div>
                                    <span className="font-extrabold text-sm text-slate-800">
                                      {group.groupName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="bg-white/80 text-slate-500 text-[11px] font-bold px-2 py-1 rounded shadow-sm border border-slate-200">
                                      مجموع:{" "}
                                      <span className="text-slate-800 tabular-nums">
                                        {toPersianDigits(group.invoices.length)}
                                      </span>
                                    </span>
                                    <span className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2 py-1 rounded shadow-sm border border-indigo-100">
                                      مبلغ کل:{" "}
                                      <span className="tabular-nums">
                                        {toPersianDigits(
                                          formatCurrency(
                                            group.invoices.reduce(
                                              (a, b) =>
                                                a + (b.totalAmount || 0),
                                              0,
                                            ),
                                          ),
                                        )}
                                      </span>{" "}
                                      تومان
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        {(group.invoices || []).map((inv, invIdx) => (
                          <tr
                            key={inv.id ? `inv-${inv.id}-${invIdx}` : `invIdx-${group.groupName}-${invIdx}`}
                            className={`transition-colors ${inv.status === "voided" ? "bg-rose-50/60 hover:bg-rose-100/60 opacity-80" : "hover:bg-gray-50/80"}`}
                          >
                            <td className="p-4 font-sans text-right font-black text-slate-705 text-sm whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span 
                                  onClick={() => setViewingInvoice && setViewingInvoice(inv)}
                                  className="cursor-pointer hover:text-indigo-600 hover:underline transition-colors decoration-dashed underline-offset-4"
                                  title="مشاهده پیش‌نمایش فاکتور"
                                >
                                  #{toPersianDigits(inv.invoiceNumber)}
                                </span>
                                {(inv.isDraft || inv.status === "draft") && (
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-amber-200">
                                    پیش‌نویس
                                  </span>
                                )}
                                {inv.status === "voided" && (
                                  <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-gray-200">
                                    ابطال شده
                                  </span>
                                )}
                              </div>
                            </td>
                            {[
                              "list_purchase",
                              "list_sale",
                              "list_sale_return",
                              "list_purchase_return",
                            ].includes(activeTab) && (
                              <td
                                className="p-4 font-bold text-slate-800 text-xs truncate max-w-[150px]"
                                title={
                                  inv.title ||
                                  (activeTab === "list_sale"
                                    ? "فاکتور فروش"
                                    : "فاکتور خرید")
                                }
                              >
                                <div>
                                  {inv.title ||
                                    (activeTab === "list_sale"
                                      ? "فاکتور فروش"
                                      : "فاکتور خرید")}
                                </div>
                                {inv.note && (
                                  <div className="text-[10px] text-gray-500 font-normal mt-1 opacity-80" title={inv.note}>
                                    {inv.note}
                                  </div>
                                )}
                                {(inv.type === "purchase" ||
                                  inv.type === "purchase_return") &&
                                  inv.sellerInvoiceNumber && (
                                    <div
                                      className="text-[10px] text-emerald-600 font-mono mt-1"
                                      dir="rtl"
                                    >
                                      ش.فروشنده:{" "}
                                      {toPersianDigits(inv.sellerInvoiceNumber)}
                                    </div>
                                  )}
                              </td>
                            )}
                            {activeTab.includes("warehouse") && (
                              <td className="p-4">
                                {inv.type === "warehouse_receipt" ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded">
                                    رسید ورود
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded">
                                    حواله خروج
                                  </span>
                                )}
                              </td>
                            )}
                            <td className="p-4">
                              {renderPersonLink(
                                inv.customerId,
                                persons.find(
                                  (p) =>
                                    p.id.toString() ===
                                    inv.customerId?.toString(),
                                )?.name,
                              )}
                            </td>
                            <td className="p-4">
                              <div
                                className="flex items-center gap-1.5 justify-start text-xs font-bold text-slate-650"
                                dir="rtl"
                              >
                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="font-sans font-black text-xs text-slate-700">
                                  {formatDateDisplay(inv.date || inv.jalaliDate, storeSettings?.calendarType)}
                                </span>
                              </div>
                              {inv.dueDate && (
                                <div
                                  className="flex items-center gap-1.5 justify-start text-xs font-bold text-slate-650 mt-1"
                                  dir="rtl"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                                  <span className="font-sans font-black text-[10px] text-rose-600">
                                    سررسید: {formatDateDisplay(inv.dueDate, storeSettings?.calendarType)}
                                  </span>
                                </div>
                              )}
                            </td>
                            {activeTab.includes("warehouse") ? (
                              <td className="p-4 font-bold text-indigo-900 text-center">
                                {warehouses.find(
                                  (w) =>
                                    w.id?.toString() ===
                                    inv.warehouseId?.toString(),
                                )?.name || "نامشخص"}
                              </td>
                            ) : (
                              <td className="p-4 text-left">
                                <span className="font-sans font-black text-sm text-indigo-950 bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-indigo-100/30 inline-block transition-all shadow-2xs">
                                  {toPersianDigits(
                                    formatCurrency(inv.totalAmount || 0),
                                  )}{" "}
                                  <span className="text-[10px] text-indigo-605 font-extrabold mr-1">
                                    {inv.currency || storeSettings.currency}
                                  </span>
                                </span>
                              </td>
                            )}
                            {[
                              "list_purchase",
                              "list_sale",
                              "list_sale_return",
                              "list_purchase_return",
                            ].includes(activeTab) && (
                              <>
                                <td className="p-4 text-left">
                                  <span className="font-sans font-extrabold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 flex items-center gap-1 w-max ml-0 mr-auto rounded-lg">
                                    {toPersianDigits(
                                      formatCurrency(inv.paidAmount || 0),
                                    )}{" "}
                                    <span className="text-[9px] text-emerald-700">
                                      {inv.currency || storeSettings.currency}
                                    </span>
                                  </span>
                                </td>
                                <td className="p-4 text-left">
                                  <span className="font-sans font-extrabold text-xs text-rose-700 bg-rose-50 px-2.5 py-1.5 flex items-center gap-1 w-max ml-0 mr-auto rounded-lg">
                                    {toPersianDigits(
                                      formatCurrency(
                                        Math.max(
                                          (inv.totalAmount || 0) -
                                            (inv.paidAmount || 0),
                                          0,
                                        ),
                                      ),
                                    )}{" "}
                                    <span className="text-[9px] text-rose-705">
                                      {inv.currency || storeSettings.currency}
                                    </span>
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  {inv.paymentStatus === "paid" ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-1 font-bold rounded">
                                      تسویه کامل
                                    </span>
                                  ) : inv.paymentStatus === "partial" ? (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] px-2 font-bold py-1 rounded">
                                      علی‌الحساب
                                    </span>
                                  ) : (
                                    <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-1 font-bold rounded">
                                      پرداخت نشده
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-xs font-bold text-center">
                                  {(() => {
                                    const status = getInvoiceWarehouseStatus(inv);
                                    const isReceiptType =
                                      inv.type === "purchase" || inv.type === "sale_return";
                                    if (status === "completed") {
                                      return (
                                        <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                          {isReceiptType ? "رسید شده" : "حواله شده"}
                                        </span>
                                      );
                                    } else if (status === "partial") {
                                      return (
                                        <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                          {isReceiptType ? "تعدادی رسید شده" : "تعدادی حواله شده"}
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="text-amber-500 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                          {isReceiptType ? "در انتظار رسید" : "در انتظار حواله"}
                                        </span>
                                      );
                                    }
                                  })()}
                                </td>
                              </>
                            )}
                            <td className="p-4 align-middle"><div className="flex items-center justify-center gap-1 flex-nowrap w-max mx-auto bg-slate-50/80 p-1 rounded-xl border border-slate-100">
                              {activeTab === "list_purchase" && (
                                <button
                                  onClick={() => {
                                    const newWizardItems = inv.items
                                      .filter((it: any) => {
                                        const prod = products.find(
                                          (p) => p.id === it.productId,
                                        );
                                        return prod && prod.type !== "service";
                                      })
                                      .map((it: any) => {
                                        const prod = products.find(
                                          (p) => p.id === it.productId,
                                        );
                                        let basePurchasePrice = Number(it.unitPrice) || 0;
                                        if (it.isSecondaryUnit && prod?.unitRatio && prod.unitRatio > 0) {
                                          basePurchasePrice = Number((basePurchasePrice / prod.unitRatio).toFixed(4));
                                        }
                                        return {
                                          productId: it.productId,
                                          productName: it.productName,
                                          purchasePrice: basePurchasePrice,
                                          marginPercent: 0,
                                          salePrice: prod
                                            ? Number(prod.price)
                                            : 0,
                                        };
                                      });
                                    if (newWizardItems.length > 0) {
                                      setPricingWizardItems(newWizardItems);
                                      setPricingWizardInvoice(inv);
                                    } else {
                                      setSuccessMsg(
                                        "هیچ کالای قابل قیمت‌گذاری در این فاکتور وجود ندارد (یا همه خدمات هستند).",
                                      );
                                    }
                                  }}
                                  className="p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg cursor-pointer bg-transparent border-none"
                                  title="ثبت و چاپ قیمت فروش"
                                >
                                  <Tag className="w-4 h-4" />
                                </button>
                              )}
                              {inv.status !== "voided" && !activeTab.includes("warehouse") && (
                                <button
                                  onClick={() => {
                                    if (
                                      inv.type === "sale" ||
                                      inv.type === "purchase_return"
                                    ) {
                                      setReceiptPersonId(inv.personId);
                                      setActiveTab?.("create_receive_receipt");
                                    } else if (
                                      inv.type === "purchase" ||
                                      inv.type === "sale_return"
                                    ) {
                                      setReceiptPersonId(inv.personId);
                                      setActiveTab?.("create_pay_receipt");
                                    }
                                  }}
                                  className="p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg cursor-pointer bg-transparent border-none"
                                  title={
                                    inv.type === "sale" ||
                                    inv.type === "purchase_return"
                                      ? "ثبت دریافت وجه"
                                      : "ثبت پرداخت وجه"
                                  }
                                >
                                  <Wallet className="w-4 h-4" />
                                </button>
                              )}
                              
                              {inv.type === "purchase" && inv.status !== "voided" && getInvoiceWarehouseStatus(inv) !== "completed" && (
                                <button
                                  onClick={() => {
                                    setFastReceiptInvoice(inv);
                                  }}
                                  className="p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg cursor-pointer bg-transparent border-none"
                                  title="رسید سریع به انبار"
                                >
                                  <Package className="w-4 h-4" />
                                </button>
                              )}
<button
                                onClick={() => {
                                  setViewingInvoice(inv);
                                }}
                                className="p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg cursor-pointer bg-transparent border-none"
                                title={activeTab.includes("warehouse") ? "مشاهده نهایی سند" : "مشاهده نهایی فاکتور"}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {inv.status !== "voided" && (
                                <button
                                  onClick={() => handleEditInvoiceAction(inv)}
                                  className="p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 rounded-lg cursor-pointer bg-transparent border-none"
                                  title={activeTab.includes("warehouse") ? "ویرایش سند (بازگشت به پیش‌نویس)" : "ویرایش فاکتور (بازگشت به پیش‌نویس)"}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              {inv.status !== "voided" && (
                                <button
                                  onClick={() => handleVoidInvoice(inv.id)}
                                  className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg cursor-pointer bg-transparent border-none"
                                  title={activeTab.includes("warehouse") ? "ابطال سند انبار" : "ابطال فاکتور"}
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                              {inv.status !== "voided" && (
                                <button
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  className="p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg cursor-pointer bg-transparent border-none"
                                  title="حذف دائمی"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {filteredInvoicesList.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="p-8 text-center text-gray-400"
                        >
                          هیچ سندی یافت نشد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Beautiful Pagination Footer */}
            {invoiceTotalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 rounded-b-2xl border-x border-b border-gray-100">
                <div className="text-xs text-slate-500 font-bold">
                  نمایش ردیف‌های{" "}
                  <span className="text-slate-850 font-sans font-black">
                    {(
                      (invoiceSafeCurrentPage - 1) * invoicePageSize +
                      1
                    ).toLocaleString("fa-IR")}
                  </span>{" "}
                  تا{" "}
                  <span className="text-slate-850 font-sans font-black">
                    {Math.min(
                      filteredInvoicesList.length,
                      invoiceSafeCurrentPage * invoicePageSize,
                    ).toLocaleString("fa-IR")}
                  </span>{" "}
                  از مجموع{" "}
                  <span className="text-indigo-600 font-sans font-bold">
                    {filteredInvoicesList.length.toLocaleString("fa-IR")}
                  </span>{" "}
                  سند یافت‌شده
                </div>

                <div className="flex items-center gap-1.5" dir="ltr">
                  <button
                    disabled={invoiceSafeCurrentPage === 1}
                    onClick={() =>
                      setInvoiceCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                    title="صفحه قبل"
                  >
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </button>

                  <div className="flex items-center gap-1 px-2 font-sans font-black text-sm">
                    {Array.from({ length: invoiceTotalPages })
                      .map((_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === invoiceTotalPages ||
                          Math.abs(p - invoiceSafeCurrentPage) <= 1,
                      )
                      .map((p, i, arr) => (
                        <React.Fragment key={p}>
                          {i > 0 && arr[i - 1] !== p - 1 && (
                            <span className="text-slate-300 px-1">...</span>
                          )}
                          <button
                            onClick={() => setInvoiceCurrentPage(p)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-3xs cursor-pointer ${
                              invoiceSafeCurrentPage === p
                                ? "bg-indigo-600 text-white border border-indigo-700 shadow-indigo-600/30"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {p.toLocaleString("fa-IR")}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>

                  <button
                    disabled={invoiceSafeCurrentPage === invoiceTotalPages}
                    onClick={() =>
                      setInvoiceCurrentPage((prev) =>
                        Math.min(invoiceTotalPages, prev + 1),
                      )
                    }
                    className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                    title="صفحه بعد"
                  >
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold">
                    نمایش:
                  </span>
                  <select
                    value={invoicePageSize}
                    onChange={(e) => {
                      setInvoicePageSize(Number(e.target.value));
                      setInvoiceCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 text-slate-700 text-xs font-sans font-bold rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                    dir="ltr"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            )}
          </motion.div>

      {/* Fast Warehouse Receipt Modal */}
      <AnimatePresence>
        {fastReceiptInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <div className="p-6">
                <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
                  <Package className="w-6 h-6 text-emerald-500" />
                  رسید سریع انبار
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  لطفا انبار مقصد برای فاکتور خرید شماره {fastReceiptInvoice.invoiceNumber || fastReceiptInvoice.id} را انتخاب کنید:
                </p>
                <div className="space-y-4">
                  <select
                    value={fastReceiptWarehouseId}
                    onChange={(e) => setFastReceiptWarehouseId(e.target.value)}
                    className="w-full p-3 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30 text-sm font-bold text-emerald-900 outline-none"
                  >
                    <option value="">-- انتخاب انبار --</option>
                    {(warehouses || []).map((wh: any) => (
                      <option key={wh.id} value={wh.id}>{wh.title}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => {
                      setFastReceiptInvoice(null);
                      setFastReceiptWarehouseId("");
                    }}
                    className="flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={() => {
                      handleFastWarehouseReceipt(fastReceiptInvoice, fastReceiptWarehouseId);
                      setFastReceiptInvoice(null);
                      setFastReceiptWarehouseId("");
                    }}
                    disabled={!fastReceiptWarehouseId}
                    className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-200 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-sm"
                  >
                    ثبت رسید انبار
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}