import { useState, useCallback, useEffect } from 'react';
import { getAccounts, getCashboxes, getTransactions, addTransaction } from '../services/dataService';

export type ReceiptPaymentType = 'receive' | 'pay';
export type PaymentResourceType = 'bank' | 'cashbox' | 'check' | 'pos';

export function useReceiptPayment() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cashboxes, setCashboxes] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [type, setType] = useState<ReceiptPaymentType>('receive');
  const [personId, setPersonId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [resourceType, setResourceType] = useState<PaymentResourceType>('bank');
  const [resourceId, setResourceId] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accs, boxes, txs] = await Promise.all([
        getAccounts(),
        getCashboxes(),
        getTransactions()
      ]);
      setAccounts(accs || []);
      setCashboxes(boxes || []);
      setTransactions(txs || []);
    } catch (err) {
      console.error('Error fetching financial resources:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const resetForm = useCallback(() => {
    setPersonId('');
    setAmount(0);
    setTrackingNumber('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  const submitReceiptOrPayment = useCallback(
    async (extraData?: Record<string, any>) => {
      if (!personId) {
        throw new Error('انتخاب طرف حساب الزامی است.');
      }
      if (amount <= 0) {
        throw new Error('مبلغ باید بزرگتر از صفر باشد.');
      }
      if (!resourceId) {
        throw new Error('انتخاب حساب بانکی یا صندوق الزامی است.');
      }

      setIsLoading(true);
      try {
        const payload = {
          type,
          personId,
          amount,
          date,
          resourceType,
          resourceId,
          trackingNumber,
          description,
          ...extraData
        };

        const result = await addTransaction(payload);
        resetForm();
        await fetchResources();
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [personId, amount, resourceId, type, date, resourceType, trackingNumber, description, resetForm, fetchResources]
  );

  return {
    accounts,
    cashboxes,
    transactions,
    isLoading,
    type,
    setType,
    personId,
    setPersonId,
    amount,
    setAmount,
    date,
    setDate,
    resourceType,
    setResourceType,
    resourceId,
    setResourceId,
    trackingNumber,
    setTrackingNumber,
    description,
    setDescription,
    resetForm,
    submitReceiptOrPayment,
    refreshResources: fetchResources
  };
}
