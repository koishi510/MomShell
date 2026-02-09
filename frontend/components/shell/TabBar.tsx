// frontend/components/shell/TabBar.tsx
/**
 * 底部导航组件
 * 境(贝壳沙滩) - 圈(社区) - 愈(AI对话) - 练(康复) - 护(守护)
 */

'use client';

import { motion } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { SHELL_COLORS } from '../../lib/design-tokens';

interface TabBarProps {
  theme: 'day' | 'night';
  userRole: 'mom' | 'partner';
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

export function TabBar({ theme, userRole }: TabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const colors = theme === 'day' ? SHELL_COLORS.mom : SHELL_COLORS.partner;

  const basePath = `/shell/${userRole === 'mom' ? 'mom' : 'partner'}`;

  const tabs: TabItem[] = [
    {
      id: 'beach',
      label: '境',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3C7 3 3 7 3 12s4 9 9 9c2.5 0 4.5-1 6-2.5" />
          <path d="M21 12c0-5-4-9-9-9" />
          <ellipse cx="12" cy="12" rx="4" ry="6" />
        </svg>
      ),
      path: basePath,
    },
    {
      id: 'community',
      label: '圈',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="6" opacity="0.6" />
          <circle cx="12" cy="12" r="9" opacity="0.3" />
        </svg>
      ),
      path: '/community',
    },
    {
      id: 'chat',
      label: '愈',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" opacity="0.5" />
        </svg>
      ),
      path: '/chat',
    },
    {
      id: 'museum',
      label: '记',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.5" />
          <path d="M12 3v2M12 19v2" opacity="0.4" />
        </svg>
      ),
      path: '/shell/museum',
    },
  ];

  const isActive = (path: string) => {
    if (path === basePath) {
      return pathname === path || pathname.startsWith(basePath + '/');
    }
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2 pb-safe"
      style={{
        background: `${colors.background}F0`,
        backdropFilter: 'blur(16px)',
        boxShadow: `0 -4px 20px ${colors.shadow}`,
      }}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <motion.button
            key={tab.id}
            onClick={() => router.push(tab.path)}
            className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl relative min-w-[52px]"
            whileTap={{ scale: 0.95 }}
          >
            {/* 活动指示器背景 */}
            {active && (
              <motion.div
                className="absolute inset-0 rounded-xl"
                style={{ background: `${colors.accent}30` }}
                layoutId="tabIndicator"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}

            {/* 图标 */}
            <motion.div
              style={{
                color: active ? colors.accent : `${colors.text}80`,
              }}
              animate={{
                scale: active ? 1.1 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {tab.icon}
            </motion.div>

            {/* 标签 */}
            <span
              className="text-[10px] mt-0.5 font-medium"
              style={{
                color: active ? colors.text : `${colors.text}60`,
              }}
            >
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}
