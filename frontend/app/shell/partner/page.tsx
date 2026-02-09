// frontend/app/shell/partner/page.tsx
/**
 * 伴侣主沙滩页 - 守护之滨
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
  ConchMemoryInjector,
} from '../../../components/shell';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../../lib/design-tokens';
import type { ShellState } from '../../../components/shell';

interface TaskShell {
  id: string;
  state: ShellState;
  label: string;
  position: { x: number; y: number };
  taskType: 'regular' | 'wish';
  description?: string;
}

export default function PartnerBeachPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [shells, setShells] = useState<TaskShell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [wishCount, setWishCount] = useState(0);

  // 加载任务贝壳
  useEffect(() => {
    const loadShells = async () => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 500));

      // 占位数据 - 泥泞贝壳（待完成任务）
      const mockShells: TaskShell[] = [
        {
          id: '1',
          state: 'muddy',
          label: '陪她散步',
          position: { x: 20, y: 40 },
          taskType: 'regular',
          description: '陪她在小区里走 15 分钟',
        },
        {
          id: '2',
          state: 'muddy',
          label: '按摩放松',
          position: { x: 50, y: 35 },
          taskType: 'regular',
          description: '帮她按摩肩颈 10 分钟',
        },
        {
          id: '3',
          state: 'golden',
          label: '她的心愿',
          position: { x: 75, y: 45 },
          taskType: 'wish',
          description: '想吃草莓蛋糕',
        },
        {
          id: '4',
          state: 'clean',
          label: '已完成',
          position: { x: 35, y: 60 },
          taskType: 'regular',
        },
      ];

      setShells(mockShells);
      setWishCount(2); // 模拟未读心愿数
      setIsLoading(false);
    };

    loadShells();
  }, []);

  const handleShellClick = (shellId: string) => {
    const shell = shells.find((s) => s.id === shellId);
    if (!shell) return;

    if (shell.state === 'muddy' || shell.state === 'golden') {
      // 未完成任务 - 进入任务详情页
      router.push(`/shell/partner/task/${shellId}`);
    }
  };

  const handleInjectMemory = async (content: string, imageFile?: File) => {
    console.log('注入记忆:', content, imageFile);
    // TODO: 调用 API 注入记忆
  };

  const handleWishSeaClick = () => {
    router.push('/shell/partner/wish-sea');
  };

  return (
    <BeachBackground theme="night">
      {/* 顶部栏 */}
      <TopHeader
        title="守护之滨"
        theme="night"
        avatarUrl={user?.avatar_url}
        hasNotification={wishCount > 0}
        onNotificationClick={handleWishSeaClick}
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
            style={{ color: `${SHELL_COLORS.partner.text}CC` }}
          >
            濯洗尘埃，守望她的流光
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
                🌙
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
                  size={shell.taskType === 'wish' ? 'large' : 'medium'}
                  onClick={() => handleShellClick(shell.id)}
                />

                {/* 任务类型标记 */}
                {shell.taskType === 'wish' && shell.state !== 'clean' && (
                  <motion.div
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    style={{
                      background: SHELL_COLORS.shell.golden,
                      boxShadow: `0 0 10px ${SHELL_COLORS.shell.glow}`,
                    }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    💝
                  </motion.div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* 右侧功能按钮 */}
        <motion.div
          className="fixed right-6 bottom-28 z-20 flex flex-col gap-4"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
        >
          {/* 心愿海域入口 */}
          <motion.button
            onClick={handleWishSeaClick}
            className="relative w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-2xl">🍾</span>
            {wishCount > 0 && (
              <motion.span
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {wishCount}
              </motion.span>
            )}
          </motion.button>

          {/* 海螺记忆注入 */}
          <ConchMemoryInjector onInject={handleInjectMemory} />
        </motion.div>
      </main>
    </BeachBackground>
  );
}
