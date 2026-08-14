import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import './adminlte-overrides.css';

interface AdminLTELayoutProps {
  appState: any;
  children: React.ReactNode;
}

export default function AdminLTELayout({ appState, children }: AdminLTELayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Optional AdminLTE dark mode

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  useEffect(() => {
    // If AdminLTE layout is mounted, we can add a class to body if we wanted, 
    // but scoping to this div is safer.
  }, []);

  return (
    <div className={`adminlte-theme flex h-screen text-[#212529] font-sans overflow-hidden ${isDarkMode ? 'dark bg-[#454d55]' : 'bg-[#f4f6f9]'}`} dir="rtl">
      <Sidebar 
        appState={appState} 
        isCollapsed={isSidebarCollapsed} 
        isDarkMode={isDarkMode}
      />
      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300 relative">
        <Header 
          appState={appState} 
          toggleSidebar={toggleSidebar}
          isDarkMode={isDarkMode}
          toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />
        <main className={`flex-1 overflow-y-auto p-4 transition-colors duration-300 ${isDarkMode ? 'bg-[#454d55] text-white' : 'bg-[#f4f6f9] text-[#212529]'}`}>
          <div className="container-fluid mx-auto max-w-7xl">
            {/* Breadcrumb could go here */}
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-medium tracking-tight m-0">داشبورد</h1>
              <ol className="flex items-center space-x-2 space-x-reverse text-sm text-gray-500">
                <li><a href="#" className="text-blue-600 hover:text-blue-800">خانه</a></li>
                <li>/</li>
                <li className="text-gray-400">داشبورد</li>
              </ol>
            </div>
            
            {children}
          </div>
        </main>
        <Footer isDarkMode={isDarkMode} />
      </div>
      
      {/* Overlay for mobile sidebar */}
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-[35] md:hidden" 
          onClick={() => setIsSidebarCollapsed(true)} 
        />
      )}
    </div>
  );
}
