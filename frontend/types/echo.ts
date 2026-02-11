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
// Dad Mode 2.0 Types
// ============================================================

// 贝壳状态
export type ShellStatus = 'muddy' | 'washing' | 'washed' | 'opened' | 'archived';

// 贝壳类型
export type ShellType = 'normal' | 'golden_conch' | 'memory';

// 心愿类型
export type WishType = 'help_request' | 'gratitude' | 'surprise' | 'quality_time';

// 心愿状态
export type WishStatus = 'drifting' | 'caught' | 'in_progress' | 'granted' | 'expired';

// 记忆状态
export type MemoryStatus = 'generating' | 'ready' | 'opened' | 'favorited';

// 贴纸风格
export type StickerStyle = 'watercolor' | 'sketch' | 'pixel';

// 通知类型
export type NotificationType =
  | 'wish_new'
  | 'wish_granted'
  | 'memory_opened'
  | 'task_reminder'
  | 'community_like'
  | 'shell_washed'
  | 'memory_ready';

// 回忆录状态
export type MemoirStatus = 'generating' | 'completed' | 'failed';

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

// ============================================================
// Dad Mode 2.0: Task Shells
// ============================================================

export interface TaskShell {
  id: string;
  binding_id: string;
  shell_type: ShellType;
  status: ShellStatus;
  creator_role: string; // "system" | "dad" | "mom" | "wish"
  template_id: string | null;
  custom_title: string | null;
  custom_description: string | null;
  wish_bottle_id: string | null;
  bound_memoir_id: string | null;
  memory_sticker_url: string | null;
  memory_text: string | null;
  confirmation_status: string; // "pending" | "accepted" | "rejected"
  washing_started_at: string | null;
  washed_at: string | null;
  opened_at: string | null;
  created_at: string;
  // Related template data
  template_title?: string | null;
  template_description?: string | null;
  template_points?: number | null;
  template_difficulty?: string | null;
}

export interface TaskShellList {
  shells: TaskShell[];
  total: number;
  memory_pool_waiting: number; // Number of unrevealed memories
}

export interface ShellWashResponse {
  shell_id: string;
  sticker_url: string;
  message: string;
  is_echo_fragment: boolean; // True if no memory was bound
  light_string_photo: LightStringPhoto | null;
}

// ============================================================
// Dad Mode 2.0: Wish Bottles
// ============================================================

export interface WishBottle {
  id: string;
  binding_id: string;
  wish_type: WishType;
  content: string;
  emoji_hint: string | null;
  status: WishStatus;
  caught_at: string | null;
  resulting_shell_id: string | null;
  completed_at: string | null;
  mom_reaction: string | null;
  created_at: string;
}

export interface WishBottleList {
  bottles: WishBottle[];
  total: number;
}

export interface WishBottleCreate {
  wish_type: WishType;
  content: string;
  emoji_hint?: string;
}

export interface WishCatchResponse {
  wish: WishBottle;
  shell: TaskShell;
}

export interface WishConfirmRequest {
  reaction: string; // emoji
}

// ============================================================
// Dad Mode 2.0: Memory Shells
// ============================================================

export interface MemoryShell {
  id: string;
  binding_id: string;
  creator_id: string;
  title: string;
  content: string;
  photo_url: string | null;
  sticker_style: StickerStyle;
  sticker_url: string | null;
  status: MemoryStatus;
  opened_at: string | null;
  mom_reaction: string | null;
  error_message: string | null;
  created_at: string;
}

export interface MemoryShellList {
  memories: MemoryShell[];
  total: number;
}

export interface MemoryShellCreate {
  title: string;
  content: string;
  photo_url?: string;
  sticker_style?: StickerStyle;
}

export interface MemoryReactRequest {
  reaction: string; // emoji
}

// ============================================================
// Dad Mode 2.0: Notifications
// ============================================================

