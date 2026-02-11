/**
 * Bottom Navigation Component
 * Shared between all main pages
 */

'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface BottomNavProps {
  currentPage: 'beach' | 'community' | 'chat' | 'gallery';
  identity: 'origin_seeker' | 'guardian' | null;
}

export default function BottomNav({ currentPage, identity }: BottomNavProps) {
  const router = useRouter();

  const isMom = identity === 'origin_seeker';
  const bgColor = isMom ? '#F9F4E8' : '#1A2B4C';
  const textColor = isMom ? '#78350f' : '#f1f5f9';
  const textLightColor = isMom ? '#92400e' : '#94a3b8';
  const borderColor = isMom ? 'rgba(146, 64, 14, 0.1)' : 'rgba(148, 163, 184, 0.2)';

  const navItems = [
    {
      key: 'beach',
      icon: '🐚',
      label: '境',
      path: identity === 'origin_seeker' ? '/beach/mom' : '/beach/dad',
    },
    {
      key: 'community',
      icon: '🌊',
      label: '圈',
      path: '/community',
    },
    {
      key: 'chat',
      icon: '✨',
      label: '愈',
      path: '/chat',
    },
    {
      key: 'gallery',
      icon: '🦪',
      label: '记',
      path: '/gallery',
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center py-4 px-6 backdrop-blur-lg"
      style={{
        backgroundColor: `${bgColor}F0`,
        borderTop: `1px solid ${borderColor}`,
      }}
    >
      {navItems.map((item) => (
        <motion.button
          key={item.key}
          onClick={() => router.push(item.path)}
          className="flex flex-col items-center gap-1"
          whileTap={{ scale: 0.95 }}
        >
          <motion.span
            className="text-2xl"
            animate={{
              scale: currentPage === item.key ? 1.15 : 1,
            }}
            style={{
              opacity: currentPage === item.key ? 1 : 0.5,
            }}
          >
            {item.icon}
          </motion.span>
          <span
            className="text-xs"
            style={{
              color: currentPage === item.key ? textColor : textLightColor,
              fontWeight: currentPage === item.key ? 500 : 400,
            }}
          >
            {item.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
