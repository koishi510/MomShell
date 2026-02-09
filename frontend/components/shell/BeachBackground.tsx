// frontend/components/shell/BeachBackground.tsx
/**
 * 沙滩背景组件 - 白天/夜晚主题
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SHELL_COLORS } from '../../lib/design-tokens';

interface BeachBackgroundProps {
  theme: 'day' | 'night';
  children?: React.ReactNode;
  className?: string;
}

// Pre-generate star positions with deterministic values
const STAR_POSITIONS = Array.from({ length: 20 }, (_, i) => ({
  left: ((i * 37 + 13) % 100),
  top: ((i * 23 + 7) % 40),
  opacity: 0.3 + ((i * 17) % 5) / 10,
  duration: 2 + ((i * 11) % 20) / 10,
  delay: ((i * 7) % 20) / 10,
}));

export function BeachBackground({
  theme,
  children,
  className = '',
}: BeachBackgroundProps) {
  const colors = theme === 'day' ? SHELL_COLORS.mom : SHELL_COLORS.partner;

  // 生成渐变背景
  const gradient = theme === 'day'
    ? `linear-gradient(180deg,
        ${colors.gradient[0]} 0%,
        ${colors.gradient[1]} 40%,
        #FFE4B5 70%,
        #DEB887 100%)`
    : `linear-gradient(180deg,
        ${colors.gradient[0]} 0%,
        ${colors.gradient[1]} 30%,
        #1A3657 60%,
        #2D4A6B 100%)`;

  return (
    <motion.div
      className={`min-h-screen w-full relative overflow-hidden ${className}`}
      style={{ background: gradient }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* 波纹装饰 - 模拟海浪 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none overflow-hidden">
        <svg
          viewBox="0 0 1200 120"
          className="absolute bottom-0 w-full"
          style={{ opacity: theme === 'day' ? 0.3 : 0.2 }}
        >
          <path
            d="M0,60 C300,120 600,0 900,60 C1200,120 1200,60 1200,60 L1200,120 L0,120 Z"
            fill={theme === 'day' ? '#FFE4B5' : '#3F51B5'}
          />
        </svg>
        <svg
          viewBox="0 0 1200 120"
          className="absolute bottom-0 w-full"
          style={{ opacity: theme === 'day' ? 0.2 : 0.15 }}
        >
          <path
            d="M0,80 C400,40 800,100 1200,80 L1200,120 L0,120 Z"
            fill={theme === 'day' ? '#DEB887' : '#5C6BC0'}
          />
        </svg>
      </div>

      {/* 星星装饰 - 仅夜间 */}
      {theme === 'night' && (
        <div className="absolute inset-0 pointer-events-none">
          {STAR_POSITIONS.map((star, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                opacity: star.opacity,
              }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: star.duration,
                repeat: Infinity,
                delay: star.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* 子内容 */}
      {children}
    </motion.div>
  );
}