export interface EchoNotification {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationList {
  notifications: EchoNotification[];
  total: number;
  unread_count: number;
}

// ============================================================
// Dad Mode 2.0: Archive & Pool Status
// ============================================================

export interface ArchiveData {
  completed_shells: TaskShell[];
  granted_wishes: WishBottle[];
  sent_memories: MemoryShell[];
  received_memories: MemoryShell[];
  echo_fragment_count: number;
}

export interface PoolStatus {
  memory_pool_count: number;
  memory_pool_over_limit: boolean;
  task_pool_count: number;
  task_pool_by_status: Record<string, number>;
}

export interface TaskCreateRequest {
  title: string;
  description: string;
  creator_role: 'dad' | 'mom' | 'system';
}

export interface TaskAcceptRejectRequest {
  action: 'accept' | 'reject';
}

// ============================================================
// Dad Mode 2.0: Light String
// ============================================================

export interface LightStringPhoto {
  id: string;
  url: string;
  position: number;
  isRevealed: boolean;
  revealedAt: string;
}

export interface LightStringData {
  photos: LightStringPhoto[];
}

// ============================================================
// Dad Mode 2.0: Display Labels & Constants
// ============================================================

export const WISH_TYPE_LABELS: Record<WishType, string> = {
  help_request: '求助心愿',
  gratitude: '感恩心愿',
  surprise: '惊喜心愿',
  quality_time: '陪伴心愿',
};

export const WISH_STATUS_LABELS: Record<WishStatus, string> = {
  drifting: '漂流中',
  caught: '已接住',
  in_progress: '进行中',
  granted: '已完成',
  expired: '已过期',
};

export const SHELL_STATUS_LABELS: Record<ShellStatus, string> = {
  muddy: '泥泞',
  washing: '洗涤中',
  washed: '已洗净',
  opened: '已打开',
  archived: '已归档',
};

export const SHELL_TYPE_LABELS: Record<ShellType, string> = {
  normal: '普通贝壳',
  golden_conch: '金色海螺',
  memory: '记忆贝壳',
};

export const MEMORY_STATUS_LABELS: Record<MemoryStatus, string> = {
  generating: '生成中',
  ready: '待开启',
  opened: '已开启',
  favorited: '已收藏',
};

export const STICKER_STYLE_LABELS: Record<StickerStyle, string> = {
  watercolor: '水彩风格',
  sketch: '素描风格',
  pixel: '像素风格',
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  wish_new: '新心愿',
  wish_granted: '心愿达成',
  memory_opened: '记忆开启',
  task_reminder: '任务提醒',
  community_like: '社区点赞',
  shell_washed: '贝壳洗净',
  memory_ready: '记忆完成',
};

// Echo fragment messages (when memory pool is empty)
export const ECHO_FRAGMENT_MESSAGES = [
  '此时海面静谧，她在积蓄光芒。你的守护已化作底色，静待珠贝浮现。',
  '每一次俯身，都是爱意的沉淀。',
  '你的守护，如月光般温柔而坚定。',
  '静默中，你为她撑起了一片晴空。',
  '星光不问赶路人，时光不负有心人。',
];

// Beach theme colors
export const BEACH_COLORS = {
  background: '#1A2B4C', // 深墨蓝
  skyTop: '#0D1B2A', // 星空黑
  skyMiddle: '#1A2B4C', // 墨蓝
  skyBottom: '#2C3E50', // 深灰蓝
  sand: '#2C3E50', // 深灰蓝沙滩
  sandWet: '#34495E', // 湿润沙滩
  moon: '#FFFACD', // 柠檬绸色月亮
  stars: '#FFFFFF', // 白色星星
  lightString: {
    bulb: '#FFD700', // 金色灯泡
    cord: '#1A1A1A', // 黑色灯绳
    glow: 'rgba(255, 215, 0, 0.5)', // 金色光晕
  },
  shell: {
    muddy: '#5D4E37', // 泥泞棕色
    washed: '#F5DEB3', // 小麦色
    golden: '#FFD700', // 金色
  },
} as const;
