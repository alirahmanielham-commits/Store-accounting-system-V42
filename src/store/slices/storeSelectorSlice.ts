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
      return localStorage.getItem("activeStoreId");
    } catch {
      return null;
    }
  }
  return null;
};

export const createStoreSelectorSlice: StateCreator<StoreSelectorSlice> = (set) => ({
  activeStoreId: getStoredStoreId(),
  setActiveStoreId: (id) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (id) {
          localStorage.setItem("activeStoreId", id);
        } else {
          localStorage.removeItem("activeStoreId");
        }
      } catch {}
    }
    set({ activeStoreId: id });
  },
  availableStores: [],
  setAvailableStores: (stores) => set({ availableStores: stores }),
  isStoreSelectionOpen: !getStoredStoreId(),
  setIsStoreSelectionOpen: (isOpen) => set({ isStoreSelectionOpen: isOpen }),
});
