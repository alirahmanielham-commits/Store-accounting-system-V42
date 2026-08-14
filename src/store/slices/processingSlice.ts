import { StateCreator } from 'zustand';
import { CombinedStore } from '../index';

export interface ProcessingSlice {
  isProcessing: boolean;
  processingStatus: string | null;
  startProcessing: (status: string) => void;
  updateProcessingStatus: (status: string) => void;
  stopProcessing: () => void;
}

export const createProcessingSlice: StateCreator<
  CombinedStore,
  [],
  [],
  ProcessingSlice
> = (set) => ({
  isProcessing: false,
  processingStatus: null,
  startProcessing: (status) => set({ isProcessing: true, processingStatus: status }),
  updateProcessingStatus: (status) => set({ processingStatus: status }),
  stopProcessing: () => set({ isProcessing: false, processingStatus: null }),
});
