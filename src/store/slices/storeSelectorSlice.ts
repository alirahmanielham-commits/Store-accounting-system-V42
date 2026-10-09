import { StateCreator } from 'zustand';

export interface StoreSelectorSlice {
  activeStoreId: string | null;
  setActiveStoreId: (id: string | null) => void;
  availableStores: any[];
  setAvailableStores: (stores: any[]) => void;
  isStoreSelectionOpen: boolean;
  setIsStoreSelectionOpen: (isOpen: boolean) => void;
}

const getStoredStoreId = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem("activeStoreId");
      if (stored) return stored;
    } catch {
      return 'default';
    }
  }
  return 'default';
};

export const createStoreSelectorSlice: StateCreator<StoreSelectorSlice> = (set) => ({
  activeStoreId: getStoredStoreId(),
  setActiveStoreId: (id) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (id) {
          localStorage.setItem("activeStoreId", id);
        } else {
          localStorage.setItem("activeStoreId", "default");
        }
      } catch {}
    }
    set({ activeStoreId: id || 'default' });
  },
  availableStores: [],
  setAvailableStores: (stores) => set({ availableStores: stores }),
  isStoreSelectionOpen: false,
  setIsStoreSelectionOpen: (isOpen) => set({ isStoreSelectionOpen: isOpen }),
});
