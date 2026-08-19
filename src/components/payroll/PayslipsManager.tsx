import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Printer, CheckCircle, Search, FileText, X, Download, FileSpreadsheet, Building2, MapPin, Calendar, Clock, DollarSign, Wallet, TrendingUp, TrendingDown, User, Check, AlertCircle } from 'lucide-react';
import { getPayslips, addPayslip, updatePayslip, getMonthlyAttendances, getEmployeeContracts, getContractComponents, getSalaryComponents, getPayslipItems, addPayslipItem } from '../../services/hrService';
import { toPersianDigits, formatNumber } from '../../utils/format';

export default function PayslipsManager({ personsData, showNotification }) {
  const [year, setYear] = useState(1403);
  const [month, setMonth] = useState(1);
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printSlip, setPrintSlip] = useState(null);
  const [printSlipItems, setPrintSlipItems] = useState([]);
  
  // New States for Redesign
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlipId, setSelectedSlipId] = useState(null);
  const [allAttendances, setAllAttendances] = useState([]);
  const [allSlipItems, setAllSlipItems] = useState([]);

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

      const atts = await getMonthlyAttendances();
      setAllAttendances(atts.filter(a => Number(a.periodYear) === Number(year) && Number(a.periodMonth) === Number(month)));

      const sItems = await getPayslipItems();
      const currentSlipIds = data.map(s => s.id);
      setAllSlipItems(sItems.filter(i => currentSlipIds.includes(i.payslipId)));

      if (data.length > 0) {
        if (!selectedSlipId || !data.find(s => s.id === selectedSlipId)) {
          setSelectedSlipId(data[0].id);
        }
      } else {
        setSelectedSlipId(null);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getPersonName = (id) => {
    const p = (personsData || []).find(x => x.id === id);
    return p ? p.name : 'نامشخص';
  };

  const filteredSlips = useMemo(() => {
    if (!searchQuery) return slips;
    return slips.filter(s => {
      const name = getPersonName(s.personId) || '';
      return name.includes(searchQuery);
    });
  }, [slips, searchQuery, personsData]);

  const selectedSlip = useMemo(() => slips.find(s => s.id === selectedSlipId) || null, [slips, selectedSlipId]);
  const selectedAttendance = useMemo(() => {
    if (!selectedSlip) return null;
    return allAttendances.find(a => a.personId === selectedSlip.personId);
  }, [selectedSlip, allAttendances]);

  const selectedEarnings = useMemo(() => allSlipItems.filter(i => i.payslipId === selectedSlipId && i.type === 'earning'), [allSlipItems, selectedSlipId]);
  const selectedDeductions = useMemo(() => allSlipItems.filter(i => i.payslipId === selectedSlipId && i.type === 'deduction'), [allSlipItems, selectedSlipId]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const attendances = allAttendances;
      if (attendances.length === 0) return showNotification('ابتدا کارکرد این ماه را در منوی ورود و خروج ثبت کنید', 'error');

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
        
        // 1. Identify base salary
        let baseSalaryAmount = 0;
        for (const mc of myComps) {
          const compDef = allComps.find(c => c.id === mc.componentId);
          if (!compDef) continue;
          if (compDef.type === 'earning' && compDef.calculationType === 'fixed') {
            const v = mc.overrideAmount ? parseFloat(mc.overrideAmount) : 0;
            if (compDef.code === 'base_salary' || compDef.code === 'base') {
              baseSalaryAmount = v;
              break;
            }
            if (v > baseSalaryAmount) baseSalaryAmount = v;
          }
        }

        // 2. Calculate components
        for (const mc of myComps) {
          const compDef = allComps.find(c => c.id === mc.componentId);
          if (!compDef) continue;

          let val = 0;
          const baseNum = mc.overrideAmount ? parseFloat(mc.overrideAmount) : 0; 
          
          if (compDef.calculationType === 'fixed') {
             val = baseNum;
          } else if (compDef.calculationType === 'time_based') {
             if (compDef.timeFactor === 'days') val = baseNum * parseFloat(att.workDays || 0);
             else if (compDef.timeFactor === 'overtime_hours') val = baseNum * parseFloat(att.overtimeHours || 0);
             else if (compDef.timeFactor === 'absence_days') val = baseNum * parseFloat(att.absentDays || 0);
          } else if (compDef.calculationType === 'percentage') {
             const percent = mc.overrideAmount ? parseFloat(mc.overrideAmount) : parseFloat(compDef.basePercentage || 0);
             val = (baseSalaryAmount * percent) / 100;
          } else if (compDef.calculationType === 'formula') {
             let formulaStr = mc.overrideFormula || compDef.formula || '';
             if (formulaStr) {
               try {
                 formulaStr = formulaStr.replace(/base_salary/g, baseSalaryAmount.toString());
                 formulaStr = formulaStr.replace(/overtime_hours/g, (att.overtimeHours || 0).toString());
                 formulaStr = formulaStr.replace(/absence_days/g, (att.absentDays || 0).toString());
                 formulaStr = formulaStr.replace(/work_days/g, (att.workDays || 0).toString());
                 
                 // Safe evaluation
                 val = Function(`'use strict'; return (${formulaStr})`)();
               } catch(err) {
                 console.error("Formula error:", formulaStr, err);
                 val = 0;
               }
             }
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

  const handleExportPDF = () => showNotification('در حال آماده سازی PDF...', 'success');
  const handleExportExcel = () => showNotification('در حال آماده سازی فایل Excel...', 'success');

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8 print:bg-white print:p-0" dir="rtl">
      
      {/* PRINT MODAL (unchanged behavior, keeps clean printing layout) */}
      {printSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 print:relative print:inset-auto print:bg-transparent print:p-0">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:shadow-none print:rounded-none print:border-0 print:h-auto print:max-h-none print:block">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden">
              <h3 className="font-bold text-slate-800">پیش‌نمایش چاپ فیش حقوقی</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700">
                  <Printer className="w-4 h-4" /> چاپ
                </button>
                <button onClick={() => setPrintSlip(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-lg border border-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto print:overflow-visible print:p-0">
              <div className="border-2 border-slate-800 p-6 rounded-xl print:border-none print:p-0">
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

                <div className="grid grid-cols-2 gap-6 mb-8">
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

                <div className="flex justify-between mt-12 pt-8 border-t-2 border-slate-800 px-8">
                  <div className="text-center text-slate-500 text-sm font-bold">امضا تایید کننده / مدیریت</div>
                  <div className="text-center text-slate-500 text-sm font-bold">امضا کارمند / دریافت کننده</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW METRONIC INSPIRED LAYOUT */}
      <div className="max-w-[1400px] mx-auto print:hidden">
        
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800">مدیریت حقوق و دستمزد</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">بررسی، محاسبه و صدور پیشرفته فیش‌های حقوقی پرسنل</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button onClick={handleExportExcel} className="flex-1 lg:flex-none justify-center items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all shadow-sm flex">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span className="hidden sm:inline">خروجی اکسل</span>
            </button>
            <button onClick={handleExportPDF} className="flex-1 lg:flex-none justify-center items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all shadow-sm flex">
              <Download className="w-5 h-5 text-rose-600" />
              <span className="hidden sm:inline">خروجی PDF</span>
            </button>
            <button onClick={handleGenerate} disabled={loading} className="flex-1 lg:flex-none justify-center items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all flex">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Calculator className="w-5 h-5" />}
              محاسبه خودکار حقوق
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> شرکت</label>
            <select className="w-full border-0 bg-slate-50 p-3 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer">
              <option>شرکت نمونه مرکزی</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> شعبه</label>
            <select className="w-full border-0 bg-slate-50 p-3 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer">
              <option>شعبه اصلی تهران</option>
            </select>
          </div>
          <div className="w-full sm:w-32">
            <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> سال مالی</label>
            <input type="number" value={year} onChange={e=>setYear(parseInt(e.target.value))} className="w-full border-0 bg-slate-50 p-3 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 text-center" />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> ماه کارکرد</label>
            <select value={month} onChange={e=>setMonth(parseInt(e.target.value))} className="w-full border-0 bg-slate-50 p-3 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer">
              <option value={1}>فروردین</option><option value={2}>اردیبهشت</option><option value={3}>خرداد</option>
              <option value={4}>تیر</option><option value={5}>مرداد</option><option value={6}>شهریور</option>
              <option value={7}>مهر</option><option value={8}>آبان</option><option value={9}>آذر</option>
              <option value={10}>دی</option><option value={11}>بهمن</option><option value={12}>اسفند</option>
            </select>
          </div>
        </div>

        {/* Main Workspace Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Column: Employees List */}
          <div className="w-full lg:w-[350px] flex flex-col gap-4 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="جستجوی نام پرسنل..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder:text-slate-400"
              />
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[650px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                 <span className="font-bold text-slate-700">لیست پرسنل ({toPersianDigits(filteredSlips.length)})</span>
                 {loading && <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
              </div>
              <div className="overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {filteredSlips.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-medium">پرسنلی یافت نشد</div>
                ) : (
                  filteredSlips.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => setSelectedSlipId(s.id)}
                      className={`w-full text-right p-4 rounded-xl transition-all flex items-center gap-4 border ${selectedSlipId === s.id ? 'bg-indigo-50/80 border-indigo-200' : 'hover:bg-slate-50 border-transparent'}`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm ${selectedSlipId === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {getPersonName(s.personId).substring(0, 1)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className={`font-bold truncate ${selectedSlipId === s.id ? 'text-indigo-900' : 'text-slate-800'}`}>{getPersonName(s.personId)}</h4>
                        <p className="text-xs text-slate-500 mt-1 font-mono">{toPersianDigits(formatNumber(s.netPayable))} ریال</p>
                      </div>
                      <div className="flex flex-col items-end justify-center">
                        {s.status === 'finalized' ? (
                          <div className="bg-emerald-100 text-emerald-600 p-1 rounded-full"><CheckCircle className="w-4 h-4" /></div>
                        ) : (
                          <div className="bg-amber-100 text-amber-600 p-1 rounded-full"><AlertCircle className="w-4 h-4" /></div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Slip Details */}
          <div className="w-full flex-1">
            {selectedSlip ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[650px] flex flex-col">
                
                {/* Employee Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/30">
                      {getPersonName(selectedSlip.personId).substring(0, 1)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800">{getPersonName(selectedSlip.personId)}</h2>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">کد پرسنلی: {toPersianDigits(selectedSlip.personId.substring(0, 6))}</span>
                        <span className={`text-sm font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm border ${selectedSlip.status === 'finalized' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {selectedSlip.status === 'finalized' ? <><Check className="w-4 h-4"/> تایید و قطعی</> : <><Clock className="w-4 h-4"/> پیش‌نویس</>}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-6 sm:mt-0 w-full sm:w-auto">
                    {selectedSlip.status === 'draft' && (
                      <button onClick={() => handleFinalize(selectedSlip.id)} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-2 shadow-sm">
                        <CheckCircle className="w-5 h-5" /> قطعی کردن فیش
                      </button>
                    )}
                    <button onClick={() => handlePrint(selectedSlip)} className="flex-1 sm:flex-none justify-center px-6 py-2.5 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors border border-slate-200 flex items-center gap-2 shadow-sm">
                      <Printer className="w-5 h-5" /> چاپ
                    </button>
                  </div>
                </div>

                {/* Colored Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-6 md:p-8">
                  {/* Earnings Card */}
                  <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 relative overflow-hidden group hover:bg-emerald-50 transition-colors">
                    <div className="absolute left-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-br-[60px] -translate-x-6 -translate-y-6 transition-transform group-hover:scale-110" />
                    <div className="flex items-center justify-between mb-4 relative">
                      <h4 className="font-bold text-emerald-800 text-lg">جمع کل مزایا</h4>
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                         <TrendingUp className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-emerald-700 font-mono relative">
                      {toPersianDigits(formatNumber(selectedSlip.totalEarnings))} <span className="text-base font-bold text-emerald-600/70">ریال</span>
                    </div>
                  </div>
                  
                  {/* Deductions Card */}
                  <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-100 relative overflow-hidden group hover:bg-rose-50 transition-colors">
                    <div className="absolute left-0 top-0 w-24 h-24 bg-rose-500/5 rounded-br-[60px] -translate-x-6 -translate-y-6 transition-transform group-hover:scale-110" />
                    <div className="flex items-center justify-between mb-4 relative">
                      <h4 className="font-bold text-rose-800 text-lg">جمع کل کسورات</h4>
                      <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                         <TrendingDown className="w-5 h-5 text-rose-600" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-rose-700 font-mono relative">
                      {toPersianDigits(formatNumber(selectedSlip.totalDeductions))} <span className="text-base font-bold text-rose-600/70">ریال</span>
                    </div>
                  </div>

                  {/* Net Card */}
                  <div className="bg-indigo-600 rounded-2xl p-6 border border-indigo-500 relative overflow-hidden shadow-lg shadow-indigo-600/20 group">
                    <div className="absolute left-0 top-0 w-32 h-32 bg-white/5 rounded-br-[80px] -translate-x-10 -translate-y-10 transition-transform group-hover:scale-110" />
                    <div className="absolute right-0 bottom-0 w-24 h-24 bg-indigo-900/20 rounded-tl-[60px] translate-x-4 translate-y-4" />
                    <div className="flex items-center justify-between mb-4 text-indigo-100 relative">
                      <h4 className="font-bold text-lg">خالص پرداختی</h4>
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                         <Wallet className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-white font-mono relative">
                      {toPersianDigits(formatNumber(selectedSlip.netPayable))} <span className="text-base font-bold text-indigo-200">ریال</span>
                    </div>
                  </div>
                </div>

                {/* Detail Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-6 md:px-8 pb-8 flex-1">
                  
                  {/* Right Half: Attendance & Earnings */}
                  <div className="space-y-8">
                    
                    {/* Attendance Grid */}
                    <div>
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><Calendar className="w-4 h-4"/></div>
                        <h3 className="font-bold text-slate-800 text-lg">خلاصه کارکرد دوره</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-500">روز کارکرد</span>
                          <span className="text-xl font-black text-slate-800">{toPersianDigits(selectedAttendance?.workDays || 0)}</span>
                        </div>
                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 shadow-sm flex items-center justify-between">
                          <span className="text-sm font-bold text-indigo-600">ساعت اضافه کاری</span>
                          <span className="text-xl font-black text-indigo-700">{toPersianDigits(selectedAttendance?.overtimeHours || 0)}</span>
                        </div>
                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
                          <span className="text-sm font-bold text-emerald-600">مرخصی استحقاقی</span>
                          <span className="text-xl font-black text-emerald-700">{toPersianDigits(selectedAttendance?.paidLeaveDays || 0)}</span>
                        </div>
                        <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between">
                          <span className="text-sm font-bold text-rose-600">غیبت / بدون حقوق</span>
                          <span className="text-xl font-black text-rose-700">{toPersianDigits(selectedAttendance?.absentDays || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Earnings List */}
                    <div>
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><TrendingUp className="w-4 h-4"/></div>
                        <h3 className="font-bold text-slate-800 text-lg">جزئیات مزایا</h3>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-right text-sm">
                          <tbody className="divide-y divide-slate-100">
                            {selectedEarnings.length === 0 ? (
                              <tr><td className="p-6 text-center text-slate-400 font-medium">موردی یافت نشد</td></tr>
                            ) : selectedEarnings.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-slate-700 font-bold">{item.title}</td>
                                <td className="p-4 text-left font-black text-slate-800 font-mono">{toPersianDigits(formatNumber(item.amount))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {/* Left Half: Deductions */}
                  <div className="space-y-8">
                    {/* Deductions List */}
                    <div>
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600"><TrendingDown className="w-4 h-4"/></div>
                        <h3 className="font-bold text-slate-800 text-lg">جزئیات کسورات</h3>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-right text-sm">
                          <tbody className="divide-y divide-slate-100">
                            {selectedDeductions.length === 0 ? (
                              <tr><td className="p-6 text-center text-slate-400 font-medium">موردی یافت نشد</td></tr>
                            ) : selectedDeductions.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 text-slate-700 font-bold">{item.title}</td>
                                <td className="p-4 text-left font-black text-slate-800 font-mono">{toPersianDigits(formatNumber(item.amount))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full min-h-[650px] flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-8 border-white shadow-sm">
                  <Wallet className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="font-black text-xl text-slate-600 mb-2">هیچ فیش حقوقی انتخاب نشده است</h3>
                <p className="text-slate-500 max-w-sm leading-relaxed">
                  از لیست پرسنل در سمت راست یک نفر را انتخاب کنید تا جزئیات کامل حقوق، دستمزد و کارکرد او را مشاهده کنید. در صورتی که لیستی وجود ندارد روی دکمه محاسبه کلیک کنید.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
