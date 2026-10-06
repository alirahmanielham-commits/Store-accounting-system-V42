import { StateCreator } from 'zustand';

export interface AuthSlice {
  authUser: any | null;
  authToken: string | null;
  isAuthLoading: boolean;

  setAuthUser: (user: any, token: string | null) => void;
  clearAuth: () => void;
  setAuthLoading: (loading: boolean) => void;
}

const getStoredAuthToken = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return localStorage.getItem('access_token');
    } catch {
      return null;
    }
  }
  return null;
};

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  authUser: null,
  authToken: getStoredAuthToken(),
  isAuthLoading: false,

  setAuthUser: (user, token) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (token) {
          localStorage.setItem('access_token', token);
        } else {
          localStorage.removeItem('access_token');
        }
      } catch {}
    }
    set({ authUser: user, authToken: token });
  },

  clearAuth: () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('access_token');
      } catch {}
    }
    set({ authUser: null, authToken: null });
  },

  setAuthLoading: (loading) => set({ isAuthLoading: loading }),
});
