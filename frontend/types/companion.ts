// frontend/types/companion.ts
/**
 * Soulful Companion 前端类型定义
 * 与后端 schemas.py 保持一致
 */

export type EffectType =
  | "ripple"
  | "sunlight"
  | "calm"
  | "warm_glow"
  | "gentle_wave";

export type ColorTone =
  | "soft_pink"
  | "warm_gold"
  | "gentle_blue"
  | "lavender"
  | "neutral_white"
  | "coral"
  | "sage";

export interface VisualMetadata {
  effect_type: EffectType;
  intensity: number; // 0.0 ~ 1.0
  color_tone: ColorTone;
}

export interface UserMessage {
  content: string;
  session_id?: string | null;
}

export interface VisualResponse {
  text: string;
  visual_metadata: VisualMetadata;
  memory_updated: boolean;
}

// 颜色映射：ColorTone -> CSS 颜色值
export const COLOR_TONE_MAP: Record<
  ColorTone,
  { primary: string; secondary: string }
> = {
  soft_pink: { primary: "#F5D0D0", secondary: "#FFE4E6" },
  warm_gold: { primary: "#F6E3BA", secondary: "#FEF3C7" },
  gentle_blue: { primary: "#BFDBFE", secondary: "#DBEAFE" },
  lavender: { primary: "#DDD6FE", secondary: "#EDE9FE" },
  neutral_white: { primary: "#F5F5F4", secondary: "#FAFAF9" },
  coral: { primary: "#FED7AA", secondary: "#FFEDD5" },
  sage: { primary: "#D1E7DD", secondary: "#ECFDF5" },
};
