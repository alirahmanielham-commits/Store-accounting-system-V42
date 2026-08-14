import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calendar, DollarSign, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

export function CashFlowForecast({ issuedChecks = [], receivedChecks = [], accounts = [], storeSettings }: any) {
  const [days, setDays] = useState<30 | 60 | 90>(30);

  const { chartData, initialBalance, hasNegativeBalance, minBalance } = useMemo(() => {
    // 1. Initial Balance from accounts
    const initBal = accounts.reduce((sum: number, acc: any) => {
        return sum + (Number(acc.initialBalance) || 0) + (Number(acc.currentBalance) || 0); // Note: ideally just currentBalance, but we keep it simple
    }, 0);

    // 2. Generate dates
    const today = new Date();
    today.setHours(0,0,0,0);
    const forecast = [];
    let runningBalance = initBal;

    for (let i = 0; i <= days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        // Inflow (Received checks due on this date)
        const inflow = receivedChecks
            .filter((c: any) => c.status === 'received' || c.status === 'deposited')
            .filter((c: any) => c.dueDate && c.dueDate.startsWith(dateStr))
            .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

        // Outflow (Issued checks due on this date)
        const outflow = issuedChecks
            .filter((c: any) => c.status === 'issued')
            .filter((c: any) => c.dueDate && c.dueDate.startsWith(dateStr))
            .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

        runningBalance += (inflow - outflow);

        const label = new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(d);

        forecast.push({
            date: dateStr,
            dateKey: label,
            label,
            inflow,
            outflow,
            runningBalance,
            "موجودی خالص": runningBalance,
            "دریافتی پیش‌بینی شده": inflow,
            "پرداختی پیش‌بینی شده": outflow,
        });
    }

    const hasNeg = forecast.some(d => d.runningBalance < 0);
    const minBal = Math.min(initBal, ...forecast.map(d => d.runningBalance));

    return { chartData: forecast, initialBalance: initBal, hasNegativeBalance: hasNeg, minBalance: minBal };
  }, [issuedChecks, receivedChecks, accounts, days]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fa-IR').format(val) + ' ' + (storeSettings?.currency || 'تومان');
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-xl text-right font-mono" dir="rtl">
          <p className="text-white font-bold mb-2 pb-2 border-b border-slate-700 text-xs text-center">{payload[0].payload.dateKey}</p>
          <div className="space-y-1.5 text-xs">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center gap-4">
                <span style={{ color: entry.color }} className="opacity-90">{entry.name}:</span>
                <span className="font-bold text-white tracking-widest">{new Intl.NumberFormat('fa-IR').format(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border text-right border-gray-100 rounded-2xl shadow-sm overflow-hidden p-6 mt-6 transition-all" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-slate-100 pb-4 gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            پیش‌بینی جریان نقدینگی (Cash Flow Forecast)
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">برآورد موجودی بر اساس سررسید چک‌های در جریان</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[30, 60, 90].map((d) => (
             <button 
                key={d}
                onClick={() => setDays(d as any)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${days === d ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
             >
                {d} روز
             </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
           <div>
             <p className="text-xs text-slate-500 font-medium mb-1">موجودی فعلی (پایه)</p>
             <p className="font-black text-lg text-slate-800 tracking-widest">{formatCurrency(initialBalance)}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
             <DollarSign className="w-5 h-5" />
           </div>
        </div>
        <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 flex items-center justify-between">
           <div>
             <p className="text-xs text-emerald-600 font-medium mb-1">مجموع ورودی پیش‌بینی شده</p>
             <p className="font-black text-lg text-emerald-700 tracking-widest">{formatCurrency(chartData.reduce((acc, c) => acc + c.inflow, 0))}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
             <TrendingUp className="w-5 h-5" />
           </div>
        </div>
        <div className="bg-rose-50/50 rounded-xl p-4 border border-rose-100 flex items-center justify-between">
           <div>
             <p className="text-xs text-rose-600 font-medium mb-1">مجموع خروجی پیش‌بینی شده</p>
             <p className="font-black text-lg text-rose-700 tracking-widest">{formatCurrency(chartData.reduce((acc, c) => acc + c.outflow, 0))}</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
             <TrendingDown className="w-5 h-5" />
           </div>
        </div>
      </div>

      {hasNegativeBalance && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 shadow-sm">
           <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
           <div>
             <h4 className="font-bold text-sm">هشدار کسری نقدینگی</h4>
             <p className="text-xs mt-1 leading-relaxed opacity-90">بر اساس چک‌های در جریان، پیش‌بینی می‌شود در بازه انتخابی با کسری نقدینگی (موجودی منفی) مواجه شوید. لطفاً نمودار زیر را برای مشاهده تاریخ دقیق بررسی کنید.</p>
           </div>
        </div>
      )}

      <div className="w-full min-h-[350px] relative mt-2" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} minTickGap={20} />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                tickFormatter={(val) => new Intl.NumberFormat('fa-IR', { notation: 'compact' }).format(val)}
                dx={-10}
               domain={[(dataMin: number) => Math.min(0, dataMin - 1000000), 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
            
            <Area 
               type="monotone" 
               dataKey="موجودی خالص" 
               stroke="#4f46e5" 
               strokeWidth={3}
               fillOpacity={1}
               fill="url(#colorBalance)"
               activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
