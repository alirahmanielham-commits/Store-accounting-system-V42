import { StateCreator } from 'zustand';

export interface StoreSelectorSlice {
  activeStoreId: string | null;
  setActiveStoreId: (id: string | null) => void;
  availableStores: any[];
  setAvailableStores: (stores: any[]) => void;
  isStoreSelectionOpen: boolean;
  setIsStoreSelectionOpen: (isOpen: boolean) => void;
}

export const createStoreSelectorSlice: StateCreator<StoreSelectorSlice> = (set) => ({
  activeStoreId: localStorage.getItem("activeStoreId"),
  setActiveStoreId: (id) => {
    if (id) {
        localStorage.setItem("activeStoreId", id);
    } else {
        localStorage.removeItem("activeStoreId");
    }
    set({ activeStoreId: id });
  },
  availableStores: [],
  setAvailableStores: (stores) => set({ availableStores: stores }),
  isStoreSelectionOpen: !localStorage.getItem("activeStoreId"),
  setIsStoreSelectionOpen: (isOpen) => set({ isStoreSelectionOpen: isOpen }),
});
