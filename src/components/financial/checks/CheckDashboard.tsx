import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  CreditCard, Plus, Edit2, Trash2, CheckCircle, Clock, X, Save, 
  ArrowDownLeft, BookOpen, ArrowUpRight, Calendar, Building2, HelpCircle, AlertTriangle, Search, TrendingUp, DollarSign, Percent, BarChart as BarChartIcon, ChevronDown, Printer, History, Activity, User, Send
, ArrowLeft} from 'lucide-react';
import DatePickerModule, { Calendar as RMCalendar } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

import { CashFlowForecast } from './CashFlowForecast';
import { CheckAgingReport } from './CheckAgingReport';

export function CheckDashboard({ 
  totalIssuedAmount, cashedIssuedAmount, pendingIssuedAmount, bouncedIssuedAmount, 
  totalReceivedAmount, cashedReceivedAmount, inHandReceivedAmount, bouncedReceivedAmount,
  issuedChecks = [], receivedChecks = [], accounts = [],
  storeSettings

}) {
  // Calculate KPIs
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Pending Receivables Amount (already have inHandReceivedAmount, but let's use the actual items if we want)
  const pendingReceivablesAmount = inHandReceivedAmount;

  // 2. Overdue Payables
  const overduePayables = issuedChecks.filter(c => {
    if (c.status !== 'issued') return false;
    if (!c.dueDate) return false;
    const d = new Date(c.dueDate);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });
  const overduePayablesAmount = overduePayables.reduce((acc, c) => acc + Number(c.amount || 0), 0);

  // 3. Bounced this month
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const bouncedThisMonth = [...issuedChecks, ...receivedChecks].filter(c => {
    if (c.status !== 'bounced' && c.status !== 'bounced_assigned') return false;
    if (!c.dueDate) return false;
    const d = new Date(c.dueDate);
    return d >= thirtyDaysAgo && d <= today;
  });
  const bouncedThisMonthAmount = bouncedThisMonth.reduce((acc, c) => acc + Number(c.amount || 0), 0);

  // 4. Bounce Rate (Total Bounced / Total Checks that are NOT pending or future)
  const pastChecks = [...issuedChecks, ...receivedChecks].filter(c => {
    if (c.status === 'blank' || c.status === 'cancelled') return false;
    if (!c.dueDate) return false;
    const d = new Date(c.dueDate);
    d.setHours(0, 0, 0, 0);
    // Include if past due OR if it's already resolved (cashed, bounced, returned)
    return d <= today || ['cashed', 'bounced', 'bounced_assigned', 'returned'].includes(c.status);
  });
  const totalPastChecks = pastChecks.length;
  const bouncedCount = pastChecks.filter(c => ['bounced', 'bounced_assigned'].includes(c.status)).length;
  const bounceRate = totalPastChecks > 0 ? ((bouncedCount / totalPastChecks) * 100).toFixed(1) : 0;

  return (
    <>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-emerald-600 bg-emerald-50 p-2 rounded-xl">
                <ArrowDownLeft className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">در جریان وصول</span>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-1">چک‌های دریافتنی در جریان</p>
            <p className="text-xl font-black text-slate-800" dir="ltr">
              {Number(pendingReceivablesAmount).toLocaleString('fa-IR')} <span className="text-sm text-slate-500 font-normal">{storeSettings?.currency || 'تومان'}</span>
            </p>
          </div>

          <div className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-rose-500"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-rose-600 bg-rose-50 p-2 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">نیازمند توجه</span>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-1">چک‌های پرداختنی معوق</p>
            <p className="text-xl font-black text-slate-800" dir="ltr">
              {Number(overduePayablesAmount).toLocaleString('fa-IR')} <span className="text-sm text-slate-500 font-normal">{storeSettings?.currency || 'تومان'}</span>
            </p>
          </div>

          <div className="bg-white border border-orange-100 rounded-2xl p-5 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-orange-500"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-orange-600 bg-orange-50 p-2 rounded-xl">
                <Activity className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">۳۰ روز اخیر</span>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-1">مبلغ چک‌های برگشتی</p>
            <p className="text-xl font-black text-slate-800" dir="ltr">
              {Number(bouncedThisMonthAmount).toLocaleString('fa-IR')} <span className="text-sm text-slate-500 font-normal">{storeSettings?.currency || 'تومان'}</span>
            </p>
          </div>

          <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-indigo-600 bg-indigo-50 p-2 rounded-xl">
                <Percent className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">ریسک نقدشوندگی</span>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-1">نرخ برگشت چک (Bounce Rate)</p>
            <div className="flex items-end gap-2" dir="ltr">
              <p className="text-2xl font-black text-slate-800">
                {Number(bounceRate).toLocaleString('fa-IR')}٪
              </p>
              <p className="text-xs text-slate-400 mb-1">
                ({totalPastChecks} فقره چک)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Issued Checks Chart */}
              <div className="bg-white border text-right border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col items-center p-6 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-gray-800 self-start w-full border-b pb-3 mb-6 flex items-center justify-between">
                  نمودار وضعیت چک‌های صادره (پرداختی)
                  <span className="text-xs text-gray-500 font-normal">کل: {totalIssuedAmount.toLocaleString()} {storeSettings?.currency || 'تومان'}</span>
                </h3>
                {totalIssuedAmount > 0 ? (
                  <div className="w-full flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'پاس شده', value: cashedIssuedAmount, color: '#34d399' },
                            { name: 'در جریان (پرداختی)', value: pendingIssuedAmount, color: '#9ca3af' },
                            { name: 'برگشتی', value: bouncedIssuedAmount, color: '#fb7185' }
                          ].filter(d => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={70} outerRadius={110}
                          paddingAngle={3} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {[
                            { name: 'پاس شده', value: cashedIssuedAmount, color: '#34d399' },
                            { name: 'در جریان (پرداختی)', value: pendingIssuedAmount, color: '#9ca3af' },
                            { name: 'برگشتی', value: bouncedIssuedAmount, color: '#fb7185' }
                          ].filter(d => d.value > 0).map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => [val.toLocaleString() + ' ' + (storeSettings?.currency || 'تومان'), 'مبلغ']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                   <div className="flex-1 flex w-full items-center justify-center min-h-[300px] text-gray-400 font-medium text-sm">آماری جهت نمایش در دسترس نیست</div>
                )}
              </div>

              {/* Received Checks Chart */}
              <div className="bg-white border text-right border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col items-center p-6 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-gray-800 self-start w-full border-b pb-3 mb-6 flex items-center justify-between">
                  نمودار وضعیت چک‌های دریافتی (وصولی)
                  <span className="text-xs text-gray-500 font-normal">کل: {totalReceivedAmount.toLocaleString()} {storeSettings?.currency || 'تومان'}</span>
                </h3>
                {totalReceivedAmount > 0 ? (
                  <div className="w-full flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'وصول شده', value: cashedReceivedAmount, color: '#10b981' },
                            { name: 'در جریان (وصولی)', value: inHandReceivedAmount, color: '#a78bfa' },
                            { name: 'برگشتی', value: bouncedReceivedAmount, color: '#f43f5e' }
                          ].filter(d => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={70} outerRadius={110}
                          paddingAngle={3} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {[
                             { name: 'وصول شده', value: cashedReceivedAmount, color: '#10b981' },
                             { name: 'در جریان (وصولی)', value: inHandReceivedAmount, color: '#a78bfa' },
                             { name: 'برگشتی', value: bouncedReceivedAmount, color: '#f43f5e' }
                          ].filter(d => d.value > 0).map((entry, idx) => (
                            <Cell key={`cell-rec-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => [val.toLocaleString() + ' ' + (storeSettings?.currency || 'تومان'), 'مبلغ']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex w-full items-center justify-center min-h-[300px] text-gray-400 font-medium text-sm">آماری جهت نمایش در دسترس نیست</div>
                )}
              </div>
            </div>
          
          <CheckAgingReport issuedChecks={issuedChecks} receivedChecks={receivedChecks} storeSettings={storeSettings} />
          
          <CashFlowForecast issuedChecks={issuedChecks} receivedChecks={receivedChecks} accounts={accounts} storeSettings={storeSettings} />
          </div>
          </>
  );
}
