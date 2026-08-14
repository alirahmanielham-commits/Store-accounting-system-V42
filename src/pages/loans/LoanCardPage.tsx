import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLoans, getInstallments } from '../../services/accountingService';
import { getPersons } from '../../services/personService';
import { Loan, Installment } from '../../types';
import LoanDetailsView from '../../components/loans/LoanDetailsView';
import { applyTransition } from '../../services/loanStateMachine';
import { addSystemLog, saveLoans } from '../../services/dataService';
import BeautifulLoading from '../../components/BeautifulLoading';
import LoanTransitionModal from '../../components/loans/LoanTransitionModal';
import InstallmentBookletPrint from '../../components/loans/InstallmentBookletPrint';

export default function LoanCardPage(props: any) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transitionState, setTransitionState] = useState<{ isOpen: boolean, targetStatus: string }>({ isOpen: false, targetStatus: '' });
  const [printingLoanId, setPrintingLoanId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const ls = await getLoans();
    const insts = await getInstallments();
    const ps = await getPersons();
    setLoan(ls.find((l: Loan) => String(l.id) === String(id)) || null);
    setInstallments(insts);
    setPersons(ps);
    setLoading(false);
  };

  const handleUpdateLoanStatus = async (loanId: string | number, newStatus: string) => {
    setTransitionState({ isOpen: true, targetStatus: newStatus });
  };

  const handleDeleteLoan = async (loanId: string | number) => {
    if (window.confirm('آیا از حذف این وام اطمینان دارید؟')) {
      const ls = await getLoans();
      await saveLoans(ls.filter((l: Loan) => String(l.id) !== String(loanId)));
      await addSystemLog('DELETE_LOAN', `حذف وام ${loanId}`, 'Loan', loanId);
      navigate('/loans_list');
    }
  };

  if (loading) return <BeautifulLoading text="در حال دریافت اطلاعات وام..." />;
  if (!loan) return <div className="p-8 text-center text-gray-500 font-bold">پرونده وام یافت نشد.</div>;

  const LOAN_STATUS_LABELS: Record<string, string> = {
    'requested': 'درخواست شده',
    'incomplete': 'نقص مدارک',
    'completed_dossier': 'تکمیل پرونده',
    'approved': 'تایید شده',
    'active': 'فعال (در حال پرداخت)',
    'completed': 'تسویه شده',
    'overdue': 'معوق'
  };

  const LOAN_STATUS_COLORS: Record<string, string> = {
    'requested': 'bg-blue-100 text-blue-800',
    'incomplete': 'bg-orange-100 text-orange-800',
    'completed_dossier': 'bg-purple-100 text-purple-800',
    'approved': 'bg-emerald-100 text-emerald-800',
    'active': 'bg-indigo-100 text-indigo-800',
    'completed': 'bg-gray-100 text-gray-800',
    'overdue': 'bg-red-100 text-red-800'
  };

  return (
    <div className="h-full w-full bg-slate-50/50 p-4 md:p-6 overflow-y-auto">
       
       <LoanDetailsView
          isOpen={true}
          onClose={() => navigate('/loans_list')}
          loan={loan}
          installments={installments}
          formatCurrency={props.formatCurrency || ((v: number) => Number(v).toLocaleString())}
          storeSettings={props.storeSettings}
          getPersonName={(personId) => {
            const p = persons.find(x => String(x.id) === String(personId));
            return p ? (p.name || p.alias || 'نامشخص') : 'نامشخص';
          }}
          userRole={props.userRole || 'admin'}
          handleUpdateLoanStatus={handleUpdateLoanStatus}
          handleDeleteLoan={handleDeleteLoan}
          setPrintingLoanId={setPrintingLoanId}
          onPayInstallment={(loanId) => {
             navigate(`/loans_payment?loanId=${loanId}`);
          }}
          LOAN_STATUS_LABELS={LOAN_STATUS_LABELS}
          LOAN_STATUS_COLORS={LOAN_STATUS_COLORS}
       />

       {transitionState.isOpen && loan && (
        <LoanTransitionModal
          isOpen={transitionState.isOpen}
          onClose={() => setTransitionState({ isOpen: false, targetStatus: '' })}
          loan={loan}
          targetStatus={transitionState.targetStatus as any}
          userRole={props.userRole || 'admin'}
          LOAN_STATUS_LABELS={LOAN_STATUS_LABELS}
          showNotification={props.showNotification || (() => {})}
          onSuccess={(updatedLoan) => {
            setLoan(updatedLoan);
          }}
        />
      )}

      {printingLoanId && (
        <InstallmentBookletPrint
          loan={loan}
          installments={installments.filter(i => String(i.loanId) === String(loan.id))}
          person={persons.find(p => String(p.id) === String(loan.personId))}
          onClose={() => setPrintingLoanId(null)}
          formatCurrency={props.formatCurrency || ((v: number) => Number(v).toLocaleString())}
          currency={props.storeSettings?.currency || 'تومان'}
        />
      )}
    </div>
  );
}
