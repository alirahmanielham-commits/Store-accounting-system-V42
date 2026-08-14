import { StateCreator } from 'zustand';
import {
  getFinancialYears,
  getActiveFinancialYear,
  addFinancialYear,
  closeFinancialYear
} from '../../services/settingsService';

export interface FinancialYearSlice {
  financialYears: any[];
  activeFinancialYear: any | null;
  isLoadingFinancialYears: boolean;

  fetchFinancialYears: () => Promise<void>;
  fetchActiveFinancialYear: () => Promise<void>;
  addFinancialYear: (yearData: any) => Promise<any>;
  closeFinancialYear: (id: string | number) => Promise<void>;
}

export const createFinancialYearSlice: StateCreator<FinancialYearSlice> = (set, get) => ({
  financialYears: [],
  activeFinancialYear: null,
  isLoadingFinancialYears: false,

  fetchFinancialYears: async () => {
    set({ isLoadingFinancialYears: true });
    try {
      const years = await getFinancialYears();
      const active = await getActiveFinancialYear();
      set({ financialYears: years || [], activeFinancialYear: active || null });
    } catch (e) {
      console.error('Error fetching financial years in store:', e);
    } finally {
      set({ isLoadingFinancialYears: false });
    }
  },

  fetchActiveFinancialYear: async () => {
    try {
      const active = await getActiveFinancialYear();
      set({ activeFinancialYear: active || null });
    } catch (e) {
      console.error('Error fetching active financial year:', e);
    }
  },

  addFinancialYear: async (yearData) => {
    const newYear = await addFinancialYear(yearData);
    await get().fetchFinancialYears();
    return newYear;
  },

  closeFinancialYear: async (id) => {
    await closeFinancialYear(id);
    await get().fetchFinancialYears();
  },
});
