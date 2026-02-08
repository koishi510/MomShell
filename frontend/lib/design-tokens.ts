// frontend/lib/design-tokens.ts
/**
 * 设计令牌 - 全局共享的色彩、动画参数
 * 确保首页与社区页面的视觉一致性
 */

// 弥散渐变色板
export const MESH_COLORS = {
  cream: '#FFF3E0',
  softPink: '#FFE4EC',
  mintGreen: '#E0F7E9',
  lavender: '#F3E8FF',
  warmWhite: '#FFF8F0',
} as const;

// 功能模块配色
export const MODULE_COLORS = {
  companion: {
    primary: '#FFB6C1',
    gradient: ['#FFE4EC', '#FFF0F5'],
    shadow: 'rgba(255, 182, 193, 0.3)',
  },
  community: {
    primary: '#FFB347',
    gradient: ['#FFF3E0', '#FFE4B5'],
    shadow: 'rgba(255, 179, 71, 0.3)',
  },
  coach: {
    primary: '#4DD0E1',
    gradient: ['#E0F7FA', '#B2EBF2'],
    shadow: 'rgba(77, 208, 225, 0.3)',
  },
} as const;

// Echo Domain 配色
export const ECHO_COLORS = {
  mom: {
    primary: '#FFF8E1', // 米黄色
    accent: '#FFE082', // 暖金色
    text: '#5D4037', // 深棕色
    gradient: ['#FFF8E1', '#FFECB3'],
    shadow: 'rgba(255, 224, 130, 0.3)',
    glow: 'rgba(255, 224, 130, 0.5)',
  },
  partner: {
    primary: '#1A237E', // 墨蓝色
    accent: '#3F51B5', // 靛蓝色
    text: '#E8EAF6', // 浅蓝灰
    gradient: ['#1A237E', '#283593'],
    shadow: 'rgba(63, 81, 181, 0.3)',
    glow: 'rgba(63, 81, 181, 0.5)',
  },
  // 窗户效果
  window: {
    blur: {
      low: 'blur(20px)',
      medium: 'blur(10px)',
      high: 'blur(5px)',
      clear: 'blur(0px)',
    },
    frost: 'rgba(255, 255, 255, 0.1)',
  },
  // 冥想呼吸颜色
  breathing: {
    inhale: '#81D4FA', // 浅蓝
    hold: '#B39DDB', // 淡紫
    exhale: '#A5D6A7', // 浅绿
  },
} as const;

// 社区频道配色
export const CHANNEL_COLORS = {
  professional: {
    primary: '#60A5FA', // sky-400
    light: '#DBEAFE', // sky-100
    gradient: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
    shadow: 'rgba(96, 165, 250, 0.25)',
    glow: 'rgba(96, 165, 250, 0.4)',
  },
  experience: {
    primary: '#FBBF24', // amber-400
    light: '#FEF3C7', // amber-100
    gradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
    shadow: 'rgba(251, 191, 36, 0.25)',
    glow: 'rgba(251, 191, 36, 0.4)',
  },
} as const;

// 角色配色
export const ROLE_COLORS = {
  mom: {
    badge: 'bg-pink-100 text-pink-700',
    nameColor: 'text-pink-600',
  },
  dad: {
    badge: 'bg-blue-100 text-blue-700',
    nameColor: 'text-blue-600',
  },
  certified_doctor: {
    badge: 'bg-emerald-100 text-emerald-700',
    nameColor: 'text-emerald-600',
    glowColor: 'rgba(16, 185, 129, 0.6)',
  },
  certified_therapist: {
    badge: 'bg-teal-100 text-teal-700',
    nameColor: 'text-teal-600',
    glowColor: 'rgba(20, 184, 166, 0.6)',
  },
  certified_nurse: {
    badge: 'bg-cyan-100 text-cyan-700',
    nameColor: 'text-cyan-600',
    glowColor: 'rgba(6, 182, 212, 0.6)',
  },
} as const;

// 动画参数 - Spring 配置
export const SPRING_CONFIGS = {
  gentle: { type: 'spring', stiffness: 200, damping: 25 },
  bouncy: { type: 'spring', stiffness: 400, damping: 15 },
  smooth: { type: 'spring', stiffness: 300, damping: 30 },
  snappy: { type: 'spring', stiffness: 500, damping: 30 },
} as const;

// 动画参数 - 持续时间
export const DURATIONS = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.8,
  breathing: 4, // 呼吸周期
  meshGradient: 18, // 背景渐变周期
} as const;

// 卡片阴影样式生成器
export function createSoftShadow(color: string, intensity: 'light' | 'normal' | 'strong' = 'normal') {
  const multipliers = { light: 0.5, normal: 1, strong: 1.5 };
  const m = multipliers[intensity];
  return `
    0 ${4 * m}px ${20 * m}px ${color},
    0 ${8 * m}px ${40 * m}px ${color.replace('0.3', '0.15')}
  `;
}

// 毛玻璃样式
export const GLASS_STYLES = {
  light: 'bg-white/60 backdrop-blur-md',
  medium: 'bg-white/70 backdrop-blur-lg',
  heavy: 'bg-white/80 backdrop-blur-xl',
} as const;
