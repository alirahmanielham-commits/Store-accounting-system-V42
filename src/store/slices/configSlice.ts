import { StateCreator } from 'zustand';

export interface ConfigSlice {
  darkMode: boolean;
  toggleDarkMode: () => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  calendarType: 'gregorian' | 'jalali';
  setCalendarType: (type: 'gregorian' | 'jalali') => void;
  numberFormat: 'en' | 'fa';
  setNumberFormat: (format: 'en' | 'fa') => void;
}

export const createConfigSlice: StateCreator<ConfigSlice> = (set) => ({
  darkMode: false,
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  isSidebarOpen: true,
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  calendarType: 'jalali',
  setCalendarType: (type) => set({ calendarType: type }),
  numberFormat: 'fa',
  setNumberFormat: (format) => set({ numberFormat: format }),
});
