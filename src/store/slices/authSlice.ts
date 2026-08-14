import { StateCreator } from 'zustand';

export interface AuthSlice {
  authUser: any | null;
  authToken: string | null;
  isAuthLoading: boolean;

  setAuthUser: (user: any, token: string | null) => void;
  clearAuth: () => void;
  setAuthLoading: (loading: boolean) => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  authUser: null,
  authToken: localStorage.getItem('access_token') || null,
  isAuthLoading: false,

  setAuthUser: (user, token) => {
    if (token) {
      localStorage.setItem('access_token', token);
    }
    set({ authUser: user, authToken: token });
  },

  clearAuth: () => {
    localStorage.removeItem('access_token');
    set({ authUser: null, authToken: null });
  },

  setAuthLoading: (loading) => set({ isAuthLoading: loading }),
});
