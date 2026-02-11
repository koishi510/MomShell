// components/echo/partner/BeachArea.tsx
/**
 * BeachArea - Moonlit beach background with stars and waves
 *
 * This is the main container component for Dad Mode 2.0.
 * It features:
 * - Deep gradient background (starry sky → ocean → sand)
 * - Moon with glow effect
 * - Twinkling stars
 * - Gentle wave animation
 * - Sand texture
 */

'use client';

import { ReactNode, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ECHO_COLORS } from '../../../lib/design-tokens';

// Simple seeded random for consistent star positions
function pseudoRandom(index: number, seed: number = 12345): number {
  const x = Math.sin(index + seed) * 10000;
  return x - Math.floor(x);
}

interface BeachAreaProps {
  children: ReactNode;
  className?: string;
}

export function BeachArea({ children, className = '' }: BeachAreaProps) {
  // Generate star data once
  const stars = useMemo(() => [...Array(30)].map((_, i) => ({
    width: pseudoRandom(i) * 2 + 1,
    height: pseudoRandom(i + 1000) * 2 + 1,
    left: pseudoRandom(i + 2000) * 100,
    top: pseudoRandom(i + 3000) * 40,
    duration: 3 + pseudoRandom(i + 4000) * 2,
    delay: pseudoRandom(i + 5000) * 2,
  })), []);

  return (
    <div
      className={`relative min-h-screen overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(180deg, ${ECHO_COLORS.beach.skyTop} 0%, ${ECHO_COLORS.beach.skyMiddle} 40%, ${ECHO_COLORS.beach.skyBottom} 70%, ${ECHO_COLORS.beach.sand} 100%)`,
      }}
    >
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none">
        {stars.map((star, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: star.width,
              height: star.height,
              left: `${star.left}%`,
              top: `${star.top}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
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

      {/* Moon */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 60,
          height: 60,
          backgroundColor: ECHO_COLORS.beach.moon,
          top: '10%',
          right: '15%',
          boxShadow: `0 0 60px ${ECHO_COLORS.beach.moonGlow}`,
        }}
        animate={{
          boxShadow: [
            `0 0 60px ${ECHO_COLORS.beach.moonGlow}`,
            `0 0 80px ${ECHO_COLORS.beach.moonGlow}`,
            `0 0 60px ${ECHO_COLORS.beach.moonGlow}`,
          ],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Ocean waves effect (subtle) */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '30%',
          background: `linear-gradient(180deg, transparent 0%, ${ECHO_COLORS.beach.wave} 100%)`,
        }}
      >
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 left-0 right-0 opacity-20"
            style={{
              height: 2,
              background: 'rgba(255, 255, 255, 0.3)',
            }}
            animate={{
              x: ['-5%', '5%', '-5%'],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
