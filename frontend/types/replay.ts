import { CFProblem } from "./cf";
import { Verdict } from "@/components/primitives/VerdictPill";

export interface ReplayParticipant {
  user_id: string;
  username: string;
  cf_handle?: string | null;
  elo: number;
  tier: string;
  role: "host" | "opponent";
}

export interface ReplayStep {
  step_index: number;
  rating: number;
  problem: CFProblem;
  host_status: "pending" | "solved" | "skipped";
  opponent_status: "pending" | "solved" | "skipped";
}

export type ReplayEventPayload =
  | {
      event_type: "verdict";
      payload: {
        user_id: string;
        step_index: number;
        verdict: Verdict;
        testset?: number;
        submission_id: number;
      };
    }
  | {
      event_type: "step_advance";
      payload: { user_id: string; new_step_index: number };
    }
  | {
      event_type: "duel_complete";
      payload: {
        winner_id: string | null;
        promotion_for?: string | null;
        new_tier?: string | null;
        demotion_for?: string | null;
        elo_changes: Record<
          string,
          { before: number; after: number; delta: number }
        >;
      };
    };

export type ReplayEvent = ReplayEventPayload & {
  ts_offset_ms: number;
  user_id: string | null;
};

export interface ReplayResponse {
  duel_id: string;
  status: string;
  winner_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number;
  time_cap_seconds: number;
  participants: ReplayParticipant[];
  steps: ReplayStep[];
  events: ReplayEvent[];
}
