import { convertToGregorian } from '../../utils/format';
import BeautifulLoading from '../BeautifulLoading';
import React, { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, Phone, MessageSquare, MapPin, Receipt, Wallet, FileText, ArrowRight, Building2, Calendar, Edit2, ShoppingCart, Truck, CheckCircle, Clock } from "lucide-react";
import { PersonCheckHistory } from './PersonCheckHistory';
import { getPersonFollowUps } from "../../services/dataService";
import SendPersonMessageModal from "../modals/SendPersonMessageModal";

interface PersonProfileViewProps {
  personId: string | number;
  persons: any[];
  invoices: any[];
  transactions: any[];
  issuedChecks: any[];
  receivedChecks: any[];
  accountingDocuments: any[];
  storeSettings: any;
  calculatePersonBalance: (id: string | number) => { amount: number, status: string, color?: string, bg?: string };
  onBack: () => void;
  onEdit: (person: any) => void;
  onViewExtraInfo: (person: any) => void;
  onViewLedger: (personId: string | number) => void;
  onCreateSale: (personId: string | number) => void;
  onCreatePurchase: (personId: string | number) => void;
  onCreateReceive: (personId: string | number) => void;
  onCreatePay: (personId: string | number) => void;
  getPersonDisplayName: (p: any) => string;
  getRoleName: (roleId?: string) => string;
  getRoleBadgeClasses: (roleId?: string) => string;
  formatCurrency: (amount: number) => string;
  toPersianDigits: (str: string | number) => string;
  showNotification?: (msg: string, type: "success" | "error") => void;
  formatDateDisplay: (date: any) => string;
}

