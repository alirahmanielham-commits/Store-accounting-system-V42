import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ShieldAlert, CheckCircle, Search, Copy, RefreshCw, AlertTriangle, Bug, ClipboardList } from "lucide-react";
import { getAccountingDocuments } from "../../services/dataService";

interface SystemDiagnosticsProps {
  persons: any[];
  invoices: any[];
  products: any[];
  transactions: any[];
  warehouseStocks: any[];
  issuedChecks: any[];
  receivedChecks: any[];
}

export default function SystemDiagnostics({
  persons,
  invoices,
  products,
  transactions,
  warehouseStocks,
  issuedChecks,
  receivedChecks
}: SystemDiagnosticsProps) {
  
  const [issues, setIssues] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);
  
  const runDiagnostics = async () => {
    setIsChecking(true);
    setIssues([]);
    try {
      const foundIssues: any[] = [];
      const accDocs = await getAccountingDocuments();
      
      // 1. Check for dangling persons in invoices
      invoices.forEach(inv => {
        if (inv.customerId && !persons.find(p => String(p.id) === String(inv.customerId))) {
          foundIssues.push({
            id: Math.random(),
            type: 'error',
            module: 'بازرگانی (فاکتورها)',
            title: 'فاکتور با شخص نامعتبر',
            description: `فاکتور شماره ${inv.invoiceNumber || inv.id} به شخصی متصل است که در سیستم وجود ندارد.`,
            prompt: `لطفا فاکتور شماره ${inv.invoiceNumber || inv.id} را بررسی کن و شخص متصل به آن که آیدی ${inv.customerId} دارد را با یک شخص معتبر جایگزین کن یا فاکتور را حذف کن.`
          });
        }
      });
      
      // 2. Check for negative stocks
      warehouseStocks.forEach(stock => {
        if (stock.stock < 0) {
          const product = products.find(p => String(p.id) === String(stock.productId));
          foundIssues.push({
            id: Math.random(),
            type: 'warning',
            module: 'انبارداری',
            title: 'موجودی منفی کالا',
            description: `کالای ${product?.name || stock.productId} دارای موجودی منفی (${stock.stock}) در انبار ${stock.warehouseId} است.`,
            prompt: `موجودی کالای "${product?.name || stock.productId}" منفی شده است. لطفا بررسی کن که آیا رسید انبار برای این کالا ثبت نشده یا حواله اضافی صادر شده است.`
          });
        }
      });

      // 3. Dangling products in invoices
      invoices.forEach(inv => {
        if (inv.items && Array.isArray(inv.items)) {
          inv.items.forEach((item: any) => {
            if (item.productId && !products.find(p => String(p.id) === String(item.productId))) {
               foundIssues.push({
                  id: Math.random(),
                  type: 'error',
                  module: 'بازرگانی (فاکتورها)',
                  title: 'کالای نامعتبر در فاکتور',
                  description: `فاکتور شماره ${inv.invoiceNumber || inv.id} شامل کالایی با آیدی نامعتبر (${item.productId}) است.`,
                  prompt: `فاکتور شماره ${inv.invoiceNumber || inv.id} دارای آیتمی با کالای پاک شده است. لطفا این آیتم را از فاکتور حذف یا با یک کالای موجود جایگزین کن.`
               });
            }
          });
        }
      });

      // 4. Dangling persons in transactions
      transactions.forEach(t => {
        if (t.personId && !persons.find(p => String(p.id) === String(t.personId))) {
           foundIssues.push({
             id: Math.random(),
             type: 'error',
             module: 'خزانه‌داری (تراکنش‌ها)',
             title: 'تراکنش با شخص نامعتبر',
             description: `تراکنش مالی به مبلغ ${t.amount} در تاریخ ${new Date(t.date).toLocaleDateString('fa-IR')} به شخصی متصل است که وجود ندارد.`,
             prompt: `یک تراکنش به مبلغ ${t.amount} به شخصی با آیدی نامعتبر (${t.personId}) متصل است. لطفا آن را اصلاح یا حذف کن.`
           });
        }
      });

      // 5. Check validity in issued checks
      issuedChecks.forEach(c => {
        if (c.payeeId && !persons.find(p => String(p.id) === String(c.payeeId))) {
           foundIssues.push({
             id: Math.random(),
             type: 'error',
             module: 'چک و بانک',
             title: 'چک پرداختی با شخص نامعتبر',
             description: `چک پرداختی شماره ${c.checkNumber} به شخصی متصل است که وجود ندارد.`,
             prompt: `چک پرداختی شماره ${c.checkNumber} دارای گیرنده نامعتبر است. لطفا گیرنده را اصلاح کن.`
           });
        }
      });
      
      // 6. Check validity in received checks
      receivedChecks.forEach(c => {
        if (c.payerId && !persons.find(p => String(p.id) === String(c.payerId))) {
           foundIssues.push({
             id: Math.random(),
             type: 'error',
             module: 'چک و بانک',
             title: 'چک دریافتی با شخص نامعتبر',
             description: `چک دریافتی شماره ${c.checkNumber} به شخصی متصل است که وجود ندارد.`,
             prompt: `چک دریافتی شماره ${c.checkNumber} دارای پرداخت کننده نامعتبر است. لطفا شخص را اصلاح کن.`
           });
        }
      });

      // 7. Check if invoice total matches sum of items
      invoices.forEach(inv => {
        if (inv.items && Array.isArray(inv.items)) {
          let expectedTotal = 0;
          inv.items.forEach((item: any) => {
             expectedTotal += (item.quantity * item.unitPrice) - (item.discount || 0) + (item.tax || 0);
          });
          // Allow small rounding differences
          if (inv.totalAmount !== undefined && Math.abs(inv.totalAmount - expectedTotal) > 1) {
             foundIssues.push({
               id: Math.random(),
               type: 'error',
               module: 'بازرگانی (فاکتورها)',
               title: 'مغایرت جمع کل فاکتور',
               description: `جمع کل فاکتور شماره ${inv.invoiceNumber} (${inv.totalAmount}) با جمع اقلام آن (${expectedTotal}) مغایرت دارد.`,
               prompt: `جمع کل فاکتور شماره ${inv.invoiceNumber} با جمع اقلام آن مغایرت دارد. لطفا فاکتور را ویرایش و مجدد ذخیره کن تا مبالغ بروزرسانی شوند.`
             });
          }
        }
      });

      // 8. Find gaps in invoice numbering
      const saleInvoices = (invoices || []).filter(i => i.type === 'sale' && i.status !== 'draft' && i.status !== 'voided').map(i => parseInt(i.invoiceNumber, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
      if (saleInvoices.length > 1) {
        for (let i = 0; i < saleInvoices.length - 1; i++) {
          if (saleInvoices[i + 1] - saleInvoices[i] > 1) {
             foundIssues.push({
               id: Math.random(),
               type: 'warning',
               module: 'بازرگانی (فاکتورها)',
               title: 'شکاف در شماره‌گذاری فاکتورها',
               description: `بین شماره فاکتور ${saleInvoices[i]} و ${saleInvoices[i+1]} شکاف وجود دارد (شماره‌های مفقوده).`,
               prompt: `در شماره‌گذاری فاکتورهای فروش، بین شماره ${saleInvoices[i]} و ${saleInvoices[i+1]} فاصله‌ای وجود دارد که از نظر حسابداری ممکن است مشکل‌ساز باشد. لطفا بررسی کن که آیا فاکتوری حذف شده است؟`
             });
          }
        }
      }

      // 9. Find gaps in accounting documents
      const docsNumbers = accDocs.map((d: any) => parseInt(d.documentNumber, 10)).filter(n => !isNaN(n)).sort((a: number, b: number) => a - b);
      if (docsNumbers.length > 1) {
        for (let i = 0; i < docsNumbers.length - 1; i++) {
          if (docsNumbers[i + 1] - docsNumbers[i] > 1) {
             foundIssues.push({
               id: Math.random(),
               type: 'warning',
               module: 'حسابداری (اسناد)',
               title: 'شکاف در شماره‌گذاری اسناد حسابداری',
               description: `بین سند شماره ${docsNumbers[i]} و ${docsNumbers[i+1]} شکاف وجود دارد.`,
               prompt: `در شماره‌گذاری اسناد حسابداری، بین سند شماره ${docsNumbers[i]} و ${docsNumbers[i+1]} فاصله‌ای وجود دارد. لطفا بررسی کن که آیا سندی حذف شده است یا خیر.`
             });
          }
        }
      }
      
      // 10. Check if accounting documents balance (debit == credit)
      accDocs.forEach((doc: any) => {
        let debitTotal = 0;
        let creditTotal = 0;
        if (doc.items && Array.isArray(doc.items)) {
          doc.items.forEach((item: any) => {
            debitTotal += Number(item.debit || 0);
            creditTotal += Number(item.credit || 0);
          });
        }
        if (Math.abs(debitTotal - creditTotal) > 1) {
           foundIssues.push({
             id: Math.random(),
             type: 'error',
             module: 'حسابداری (اسناد)',
             title: 'عدم تراز سند حسابداری',
             description: `سند شماره ${doc.documentNumber || doc.id} تراز نیست (بدهکار: ${debitTotal}، بستانکار: ${creditTotal}).`,
             prompt: `سند حسابداری شماره ${doc.documentNumber || doc.id} تراز نیست. جمع بدهکار و بستانکار آن برابر نیست. لطفا این سند را پیدا کرده و اقلام آن را اصلاح کن.`
           });
        }
      });

      setIssues(foundIssues);
    } catch (error) {
      console.error(error);
    } finally {
      setIsChecking(false);
    }
  };
  
  useEffect(() => {
    runDiagnostics();
  }, []);

  const copyPrompt = (prompt: string, id: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(id);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-right pb-10"
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            عیب‌یابی و بررسی صحت اطلاعات سیستم
          </h1>
          <p className="text-slate-500 font-semibold text-sm">بررسی پیوستگی داده‌ها، مغایرت‌گیری و پیشنهاد راهکار رفع خطا</p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={isChecking}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'در حال بررسی...' : 'بررسی مجدد سیستم'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
              <Bug className="w-6 h-6" />
            </div>
            <span className="text-3xl font-black text-rose-600">{issues.filter(i => i.type === 'error').length}</span>
          </div>
          <div className="text-slate-700 font-bold text-sm">خطاهای ساختاری (Error)</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-3xl font-black text-amber-600">{issues.filter(i => i.type === 'warning').length}</span>
          </div>
          <div className="text-slate-700 font-bold text-sm">هشدارهای منطقی (Warning)</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="text-3xl font-black text-emerald-600">
              {isChecking ? '...' : (issues.length === 0 ? '۱۰۰٪' : 'نیاز به رفع')}
            </span>
          </div>
          <div className="text-slate-700 font-bold text-sm">وضعیت سلامت دیتابیس</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm p-6">
        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600" />
          گزارش خطاهای یافت شده
        </h3>
        
        {isChecking ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Search className="w-12 h-12 mb-4 animate-pulse text-indigo-300" />
            <p className="font-bold">ربات در حال اسکن تمامی جداول و ارتباطات پایگاه داده است...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center bg-emerald-50 rounded-2xl border border-emerald-100 border-dashed">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
            <p className="font-black text-emerald-800 text-lg">تبریک! پایگاه داده شما در سلامت کامل است.</p>
            <p className="text-emerald-600 font-semibold mt-1">هیچگونه مغایرت یا داده یتیم در سیستم یافت نشد.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map(issue => (
              <div key={issue.id} className={`p-5 rounded-2xl border ${issue.type === 'error' ? 'bg-rose-50/50 border-rose-200' : 'bg-amber-50/50 border-amber-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl mt-1 shrink-0 ${issue.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                    {issue.type === 'error' ? <Bug className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black bg-white px-2 py-1 rounded border shadow-sm text-slate-600">{issue.module}</span>
                      <h4 className={`font-black text-lg ${issue.type === 'error' ? 'text-rose-900' : 'text-amber-900'}`}>{issue.title}</h4>
                    </div>
                    <p className={`font-bold text-sm mb-4 ${issue.type === 'error' ? 'text-rose-700' : 'text-amber-700'}`}>{issue.description}</p>
                    
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative group">
                      <div className="absolute -top-2.5 right-4 bg-indigo-100 text-indigo-700 text-[9px] font-black px-2 py-0.5 rounded border border-indigo-200">
                        پرامپت پیشنهادی برای هوش مصنوعی (AI Studio)
                      </div>
                      <p className="text-sm font-semibold text-slate-700 pr-2 pb-1 pt-1 leading-relaxed">{issue.prompt}</p>
                      
                      <button
                        onClick={() => copyPrompt(issue.prompt, issue.id)}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs transition-colors"
                      >
                        {copiedPrompt === issue.id ? (
                          <><CheckCircle className="w-3.5 h-3.5" /> کپی شد</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> کپی کردن پرامپت</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
