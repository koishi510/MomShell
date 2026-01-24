// frontend/components/AmbientCanvas.tsx
/**
 * 背景画布组件
 * 实现水波纹、阳光、暖光等视觉效果
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { VisualMetadata, ColorTone } from '../types/companion';
import { COLOR_TONE_MAP } from '../types/companion';

interface AmbientCanvasProps {
  visualState: VisualMetadata | null;
  isRippling: boolean;
}

// 获取背景渐变色
function getGradient(colorTone: ColorTone, intensity: number): string {
  const colors = COLOR_TONE_MAP[colorTone];
  const opacity = 0.3 + intensity * 0.4; // 0.3 ~ 0.7
  return `radial-gradient(ellipse at center, ${colors.primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}, ${colors.secondary}${Math.round(opacity * 0.5 * 255).toString(16).padStart(2, '0')}, transparent)`;
}

export function AmbientCanvas({ visualState, isRippling }: AmbientCanvasProps) {
  const defaultColor: ColorTone = 'gentle_blue';
  const colorTone = visualState?.color_tone || defaultColor;
  const intensity = visualState?.intensity || 0.3;
  const effectType = visualState?.effect_type || 'calm';
  const colors = COLOR_TONE_MAP[colorTone];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* 基础背景 */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: getGradient(colorTone, intensity),
        }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* 水波纹效果 */}
      <AnimatePresence>
        {isRippling && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={`ripple-${i}`}
                className="absolute left-1/2 top-1/2 rounded-full border-2"
                style={{
                  borderColor: colors.primary,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ width: 0, height: 0, opacity: 0.8 }}
                animate={{
                  width: 600 + i * 100,
                  height: 600 + i * 100,
                  opacity: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2,
                  delay: i * 0.3,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* 阳光/暖光效果 */}
      <AnimatePresence>
        {(effectType === 'sunlight' || effectType === 'warm_glow') && visualState && (
          <motion.div
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: 1 + intensity * 0.5,
              opacity: intensity * 0.6,
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            <div
              className="w-96 h-96 rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle, ${colors.primary}, transparent)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 平静呼吸效果 */}
      {effectType === 'calm' && (
        <motion.div
          className="absolute inset-0"
          animate={{
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            background: `radial-gradient(ellipse at center, ${colors.primary}40, transparent)`,
          }}
        />
      )}

      {/* 柔和波浪效果 */}
      {effectType === 'gentle_wave' && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-64"
          animate={{
            y: [0, -20, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            background: `linear-gradient(to top, ${colors.primary}30, transparent)`,
          }}
        />
      )}
    </div>
  );
}
