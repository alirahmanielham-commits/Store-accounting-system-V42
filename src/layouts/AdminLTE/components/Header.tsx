import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Menu, Settings, Bell, Search, Moon, Sun, Power, AlertTriangle, Grid3x3, ShoppingCart, Box, Calculator, Users, FileText, PieChart, LayoutGrid } from 'lucide-react';

interface HeaderProps {
  appState: any;
  toggleSidebar: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Header({ appState, toggleSidebar, isDarkMode, toggleDarkMode }: HeaderProps) {
  const { storeSettings, user, signOut, issuedChecks, receivedChecks, setSystemModule, setActiveTab, systemModule } = appState;
  
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const appsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (appsRef.current && !appsRef.current.contains(event.target as Node)) {
        setIsAppsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const nearDueChecksCount = useMemo(() => {
    let count = 0;
    const today = new Date();
    const thresholdDays = 7;
    const thresholdTime = thresholdDays * 24 * 60 * 60 * 1000;
    const allChecks = [...(issuedChecks || []), ...(receivedChecks || [])];
    allChecks.forEach(check => {
      if (['issued', 'received', 'deposited', 'assigned'].includes(check.status)) {
         if (check.dueDate) {
            const dueDate = new Date(check.dueDate);
            const diff = dueDate.getTime() - today.getTime();
            if (diff <= thresholdTime) {
               count++;
            }
         }
      }
    });
    return count;
  }, [issuedChecks, receivedChecks]);

  const appModules = [
    { id: 'commerce', title: 'بازرگانی', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'inventory', title: 'انبار', icon: Box, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'accounting', title: 'حسابداری', icon: Calculator, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'crm', title: 'مشتریان', icon: Users, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'hr', title: 'پرسنل', icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'reports_module', title: 'گزارشات', icon: PieChart, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'admin', title: 'تنظیمات', icon: Settings, color: 'text-slate-600', bg: 'bg-slate-50' },
    { id: 'all', title: 'داشبورد جامع', icon: LayoutGrid, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const handleSelectModule = (id: string) => {
    setSystemModule(id);
    setIsAppsOpen(false);
    if (id === "commerce") setActiveTab("analytical_dashboard");
    else if (id === "inventory") setActiveTab("inventory_report");
    else if (id === "accounting") setActiveTab("financial_report");
    else if (id === "admin") setActiveTab("settings");
    else if (id === "crm") setActiveTab("crm_dashboard");
    else if (id === "hr") setActiveTab("list_salary_payroll");
  };

  return (
    <header className={`h-[57px] flex items-center justify-between px-3 sticky top-0 z-30 border-b transition-colors duration-300
      ${isDarkMode ? 'bg-[#343a40] border-[#4b545c] text-white' : 'bg-white border-[#dee2e6] text-gray-700'}`}>
      
      <div className="flex items-center gap-1">
        <button 
          onClick={toggleSidebar} 
          className={`p-2 rounded-md transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className={`hidden sm:flex items-center px-3 py-2 text-[15px] font-medium transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <span>{appModules.find(m => m.id === systemModule)?.title || 'داشبورد'}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1 relative">
        <button className={`p-2 rounded-md transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
          <Search className="w-5 h-5" />
        </button>
        
        {/* Apps Switcher */}
        <div ref={appsRef} className="relative">
          <button 
            onClick={() => setIsAppsOpen(!isAppsOpen)} 
            className={`p-2 rounded-md transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'} ${isAppsOpen ? (isDarkMode ? 'bg-white/10' : 'bg-gray-100') : ''}`}
            title="تغییر بخش کاربری"
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          
          {isAppsOpen && (
            <div className={`absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-[280px] sm:w-72 rounded-xl shadow-lg border overflow-hidden ${isDarkMode ? 'bg-[#343a40] border-[#4b545c]' : 'bg-white border-gray-200'}`}>
              <div className={`p-3 border-b ${isDarkMode ? 'border-[#4b545c]' : 'border-gray-100'}`}>
                <div className="font-medium text-sm text-center">انتخاب بخش کاربری</div>
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {appModules.map(mod => {
                  const Icon = mod.icon;
                  const isActive = systemModule === mod.id;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => handleSelectModule(mod.id)}
                      className={`flex flex-col items-center justify-center gap-2 p-2 rounded-xl transition-all
                        ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}
                        ${isActive ? (isDarkMode ? 'bg-white/10 ring-1 ring-gray-500' : 'bg-gray-100 ring-1 ring-gray-300') : ''}
                      `}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-white/10' : mod.bg}`}>
                        <Icon className={`w-5 h-5 ${mod.color}`} />
                      </div>
                      <span className="text-[11px] font-medium text-center truncate w-full">
                        {mod.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button onClick={toggleDarkMode} className={`p-2 rounded-md transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button className={`p-2 rounded-md transition-colors relative ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
          <Bell className="w-5 h-5" />
        </button>
        <button className={`p-2 rounded-md transition-colors relative ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
          <AlertTriangle className={`w-5 h-5 ${nearDueChecksCount > 0 ? 'text-amber-500' : ''}`} />
          {nearDueChecksCount > 0 && <span className="absolute top-1.5 right-1.5 bg-[#dc3545] text-white text-[10px] min-w-[15px] h-[15px] flex items-center justify-center rounded-full font-bold px-1">{nearDueChecksCount}</span>}
        </button>
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        <button 
          onClick={signOut}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
        >
          <Power className="w-[18px] h-[18px] text-[#dc3545]" />
          <span className="text-[15px] hidden sm:block">خروج</span>
        </button>
      </div>
    </header>
  );
}
