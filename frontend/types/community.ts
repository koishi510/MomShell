// frontend/types/community.ts
/**
 * 互助社区类型定义
 */

export type ChannelType = 'professional' | 'experience';

export type UserRole =
  | 'mom'
  | 'dad'
  | 'family'
  | 'certified_doctor'
  | 'certified_therapist'
  | 'certified_nurse';

export type ContentStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'hidden';

export interface Author {
  id: string;
  nickname: string;
  avatar_url: string | null;
  role: UserRole;
  is_certified: boolean;
  certification_title?: string; // e.g., "北京协和医院 妇产科 主任医师"
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Question {
  id: string;
  title: string;
  content: string;
  content_preview: string;
  channel: ChannelType;
  status: ContentStatus;
  author: Author;
  tags: Tag[];
  image_urls: string[];
  view_count: number;
  answer_count: number;
  like_count: number;
  collection_count: number;
  is_liked: boolean;
  is_collected: boolean;
  professional_answer_count: number;
  experience_answer_count: number;
  created_at: string;
  has_accepted_answer: boolean;
}

export interface Answer {
  id: string;
  question_id: string;
  author: Author;
  content: string;
  content_preview: string;
  image_urls: string[];
  is_professional: boolean;
  is_accepted: boolean;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  answer_id: string;
  author: Author;
  content: string;
  parent_id: string | null;
  reply_to_user: Author | null;
  like_count: number;
  is_liked: boolean;
  created_at: string;
  replies?: Comment[];
}

export interface HotTopic {
  id: string;
  name: string;
  question_count: number;
  trend: 'up' | 'down' | 'stable';
}

// 角色配置
export const ROLE_CONFIG: Record<UserRole, { label: string; badgeColor: string; icon?: string }> = {
  mom: { label: '妈妈', badgeColor: 'bg-pink-100 text-pink-700' },
  dad: { label: '爸爸', badgeColor: 'bg-blue-100 text-blue-700' },
  family: { label: '家属', badgeColor: 'bg-stone-100 text-stone-600' },
  certified_doctor: {
    label: '认证医生',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    icon: '✓'
  },
  certified_therapist: {
    label: '认证康复师',
    badgeColor: 'bg-teal-100 text-teal-700',
    icon: '✓'
  },
  certified_nurse: {
    label: '认证护士',
    badgeColor: 'bg-cyan-100 text-cyan-700',
    icon: '✓'
  },
};

// 频道配置
export const CHANNEL_CONFIG: Record<ChannelType, {
  label: string;
  subtitle: string;
  color: { bg: string; text: string; accent: string };
}> = {
  professional: {
    label: '专业频道',
    subtitle: '听听医生怎么说',
    color: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      accent: '#0ea5e9', // sky-500
    },
  },
  experience: {
    label: '经验频道',
    subtitle: '看看妈妈们的经验',
    color: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      accent: '#f59e0b', // amber-500
    },
  },
};
