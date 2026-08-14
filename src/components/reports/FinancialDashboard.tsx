import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  BarChart3, RefreshCw, X, AlertCircle, Calendar, 
  ShoppingCart, Receipt, TrendingUp, TrendingDown, 
  Wallet, CreditCard, GripHorizontal, Settings, Trash2, Plus, Users, FileText
} from 'lucide-react';
import CustomDatePicker from "../ui/CustomDatePicker";
import DatePickerModule from "react-multi-date-picker";
const DatePicker = CustomDatePicker;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell, CartesianGrid } from 'recharts';
import { DashboardPersonalNotesWidget } from "../notes/DashboardPersonalNotesWidget";

function toPersianDigits(str: string | number) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[0-9]/g, (w) =>
    String.fromCharCode(w.charCodeAt(0) + 1728)
  );
}

const normalizeDateStr = (dStr: string) => {
  if (!dStr) return 0;
  const englishDStr = dStr.replace(
    /[۰-۹]/g,
    (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)],
  );
  const parts = englishDStr
    .split(/[/-]/)
    .map((p) => p.padStart(2, "0"));
  if (parts.length === 3)
    return parseInt(parts[0] + parts[1] + parts[2], 10);
  return 0;
};

// --- DEFAULT WIDGETS ---
const WIDGET_TYPES = [
  { id: 'alert_checks', title: 'هشدار چک‌های سررسید', defaultWidth: 'col-span-1 md:col-span-2 lg:col-span-4' },
  { id: 'kpi_sales', title: 'فروش (KPI)', defaultWidth: 'col-span-1' },
  { id: 'kpi_purchases', title: 'خرید (KPI)', defaultWidth: 'col-span-1' },
  { id: 'kpi_net_balance', title: 'موازنه فروش/خرید', defaultWidth: 'col-span-1' },
  { id: 'kpi_due_checks', title: 'چک‌های امروز', defaultWidth: 'col-span-1' },
  { id: 'grand_treasury', title: 'مجموع نقدینگی خزانه‌داری', defaultWidth: 'col-span-1 md:col-span-2 lg:col-span-4' },
  { id: 'bank_accounts', title: 'حساب‌های بانکی', defaultWidth: 'col-span-1 md:col-span-2' },
  { id: 'cashboxes', title: 'صندوق‌های نقدی', defaultWidth: 'col-span-1 md:col-span-2' },
  { id: 'cash_flow', title: 'خلاصه گردش نقدی', defaultWidth: 'col-span-1 md:col-span-2 lg:col-span-4' },
  { id: 'payable_checks', title: 'چک‌های پرداختی', defaultWidth: 'col-span-1 md:col-span-2 lg:col-span-2' },
  { id: 'receivable_checks', title: 'چک‌های دریافتی', defaultWidth: 'col-span-1 md:col-span-2 lg:col-span-2' },
  { id: 'debtors', title: 'لیست اشخاص بدهکار', defaultWidth: 'col-span-1 md:col-span-2 lg:col-span-1' },
  { id: 'creditors', title: 'بستانکاران', defaultWidth: 'col-span-1 md:col-span-2 lg:col-span-1' },
  { id: 'checks_chart', title: 'نمودار چک‌ها', defaultWidth: 'col-span-1 md:col-span-2 lg:col-span-4' },
  { id: 'personal_notes', title: 'یادداشت‌های شخصی', defaultWidth: 'col-span-1 md:col-span-2 lg:col-span-4' }
];

