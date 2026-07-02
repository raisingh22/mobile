import { create } from 'zustand';
import { secureStore } from '../services/secureStore';

export interface UserProfile {
  id: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  workspaceId: string;
  workspace: {
    id: string;
    name: string;
  };
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: UserProfile, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: async (user, token) => {
    await secureStore.setToken(token);
    set({ user, token, isAuthenticated: true });
  },
  clearAuth: async () => {
    await secureStore.removeToken();
    set({ user: null, token: null, isAuthenticated: false });
  },
  setLoading: (loading) => set({ isLoading: loading }),
}));
