import React, { useState, useEffect } from 'react';
import { Calculator, Printer, CheckCircle, Trash2, Search, FileText } from 'lucide-react';
import { getPayslips, addPayslip, updatePayslip, deletePayslip, getMonthlyAttendances, getEmployeeContracts, getContractComponents, getSalaryComponents, getPayslipItems, addPayslipItem } from '../../services/hrService';

export default function PayslipsManager({ personsData, showNotification, formatNumber }) {
  const [year, setYear] = useState(1403);
  const [month, setMonth] = useState(1);
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const today = new Intl.DateTimeFormat('fa-IR').format(new Date());
    const [y, m, d] = today.split('/');
    const toEng = (str) => str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    setYear(parseInt(toEng(y)));
    setMonth(parseInt(toEng(m)));
  }, []);

  useEffect(() => {
    if (year && month) fetchPayslips();
  }, [year, month]);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const allSlips = await getPayslips();
      const data = allSlips.filter(s => s.periodYear === year && s.periodMonth === month);
      setSlips(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // 1. Get attendances for period
      const allAttendances = await getMonthlyAttendances();
      const attendances = allAttendances.filter(a => a.periodYear === year && a.periodMonth === month);
      if (attendances.length === 0) return showNotification('ابتدا کارکرد این ماه را ثبت کنید', 'error');

      // 2. Get active contracts
      const allContracts = await getEmployeeContracts();
      const contracts = allContracts.filter(c => c.status === 'active');
      
      // 3. Get all comp types
      const allComps = await getSalaryComponents();
      const allContractComps = await getContractComponents();

      let count = 0;

      for (const att of attendances) {
        const contract = contracts.find(c => c.personId === att.personId);
        if (!contract) continue;

        // Check if payslip already exists and is finalized
        const existing = slips.find(s => s.personId === att.personId);
        if (existing && existing.status === 'finalized') continue;

        const myComps = allContractComps.filter(cc => cc.contractId === contract.id);
        
        let totalEarnings = 0;
        let totalDeductions = 0;
        let taxable = 0;
        let insurable = 0;

        const pItems = [];

        // Simple calculation logic
        for (const mc of myComps) {
          const compDef = allComps.find(c => c.id === mc.componentId);
          if (!compDef) continue;

          let val = 0;
          if (compDef.calculationType === 'fixed') {
             val = mc.overrideAmount ? parseFloat(mc.overrideAmount) : 0;
          } else if (compDef.calculationType === 'time_based') {
             const base = mc.overrideAmount ? parseFloat(mc.overrideAmount) : 0; // rate
             if (compDef.timeFactor === 'days') val = base * parseFloat(att.workDays || 0);
             else if (compDef.timeFactor === 'overtime_hours') val = base * parseFloat(att.overtimeHours || 0);
             else if (compDef.timeFactor === 'absence_days') val = base * parseFloat(att.absentDays || 0);
          }
          // Note: Full formula engine can be complex. This is a simplified proxy.

          if (val > 0 || val < 0) {
            pItems.push({
              id: Date.now().toString() + Math.random().toString(),
              componentId: compDef.id,
              title: compDef.title,
              type: compDef.type,
              amount: val.toString()
            });

            if (compDef.type === 'earning') {
              totalEarnings += val;
              if (compDef.isTaxable) taxable += val;
              if (compDef.isInsurable) insurable += val;
            } else {
              totalDeductions += val;
            }
          }
        }

        // Dummy tax calculation 10%
        const taxAmount = taxable > 12000000 ? (taxable - 12000000) * 0.1 : 0;
        // Dummy insurance 7%
        const insAmount = insurable * 0.07;

        totalDeductions += taxAmount + insAmount;
        
        if (taxAmount > 0) pItems.push({ id: Date.now().toString() + Math.random().toString(), componentId: 'tax', title: 'مالیات حقوق', type: 'deduction', amount: taxAmount.toString() });
        if (insAmount > 0) pItems.push({ id: Date.now().toString() + Math.random().toString(), componentId: 'ins', title: 'حق بیمه (سهم کارمند)', type: 'deduction', amount: insAmount.toString() });

        const netPayable = totalEarnings - totalDeductions;

        const pId = existing ? existing.id : Date.now().toString() + Math.random().toString();
        
        const payload = {
          personId: att.personId,
          periodYear: year,
          periodMonth: month,
          contractId: contract.id,
          attendanceId: att.id,
          totalEarnings: totalEarnings.toString(),
          totalDeductions: totalDeductions.toString(),
          taxableAmount: taxable.toString(),
          insurableAmount: insurable.toString(),
          taxAmount: taxAmount.toString(),
          insuranceAmount: insAmount.toString(),
          netPayable: netPayable.toString(),
          status: 'draft'
        };

        if (existing) {
          await updatePayslip(pId, payload);
          // Normally delete old payslip items here, simplified for this snippet
        } else {
          await addPayslip({ id: pId, ...payload });
        }

        for (const item of pItems) {
           await addPayslipItem({ payslipId: pId, ...item });
        }
        count++;
      }

      showNotification(`محاسبه برای ${count} فیش انجام شد`, 'success');
      fetchPayslips();
    } catch (e) {
      console.error(e);
      showNotification('خطا در صدور فیش', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPersonName = (id) => {
    const p = (personsData || []).find(x => x.id === id);
    return p ? p.name : 'نامشخص';
  };

  const handleFinalize = async (id) => {
    try {
      await updatePayslip(id, {status: 'finalized'});
      showNotification('فیش قطعی شد', 'success');
      fetchPayslips();
    } catch(e) {}
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">صدور فیش حقوقی</h1>
            <p className="text-sm text-slate-500 mt-1">محاسبه و صدور فیش حقوقی بر اساس کارکرد و قرارداد</p>
          </div>
          <button onClick={handleGenerate} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all">
            <Calculator className="w-5 h-5" />
            محاسبه خودکار فیش ها
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 mb-6 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">سال</label>
            <input type="number" value={year} onChange={e=>setYear(parseInt(e.target.value))} className="border p-2 rounded-lg w-24 text-center font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">ماه</label>
            <select value={month} onChange={e=>setMonth(parseInt(e.target.value))} className="border p-2 rounded-lg w-40 font-bold">
              <option value={1}>فروردین</option><option value={2}>اردیبهشت</option><option value={3}>خرداد</option>
              <option value={4}>تیر</option><option value={5}>مرداد</option><option value={6}>شهریور</option>
              <option value={7}>مهر</option><option value={8}>آبان</option><option value={9}>آذر</option>
              <option value={10}>دی</option><option value={11}>بهمن</option><option value={12}>اسفند</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">در حال پردازش...</div>
          ) : (
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold">پرسنل</th>
                  <th className="p-4 font-bold">جمع مزایا</th>
                  <th className="p-4 font-bold">جمع کسورات</th>
                  <th className="p-4 font-bold">خالص پرداختی</th>
                  <th className="p-4 font-bold text-center">وضعیت</th>
                  <th className="p-4 font-bold text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slips.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold">{getPersonName(s.personId)}</td>
                    <td className="p-4 font-mono text-emerald-600">{formatNumber(s.totalEarnings)}</td>
                    <td className="p-4 font-mono text-rose-600">{formatNumber(s.totalDeductions)}</td>
                    <td className="p-4 font-mono text-indigo-700 font-bold text-base">{formatNumber(s.netPayable)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${s.status==='finalized'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
                        {s.status === 'finalized' ? 'قطعی' : 'پیش نویس'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {s.status === 'draft' && (
                          <button onClick={() => handleFinalize(s.id)} className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-100">
                            قطعی کردن
                          </button>
                        )}
                        <button className="text-slate-400 hover:text-indigo-600"><Printer className="w-4 h-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {slips.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">فیش حقوقی برای این دوره صادر نشده است.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