export default function FinancialDashboard({
  invoices,
  persons,
  storeSettings,
  reportDateRange,
  setReportDateRange,
  issuedChecks,
  receivedChecks,
  accounts,
  cashboxes,
  transactions,
  calculatePersonBalance,
  getPersonDisplayName,
  formatNumber,
  setActiveTab,
  fetchData,
  getDefaultExchangeRate,
  currentUser
}: any) {

  const [widgets, setWidgets] = useState<any[]>(() => {
    const saved = localStorage.getItem('financial_dashboard_widgets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const existingIds = new Set(parsed.map((w: any) => w.id));
        const missingWidgets = WIDGET_TYPES.filter(w => !existingIds.has(w.id)).map(w => ({ ...w, settings: {} }));
        return [...parsed, ...missingWidgets];
      } catch (e) {
        return WIDGET_TYPES.map(w => ({ ...w, settings: {} }));
      }
    }
    return WIDGET_TYPES.map(w => ({ ...w, settings: {} }));
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [editingWidget, setEditingWidget] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('financial_dashboard_widgets', JSON.stringify(widgets));
  }, [widgets]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => setActiveId(event.active.id);

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (active.id !== over?.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const addWidget = (w: any) => {
    setWidgets([...widgets, { ...w, settings: {} }]);
    setShowAddWidget(false);
  };

  const saveWidgetSettings = (id: string, newSettings: any) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, settings: newSettings } : w));
    setEditingWidget(null);
  };

  // Shared calculations
  const todayStr = new Date().toLocaleDateString("fa-IR");
  
  const startNormAlert = (() => {
    const today = new Date();
    return normalizeDateStr(today.toLocaleDateString(storeSettings?.calendarType === "gregorian" ? "en-US" : "fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" }));
  })();
  
  const endNormAlert = (() => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 3);
    return normalizeDateStr(maxDate.toLocaleDateString(storeSettings?.calendarType === "gregorian" ? "en-US" : "fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" }));
  })();

  const renderWidgetContent = (widget: any) => {
    switch (widget.id) {
      case 'alert_checks': {
        const upcomingIssued = (issuedChecks || []).filter((c: any) => {
          if (["cashed", "bounced", "cancelled"].includes(c.status)) return false;
          const n = normalizeDateStr(c.dueDate);
          return n >= startNormAlert && n <= endNormAlert;
        });
        const upcomingReceived = (receivedChecks || []).filter((c: any) => {
          if (["cashed", "deposited", "bounced", "returned"].includes(c.status)) return false;
          const n = normalizeDateStr(c.dueDate);
          return n >= startNormAlert && n <= endNormAlert;
        });
        const totalUpcoming = upcomingIssued.length + upcomingReceived.length;
        if (totalUpcoming === 0) return <div className="text-gray-400 p-4 text-center text-sm font-bold">هشدار سررسید فعالی وجود ندارد.</div>;
        return (
          <div onClick={() => setActiveTab("check_calendar")} className="bg-amber-50 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors h-full">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600"><AlertCircle className="w-6 h-6 animate-pulse" /></div>
              <div>
                <h4 className="text-amber-900 font-extrabold text-sm flex items-center gap-2">
                  هشدار سررسید چک‌ها (تا ۳ روز آینده) <span className="bg-amber-200 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">{toPersianDigits(totalUpcoming)} مورد</span>
                </h4>
                <p className="text-amber-700 text-xs font-semibold mt-1">
                  شما {toPersianDigits(totalUpcoming)} چک در ۳ روز آینده دارای سررسید دارید. برای مشاهده تقویم سررسید کلیک کنید.
                </p>
              </div>
            </div>
            <div className="text-amber-500 bg-amber-100/50 p-2 rounded-xl"><Calendar className="w-5 h-5" /></div>
          </div>
        );
      }
      case 'kpi_sales': {
        const amt = (invoices || []).filter(inv => !inv.isDraft && inv.status !== "draft" && inv.status !== "voided" && (inv.type === "sale" || inv.type === "sale_return") && (!reportDateRange || reportDateRange.length !== 2 || (new Date(inv.date).setHours(0,0,0,0) >= new Date(reportDateRange[0]).setHours(0,0,0,0) && new Date(inv.date).valueOf() <= new Date(reportDateRange[1]).setHours(23,59,59,999)))).reduce((sum, inv) => sum + (inv.type === "sale" ? inv.totalAmount || 0 : -(inv.totalAmount || 0)) * getDefaultExchangeRate(inv.currency, storeSettings.currency), 0);
        const count = (invoices || []).filter(inv => !inv.isDraft && inv.status !== "draft" && inv.status !== "voided" && inv.type === "sale" && (!reportDateRange || reportDateRange.length !== 2 || (new Date(inv.date).setHours(0,0,0,0) >= new Date(reportDateRange[0]).setHours(0,0,0,0) && new Date(inv.date).valueOf() <= new Date(reportDateRange[1]).setHours(23,59,59,999)))).length;
        return (
          <div className="bg-white rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden h-full">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
            <div className="p-3.5 bg-indigo-50 rounded-2xl text-indigo-600"><ShoppingCart className="w-6 h-6" /></div>
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-gray-400">مجموع کل فروش</h3>
              <span className="text-xl font-extrabold text-gray-900 block mt-1">{formatNumber(amt)} <span className="text-xs font-medium text-gray-500">{storeSettings.currency}</span></span>
              <span className="text-xs text-indigo-600 font-bold mt-1 block">{formatNumber(count)} فاکتور فروش ثبت شده</span>
            </div>
          </div>
        );
      }
      case 'kpi_purchases': {
        const amt = (invoices || []).filter(inv => !inv.isDraft && inv.status !== "draft" && inv.status !== "voided" && (inv.type === "purchase" || inv.type === "purchase_return") && (!reportDateRange || reportDateRange.length !== 2 || (new Date(inv.date).setHours(0,0,0,0) >= new Date(reportDateRange[0]).setHours(0,0,0,0) && new Date(inv.date).valueOf() <= new Date(reportDateRange[1]).setHours(23,59,59,999)))).reduce((sum, inv) => sum + (inv.type === "purchase" ? inv.totalAmount || 0 : -(inv.totalAmount || 0)) * getDefaultExchangeRate(inv.currency, storeSettings.currency), 0);
        const count = (invoices || []).filter(inv => !inv.isDraft && inv.status !== "draft" && inv.status !== "voided" && inv.type === "purchase" && (!reportDateRange || reportDateRange.length !== 2 || (new Date(inv.date).setHours(0,0,0,0) >= new Date(reportDateRange[0]).setHours(0,0,0,0) && new Date(inv.date).valueOf() <= new Date(reportDateRange[1]).setHours(23,59,59,999)))).length;
        return (
          <div className="bg-white rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden h-full">
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
            <div className="p-3.5 bg-amber-50 rounded-2xl text-amber-600"><Receipt className="w-6 h-6" /></div>
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-gray-400">مجموع کل خرید</h3>
              <span className="text-xl font-extrabold text-gray-900 block mt-1">{formatNumber(amt)} <span className="text-xs font-medium text-gray-500">{storeSettings.currency}</span></span>
              <span className="text-xs text-amber-600 font-bold mt-1 block">{formatNumber(count)} فاکتور خرید ثبت شده</span>
            </div>
          </div>
        );
      }
      case 'kpi_net_balance': {
        const sales = (invoices || []).filter(inv => !inv.isDraft && inv.status !== "draft" && inv.status !== "voided" && (inv.type === "sale" || inv.type === "sale_return") && (!reportDateRange || reportDateRange.length !== 2 || (new Date(inv.date).setHours(0,0,0,0) >= new Date(reportDateRange[0]).setHours(0,0,0,0) && new Date(inv.date).valueOf() <= new Date(reportDateRange[1]).setHours(23,59,59,999)))).reduce((sum, inv) => sum + (inv.type === "sale" ? inv.totalAmount || 0 : -(inv.totalAmount || 0)) * getDefaultExchangeRate(inv.currency, storeSettings.currency), 0);
        const purchases = (invoices || []).filter(inv => !inv.isDraft && inv.status !== "draft" && inv.status !== "voided" && (inv.type === "purchase" || inv.type === "purchase_return") && (!reportDateRange || reportDateRange.length !== 2 || (new Date(inv.date).setHours(0,0,0,0) >= new Date(reportDateRange[0]).setHours(0,0,0,0) && new Date(inv.date).valueOf() <= new Date(reportDateRange[1]).setHours(23,59,59,999)))).reduce((sum, inv) => sum + (inv.type === "purchase" ? inv.totalAmount || 0 : -(inv.totalAmount || 0)) * getDefaultExchangeRate(inv.currency, storeSettings.currency), 0);
        const netVal = sales - purchases;
        const isPositive = netVal >= 0;
        return (
          <div className="bg-white rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden h-full">
            <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${isPositive ? "bg-emerald-500" : "bg-rose-500"}`}></div>
            <div className={`p-3.5 rounded-2xl ${isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-gray-400">تفاضل معاملات (فروش - خرید)</h3>
              <span className={`text-xl font-extrabold block mt-1 ${isPositive ? "text-emerald-700" : "text-rose-700"}`}>
                {formatNumber(netVal)} <span className="text-xs font-medium text-gray-500">{storeSettings.currency}</span>
              </span>
              <span className={`text-xs font-bold mt-1 block ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                {isPositive ? "موازنه مثبت" : "موازنه منفی"}
              </span>
            </div>
          </div>
        );
      }
      case 'kpi_due_checks': {
        const dueIssued = (issuedChecks || []).filter((c: any) => c.dueDate === todayStr).length;
        const dueReceived = (receivedChecks || []).filter((c: any) => c.dueDate === todayStr).length;
        const totalDue = dueIssued + dueReceived;
        return (
          <div onClick={() => setActiveTab("check_calendar")} className="bg-white rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all group h-full">
            <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${totalDue > 0 ? "bg-amber-500" : "bg-gray-300"}`}></div>
            <div className={`p-3.5 rounded-2xl transition-colors ${totalDue > 0 ? "bg-amber-50 text-amber-600 group-hover:bg-amber-100" : "bg-gray-50 text-gray-400 group-hover:bg-gray-100"}`}>
              <Calendar className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-gray-400">چک‌های سررسیده امروز</h3>
              <span className={`text-xl font-extrabold block mt-1 ${totalDue > 0 ? "text-amber-700" : "text-gray-700"}`}>
                {toPersianDigits(totalDue)} <span className="text-sm font-medium text-gray-500">مورد</span>
              </span>
              <span className="text-xs font-bold mt-1 block text-gray-500">{toPersianDigits(dueIssued)} پرداختی | {toPersianDigits(dueReceived)} دریافتی</span>
            </div>
          </div>
        );
      }
      case 'grand_treasury': {
        const total = accounts.reduce((sum: any, acc: any) => sum + (acc.balance || 0), 0) + cashboxes.reduce((sum: any, cb: any) => sum + (cb.balance || 0), 0);
        return (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 h-full">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-200"><Wallet className="w-8 h-8" /></div>
              <div>
                <h3 className="text-base font-extrabold text-emerald-950">مجموع کل نقدینگی خزانه‌داری</h3>
                <p className="text-xs text-emerald-700 mt-1">مجموع حساب‌های بانکی و صندوق‌ها</p>
              </div>
            </div>
            <div className="text-center md:text-left">
              <span className="text-xs text-emerald-700 font-semibold block mb-1">دارایی نقدی کل</span>
              <span className="text-3xl font-extrabold text-emerald-900 tracking-tight">{formatNumber(total)} <span className="text-sm font-bold text-emerald-900">{storeSettings.currency}</span></span>
            </div>
          </div>
        );
      }
      case 'bank_accounts': {
        return (
          <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-500" /> تراز حساب‌های بانکی</h3>
            <div className="flex-1 overflow-auto max-h-64 space-y-4 pr-1">
              {(accounts || []).map((acc: any, idx: number) => (
                <div key={acc.id ? `fdb-acc-${acc.id}-${idx}` : `fdb-acc-idx-${idx}`} className="bg-gray-50 py-3 px-4 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-900 block text-sm">{acc.bankName}</span>
                    <span className="text-xs text-gray-500">{acc.accountHolder}</span>
                  </div>
                  <div className="text-left"><span className="text-sm font-extrabold text-indigo-600 block">{formatNumber(acc.balance || 0)}</span><span className="text-[10px] text-gray-400">{storeSettings.currency}</span></div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'cashboxes': {
        return (
          <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2"><Wallet className="w-5 h-5 text-amber-500" /> تراز صندوق‌های نقدی</h3>
            <div className="flex-1 overflow-auto max-h-64 space-y-4 pr-1">
              {(cashboxes || []).map((cb: any, idx: number) => (
                <div key={cb.id ? `fdb-cb-${cb.id}-${idx}` : `fdb-cb-idx-${idx}`} className="bg-gray-50 py-3 px-4 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-gray-900 block text-sm">{cb.name}</span>
                    <span className="text-xs text-gray-500">{cb.manager}</span>
                  </div>
                  <div className="text-left"><span className="text-sm font-extrabold text-amber-600 block">{formatNumber(cb.balance || 0)}</span><span className="text-[10px] text-gray-400">{storeSettings.currency}</span></div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'cash_flow': {
        const received = (transactions || []).filter((t: any) => t.type === "receive" && (!reportDateRange || reportDateRange.length !== 2 || (new Date(t.date).setHours(0,0,0,0) >= new Date(reportDateRange[0]).setHours(0,0,0,0) && new Date(t.date).valueOf() <= new Date(reportDateRange[1]).setHours(23,59,59,999)))).reduce((sum: any, t: any) => sum + (t.amount || 0), 0);
        const paid = (transactions || []).filter((t: any) => t.type === "pay" && (!reportDateRange || reportDateRange.length !== 2 || (new Date(t.date).setHours(0,0,0,0) >= new Date(reportDateRange[0]).setHours(0,0,0,0) && new Date(t.date).valueOf() <= new Date(reportDateRange[1]).setHours(23,59,59,999)))).reduce((sum: any, t: any) => sum + (t.amount || 0), 0);
        return (
          <div className="bg-white rounded-2xl p-6 h-full">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4">خلاصه گردش اسناد دریافت و پرداخت</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 flex justify-between items-center">
                <span className="text-xs text-emerald-800 font-bold">مجموع دریافت‌ها</span>
                <span className="text-lg font-black text-emerald-700">{formatNumber(received)} <span className="text-xs">{storeSettings.currency}</span></span>
              </div>
              <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100/50 flex justify-between items-center">
                <span className="text-xs text-rose-800 font-bold">مجموع پرداخت‌ها</span>
                <span className="text-lg font-black text-rose-700">{formatNumber(paid)} <span className="text-xs">{storeSettings.currency}</span></span>
              </div>
            </div>
          </div>
        );
      }
      case 'payable_checks': {
        const limit = widget.settings.limit || 5;
        let checks = (issuedChecks || []).filter((c: any) => c.status === 'issued' || !c.status);
        checks.sort((a: any, b: any) => normalizeDateStr(a.dueDate) - normalizeDateStr(b.dueDate));
        checks = checks.slice(0, limit);
        return (
          <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-rose-600" /> چک‌های پرداختی (سررسید نشده)</div>
              <span className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded-lg font-bold">{toPersianDigits(limit)} رکورد</span>
            </h3>
            <div className="flex-1 overflow-auto max-h-64 space-y-3 pr-1">
              {checks.length === 0 ? <div className="text-center text-sm text-gray-400 mt-4">چک پرداختی یافت نشد</div> : checks.map((c: any) => (
                <div key={c.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-black text-gray-800">{getPersonDisplayName(persons.find((x: any) => String(x.id) === String(c.payeeId)) || {})}</span>
                    <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">{toPersianDigits(c.dueDate)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">شماره: {toPersianDigits(c.checkNumber)}</span>
                    <span className="text-sm font-extrabold text-rose-600">{formatNumber(c.amount)} {storeSettings.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'receivable_checks': {
        const limit = widget.settings.limit || 5;
        let checks = (receivedChecks || []).filter((c: any) => c.status === 'received' || c.status === 'deposited' || !c.status);
        checks.sort((a: any, b: any) => normalizeDateStr(a.dueDate) - normalizeDateStr(b.dueDate));
        checks = checks.slice(0, limit);
        return (
          <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-600" /> چک‌های دریافتی (سررسید نشده)</div>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold">{toPersianDigits(limit)} رکورد</span>
            </h3>
            <div className="flex-1 overflow-auto max-h-64 space-y-3 pr-1">
              {checks.length === 0 ? <div className="text-center text-sm text-gray-400 mt-4">چک دریافتی یافت نشد</div> : checks.map((c: any) => (
                <div key={c.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-black text-gray-800">{getPersonDisplayName(persons.find((x: any) => String(x.id) === String(c.payerId)) || {})}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{toPersianDigits(c.dueDate)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">شماره: {toPersianDigits(c.checkNumber)}</span>
                    <span className="text-sm font-extrabold text-emerald-600">{formatNumber(c.amount)} {storeSettings.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'debtors': {
        const limit = widget.settings.limit || 5;
        let d: any[] = [];
        persons.forEach((p: any) => {
          const bal = calculatePersonBalance(p.id);
          if (bal.status === 'بدهکار') d.push({ ...p, balanceAmount: bal.amount });
        });
        d.sort((a, b) => b.balanceAmount - a.balanceAmount);
        d = d.slice(0, limit);
        return (
          <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" /> اشخاص بدهکار (طلب ما)</div>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold">{toPersianDigits(limit)} رکورد</span>
            </h3>
            <div className="flex-1 overflow-auto max-h-64 space-y-3 pr-1">
              {d.map((p: any) => (
                <div key={p.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-800 line-clamp-1">{getPersonDisplayName(p)}</span>
                  <span className="text-sm font-extrabold text-emerald-600">{formatNumber(p.balanceAmount)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'creditors': {
        const limit = widget.settings.limit || 5;
        let c: any[] = [];
        persons.forEach((p: any) => {
          const bal = calculatePersonBalance(p.id);
          if (bal.status === 'بستانکار') c.push({ ...p, balanceAmount: bal.amount });
        });
        c.sort((a, b) => b.balanceAmount - a.balanceAmount);
        c = c.slice(0, limit);
        return (
          <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> بستانکاران</div>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg font-bold">{toPersianDigits(limit)} رکورد</span>
            </h3>
            <div className="flex-1 overflow-auto max-h-64 space-y-3 pr-1">
              {c.map((p: any) => (
                <div key={p.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-800 line-clamp-1">{getPersonDisplayName(p)}</span>
                  <span className="text-sm font-extrabold text-indigo-600">{formatNumber(p.balanceAmount)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'checks_chart': {
        const allC = [
          ...(receivedChecks || []).map((c: any) => ({ ...c, type: "receive", isPending: c.status === 'received' || c.status === 'deposited' || !c.status })),
          ...(issuedChecks || []).map((c: any) => ({ ...c, type: "issue", isPending: c.status === 'issued' || !c.status })),
        ];
        const monthMap = new Map();
        allC.forEach((c) => {
          const m = c.dueDate?.substring(0, 7) || "نامشخص";
          if (!monthMap.has(m)) monthMap.set(m, { month: m, receivePending: 0, receiveCashed: 0, issuePending: 0, issueCashed: 0 });
          const d = monthMap.get(m);
          if (c.type === "receive") c.isPending ? (d.receivePending += c.amount || 0) : (d.receiveCashed += c.amount || 0);
          else c.isPending ? (d.issuePending += c.amount || 0) : (d.issueCashed += c.amount || 0);
        });
        const data = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
        return (
          <div className="bg-white rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500" /> آمار چک‌ها</h3>
            <div className="h-72 w-full mt-4" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(val) => formatNumber(val)} tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(val: number) => [formatNumber(val), ""]} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "20px" }} />
                  <Bar dataKey="receivePending" name="دریافتی (سررسید نشده)" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="receiveCashed" name="دریافتی (وصول شده)" stackId="a" fill="#6ee7b7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="issuePending" name="پرداختی (سررسید نشده)" stackId="b" fill="#f43f5e" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="issueCashed" name="پرداختی (پاس شده)" stackId="b" fill="#fda4af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }
      case 'personal_notes': {
        return (
          <DashboardPersonalNotesWidget setActiveTab={setActiveTab} />
        );
      }

      default:
        return <div className="p-4 text-gray-500">محتوای ویجت تعریف نشده است</div>;
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-indigo-50 to-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            داشبورد مدیریت مالی
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            محیط کاملاً شخصی‌سازی شده برای مشاهده عملکرد، نقدینگی، و چک‌ها
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-500">بازه زمانی:</span>
            <DatePicker
              range
              dateSeparator=" تا "
              value={reportDateRange}
              onChange={setReportDateRange}
              calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
              locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
              calendarPosition="bottom-right"
              inputClass="text-sm font-bold text-indigo-700 bg-transparent border-none outline-none max-w-[170px] text-center cursor-pointer"
              placeholder="انتخاب بازه تاریخ..."
            />
            {reportDateRange && reportDateRange.length > 0 && (
              <button onClick={() => setReportDateRange([])} className="text-gray-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
            )}
          </div>
          <button
            onClick={() => setShowAddWidget(true)}
            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl flex items-center gap-2 transition-all font-semibold text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" /> افزودن ویجت
          </button>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl flex items-center gap-2 transition-all font-semibold text-sm border border-indigo-100 shadow-sm"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" /> بروزرسانی
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {widgets.map(widget => (
              <SortableWidget 
                key={widget.id} 
                widget={widget} 
                onRemove={() => removeWidget(widget.id)}
                onEdit={() => setEditingWidget(widget)}
              >
                {renderWidgetContent(widget)}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
             <div className="bg-white/80 rounded-2xl shadow-xl border border-indigo-200 w-full h-full min-h-[200px] flex items-center justify-center opacity-80 scale-105 backdrop-blur-sm">
                <span className="font-bold text-indigo-600 flex items-center gap-2"><GripHorizontal className="animate-pulse" /> در حال جابجایی</span>
             </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-gray-900">افزودن ویجت به داشبورد</h2>
              <button onClick={() => setShowAddWidget(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-3">
                {WIDGET_TYPES.filter(wt => !widgets.find(w => w.id === wt.id)).length === 0 ? (
                   <p className="text-center text-gray-500 py-8 font-bold">همه ویجت‌های ممکن در داشبورد شما قرار دارند.</p>
                ) : (
                  WIDGET_TYPES.filter(wt => !widgets.find(w => w.id === wt.id)).map(wt => (
                    <button 
                      key={wt.id} 
                      onClick={() => addWidget(wt)}
                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-xl transition-all text-right group"
                    >
                      <span className="font-bold text-gray-800 group-hover:text-indigo-800">{wt.title}</span>
                      <Plus className="w-5 h-5 text-indigo-500 opacity-50 group-hover:opacity-100" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Widget Settings Modal */}
      {editingWidget && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-gray-100 flex items-center justify-between">
               <h2 className="text-lg font-extrabold text-gray-900">تنظیمات ویجت: {editingWidget.title}</h2>
               <button onClick={() => setEditingWidget(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
             </div>
             <div className="p-6">
                <div className="space-y-4">
                  {['payable_checks', 'debtors', 'creditors'].includes(editingWidget.id) && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">تعداد نمایش رکوردها</label>
                      <select 
                        value={editingWidget.settings?.limit || 5} 
                        onChange={e => setEditingWidget({...editingWidget, settings: {...editingWidget.settings, limit: Number(e.target.value)}})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        <option value={5}>۵ مورد</option>
                        <option value={10}>۱۰ مورد</option>
                        <option value={20}>۲۰ مورد</option>
                        <option value={50}>۵۰ مورد</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">عرض ویجت در داشبورد</label>
                    <select 
                      value={editingWidget.settings?.width || editingWidget.defaultWidth} 
                      onChange={e => setEditingWidget({...editingWidget, settings: {...editingWidget.settings, width: e.target.value}})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      <option value="col-span-1">کوچک (یک ستون)</option>
                      <option value="col-span-1 md:col-span-2">متوسط (دو ستون)</option>
                      <option value="col-span-1 md:col-span-2 lg:col-span-3">بزرگ (سه ستون)</option>
                      <option value="col-span-1 md:col-span-2 lg:col-span-4">کامل (چهار ستون)</option>
                    </select>
                  </div>
                </div>
             </div>
             <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
               <button onClick={() => setEditingWidget(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">انصراف</button>
               <button onClick={() => saveWidgetSettings(editingWidget.id, editingWidget.settings)} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm">ذخیره تنظیمات</button>
             </div>
           </div>
         </div>
      )}

    </div>
  );
}

function SortableWidget({ widget, children, onRemove, onEdit }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const currentWidth = widget.settings?.width || widget.defaultWidth;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative group ${currentWidth} bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-100 transition-colors flex flex-col`}
    >
      {/* Widget Controls - Visible on Hover */}
      <div className="absolute top-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button 
           {...attributes} 
           {...listeners} 
           className="p-1.5 text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing"
           title="جابجایی"
        >
          <GripHorizontal className="w-4 h-4" />
        </button>
          <button 
             onClick={onEdit}
             className="p-1.5 text-gray-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-gray-200 cursor-pointer"
             title="تنظیمات"
          >
            <Settings className="w-4 h-4" />
          </button>
        <button 
           onClick={onRemove}
           className="p-1.5 text-gray-400 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg shadow-sm border border-gray-200 cursor-pointer"
           title="حذف از داشبورد"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 w-full h-full relative z-0">
        {children}
      </div>
    </div>
  );
}
