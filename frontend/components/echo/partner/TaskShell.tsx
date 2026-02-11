// components/echo/partner/TaskShell.tsx
/**
 * TaskShell - Muddy shell component on the beach
 *
 * Features:
 * - Muddy/crusted appearance
 * - Gentle bobbing animation
 * - Different appearance based on shell type
 * - Status indicators
 */

'use client';

import { motion } from 'framer-motion';
import { ECHO_COLORS } from '../../../lib/design-tokens';
import type { TaskShell as TaskShellType } from '../../../types/echo';

interface TaskShellProps {
  shell: TaskShellType;
  onClick?: () => void;
  className?: string;
}

export function TaskShell({ shell, onClick, className = '' }: TaskShellProps) {
  // Guard clause - don't render if shell is null
  if (!shell) {
    return null;
  }

  const isMuddy = shell.status === 'muddy';
  const isWashing = shell.status === 'washing';
  const isWashed = shell.status === 'washed' || shell.status === 'opened';
  const isGolden = shell.shell_type === 'golden_conch';
  const isPending = shell.confirmation_status === 'pending';

  // Shell appearance based on status
  const getShellColor = () => {
    if (isGolden) return ECHO_COLORS.beach.shell.golden;
    if (isWashed) return ECHO_COLORS.beach.shell.washed;
    return ECHO_COLORS.beach.shell.muddy;
  };

  const getGlowColor = () => {
    if (isGolden) return ECHO_COLORS.beach.shell.goldenGlow;
    if (isWashed) return ECHO_COLORS.beach.shell.washedGlow;
    return ECHO_COLORS.beach.shell.muddyGlow;
  };

  const getShellIcon = () => {
    if (isGolden) return '🐚';
    if (isPending) return '📨';
    return '🐚';
  };

  return (
    <motion.div
      className={`relative cursor-pointer ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={
        isMuddy
          ? {
              y: [0, -5, 0],
              rotate: [0, 2, -2, 0],
            }
          : {}
      }
      transition={
        isMuddy
          ? {
              y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
            }
          : {}
      }
    >
      {/* Shell glow */}
      {!isMuddy && (
        <motion.div
          className="absolute inset-0 rounded-full blur-xl"
          style={{ backgroundColor: getGlowColor() }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Shell body */}
      <div
        className="relative flex items-center justify-center rounded-full text-4xl shadow-lg"
        style={{
          width: 80,
          height: 80,
          backgroundColor: getShellColor(),
          boxShadow: isMuddy
            ? `inset 0 -5px 15px rgba(0,0,0,0.4), 0 5px 15px rgba(0,0,0,0.3)`
            : `0 0 20px ${getGlowColor()}`,
        }}
      >
        {/* Muddy texture overlay */}
        {isMuddy && (
          <div
            className="absolute inset-0 rounded-full opacity-40"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        )}

        {/* Shell icon */}
        <span className="relative z-10">{getShellIcon()}</span>

        {/* Status indicator */}
        {isWashing && (
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
            style={{ backgroundColor: ECHO_COLORS.beach.lightString.bulb }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
          />
        )}

        {/* Pending indicator */}
        {isPending && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-xs">!</span>
          </div>
        )}
      </div>

      {/* Task preview (title) */}
      {(shell.custom_title || shell.template_title) && (
        <div
          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs px-2 py-1 rounded"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: '#FFF',
          }}
        >
          {shell.custom_title || shell.template_title}
        </div>
      )}
    </motion.div>
  );
}
