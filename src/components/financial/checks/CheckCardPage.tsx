import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, ArrowRight, User, Building2, Calendar, FileText,
  History as HistoryIcon, Clock, CheckCircle, XCircle, RefreshCw,
  AlertTriangle, Save, Printer, ExternalLink
} from "lucide-react";
import { getIssuedChecks, getReceivedChecks, updateReceivedCheck, getPersons, getCheckAuditLogs, updateIssuedCheck, addCheckHistoryLog, syncCheckAccountingDocument, getTransactions } from "../../../services/dataService";
import { formatDateDisplay } from "../../../utils/format";
import Num2persian from "num2persian";

export default function CheckCardPage({
  checkId,
  checkType,
  onClose,
  showNotification,
  currentUser,
  storeSettings,
  onViewAccountingDoc
}: {
  checkId: string | number;
  checkType: "issued" | "received";
  onClose: () => void;
  showNotification: any;
  currentUser: string;
  storeSettings: any;
  onViewAccountingDoc?: (doc: any) => void;
}) {
  const [check, setCheck] = useState<any>(null);
  const [persons, setPersons] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Transitions
  const transitions: Record<string, string[]> = {
    'draft': ['issued'],
    'issued': ['delivered'],
    'delivered': ['in_clearing', 'stop_payment', 'lost', 'overdue'],
    'in_clearing': ['cashed', 'bounced'],
    'bounced': ['re_assigned', 'legal_action', 'settled_other_way', 'cancelled'],
    're_assigned': ['in_clearing'],
    'stop_payment': ['cancelled', 'replaced'],
    'lost': ['cancelled', 'replaced'],
    'overdue': ['cancelled', 'replaced'],
    // final states: cashed, returned, settled_other_way, cancelled, replaced
  };
  
  const stateLabels: Record<string, string> = {
    'draft': 'پیش‌نویس',
    'issued': 'صادر شده',
    'delivered': 'تحویل شده نزد ذینفع',
    'in_clearing': 'در جریان وصول',
    'cashed': 'وصول شده (موفق)',
    'bounced': 'برگشت خورده',
    'stop_payment': 'دستور عدم پرداخت',
    'lost': 'مفقود شده',
    'overdue': 'معوق (سررسید گذشته)',
    're_assigned': 'واگذاری مجدد',
    'legal_action': 'پیگیری قانونی',
    'settled_other_way': 'تسویه به روش دیگر',
    'cancelled': 'ابطال شده (نهایی)',
    'replaced': 'جایگزین شده',
    'returned': 'مسترد شده'
  };

  const stateColors: Record<string, string> = {
    'draft': 'bg-gray-100 text-gray-700 border-gray-200',
    'issued': 'bg-blue-100 text-blue-700 border-blue-200',
    'delivered': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'in_clearing': 'bg-amber-100 text-amber-700 border-amber-200',
    'cashed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bounced': 'bg-rose-100 text-rose-700 border-rose-200',
    'stop_payment': 'bg-orange-100 text-orange-700 border-orange-200',
    'lost': 'bg-red-100 text-red-700 border-red-200',
    'overdue': 'bg-rose-100 text-rose-700 border-rose-200',
    're_assigned': 'bg-purple-100 text-purple-700 border-purple-200',
    'legal_action': 'bg-slate-100 text-slate-700 border-slate-300',
    'settled_other_way': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'cancelled': 'bg-gray-200 text-gray-500 border-gray-300',
    'replaced': 'bg-teal-100 text-teal-700 border-teal-200',
    'returned': 'bg-gray-200 text-gray-600 border-gray-300'
  };
  
  const financialEffectStates = ['issued', 'cashed', 'bounced', 'cancelled', 'settled_other_way', 'returned'];
  
  useEffect(() => {
    loadData();
  }, [checkId]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const isReceived = checkType === 'received';
      const idToFind = checkId;
      const [checks, prs, logs, txs] = await Promise.all([
        isReceived ? getReceivedChecks() : getIssuedChecks(),
        getIssuedChecks(),
        getPersons(),
        getCheckAuditLogs(),
        getTransactions()
      ]);
      const found = checks.find(c => String(c.id) === String(idToFind));
      setCheck(found);
      setPersons(prs);
      
      const checkLogs = logs.filter((l: any) => String(l.checkId) === String(idToFind) && l.checkType === (isReceived ? 'received' : 'issued'));
      // get actual history items which we recently added to `check_history` via `accountingService` if they exist
      // Here we will use checkLogs which is the generic audit logs, or we can fetch `check_history`
      // For simplicity let's rely on audit logs if `check_history` is missing
      setHistory(checkLogs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setTransactions(txs);
      
    } catch (e) {
      console.error(e);
      showNotification("خطا در بارگذاری اطلاعات چک", "error");
    } finally {
      setLoading(false);
    }
  };
  
  const handleStateChange = async (newState: string) => {
    if (!check) return;
    const hasFinEffect = financialEffectStates.includes(newState);
    
    if (hasFinEffect) {
      if (!window.confirm(`تغییر وضعیت به «${stateLabels[newState]}» دارای اثر مالی است و سند حسابداری ایجاد/بروزرسانی خواهد شد. آیا مطمئن هستید؟`)) {
        return;
      }
    }
    
    setSaving(true);
    try {
      const oldCheck = { ...check };
      const updatedCheck = { ...check, status: newState };
      const isReceived = checkType === 'received';
      if (isReceived) {
        await updateReceivedCheck(String(check.id), updatedCheck);
      } else {
        await updateIssuedCheck(String(check.id), updatedCheck);
      }
      
      // Fin effect
      if (hasFinEffect) {
         try {
           await syncCheckAccountingDocument(isReceived ? 'received' : 'issued', updatedCheck, oldCheck);
         } catch(e) {
           console.error(e);
           showNotification("وضعیت تغییر کرد اما در ثبت سند مالی خطایی رخ داد", "warning");
         }
      }
      
      showNotification("وضعیت چک با موفقیت تغییر کرد", "success");
      await loadData();
    } catch(e: any) {
      showNotification(e.message || "خطا در تغییر وضعیت", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center">در حال بارگذاری...</div>;
  }
  
  if (!check) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl" dir="rtl">
        <AlertTriangle className="w-16 h-16 text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-700">چک مورد نظر یافت نشد</h2>
        <button onClick={onClose} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg">بازگشت</button>
      </div>
    );
  }

  const currentStatus = check.status || 'draft';
  const allowedNext = transitions[currentStatus] || [];
  const payee = persons.find(p => p.id === (checkType === "received" ? check.payerId : check.payeeId));
  const isClosed = allowedNext.length === 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 max-w-5xl mx-auto h-full overflow-y-auto" dir="rtl">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onClose} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
          <ArrowRight className="w-5 h-5" />
          <span className="font-medium">بازگشت به لیست</span>
        </button>
        
        <div className="flex items-center gap-3">
           <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
             <Printer className="w-5 h-5" /> چاپ برگه
           </button>
           {currentStatus === 'draft' && (
             <button className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg shadow-sm hover:bg-indigo-50 transition-colors">
               ویرایش اطلاعات
             </button>
           )}
        </div>
      </div>
      
      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden print:shadow-none print:border-none">
        
        {/* Card Header (Check details) */}
        <div className="bg-gradient-to-l from-slate-800 to-slate-900 p-6 md:p-8 text-white relative overflow-hidden">
          <div className="absolute -left-10 -top-10 opacity-10 pointer-events-none">
            <CreditCard className="w-48 h-48 transform -rotate-12" />
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
               <div>
                 <h1 className="text-3xl font-bold font-['YekanBakh'] mb-2 flex items-center gap-3">
                   برگه چک پرداختنی
                   <span className={`text-sm px-3 py-1 rounded-full border ${stateColors[currentStatus]}`}>
                     {stateLabels[currentStatus] || currentStatus}
                   </span>
                 </h1>
                 <p className="text-slate-300 font-mono text-lg tracking-widest">{check.sayadId || 'شناسه صیادی ثبت نشده'}</p>
               </div>
               <div className="text-left">
                 <div className="text-sm text-slate-400 mb-1">مبلغ چک</div>
                 <div className="text-4xl font-black font-sans tracking-tight text-emerald-400">
                   {Number(check.amount).toLocaleString('fa-IR')} <span className="text-lg text-emerald-200 font-normal">{storeSettings?.currency || 'تومان'}</span>
                 <div className="text-sm text-slate-300 mt-2 font-normal">{Num2persian(check.amount)} {storeSettings?.currency || 'تومان'}</div>
                 </div>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3"/> شماره سریال چک</span>
                <span className="font-mono text-lg">{check.checkNumber}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs mb-1 flex items-center gap-1"><User className="w-3 h-3"/> ذینفع (گیرنده)</span>
                <span className="font-bold text-lg">{payee ? payee.name : 'نامشخص'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> تاریخ صدور</span>
                <span className="font-sans font-medium">{formatDateDisplay(check.issueDate, storeSettings?.calendarType)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> تاریخ سررسید</span>
                <span className="font-sans font-medium text-amber-300">{formatDateDisplay(check.dueDate, storeSettings?.calendarType)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Body */}
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Timeline & Details */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> مشخصات تکمیلی
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <span className="block text-gray-500 mb-1">بابت / شرح</span>
                  <span className="font-medium text-gray-900">{check.reason || '---'}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <span className="block text-gray-500 mb-1">دسته چک مبدأ</span>
                  <span className="font-medium text-gray-900">حساب متصل: {check.checkbookId || '---'}</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl col-span-2">
                  <span className="block text-gray-500 mb-1">توضیحات</span>
                  <span className="font-medium text-gray-900 leading-relaxed">{check.description || '---'}</span>
                </div>
              </div>
            </section>
            
            <section>
              <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-indigo-500" /> تاریخچه تغییرات وضعیت
              </h3>
              <div className="relative border-r-2 border-gray-100 pr-6 ml-4 space-y-6">
                {history.map((log, idx) => {
                   const actionLabel = log.action === 'create' ? 'ثبت اولیه چک' : 
                                       log.action === 'status_change' ? 'تغییر وضعیت' : 
                                       log.action === 'update' ? 'ویرایش چک' : log.action;
                   
                   const nV = log.newValues?.status;
                   const oV = log.oldValues?.status;
                   
                   return (
                     <div key={log.id || idx} className="relative">
                       <span className="absolute -right-[31px] bg-white border-2 border-indigo-400 w-4 h-4 rounded-full mt-1.5 shadow-sm ring-4 ring-white"></span>
                       <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                         <div className="flex justify-between items-start mb-2">
                           <span className="font-bold text-gray-800">{actionLabel}</span>
                           <span className="text-xs text-gray-500 font-sans" dir="ltr">{new Date(log.createdAt).toLocaleString('fa-IR')}</span>
                         </div>
                         {(nV || oV) && (
                           <div className="flex items-center gap-3 text-sm mt-3 bg-white p-3 rounded-lg border border-gray-100">
                             {oV && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">{stateLabels[oV] || oV}</span>}
                             {oV && nV && <ArrowRight className="w-4 h-4 text-gray-400" />}
                             {nV && <span className={`px-2 py-1 rounded font-medium ${stateColors[nV] || 'bg-gray-100 text-gray-800'}`}>{stateLabels[nV] || nV}</span>}
                           </div>
                         )}
                         <div className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                           <User className="w-3 h-3" /> توسط: {log.userId || 'سیستم'}
                         </div>
                       </div>
                     </div>
                   )
                })}
                {history.length === 0 && (
                  <div className="text-gray-400 italic">تاریخچه‌ای ثبت نشده است.</div>
                )}
              </div>
            </section>
          </div>
          
          {/* Action Panel */}
          <div className="space-y-6 print:hidden">
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 shadow-sm sticky top-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-slate-600" /> عملیات و تغییر وضعیت
              </h3>
              
              {isClosed ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 flex flex-col items-center justify-center text-center gap-3">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                  <div>
                    <span className="block font-bold mb-1">پرونده این چک بسته شده است</span>
                    <span className="text-sm opacity-80">امکان تغییر وضعیت در این مرحله وجود ندارد.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-slate-500 mb-2">وضعیتهای مجاز بعدی:</div>
                  <div className="grid grid-cols-1 gap-2">
                    {allowedNext.map(nextState => {
                      const isFinancial = financialEffectStates.includes(nextState);
                      return (
                        <button 
                          key={nextState}
                          onClick={() => handleStateChange(nextState)}
                          disabled={saving}
                          className={`
                            text-right px-4 py-3 rounded-lg border font-medium flex items-center justify-between group transition-all
                            ${stateColors[nextState]} hover:shadow-md hover:-translate-y-0.5 active:translate-y-0
                          `}
                        >
                          <div className="flex flex-col gap-1">
                            <span>{stateLabels[nextState]}</span>
                            {isFinancial && (
                               <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                                 <FileText className="w-3 h-3" /> ثبت سند مالی
                               </span>
                            )}
                          </div>
                          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:-translate-x-1" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="mt-8 pt-6 border-t border-slate-200">
                <button onClick={() => {
                  const doc = transactions?.find(t => t.linkedCheckId === check.id || t.items?.some(i => i.description?.includes(check.checkNumber)));
                  if (doc && onViewAccountingDoc) onViewAccountingDoc(doc);
                  else showNotification('سند حسابداری برای این وضعیت یافت نشد', 'info');
                }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-300 rounded-xl transition-colors font-bold">
                  <ExternalLink className="w-5 h-5" />
                  مشاهده سند حسابداری
                </button>
              </div>
              
            </div>
          </div>
          
        </div>
      </div>
    </motion.div>
  );
}
