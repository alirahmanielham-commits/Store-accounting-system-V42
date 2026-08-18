import React, { useState, useEffect } from 'react';
import { Calculator, Printer, CheckCircle, Trash2, Search, FileText, X } from 'lucide-react';
import { getPayslips, addPayslip, updatePayslip, deletePayslip, getMonthlyAttendances, getEmployeeContracts, getContractComponents, getSalaryComponents, getPayslipItems, addPayslipItem } from '../../services/hrService';
import { toPersianDigits } from '../../utils/format';

export default function PayslipsManager({ personsData, showNotification, formatNumber }) {
  const [year, setYear] = useState(1403);
  const [month, setMonth] = useState(1);
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printSlip, setPrintSlip] = useState(null);
  const [printSlipItems, setPrintSlipItems] = useState([]);

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
      const data = allSlips.filter(s => Number(s.periodYear) === Number(year) && Number(s.periodMonth) === Number(month));
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
      const allAttendances = await getMonthlyAttendances();
      const attendances = allAttendances.filter(a => Number(a.periodYear) === Number(year) && Number(a.periodMonth) === Number(month));
      if (attendances.length === 0) return showNotification('ابتدا کارکرد این ماه را ثبت کنید', 'error');

      const allContracts = await getEmployeeContracts();
      const contracts = allContracts.filter(c => c.status === 'active');
      
      const allComps = await getSalaryComponents();
      const allContractComps = await getContractComponents();

      let count = 0;
      
      const { updateMonthlyAttendance } = await import('../../services/hrService');

      for (const att of attendances) {
        const contract = contracts.find(c => c.personId === att.personId);
        if (!contract) continue;

        const existing = slips.find(s => s.personId === att.personId);
        if (existing && existing.status === 'finalized') continue;

        const myComps = allContractComps.filter(cc => cc.contractId === contract.id);
        
        let totalEarnings = 0;
        let totalDeductions = 0;
        let taxable = 0;
        let insurable = 0;

        const pItems = [];

        for (const mc of myComps) {
          const compDef = allComps.find(c => c.id === mc.componentId);
          if (!compDef) continue;

          let val = 0;
          if (compDef.calculationType === 'fixed') {
             val = mc.overrideAmount ? parseFloat(mc.overrideAmount) : 0;
          } else if (compDef.calculationType === 'time_based') {
             const base = mc.overrideAmount ? parseFloat(mc.overrideAmount) : 0; 
             if (compDef.timeFactor === 'days') val = base * parseFloat(att.workDays || 0);
             else if (compDef.timeFactor === 'overtime_hours') val = base * parseFloat(att.overtimeHours || 0);
             else if (compDef.timeFactor === 'absence_days') val = base * parseFloat(att.absentDays || 0);
          }

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

        const taxAmount = taxable > 12000000 ? (taxable - 12000000) * 0.1 : 0;
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
        } else {
          await addPayslip({ id: pId, ...payload });
        }

        for (const item of pItems) {
           await addPayslipItem({ payslipId: pId, ...item });
        }
        
        if (att.status !== 'approved') {
           await updateMonthlyAttendance(att.id, { ...att, status: 'approved' });
        }
        
        count++;
      }

      showNotification(`محاسبه برای ${toPersianDigits(count)} فیش انجام شد`, 'success');
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

  const handlePrint = async (slip) => {
    setLoading(true);
    try {
      const items = await getPayslipItems();
      const myItems = items.filter(i => i.payslipId === slip.id);
      setPrintSlipItems(myItems);
      setPrintSlip(slip);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full print:bg-white print:p-0" dir="rtl">
      
      {/* PRINT MODAL */}
      {printSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 print:relative print:inset-auto print:bg-transparent print:p-0">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:shadow-none print:rounded-none print:border-0 print:h-auto print:max-h-none print:block">
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden">
              <h3 className="font-bold text-slate-800">پیش‌نمایش چاپ فیش حقوقی</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700">
                  <Printer className="w-4 h-4" />
                  چاپ
                </button>
                <button onClick={() => setPrintSlip(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-lg border border-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto print:overflow-visible print:p-0">
              <div className="border-2 border-slate-800 p-6 rounded-xl print:border-none print:p-0">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-8 border-b-2 border-slate-800 pb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800">فیش حقوقی پرسنل</h2>
                    <p className="text-sm text-slate-600 mt-2 font-bold">شرکت نمونه</p>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto border-2 border-slate-300 flex items-center justify-center mb-2">
                      <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-slate-700 mb-2">تاریخ صدور: {toPersianDigits(new Date().toLocaleDateString('fa-IR'))}</p>
                    <p className="text-sm font-bold text-slate-700">دوره: {toPersianDigits(printSlip.periodMonth)} / {toPersianDigits(printSlip.periodYear)}</p>
                  </div>
                </div>

                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center gap-2 border-b border-dashed border-slate-300 pb-2">
                    <span className="text-slate-500 text-sm">نام و نام خانوادگی:</span>
                    <span className="font-bold text-slate-800">{getPersonName(printSlip.personId)}</span>
                  </div>
                  <div className="flex items-center gap-2 border-b border-dashed border-slate-300 pb-2">
                    <span className="text-slate-500 text-sm">شماره پرسنلی:</span>
                    <span className="font-bold text-slate-800">{toPersianDigits(printSlip.personId.substring(0, 6))}</span>
                  </div>
                </div>

                {/* Tables */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  {/* Earnings */}
                  <div>
                    <h3 className="font-bold text-slate-800 mb-3 bg-slate-100 px-3 py-2 rounded">مزایا و حقوق</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        {printSlipItems.filter(i => i.type === 'earning').map(item => (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="py-2 text-slate-600">{item.title}</td>
                            <td className="py-2 text-left font-bold">{toPersianDigits(formatNumber(item.amount))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Deductions */}
                  <div>
                    <h3 className="font-bold text-slate-800 mb-3 bg-slate-100 px-3 py-2 rounded">کسورات</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        {printSlipItems.filter(i => i.type === 'deduction').map(item => (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="py-2 text-slate-600">{item.title}</td>
                            <td className="py-2 text-left font-bold">{toPersianDigits(formatNumber(item.amount))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="grid grid-cols-2 gap-6 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-bold">جمع مزایا:</span>
                      <span className="font-bold text-emerald-600">{toPersianDigits(formatNumber(printSlip.totalEarnings))} ریال</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 font-bold">جمع کسورات:</span>
                      <span className="font-bold text-rose-600">{toPersianDigits(formatNumber(printSlip.totalDeductions))} ریال</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center border-r border-slate-200 pr-6">
                    <span className="text-slate-500 font-bold mb-1">خالص پرداختی:</span>
                    <span className="text-2xl font-bold text-indigo-700">{toPersianDigits(formatNumber(printSlip.netPayable))} ریال</span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between mt-12 pt-8 border-t-2 border-slate-800 px-8">
                  <div className="text-center text-slate-500 text-sm font-bold">امضا تایید کننده / مدیریت</div>
                  <div className="text-center text-slate-500 text-sm font-bold">امضا کارمند / دریافت کننده</div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW */}
      <div className="max-w-7xl mx-auto print:hidden">
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
          {loading && !printSlip ? (
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
                    <td className="p-4 font-mono text-emerald-600">{toPersianDigits(formatNumber(s.totalEarnings))}</td>
                    <td className="p-4 font-mono text-rose-600">{toPersianDigits(formatNumber(s.totalDeductions))}</td>
                    <td className="p-4 font-mono text-indigo-700 font-bold text-base">{toPersianDigits(formatNumber(s.netPayable))}</td>
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
                        <button onClick={() => handlePrint(s)} className="text-slate-400 hover:text-indigo-600"><Printer className="w-4 h-4"/></button>
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
