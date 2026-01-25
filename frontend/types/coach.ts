// frontend/types/coach.ts
/**
 * AI 康复教练前端类型定义
 * 与后端 app/schemas/exercise.py 和 app/schemas/progress.py 保持一致
 */

// ============ Exercise Types ============

export type ExerciseCategory =
  | 'breathing'
  | 'pelvic_floor'
  | 'diastasis_recti'
  | 'posture'
  | 'strength';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type ExercisePhase =
  | 'preparation'
  | 'inhale'
  | 'exhale'
  | 'hold'
  | 'release'
  | 'rest';

export interface AngleRequirement {
  joint_name: string;
  min_angle: number;
  max_angle: number;
  ideal_angle: number;
}

export interface PhaseRequirement {
  phase: ExercisePhase;
  duration_seconds: number;
  angles: AngleRequirement[];
  description: string;
  cues: string[];
}

export interface Exercise {
  id: string;
  name: string;
  name_en: string;
  category: ExerciseCategory;
  difficulty: Difficulty;
  description: string;
  benefits: string[];
  contraindications: string[];
  phases: PhaseRequirement[];
  repetitions: number;
  sets: number;
  rest_between_sets: number;
  video_url?: string;
  thumbnail_url?: string;
}

export interface ExerciseSession {
  id: string;
  name: string;
  description: string;
  exercises: string[];
  total_duration_minutes: number;
  focus_areas: ExerciseCategory[];
}

// ============ Progress Types ============

export type AchievementType =
  | 'first_session'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'perfect_form'
  | 'complete_exercise'
  | 'complete_session'
  | 'strength_milestone'
  | 'consistency';

export interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  earned_at?: string;
  is_earned: boolean;
}

export interface StrengthMetric {
  name: string;
  value: number; // 0-100
  baseline: number;
  target: number;
  unit: string;
}

export interface ExerciseProgress {
  exercise_id: string;
  total_sessions: number;
  total_reps: number;
  average_score: number;
  best_score: number;
  last_performed?: string;
}

export interface UserProgress {
  user_id: string;
  total_sessions: number;
  total_minutes: number;
  current_streak: number;
  longest_streak: number;
  last_session_date?: string;
  achievements: Achievement[];
  exercise_progress: Record<string, ExerciseProgress>;
  strength_metrics: StrengthMetric[];
}

// ============ Energy Ring Types ============

export interface EnergyMetrics {
  core_strength: number; // 0-100
  pelvic_floor: number;
  posture: number;
  flexibility: number;
}

export const METRIC_LABELS: Record<keyof EnergyMetrics, string> = {
  core_strength: '核心力量',
  pelvic_floor: '盆底肌',
  posture: '体态',
  flexibility: '柔韧性',
};

export const METRIC_COLORS: Record<keyof EnergyMetrics, string> = {
  core_strength: '#e8a4b8', // Pink
  pelvic_floor: '#8bc99b', // Mint
  posture: '#7eb8da', // Blue
  flexibility: '#f5c869', // Gold
};
