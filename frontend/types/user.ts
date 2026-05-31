export interface StreakState {
  current_count: number;
  longest_count: number;
  shields_remaining: number;
}

export type UserRole = "user" | "moderator" | "admin" | "superadmin";

export interface User {
  id: string;
  username: string;
  email?: string | null;
  cf_handle?: string | null;
  cf_rating?: number;
  elo?: number;
  duel_wins?: number;
  duel_losses?: number;
  xp?: number;
  role?: UserRole;
  created_at?: string;
  streak?: StreakState;
}
