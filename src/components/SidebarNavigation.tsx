import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  X,
  Layers,
  Search,
  ChevronDown,
  LogOut,
  Sparkles,
  Clock,
  ChevronsUpDown,
  ChevronsDownUp,
  Flame,
} from "lucide-react";
import { getFilteredSidebarGroups, SidebarGroup, SidebarItem } from "../utils/sidebarData";

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

const BADGE_COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30",
  blue: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30",
  purple: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30",
  cyan: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30",
};

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
  const [recentTabs, setRecentTabs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("taraz_recent_tabs");
      return saved ? JSON.parse(saved) : ["welcome_page", "create_sale", "sales_report", "check_panel"];
    } catch {
      return ["welcome_page", "create_sale", "sales_report", "check_panel"];
    }
  });

  // Track recent visited pages
  useEffect(() => {
    if (!activeTab || activeTab === "welcome_page") return;
    setRecentTabs((prev) => {
      const updated = [activeTab, ...prev.filter((t) => t !== activeTab)].slice(0, 5);
      try {
        localStorage.setItem("taraz_recent_tabs", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [activeTab]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const collapseAllGroups = () => {
    const closed: { [key: string]: boolean } = {};
    filteredSidebarGroups.forEach((g) => {
      closed[g.id] = false;
    });
    setExpandedGroups(closed);
  };

  const expandAllGroups = () => {
    const open: { [key: string]: boolean } = {};
    filteredSidebarGroups.forEach((g) => {
      open[g.id] = true;
    });
    setExpandedGroups(open);
  };

  const filteredSidebarGroups = useMemo(() => {
    return getFilteredSidebarGroups(systemModule, hasCheckedFinancialYears, activeFinancialYear);
  }, [systemModule, hasCheckedFinancialYears, activeFinancialYear]);

  // Flat lookup for all items
  const allItemsMap = useMemo(() => {
    const map = new Map<string, SidebarItem>();
    filteredSidebarGroups.forEach((g) => {
      g.items.forEach((item) => {
        map.set(item.id, item);
      });
    });
    return map;
  }, [filteredSidebarGroups]);

  // Expand the group of the currently active tab automatically on initial mount or tab change
  useEffect(() => {
    if (!activeTab) return;
    const parentGroup = filteredSidebarGroups.find((g) =>
      g.items.some((i) => i.id === activeTab)
    );
    if (parentGroup && !expandedGroups[parentGroup.id]) {
      setExpandedGroups((prev) => ({ ...prev, [parentGroup.id]: true }));
    }
  }, [activeTab, filteredSidebarGroups]);

  const renderSidebarGroups = () => {
    const searchLower = menuSearchQuery.trim().toLowerCase();

    // Process each group, filtering its items
    const searchedGroups = filteredSidebarGroups
      .map((group) => {
        const groupMatches = group.label.toLowerCase().includes(searchLower);
        const matchedItems = group.items.filter((item) => {
          const matchesSearch =
            searchLower === "" ||
            groupMatches ||
            item.label.toLowerCase().includes(searchLower) ||
            (item.shortLabel && item.shortLabel.toLowerCase().includes(searchLower)) ||
            (item.description && item.description.toLowerCase().includes(searchLower));
          const matchesRole = !user || item.roles.includes(user.role);
          return matchesSearch && matchesRole;
        });
        return {
          ...group,
          items: matchedItems,
        };
      })
      .filter((group) => (group.items || []).length > 0);

    const isAllCollapsed = filteredSidebarGroups.every((g) => !expandedGroups[g.id]);

    return (
      <div className="flex flex-col h-full font-sans text-right select-none">
        {/* Search & Collapse Controls */}
        <div className="px-3.5 py-3 border-b border-slate-700/30 no-print flex flex-col gap-2">
          <div className="relative">
            <input
              type="text"
              value={menuSearchQuery}
              onChange={(e) => setMenuSearchQuery(e.target.value)}
              placeholder="جستجو در منوها و صفحات..."
              className={`w-full pl-7 pr-9 py-2 rounded-xl text-xs font-bold transition-all border outline-none ${
                isGmailTheme
                  ? "bg-[#eaeef6] border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#b3261e]/20 focus:border-[#b3261e]"
                  : "bg-slate-800/90 border-slate-700/60 text-slate-100 placeholder-slate-400 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Search className="w-3.5 h-3.5" />
            </div>
            {menuSearchQuery && (
              <button
                type="button"
                onClick={() => setMenuSearchQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white rounded-full bg-slate-700/40 hover:bg-slate-700"
                title="پاک کردن"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Collapse / Expand Bar */}
          {!menuSearchQuery && (
            <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1 opacity-70">
                <Layers className="w-3 h-3" />
                {filteredSidebarGroups.length} بخش کاری
              </span>
              <button
                type="button"
                onClick={isAllCollapsed ? expandAllGroups : collapseAllGroups}
                className="flex items-center gap-1 hover:text-indigo-400 transition-colors p-1 rounded hover:bg-slate-800/40 cursor-pointer"
                title={isAllCollapsed ? "باز کردن همه گروه‌ها" : "جمع کردن همه گروه‌ها"}
              >
                {isAllCollapsed ? (
                  <>
                    <ChevronsUpDown className="w-3 h-3" />
                    <span>باز کردن همه</span>
                  </>
                ) : (
                  <>
                    <ChevronsDownUp className="w-3 h-3" />
                    <span>جمع کردن</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Quick Access / Recent Pages */}
        {!menuSearchQuery && recentTabs.length > 0 && (
          <div className="px-3 pt-2 pb-1 border-b border-slate-700/20">
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                دسترسی سریع / اخیر
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {recentTabs.slice(0, 4).map((tId) => {
                const itm = allItemsMap.get(tId);
                if (!itm) return null;
                const isActive = activeTab === tId;
                return (
                  <button
                    key={`recent-${tId}`}
                    type="button"
                    onClick={() => {
                      setActiveTab(tId);
                      setIsSidebarOpen(false);
                    }}
                    className={`text-[11px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? isGmailTheme
                          ? "bg-[#fce8e6] text-[#b3261e] border border-[#f9d5d3]"
                          : "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                        : isGmailTheme
                          ? "bg-slate-200/60 text-slate-700 hover:bg-slate-200"
                          : "bg-slate-800/80 text-slate-300 hover:bg-slate-750 hover:text-white"
                    }`}
                  >
                    <span>{itm.shortLabel || itm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Groups & Items List */}
        <div className="space-y-1 py-2 overflow-y-auto flex-1 custom-scrollbar">
          {searchedGroups.map((group, groupIdx) => {
            const isGroupExpanded = expandedGroups[group.id] || menuSearchQuery.length > 0;
            const hasActiveChild = group.items.some((i) => i.id === activeTab);

            return (
              <div key={`group-${group.id}-${groupIdx}`} className="mb-0.5 px-2">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-black transition-all rounded-xl cursor-pointer ${
                    hasActiveChild && !isGroupExpanded
                      ? isGmailTheme
                        ? "bg-indigo-50/70 text-[#b3261e]"
                        : "bg-slate-800/80 text-indigo-300 border-r-2 border-indigo-500"
                      : isGmailTheme
                        ? "text-[#444746] hover:bg-[#eaeef6]"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`p-1.5 rounded-lg shrink-0 transition-transform ${
                        hasActiveChild
                          ? isGmailTheme
                            ? "bg-[#fce8e6] text-[#b3261e]"
                            : "bg-indigo-600/30 text-indigo-400 shadow-sm"
                          : isGmailTheme
                            ? "bg-slate-200/60 text-slate-600"
                            : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      {group.icon}
                    </span>
                    <span className="truncate">{group.label}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800/60 text-slate-400">
                      {group.items.length}
                    </span>
                    {!menuSearchQuery && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 opacity-70 ${
                          isGroupExpanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isGroupExpanded && (
                    <motion.div
                      key={`content-${group.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={`space-y-0.5 mt-1 mr-4 pr-2.5 border-r-2 ${
                          isGmailTheme ? "border-slate-200" : "border-slate-800/80"
                        }`}
                      >
                        {group.items.map((item, itemIdx) => {
                          const isItemActive = activeTab === item.id;
                          return (
                            <button
                              key={`item-${group.id}-${item.id}-${itemIdx}`}
                              type="button"
                              onClick={() => {
                                setActiveTab(item.id as any);
                                setIsSidebarOpen(false);
                              }}
                              className={`w-full text-right flex items-center justify-between py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group/item ${
                                isItemActive
                                  ? isGmailTheme
                                    ? "bg-[#fce8e6] text-[#b3261e] font-black border-r-4 border-[#b3261e] shadow-xs"
                                    : "bg-indigo-600/25 text-indigo-200 font-extrabold border-r-4 border-indigo-500 shadow-sm"
                                  : isGmailTheme
                                    ? "text-[#444746] hover:bg-[#eaeef6]"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="shrink-0 opacity-80 group-hover/item:opacity-100 transition-opacity">
                                  {item.icon}
                                </span>
                                <span className="truncate">{item.label}</span>
                              </div>
                              {item.badge && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 mr-1.5 ${
                                    BADGE_COLOR_MAP[item.badgeColor || "indigo"] ||
                                    "bg-indigo-500/10 text-indigo-400"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
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
            <div className="text-center py-10 px-4 text-slate-400 text-xs font-bold flex flex-col items-center gap-2">
              <Search className="w-6 h-6 opacity-30" />
              <span>هیچ صفحه‌ای با «{menuSearchQuery}» پیدا نشد</span>
              <button
                type="button"
                onClick={() => setMenuSearchQuery("")}
                className="mt-2 text-indigo-400 hover:underline text-[11px]"
              >
                پاک کردن جستجو
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHorizontalMenu = () => {
    return (
      <div
        className="hidden md:flex items-center gap-1 px-4 py-2 flex-wrap bg-white sticky top-0 z-40 select-none shadow-xs border-b border-slate-200/80"
        dir="rtl"
      >
        {filteredSidebarGroups.map((group, groupIdx) => {
          const visibleItems = group.items.filter(
            (item) => !user || item.roles.includes(user.role)
          );
          if (visibleItems.length === 0) return null;
          const isActiveGroup = group.items.some((i) => i.id === activeTab);

          return (
            <div key={`hz-group-${group.id}-${groupIdx}`} className="relative group shrink-0">
              <button
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActiveGroup
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 bg-transparent hover:bg-slate-100 hover:text-indigo-600"
                }`}
              >
                <span className={isActiveGroup ? "text-white" : "text-indigo-500"}>
                  {group.icon}
                </span>
                <span>{group.shortLabel || group.label}</span>
                <ChevronDown className="w-3 h-3 opacity-60 group-hover:rotate-180 transition-transform" />
              </button>

              <div className="absolute right-0 top-full pt-1.5 w-64 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col p-2 transform group-hover:translate-y-0 -translate-y-1 transition-transform duration-200">
                  <div className="px-3 py-1.5 text-[10px] font-black tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                    <span>{group.label}</span>
                    <span className="text-[10px] text-slate-400">{visibleItems.length} فرم/صفحه</span>
                  </div>
                  <div className="space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
                    {visibleItems.map((item, itemIdx) => {
                      const isItemActive = activeTab === item.id;
                      return (
                        <button
                          key={`hz-item-${group.id}-${item.id}-${itemIdx}`}
                          type="button"
                          onClick={() => setActiveTab(item.id as any)}
                          className={`text-right w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isItemActive
                              ? "bg-indigo-50 text-indigo-700 font-black border-r-2 border-indigo-600"
                              : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 ${
                                BADGE_COLOR_MAP[item.badgeColor || "indigo"] || ""
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
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
          className={`hidden md:flex flex-col w-64 flex-shrink-0 transition-all duration-300 overflow-hidden print:hidden ${
            isGmailTheme
              ? "bg-[#f6f8fc] border-l border-slate-200"
              : `bg-slate-900 shadow-2xl text-slate-300 z-40 theme-${storeSettings?.theme || "classic"}`
          }`}
          dir="rtl"
        >
          <div
            className={`p-4 flex flex-col justify-center ${
              isGmailTheme ? "border-b border-slate-200/60" : "border-b border-slate-800"
            }`}
          >
            <div className="flex items-center gap-3">
              {storeSettings.logoUrl ? (
                <img
                  src={storeSettings.logoUrl}
                  className="w-9 h-9 rounded-xl object-cover shadow-sm"
                  alt="لوگو"
                />
              ) : (
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-white/20 transform -rotate-45 translate-x-4"></div>
                  <Layers className="w-5 h-5 relative z-10" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1
                  className={`font-black text-base ${
                    isGmailTheme ? "text-slate-800" : "text-white"
                  } flex items-center gap-1.5`}
                >
                  <span className="text-indigo-500 tracking-wider text-lg font-black">تراز</span>
                  <span className="opacity-30 font-normal">|</span>
                  <span className="text-xs truncate font-bold opacity-90 inline-block">
                    {storeSettings.storeName || "سیستم یکپارچه"}
                  </span>
                </h1>
                <div
                  className={`text-[10px] font-mono mt-0.5 ${
                    isGmailTheme ? "text-slate-500" : "text-slate-400"
                  }`}
                  dir="ltr"
                >
                  {localStorage.getItem("localAppVersion") || "ERP Suite v3.0"}
                </div>
              </div>
            </div>
          </div>

          {isGmailTheme && (
            <div className="px-3.5 pt-3 pb-1">
              <button
                type="button"
                onClick={() => setIsComposeOpen(true)}
                className="flex items-center gap-2.5 px-4 py-3 bg-white hover:bg-[#eaeef6] text-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200/80 w-full font-black text-xs text-right justify-center cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#b3261e]" />
                <span className="text-slate-800 font-extrabold">ایجاد سریع سند / تراکنش</span>
              </button>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">{renderSidebarGroups()}</div>

          <div
            className={`p-3 ${
              isGmailTheme ? "border-t border-slate-200/60" : "border-t border-slate-800"
            }`}
          >
            <button
              type="button"
              onClick={signOut}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isGmailTheme
                  ? "text-[#b3261e] hover:bg-rose-50 border border-rose-100"
                  : "text-rose-400 hover:text-white hover:bg-rose-500/20 border border-rose-500/10"
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>خروج از سیستم</span>
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
              className={`relative flex flex-col w-72 max-w-[85vw] h-full shadow-2xl z-[101] overflow-hidden ${
                isGmailTheme
                  ? "bg-[#f6f8fc]"
                  : `bg-slate-900 text-slate-300 theme-${storeSettings?.theme || "classic"}`
              }`}
              dir="rtl"
            >
              <div className="p-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-500 tracking-widest text-lg font-black">تراز</span>
                  <span className="text-xs text-slate-400">
                    | {storeSettings?.storeName || "سیستم یکپارچه"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{renderSidebarGroups()}</div>
              <div className="p-3 border-t border-slate-800">
                <button
                  type="button"
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
