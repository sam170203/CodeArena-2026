import { CFProblem } from "./cf";
import { Verdict } from "@/components/primitives/VerdictPill";

export type DuelStatus = "pending" | "matched" | "active" | "complete" | "archived";
export type StepStatus = "pending" | "solved" | "skipped";

export interface DuelStep {
  step_index: number;
  rating: number;
  problem: CFProblem;
  host_status: StepStatus;
  opponent_status: StepStatus;
}

export interface DuelParticipant {
  user_id: string;
  username: string;
  cf_handle?: string | null;
  cf_valid?: boolean;
  cf_error?: string | null;
  elo: number;
  tier: string;
  current_step: number;
  last_verdict?: {
    verdict: Verdict;
    testset?: number;
    submission_id?: number;
  } | null;
}

export interface Duel {
  id: string;
  status: DuelStatus;
  host: DuelParticipant;
  opponent: DuelParticipant | null;
  steps: DuelStep[];
  started_at: string | null;
  finished_at: string | null;
  time_cap_seconds: number;
  winner_id: string | null;
}
