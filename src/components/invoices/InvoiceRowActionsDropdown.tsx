import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  Printer,
  Tag,
  Package,
  Wallet,
  Edit2,
  Ban,
  Trash2,
  ChevronDown,
  SlidersHorizontal,
  CheckCircle2,
  Barcode,
  RotateCcw,
  FilePlus,
  Truck,
  MessageSquare,
  ArrowRightLeft,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InvoiceRowActionsDropdownProps {
  invoice: any;
  activeTab: string;
  products: any[];
  warehouses: any[];
  currency: string;
  isVoided: boolean;
  whStatus: string;
  onView: () => void;
  onDirectPrint: () => void;
  onOpenPricingWizard?: () => void;
  onFastReceipt?: () => void;
  onFastRemittance?: () => void;
  onPaymentReceipt?: () => void;
  onConvertProformaToSale?: () => void;
  onReturnInvoice?: () => void;
  onEdit?: () => void;
  onVoid?: () => void;
  onDelete?: () => void;
  onApprovePurchase?: () => void;
  onApproveWarehouseReceipt?: () => void;
  onQueueSms?: () => void;
  onConvertConsignmentToFinal?: () => void;
  onReturnConsignmentGoods?: () => void;
  onPrintConsignmentReceipt?: () => void;
}

export default function InvoiceRowActionsDropdown({
  invoice,
  activeTab,
  products,
  warehouses,
  currency,
  isVoided,
  whStatus,
  onView,
  onDirectPrint,
  onOpenPricingWizard,
  onFastReceipt,
  onFastRemittance,
  onPaymentReceipt,
  onConvertProformaToSale,
  onReturnInvoice,
  onEdit,
  onVoid,
  onDelete,
  onApprovePurchase,
  onApproveWarehouseReceipt,
  onQueueSms,
  onConvertConsignmentToFinal,
  onReturnConsignmentGoods,
  onPrintConsignmentReceipt
}: InvoiceRowActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 230;
    const estimatedHeight = 320;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    const top = openUp ? rect.top - 6 : rect.bottom + 6;
    // Align to the right edge in RTL (since rect.right is the rightmost border)
    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    setCoords({ top, left, openUp });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const isPurchase = invoice.type === "purchase" || activeTab === "list_purchase";
  const isWarehouseDoc = invoice.type === "warehouse_receipt" || invoice.type === "warehouse_remittance" || activeTab === "list_warehouse_docs";
  const isReceipt = invoice.type === "warehouse_receipt";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border cursor-pointer select-none group ${
          isOpen
            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 hover:border-slate-300"
        }`}
        title="عملیات فاکتور"
      >
        <SlidersHorizontal
          className={`w-3.5 h-3.5 transition-colors ${
            isOpen ? "text-white" : "text-indigo-600 group-hover:text-indigo-700"
          }`}
        />
        <span>عملیات</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white" : "text-slate-400 group-hover:text-slate-600"
          }`}
        />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: coords.openUp ? 6 : -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: coords.openUp ? 6 : -6 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              style={{
                position: "fixed",
                top: coords.openUp ? undefined : coords.top,
                bottom: coords.openUp ? window.innerHeight - coords.top : undefined,
                left: coords.left,
                width: 230,
                zIndex: 99999
              }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-1.5 text-right font-sans divide-y divide-slate-100 overflow-hidden"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Group 1: Preview & Print */}
              <div className="py-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onView();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-500 group-hover:text-indigo-600" />
                    <span>مشاهده پیش‌نمایش</span>
                  </div>
                  <span className="text-[10px] text-slate-400 group-hover:text-indigo-500">سند</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onDirectPrint();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-slate-500 group-hover:text-slate-700" />
                    <span>{isWarehouseDoc ? "چاپ مستقیم سند انبار" : "چاپ مستقیم فاکتور"}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">سریع</span>
                </button>

                {onQueueSms && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onQueueSms();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-emerald-50/80 hover:text-emerald-700 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span>ارسال پیامک اطلاع‌رسانی</span>
                    </div>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md">
                      صف انتظار
                    </span>
                  </button>
                )}
              </div>

              {/* Group 2: Approvals & Workflow Actions */}
              {((isPurchase && onApprovePurchase && (invoice.status === "pending_approval" || invoice.status === "draft" || invoice.isDraft)) ||
                ((invoice.type === "warehouse_receipt" || invoice.type === "warehouse_remittance") && onApproveWarehouseReceipt && (invoice.status === "pending_approval" || invoice.status === "draft" || invoice.isDraft))) && (
                <div className="py-1 space-y-0.5">
                  {isPurchase && onApprovePurchase && (invoice.status === "pending_approval" || invoice.status === "draft" || invoice.isDraft) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onApprovePurchase();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-black text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200/90 border border-emerald-300 rounded-xl transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition-transform" />
                        <span>تایید نهایی فاکتور خرید</span>
                      </div>
                      <span className="text-[9px] bg-emerald-700 text-white font-black px-1.5 py-0.5 rounded-md">
                        تایید
                      </span>
                    </button>
                  )}

                  {(invoice.type === "warehouse_receipt" || invoice.type === "warehouse_remittance") && onApproveWarehouseReceipt && (invoice.status === "pending_approval" || invoice.status === "draft" || invoice.isDraft) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onApproveWarehouseReceipt();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-black text-emerald-900 bg-emerald-100/80 hover:bg-emerald-200/90 border border-emerald-300 rounded-xl transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition-transform" />
                        <span>
                          {invoice.type === "warehouse_receipt" ? "تایید نهایی رسید ورود به انبار" : "تایید نهایی حواله خروج از انبار"}
                        </span>
                      </div>
                      <span className="text-[9px] bg-emerald-700 text-white font-black px-1.5 py-0.5 rounded-md">
                        {invoice.type === "warehouse_receipt" ? "ورود" : "خروج"}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Group 3: Pricing & Warehouse Operations */}
              {(isPurchase || onFastReceipt || onFastRemittance) && (
                <div className="py-1 space-y-0.5">
                  {isPurchase && onOpenPricingWizard && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenPricingWizard();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-black text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/60 rounded-xl transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <Barcode className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span>قیمت‌گذاری و چاپ بارکد</span>
                      </div>
                      <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded-md">
                        لیبل
                      </span>
                    </button>
                  )}

                  {!isVoided && whStatus !== "completed" && onFastReceipt && (
                    isPurchase && (invoice.status === "pending_approval" || invoice.status === "draft" || invoice.isDraft) ? (
                      <div className="px-2.5 py-1.5 text-[10px] text-amber-800 bg-amber-50/80 border border-amber-200/70 rounded-xl font-bold flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>رسید انبار نیازمند تایید فاکتور است</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onFastReceipt();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-blue-50/80 hover:text-blue-700 rounded-xl transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
                          <span>رسید سریع به انبار</span>
                        </div>
                        <span className="text-[10px] text-blue-600 font-bold">ورود</span>
                      </button>
                    )
                  )}

                  {!isVoided && whStatus !== "completed" && onFastRemittance && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onFastRemittance();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-purple-50/80 hover:text-purple-700 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-purple-500 group-hover:text-purple-600" />
                        <span>حواله خروج سریع انبار</span>
                      </div>
                      <span className="text-[10px] text-purple-600 font-bold">خروج</span>
                    </button>
                  )}
                </div>
              )}

              {/* Group 3: Financial Settlement & Special Workflow (Convert / Return) */}
              {(!isVoided && (onPaymentReceipt || onConvertProformaToSale || onReturnInvoice)) && (
                <div className="py-1 space-y-0.5">
                  {onConvertProformaToSale && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onConvertProformaToSale();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-black text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <FilePlus className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                        <span>تبدیل به فاکتور فروش</span>
                      </div>
                      <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-md">
                        فروش
                      </span>
                    </button>
                  )}

                  {onReturnInvoice && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onReturnInvoice();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50/70 hover:bg-amber-100/80 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-amber-600 group-hover:rotate-45 transition-transform" />
                        <span>
                          {invoice.type === "purchase" ? "ثبت برگشت از خرید" : "ثبت برگشت از فروش"}
                        </span>
                      </div>
                      <span className="text-[9px] bg-amber-600 text-white font-bold px-1.5 py-0.5 rounded-md">
                        مرجوعی
                      </span>
                    </button>
                  )}

                  {onPaymentReceipt && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onPaymentReceipt();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-500 group-hover:text-emerald-600" />
                        <span>
                          {invoice.type === "sale" || invoice.type === "purchase_return"
                            ? "ثبت دریافت وجه"
                            : "ثبت پرداخت وجه"}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600">تسویه</span>
                    </button>
                  )}
                </div>
              )}

              {/* Group: Consignment Lifecycle Actions */}
              {(invoice.type === 'consignment_out' || invoice.type === 'consignment_in') && (
                <div className="py-1 space-y-0.5 border-t border-slate-100">
                  {onConvertConsignmentToFinal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onConvertConsignmentToFinal();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-black text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                        <span>
                          {invoice.type === 'consignment_out' ? 'تبدیل به فاکتور فروش قطعی' : 'تبدیل به فاکتور خرید قطعی'}
                        </span>
                      </div>
                      <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-md">
                        قطعی‌سازی
                      </span>
                    </button>
                  )}

                  {onReturnConsignmentGoods && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onReturnConsignmentGoods();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/80 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-indigo-600 group-hover:-rotate-45 transition-transform" />
                        <span>ثبت عودت کالای امانی</span>
                      </div>
                      <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-md">
                        عودت
                      </span>
                    </button>
                  )}

                  {onPrintConsignmentReceipt && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onPrintConsignmentReceipt();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50/70 hover:bg-amber-100/80 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Printer className="w-4 h-4 text-amber-600" />
                        <span>رسید و تعهدنامه امانت</span>
                      </div>
                      <span className="text-[9px] bg-amber-600 text-white font-bold px-1.5 py-0.5 rounded-md">
                        تعهدنامه
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Group 4: Document Edit / Void / Delete */}
              {!isVoided && (onEdit || onVoid || onDelete) && (
                <div className="py-1 space-y-0.5">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onEdit();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Edit2 className="w-4 h-4 text-amber-500 group-hover:text-amber-600" />
                        <span>
                          {isWarehouseDoc
                            ? (isReceipt ? "ویرایش رسید انبار" : "ویرایش حواله انبار")
                            : "ویرایش فاکتور"}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-600">اصلاح</span>
                    </button>
                  )}

                  {onVoid && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onVoid();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                        <span>
                          {isWarehouseDoc
                            ? (isReceipt ? "ابطال رسید انبار" : "ابطال حواله انبار")
                            : "ابطال سند"}
                        </span>
                      </div>
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onDelete();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-rose-500 group-hover:text-rose-600" />
                        <span>
                          {isWarehouseDoc
                            ? (isReceipt ? "حذف رسید انبار" : "حذف حواله انبار")
                            : "حذف فاکتور"}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
