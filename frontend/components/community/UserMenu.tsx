'use client';

// frontend/components/community/UserMenu.tsx
/**
 * 用户菜单组件
 * 显示用户相关功能入口
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MenuItem {
  href: string;
  icon: string;
  label: string;
  description: string;
}

const menuItems: MenuItem[] = [
  {
    href: '/profile',
    icon: '👤',
    label: '个人中心',
    description: '编辑资料',
  },
  {
    href: '/community/my-posts',
    icon: '📝',
    label: '我的提问',
    description: '查看发布的问题',
  },
  {
    href: '/community/my-replies',
    icon: '💬',
    label: '我的回答',
    description: '查看回复过的问题',
  },
  {
    href: '/community/collections',
    icon: '🐚',
    label: '我的收藏',
    description: '捡到的贝壳',
  },
];

export default function UserMenu() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay to ensure smooth animation after hydration
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`space-y-3 transition-all duration-400 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <h3 className="text-sm font-medium text-stone-500 px-2">我的</h3>
      <div className="space-y-2">
        {menuItems.map((item, index) => (
          <Link key={item.href} href={item.href}>
            <div
              className={`
                flex items-center gap-3 p-3 rounded-2xl
                bg-white/60 hover:bg-white/80
                border border-stone-100/50
                cursor-pointer
                group
                transition-all duration-300 ease-out
                hover:translate-x-1
                ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
              `}
              style={{ transitionDelay: visible ? `${index * 50}ms` : '0ms' }}
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-stone-700 font-medium text-sm">
                  {item.label}
                </div>
                <div className="text-stone-400 text-xs truncate">
                  {item.description}
                </div>
              </div>
              <svg
                className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
