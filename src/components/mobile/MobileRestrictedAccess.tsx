import React from "react";
import {
  CreditCard,
  BookOpen,
  ShoppingBag,
  Users,
  Coins,
  ArrowRight,
  ShieldAlert,
  Laptop,
  CheckCircle2,
  Receipt,
  Package,
  UserCheck,
  FileSpreadsheet,
} from "lucide-react";

interface MobileRestrictedAccessProps {
  currentTab?: string;
  setActiveTab: (tab: string) => void;
}

export default function MobileRestrictedAccess({
  currentTab,
  setActiveTab,
}: MobileRestrictedAccessProps) {
  const allowedFeatures = [
    {
      id: "create_receive_receipt",
      title: "ثبت دریافت و پرداخت",
      subtitle: "رسیدهای نقدی، بانکی، کارتخوان و واریزی",
      icon: Receipt,
      gradient: "from-teal-600 to-emerald-600",
      tag: "خزانه‌داری",
      quickTabs: [
        { id: "create_receive_receipt", label: "ثبت دریافت وجه" },
        { id: "create_pay_receipt", label: "ثبت پرداخت وجه" },
      ],
    },
    {
      id: "receive_check_form",
      title: "ثبت و مدیریت چک",
      subtitle: "ثبت چک دریافتی، پرداختی و کارتابل چک‌ها",
      icon: BookOpen,
      gradient: "from-sky-600 to-blue-600",
      tag: "اسناد تجاری",
      quickTabs: [
        { id: "receive_check_form", label: "ثبت چک جدید" },
        { id: "received_checks_page", label: "کارتابل چک‌ها" },
      ],
    },
    {
      id: "create_sale",
      title: "ثبت فاکتورها و ثبت کالا",
      subtitle: "صدور سریع فاکتور فروش، خرید و تعریف کالا",
      icon: ShoppingBag,
      gradient: "from-emerald-600 to-teal-700",
      tag: "بازرگانی",
      quickTabs: [
        { id: "create_sale", label: "فاکتور فروش" },
        { id: "create_purchase", label: "فاکتور خرید" },
        { id: "products", label: "ثبت کالا" },
      ],
    },
    {
      id: "persons",
      title: "ثبت شخص، کارت حساب و پروفایل",
      subtitle: "بانک اشخاص، گردش دفتر معین و پرونده مشتری",
      icon: Users,
      gradient: "from-purple-600 to-indigo-600",
      tag: "طرف‌حساب‌ها",
      quickTabs: [
        { id: "persons", label: "لیست و ثبت شخص" },
        { id: "person_ledger", label: "کارت حساب (معین)" },
        { id: "person_profile", label: "پروفایل شخص" },
      ],
    },
    {
      id: "debts_credits",
      title: "گزارش بدهکاران و بستانکاران",
      subtitle: "مانده حساب اشخاص، مطالبات و اخطارهای معوق",
      icon: Coins,
      gradient: "from-rose-600 to-pink-600",
      tag: "گزارشات مالی",
      quickTabs: [
        { id: "debts_credits", label: "گزارش بدهکار / بستانکار" },
        { id: "debtors_showcase", label: "ویترین مطالبات" },
      ],
    },
  ];

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 max-w-lg mx-auto text-right select-none pb-28" dir="rtl">
      {/* Alert Header Box */}
      <div className="w-full bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-3xl p-5 mb-5 shadow-sm text-center relative overflow-hidden">
        <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-amber-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-500/20">
          <Laptop className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 text-[11px] font-black mb-2 border border-amber-500/20">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>عملیات ویژه نسخه دسکتاپ</span>
        </div>
        <h3 className="text-base font-black text-slate-900 mb-1.5">
          این بخش صرفاً در نسخه رایانه (دسکتاپ) قابل دسترسی است
        </h3>
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          برای حفظ دقت حسابداری و عملکرد بهینه در موبایل، دسترسی به این فرم یا گزارش کلان محدود شده است. لطفاً از یکی از ۵ عملیات پرکاربرد زیر استفاده نمایید:
        </p>
      </div>

      {/* 5 Permitted Mobile Operations */}
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-xs font-black text-slate-800">
            عملیات مجاز در حالت موبایل (۵ بخش اصلی):
          </span>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            دسترسی سریع
          </span>
        </div>

        {allowedFeatures.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.id}
              className="bg-white border border-slate-200/90 hover:border-indigo-400/80 rounded-2xl p-3.5 shadow-xs transition-all active:scale-[0.99] group"
            >
              <div
                onClick={() => setActiveTab(feat.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${feat.gradient} text-white flex items-center justify-center shadow-sm shrink-0`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {feat.title}
                      </h4>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {feat.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                      {feat.subtitle}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center transition-colors shrink-0">
                  <ArrowRight className="w-4 h-4 transform rotate-180" />
                </div>
              </div>

              {/* Sub tabs pills */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                {feat.quickTabs.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveTab(q.id)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/60 transition-colors cursor-pointer"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-[11px] text-slate-400 font-medium leading-relaxed px-4">
        جهت ثبت اسناد دوبل حسابداری، بستن حساب‌ها، انبارگردانی دوره‌ای و تغییر تنظیمات سامانه از رایانه استفاده نمایید.
      </div>
    </div>
  );
}
