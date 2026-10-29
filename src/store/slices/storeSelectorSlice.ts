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
      const isChosen = window.sessionStorage?.getItem("activeBusinessChosen") === "true";
      if (!isChosen) return null;
      const stored = window.sessionStorage?.getItem("activeStoreId") || window.localStorage?.getItem("activeStoreId");
      if (stored && stored !== 'null' && stored !== 'undefined') return stored;
    } catch {
      return null;
    }
  }
  return null;
};

export const createStoreSelectorSlice: StateCreator<StoreSelectorSlice> = (set) => ({
  activeStoreId: getStoredStoreId(),
  setActiveStoreId: (id) => {
    const val = (id && id !== 'null' && id !== 'undefined') ? id : null;
    if (typeof window !== 'undefined') {
      try {
        if (val) {
          window.localStorage?.setItem("activeStoreId", val);
          window.sessionStorage?.setItem("activeStoreId", val);
          window.sessionStorage?.setItem("activeBusinessChosen", "true");
          window.localStorage?.setItem("activeBusinessChosen", "true");
          document.cookie = `activeStoreId=${encodeURIComponent(val)}; path=/; max-age=31536000; SameSite=Lax`;
        } else {
          window.localStorage?.removeItem("activeStoreId");
          window.sessionStorage?.removeItem("activeStoreId");
          window.sessionStorage?.removeItem("activeBusinessChosen");
          window.localStorage?.removeItem("activeBusinessChosen");
          document.cookie = `activeStoreId=; path=/; max-age=0; SameSite=Lax`;
        }
      } catch {}
    }
    set({ activeStoreId: val, isStoreSelectionOpen: !val });
  },
  availableStores: [],
  setAvailableStores: (stores) => set({ availableStores: stores }),
  isStoreSelectionOpen: !getStoredStoreId(),
  setIsStoreSelectionOpen: (isOpen) => set({ isStoreSelectionOpen: isOpen }),
});
