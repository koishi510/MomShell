// components/echo/partner/WishBottleIcon.tsx
/**
 * WishBottleIcon - Floating wish bottle on the beach
 *
 * Features:
 * - Floating/drifting animation
 * - Gentle glow effect
 * - Click to open wish modal
 */

'use client';

import { motion } from 'framer-motion';
import { ECHO_COLORS } from '../../../lib/design-tokens';

interface WishBottleIconProps {
  onClick?: () => void;
  className?: string;
  unread?: boolean;
}

export function WishBottleIcon({ onClick, className = '', unread = false }: WishBottleIconProps) {
  return (
    <motion.div
      className={`relative cursor-pointer ${className}`}
      onClick={onClick}
      animate={{
        y: [0, -10, 0],
        rotate: [0, 5, -5, 0],
      }}
      transition={{
        y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-lg"
        style={{ backgroundColor: ECHO_COLORS.beach.lightString.bulb }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />

      {/* Bottle */}
      <div className="relative z-10 text-5xl">🍾</div>

      {/* Unread indicator */}
      {unread && (
        <motion.div
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
          style={{ backgroundColor: '#FF4444' }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          <span className="text-white text-xs font-bold">!</span>
        </motion.div>
      )}
    </motion.div>
  );
}
