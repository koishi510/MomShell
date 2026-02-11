/**
 * Profile Page - 个人资料
 * User profile and settings
 * Design: Calm-inspired soft gradients, glassmorphism
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { getIdentity, UserIdentity } from '../../lib/api/beach';
import BottomNav from '../../components/BottomNav';

// Calm-inspired Theme colors
const THEME = {
  mom: {
    bg: 'linear-gradient(180deg, #F8F6FF 0%, #F3EFFF 50%, #EDE7FF 100%)',
    text: '#4A4063',
    textLight: '#7B6F99',
    accent: '#B8A9E8',
    accentGradient: 'linear-gradient(135deg, #B8A9E8 0%, #D4C8F0 100%)',
    card: 'rgba(255, 255, 255, 0.72)',
    cardBorder: 'rgba(184, 169, 232, 0.25)',
    headerBg: 'rgba(248, 246, 255, 0.92)',
    glow: 'rgba(184, 169, 232, 0.35)',
  },
  dad: {
    bg: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 50%, #1F3044 100%)',
    text: '#E8EEF4',
    textLight: '#8BA4BC',
    accent: '#64B5F6',
    accentGradient: 'linear-gradient(135deg, #64B5F6 0%, #90CAF9 100%)',
    card: 'rgba(27, 40, 56, 0.75)',
    cardBorder: 'rgba(100, 181, 246, 0.18)',
    headerBg: 'rgba(13, 27, 42, 0.92)',
    glow: 'rgba(100, 181, 246, 0.3)',
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isMom = identity === 'origin_seeker';
  const theme = isMom ? THEME.mom : THEME.dad;

  useEffect(() => {
    async function init() {
      if (!authLoading) {
        if (!isAuthenticated) {
          router.push('/');
          return;
        }
        try {
          const data = await getIdentity();
          setIdentity(data.identity);
        } catch {
          router.push('/');
        } finally {
          setIsLoading(false);
        }
      }
    }
    init();
  }, [authLoading, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-4xl"
        >
          🐚
        </motion.div>
      </div>
    );
  }

  const getRoleDisplay = (role: string | undefined) => {
    switch (role) {
      case 'mom': return '妈妈';
      case 'dad': return '爸爸';
      case 'family': return '家人';
      case 'certified_doctor': return '认证医生';
      case 'certified_therapist': return '认证心理咨询师';
      case 'certified_nurse': return '认证护士';
      case 'admin': return '管理员';
      default: return '用户';
    }
  };

  const getIdentityDisplay = () => {
    return identity === 'origin_seeker' ? '溯源者' : '守护者';
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: theme.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-5 py-4 backdrop-blur-xl border-b"
        style={{
          backgroundColor: theme.headerBg,
          borderColor: theme.cardBorder,
        }}
      >
        <div className="flex items-center justify-between">
          <motion.button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: isMom ? 'rgba(184, 169, 232, 0.15)' : 'rgba(100, 181, 246, 0.15)',
              border: `1px solid ${theme.cardBorder}`,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-lg" style={{ color: theme.text }}>←</span>
          </motion.button>
          <h1 className="text-xl font-serif font-medium" style={{ color: theme.text }}>个人资料</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Profile Content */}
      <div className="px-5 py-6 space-y-5">
        {/* Avatar & Basic Info */}
        <motion.div
          className={`rounded-3xl p-6 text-center backdrop-blur-md ${isMom ? 'glass-card' : 'glass-card-dark'}`}
          style={{
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: `0 8px 32px ${theme.glow}`,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-4xl mb-5"
            style={{
              background: theme.accentGradient,
              border: `3px solid ${theme.accent}`,
              boxShadow: `0 8px 25px ${theme.glow}`,
            }}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              identity === 'origin_seeker' ? '👩' : '👨'
            )}
          </div>

          <h2 className="text-2xl font-medium mb-1" style={{ color: theme.text }}>
            {user?.nickname || '用户'}
          </h2>
          <p className="text-sm mb-5" style={{ color: theme.textLight }}>
            @{user?.username}
          </p>

          <div className="flex justify-center gap-3 flex-wrap">
            <span
              className="px-4 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: theme.accentGradient,
                color: isMom ? '#4A4063' : '#0D1B2A',
              }}
            >
              {getIdentityDisplay()}
            </span>
            <span
              className="px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm"
              style={{
                backgroundColor: isMom ? 'rgba(184, 169, 232, 0.2)' : 'rgba(100, 181, 246, 0.2)',
                color: theme.textLight,
                border: `1px solid ${theme.cardBorder}`,
              }}
            >
              {getRoleDisplay(user?.role)}
            </span>
            {user?.is_certified && (
              <span
                className="px-4 py-1.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
              >
                ✓ 已认证
              </span>
            )}
          </div>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          className={`rounded-3xl p-5 backdrop-blur-md ${isMom ? 'glass-card' : 'glass-card-dark'}`}
          style={{
            backgroundColor: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: `0 4px 20px ${theme.glow}`,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-medium mb-4 flex items-center gap-2" style={{ color: theme.text }}>
            <span className="text-lg">📋</span>
            账户信息
          </h3>

          <div className="space-y-1">
            <InfoRow label="邮箱" value={user?.email || '-'} theme={theme} />
            {user?.certification_title && (
              <InfoRow label="认证职称" value={user.certification_title} theme={theme} />
            )}
            {user?.postpartum_weeks && (
              <InfoRow label="产后周数" value={`${user.postpartum_weeks} 周`} theme={theme} />
            )}
            {user?.baby_birth_date && (
              <InfoRow
                label="宝宝生日"
                value={new Date(user.baby_birth_date).toLocaleDateString('zh-CN')}
                theme={theme}
              />
            )}
            <InfoRow
              label="注册时间"
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
              theme={theme}
            />
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ActionButton
            icon="🔒"
            label="修改密码"
            onClick={() => {/* TODO */}}
            theme={theme}
            isMom={isMom}
          />
          <ActionButton
            icon="📝"
            label="编辑资料"
            onClick={() => {/* TODO */}}
            theme={theme}
            isMom={isMom}
          />
          <ActionButton
            icon="🚪"
            label="退出登录"
            onClick={() => setShowLogoutConfirm(true)}
            theme={theme}
            isMom={isMom}
            danger
          />
        </motion.div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowLogoutConfirm(false)}
            />
            <motion.div
              className={`relative rounded-3xl p-6 w-full max-w-sm backdrop-blur-md ${isMom ? 'glass-card' : 'glass-card-dark'}`}
              style={{
                backgroundColor: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                boxShadow: `0 8px 32px ${theme.glow}`,
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-center mb-6">
                <span className="text-5xl mb-4 block">👋</span>
                <h3 className="text-xl font-medium mb-2" style={{ color: theme.text }}>
                  确认退出
                </h3>
                <p className="text-sm" style={{ color: theme.textLight }}>
                  确定要退出登录吗？
                </p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-2xl font-medium backdrop-blur-sm"
                  style={{
                    backgroundColor: isMom ? 'rgba(184, 169, 232, 0.2)' : 'rgba(100, 181, 246, 0.2)',
                    color: theme.textLight,
                    border: `1px solid ${theme.cardBorder}`,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                >
                  取消
                </motion.button>
                <motion.button
                  onClick={handleLogout}
                  className="flex-1 py-3 rounded-2xl font-medium"
                  style={{
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    color: '#fff',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                >
                  退出
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav currentPage="beach" identity={identity} />
    </div>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: typeof THEME.mom }) {
  return (
    <div
      className="flex justify-between items-center py-3 border-b last:border-b-0"
      style={{ borderColor: theme.cardBorder }}
    >
      <span className="text-sm" style={{ color: theme.textLight }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: theme.text }}>{value}</span>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  theme,
  isMom,
  danger = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  theme: typeof THEME.mom;
  isMom: boolean;
  danger?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl backdrop-blur-md ${isMom ? 'glass-card' : 'glass-card-dark'}`}
      style={{
        backgroundColor: theme.card,
        border: `1px solid ${danger ? 'rgba(239, 68, 68, 0.3)' : theme.cardBorder}`,
        boxShadow: `0 4px 16px ${danger ? 'rgba(239, 68, 68, 0.15)' : theme.glow}`,
      }}
      whileHover={{
        scale: 1.01,
        y: -2,
        boxShadow: `0 8px 24px ${danger ? 'rgba(239, 68, 68, 0.25)' : theme.glow}`,
      }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <span className="text-xl">{icon}</span>
      <span
        className="font-medium flex-1 text-left"
        style={{ color: danger ? '#ef4444' : theme.text }}
      >
        {label}
      </span>
      <span style={{ color: theme.textLight }}>→</span>
    </motion.button>
  );
}
