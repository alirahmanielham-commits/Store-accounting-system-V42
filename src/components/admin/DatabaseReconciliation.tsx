import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, AlertTriangle, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface Anomaly {
  table: string;
  id: string | number;
  field: string;
  currentValue: any;
  expectedType: string;
  suggestedValue: any;
}

export default function DatabaseReconciliation() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [fixedCount, setFixedCount] = useState(0);

  const TABLES_TO_CHECK = [
    { name: 'products', fields: { price: 'number', purchasePrice: 'number', stock: 'number', minStock: 'number', unitRatio: 'number', isActive: 'boolean' } },
    { name: 'invoices', fields: { totalAmount: 'number', discount: 'number', tax: 'number', shippingCost: 'number', paidAmount: 'number' }, nested: { items: { quantity: 'number', salePrice: 'number', purchasePrice: 'number', unitPrice: 'number', discount: 'number', tax: 'number' } } },
    { name: 'transactions', fields: { amount: 'number' } },
    { name: 'accounts', fields: { balance: 'number', initialBalance: 'number' } },
    { name: 'cashboxes', fields: { balance: 'number', initialBalance: 'number' } },
    { name: 'warehouse_stocks', fields: { stock: 'number' } },
    { name: 'product_price_history', fields: { price: 'number' } },
    { name: 'issued_checks', fields: { amount: 'number' } },
    { name: 'received_checks', fields: { amount: 'number' } },
    { name: 'persons', fields: { initialBalance: 'number' } }
  ];

  const scanDatabase = async () => {
    setIsScanning(true);
    setScanComplete(false);
    setFixedCount(0);
    const foundAnomalies: Anomaly[] = [];

    try {
      for (const table of TABLES_TO_CHECK) {
        const res = await fetch(`/api/data/${table.name}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (!Array.isArray(data)) continue;

        data.forEach((row: any) => {
          Object.entries(table.fields).forEach(([field, expectedType]) => {
            if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
              const val = row[field];
              if (expectedType === 'number' && typeof val !== 'number') {
                const numVal = Number(val);
                if (!isNaN(numVal) && String(val) !== String(numVal)) {
                  // Only report if it's really stored as string, or if it can be coerced cleanly
                  if (typeof val === 'string' && !isNaN(parseFloat(val))) {
                     foundAnomalies.push({
                        table: table.name,
                        id: row.id,
                        field,
                        currentValue: val,
                        expectedType,
                        suggestedValue: numVal
                     });
                  }
                }
              } else if (expectedType === 'boolean' && typeof val !== 'boolean') {
                if (val === 'true' || val === 'false' || val === 0 || val === 1) {
                  foundAnomalies.push({
                    table: table.name,
                    id: row.id,
                    field,
                    currentValue: val,
                    expectedType,
                    suggestedValue: val === 'true' || val === 1 ? true : false
                  });
                }
              }
            }
          });

          if (table.nested && table.nested.items && Array.isArray(row.items)) {
            row.items.forEach((item: any, index: number) => {
              Object.entries(table.nested.items).forEach(([nestedField, expectedType]) => {
                if (item[nestedField] !== undefined && item[nestedField] !== null && item[nestedField] !== '') {
                  const val = item[nestedField];
                  if (expectedType === 'number' && typeof val !== 'number') {
                    const numVal = Number(val);
                    if (typeof val === 'string' && !isNaN(parseFloat(val))) {
                      foundAnomalies.push({
                        table: table.name,
                        id: row.id,
                        field: `items[${index}].${nestedField}`,
                        currentValue: val,
                        expectedType,
                        suggestedValue: numVal
                      });
                    }
                  }
                }
              });
            });
          }
        });
      }
      setAnomalies(foundAnomalies);
      setScanComplete(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const fixAnomalies = async () => {
    setIsFixing(true);
    try {
      // Group anomalies by table and ID
      const updatesByTable: Record<string, Record<string, any>> = {};
      
      anomalies.forEach(anomaly => {
        if (!updatesByTable[anomaly.table]) updatesByTable[anomaly.table] = {};
        if (!updatesByTable[anomaly.table][anomaly.id]) updatesByTable[anomaly.table][anomaly.id] = {};
        updatesByTable[anomaly.table][anomaly.id][anomaly.field] = anomaly.suggestedValue;
      });

      let count = 0;

      for (const [tableName, rowsToUpdate] of Object.entries(updatesByTable)) {
        const res = await fetch(`/api/data/${tableName}`);
        if (!res.ok) continue;
        let tableData = await res.json();
        
        if (Array.isArray(tableData)) {
          let updatedTable = false;
          tableData = tableData.map(row => {
            if (rowsToUpdate[row.id]) {
              updatedTable = true;
              const updates = rowsToUpdate[row.id];
              const newRow = { ...row };
              
              Object.entries(updates).forEach(([fieldPath, value]) => {
                if (fieldPath.startsWith('items[')) {
                  // e.g. items[0].price
                  const match = fieldPath.match(/items\[(\d+)\]\.(.+)/);
                  if (match && newRow.items && Array.isArray(newRow.items)) {
                    const idx = parseInt(match[1]);
                    const nestedField = match[2];
                    if (newRow.items[idx]) {
                      newRow.items[idx][nestedField] = value;
                      count++;
                    }
                  }
                } else {
                  newRow[fieldPath] = value;
                  count++;
                }
              });
              return newRow;
            }
            return row;
          });

          if (updatedTable) {
            await fetch(`/api/data/${tableName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tableData)
            });
          }
        }
      }

      setFixedCount(count);
      setAnomalies([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFixing(false);
    }
  };

  useEffect(() => {
    scanDatabase();
  }, []);

  const groupByTable = anomalies.reduce((acc, curr) => {
    if (!acc[curr.table]) acc[curr.table] = [];
    acc[curr.table].push(curr);
    return acc;
  }, {} as Record<string, Anomaly[]>);

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
            <Database className="w-6 h-6 text-indigo-600" />
            تطبیق و اصلاح نوع داده‌ها
          </h1>
          <p className="text-slate-500 font-semibold text-sm">بررسی نوع فیلدها (متنی، عددی) و تبدیل خودکار به فرمت استاندارد</p>
        </div>
        <button
          onClick={scanDatabase}
          disabled={isScanning || isFixing}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'در حال اسکن...' : 'اسکن مجدد'}
        </button>
      </div>

      {isScanning ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <RefreshCw className="w-12 h-12 mb-4 animate-spin text-indigo-400" />
          <p className="font-bold">در حال پویش تمامی جداول برای یافتن مغایرت‌های نوع داده...</p>
        </div>
      ) : scanComplete && anomalies.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center bg-emerald-50 rounded-2xl border border-emerald-100 border-dashed">
          <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
          <p className="font-black text-emerald-800 text-lg">پایگاه داده استانداردهای لازم را دارد</p>
          <p className="text-emerald-600 font-semibold mt-1">هیچ نوع داده نامتعارفی (مثل ذخیره عدد به عنوان متن) یافت نشد.</p>
          {fixedCount > 0 && (
             <p className="mt-4 inline-block bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-bold text-sm">
               {fixedCount} فیلد با موفقیت اصلاح گردید.
             </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-4 text-amber-900">
               <AlertTriangle className="w-10 h-10 text-amber-600" />
               <div>
                 <h3 className="font-black text-lg">تعداد {anomalies.length} مورد مغایرت ساختاری یافت شد</h3>
                 <p className="text-sm font-semibold opacity-90">داده‌هایی که باید به صورت عدد یا بولین (صحیح/غلط) ذخیره می‌شدند اما به عنوان متن ذخیره شده‌اند.</p>
               </div>
             </div>
             <button
                onClick={fixAnomalies}
                disabled={isFixing}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap shadow-sm transition-colors"
             >
                {isFixing ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> در حال اصلاح...</>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> اصلاح و استانداردسازی همه موارد</>
                )}
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {Object.entries(groupByTable).map(([tableName, tableAnomalies]) => (
                <div key={tableName} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-bold text-slate-800" dir="ltr">{tableName}</h4>
                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-bold">{tableAnomalies.length} مورد</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-white sticky top-0 border-b border-slate-100 shadow-sm z-10">
                        <tr className="text-slate-500 font-semibold text-xs">
                          <th className="px-4 py-2">شناسه رکورد</th>
                          <th className="px-4 py-2">نام فیلد</th>
                          <th className="px-4 py-2">مقدار فعلی</th>
                          <th className="px-4 py-2">مقدار اصلاحی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {tableAnomalies.map((anomaly, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-mono text-xs text-slate-600">{anomaly.id}</td>
                            <td className="px-4 py-2 font-mono text-xs font-bold text-indigo-600">{anomaly.field}</td>
                            <td className="px-4 py-2 font-mono text-rose-600">"{String(anomaly.currentValue)}"</td>
                            <td className="px-4 py-2 font-mono text-emerald-600 font-bold">{String(anomaly.suggestedValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
             ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
