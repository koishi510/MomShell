// frontend/app/shell/mom/page.tsx
/**
 * 妈妈主沙滩页 - 溯源之境
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import {
  BeachBackground,
  TopHeader,
  Shell,
  WishBottle,
  Onboarding,
} from '../../../components/shell';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../../lib/design-tokens';
import type { ShellState } from '../../../components/shell';

interface ShellData {
  id: string;
  state: ShellState;
  label?: string;
  position: { x: number; y: number };
  memoryId?: string;
}

export default function MomBeachPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [shells, setShells] = useState<ShellData[]>([]);
  const [selectedShell, setSelectedShell] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 加载贝壳数据
  useEffect(() => {
    const loadShells = async () => {
      // 模拟加载 - 后续替换为真实 API
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 500));

      // 占位数据 - 3-5 个灰尘贝壳
      const mockShells: ShellData[] = [
        { id: '1', state: 'dusty', label: '青春', position: { x: 15, y: 45 } },
        { id: '2', state: 'dusty', label: '初恋', position: { x: 55, y: 35 } },
        { id: '3', state: 'dusty', label: '梦想', position: { x: 75, y: 55 } },
        { id: '4', state: 'clean', label: '幸福', position: { x: 35, y: 60 } },
        { id: '5', state: 'golden', label: '爱意', position: { x: 60, y: 65 } },
      ];

      setShells(mockShells);
      setIsLoading(false);
    };

    loadShells();
  }, []);

  const handleShellClick = (shellId: string) => {
    const shell = shells.find((s) => s.id === shellId);
    if (!shell) return;

    if (shell.state === 'dusty') {
      // 灰尘贝壳 - 进入记忆页面
      router.push(`/shell/mom/memory?shell=${shellId}`);
    } else {
      // 洁白/金色贝壳 - 显示贴纸
      setSelectedShell(shellId);
    }
  };

  const handleWishSend = async (wish: string) => {
    console.log('发送心愿:', wish);
    // TODO: 调用 API 发送心愿
  };

  return (
    <BeachBackground theme="day">
      {/* 顶部栏 */}
      <TopHeader
        title="溯源之境"
        theme="day"
        avatarUrl={user?.avatar_url}
        hasNotification={false}
      />

      {/* 主内容区 */}
      <main className="relative min-h-[calc(100vh-120px)] px-4 pt-4 pb-24">
        {/* 中心提示文字 */}
        <motion.div
          className="absolute top-8 left-1/2 -translate-x-1/2 text-center z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p
            className="text-sm font-light"
            style={{ color: `${SHELL_COLORS.mom.text}CC` }}
          >
            捡起一枚贝壳，洗净一段时光
          </p>
        </motion.div>

        {/* 贝壳区域 */}
        <div className="relative h-[60vh] mt-16">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="text-4xl"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🐚
              </motion.div>
            </div>
          ) : (
            shells.map((shell, index) => (
              <motion.div
                key={shell.id}
                className="absolute"
                style={{
                  left: `${shell.position.x}%`,
                  top: `${shell.position.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0, scale: 0, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: index * 0.15, ...SPRING_CONFIGS.bouncy }}
              >
                <Shell
                  id={shell.id}
                  state={shell.state}
                  label={shell.label}
                  size={shell.state === 'golden' ? 'large' : 'medium'}
                  onClick={() => handleShellClick(shell.id)}
                  isOpen={selectedShell === shell.id}
                />
              </motion.div>
            ))
          )}
        </div>

        {/* 右侧漂流瓶 - 屏幕右栏中心 */}
        <motion.div
          className="fixed right-4 top-1/2 -translate-y-1/2 z-20"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
        >
          <WishBottle onSend={handleWishSend} />
        </motion.div>

        {/* 贴纸预览弹窗 */}
        <AnimatePresence>
          {selectedShell && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedShell(null)}
            >
              <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

              <motion.div
                className="relative bg-white rounded-3xl p-6 shadow-xl text-center max-w-xs"
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 贴纸图片占位 */}
                <div
                  className="w-40 h-40 mx-auto rounded-2xl mb-4 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${SHELL_COLORS.mom.accent} 0%, #FFA726 100%)`,
                  }}
                >
                  <span className="text-5xl">🌟</span>
                </div>

                <h3 className="font-medium mb-1" style={{ color: SHELL_COLORS.mom.text }}>
                  {shells.find((s) => s.id === selectedShell)?.label || '记忆贴纸'}
                </h3>
                <p className="text-xs text-gray-400">
                  一段被洗净的美好时光
                </p>

                <motion.button
                  onClick={() => setSelectedShell(null)}
                  className="mt-4 px-6 py-2 rounded-full text-sm"
                  style={{
                    background: `${SHELL_COLORS.mom.accent}30`,
                    color: SHELL_COLORS.mom.text,
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  收好
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 新手引导 */}
      <Onboarding mode="mom" onComplete={() => {}} />
    </BeachBackground>
  );
}
