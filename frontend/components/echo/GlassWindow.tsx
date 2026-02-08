// frontend/components/echo/GlassWindow.tsx
/**
 * 毛玻璃窗户组件 - 核心视觉元素
 */

'use client';

import { motion } from 'framer-motion';
import { ECHO_COLORS } from '../../lib/design-tokens';
import type { Scene } from '../../types/echo';

interface GlassWindowProps {
  scene?: Scene | null;
  clarityLevel: number; // 0-100
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  className?: string;
}

export function GlassWindow({
  scene,
  clarityLevel,
  size = 'medium',
  className = '',
}: GlassWindowProps) {
  // 计算模糊程度 (100 = 清晰, 0 = 最模糊)
  const blurAmount = Math.max(0, 20 - (clarityLevel / 100) * 20);

  const sizeClasses = {
    small: 'h-24 rounded-xl',
    medium: 'h-48 rounded-2xl',
    large: 'h-72 rounded-3xl',
    fullscreen: 'h-full w-full rounded-none',
  };

  // 默认渐变背景（没有场景时）
  const defaultGradient = `linear-gradient(135deg,
    ${ECHO_COLORS.mom.gradient[0]} 0%,
    ${ECHO_COLORS.mom.gradient[1]} 50%,
    ${ECHO_COLORS.breathing.inhale}40 100%
  )`;

  return (
    <motion.div
      className={`relative overflow-hidden ${sizeClasses[size]} ${className}`}
      style={{
        background: scene ? undefined : defaultGradient,
      }}
    >
      {/* 场景图片 */}
      {scene && (
        <motion.img
          src={scene.thumbnail_url || scene.image_url}
          alt={scene.title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: `blur(${blurAmount}px)`,
          }}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* 毛玻璃效果叠加层 */}
      <div
        className="absolute inset-0"
        style={{
          background: ECHO_COLORS.window.frost,
          backdropFilter: `blur(${blurAmount / 2}px)`,
        }}
      />

      {/* 窗框效果 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `
            inset 0 0 60px rgba(255, 255, 255, ${0.1 + clarityLevel / 500}),
            inset 0 0 20px rgba(255, 255, 255, ${0.05 + clarityLevel / 1000})
          `,
        }}
      />

      {/* 清晰度指示（仅在非完全清晰时显示） */}
      {clarityLevel < 100 && size !== 'fullscreen' && (
        <div className="absolute bottom-2 right-2 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">
          <span className="text-white text-xs">{clarityLevel}%</span>
        </div>
      )}
    </motion.div>
  );
}
