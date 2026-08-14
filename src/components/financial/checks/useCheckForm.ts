import { useState } from 'react';
import { addIssuedCheck, updateIssuedCheck, addReceivedCheck, updateReceivedCheck, addCheckAuditLog, addTransaction } from '../../../services/dataService';
import { IssuedCheck, ReceivedCheck } from '../../../types';

export function useCheckForm(
  issuedChecks: IssuedCheck[],
  receivedChecks: ReceivedCheck[],
  fetchData: () => Promise<void>,
  notify: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void,
  currentUser: string,
  rollbackCashedTransaction: any,
  storeSettings?: any
) {
  const [isIssuedModalOpen, setIsIssuedModalOpen] = useState(false);
  const [isReceivedModalOpen, setIsReceivedModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  
  const [editingIssuedCheckId, setEditingIssuedCheckId] = useState<string|number|null>(null);
  const [editingReceivedCheckId, setEditingReceivedCheckId] = useState<string|number|null>(null);

  // Issued Check form state
  const [icCheckbookId, setIcCheckbookId] = useState('');
  const [icCheckNumber, setIcCheckNumber] = useState('');
  const [icSayadId, setIcSayadId] = useState('');
  const [icReason, setIcReason] = useState('خرید کالا');
  const [icPayeeId, setIcPayeeId] = useState('');
  const [icAmount, setIcAmount] = useState('');
  const [icIssueDate, setIcIssueDate] = useState('');
  const [icDueDate, setIcDueDate] = useState('');
  const [icDescription, setIcDescription] = useState('');
  const [icAttachments, setIcAttachments] = useState<string[]>([]);

  // Received Check form state
  const [rcPayerId, setRcPayerId] = useState('');
  const [rcBankName, setRcBankName] = useState('');
  const [rcBranchName, setRcBranchName] = useState('');
  const [rcCheckNumber, setRcCheckNumber] = useState('');
  const [rcSayadId, setRcSayadId] = useState('');
  const [rcReason, setRcReason] = useState('تسویه بدهی');
  const [rcAmount, setRcAmount] = useState('');
  const [rcReceiveDate, setRcReceiveDate] = useState('');
  const [rcDueDate, setRcDueDate] = useState('');
  const [rcDescription, setRcDescription] = useState('');
  const [rcAttachments, setRcAttachments] = useState<string[]>([]);

  // Status adjustment form state
  const [updatingCheckType, setUpdatingCheckType] = useState<'issued' | 'received'>('issued');
  const [updatingCheckId, setUpdatingCheckId] = useState<string|number|null>(null);
  const [statusVal, setStatusVal] = useState('');
  const [statusDesc, setStatusDesc] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [assignedVendorId, setAssignedVendorId] = useState('');

  const currentCheckForStatus = updatingCheckType === 'issued' ? issuedChecks.find(c => c.id === updatingCheckId) : receivedChecks.find(c => c.id === updatingCheckId);
  const currentActualStatus = currentCheckForStatus?.status || (updatingCheckType === 'issued' ? 'issued' : 'received');

  const getValidTransitions = (type: 'issued' | 'received', currentStatus: string) => {
    if (type === 'issued') {
      switch(currentStatus) {
        case 'blank': return ['issued', 'cancelled'];
        case 'issued': return ['cashed', 'bounced', 'cancelled'];
        case 'cashed': return ['issued']; // Allow rollback to issued
        case 'bounced': return ['cancelled', 'issued']; // Allow rollback
        case 'cancelled': return ['issued']; // Allow rollback
        default: return [];
      }
    } else {
      switch(currentStatus) {
        case 'received': return ['deposited', 'assigned', 'returned'];
        case 'deposited': return ['cashed', 'bounced', 'received'];
        case 'cashed': return ['deposited']; // Allow rollback to deposited
        case 'assigned': return ['bounced_assigned', 'received']; // Allow rollback to received
        case 'bounced_assigned': return ['returned', 'assigned']; // Allow rollback to assigned
        case 'bounced': return ['returned', 'deposited'];
        case 'returned': return ['received', 'bounced']; // Allow rollback
        default: return [];
      }
    }
  };
  const validTransitions = getValidTransitions(updatingCheckType, currentActualStatus);

  const resetIssuedForm = () => {
    setIcSayadId('');
    setIcReason('خرید کالا');
    setEditingIssuedCheckId(null);
    setIcCheckbookId('');
    setIcCheckNumber('');
    setIcPayeeId('');
    setIcAmount('');
    setIcIssueDate('');
    setIcDueDate('');
    setIcDescription('');
    setIcAttachments([]);
  };

  const handleIssueCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icCheckNumber || !icAmount || !icPayeeId || !icDueDate) {
      notify('لطفاً اطلاعات ضروری را وارد کنید', 'error');
      return;
    }

    const payload = {
      checkbookId: icCheckbookId || '',
        sayadId: icSayadId,
        reason: icReason,
      checkNumber: icCheckNumber,
      amount: Number(icAmount),
      payeeId: icPayeeId,
      issueDate: icIssueDate || new Date().toISOString(),
      dueDate: icDueDate,
      status: 'issued', // Default
      description: icDescription,
      attachments: icAttachments
    };

    try {
      const blankCheck = issuedChecks.find(c => c.status === 'blank' && c.checkbookId?.toString() === payload.checkbookId?.toString() && c.checkNumber === payload.checkNumber);
      if (blankCheck && !editingIssuedCheckId) {
         await updateIssuedCheck(blankCheck.id.toString(), { ...blankCheck, ...payload, status: 'issued' } as any);
      } else if (editingIssuedCheckId) {
        const existing = issuedChecks.find(c => c.id === editingIssuedCheckId);
        if (existing) {
          await updateIssuedCheck(editingIssuedCheckId.toString(), { ...existing, ...payload, status: existing.status || 'issued' } as any);
        }
      } else {
        await addIssuedCheck(payload);
      }
      
      setIsIssuedModalOpen(false);
      resetIssuedForm();
      await fetchData();
    } catch (err: any) {
      notify(err.message || 'خطا در ثبت چک', 'error');
    }
  };

  const resetReceivedForm = () => {
    setRcSayadId('');
    setRcReason('تسویه بدهی');
    setEditingReceivedCheckId(null);
    setRcPayerId('');
    setRcBankName('');
    setRcBranchName('');
    setRcCheckNumber('');
    setRcAmount('');
    setRcReceiveDate('');
    setRcDueDate('');
    setRcDescription('');
    setRcAttachments([]);
  };

  const handleReceiveCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rcCheckNumber || !rcAmount || !rcPayerId || !rcBankName || !rcDueDate) {
      notify('لطفاً اطلاعات ضروری را وارد کنید', 'error');
      return;
    }

    const payload = {
      checkNumber: rcCheckNumber,
        sayadId: rcSayadId,
        reason: rcReason,
      bankName: rcBankName,
      branchName: rcBranchName,
      amount: Number(rcAmount),
      payerId: rcPayerId,
      receiveDate: rcReceiveDate || new Date().toISOString(),
      dueDate: rcDueDate,
      status: 'received', 
      description: rcDescription,
      attachments: rcAttachments
    };

    try {
      if (editingReceivedCheckId) {
        const existing = receivedChecks.find(c => c.id === editingReceivedCheckId);
        if (existing) {
           await updateReceivedCheck(editingReceivedCheckId.toString(), { ...existing, ...payload, status: existing.status || 'received' } as any);
        }
      } else {
        await addReceivedCheck(payload);
      }
      
      setIsReceivedModalOpen(false);
      resetReceivedForm();
      await fetchData();
    } catch (err: any) {
      notify(err.message || 'خطا در ثبت چک', 'error');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingCheckId) return;

    if (updatingCheckType === 'issued') {
      const existing = issuedChecks.find(c => c.id === updatingCheckId);
      if (existing) {
        const wasAlreadyCashed = existing.status === 'cashed';
        
        if (statusVal === 'cashed' && !wasAlreadyCashed && !depositAccountId) {
          notify('لطفاً بانک مبدا جهت کسر وجه چک را انتخاب کنید', 'error');
          return;
        }

        await addCheckAuditLog({ checkId: existing.id, checkType: 'issued', action: 'status_change', oldValues: { status: existing.status }, newValues: { status: statusVal }, userId: currentUser });
        try {
          await updateIssuedCheck(updatingCheckId.toString(), { ...existing, status: statusVal as any, bankAccountId: statusVal === 'cashed' ? depositAccountId : existing.bankAccountId });
        } catch(err: any) {
          notify(err.message || 'خطا در تغییر وضعیت چک', 'error');
          return;
        }

        if (statusVal === 'cashed' && !wasAlreadyCashed) {
          if (depositAccountId) {
            await addTransaction({
              type: 'pay',
              resourceType: 'bank',
              resourceId: depositAccountId,
              amount: existing.amount,
              isCheckCashing: true,
              personId: existing.payeeId,
              date: new Date().toISOString(),
              method: 'check',
              receiptNumber: existing.checkNumber,
              description: `تسویه و پاس شدن برگه چک صادره شماره ${existing.checkNumber} به ذینفع`
            });
            notify(`چک شماره ${existing.checkNumber} با موفقیت پاس شد و مبلغ ${Number(existing.amount).toLocaleString()} ${storeSettings?.currency || 'تومان'} از حساب بانک کسر و در معین شخص ثبت گردید.`, 'success');
          } else {
            notify(`چک شماره ${existing.checkNumber} پاس شد، اما به دلیل عدم یافتن بانک مرجع، سند کاهنده خودکار درج نگردید.`, 'warning');
          }
        } else if (wasAlreadyCashed && statusVal !== 'cashed') {
          await rollbackCashedTransaction(existing.checkNumber, existing.payeeId, 'issued');
          notify(`وضعیت چک صادره به ${statusVal} تغییر یافت و سند پرداختی متصل به آن حذف گردید.`, 'info');
        } else {
          notify(`وضعیت چک صادره با موفقیت تغییر یافت.`, 'info');
        }
      }
    } else {
      const existing = receivedChecks.find(c => c.id === updatingCheckId);
      if (existing) {
        const wasAlreadyCashed = existing.status === 'cashed';
        
        if ((statusVal === 'cashed' || statusVal === 'deposited') && !wasAlreadyCashed && !depositAccountId) {
          notify('لطفاً بانک مقصد جهت واریز وجه چک را انتخاب کنید', 'error');
          return;
        }

        await addCheckAuditLog({ checkId: existing.id, checkType: 'received', action: 'status_change', oldValues: { status: existing.status }, newValues: { status: statusVal }, userId: currentUser });
        try {
          await updateReceivedCheck(updatingCheckId.toString(), { ...existing, status: statusVal as any, assignedToId: statusVal === 'assigned' ? assignedVendorId : existing.assignedToId, accountId: statusVal === 'cashed' || statusVal === 'deposited' ? depositAccountId : existing.accountId });
        } catch(err: any) {
          notify(err.message || 'خطا در تغییر وضعیت چک', 'error');
          return;
        }

        if (statusVal === 'cashed' && !wasAlreadyCashed) {
          await addTransaction({
            type: 'receive',
            resourceType: 'bank',
            resourceId: depositAccountId,
            amount: existing.amount,
            isCheckCashing: true,
            personId: existing.payerId,
            date: new Date().toISOString(),
            method: 'check',
            receiptNumber: existing.checkNumber,
            description: `وصول و نقد شدن چک دریافتی شماره ${existing.checkNumber} - بانک ${existing.bankName || ''}`
          });
          notify(`چک شماره ${existing.checkNumber} وصول گردید. مبلغ ${Number(existing.amount).toLocaleString()} ${storeSettings?.currency || 'تومان'} به حساب بانک واریز و اسناد دریافتنی بستانکار شد.`, 'success');
        } else if (statusVal === 'returned') {
          notify(`چک عودت داده شد و حساب شخص بدهکار گردید.`, 'success');
        } else if (statusVal === 'assigned' && assignedVendorId) {
          notify(`چک خرج شد و حساب شخص (فروشنده) بدهکار گردید.`, 'success');
        } else if (statusVal === 'bounced_assigned') {
          notify(`چک خرج شده برگشت خورد. اسناد دریافتنی بدهکار و فروشنده بستانکار گردید.`, 'warning');
        } else if (wasAlreadyCashed && statusVal !== 'cashed') {
          await rollbackCashedTransaction(existing.checkNumber, existing.payerId, 'receive');
          notify(`وضعیت چک دریافتی به ${statusVal} تغییر یافت و تراکنش بانکی متصل به آن حذف گردید.`, 'info');
        } else {
          notify(`وضعیت چک با موفقیت به ${statusVal} تغییر یافت.`, 'info');
        }
      }
    }
    setIsStatusModalOpen(false);
    await fetchData();
  };

  return {
    isIssuedModalOpen, setIsIssuedModalOpen,
    isReceivedModalOpen, setIsReceivedModalOpen,
    isStatusModalOpen, setIsStatusModalOpen,
    editingIssuedCheckId, setEditingIssuedCheckId,
    editingReceivedCheckId, setEditingReceivedCheckId,
    icCheckbookId, setIcCheckbookId,
    icCheckNumber, setIcCheckNumber,
    icSayadId, setIcSayadId,
    icReason, setIcReason,
    icPayeeId, setIcPayeeId,
    icAmount, setIcAmount,
    icIssueDate, setIcIssueDate,
    icDueDate, setIcDueDate,
    icDescription, setIcDescription,
    icAttachments, setIcAttachments,
    rcPayerId, setRcPayerId,
    rcBankName, setRcBankName,
    rcBranchName, setRcBranchName,
    rcCheckNumber, setRcCheckNumber,
    rcSayadId, setRcSayadId,
    rcReason, setRcReason,
    rcAmount, setRcAmount,
    rcReceiveDate, setRcReceiveDate,
    rcDueDate, setRcDueDate,
    rcDescription, setRcDescription,
    rcAttachments, setRcAttachments,
    updatingCheckType, setUpdatingCheckType,
    updatingCheckId, setUpdatingCheckId,
    statusVal, setStatusVal,
    statusDesc, setStatusDesc,
    depositAccountId, setDepositAccountId,
    assignedVendorId, setAssignedVendorId,
    currentCheckForStatus,
    currentActualStatus,
    validTransitions,
    handleIssueCheckSubmit,
    handleReceiveCheckSubmit,
    handleUpdateStatus,
    resetIssuedForm,
    resetReceivedForm
  };
}
