import type { UserRole } from "./user";

export interface AdminOverview {
  total_users: number;
  total_duels: number;
  active_duels: number;
  total_submissions: number;
  users_in_queue: number;
  total_quests: number;
  new_users_24h: number;
  duels_24h: number;
  top_users: {
    id: string;
    username: string;
    elo: number;
    role: UserRole;
    cf_handle?: string | null;
  }[];
}

export interface AdminUser {
  id: string;
  username: string;
  email?: string | null;
  cf_handle?: string | null;
  elo: number;
  role: UserRole;
  is_suspended: boolean;
  duel_wins: number;
  duel_losses: number;
  xp: number;
  created_at: string | null;
}

export interface AdminUserList {
  total: number;
  offset: number;
  limit: number;
  users: AdminUser[];
}

export interface AdminUserDetail extends AdminUser {
  cf_rating: number;
  cf_rank?: string | null;
  solved_count: number;
  updated_at: string | null;
  streak: {
    current_count: number;
    longest_count: number;
    shields_remaining: number;
  };
  elo_history: {
    elo_before: number;
    elo_after: number;
    delta: number;
    result: string;
    opponent_id?: string | null;
    created_at: string | null;
  }[];
  recent_duels: {
    id: string;
    result: string;
    delta: number;
    opponent_id?: string | null;
    status?: string | null;
    finished_at?: string | null;
  }[];
  submissions: {
    id: string;
    problem_id: string;
    language: string;
    status: string;
    runtime_ms?: number | null;
    created_at: string | null;
  }[];
  quest_progress: {
    quest_id: string;
    progress_json: string;
    completed_at: string | null;
    claimed_at: string | null;
  }[];
}

export interface AdminDuel {
  id: string;
  status: string;
  format: string;
  problem_name?: string | null;
  problem_rating?: number | null;
  participant_count: number;
  winner_id?: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
}

export interface AdminDuelList {
  total: number;
  offset: number;
  limit: number;
  duels: AdminDuel[];
}

export interface AdminDuelDetail extends AdminDuel {
  time_cap_seconds: number;
  host_id: string;
  problem_id?: string | null;
  participants: {
    user_id: string;
    current_rating: number;
    joined_at: string | null;
  }[];
  steps: {
    step_index: number;
    rating: number;
    problem_id: string;
    problem_name: string;
    problem_tags: string[];
    host_status: string;
    opponent_status: string;
  }[];
  submissions: {
    id: string;
    user_id: string;
    problem_id: string;
    language: string;
    status: string;
    runtime_ms?: number | null;
    created_at: string | null;
  }[];
  elo_changes: {
    user_id: string;
    elo_before: number;
    elo_after: number;
    delta: number;
    result: string;
    opponent_id?: string | null;
  }[];
}

export interface AdminSubmission {
  id: string;
  user_id: string;
  duel_id?: string | null;
  problem_id: string;
  language: string;
  status: string;
  runtime_ms?: number | null;
  memory_kb?: number | null;
  score?: number | null;
  created_at: string | null;
}

export interface AdminSubmissionList {
  total: number;
  offset: number;
  limit: number;
  submissions: AdminSubmission[];
}

export interface AdminRanking {
  rank: number;
  id: string;
  username: string;
  elo: number;
  role: UserRole;
  duel_wins: number;
  duel_losses: number;
  xp: number;
  cf_handle?: string | null;
  cf_rating: number;
}

export interface AdminRankingsResponse {
  sort: string;
  order: string;
  rankings: AdminRanking[];
}
