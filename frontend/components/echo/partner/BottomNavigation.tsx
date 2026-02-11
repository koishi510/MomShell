// components/echo/partner/BottomNavigation.tsx
/**
 * BottomNavigation - 4-tab bottom navigation for Dad Mode 2.0
 *
 * Features:
 * - 4 tabs: 境, 圈, 愈, 记
 * - Active tab highlighting
 * - Badge indicators for unread content
 * - Smooth transitions
 */

'use client';

import { motion } from 'framer-motion';
import { Shell, Waves, Sparkles, Home } from 'lucide-react';
import { ECHO_COLORS } from '../../../lib/design-tokens';

export type TabType = 'beach' | 'community' | 'heal' | 'archive';

export interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
  iconComponent: typeof Shell;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'beach',
    label: '境',
    icon: '🐚',
    iconComponent: Shell,
    description: '沙滩贝壳',
  },
  {
    id: 'community',
    label: '圈',
    icon: '🌊',
    iconComponent: Waves,
    description: '爸爸社区',
  },
  {
    id: 'heal',
    label: '愈',
    icon: '✨',
    iconComponent: Sparkles,
    description: 'AI疗愈',
  },
  {
    id: 'archive',
    label: '记',
    icon: '🏠',
    iconComponent: Home,
    description: '珍珠馆',
  },
];

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  badges?: Partial<Record<TabType, number>>;
  className?: string;
}

export function BottomNavigation({
  activeTab,
  onTabChange,
  badges = {},
  className = '',
}: BottomNavigationProps) {
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg ${className}`}
      style={{
        background: 'rgba(26, 43, 76, 0.9)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const badgeCount = badges[tab.id] || 0;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center py-3 px-4 min-w-0 flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Icon */}
              <div className="relative mb-1">
                <motion.span
                  className="text-2xl"
                  animate={
                    isActive
                      ? {
                          scale: [1, 1.1, 1],
                        }
                      : {}
                  }
                  transition={
                    isActive
                      ? {
                          duration: 2,
                          repeat: Infinity,
                        }
                      : {}
                  }
                >
                  {tab.icon}
                </motion.span>

                {/* Badge */}
                {badgeCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-2 min-w-[16px] h-[16px] rounded-full border-2 border-[#1A2B4C] flex items-center justify-center text-[10px] font-bold text-white"
                    style={{
                      backgroundColor: ECHO_COLORS.beach.notificationBadge,
                    }}
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </motion.div>
                )}
              </div>

              {/* Label */}
              <motion.span
                className="text-xs font-medium"
                style={{
                  color: isActive
                    ? ECHO_COLORS.beach.nav.active
                    : ECHO_COLORS.beach.nav.inactive,
                }}
                animate={
                  isActive
                    ? {
                        textShadow: [
                          `0 0 10px ${ECHO_COLORS.beach.lightString.glow}`,
                          `0 0 15px ${ECHO_COLORS.beach.lightString.glow}`,
                          `0 0 10px ${ECHO_COLORS.beach.lightString.glow}`,
                        ],
                      }
                    : {}
                }
                transition={
                  isActive
                    ? {
                        duration: 2,
                        repeat: Infinity,
                      }
                    : {}
                }
              >
                {tab.label}
              </motion.span>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{
                    backgroundColor: ECHO_COLORS.beach.nav.active,
                  }}
                  layoutId="activeTab"
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

export { TABS };
