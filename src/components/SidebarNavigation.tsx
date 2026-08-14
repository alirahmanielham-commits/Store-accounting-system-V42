import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  X,
  Layers,
  Search,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { getFilteredSidebarGroups, SidebarGroup } from "../utils/sidebarData";

interface SidebarNavigationProps {
  mode: "sidebar" | "horizontal";
  user: any;
  signOut: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  systemModule: string;
  hasCheckedFinancialYears: boolean;
  activeFinancialYear: any;
  isGmailTheme: boolean;
  storeSettings: any;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  menuLayout: "vertical" | "horizontal";
  setIsComposeOpen: (open: boolean) => void;
  expandedGroups: { [key: string]: boolean };
  setExpandedGroups: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
}

export default function SidebarNavigation({
  mode,
  user,
  signOut,
  activeTab,
  setActiveTab,
  systemModule,
  hasCheckedFinancialYears,
  activeFinancialYear,
  isGmailTheme,
  storeSettings,
  isSidebarOpen,
  setIsSidebarOpen,
  menuLayout,
  setIsComposeOpen,
  expandedGroups,
  setExpandedGroups,
}: SidebarNavigationProps) {
  const [menuSearchQuery, setMenuSearchQuery] = useState("");

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const filteredSidebarGroups = useMemo(() => {
    return getFilteredSidebarGroups(systemModule, hasCheckedFinancialYears, activeFinancialYear);
  }, [systemModule, hasCheckedFinancialYears, activeFinancialYear]);

  const renderSidebarGroups = () => {
    const searchLower = menuSearchQuery.toLowerCase();
    
    // Process each group, filtering its items
    const searchedGroups = filteredSidebarGroups.map(group => {
      const matchedItems = (group.items).filter(item => {
        const matchesSearch = item.label.toLowerCase().includes(searchLower);
        const matchesRole = !user || item.roles.includes(user.role);
        return matchesSearch && matchesRole;
      });
      return {
        ...group,
        items: matchedItems
      };
    }).filter(group => (group.items || []).length > 0);

    return (
      <div className="flex flex-col h-full font-sans text-right select-none">
        {/* Search Input */}
        <div className="px-4 py-3 border-b border-gray-100/10 no-print">
          <div className="relative">
            <input
              type="text"
              value={menuSearchQuery}
              onChange={(e) => setMenuSearchQuery(e.target.value)}
              placeholder="جستجوی منو..."
              className={`w-full pl-3 pr-9 py-2 rounded-xl text-xs font-bold transition-all border outline-none ${
                isGmailTheme
                  ? "bg-[#eaeef6] border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#b3261e]/20 focus:border-[#b3261e]"
                  : "bg-slate-800 border-slate-700/50 text-slate-200 focus:bg-slate-750 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            {menuSearchQuery && (
              <button
                onClick={() => setMenuSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 border-none bg-transparent cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Groups & Items List */}
        <div className="space-y-1.5 py-4 overflow-y-auto flex-1 custom-scrollbar">
          {searchedGroups.map((group, groupIdx) => {
            const isGroupExpanded = expandedGroups[group.id] || menuSearchQuery.length > 0;

            return (
              <div key={`group-${group.id}-${groupIdx}`} className="mb-1 px-3">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-black transition-all ${
                    isGmailTheme
                      ? "text-[#444746] hover:bg-[#eaeef6] rounded-xl"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-xl"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={`p-1 rounded-lg ${isGmailTheme ? "bg-slate-200/50 text-slate-700" : "bg-slate-800/80 text-indigo-400"}`}>
                      {group.icon}
                    </span>
                    <span>{group.label}</span>
                  </span>
                  {!menuSearchQuery && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${isGroupExpanded ? "rotate-180" : ""}`}
                    />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {isGroupExpanded && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={`space-y-1 mt-1 mr-7 pr-3 border-r-2 ${
                          isGmailTheme ? "border-slate-200" : "border-slate-800"
                        }`}
                      >
                        {group.items.map((item, itemIdx) => {
                          const isItemActive = activeTab === item.id;
                          return (
                            <button
                              key={`item-${group.id}-${item.id}-${itemIdx}`}
                              onClick={() => {
                                if (item.id === "create_receive_receipt") {
                                  setActiveTab?.("create_receive_receipt");
                                } else if (item.id === "create_pay_receipt") {
                                  setActiveTab?.("create_pay_receipt");
                                } else {
                                  setActiveTab(item.id as any);
                                }
                                setIsSidebarOpen(false);
                              }}
                              className={`w-full text-right block py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all hover:pr-4 ${
                                isItemActive
                                  ? isGmailTheme
                                    ? "bg-[#fce8e6] text-[#b3261e] font-black border-r-4 border-[#b3261e]"
                                    : "bg-indigo-600/20 text-indigo-300 font-extrabold border-r-4 border-indigo-500 shadow-sm"
                                  : isGmailTheme
                                    ? "text-[#444746] hover:bg-[#eaeef6]"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {searchedGroups.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-xs font-bold">
              موردی یافت نشد
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHorizontalMenu = () => {
    return (
      <div
        className="hidden md:flex items-center gap-1.5 px-6 py-2.5 flex-wrap bg-white sticky top-0 z-40 select-none shadow-sm"
        dir="rtl"
      >
        {filteredSidebarGroups.map((group, groupIdx) => {
          const visibleItems = (group.items).filter(
            (item) => !user || item.roles.includes(user.role),
          );
          if (visibleItems.length === 0) return null;
          const isActiveGroup = group.items.some((i) => i.id === activeTab);

          return (
            <div key={`hz-group-${group.id}-${groupIdx}`} className="relative group shrink-0">
              <button
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold ${
                  isActiveGroup
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 bg-transparent hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                <span className={isActiveGroup ? "text-white" : "text-indigo-500"}>
                  {group.icon}
                </span>
                <span>{group.label}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70 group-hover:rotate-180" />
              </button>
              
              <div className="absolute right-0 top-full pt-3 w-56 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col p-2 transform group-hover:translate-y-0 -translate-y-2 transition-all duration-300">
                  <div className="px-3 py-1.5 text-[10px] font-black tracking-wider text-slate-400 mb-1">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                  {visibleItems.map((item, itemIdx) => {
                    const isItemActive = activeTab === item.id;
                    return (
                      <button
                        key={`hz-item-${group.id}-${item.id}-${itemIdx}`}
                        onClick={() => {
                        if (item.id === "create_receive_receipt") {
                          setActiveTab?.("create_receive_receipt");
                        } else if (item.id === "create_pay_receipt") {
                          setActiveTab?.("create_pay_receipt");
                        } else {
                          setActiveTab(item.id as any);
                        }
                      }}
                        className={`text-right w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                          isItemActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (mode === "horizontal") {
    if (menuLayout !== "horizontal") return null;
    return renderHorizontalMenu();
  }

  return (
    <>
      {/* Desktop Sidebar */}
      {menuLayout === "vertical" && (
        <aside
          className={`hidden md:flex flex-col w-64 flex-shrink-0 transition-all duration-300 overflow-y-auto print:hidden ${
            isGmailTheme
              ? "bg-[#f6f8fc] border-l border-slate-200"
              : `bg-slate-900 shadow-2xl text-slate-300 z-40 theme-${storeSettings?.theme || "classic"}`
          }`}
          dir="rtl"
        >
          <div
            className={`p-5 flex flex-col justify-center ${isGmailTheme ? "border-b border-slate-200/50" : "border-b border-slate-800"}`}
          >
            <div className="flex items-center gap-3">
              {storeSettings.logoUrl ? (
                <img
                  src={storeSettings.logoUrl}
                  className="w-8 h-8 rounded"
                  alt="logo"
                />
              ) : (
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-white/20 transform -rotate-45 translate-x-4"></div>
                  <Layers className="w-5 h-5 relative z-10" />
                </div>
              )}
              <div>
                <h1
                  className={`font-extrabold text-lg ${isGmailTheme ? "text-slate-800" : "text-white"} flex items-center gap-2`}
                >
                  <span className="text-indigo-500 tracking-widest text-xl">تراز</span>
                  <span className="opacity-30 font-normal">|</span>
                  <span className="text-sm truncate max-w-[120px] inline-block">{storeSettings.storeName || "سیستم مدیریت"}</span>
                </h1>
                <div
                  className={`text-xs font-mono mt-0.5 ${isGmailTheme ? "text-slate-500" : "text-slate-400"}`}
                  dir="ltr"
                >
                  {localStorage.getItem("localAppVersion") || "Build 2.9.0"}
                </div>
              </div>
            </div>
          </div>

          {isGmailTheme && (
            <div className="px-4 pt-4 pb-2">
              <button
                type="button"
                onClick={() => setIsComposeOpen(true)}
                className="flex items-center gap-3 px-6 py-4 bg-white hover:bg-[#eaeef6] text-slate-800 rounded-2xl shadow-md hover:shadow-lg transition-all border border-slate-100 w-full font-black text-sm text-right justify-center cursor-pointer"
              >
                <svg
                  className="w-5 h-5 text-[#b3261e]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-slate-700 font-extrabold">
                  ایجاد جدید
                </span>
              </button>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            {renderSidebarGroups()}
          </div>
          <div
            className={`p-4 ${isGmailTheme ? "border-t border-slate-200/50" : "border-t border-slate-800"}`}
          >
            <button
              onClick={signOut}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-colors ${
                isGmailTheme
                  ? "text-[#b3261e] hover:bg-rose-50 border border-rose-100"
                  : "text-rose-400 hover:text-white hover:bg-rose-500/20"
              }`}
            >
              <LogOut className="w-5 h-5" />
              خروج از حساب
            </button>
          </div>
        </aside>
      )}

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[100] md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`relative flex flex-col w-72 max-w-[85vw] h-full shadow-2xl z-[101] overflow-y-auto ${
                isGmailTheme
                  ? "bg-[#f6f8fc]"
                  : `bg-slate-900 text-slate-300 theme-${storeSettings?.theme || "classic"}`
              }`}
              dir="rtl"
            >
              <div className="p-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-500 tracking-widest text-lg font-black">تراز</span>
                  <span className="text-xs text-slate-400">| {storeSettings?.storeName || "سیستم مدیریت"}</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {renderSidebarGroups()}
              </div>
              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  خروج از حساب
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
      </>
  );
}
