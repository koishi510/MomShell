// frontend/app/page.tsx
/**
 * 引导页 - 贝壳回响入口
 * 全屏海报背景，居中文字，柔光按钮
 */

'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { SHELL_COLORS, SPRING_CONFIGS } from '../lib/design-tokens';

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, selectedIdentity } = useAuth();

  // 已登录用户或已选择身份的访客直接跳转对应模式主页
  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      // 已登录用户根据角色跳转
      const role = user.role;
      if (role === 'partner' || role === 'dad') {
        router.push('/shell/partner');
      } else {
        router.push('/shell/mom');
      }
    } else if (selectedIdentity) {
      // 访客已选择身份
      router.push(`/shell/${selectedIdentity}`);
    }
  }, [isLoading, isAuthenticated, user, selectedIdentity, router]);

  const handleStart = () => {
    router.push('/identity');
  };

  // 加载中显示简单动画
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `linear-gradient(180deg, ${SHELL_COLORS.mom.background} 0%, #FFE4B5 50%, #87CEEB 100%)`,
        }}
      >
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-4xl"
        >
          🐚
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景渐变 - 模拟日出海滩 */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            #FFF8E1 0%,
            #FFECB3 15%,
            #FFE082 30%,
            #FFCC80 45%,
            #FFB74D 55%,
            #87CEEB 70%,
            #64B5F6 85%,
            #42A5F5 100%
          )`,
        }}
      />

      {/* 太阳光晕 */}
      <motion.div
        className="absolute top-[15%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,215,0,0.6) 0%, rgba(255,183,77,0.3) 40%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 波浪装饰 - 底部 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none">
        <svg
          viewBox="0 0 1200 120"
          className="absolute bottom-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z"
            fill="#DEB887"
            initial={{ d: 'M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z' }}
            animate={{
              d: [
                'M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z',
                'M0,70 C200,30 400,90 600,50 C800,10 1000,80 1200,50 L1200,120 L0,120 Z',
                'M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z',
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
        <svg
          viewBox="0 0 1200 120"
          className="absolute bottom-0 w-full h-full"
          preserveAspectRatio="none"
          style={{ opacity: 0.7 }}
        >
          <motion.path
            d="M0,80 C300,40 600,100 900,60 C1100,30 1200,70 1200,70 L1200,120 L0,120 Z"
            fill="#D2B48C"
            animate={{
              d: [
                'M0,80 C300,40 600,100 900,60 C1100,30 1200,70 1200,70 L1200,120 L0,120 Z',
                'M0,70 C300,90 600,30 900,80 C1100,50 1200,60 1200,60 L1200,120 L0,120 Z',
                'M0,80 C300,40 600,100 900,60 C1100,30 1200,70 1200,70 L1200,120 L0,120 Z',
              ],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />
        </svg>
      </div>

      {/* 散落的贝壳装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          { x: '10%', y: '75%', rotate: -15, scale: 0.8 },
          { x: '25%', y: '82%', rotate: 20, scale: 0.6 },
          { x: '75%', y: '78%', rotate: -25, scale: 0.7 },
          { x: '85%', y: '85%', rotate: 10, scale: 0.5 },
        ].map((shell, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: shell.x,
              top: shell.y,
              transform: `rotate(${shell.rotate}deg) scale(${shell.scale})`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 1 + i * 0.2, duration: 0.5 }}
          >
            <svg width="40" height="32" viewBox="0 0 40 32">
              <path
                d="M5 20 Q5 5 20 2 Q35 5 35 20 Q35 28 20 30 Q5 28 5 20"
                fill="#F5DEB3"
                stroke="#D2B48C"
                strokeWidth="1"
              />
            </svg>
          </motion.div>
        ))}
      </div>

      {/* 主内容 */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* 珍珠装饰 */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, ...SPRING_CONFIGS.bouncy }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #FFFFFF 0%, #F5F5F5 30%, #E0E0E0 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 -4px 12px rgba(0,0,0,0.05)',
            }}
          >
            <motion.span
              className="text-3xl"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              🐚
            </motion.span>
          </div>
        </motion.div>

        {/* 主标语 */}
        <motion.h1
          className="text-2xl md:text-3xl font-light text-center leading-relaxed max-w-md"
          style={{
            color: SHELL_COLORS.mom.text,
            textShadow: '0 2px 8px rgba(255,255,255,0.5)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          每一位母亲，
          <br />
          都是被岁月尘封的珍珠
        </motion.h1>

        {/* 副标语 */}
        <motion.p
          className="mt-4 text-sm text-center"
          style={{ color: `${SHELL_COLORS.mom.text}99` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          让爱的回响，唤醒尘封的记忆
        </motion.p>

        {/* 开启回响按钮 */}
        <motion.button
          onClick={handleStart}
          className="mt-12 px-10 py-4 rounded-full text-lg font-medium relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #FFE082 0%, #FFD54F 50%, #FFC107 100%)',
            color: SHELL_COLORS.mom.text,
            boxShadow: `
              0 4px 20px rgba(255, 193, 7, 0.4),
              0 8px 40px rgba(255, 193, 7, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `,
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, ...SPRING_CONFIGS.gentle }}
          whileHover={{
            scale: 1.05,
            boxShadow: `
              0 6px 30px rgba(255, 193, 7, 0.5),
              0 12px 50px rgba(255, 193, 7, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `,
          }}
          whileTap={{ scale: 0.98 }}
        >
          {/* 按钮光晕效果 */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 60%)',
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="relative z-10">开启回响</span>
        </motion.button>

        {/* 装饰文字 */}
        <motion.p
          className="mt-20 text-xs tracking-widest"
          style={{ color: `${SHELL_COLORS.mom.text}60` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          MomShell · 贝壳回响
        </motion.p>
      </div>
    </div>
  );
}
