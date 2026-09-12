import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  getIssuedChecks, 
  deleteIssuedCheck, 
  updateIssuedCheck, 
  getPersons, 
  getAccounts, 
  getCheckbooks,
  getStoreSettings, 
  syncCheckAccountingDocument, 
  addCheckHistoryLog, 
  addTransaction, 
  rollbackCashedTransaction 
} from "../../services/dataService";
import { formatDateDisplay } from "../../utils/format";
import { 
  BookOpen, 
  Search, 
  Plus, 
  Printer, 
  Trash2, 
  Edit2, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Building2, 
  FileText, 
  X, 
  Copy, 
  Check, 
  Download, 
  Ban,
  Wallet
} from "lucide-react";
import { CheckReceiptPrintTemplate } from "../print/CheckReceiptPrintTemplate";
import { compareChecksByDueDate, normalizeDateForSort, getDaysRemaining } from "./checks/utils";

export default function IssuedChecksPage({
  showNotification,
  currentUser = "کاربر سیستم",
  setViewingCheck,
  onDataChange,
  onEditReceiptByCheck
}: any) {
  const navigate = useNavigate();

  const [issuedChecks, setIssuedChecks] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [checkbooks, setCheckbooks] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [checkbookFilter, setCheckbookFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "issueDate" | "amount">("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Selected checks / clipboard
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [deletingCheck, setDeletingCheck] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusModalCheck, setStatusModalCheck] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusBankAccountId, setStatusBankAccountId] = useState<string>("");
  const [statusDescription, setStatusDescription] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [printingCheck, setPrintingCheck] = useState<any>(null);

  const notify = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    if (showNotification) showNotification(msg, type);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [ic, ps, acc, cb, set] = await Promise.all([
        getIssuedChecks(),
        getPersons(),
        getAccounts(),
        getCheckbooks(),
        getStoreSettings()
      ]);
      const checkList = Array.isArray(ic) ? ic : ic?.data || [];
      // Exclude soft-deleted and blank placeholder check leaves
      const validChecks = checkList.filter(
        (c: any) => !c.deletedAt && c.status !== "blank" && Number(c.amount || 0) > 0
      );
      setIssuedChecks(validChecks);
      setPersons(ps || []);
      setAccounts(acc || []);
      setCheckbooks(cb || []);
      setStoreSettings(set || null);
    } catch (err) {
      console.error("Error loading issued checks:", err);
      notify("خطا در بارگذاری اطلاعات چک‌های پرداختی", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to retrieve Payee name
  const getPayeeName = (check: any) => {
    if (check.payeeName) return check.payeeName;
    const person = persons.find(
      (p) => String(p.id) === String(check.payeeId || check.personId)
    );
    return person?.name || "نامشخص";
  };

  // Helper to retrieve Bank & Account Info for an issued check
  const getCheckBankInfo = (check: any) => {
    const cb = checkbooks.find((c) => String(c.id) === String(check.checkbookId));
    const accId = check.bankAccountId || check.accountId || cb?.accountId;
    const acc = accounts.find((a) => String(a.id) === String(accId));

    const bankName = check.bankName || acc?.bankName || cb?.bankName || "بانک صادرکننده";
    const accountNumber = check.accountNumber || acc?.accountNumber || cb?.accountNumber || "";
    const branchName = check.branchName || acc?.branchName || cb?.branchName || "";

    return { bankName, accountNumber, branchName, checkbookTitle: cb?.title };
  };

  // Filtered & Sorted Checks
  const filteredChecks = useMemo(() => {
    let list = [...issuedChecks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => {
        const checkNo = String(c.checkNumber || "").toLowerCase();
        const sayad = String(c.sayadId || "").toLowerCase();
        const payee = String(getPayeeName(c)).toLowerCase();
        const bankInfo = getCheckBankInfo(c);
        const bank = String(bankInfo.bankName || "").toLowerCase();
        const accNo = String(bankInfo.accountNumber || "").toLowerCase();
        const amt = String(c.amount || "");
        const reason = String(c.reason || c.description || "").toLowerCase();
        return (
          checkNo.includes(q) ||
          sayad.includes(q) ||
          payee.includes(q) ||
          bank.includes(q) ||
          accNo.includes(q) ||
          amt.includes(q) ||
          reason.includes(q)
        );
      });
    }

    if (statusFilter !== "all") {
      if (statusFilter === "issued") {
        list = list.filter(
          (c) => c.status === "issued" || !c.status || c.status === "pending"
        );
      } else {
        list = list.filter((c) => c.status === statusFilter);
      }
    }

    if (checkbookFilter !== "all") {
      list = list.filter((c) => String(c.checkbookId) === String(checkbookFilter));
    }

    list.sort((a, b) => {
      if (sortBy === "dueDate") {
        return compareChecksByDueDate(a, b, sortDir);
      }

      if (sortBy === "issueDate") {
        const timeA = normalizeDateForSort(a.issueDate);
        const timeB = normalizeDateForSort(b.issueDate);
        if (!timeA && timeB) return 1;
        if (timeA && !timeB) return -1;
        if (timeA !== timeB) {
          return sortDir === "asc" ? timeA - timeB : timeB - timeA;
        }
        return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
      }

      if (sortBy === "amount") {
        const amtA = Number(a.amount || 0);
        const amtB = Number(b.amount || 0);
        if (amtA !== amtB) {
          return sortDir === "asc" ? amtA - amtB : amtB - amtA;
        }
        return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
      }

      return compareChecksByDueDate(a, b, sortDir);
    });

    return list;
  }, [issuedChecks, searchQuery, statusFilter, checkbookFilter, sortBy, sortDir, persons, checkbooks, accounts]);

  // Pagination
  const totalPages = Math.ceil(filteredChecks.length / pageSize) || 1;
  const paginatedChecks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredChecks.slice(start, start + pageSize);
  }, [filteredChecks, currentPage, pageSize]);

  // KPI Totals
  const totalAmount = useMemo(() => {
    return issuedChecks.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [issuedChecks]);

  const pendingAmount = useMemo(() => {
    return issuedChecks
      .filter((c) => c.status === "issued" || !c.status || c.status === "pending")
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [issuedChecks]);

  const cashedAmount = useMemo(() => {
    return issuedChecks
      .filter((c) => c.status === "cashed")
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [issuedChecks]);

  const bouncedAmount = useMemo(() => {
    return issuedChecks
      .filter((c) => c.status === "bounced")
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [issuedChecks]);

  const cancelledAmount = useMemo(() => {
    return issuedChecks
      .filter((c) => c.status === "cancelled")
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [issuedChecks]);

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    notify("در کلیپ‌بورد کپی شد", "info");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Status Labels & Badges
  const getStatusBadge = (st: string) => {
    switch (st) {
      case "cashed":
        return {
          label: "پاس شده (تسویه)",
          classes: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-500"
        };
      case "bounced":
        return {
          label: "برگشت خورده",
          classes: "bg-rose-50 text-rose-800 border-rose-200",
          dot: "bg-rose-500"
        };
      case "cancelled":
        return {
          label: "باطل شده",
          classes: "bg-slate-100 text-slate-700 border-slate-300",
          dot: "bg-slate-400"
        };
      case "issued":
      case "pending":
      default:
        return {
          label: "در جریان سررسید",
          classes: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500"
        };
    }
  };

  // Days remaining calculation
  const getDaysRemainingText = (dueDateStr: string) => {
    if (!dueDateStr) return null;
    try {
      const diff = getDaysRemaining(dueDateStr);
      if (diff < 0) {
        return { text: `${Math.abs(diff)} روز گذشته`, color: "text-rose-600 font-bold bg-rose-50" };
      } else if (diff === 0) {
        return { text: "سررسید امروز", color: "text-amber-700 font-bold bg-amber-50 animate-pulse" };
      } else if (diff <= 3) {
        return { text: `${diff} روز مانده`, color: "text-amber-600 font-bold bg-amber-50" };
      } else {
        return { text: `${diff} روز مانده`, color: "text-slate-600 bg-slate-50" };
      }
    } catch {
      return null;
    }
  };

  // Delete Action Handler
  const handleDeleteConfirm = async () => {
    if (!deletingCheck) return;
    setIsDeleting(true);
    try {
      await deleteIssuedCheck(String(deletingCheck.id));

      // Rollback transaction if cashed
      if (deletingCheck.status === "cashed" && deletingCheck.checkNumber) {
        try {
          await rollbackCashedTransaction(
            deletingCheck.checkNumber,
            deletingCheck.payeeId,
            "issued"
          );
        } catch (rbErr) {
          console.warn("Rollback warning:", rbErr);
        }
      }

      notify(`چک شماره ${deletingCheck.checkNumber} با موفقیت حذف گردید و اسناد مربوطه باطل شدند`, "success");
      setDeletingCheck(null);
      await loadData();
      if (onDataChange) onDataChange();
    } catch (err: any) {
      console.error("Delete error:", err);
      notify(err.message || "خطا در حذف چک", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Status Change Handler
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalCheck || !newStatus) return;

    setIsUpdatingStatus(true);
    try {
      const oldState = statusModalCheck.status;
      let newTx: any = null;

      const bankInfo = getCheckBankInfo(statusModalCheck);
      const effectiveAccountId = statusBankAccountId || statusModalCheck.bankAccountId || accounts[0]?.id;

      if (newStatus === "cashed" && oldState !== "cashed") {
        try {
          newTx = await addTransaction({
            type: "pay",
            resourceType: "bank",
            resourceId: effectiveAccountId,
            amount: statusModalCheck.amount,
            isCheckCashing: true,
            personId: statusModalCheck.payeeId,
            checkId: statusModalCheck.id,
            date: new Date().toISOString(),
            method: "check",
            receiptNumber: statusModalCheck.receiptNumber || statusModalCheck.checkNumber,
            checkNumber: statusModalCheck.checkNumber,
            description: `پاس شدن چک پرداختی شماره ${statusModalCheck.checkNumber} در وجه ${getPayeeName(statusModalCheck)}`
          });
        } catch (txErr) {
          console.warn("Error recording cashing transaction:", txErr);
        }
      } else if (oldState === "cashed" && newStatus !== "cashed") {
        try {
          await rollbackCashedTransaction(
            statusModalCheck.checkNumber,
            statusModalCheck.payeeId,
            "issued"
          );
        } catch (rbErr) {
          console.warn("Error rolling back cashed transaction:", rbErr);
        }
      }

      const updated = {
        ...statusModalCheck,
        status: newStatus,
        bankAccountId: effectiveAccountId,
        transactionId: newTx ? newTx.id : statusModalCheck.transactionId,
        receiptNumber: newTx?.receiptNumber || statusModalCheck.receiptNumber || statusModalCheck.checkNumber,
        statusDesc: statusDescription
      };

      await updateIssuedCheck(String(statusModalCheck.id), updated);

      try {
        await addCheckHistoryLog({
          checkId: statusModalCheck.id,
          checkType: "issued",
          oldStatus: oldState,
          newStatus: newStatus,
          userId: currentUser,
          transactionId: updated.transactionId,
          receiptNumber: updated.receiptNumber,
          description: statusDescription || `تغییر وضعیت به ${getStatusBadge(newStatus).label}`
        });
      } catch (logErr) {
        console.warn("History log warning:", logErr);
      }

      try {
        await syncCheckAccountingDocument("issued", updated, statusModalCheck);
      } catch (accErr) {
        console.warn("Sync accounting error:", accErr);
      }

      notify(`وضعیت چک با موفقیت به "${getStatusBadge(newStatus).label}" تغییر یافت`, "success");
      setStatusModalCheck(null);
      await loadData();
      if (onDataChange) onDataChange();
    } catch (err: any) {
      console.error("Status update error:", err);
      notify(err.message || "خطا در تغییر وضعیت چک", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Open Edit Page / Callback
  const handleEditClick = (check: any) => {
    if (onEditReceiptByCheck) {
      onEditReceiptByCheck(check);
    } else {
      navigate(`/issue_check_form?id=${check.id}`);
    }
  };

  // Open Details / Card Page
  const handleViewCard = (check: any) => {
    if (setViewingCheck) {
      setViewingCheck({ ...check, _type: "issued" });
    }
    navigate("/check_card");
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredChecks.length === 0) {
      notify("رکوردی جهت استخراج وجود ندارد", "warning");
      return;
    }
    const headers = [
      "شماره چک",
      "شناسه صیادی",
      "طرف حساب (در وجه)",
      "بانک عهده",
      "شماره حساب",
      "مبلغ",
      "تاریخ سررسید",
      "تاریخ صدور",
      "وضعیت",
      "بابت / توضیحات"
    ];
    const rows = filteredChecks.map((c) => {
      const bankInfo = getCheckBankInfo(c);
      return [
        c.checkNumber || "",
        c.sayadId || "",
        getPayeeName(c),
        bankInfo.bankName || "",
        bankInfo.accountNumber || "",
        c.amount || "",
        c.dueDate || "",
        c.issueDate || "",
        getStatusBadge(c.status).label,
        c.reason || c.description || ""
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `issued_checks_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("فایل CSV چک‌های پرداختی با موفقیت دانلود شد", "success");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50 font-sans"
      dir="rtl"
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 font-display">
              مدیریت چک‌های پرداختی (اسناد پرداختنی)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              مشاهده، جستجو، پیگیری سررسید، ویرایش، تغییر وضعیت پاس/برگشت، حذف و گزارش‌گیری جامع برگه چک‌های صادره
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("/issue_check_form")}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            ثبت چک پرداختی جدید
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-all"
            title="خروجی فایل اکسل / CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            خروجی اکسل
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-all"
            title="چاپ لیست چک‌ها"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            چاپ لیست
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 print:hidden">
        {/* Total Issued */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">کل چک‌های پرداختی</span>
            <span className="text-lg font-black text-slate-800 font-mono block mt-1">
              {totalAmount.toLocaleString()} <span className="text-xs font-normal font-sans text-slate-400">{storeSettings?.currency || "تومان"}</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-1 font-mono">
              تعداد: {issuedChecks.length} فقره
            </span>
          </div>
          <div className="w-11 h-11 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Pending / In Clearing */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700 block">در جریان سررسید</span>
            <span className="text-lg font-black text-amber-900 font-mono block mt-1">
              {pendingAmount.toLocaleString()} <span className="text-xs font-normal font-sans text-amber-600/70">{storeSettings?.currency || "تومان"}</span>
            </span>
            <span className="text-[11px] text-amber-600/80 block mt-1 font-mono">
              تعداد: {issuedChecks.filter((c) => c.status === "issued" || !c.status || c.status === "pending").length} فقره
            </span>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Cashed */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700 block">پاس شده از حساب</span>
            <span className="text-lg font-black text-emerald-900 font-mono block mt-1">
              {cashedAmount.toLocaleString()} <span className="text-xs font-normal font-sans text-emerald-600/70">{storeSettings?.currency || "تومان"}</span>
            </span>
            <span className="text-[11px] text-emerald-600/80 block mt-1 font-mono">
              تعداد: {issuedChecks.filter((c) => c.status === "cashed").length} فقره
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Bounced */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700 block">برگشت خورده</span>
            <span className="text-lg font-black text-rose-900 font-mono block mt-1">
              {bouncedAmount.toLocaleString()} <span className="text-xs font-normal font-sans text-rose-600/70">{storeSettings?.currency || "تومان"}</span>
            </span>
            <span className="text-[11px] text-rose-600/80 block mt-1 font-mono">
              تعداد: {issuedChecks.filter((c) => c.status === "bounced").length} فقره
            </span>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Cancelled */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-600 block">باطل شده</span>
            <span className="text-lg font-black text-slate-700 font-mono block mt-1">
              {cancelledAmount.toLocaleString()} <span className="text-xs font-normal font-sans text-slate-400">{storeSettings?.currency || "تومان"}</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-1 font-mono">
              تعداد: {issuedChecks.filter((c) => c.status === "cancelled").length} فقره
            </span>
          </div>
          <div className="w-11 h-11 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center">
            <Ban className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-6 print:hidden space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
          {[
            { id: "all", label: "همه چک‌ها", count: issuedChecks.length },
            { 
              id: "issued", 
              label: "در جریان سررسید", 
              count: issuedChecks.filter((c) => c.status === "issued" || !c.status || c.status === "pending").length 
            },
            { 
              id: "cashed", 
              label: "پاس شده (تسویه)", 
              count: issuedChecks.filter((c) => c.status === "cashed").length 
            },
            { 
              id: "bounced", 
              label: "برگشت خورده", 
              count: issuedChecks.filter((c) => c.status === "bounced").length 
            },
            { 
              id: "cancelled", 
              label: "باطل شده", 
              count: issuedChecks.filter((c) => c.status === "cancelled").length 
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                statusFilter === tab.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search, Checkbook Select, Sort Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجو بر اساس شماره چک، صیاد، نام طرف حساب، بانک، مبلغ..."
              className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Checkbook / Account Filter */}
            {checkbooks.length > 0 && (
              <select
                value={checkbookFilter}
                onChange={(e) => {
                  setCheckbookFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-white outline-none cursor-pointer"
              >
                <option value="all">همه دسته‌چک‌ها</option>
                {checkbooks.map((cb) => {
                  const acc = accounts.find((a) => String(a.id) === String(cb.accountId));
                  const label = acc
                    ? `${acc.bankName} - ${cb.title || `دسته‌چک ${cb.id}`}`
                    : cb.title || `دسته‌چک ${cb.id}`;
                  return (
                    <option key={cb.id} value={cb.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none px-2 py-1 cursor-pointer"
              >
                <option value="dueDate">تاریخ سررسید</option>
                <option value="issueDate">تاریخ صدور</option>
                <option value="amount">مبلغ چک</option>
              </select>
              <button
                onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
                title={sortDir === "asc" ? "صعودی" : "نزولی"}
              >
                {sortDir === "asc" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
              </button>
            </div>

            <span className="text-xs text-slate-500 font-bold hidden sm:inline">
              یافت شده: {filteredChecks.length} فقره
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">شماره چک و صیادی</th>
                <th className="p-4">طرف حساب (در وجه)</th>
                <th className="p-4">بانک و دسته‌چک عهده</th>
                <th className="p-4">مبلغ ({storeSettings?.currency || "تومان"})</th>
                <th className="p-4">تاریخ سررسید</th>
                <th className="p-4">تاریخ صدور</th>
                <th className="p-4">وضعیت</th>
                <th className="p-4">سند / رسید متصل</th>
                <th className="p-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedChecks.map((check, idx) => {
                const badge = getStatusBadge(check.status);
                const remaining = getDaysRemainingText(check.dueDate);
                const bankInfo = getCheckBankInfo(check);
                const payee = getPayeeName(check);

                return (
                  <tr key={check.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 text-center text-xs text-slate-400 font-mono">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>

                    {/* Check No & Sayad */}
                    <td className="p-4">
                      <div className="font-mono font-black text-slate-800 text-base">
                        {check.checkNumber || "---"}
                      </div>
                      {check.sayadId ? (
                        <button
                          onClick={() => handleCopy(check.sayadId, `sayad_${check.id}`)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-700 font-mono mt-0.5"
                          title="کپی شناسه صیادی"
                        >
                          <span>{check.sayadId}</span>
                          {copiedId === `sayad_${check.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-sans">بدون شناسه صیادی</span>
                      )}
                    </td>

                    {/* Payee */}
                    <td className="p-4">
                      <div className="font-bold text-slate-800">
                        {payee}
                      </div>
                      {(check.reason || check.description) && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]" title={check.reason || check.description}>
                          بابت: {check.reason || check.description}
                        </div>
                      )}
                    </td>

                    {/* Bank & Checkbook */}
                    <td className="p-4">
                      <div className="font-bold text-slate-700">
                        {bankInfo.bankName}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {bankInfo.accountNumber ? `حساب: ${bankInfo.accountNumber}` : (bankInfo.checkbookTitle || "---")}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="p-4 font-mono font-black text-slate-900 text-base">
                      {Number(check.amount || 0).toLocaleString()}
                    </td>

                    {/* Due Date & Remaining Badge */}
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-800 text-sm">
                        {check.dueDate ? formatDateDisplay(check.dueDate) : "---"}
                      </div>
                      {remaining && (
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md mt-1 ${remaining.color}`}>
                          {remaining.text}
                        </span>
                      )}
                    </td>

                    {/* Issue Date */}
                    <td className="p-4 font-mono text-xs text-slate-600">
                      {check.issueDate ? formatDateDisplay(check.issueDate) : "---"}
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.classes}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </td>

                    {/* Linked Receipt / Transaction */}
                    <td className="p-4">
                      {check.receiptNumber || check.transactionId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-xs rounded-lg font-bold">
                          <FileText className="w-3 h-3 text-indigo-500" />
                          #{check.receiptNumber || check.transactionId}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">---</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewCard(check)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="مشاهده شناسنامه و گردش چک"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleEditClick(check)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="ویرایش چک"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setStatusModalCheck(check);
                            setNewStatus(check.status || "issued");
                            setStatusBankAccountId(check.bankAccountId || accounts[0]?.id || "");
                            setStatusDescription("");
                          }}
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                          title="تغییر وضعیت چک"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setPrintingCheck(check)}
                          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                          title="چاپ رسید چک"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeletingCheck(check)}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="حذف چک"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedChecks.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                    <p className="text-base font-bold text-slate-600">هیچ چک پرداختی مطابق با فیلترها یافت نشد</p>
                    <p className="text-xs text-slate-400 mt-1">جهت صدور چک جدید، از دکمه «ثبت چک پرداختی جدید» استفاده کنید.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500 font-bold">
              صفحه {currentPage} از {totalPages} (تعداد کل: {filteredChecks.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-40"
              >
                قبلی
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-lg font-bold font-mono text-xs transition-colors ${
                    currentPage === p ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-40"
              >
                بعدی
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Delete Confirmation */}
      <AnimatePresence>
        {deletingCheck && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right font-sans"
              dir="rtl"
            >
              <div className="flex items-center gap-3 text-rose-600 mb-4">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">حذف چک پرداختی</h3>
                  <p className="text-xs text-slate-500">شماره چک: {deletingCheck.checkNumber}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 mb-6 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">طرف حساب (در وجه):</span>
                  <span className="font-bold">{getPayeeName(deletingCheck)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">مبلغ:</span>
                  <span className="font-mono font-bold">
                    {Number(deletingCheck.amount).toLocaleString()} {storeSettings?.currency || "تومان"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">بانک:</span>
                  <span className="font-bold">{getCheckBankInfo(deletingCheck).bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">سررسید:</span>
                  <span className="font-mono font-bold">{formatDateDisplay(deletingCheck.dueDate)}</span>
                </div>
              </div>

              <p className="text-sm text-rose-700 font-bold mb-6 leading-relaxed">
                آیا از حذف این چک اطمینان دارید؟ با حذف چک، سند حسابداری مربوطه و اثر آن در حساب طرف حساب و بانک به طور خودکار باطل خواهد شد.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeletingCheck(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteConfirm}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm"
                >
                  {isDeleting ? "در حال حذف..." : "تأیید و حذف قطعی"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Status Update */}
      <AnimatePresence>
        {statusModalCheck && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 text-right font-sans"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                  تغییر وضعیت چک پرداختی شماره {statusModalCheck.checkNumber}
                </h3>
                <button
                  onClick={() => setStatusModalCheck(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleStatusSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">انتخاب وضعیت جدید</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 focus:border-indigo-500 outline-none text-sm bg-white font-bold text-slate-800"
                  >
                    <option value="issued">در جریان سررسید (اسناد پرداختنی صادر شده)</option>
                    <option value="cashed">پاس شده (تسویه و کسر وجه از حساب بانکی)</option>
                    <option value="bounced">برگشت خورده (عدم موجودی یا واخواست)</option>
                    <option value="cancelled">باطل شده (ابطال برگه چک)</option>
                  </select>
                </div>

                {/* Account selection if cashed */}
                {newStatus === "cashed" && (
                  <div className="space-y-2 p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl">
                    <label className="text-xs font-bold text-indigo-900 block">
                      حساب بانکی مبدأ جهت کسر و برداشت وجه چک
                    </label>
                    <select
                      value={statusBankAccountId}
                      onChange={(e) => setStatusBankAccountId(e.target.value)}
                      className="w-full border border-indigo-200 rounded-xl p-3 text-xs font-bold text-indigo-950 bg-white"
                      required
                    >
                      <option value="">-- انتخاب حساب بانکی --</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.bankName} - حساب {a.accountNumber} {a.branchName ? `(شعبه ${a.branchName})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">توضیحات و شرح تغییر وضعیت</label>
                  <textarea
                    rows={2}
                    value={statusDescription}
                    onChange={(e) => setStatusDescription(e.target.value)}
                    placeholder="مثال: پاس شدن چک در بانک و برداشت از حساب..."
                    className="w-full border border-slate-200 rounded-2xl p-3 text-xs outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => setStatusModalCheck(null)}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingStatus}
                    className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 text-xs shadow-sm"
                  >
                    {isUpdatingStatus ? "در حال ثبت..." : "تأیید و صدور سند مالی"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Template Container */}
      {printingCheck && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto p-8 flex flex-col items-center">
          <div className="w-full max-w-3xl flex justify-between items-center mb-6 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              چاپ رسید
            </button>
            <button
              onClick={() => setPrintingCheck(null)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm"
            >
              بستن
            </button>
          </div>
          <div className="w-full">
            <CheckReceiptPrintTemplate
              check={{ ...printingCheck, _type: "issued", bankName: getCheckBankInfo(printingCheck).bankName }}
              persons={persons}
              storeSettings={storeSettings}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
