// frontend/types/echo.ts
/**
 * Echo Domain 类型定义
 */

// 身份标签类型
export type TagType = 'music' | 'sound' | 'literature' | 'memory';

// 音频类型
export type AudioType = 'nature' | 'ambient' | 'music' | 'guided';

// 场景类别
export type SceneCategory = 'nature' | 'cozy' | 'abstract' | 'vintage' | 'ocean';

// 冥想呼吸阶段
export type MeditationPhase = 'inhale' | 'hold' | 'exhale';

// ============================================================
// Echo 状态
// ============================================================

export interface EchoStatus {
  role: 'mom' | 'partner' | null;
  has_binding: boolean;
  binding_id: string | null;
  identity_tags_count: number;
  meditation_sessions_count: number;
  total_meditation_minutes: number;
}

// ============================================================
// 身份标签
// ============================================================

export interface IdentityTag {
  id: string;
  tag_type: TagType;
  content: string;
  created_at: string;
}

export interface IdentityTagCreate {
  tag_type: TagType;
  content: string;
}

export interface IdentityTagList {
  music: IdentityTag[];
  sound: IdentityTag[];
  literature: IdentityTag[];
  memory: IdentityTag[];
}

// ============================================================
// 场景
// ============================================================

export interface Scene {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  category: SceneCategory;
  keywords: string[];
  match_score: number | null;
}

// ============================================================
// 音频
// ============================================================

export interface Audio {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
  audio_type: AudioType;
  keywords: string[];
  match_score: number | null;
}

// ============================================================
// 冥想
// ============================================================

export interface MeditationStartRequest {
  target_duration_minutes: number;
  scene_id?: string;
  audio_id?: string;
}

export interface MeditationStartResponse {
  session_id: string;
  target_duration_minutes: number;
  scene: Scene | null;
  audio: Audio | null;
  breathing_rhythm: Record<MeditationPhase, number>;
}

export interface MeditationEndRequest {
  session_id: string;
  actual_duration_seconds: number;
}

export interface MeditationEndResponse {
  session_id: string;
  completed: boolean;
  actual_duration_seconds: number;
  target_duration_minutes: number;
  completion_rate: number;
}

export interface MeditationStats {
  total_sessions: number;
  completed_sessions: number;
  total_minutes: number;
  average_duration_minutes: number;
  current_streak: number;
  longest_streak: number;
  last_session_date: string | null;
}

// ============================================================
// 窗户清晰度
// ============================================================

export interface WindowClarity {
  clarity_level: number; // 0-100
  tasks_completed_today: number;
  tasks_confirmed_today: number;
  streak_bonus: number;
  level_bonus: number;
  breakdown: {
    base_clarity: number;
    task_clarity: number;
    streak_bonus: number;
    level_bonus: number;
  };
}

// ============================================================
// 伴侣记忆
// ============================================================

export interface MemoryInjectRequest {
  title: string;
  content: string;
  image_url?: string;
  reveal_at_clarity?: number;
}

export interface PartnerMemory {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  reveal_at_clarity: number;
  is_revealed: boolean;
  revealed_at: string | null;
  created_at: string;
}

export interface RevealedMemories {
  memories: PartnerMemory[];
  current_clarity: number;
  next_memory_at: number | null;
}

// ============================================================
// 青春回忆录
// ============================================================

export interface MemoirGenerateRequest {
  theme?: string;
}

export interface Memoir {
  id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  user_rating: number | null;
  created_at: string;
}

export interface MemoirList {
  memoirs: Memoir[];
  total: number;
}

// ============================================================
// 显示标签
// ============================================================

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  music: '音乐偏好',
  sound: '自然声音',
  literature: '文学作品',
  memory: '青春记忆',
};

export const TAG_TYPE_PLACEHOLDERS: Record<TagType, string> = {
  music: '例如：摇滚乐、古典音乐、民谣...',
  sound: '例如：雨声、海浪、森林鸟鸣...',
  literature: '例如：诗歌、散文、武侠小说...',
  memory: '例如：校园、旅行、初恋...',
};

export const TAG_TYPE_ICONS: Record<TagType, string> = {
  music: '🎵',
  sound: '🔊',
  literature: '📚',
  memory: '💭',
};

export const SCENE_CATEGORY_LABELS: Record<SceneCategory, string> = {
  nature: '自然风景',
  cozy: '温馨室内',
  abstract: '抽象艺术',
  vintage: '复古怀旧',
  ocean: '海洋主题',
};

export const AUDIO_TYPE_LABELS: Record<AudioType, string> = {
  nature: '自然声音',
  ambient: '环境音',
  music: '背景音乐',
  guided: '引导冥想',
};

export const MEDITATION_PHASE_LABELS: Record<MeditationPhase, string> = {
  inhale: '吸气',
  hold: '屏息',
  exhale: '呼气',
};

// 默认冥想时长选项（分钟）
export const MEDITATION_DURATIONS = [5, 10, 15, 20, 30];

// 呼吸节奏（秒）
export const BREATHING_RHYTHM: Record<MeditationPhase, number> = {
  inhale: 4,
  hold: 4,
  exhale: 6,
};

// 呼吸周期总时长
export const BREATHING_CYCLE_SECONDS =
  BREATHING_RHYTHM.inhale + BREATHING_RHYTHM.hold + BREATHING_RHYTHM.exhale;
