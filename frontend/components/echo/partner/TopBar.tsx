// components/echo/partner/TopBar.tsx
/**
 * TopBar - Top navigation bar for Dad Mode 2.0
 *
 * Features:
 * - Personal center button (left)
 * - Title (center)
 * - Notification bell with red dot (right)
 */

'use client';

import { motion } from 'framer-motion';
import { User, ChevronLeft, Bell } from 'lucide-react';
import { ECHO_COLORS } from '../../../lib/design-tokens';
import { NotificationBell } from './NotificationBell';

interface TopBarProps {
  title?: string;
  onBack?: () => void;
  onProfileClick?: () => void;
  unreadCount?: number;
  className?: string;
}

export function TopBar({
  title = '爸爸模式',
  onBack,
  onProfileClick,
  unreadCount = 0,
  className = '',
}: TopBarProps) {
  return (
    <header
      className={`sticky top-0 z-40 px-4 py-3 backdrop-blur-md ${className}`}
      style={{
        background: 'rgba(26, 43, 76, 0.8)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* Left: Back button or Profile */}
        <motion.button
          onClick={onBack || onProfileClick}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          style={{ color: 'white' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {onBack ? <ChevronLeft size={24} /> : <User size={24} />}
        </motion.button>

        {/* Center: Title */}
        <motion.h1
          className="text-xl font-bold"
          style={{ color: ECHO_COLORS.beach.lightString.bulb }}
          animate={{
            textShadow: [
              `0 0 10px ${ECHO_COLORS.beach.lightString.glow}`,
              `0 0 20px ${ECHO_COLORS.beach.lightString.glow}`,
              `0 0 10px ${ECHO_COLORS.beach.lightString.glow}`,
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
        >
          {title}
        </motion.h1>

        {/* Right: Notification bell */}
        <NotificationBell unreadCount={unreadCount} />
      </div>
    </header>
  );
}
