// components/echo/partner/MemoryConchIcon.tsx
/**
 * MemoryConchIcon - Golden conch for creating memories
 *
 * Features:
 * - Golden glow effect
 * - Pulse animation
 * - Click to open memory creation modal
 */

'use client';

import { motion } from 'framer-motion';
import { ECHO_COLORS } from '../../../lib/design-tokens';

interface MemoryConchIconProps {
  onClick?: () => void;
  className?: string;
  generating?: boolean;
}

export function MemoryConchIcon({ onClick, className = '', generating = false }: MemoryConchIconProps) {
  return (
    <motion.div
      className={`relative cursor-pointer ${className}`}
      onClick={generating ? undefined : onClick}
      animate={
        generating
          ? {
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }
          : {
              scale: [1, 1.05, 1],
            }
      }
      transition={
        generating
          ? {
              scale: { duration: 1, repeat: Infinity },
              rotate: { duration: 2, repeat: Infinity },
            }
          : {
              duration: 2,
              repeat: Infinity,
            }
      }
      whileHover={!generating ? { scale: 1.1 } : {}}
      whileTap={!generating ? { scale: 0.95 } : {}}
    >
      {/* Multiple glow layers */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute inset-0 rounded-full blur-xl ${i === 0 ? 'z-0' : ''}`}
          style={{
            backgroundColor: ECHO_COLORS.beach.shell.golden,
          }}
          animate={{
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 2 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}

      {/* Conch icon */}
      <div className="relative z-10 text-5xl">🐚</div>

      {/* Generating indicator */}
      {generating && (
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center"
          style={{ backgroundColor: ECHO_COLORS.beach.lightString.bulb }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          <span className="text-white text-xs">✨</span>
        </motion.div>
      )}
    </motion.div>
  );
}
