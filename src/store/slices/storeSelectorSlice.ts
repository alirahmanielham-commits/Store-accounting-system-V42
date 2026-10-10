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
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage?.getItem("activeStoreId") || window.sessionStorage?.getItem("activeStoreId");
      if (stored && stored !== 'null' && stored !== 'undefined') return stored;
    } catch {
      return 'default';
    }
  }
  return 'default';
};

export const createStoreSelectorSlice: StateCreator<StoreSelectorSlice> = (set) => ({
  activeStoreId: getStoredStoreId(),
  setActiveStoreId: (id) => {
    const val = (id && id !== 'null' && id !== 'undefined') ? id : 'default';
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem("activeStoreId", val);
        window.sessionStorage?.setItem("activeStoreId", val);
        document.cookie = `activeStoreId=${encodeURIComponent(val)}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {}
    }
    set({ activeStoreId: val });
  },
  availableStores: [],
  setAvailableStores: (stores) => set({ availableStores: stores }),
  isStoreSelectionOpen: false,
  setIsStoreSelectionOpen: (isOpen) => set({ isStoreSelectionOpen: isOpen }),
});