function PersonFollowUpCrmSection({ personId, storeSettings }: { personId: any; storeSettings: any }) {
  const [followUpData, setFollowUpData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadFollowUps = async () => {
      try {
        setIsLoading(true);
        const data = await getPersonFollowUps();
        if (isMounted) {
          const list = Array.isArray(data) ? data : [];
          const personData = list.find((d: any) => String(d?.personId) === String(personId));
          setFollowUpData(personData || null);
        }
      } catch (e) {
        console.error("Error loading followups:", e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    if (personId) {
      loadFollowUps();
    } else {
      setIsLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [personId]);

  if (isLoading) {
    return <div className="text-center py-6 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">در حال بارگذاری اطلاعات پیگیری...</div>;
  }

  if (!followUpData) {
    return <div className="text-center py-6 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">سابقه پیگیری برای این شخص ثبت نشده است.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-bold text-slate-600">وضعیت فعلی:</span>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
          {followUpData.status}
        </span>
        {followUpData.nextActionDate && (
          <span className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-bold">
            <Calendar className="w-4 h-4" />
            اقدام بعدی: {storeSettings?.calendarType === 'gregorian' ? new Date(followUpData.nextActionDate).toLocaleDateString('en-US') : new Date(followUpData.nextActionDate).toLocaleDateString('fa-IR')}
          </span>
        )}
      </div>
      
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-4">
        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" /> تاریخچه یادداشت‌ها
        </h4>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {!followUpData.notes || followUpData.notes.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-3">یادداشتی ثبت نشده است</div>
          ) : (
            [...followUpData.notes].reverse().map((note: any, idx: number) => (
              <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 relative">
                <span className="absolute left-3 top-3 text-[10px] text-slate-400 font-sans">
                  {storeSettings?.calendarType === 'gregorian' ? new Date(note.date).toLocaleDateString('en-US') : new Date(note.date).toLocaleDateString('fa-IR')}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed pl-16 whitespace-pre-wrap">{note.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function PersonProfileView({
  personId,
  persons,
  invoices,
  transactions,
  issuedChecks,
  receivedChecks,
  accountingDocuments,
  storeSettings,
  calculatePersonBalance,
  onBack,
  onEdit,
  onViewExtraInfo,
  onViewLedger,
  onCreateSale,
  onCreatePurchase,
  onCreateReceive,
  onCreatePay,
  getPersonDisplayName,
  getRoleName,
  getRoleBadgeClasses,
  formatCurrency,
  toPersianDigits,
  showNotification,
  formatDateDisplay
}: PersonProfileViewProps) {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  const person = useMemo(() => {
    return (persons || []).find(p => p && p.id != null && personId != null && String(p.id) === String(personId)) || null;
  }, [persons, personId]);

  useEffect(() => {
    let isMounted = true;
    const loadFollowUps = async () => {
      try {
        const data = await getPersonFollowUps();
        if (isMounted) {
          const list = Array.isArray(data) ? data : [];
          setFollowUps(list.filter((f: any) => String(f?.personId) === String(personId)));
        }
      } catch (e) {
        console.error("Error loading follow ups", e);
      }
    };
    if (personId) {
      loadFollowUps();
    }
    return () => {
      isMounted = false;
    };
  }, [personId]);

  const balance = useMemo(() => {
    if (!personId || !calculatePersonBalance) return { amount: 0, status: 'بی‌حساب', value: 0 };
    return calculatePersonBalance(personId);
  }, [personId, calculatePersonBalance]);

  const { totalDebits, totalCredits } = useMemo(() => {
    if (!person || !accountingDocuments) return { totalDebits: 0, totalCredits: 0 };
    let debits = 0;
    let credits = 0;

    (accountingDocuments || []).forEach((doc: any) => {
      if (doc?.status === 'draft' || doc?.isDeleted) return;
      if (doc?.items && Array.isArray(doc.items)) {
        doc.items.forEach((item: any) => {
          if (String(item?.detailedAccountId) === String(personId)) {
            debits += Number(item?.debit) || 0;
            credits += Number(item?.credit) || 0;
          }
        });
      }
    });

    return { totalDebits: debits, totalCredits: credits };
  }, [person, accountingDocuments, personId]);

  const recentInvoices = useMemo(() => {
    return (invoices || []).filter(inv => String(inv?.customerId) === String(personId) && inv?.status !== 'draft' && inv?.status !== 'voided')
      .sort((a, b) => new Date(convertToGregorian(b?.date)).getTime() - new Date(convertToGregorian(a?.date)).getTime())
      .slice(0, 5);
  }, [invoices, personId]);

  const totalInvoices = useMemo(() => (invoices || []).filter(i => String(i?.customerId) === String(personId) && i?.status !== 'draft' && i?.status !== 'voided').length, [invoices, personId]);
  
  const pendingChecksCount = useMemo(() => {
    const issued = (issuedChecks || []).filter((c: any) => String(c?.payeeId) === String(personId) && c?.status !== "cancelled" && c?.status !== "bounced" && c?.status !== "cashed").length;
    const received = (receivedChecks || []).filter((c: any) => String(c?.payerId) === String(personId) && c?.status !== "returned" && c?.status !== "bounced" && c?.status !== "cashed").length;
    return issued + received;
  }, [issuedChecks, receivedChecks, personId]);

  if (!person) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto my-12" dir="rtl">
        <p className="text-slate-600 font-bold mb-4">شخص مورد نظر در سیستم یافت نشد یا در حال بارگذاری است.</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
        >
          بازگشت به لیست اشخاص
        </button>
      </div>
    );
  }

  const isOwed = balance.status === "بدهکار";
  const isOwes = balance.status === "بستانکار";
  const isClr = balance.status === "بی‌حساب" || balance.status === "تسویه";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-right pb-10"
      dir="rtl"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-200 bg-slate-100 rounded-full transition-colors"
        >
          <ArrowRight className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          پروفایل شخص
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info Card */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full mb-4 border-4 border-slate-100 shadow-sm overflow-hidden flex items-center justify-center bg-indigo-50">
            {person.imageUrl ? (
              <img src={person.imageUrl} alt={getPersonDisplayName(person)} className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 text-indigo-300" />
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900">{getPersonDisplayName(person)}</h2>
          <span className={`text-xs font-bold px-3 py-1 rounded-full mt-2 mb-6 ${getRoleBadgeClasses(person.role)}`}>
            {getRoleName(person.role)}
          </span>

          <div className="w-full space-y-4 text-sm font-bold text-slate-700 text-right mt-6">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-indigo-700">{toPersianDigits(totalInvoices)}</span>
                <span className="text-[10px] text-indigo-600 font-bold mt-1">تعداد فاکتورها</span>
              </div>
              <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-amber-700">{toPersianDigits(pendingChecksCount)}</span>
                <span className="text-[10px] text-amber-600 font-bold mt-1">چک‌های درجریان</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
                <span dir="ltr">{toPersianDigits(person.phone || "---")}</span>
              </div>
              {person.phone && (
                <button
                  type="button"
                  onClick={() => setIsMessageModalOpen(true)}
                  className="px-2 py-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="ارسال پیام به این شماره"
                >
                  <MessageSquare className="w-3 h-3" />
                  ارسال پیام
                </button>
              )}
            </div>
            {person.contacts && person.contacts.length > 0 && person.contacts.map((contact: any, idx: number) => {
              const typeMap: any = { mobile: 'موبایل', phone: 'تلفن ثابت', fax: 'فکس', email: 'ایمیل', website: 'وبسایت', instagram: 'اینستاگرام', telegram: 'تلگرام', whatsapp: 'واتساپ', address: 'آدرس', postal_code: 'کد پستی', other: 'دیگر' };
              const tLabel = typeMap[contact.type] || 'دیگر';
              const isPhoneLike = contact.type === 'mobile' || contact.type === 'phone';
              return (
                <div key={idx} className="flex items-center justify-between gap-2 group">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 flex justify-center items-center">
                      {contact.type === 'address' ? <MapPin className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    </span>
                    <span dir={contact.type === 'address' || contact.type === 'other' ? "rtl" : "ltr"} className="leading-relaxed">
                      {toPersianDigits(contact.number)}
                    </span>
                    {contact.title && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">{contact.title}</span>}
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">({tLabel})</span>
                  </div>
                  {isPhoneLike && (
                    <button
                      type="button"
                      onClick={() => setIsMessageModalOpen(true)}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer opacity-80 hover:opacity-100"
                      title="ارسال پیام به این شماره"
                    >
                      <MessageSquare className="w-3 h-3" />
                      پیام
                    </button>
                  )}
                </div>
              );
            })}
            {person.personCode && (
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>کد شخص: {toPersianDigits(person.personCode)}</span>
              </div>
            )}
            {person.accountingCode && (
              <div className="flex items-center gap-3">
                <Wallet className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>کد حسابداری: {toPersianDigits(person.accountingCode)}</span>
              </div>
            )}
            {person.registrationDate && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>تاریخ ثبت: {formatDateDisplay(person.registrationDate)}</span>
              </div>
            )}
            {person.nationalId && (
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>کد ملی: {toPersianDigits(person.nationalId)}</span>
              </div>
            )}
            {person.companyName && (
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>{person.companyName}</span>
              </div>
            )}
            <div className="flex items-center gap-3 items-start">
              <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{person.address || "بدون آدرس"}</span>
            </div>
          </div>

          <button 
            onClick={() => onEdit(person)}
            className="mt-8 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            ویرایش اطلاعات
          </button>
          
          <button 
            onClick={() => onViewExtraInfo(person)}
            className="mt-3 w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-indigo-100"
          >
            <FileText className="w-4 h-4" />
            اطلاعات تکمیلی بانکی و یادداشت‌ها
          </button>
        </div>

        {/* Financial & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Summary */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-indigo-600" />
              وضعیت مالی
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-xs font-bold text-slate-500 mb-1">جمع مبلغ خرید شخص (افزایش بدهی)</div>
                <div className="text-lg font-black text-slate-900">{toPersianDigits(formatCurrency(totalDebits))}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-xs font-bold text-slate-500 mb-1">جمع پرداختی‌های شخص (کاهش بدهی)</div>
                <div className="text-lg font-black text-slate-900">{toPersianDigits(formatCurrency(totalCredits))}</div>
              </div>
              <div className={`p-4 rounded-2xl border ${isClr ? 'bg-slate-100 border-slate-200' : isOwed ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="text-xs font-bold text-slate-500 mb-1">مانده نهایی حساب</div>
                <div className={`text-xl font-black ${isClr ? 'text-slate-800' : isOwed ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {isClr ? 'تسویه کامل' : (
                    <>
                      {toPersianDigits(formatCurrency(Math.abs(balance.amount)))}
                      <span className="text-xs font-bold mr-2">{isOwed ? 'بدهی شخص به ما' : 'طلب شخص از ما'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={() => onViewLedger(personId)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
            >
              <FileText className="w-5 h-5" />
              مشاهده ریز جزئیات و کارت حساب (دفتر معین)
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
              عملیات سریع
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button 
                onClick={() => onCreateSale(personId)}
                className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl font-bold text-sm transition-colors flex flex-col items-center gap-2 border border-blue-100"
              >
                <div className="p-2 bg-white rounded-xl shadow-sm"><ShoppingCart className="w-5 h-5 text-blue-600" /></div>
                فروش جدید
              </button>
              <button 
                onClick={() => onCreatePurchase(personId)}
                className="p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl font-bold text-sm transition-colors flex flex-col items-center gap-2 border border-purple-100"
              >
                <div className="p-2 bg-white rounded-xl shadow-sm"><Truck className="w-5 h-5 text-purple-600" /></div>
                خرید جدید
              </button>
              <button 
                onClick={() => onCreateReceive(personId)}
                className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl font-bold text-sm transition-colors flex flex-col items-center gap-2 border border-emerald-100"
              >
                <div className="p-2 bg-white rounded-xl shadow-sm"><Receipt className="w-5 h-5 text-emerald-600" /></div>
                دریافت وجه
              </button>
              <button 
                onClick={() => onCreatePay(personId)}
                className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl font-bold text-sm transition-colors flex flex-col items-center gap-2 border border-rose-100"
              >
                <div className="p-2 bg-white rounded-xl shadow-sm"><Wallet className="w-5 h-5 text-rose-600" /></div>
                پرداخت وجه
              </button>
              <button 
                onClick={() => setIsMessageModalOpen(true)}
                className="p-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-2xl font-bold text-sm transition-colors flex flex-col items-center gap-2 border border-amber-100"
              >
                <div className="p-2 bg-white rounded-xl shadow-sm"><MessageSquare className="w-5 h-5 text-amber-600" /></div>
                ارسال پیام
              </button>
            </div>
          </div>

          {/* Bank Accounts and Notes */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              حساب‌های بانکی و یادداشت‌ها
            </h3>
            
            <div className="space-y-4">
              {person.additionalNotes && (
                <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                  <div className="text-xs font-bold text-indigo-600 mb-1">یادداشت‌های شخص</div>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">{person.additionalNotes}</p>
                </div>
              )}

              {(!person.bankAccounts || person.bankAccounts.length === 0) && !person.additionalNotes ? (
                <div className="text-center py-6 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  اطلاعات تکمیلی ثبت نشده است.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {(person.bankAccounts || []).map((acc: any, i: number) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-800">{acc.title || 'حساب بانکی'}</span>
                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">{acc.bankName || 'نامشخص'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                        {(acc.accountNumber || acc.accountNo) && (
                          <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold mb-0.5">شماره حساب</span>
                            <span className="text-sm font-mono text-slate-700" dir="ltr">{acc.accountNumber || acc.accountNo}</span>
                          </div>
                        )}
                        {(acc.cardNumber || acc.cardNo) && (
                          <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold mb-0.5">شماره کارت</span>
                            <span className="text-sm font-mono text-slate-700" dir="ltr">{acc.cardNumber || acc.cardNo}</span>
                          </div>
                        )}
                        {(acc.shebaNumber || acc.sheba) && (
                          <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold mb-0.5">شماره شبا</span>
                            <span className="text-sm font-mono text-slate-700" dir="ltr">{acc.shebaNumber || acc.sheba}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Follow Ups (CRM) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-indigo-600" />
              پیگیری‌ها و ارتباطات
            </h3>
            {followUps.length === 0 ? (
              <div className="text-center py-6 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                پیگیری‌ای ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-3">
                {followUps.slice(0, 5).map(f => (
                  <div key={f.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                          f.type === 'call' ? 'bg-blue-100 text-blue-700' :
                          f.type === 'meeting' ? 'bg-purple-100 text-purple-700' :
                          f.type === 'account_followup' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-200 text-slate-700'
                      }`}>
                        {f.type === 'call' ? 'تماس' : f.type === 'meeting' ? 'جلسه' : f.type === 'account_followup' ? 'پیگیری حساب' : 'پیام'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${f.status === 'pending' ? 'bg-amber-100 text-amber-700' : f.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {f.status === 'pending' ? 'در انتظار' : f.status === 'completed' ? 'تکمیل شده' : 'لغو شده'}
                      </span>
                      <span className="text-xs font-bold text-slate-500 mr-auto">
                        {formatDateDisplay(f.date)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{f.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Invoices */}

          {/* Person Check History */}
          <PersonCheckHistory personId={personId} issuedChecks={issuedChecks} receivedChecks={receivedChecks} />

          {/* CRM Follow Ups */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm md:col-span-3">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-indigo-600" />
              گزارش پیگیری (CRM)
            </h3>
            <PersonFollowUpCrmSection personId={personId} storeSettings={storeSettings} />
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              آخرین فاکتورها
            </h3>
            {recentInvoices.length === 0 ? (
              <div className="text-center py-6 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                فاکتوری ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-3">
                {recentInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${inv.type === 'sale' ? 'bg-blue-100 text-blue-700' : inv.type === 'purchase' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}`}>
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          فاکتور {toPersianDigits(inv.invoiceNumber || inv.id)}
                          <span className="text-[10px] bg-white px-2 border border-slate-200 rounded text-slate-500">
                            {inv.type === 'sale' ? 'فروش' : inv.type === 'purchase' ? 'خرید' : 'سایر'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-500 mt-0.5">
                          {formatDateDisplay(inv.jalaliDate || inv.date)}
                        </div>
                      </div>
                    </div>
                    <div className="font-black text-slate-900 text-sm text-left">
                      {toPersianDigits(formatCurrency(inv.totalAmount || 0))}
                      <span className="text-[9px] font-bold text-slate-400 block">{storeSettings.currency}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <SendPersonMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        person={person}
        showNotification={showNotification || (() => {})}
        calculatePersonBalance={calculatePersonBalance}
        storeSettings={storeSettings}
      />
    </motion.div>
  );
}
