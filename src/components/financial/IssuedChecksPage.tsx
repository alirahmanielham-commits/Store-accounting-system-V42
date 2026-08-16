import { formatDateDisplay } from '../../utils/format';
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { getIssuedChecks, getPersons, getCheckbooks, getAccounts, getStoreSettings } from "../../services/dataService";
import { IssuedChecksList } from "./checks/IssuedChecksList";
import { Search, Filter, BookOpen } from "lucide-react";

export default function IssuedChecksPage({ showNotification, currentUser, setViewingCheck, onDataChange, onEditReceiptByCheck }: any) {
  const [issuedChecks, setIssuedChecks] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [checkbooks, setCheckbooks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  
  // Filters
  const [issuedSearchQuery, setIssuedSearchQuery] = useState("");
  const [issuedCheckStatusFilter, setIssuedCheckStatusFilter] = useState("all");
  const [issuedCheckbookFilter, setIssuedCheckbookFilter] = useState("all");
  const [issuedSortBy, setIssuedSortBy] = useState("dueDate");
  const [issuedSortDir, setIssuedSortDir] = useState<"asc"|"desc">("asc");
  const [issuedPage, setIssuedPage] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ic, ps, cb, acc, set] = await Promise.all([
        getIssuedChecks(),
        getPersons(),
        getCheckbooks(),
        getAccounts(),
        getStoreSettings()
      ]);
      setIssuedChecks(ic || []);
      setPersons(ps || []);
      setCheckbooks(cb || []);
      setAccounts(acc || []);
      setStoreSettings(set || null);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredIssuedChecks = useMemo(() => {
    let result = [...issuedChecks];
    if (issuedSearchQuery) {
      const q = issuedSearchQuery.toLowerCase();
      result = result.filter(c => 
        c.checkNumber?.toLowerCase().includes(q) || 
        c.sayadId?.toLowerCase().includes(q) || 
        String(c.amount).includes(q) ||
        (c.payeeName && c.payeeName.toLowerCase().includes(q))
      );
    }
    if (issuedCheckStatusFilter !== 'all') {
      result = result.filter(c => c.status === issuedCheckStatusFilter);
    }
    if (issuedCheckbookFilter !== 'all') {
      result = result.filter(c => c.checkbookId === issuedCheckbookFilter);
    }
    result.sort((a, b) => {
      let valA = a[issuedSortBy];
      let valB = b[issuedSortBy];
      if (issuedSortBy === 'dueDate' || issuedSortBy === 'issueDate') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      }
      if (valA < valB) return issuedSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return issuedSortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [issuedChecks, issuedSearchQuery, issuedCheckStatusFilter, issuedCheckbookFilter, issuedSortBy, issuedSortDir]);

  const totalIssuedAmount = useMemo(() => issuedChecks.reduce((sum, c) => sum + Number(c.amount || 0), 0), [issuedChecks]);
  const cashedIssuedAmount = useMemo(() => issuedChecks.filter(c => c.status === 'cashed').reduce((sum, c) => sum + Number(c.amount || 0), 0), [issuedChecks]);
  const pendingIssuedAmount = useMemo(() => issuedChecks.filter(c => ['issued', 'delivered', 'in_clearing'].includes(c.status)).reduce((sum, c) => sum + Number(c.amount || 0), 0), [issuedChecks]);
  const bouncedIssuedAmount = useMemo(() => issuedChecks.filter(c => c.status === 'bounced').reduce((sum, c) => sum + Number(c.amount || 0), 0), [issuedChecks]);

  // Pagination logic if required by IssuedChecksList
  const ITEMS_PER_PAGE = 20;
  const totalIssuedPages = Math.ceil(filteredIssuedChecks.length / ITEMS_PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 h-full overflow-y-auto bg-slate-50" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight font-display">
            لیست چک‌های پرداختی
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            مدیریت، جستجو و فیلتر کامل تمامی چک‌های صادر شده
          </p>
        </div>
      </div>
      
      <IssuedChecksList
        showNotification={showNotification}
        onEditReceiptByCheck={onEditReceiptByCheck}
        issuedChecks={issuedChecks}
        persons={persons}
        checkbooks={checkbooks}
        accounts={accounts}
        storeSettings={storeSettings}
        issuedSearchQuery={issuedSearchQuery} setIssuedSearchQuery={setIssuedSearchQuery}
        issuedCheckStatusFilter={issuedCheckStatusFilter} setIssuedCheckStatusFilter={setIssuedCheckStatusFilter}
        issuedCheckbookFilter={issuedCheckbookFilter} setIssuedCheckbookFilter={setIssuedCheckbookFilter}
        issuedSortBy={issuedSortBy} setIssuedSortBy={setIssuedSortBy}
        issuedSortDir={issuedSortDir} setIssuedSortDir={setIssuedSortDir}
        filteredIssuedChecks={filteredIssuedChecks}
        totalIssuedAmount={totalIssuedAmount}
        cashedIssuedAmount={cashedIssuedAmount}
        pendingIssuedAmount={pendingIssuedAmount}
        bouncedIssuedAmount={bouncedIssuedAmount}
        setViewingCheck={setViewingCheck}
        setUpdatingCheckId={() => {}} // Might need mock or actual modal
        setUpdatingCheckType={() => {}}
        setStatusVal={() => {}}
        setIsStatusModalOpen={() => {}}
        setIsHistoryModalOpen={() => {}}
        setHistoryCheck={() => {}}
        setHistoryData={() => {}}
        handleDeleteIssuedCheck={() => {}}
        formatDateDisplay={formatDateDisplay}
        sendNotification={() => {}}
        getCheckAuditLogs={async () => []}
        issuedPage={issuedPage}
        setIssuedPage={setIssuedPage}
        totalIssuedPages={totalIssuedPages}
      />
    </motion.div>
  );
}
