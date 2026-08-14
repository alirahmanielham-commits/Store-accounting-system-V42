import { useState, useEffect, useCallback } from 'react';
import { 
  getCheckbooks, addCheckbook, updateCheckbook, deleteCheckbook, 
  getIssuedChecks, addIssuedCheck, updateIssuedCheck, deleteIssuedCheck, 
  getReceivedChecks, addReceivedCheck, updateReceivedCheck, deleteReceivedCheck, getCheckAuditLogs, 
  getAccounts, getPersons, addTransaction, getTransactions, deleteTransaction
} from '../../../services/dataService';
import { Checkbook, IssuedCheck, ReceivedCheck, Account, Person } from '../../../types';

export function useChecks(onDataChange?: () => void) {
  const [checkbooks, setCheckbooks] = useState<Checkbook[]>([]);
  const [issuedChecks, setIssuedChecks] = useState<IssuedCheck[]>([]);
  const [receivedChecks, setReceivedChecks] = useState<ReceivedCheck[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);

  const fetchData = useCallback(async () => {
    if (onDataChange) onDataChange();
    const [_checkbooks, _issued, _received, _accounts, _persons] = await Promise.all([
      getCheckbooks(),
      getIssuedChecks(),
      getReceivedChecks(),
      getAccounts(),
      getPersons()
    ]);
    setCheckbooks(_checkbooks);
    setIssuedChecks(_issued);
    setReceivedChecks(_received);
    setAccounts(_accounts);
    setPersons(_persons);
  }, [onDataChange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rollbackCashedTransaction = async (checkNumber: string, personId: string, type: 'issued' | 'receive' | 'received') => {
    try {
      const allTx = await getTransactions();
      const txType = type === 'issued' ? 'pay' : 'receive';
      const toDelete = allTx.find(tx => tx.type === txType && tx.personId === personId && tx.receiptNumber === checkNumber && tx.description && tx.description.includes(checkNumber));
      if (toDelete) {
        await deleteTransaction(toDelete.id);
      }
    } catch (err) { console.error('Error rolling back check transaction', err); }
  };
  
  const rollbackCreationTransaction = async (checkNumber: string, personId: string, type: 'issued' | 'receive' | 'received') => {
    try {
      const allTx = await getTransactions();
      const txType = type === 'issued' ? 'pay' : 'receive';
      const toDelete = allTx.find(tx => tx.type === txType && tx.personId === personId && tx.method === 'check' && tx.checkNumber === checkNumber);
      if (toDelete) {
        await deleteTransaction(toDelete.id);
      }
    } catch (err) { console.error('Error rolling back creation transaction', err); }
  };

  const deleteIssuedCheckHandler = async (id: string | number) => {
    const existing = issuedChecks.find(c => c.id === id);
    if (existing) {
      if (existing.status === 'cashed') {
        await rollbackCashedTransaction(existing.checkNumber, existing.payeeId?.toString() || "", 'issued');
      }
      await rollbackCreationTransaction(existing.checkNumber, existing.payeeId?.toString() || "", 'issued');
    }
    await deleteIssuedCheck(id.toString());
    await fetchData();
  };

  const deleteReceivedCheckHandler = async (id: string | number) => {
    const existing = receivedChecks.find(c => c.id === id);
    if (existing) {
      if (existing.status === 'cashed') {
        await rollbackCashedTransaction(existing.checkNumber, existing.payerId?.toString() || "", 'received');
      }
      await rollbackCreationTransaction(existing.checkNumber, existing.payerId?.toString() || "", 'received');
    }
    await deleteReceivedCheck(id.toString());
    await fetchData();
  };

  return {
    checkbooks, setCheckbooks,
    issuedChecks,
    receivedChecks,
    accounts,
    persons,
    fetchData,
    rollbackCashedTransaction,
    rollbackCreationTransaction,
    deleteIssuedCheckHandler,
    deleteReceivedCheckHandler,
  };
}
