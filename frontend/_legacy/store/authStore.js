import { create } from 'zustand';
import { auth } from '../lib/api';

const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  hydrated: false,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    set({ token, hydrated: true });
  },

  setToken: (token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
    set({ token });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
    set({ token: null, user: null });
  },

  fetchMe: async () => {
    try {
      const res = await auth.me();
      set({ user: res.data });
      return res.data;
    } catch (err) {
      set({ user: null });
      return null;
    }
  },

  isAuthenticated: () => !!get().token,
}));

export default useAuthStore;