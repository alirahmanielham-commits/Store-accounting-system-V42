import React from 'react';
import { Menu, Settings, Bell, Search, Moon, Sun, Power, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';

interface HeaderProps {
  appState: any;
  toggleSidebar: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Header({ appState, toggleSidebar, isDarkMode, toggleDarkMode }: HeaderProps) {
  const { storeSettings, user, signOut, issuedChecks, receivedChecks } = appState;
  
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
        <div className={`hidden sm:flex items-center px-3 py-2 text-[15px] rounded-md transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
          <span>خانه</span>
        </div>
        <div className={`hidden sm:flex items-center px-3 py-2 text-[15px] rounded-md transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
          <span>تماس با ما</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <button className={`p-2 rounded-md transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
          <Search className="w-5 h-5" />
        </button>
        <button onClick={toggleDarkMode} className={`p-2 rounded-md transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button className={`p-2 rounded-md transition-colors relative ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
          <Bell className="w-5 h-5" />
        </button>
        <button className={`p-2 rounded-md transition-colors relative ${isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}>
          <AlertTriangle className={`w-5 h-5 ${nearDueChecksCount > 0 ? 'text-amber-500' : ''}`} />
          {nearDueChecksCount > 0 && <span className="absolute top-1.5 right-1.5 bg-[#dc3545] text-white text-[10px] min-w-[15px] h-[15px] flex items-center justify-center rounded-full font-bold px-1">{nearDueChecksCount}</span>}
          <span className="absolute top-1.5 right-1.5 bg-[#dc3545] text-white text-[10px] min-w-[15px] h-[15px] flex items-center justify-center rounded-full font-bold px-1">15</span>
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
