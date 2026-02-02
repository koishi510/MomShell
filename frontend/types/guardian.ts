// frontend/types/guardian.ts
/**
 * Guardian Partner 类型定义
 */

// 绑定状态
export type BindingStatus = 'pending' | 'active' | 'unbound';

// 心情等级
export type MoodLevel = 'very_low' | 'low' | 'neutral' | 'good' | 'great';

// 健康状况
export type HealthCondition =
  | 'wound_pain'
  | 'hair_loss'
  | 'insomnia'
  | 'breast_pain'
  | 'back_pain'
  | 'fatigue'
  | 'emotional'
  | 'constipation'
  | 'sweating';

// 任务难度
export type TaskDifficulty = 'easy' | 'medium' | 'hard';

// 任务状态
export type TaskStatus = 'available' | 'completed' | 'confirmed' | 'expired';

// 伴侣等级
export type PartnerLevel = 'intern' | 'trainee' | 'regular' | 'gold';

// 绑定关系
export interface PartnerBinding {
  id: string;
  mom_id: string;
  partner_id: string | null;
  status: BindingStatus;
  created_at: string;
  bound_at: string | null;
}

// 邀请信息
export interface InviteInfo {
  invite_code: string;
  invite_url: string;
  expires_at: string | null;
}

// 伴侣信息
export interface PartnerInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  level: PartnerLevel;
  total_points: number;
  current_streak: number;
}

// 妈妈信息
export interface MomInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  baby_birth_date: string | null;
  postpartum_weeks: number | null;
}

// 绑定状态响应
export interface BindingStatusResponse {
  has_binding: boolean;
  role: 'mom' | 'partner' | null;
  binding: PartnerBinding | null;
  partner_info: PartnerInfo | null;
  mom_info: MomInfo | null;
}

// 妈妈日常状态创建
export interface DailyStatusCreate {
  mood: MoodLevel;
  energy_level: number;
  health_conditions: HealthCondition[];
  feeding_count: number;
  sleep_hours: number | null;
  notes: string | null;
}

// 日常状态响应
export interface DailyStatusResponse {
  id: string;
  date: string;
  mood: MoodLevel;
  energy_level: number;
  health_conditions: string[];
  feeding_count: number;
  sleep_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// 状态通知
export interface StatusNotification {
  status: DailyStatusResponse;
  message: string;
  suggestions: string[];
}

// 任务模板
export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  difficulty: TaskDifficulty;
  points: number;
  category: string | null;
}

// 每日任务
export interface DailyTask {
  id: string;
  template: TaskTemplate;
  date: string;
  status: TaskStatus;
  completed_at: string | null;
  confirmed_at: string | null;
  mom_feedback: string | null;
  points_awarded: number | null;
}

// 进度信息
export interface ProgressInfo {
  total_points: number;
  current_level: PartnerLevel;
  next_level: PartnerLevel | null;
  points_to_next_level: number | null;
  tasks_completed: number;
  tasks_confirmed: number;
  current_streak: number;
  longest_streak: number;
}

// 徽章
export interface Badge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_icon: string;
  description: string | null;
  awarded_at: string;
}

// 记忆/时光记录
export interface Memory {
  id: string;
  photo_url: string;
  caption: string | null;
  date: string;
  milestone: string | null;
  created_at: string;
}

// 记忆创建
export interface MemoryCreate {
  photo_url: string;
  caption?: string;
  date?: string;
  milestone?: string;
}

// 相册
export interface Album {
  title: string;
  subtitle: string;
  cover_photo_url: string | null;
  memories: Memory[];
  total_days: number;
  milestones: string[];
}

// 健康状况显示名称
export const HEALTH_CONDITION_LABELS: Record<HealthCondition, string> = {
  wound_pain: '伤口疼痛',
  hair_loss: '脱发期',
  insomnia: '失眠',
  breast_pain: '涨奶/乳房疼痛',
  back_pain: '腰背痛',
  fatigue: '疲惫',
  emotional: '情绪波动',
  constipation: '便秘',
  sweating: '盗汗',
};

// 心情等级显示
export const MOOD_LEVEL_LABELS: Record<MoodLevel, string> = {
  very_low: '很低落',
  low: '有点低落',
  neutral: '一般',
  good: '不错',
  great: '很开心',
};

export const MOOD_LEVEL_EMOJIS: Record<MoodLevel, string> = {
  very_low: '😢',
  low: '😔',
  neutral: '😐',
  good: '🙂',
  great: '😊',
};

// 伴侣等级显示
export const PARTNER_LEVEL_LABELS: Record<PartnerLevel, string> = {
  intern: '实习爸爸',
  trainee: '见习守护者',
  regular: '正式守护者',
  gold: '金牌守护者',
};

export const PARTNER_LEVEL_EMOJIS: Record<PartnerLevel, string> = {
  intern: '🐣',
  trainee: '🌱',
  regular: '⭐',
  gold: '👑',
};

// 任务难度显示
export const TASK_DIFFICULTY_LABELS: Record<TaskDifficulty, string> = {
  easy: '简易',
  medium: '进阶',
  hard: '挑战',
};

export const TASK_DIFFICULTY_COLORS: Record<TaskDifficulty, string> = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
};
