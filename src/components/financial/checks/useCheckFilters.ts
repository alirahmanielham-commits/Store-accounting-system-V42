import { useState, useMemo } from 'react';
import { IssuedCheck, ReceivedCheck, Person, Account, Checkbook } from '../../../types';
import { CheckFilters } from './types';

// Helper functions that were inside the component
const normalizeDate = (dStr: string) => {
  if (!dStr) return 0;
  if (dStr.includes('T')) {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  const englishDStr = dStr.replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
  const parts = englishDStr.split(/[/-]/).map(p => p.padStart(2, '0'));
  if (parts.length === 3) return parseInt(parts[0] + parts[1] + parts[2], 10);
  return 0;
};

export function useCheckFilters(
  issuedChecks: IssuedCheck[],
  receivedChecks: ReceivedCheck[],
  persons: Person[],
  accounts: Account[],
  checkbooks: Checkbook[]
) {
  const [issuedSearchQuery, setIssuedSearchQuery] = useState('');
  const [receivedSearchQuery, setReceivedSearchQuery] = useState('');
  
  const [issuedSortBy, setIssuedSortBy] = useState<'date' | 'amount'>('date');
  const [issuedSortDir, setIssuedSortDir] = useState<'asc' | 'desc'>('asc');
  
  const [receivedSortBy, setReceivedSortBy] = useState<'date' | 'amount'>('date');
  const [receivedSortDir, setReceivedSortDir] = useState<'asc' | 'desc'>('asc');

  const [issuedCheckStatusFilter, setIssuedCheckStatusFilter] = useState<string>('all');
  const [issuedCheckbookFilter, setIssuedCheckbookFilter] = useState<string>('all');
  const [receivedCheckStatusFilter, setReceivedCheckStatusFilter] = useState<string>('all');

  const filteredIssuedChecks = useMemo(() => {
    return (issuedChecks || []).filter(c => {
      if (!c.payeeId && (!c.amount || Number(c.amount) === 0) && !c.description) {
        return false; // Hide blank checks
      }
      const payeeName = String(persons.find(p => p.id?.toString() === c.payeeId?.toString())?.name || c.payeeId || '');
      const query = issuedSearchQuery.toLowerCase();
      const checkbook = checkbooks.find(cb => cb.id?.toString() === c.checkbookId?.toString());
      const account = accounts.find(a => a.id?.toString() === checkbook?.accountId?.toString());
      const bankName = account ? account.bankName : '';
      
      const searchMatch = (
        String(c.checkNumber || '').toLowerCase().includes(query) ||
        payeeName.toLowerCase().includes(query) ||
        (c.description || '').toLowerCase().includes(query) ||
        String(c.amount || '').includes(query) ||
        String(c.dueDate || '').includes(query) ||
        String(bankName || '').toLowerCase().includes(query)
      );
      const statusMatch = issuedCheckStatusFilter === 'all' || c.status === issuedCheckStatusFilter;
      const checkbookMatch = issuedCheckbookFilter === 'all' || c.checkbookId?.toString() === issuedCheckbookFilter;
      
      return searchMatch && statusMatch && checkbookMatch;
    }).sort((a, b) => {
      let diff = 0;
      if (issuedSortBy === 'date') diff = normalizeDate(a.dueDate) - normalizeDate(b.dueDate);
      else diff = Number(a.amount) - Number(b.amount);
      return issuedSortDir === 'asc' ? diff : -diff;
    });
  }, [issuedChecks, persons, checkbooks, accounts, issuedSearchQuery, issuedCheckStatusFilter, issuedCheckbookFilter, issuedSortBy, issuedSortDir]);

  const filteredReceivedChecks = useMemo(() => {
    return (receivedChecks || []).filter(c => {
      const payerName = String(persons.find(p => p.id?.toString() === c.payerId?.toString())?.name || c.payerId || '');
      const query = receivedSearchQuery.toLowerCase();
      const searchMatch = (
        String(c.checkNumber || '').toLowerCase().includes(query) ||
        payerName.toLowerCase().includes(query) ||
        String(c.bankName || '').toLowerCase().includes(query) ||
        (c.description || '').toLowerCase().includes(query) ||
        String(c.amount || '').includes(query) ||
        String(c.dueDate || '').includes(query)
      );
      const statusMatch = receivedCheckStatusFilter === 'all' || c.status === receivedCheckStatusFilter;
      
      return searchMatch && statusMatch;
    }).sort((a, b) => {
      let diff = 0;
      if (receivedSortBy === 'date') diff = normalizeDate(a.dueDate) - normalizeDate(b.dueDate);
      else diff = Number(a.amount) - Number(b.amount);
      return receivedSortDir === 'asc' ? diff : -diff;
    });
  }, [receivedChecks, persons, receivedSearchQuery, receivedCheckStatusFilter, receivedSortBy, receivedSortDir]);

  return {
    issuedSearchQuery, setIssuedSearchQuery,
    receivedSearchQuery, setReceivedSearchQuery,
    issuedSortBy, setIssuedSortBy,
    issuedSortDir, setIssuedSortDir,
    receivedSortBy, setReceivedSortBy,
    receivedSortDir, setReceivedSortDir,
    issuedCheckStatusFilter, setIssuedCheckStatusFilter,
    issuedCheckbookFilter, setIssuedCheckbookFilter,
    receivedCheckStatusFilter, setReceivedCheckStatusFilter,
    filteredIssuedChecks,
    filteredReceivedChecks
  };
}
