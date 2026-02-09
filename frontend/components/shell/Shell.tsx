// frontend/components/shell/Shell.tsx
/**
 * 贝壳组件 - 状态可变的核心交互元素
 * 状态: dusty(灰尘) | muddy(泥泞) | clean(洁白) | golden(金色)
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../lib/design-tokens';

export type ShellState = 'dusty' | 'muddy' | 'clean' | 'golden';

// Pre-generate dust particle positions based on shell id
function generateDustPositions(id: string) {
  const seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length: 8 }, (_, i) => ({
    cx: 30 + ((seed * (i + 1) * 17) % 60),
    cy: 20 + ((seed * (i + 1) * 23) % 30),
    r: 2 + ((seed * (i + 1) * 7) % 3),
  }));
}

interface ShellProps {
  id: string;
  state: ShellState;
  size?: 'small' | 'medium' | 'large';
  label?: string;
  onClick?: () => void;
  isOpen?: boolean;
  stickerUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Shell({
  id,
  state,
  size = 'medium',
  label,
  onClick,
  isOpen = false,
  stickerUrl,
  className = '',
  style,
}: ShellProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Pre-generate dust positions based on shell id
  const dustPositions = useMemo(() => generateDustPositions(id), [id]);

  const sizeMap = {
    small: { width: 60, height: 50 },
    medium: { width: 90, height: 75 },
    large: { width: 120, height: 100 },
  };

  const dimensions = sizeMap[size];
  const shellColor = SHELL_COLORS.shell[state];

  const handleClick = () => {
    if (onClick && !isAnimating) {
      setIsAnimating(true);
      onClick();
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  return (
    <motion.div
      className={`relative cursor-pointer ${className}`}
      style={style}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={SPRING_CONFIGS.gentle}
    >
      {/* 贝壳主体 SVG */}
      <motion.svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 120 100"
        animate={{
          rotate: isAnimating ? [0, -5, 5, -3, 3, 0] : 0,
        }}
        transition={{ duration: 0.5 }}
      >
        {/* 贝壳下半部分 */}
        <motion.path
          d="M10 60 Q10 95 60 95 Q110 95 110 60 Q110 50 60 45 Q10 50 10 60"
          fill={shellColor}
          stroke={state === 'golden' ? '#DAA520' : '#888'}
          strokeWidth="1"
          style={{
            filter: state === 'golden' ? `drop-shadow(0 0 8px ${SHELL_COLORS.shell.glow})` : 'none',
          }}
        />

        {/* 贝壳上半部分（可打开） */}
        <motion.g
          style={{ transformOrigin: '60px 55px' }}
          animate={{
            rotateX: isOpen ? -120 : 0,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <path
            d="M10 55 Q10 15 60 10 Q110 15 110 55 Q110 50 60 45 Q10 50 10 55"
            fill={shellColor}
            stroke={state === 'golden' ? '#DAA520' : '#888'}
            strokeWidth="1"
          />

          {/* 贝壳纹理 */}
          <g opacity="0.3">
            <path d="M60 12 L60 45" stroke={state === 'golden' ? '#DAA520' : '#666'} strokeWidth="0.5" />
            <path d="M35 20 Q45 35 50 45" stroke={state === 'golden' ? '#DAA520' : '#666'} strokeWidth="0.5" />
            <path d="M85 20 Q75 35 70 45" stroke={state === 'golden' ? '#DAA520' : '#666'} strokeWidth="0.5" />
          </g>

          {/* 灰尘效果 */}
          {state === 'dusty' && (
            <g opacity="0.5">
              {dustPositions.map((dust, i) => (
                <circle
                  key={i}
                  cx={dust.cx}
                  cy={dust.cy}
                  r={dust.r}
                  fill="#9E9E9E"
                />
              ))}
            </g>
          )}

          {/* 泥泞效果 */}
          {state === 'muddy' && (
            <g opacity="0.6">
              <ellipse cx="45" cy="35" rx="15" ry="8" fill="#3E2723" />
              <ellipse cx="75" cy="30" rx="12" ry="6" fill="#4E342E" />
            </g>
          )}
        </motion.g>

        {/* 金色光晕 */}
        {state === 'golden' && (
          <motion.ellipse
            cx="60"
            cy="50"
            rx="50"
            ry="35"
            fill="none"
            stroke="#FFD700"
            strokeWidth="2"
            opacity="0.3"
            animate={{
              opacity: [0.2, 0.5, 0.2],
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.svg>

      {/* 打开时显示的贴纸 */}
      <AnimatePresence>
        {isOpen && stickerUrl && (
          <motion.div
            className="absolute left-1/2 -top-16 -translate-x-1/2"
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.5 }}
            transition={SPRING_CONFIGS.bouncy}
          >
            <img
              src={stickerUrl}
              alt="贴纸"
              className="w-16 h-16 object-contain"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 标签 */}
      {label && (
        <motion.p
          className="text-xs text-center mt-1 font-medium"
          style={{
            color: state === 'golden' ? '#DAA520' : '#666',
          }}
        >
          {label}
        </motion.p>
      )}
    </motion.div>
  );
}
