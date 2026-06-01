"use client";
import { create } from "zustand";
import { api } from "@/lib/api";
import type { User } from "@/types/user";

interface State {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  hydrate: () => void;
  setSession: (token: string, user: User) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

export const useAuth = create<State>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("ca_token");
    const userRaw = localStorage.getItem("ca_user");
    set({
      token,
      user: userRaw ? (JSON.parse(userRaw) as User) : null,
      hydrated: true,
    });
    if (token) {
      // Validate the cached token. If the user no longer exists (e.g. after
      // a DB reset) or the token is invalid, the API interceptor will clear
      // storage + redirect. We also defensively wipe local state here so
      // React renders never use a stale user.
      get()
        .refresh()
        .catch(() => {
          localStorage.removeItem("ca_token");
          localStorage.removeItem("ca_user");
          set({ user: null, token: null });
        });
    }
  },

  setSession: (token, user) => {
    localStorage.setItem("ca_token", token);
    localStorage.setItem("ca_user", JSON.stringify(user));
    set({ token, user, hydrated: true });
  },

  refresh: async () => {
    const { data } = await api.get<User>("/auth/me");
    localStorage.setItem("ca_user", JSON.stringify(data));
    set({ user: data });
  },

  logout: () => {
    localStorage.removeItem("ca_token");
    localStorage.removeItem("ca_user");
    set({ user: null, token: null });
  },
}));
