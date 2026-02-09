// frontend/app/identity/page.tsx
/**
 * 身份选择页 - 溯源者/守护者
 * 50/50 垂直分屏布局
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../lib/design-tokens';
import { useAuth } from '../../contexts/AuthContext';

type IdentityType = 'mom' | 'partner' | null;

// 身份存储键
const IDENTITY_STORAGE_KEY = 'momshell_identity';

// Pre-generate star positions to avoid Math.random during render
function generateStarPositions(count: number, seed: number) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    // Use deterministic pseudo-random based on seed and index
    const x = ((seed * (i + 1) * 17) % 80) + 10;
    const y = ((seed * (i + 1) * 23) % 40) + 10;
    const duration = 2 + ((seed * (i + 1) * 7) % 20) / 10;
    const delay = ((seed * (i + 1) * 11) % 20) / 10;
    positions.push({ x, y, duration, delay });
  }
  return positions;
}

export default function IdentityPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [hoveredSide, setHoveredSide] = useState<IdentityType>(null);
  const [selectedIdentity, setSelectedIdentity] = useState<IdentityType>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Pre-generate star positions with a fixed seed
  const starPositions = useMemo(() => generateStarPositions(15, 42), []);

  // 检查是否已选择身份，自动跳转
  useEffect(() => {
    const savedIdentity = localStorage.getItem(IDENTITY_STORAGE_KEY) as IdentityType;
    if (savedIdentity && (savedIdentity === 'mom' || savedIdentity === 'partner')) {
      router.replace(`/shell/${savedIdentity}`);
    } else {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setIsChecking(false), 0);
    }
  }, [router]);

  const handleSelect = (identity: IdentityType) => {
    setSelectedIdentity(identity);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    // 保存身份到 localStorage（持久化）
    if (selectedIdentity) {
      localStorage.setItem(IDENTITY_STORAGE_KEY, selectedIdentity);
    }
    if (isAuthenticated) {
      // 已登录，直接进入
      router.push(`/shell/${selectedIdentity}`);
    } else {
      // 未登录，显示登录/注册模态框
      setShowAuthModal(true);
    }
  };

  const handleAuthRedirect = (mode: 'login' | 'register') => {
    // 保存选择的身份到 sessionStorage（用于登录后恢复）
    if (selectedIdentity) {
      sessionStorage.setItem('selectedIdentity', selectedIdentity);
    }
    router.push(`/auth/${mode}?redirect=/shell/${selectedIdentity}`);
  };

  // 计算分屏宽度
  const getWidth = (side: IdentityType) => {
    if (hoveredSide === null) return '50%';
    return hoveredSide === side ? '60%' : '40%';
  };

  // 检查中显示加载
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: SHELL_COLORS.mom.background }}>
        <motion.div
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-4xl"
        >
          🐚
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* 左侧 - 溯源者（妈妈） */}
      <motion.div
        className="relative h-screen cursor-pointer overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${SHELL_COLORS.mom.background} 0%, #FFF3E0 100%)`,
        }}
        animate={{ width: getWidth('mom') }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        onMouseEnter={() => setHoveredSide('mom')}
        onMouseLeave={() => setHoveredSide(null)}
        onClick={() => handleSelect('mom')}
      >
        {/* 光晕效果 */}
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${SHELL_COLORS.mom.accent}40 0%, transparent 70%)`,
          }}
          animate={{
            scale: hoveredSide === 'mom' ? 1.3 : 1,
            opacity: hoveredSide === 'mom' ? 0.8 : 0.5,
          }}
          transition={{ duration: 0.4 }}
        />

        {/* 发光珠贝剪影 */}
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: hoveredSide === 'mom' ? 1.1 : 1,
            y: hoveredSide === 'mom' ? -10 : 0,
          }}
          transition={SPRING_CONFIGS.gentle}
        >
          <svg width="120" height="100" viewBox="0 0 120 100">
            {/* 珍珠光晕 */}
            <motion.ellipse
              cx="60"
              cy="50"
              rx="50"
              ry="40"
              fill="none"
              stroke={SHELL_COLORS.mom.accent}
              strokeWidth="2"
              opacity="0.3"
              animate={{
                opacity: [0.2, 0.5, 0.2],
                scale: [0.95, 1.05, 0.95],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            {/* 贝壳主体 */}
            <path
              d="M20 60 Q20 20 60 15 Q100 20 100 60 Q100 85 60 90 Q20 85 20 60"
              fill={SHELL_COLORS.shell.clean}
              stroke={SHELL_COLORS.mom.accent}
              strokeWidth="2"
              style={{
                filter: `drop-shadow(0 0 20px ${SHELL_COLORS.mom.accent})`,
              }}
            />
            {/* 贝壳纹理 */}
            <g opacity="0.3">
              <path d="M60 18 L60 55" stroke={SHELL_COLORS.mom.accent} strokeWidth="1" />
              <path d="M40 25 Q50 40 55 55" stroke={SHELL_COLORS.mom.accent} strokeWidth="1" />
              <path d="M80 25 Q70 40 65 55" stroke={SHELL_COLORS.mom.accent} strokeWidth="1" />
            </g>
            {/* 珍珠 */}
            <circle
              cx="60"
              cy="55"
              r="12"
              fill="url(#pearlGradient)"
            />
            <defs>
              <radialGradient id="pearlGradient" cx="40%" cy="40%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#F5F5F5" />
                <stop offset="100%" stopColor="#E0E0E0" />
              </radialGradient>
            </defs>
          </svg>
        </motion.div>

        {/* 文字内容 */}
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 text-center">
          <motion.h2
            className="text-2xl font-medium mb-2"
            style={{ color: SHELL_COLORS.mom.text }}
            animate={{ scale: hoveredSide === 'mom' ? 1.1 : 1 }}
            transition={{ duration: 0.3 }}
          >
            溯源者
          </motion.h2>
          <motion.p
            className="text-sm"
            style={{ color: `${SHELL_COLORS.mom.text}99` }}
            animate={{ opacity: hoveredSide === 'mom' ? 1 : 0.7 }}
          >
            我是妈妈
          </motion.p>
          <motion.p
            className="text-xs mt-2 max-w-32"
            style={{ color: `${SHELL_COLORS.mom.text}70` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: hoveredSide === 'mom' ? 1 : 0 }}
          >
            洗去尘嚣，让自我重新发光
          </motion.p>
        </div>
      </motion.div>

      {/* 右侧 - 守护者（伴侣） */}
      <motion.div
        className="relative h-screen cursor-pointer overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${SHELL_COLORS.partner.background} 0%, #0D1B2A 100%)`,
        }}
        animate={{ width: getWidth('partner') }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        onMouseEnter={() => setHoveredSide('partner')}
        onMouseLeave={() => setHoveredSide(null)}
        onClick={() => handleSelect('partner')}
      >
        {/* 星星装饰 */}
        <div className="absolute inset-0 pointer-events-none">
          {starPositions.map((star, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
              }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: star.duration,
                repeat: Infinity,
                delay: star.delay,
              }}
            />
          ))}
        </div>

        {/* 磨砂贝壳轮廓 */}
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: hoveredSide === 'partner' ? 1.1 : 1,
            y: hoveredSide === 'partner' ? -10 : 0,
          }}
          transition={SPRING_CONFIGS.gentle}
        >
          <svg width="120" height="100" viewBox="0 0 120 100">
            {/* 贝壳轮廓 - 磨砂效果 */}
            <path
              d="M20 60 Q20 20 60 15 Q100 20 100 60 Q100 85 60 90 Q20 85 20 60"
              fill="none"
              stroke={SHELL_COLORS.partner.text}
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.6"
            />
            {/* 内部纹理 */}
            <g opacity="0.3">
              <path d="M60 20 L60 50" stroke={SHELL_COLORS.partner.text} strokeWidth="1" strokeDasharray="3 3" />
              <path d="M40 28 Q50 40 55 50" stroke={SHELL_COLORS.partner.text} strokeWidth="1" strokeDasharray="3 3" />
              <path d="M80 28 Q70 40 65 50" stroke={SHELL_COLORS.partner.text} strokeWidth="1" strokeDasharray="3 3" />
            </g>
            {/* 守护光环 */}
            <motion.circle
              cx="60"
              cy="50"
              r="35"
              fill="none"
              stroke={SHELL_COLORS.partner.accent}
              strokeWidth="1"
              opacity="0.4"
              animate={{
                r: [35, 40, 35],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </svg>
        </motion.div>

        {/* 文字内容 */}
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 text-center">
          <motion.h2
            className="text-2xl font-medium mb-2"
            style={{ color: SHELL_COLORS.partner.text }}
            animate={{ scale: hoveredSide === 'partner' ? 1.1 : 1 }}
            transition={{ duration: 0.3 }}
          >
            守护者
          </motion.h2>
          <motion.p
            className="text-sm"
            style={{ color: `${SHELL_COLORS.partner.text}99` }}
            animate={{ opacity: hoveredSide === 'partner' ? 1 : 0.7 }}
          >
            我是 TA 的伴侣
          </motion.p>
          <motion.p
            className="text-xs mt-2 max-w-32"
            style={{ color: `${SHELL_COLORS.partner.text}70` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: hoveredSide === 'partner' ? 1 : 0 }}
          >
            守望她的流光溢彩
          </motion.p>
        </div>
      </motion.div>

      {/* 确认弹窗 */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowConfirm(false)}
            />

            <motion.div
              className="relative bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={SPRING_CONFIGS.bouncy}
            >
              <div className="text-4xl mb-4">
                {selectedIdentity === 'mom' ? '🐚' : '🌙'}
              </div>

              <h3 className="text-xl font-medium mb-2" style={{ color: SHELL_COLORS.mom.text }}>
                确认身份
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                你选择了{selectedIdentity === 'mom' ? '「溯源者」' : '「守护者」'}身份
              </p>

              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-6">
                ⚠️ 身份选定后不可更改，是否确定？
              </p>

              <div className="flex gap-3 justify-center">
                <motion.button
                  onClick={() => setShowConfirm(false)}
                  className="px-6 py-2.5 rounded-full text-sm border"
                  style={{ borderColor: '#DDD', color: SHELL_COLORS.mom.text }}
                  whileTap={{ scale: 0.95 }}
                >
                  重新选择
                </motion.button>

                <motion.button
                  onClick={handleConfirm}
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
                  style={{
                    background: selectedIdentity === 'mom'
                      ? `linear-gradient(135deg, ${SHELL_COLORS.mom.accent} 0%, #FFA726 100%)`
                      : `linear-gradient(135deg, ${SHELL_COLORS.partner.accent} 0%, #5C6BC0 100%)`,
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  确认进入
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 登录/注册模态框 */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowAuthModal(false)}
            />

            <motion.div
              className="relative bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={SPRING_CONFIGS.bouncy}
            >
              <div className="text-4xl mb-4">✨</div>

              <h3 className="text-xl font-medium mb-2" style={{ color: SHELL_COLORS.mom.text }}>
                开启你的旅程
              </h3>

              <p className="text-sm text-gray-500 mb-6">
                登录或注册以保存你的回忆
              </p>

              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={() => handleAuthRedirect('login')}
                  className="w-full py-3 rounded-full text-sm font-medium text-white"
                  style={{
                    background: selectedIdentity === 'mom'
                      ? `linear-gradient(135deg, ${SHELL_COLORS.mom.accent} 0%, #FFA726 100%)`
                      : `linear-gradient(135deg, ${SHELL_COLORS.partner.accent} 0%, #5C6BC0 100%)`,
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  登录
                </motion.button>

                <motion.button
                  onClick={() => handleAuthRedirect('register')}
                  className="w-full py-3 rounded-full text-sm border"
                  style={{ borderColor: '#DDD', color: SHELL_COLORS.mom.text }}
                  whileTap={{ scale: 0.98 }}
                >
                  注册新账号
                </motion.button>

                <div className="border-t pt-3 mt-2">
                  <button
                    onClick={() => {
                      setShowAuthModal(false);
                      // 游客模式：直接进入，但功能受限
                      router.push(`/shell/${selectedIdentity}`);
                    }}
                    className="text-xs text-gray-500 underline"
                  >
                    游客模式浏览
                  </button>
                  <p className="text-[10px] text-gray-400 mt-1">
                    为了能与伴侣共建回忆，建议完成注册绑定
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
