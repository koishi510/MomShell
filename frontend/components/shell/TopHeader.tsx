// frontend/components/shell/TopHeader.tsx
/**
 * 顶部栏组件 - 个人中心/标题/消息
 */

'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SHELL_COLORS } from '../../lib/design-tokens';

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
  partnerInfo,
  onAvatarClick,
  onNotificationClick,
}: TopHeaderProps) {
  const router = useRouter();
  const colors = theme === 'day' ? SHELL_COLORS.mom : SHELL_COLORS.partner;

  // 默认点击头像跳转到个人中心
  const handleAvatarClick = () => {
    if (onAvatarClick) {
      onAvatarClick();
    } else {
      router.push('/community/profile');
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
      <div className="flex items-center gap-2">
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
            <motion.button
              onClick={handleAvatarClick}
              className="w-10 h-10 rounded-full overflow-hidden border-2"
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

            {/* 伴侣状态 */}
            {partnerInfo && (
              <div className="flex items-center gap-1.5">
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
                  className="text-xs max-w-16 truncate"
                  style={{ color: `${colors.text}80` }}
                >
                  {partnerInfo.nickname}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 中间 - 标题 */}
      <h1
        className="text-lg font-medium absolute left-1/2 -translate-x-1/2"
        style={{ color: colors.text }}
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
          {hasNotification && (
            <motion.span
              className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.button>
      </div>
    </motion.header>
  );
}
