import { useState, useCallback, useEffect } from 'react';
import {
  getLedgerAccounts,
  getAccountingDocuments,
  addAccountingDocument,
  updateAccountingDocument,
  checkFinancialYear
} from '../services/accountingService';

export interface AccountingVoucherItem {
  id?: string;
  ledgerAccountId: string;
  detailedAccountId?: string;
  debit: number;
  credit: number;
  description: string;
}

/**
 * Pure validation helper for Double-Entry Accounting balance
 */
export function validateVoucherBalance(items: AccountingVoucherItem[]) {
  if (!items || items.length < 2) {
    return { valid: false, error: 'سند حسابداری باید حداقل شامل دو آرتیکل باشد.' };
  }
  const totalDebit = items.reduce((sum, it) => sum + (Number(it.debit) || 0), 0);
  const totalCredit = items.reduce((sum, it) => sum + (Number(it.credit) || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return {
      valid: false,
      totalDebit,
      totalCredit,
      difference: Math.abs(totalDebit - totalCredit),
      error: `سند حسابداری تراز نیست. جمع بدهکار (${totalDebit.toLocaleString()}) با جمع بستانکار (${totalCredit.toLocaleString()}) مغایرت دارد.`
    };
  }

  return { valid: true, totalDebit, totalCredit };
}

export function useLedgerAccounts() {
  const [ledgerAccounts, setLedgerAccounts] = useState<any[]>([]);
  const [accountingDocuments, setAccountingDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeFiscalYear, setActiveFiscalYear] = useState<any>(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const accounts = await getLedgerAccounts();
      setLedgerAccounts(accounts || []);
    } catch (err) {
      console.error('Error fetching ledger accounts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await getAccountingDocuments();
      setAccountingDocuments(docs || []);
    } catch (err) {
      console.error('Error fetching accounting documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchDocuments();
  }, [fetchAccounts, fetchDocuments]);

  // Double-entry validation helper
  const validateVoucherBalance = useCallback((items: AccountingVoucherItem[]) => {
    if (!items || items.length < 2) {
      return { valid: false, error: 'سند حسابداری باید حداقل شامل دو آرتیکل باشد.' };
    }
    const totalDebit = items.reduce((sum, it) => sum + (Number(it.debit) || 0), 0);
    const totalCredit = items.reduce((sum, it) => sum + (Number(it.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return {
        valid: false,
        totalDebit,
        totalCredit,
        difference: Math.abs(totalDebit - totalCredit),
        error: `سند حسابداری تراز نیست. جمع بدهکار (${totalDebit.toLocaleString()}) با جمع بستانکار (${totalCredit.toLocaleString()}) مغایرت دارد.`
      };
    }

    return { valid: true, totalDebit, totalCredit };
  }, []);

  const submitVoucher = useCallback(
    async (voucherData: {
      date: string;
      description: string;
      items: AccountingVoucherItem[];
      sourceType?: string;
      sourceId?: string;
    }) => {
      const validation = validateVoucherBalance(voucherData.items);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const created = await addAccountingDocument(voucherData);
      await fetchDocuments();
      return created;
    },
    [validateVoucherBalance, fetchDocuments]
  );

  return {
    ledgerAccounts,
    accountingDocuments,
    isLoading,
    activeFiscalYear,
    fetchAccounts,
    fetchDocuments,
    validateVoucherBalance,
    submitVoucher
  };
}
