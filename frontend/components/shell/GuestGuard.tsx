// frontend/components/shell/GuestGuard.tsx
/**
 * 游客守卫组件 - 游客尝试输入数据时强制登录
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../lib/design-tokens';

interface GuestGuardProps {
  children: React.ReactNode;
  /** 需要登录时显示的消息 */
  message?: string;
  /** 当前主题 */
  theme?: 'day' | 'night';
}

/**
 * 包装需要登录才能使用的功能
 * 游客点击时会显示登录提示
 */
export function GuestGuard({
  children,
  message = '登录后才能使用此功能',
  theme = 'day',
}: GuestGuardProps) {
  const { isAuthenticated, isGuestMode } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const colors = theme === 'day' ? SHELL_COLORS.mom : SHELL_COLORS.partner;

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isAuthenticated && isGuestMode) {
      e.preventDefault();
      e.stopPropagation();
      setShowModal(true);
    }
  }, [isAuthenticated, isGuestMode]);

  const handleLogin = () => {
    const identity = localStorage.getItem('momshell_identity') || 'mom';
    router.push(`/auth/login?redirect=/shell/${identity}`);
  };

  const handleRegister = () => {
    const identity = localStorage.getItem('momshell_identity') || 'mom';
    router.push(`/auth/register?redirect=/shell/${identity}`);
  };

  // 已登录用户直接显示内容
  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <>
      {/* 包装子元素，游客点击时拦截 */}
      <div onClick={handleClick} className="contents">
        {children}
      </div>

      {/* 登录提示弹窗 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />

            <motion.div
              className="relative bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={SPRING_CONFIGS.bouncy}
            >
              <div className="text-5xl mb-4">🔐</div>

              <h3 className="text-xl font-medium mb-2" style={{ color: colors.text }}>
                需要登录
              </h3>

              <p className="text-sm text-gray-500 mb-6">
                {message}
                <br />
                <span className="text-xs">登录后即可解锁全部功能</span>
              </p>

              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={handleLogin}
                  className="w-full py-3 rounded-full text-sm font-medium text-white"
                  style={{
                    background: `linear-gradient(135deg, ${colors.accent} 0%, ${theme === 'day' ? '#FFA726' : '#5C6BC0'} 100%)`,
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  登录账号
                </motion.button>

                <motion.button
                  onClick={handleRegister}
                  className="w-full py-3 rounded-full text-sm border"
                  style={{ borderColor: '#DDD', color: colors.text }}
                  whileTap={{ scale: 0.98 }}
                >
                  注册新账号
                </motion.button>

                <button
                  onClick={() => setShowModal(false)}
                  className="text-xs text-gray-400 mt-2"
                >
                  稍后再说
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Hook: 检查是否需要登录
 * 返回一个函数，调用时如果是游客则显示登录弹窗
 */
export function useGuestGuard() {
  const { isAuthenticated, isGuestMode } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const checkAuth = useCallback((onAuthenticated?: () => void) => {
    if (isAuthenticated) {
      onAuthenticated?.();
      return true;
    }
    if (isGuestMode) {
      setShowModal(true);
      return false;
    }
    // 未登录也未选择游客模式，跳转登录
    router.push('/auth/login');
    return false;
  }, [isAuthenticated, isGuestMode, router]);

  const Modal = useCallback(() => (
    <AnimatePresence>
      {showModal && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          <motion.div
            className="relative bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={SPRING_CONFIGS.bouncy}
          >
            <div className="text-5xl mb-4">🔐</div>

            <h3 className="text-xl font-medium mb-2" style={{ color: SHELL_COLORS.mom.text }}>
              需要登录
            </h3>

            <p className="text-sm text-gray-500 mb-6">
              登录后才能使用此功能
              <br />
              <span className="text-xs">为了能与伴侣共建回忆，建议完成注册</span>
            </p>

            <div className="flex flex-col gap-3">
              <motion.button
                onClick={() => {
                  const identity = localStorage.getItem('momshell_identity') || 'mom';
                  router.push(`/auth/login?redirect=/shell/${identity}`);
                }}
                className="w-full py-3 rounded-full text-sm font-medium text-white"
                style={{
                  background: `linear-gradient(135deg, ${SHELL_COLORS.mom.accent} 0%, #FFA726 100%)`,
                }}
                whileTap={{ scale: 0.98 }}
              >
                登录账号
              </motion.button>

              <motion.button
                onClick={() => {
                  const identity = localStorage.getItem('momshell_identity') || 'mom';
                  router.push(`/auth/register?redirect=/shell/${identity}`);
                }}
                className="w-full py-3 rounded-full text-sm border"
                style={{ borderColor: '#DDD', color: SHELL_COLORS.mom.text }}
                whileTap={{ scale: 0.98 }}
              >
                注册新账号
              </motion.button>

              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-gray-400 mt-2"
              >
                稍后再说
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  ), [showModal, router]);

  return { checkAuth, Modal, showModal, setShowModal };
}
