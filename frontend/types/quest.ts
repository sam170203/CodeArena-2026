export interface QuestRule {
  type:
    | "wins"
    | "clear_rating"
    | "win_no_wa"
    | "win_under_seconds"
    | "win_vs_higher_elo"
    | "streak_reach";
  target?: number;
  min_rating?: number;
  seconds?: number;
}

export interface QuestProgress {
  id: string;
  slug: string;
  title: string;
  kind: "daily" | "weekly";
  rule: QuestRule;
  xp_reward: number;
  shard_reward: number;
  shield_reward: number;
  progress: { count?: number; target?: number; [k: string]: unknown };
  completed_at: string | null;
  claimed_at: string | null;
}

export interface TodayQuests {
  daily: QuestProgress[];
  weekly: QuestProgress[];
}
