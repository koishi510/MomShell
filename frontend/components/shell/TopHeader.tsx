// frontend/components/shell/TopHeader.tsx
/**
 * 顶部栏组件 - 个人中心/标题/消息
 *
 * 左上角：个人中心（头像）
 *   - 修改头像
 *   - 修改用户名
 *   - 退出账号 / 重新登录
 *   - 伴侣状态显示
 * 中间：标题（圆润字体）
 * 右上角：消息铃铛（带红点）
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SHELL_COLORS } from '../../lib/design-tokens';
import { useAuth } from '../../contexts/AuthContext';

interface PartnerInfo {
  nickname: string;
  avatar_url?: string | null;
}

interface TopHeaderProps {
  title: string;
  theme: 'day' | 'night';
  showBack?: boolean;
  avatarUrl?: string | null;
  hasNotification?: boolean;
  notificationCount?: number;
  partnerInfo?: PartnerInfo | null;
  onAvatarClick?: () => void;
  onNotificationClick?: () => void;
}

export function TopHeader({
  title,
  theme,
  showBack = false,
  avatarUrl,
  hasNotification = false,
  notificationCount = 0,
  partnerInfo,
  onAvatarClick,
  onNotificationClick,
}: TopHeaderProps) {
  const router = useRouter();
  const { logout, isAuthenticated, user } = useAuth();
  const colors = theme === 'day' ? SHELL_COLORS.mom : SHELL_COLORS.partner;
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // 点击头像处理
  const handleAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick();
    } else {
      setShowMenu(!showMenu);
    }
  };

  // 菜单项处理
  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    switch (action) {
      case 'profile':
        router.push('/profile');
        break;
      case 'logout':
        logout();
        // 清除身份选择
        localStorage.removeItem('momshell_identity');
        router.push('/');
        break;
      case 'login':
        const identity = localStorage.getItem('momshell_identity') || 'mom';
        router.push(`/auth/login?redirect=/shell/${identity}`);
        break;
    }
  };

  return (
    <motion.header
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
      style={{
        background: `${colors.background}CC`,
        backdropFilter: 'blur(12px)',
      }}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* 左侧 - 头像或返回 */}
      <div className="flex items-center gap-2 relative" ref={menuRef}>
        {showBack ? (
          <motion.button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full"
            style={{
              background: `${colors.accent}30`,
              color: colors.text,
            }}
            whileTap={{ scale: 0.95 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </motion.button>
        ) : (
          <>
            {/* 头像按钮 */}
            <motion.button
              onClick={handleAvatarClick}
              className="w-10 h-10 rounded-full overflow-hidden border-2 relative"
              style={{
                borderColor: colors.accent,
                background: `${colors.accent}20`,
              }}
              whileTap={{ scale: 0.95 }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-lg"
                  style={{ color: colors.text }}
                >
                  👤
                </div>
              )}
            </motion.button>

            {/* 个人中心下拉菜单 */}
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  className="absolute top-12 left-0 w-52 rounded-2xl shadow-xl overflow-hidden z-50"
                  style={{
                    background: theme === 'day' ? '#FFFFFF' : '#2A3B5C',
                    border: `1px solid ${colors.accent}30`,
                  }}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* 用户信息头部 */}
                  {isAuthenticated && user && (
                    <div
                      className="px-4 py-3 border-b"
                      style={{ borderColor: `${colors.text}10` }}
                    >
                      <div className="text-sm font-medium" style={{ color: colors.text }}>
                        {user.nickname || user.username}
                      </div>
                      <div className="text-xs" style={{ color: `${colors.text}60` }}>
                        {theme === 'day' ? '溯源者' : '守护者'}
                      </div>
                    </div>
                  )}

                  <div className="py-1">
                    {isAuthenticated ? (
                      <>
                        {/* 个人中心 */}
                        <button
                          onClick={() => handleMenuAction('profile')}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-black/5 transition-colors"
                          style={{ color: colors.text }}
                        >
                          <span className="text-base">👤</span>
                          <span className="text-sm">个人中心</span>
                        </button>

                        <div className="h-px mx-4 my-1" style={{ background: `${colors.text}10` }} />

                        {/* 退出账号 */}
                        <button
                          onClick={() => handleMenuAction('logout')}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-black/5 transition-colors"
                          style={{ color: '#EF4444' }}
                        >
                          <span className="text-base">🚪</span>
                          <span className="text-sm">退出账号</span>
                        </button>
                      </>
                    ) : (
                      /* 重新登录 */
                      <button
                        onClick={() => handleMenuAction('login')}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-black/5 transition-colors"
                        style={{ color: colors.accent }}
                      >
                        <span className="text-base">🔑</span>
                        <span className="text-sm">登录账号</span>
                      </button>
                    )}
                  </div>

                  {/* 伴侣状态 - 在菜单底部显示 */}
                  {partnerInfo && (
                    <div
                      className="px-4 py-3 border-t"
                      style={{
                        borderColor: `${colors.text}10`,
                        background: `${colors.accent}08`,
                      }}
                    >
                      <div className="text-xs mb-2" style={{ color: `${colors.text}60` }}>
                        已绑定伴侣
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full overflow-hidden border"
                          style={{ borderColor: `${colors.accent}40` }}
                        >
                          {partnerInfo.avatar_url ? (
                            <img src={partnerInfo.avatar_url} alt="伴侣" className="w-full h-full object-cover" />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-sm"
                              style={{ background: `${colors.accent}20`, color: colors.text }}
                            >
                              💑
                            </div>
                          )}
                        </div>
                        <span
                          className="text-sm font-medium"
                          style={{ color: colors.text }}
                        >
                          {partnerInfo.nickname}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 伴侣状态 - 头像旁边简洁显示 */}
            {partnerInfo && (
              <div className="flex items-center gap-1.5 ml-1">
                <div
                  className="w-6 h-6 rounded-full overflow-hidden border"
                  style={{ borderColor: `${colors.text}40` }}
                >
                  {partnerInfo.avatar_url ? (
                    <img src={partnerInfo.avatar_url} alt="伴侣" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-xs"
                      style={{ background: `${colors.accent}20`, color: colors.text }}
                    >
                      💑
                    </div>
                  )}
                </div>
                <span
                  className="text-xs max-w-16 truncate hidden sm:inline"
                  style={{ color: `${colors.text}80` }}
                >
                  {partnerInfo.nickname}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 中间 - 标题（圆润字体） */}
      <h1
        className="text-lg font-semibold absolute left-1/2 -translate-x-1/2 tracking-wide"
        style={{
          color: colors.text,
          fontFamily: '"Rounded Mplus 1c", "Noto Sans SC", system-ui, sans-serif',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </h1>

      {/* 右侧 - 消息铃铛 */}
      <div className="w-12 flex justify-end">
        <motion.button
          onClick={onNotificationClick}
          className="relative w-10 h-10 flex items-center justify-center rounded-full"
          style={{
            background: `${colors.accent}30`,
            color: colors.text,
          }}
          whileTap={{ scale: 0.95 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>

          {/* 红点通知 */}
          {hasNotification && (
            <motion.span
              className="absolute top-1 right-1 min-w-[10px] h-[10px] bg-red-500 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {notificationCount > 0 && notificationCount <= 99 && (
                <span className="text-[8px] text-white font-bold px-0.5">
                  {notificationCount}
                </span>
              )}
            </motion.span>
          )}
        </motion.button>
      </div>
    </motion.header>
  );
}
