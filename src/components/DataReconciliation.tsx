import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, AlertTriangle, CheckCircle, RefreshCw, Wrench } from 'lucide-react';
import { getLocalData, saveLocalData } from '../services/dataService';

export default function DataReconciliation() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const scanData = async () => {
    setLoading(true);
    setIssues([]);
    const foundIssues: any[] = [];
    try {
      const tables = ['invoices', 'products', 'persons', 'accounting_documents', 'transactions', 'warehouse_stocks'];
      
      for (const table of tables) {
        const data = await getLocalData<any[]>(table, []);
        if (!Array.isArray(data)) continue;

        data.forEach((item, index) => {
          if (!item.id) {
             foundIssues.push({ table, index, item, issue: 'Missing ID', fixType: 'add_id' });
          }
          
          if (table === 'products') {
            if (typeof item.price === 'string' && !isNaN(Number(item.price))) {
              foundIssues.push({ table, id: item.id, item, issue: 'Price is string, should be number', fixType: 'cast_number', field: 'price' });
            }
            if (typeof item.purchasePrice === 'string' && !isNaN(Number(item.purchasePrice))) {
              foundIssues.push({ table, id: item.id, item, issue: 'Purchase Price is string, should be number', fixType: 'cast_number', field: 'purchasePrice' });
            }
            if (item.stock && typeof item.stock === 'string' && !isNaN(Number(item.stock))) {
              foundIssues.push({ table, id: item.id, item, issue: 'Stock is string, should be number', fixType: 'cast_number', field: 'stock' });
            }
          }
          
          if (table === 'invoices') {
             if (item.totalAmount && typeof item.totalAmount === 'string' && !isNaN(Number(item.totalAmount))) {
               foundIssues.push({ table, id: item.id, item, issue: 'Total Amount is string', fixType: 'cast_number', field: 'totalAmount' });
             }
             if (item.items && Array.isArray(item.items)) {
                item.items.forEach((i: any, idx: number) => {
                   if (typeof i.quantity === 'string' && !isNaN(Number(i.quantity))) {
                      foundIssues.push({ table, id: item.id, item, issue: `Item ${idx} quantity is string`, fixType: 'cast_item_number', field: 'quantity', itemIdx: idx });
                   }
                });
             }
          }
        });
      }
      
      setIssues(foundIssues);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fixIssue = async (issue: any) => {
     try {
       const data = await getLocalData<any[]>(issue.table, []);
       const idx = issue.id ? data.findIndex(d => String(d.id) === String(issue.id)) : issue.index;
       if (idx === -1) return false;
       
       const item = data[idx];
       if (issue.fixType === 'add_id') {
          item.id = Date.now().toString() + Math.floor(Math.random() * 1000);
       } else if (issue.fixType === 'cast_number') {
          item[issue.field] = Number(item[issue.field]);
       } else if (issue.fixType === 'cast_item_number') {
          item.items[issue.itemIdx][issue.field] = Number(item.items[issue.itemIdx][issue.field]);
       }
       
       data[idx] = item;
       await saveLocalData(issue.table, data);
       return true;
     } catch (e) {
       console.error(e);
       return false;
     }
  };

  const handleFixAll = async () => {
    if (!window.confirm('آیا از اصلاح تمامی خطاهای داده اطمینان دارید؟')) return;
    setFixing(true);
    let fixedCount = 0;
    
    // Group issues by table to avoid multiple reads/writes
    const issuesByTable = issues.reduce((acc, issue) => {
       if (!acc[issue.table]) acc[issue.table] = [];
       acc[issue.table].push(issue);
       return acc;
    }, {} as Record<string, any[]>);
    
    for (const table in issuesByTable) {
       const data = await getLocalData<any[]>(table, []);
       let modified = false;
       
       for (const issue of issuesByTable[table]) {
          const idx = issue.id ? data.findIndex((d: any) => String(d.id) === String(issue.id)) : issue.index;
          if (idx !== -1) {
             const item = data[idx];
             if (issue.fixType === 'add_id') {
                item.id = Date.now().toString() + Math.floor(Math.random() * 1000);
             } else if (issue.fixType === 'cast_number') {
                item[issue.field] = Number(item[issue.field]);
             } else if (issue.fixType === 'cast_item_number') {
                item.items[issue.itemIdx][issue.field] = Number(item.items[issue.itemIdx][issue.field]);
             }
             data[idx] = item;
             modified = true;
             fixedCount++;
          }
       }
       
       if (modified) {
          await saveLocalData(table, data);
       }
    }
    
    setFixing(false);
    setSuccessMsg(`تعداد ${fixedCount} خطا با موفقیت اصلاح شد.`);
    scanData();
  };

  useEffect(() => {
    scanData();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-600" />
            بررسی و یکپارچه‌سازی اطلاعات (Reconciliation)
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            در این بخش می‌توانید خطاهای نوع داده (Data Types) در دیتابیس را بررسی و با تایید خود اصلاح کنید.
          </p>
        </div>
        <button
          onClick={scanData}
          disabled={loading || fixing}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          اسکن مجدد
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            موارد نیازمند اصلاح ({issues.length})
          </h3>
          {issues.length > 0 && (
            <button
              onClick={handleFixAll}
              disabled={fixing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              <Wrench className="w-4 h-4" />
              {fixing ? 'در حال اصلاح...' : 'اصلاح گروهی همه موارد'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 font-bold animate-pulse">
            در حال بررسی دیتابیس...
          </div>
        ) : issues.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-black text-slate-800">هیچ خطای داده‌ای یافت نشد</h3>
            <p className="text-slate-500 mt-1">دیتابیس شما در وضعیت یکپارچه و بهینه قرار دارد.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {issues.map((issue, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {issue.table}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ID: {issue.id || issue.index}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 text-sm">{issue.issue}</p>
                </div>
                <button
                  onClick={async () => {
                    setFixing(true);
                    const ok = await fixIssue(issue);
                    if (ok) {
                       setIssues(issues.filter((_, idx) => idx !== i));
                       setSuccessMsg('مورد با موفقیت اصلاح شد.');
                    }
                    setFixing(false);
                  }}
                  disabled={fixing}
                  className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  اصلاح تکی
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
