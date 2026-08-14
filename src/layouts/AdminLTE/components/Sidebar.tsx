import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, Box, Calculator, 
  Settings, ChevronLeft, Circle, FileText,
  Search
} from 'lucide-react';

interface SidebarProps {
  appState: any;
  isCollapsed: boolean;
  isDarkMode: boolean;
}

export default function Sidebar({ appState, isCollapsed, isDarkMode }: SidebarProps) {
  const { activeTab, setActiveTab, storeSettings, user } = appState;
  const [openMenu, setOpenMenu] = useState<string | null>('accounting');

  const toggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'داشبورد اصلی',
      icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
      action: () => setActiveTab('financial_report')
    },
    {
      id: 'accounting',
      label: 'حسابداری و مالی',
      icon: <Calculator className="w-[18px] h-[18px]" />,
      subItems: [
        { id: 'financial_report', label: 'گزارشات', action: () => setActiveTab('financial_report') },
        { id: 'account_ledger', label: 'دفتر حساب‌ها', action: () => setActiveTab('account_ledger') },
        { id: 'accounts', label: 'حساب‌های بانکی', action: () => setActiveTab('accounts') },
        { id: 'cashboxes', label: 'صندوق‌ها', action: () => setActiveTab('cashboxes') }
      ]
    },
    {
      id: 'persons',
      label: 'اشخاص و شرکت‌ها',
      icon: <Users className="w-[18px] h-[18px]" />,
      action: () => setActiveTab('persons')
    },
    {
      id: 'products',
      label: 'کالاها و انبار',
      icon: <Box className="w-[18px] h-[18px]" />,
      action: () => setActiveTab('products')
    },
    {
      id: 'invoices',
      label: 'خرید و فروش',
      icon: <FileText className="w-[18px] h-[18px]" />,
      action: () => setActiveTab('invoices')
    },
    {
      id: 'settings',
      label: 'تنظیمات سیستم',
      icon: <Settings className="w-[18px] h-[18px]" />,
      subItems: [
        { id: 'settings', label: 'تنظیمات کلی', action: () => setActiveTab('settings') },
        { id: 'sync_manager', label: 'مدیریت همگام‌سازی', action: () => setActiveTab('sync_manager') }
      ]
    }
  ];

  const isActive = (item: any) => {
    if (activeTab === item.id) return true;
    if (item.subItems && item.subItems.some((sub: any) => activeTab === sub.id)) return true;
    return false;
  };

  return (
    <aside 
      className={`fixed md:relative flex flex-col h-full z-40 overflow-hidden transition-all duration-300
        ${isDarkMode ? 'bg-[#343a40]' : 'bg-[#343a40]'} 
        ${isCollapsed ? '-translate-x-full md:translate-x-0 md:w-[73px]' : 'translate-x-0 w-[250px]'}`}
      style={{ boxShadow: '0 14px 28px rgba(0,0,0,.25),0 10px 10px rgba(0,0,0,.22)' }}
    >
      {/* Brand Logo */}
      <div className="h-[57px] flex items-center gap-3 px-3 border-b border-[#4b545c] shrink-0 text-white cursor-pointer hover:bg-white/5 transition-colors">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-indigo-600 overflow-hidden shrink-0 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
           {storeSettings?.logoUrl ? <img src={storeSettings.logoUrl} className="w-full h-full object-cover" /> : 'T'}
        </div>
        <span className="font-light text-xl truncate whitespace-nowrap opacity-80 hover:opacity-100 transition-opacity">
          {storeSettings?.storeName || 'تراز سیستم'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden styled-scrollbar">
        {/* User Panel */}
        <div className="p-4 border-b border-[#4b545c] flex items-center gap-3">
          <div className="w-[34px] h-[34px] rounded-full bg-gray-600 flex items-center justify-center shrink-0 text-white font-bold overflow-hidden shadow-sm border-2 border-[#4b545c]">
             {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[#c2c7d0] font-normal truncate whitespace-nowrap text-[15px]">{user?.name || 'کاربر سیستم'}</span>
          </div>
        </div>

        {/* Sidebar Search */}
        <div className="px-2 mt-3 mb-1">
          <div className="relative">
            <input 
              type="text" 
              placeholder="جستجو..." 
              className="w-full bg-[#3f474e] border-none rounded-md py-1.5 pl-8 pr-3 text-[#c2c7d0] text-sm focus:ring-1 focus:ring-blue-500 placeholder:text-gray-500" 
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1.5" />
          </div>
        </div>

        {/* Sidebar Menu */}
        <nav className="mt-2 px-2 pb-4">
          <ul className="flex flex-col gap-0.5">
            {menuItems.map((item) => {
              const active = isActive(item);
              const isOpen = openMenu === item.id || active;
              
              return (
                <li key={item.id} className="flex flex-col">
                  <button
                    onClick={() => {
                      if (item.subItems) toggleMenu(item.id);
                      else if (item.action) item.action();
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full text-right
                      ${active && !item.subItems ? 'bg-[#007bff] text-white' : active && item.subItems ? 'bg-white/10 text-white' : 'text-[#c2c7d0] hover:bg-white/10 hover:text-white'}`}
                  >
                    <div className="shrink-0">{item.icon}</div>
                    <span className="flex-1 truncate text-[15px]">{item.label}</span>
                    {item.subItems && (
                      <ChevronLeft className={`w-[14px] h-[14px] transition-transform duration-300 shrink-0 ${isOpen ? '-rotate-90' : ''}`} />
                    )}
                  </button>
                  
                  {/* Submenu */}
                  {item.subItems && (
                    <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100 mt-0.5' : 'max-h-0 opacity-0'}`}>
                      <ul className="flex flex-col gap-0.5 pr-4 pl-0 py-1">
                        {item.subItems.map((sub) => {
                          const subActive = activeTab === sub.id;
                          return (
                            <li key={sub.id}>
                              <button
                                onClick={sub.action}
                                className={`flex items-center gap-3 px-3 py-1.5 rounded-md transition-colors w-full text-right text-[14px]
                                  ${subActive ? 'text-white' : 'text-[#c2c7d0] hover:text-white hover:bg-white/5'}`}
                              >
                                <Circle className={`w-[8px] h-[8px] shrink-0 ${subActive ? 'text-white fill-current' : 'text-[#c2c7d0]'} transition-all`} />
                                <span className="truncate">{sub.label}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
