export type CheckStatus = 'blank' | 'issued' | 'cashed' | 'bounced' | 'cancelled' | 'received' | 'deposited' | 'assigned' | 'bounced_assigned' | 'returned';

export type CheckType = 'issued' | 'received';

export interface CheckFilters {
  searchQuery: string;
  statusFilter: string;
  checkbookFilter?: string;
  sortBy: 'date' | 'amount';
  sortDir: 'asc' | 'desc';
}
