// frontend/app/shell/partner/task/[id]/page.tsx
/**
 * 濯贝任务页 - 任务详情与完成
 */

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useAuth } from '../../../../../contexts/AuthContext';
import {
  BeachBackground,
  TopHeader,
  Shell,
} from '../../../../../components/shell';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../../../../lib/design-tokens';
import type { ShellState } from '../../../../../components/shell';

interface TaskDetail {
  id: string;
  title: string;
  description: string;
  type: 'regular' | 'wish';
  state: ShellState;
  momMessage?: string;
  stickerUrl?: string;
}

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // 滑动确认
  const sliderX = useMotionValue(0);
  const sliderWidth = 280;
  const sliderThreshold = sliderWidth * 0.7;
  const sliderProgress = useTransform(sliderX, [0, sliderWidth - 60], [0, 1]);
  const sliderOpacity = useTransform(sliderProgress, [0, 0.5, 1], [1, 0.5, 0]);

  useEffect(() => {
    const loadTask = async () => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 300));

      // 模拟任务数据
      const mockTask: TaskDetail = {
        id,
        title: id === '3' ? '她的心愿' : '陪她散步',
        description: id === '3' ? '想吃草莓蛋糕' : '陪她在小区里走 15 分钟',
        type: id === '3' ? 'wish' : 'regular',
        state: id === '3' ? 'golden' : 'muddy',
        momMessage: id === '3' ? '最近好想吃甜的...' : undefined,
      };

      setTask(mockTask);
      setIsLoading(false);
    };

    loadTask();
  }, [id]);

  const handleSlideEnd = () => {
    if (sliderX.get() >= sliderThreshold) {
      completeTask();
    } else {
      sliderX.set(0);
    }
  };

  const completeTask = async () => {
    setIsCompleting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsCompleting(false);
    setShowResult(true);
  };

  const handleDone = () => {
    router.push('/shell/partner');
  };

  if (isLoading || !task) {
    return (
      <BeachBackground theme="night">
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-4xl"
          >
            🌙
          </motion.div>
        </div>
      </BeachBackground>
    );
  }

  return (
    <BeachBackground theme="night">
      <TopHeader
        title="濯贝任务"
        theme="night"
        showBack
        avatarUrl={user?.avatar_url}
      />

      <main className="relative min-h-[calc(100vh-60px)] px-4 pt-8 pb-8">
        {/* 完成动画 */}
        <AnimatePresence>
          {isCompleting && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: `${SHELL_COLORS.partner.background}F5` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center">
                <motion.div
                  animate={{
                    rotateY: [0, 180, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 1.5, ease: 'easeInOut' }}
                >
                  <Shell id="completing" state="muddy" size="large" />
                </motion.div>

                <motion.p
                  className="mt-6 text-sm"
                  style={{ color: SHELL_COLORS.partner.text }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  正在濯洗这枚贝壳...
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 结果展示 */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

              <motion.div
                className="relative rounded-3xl p-8 shadow-xl text-center max-w-sm"
                style={{
                  background: `linear-gradient(180deg, ${SHELL_COLORS.partner.background} 0%, #0D1B2A 100%)`,
                }}
                initial={{ scale: 0.5, y: 100 }}
                animate={{ scale: 1, y: 0 }}
                transition={SPRING_CONFIGS.bouncy}
              >
                {/* 洁白贝壳 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Shell id="result" state="clean" size="large" isOpen />
                </motion.div>

                {/* 妈妈的贴纸 */}
                <motion.div
                  className="w-24 h-24 mx-auto my-4 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${SHELL_COLORS.mom.accent} 0%, #FFA726 100%)`,
                    boxShadow: `0 8px 32px rgba(255, 183, 77, 0.3)`,
                  }}
                  initial={{ opacity: 0, y: 30, scale: 0 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.5, ...SPRING_CONFIGS.bouncy }}
                >
                  <span className="text-4xl">💖</span>
                </motion.div>

                <motion.h3
                  className="text-lg font-medium mb-2"
                  style={{ color: SHELL_COLORS.partner.text }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  守护完成
                </motion.h3>

                <motion.p
                  className="text-sm mb-6"
                  style={{ color: `${SHELL_COLORS.partner.text}99` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  因为你的守护，
                  <br />
                  她找回了这一段流光
                </motion.p>

                <motion.button
                  onClick={handleDone}
                  className="px-8 py-3 rounded-full text-sm font-medium"
                  style={{
                    background: `linear-gradient(135deg, ${SHELL_COLORS.partner.accent} 0%, #5C6BC0 100%)`,
                    color: 'white',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  whileTap={{ scale: 0.95 }}
                >
                  返回沙滩
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 任务内容 */}
        {!isCompleting && !showResult && (
          <>
            {/* 贝壳展示 */}
            <motion.div
              className="flex justify-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Shell
                id={task.id}
                state={task.state}
                size="large"
              />
            </motion.div>

            {/* 任务信息卡片 */}
            <motion.div
              className="rounded-3xl p-6 mb-8"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {/* 任务类型标签 */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-3 py-1 rounded-full text-xs"
                  style={{
                    background: task.type === 'wish'
                      ? `${SHELL_COLORS.shell.golden}30`
                      : 'rgba(255,255,255,0.1)',
                    color: task.type === 'wish'
                      ? SHELL_COLORS.shell.golden
                      : SHELL_COLORS.partner.text,
                  }}
                >
                  {task.type === 'wish' ? '💝 她的心愿' : '🐚 日常守护'}
                </span>
              </div>

              {/* 任务标题 */}
              <h2
                className="text-xl font-medium mb-2"
                style={{ color: SHELL_COLORS.partner.text }}
              >
                {task.title}
              </h2>

              {/* 任务描述 */}
              <p
                className="text-sm mb-4"
                style={{ color: `${SHELL_COLORS.partner.text}99` }}
              >
                {task.description}
              </p>

              {/* 妈妈的话 */}
              {task.momMessage && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: `${SHELL_COLORS.mom.background}20`,
                    borderLeft: `3px solid ${SHELL_COLORS.mom.accent}`,
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: `${SHELL_COLORS.partner.text}60` }}>
                    她说:
                  </p>
                  <p className="text-sm italic" style={{ color: SHELL_COLORS.partner.text }}>
                    &ldquo;{task.momMessage}&rdquo;
                  </p>
                </div>
              )}
            </motion.div>

            {/* 滑动确认 */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div
                className="relative rounded-full overflow-hidden"
                style={{
                  width: sliderWidth,
                  height: 60,
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* 提示文字 */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ opacity: sliderOpacity }}
                >
                  <span
                    className="text-sm"
                    style={{ color: `${SHELL_COLORS.partner.text}80` }}
                  >
                    滑动确认完成 →
                  </span>
                </motion.div>

                {/* 滑块 */}
                <motion.div
                  className="absolute left-1 top-1 w-14 h-14 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                  style={{
                    background: `linear-gradient(135deg, ${SHELL_COLORS.partner.accent} 0%, #5C6BC0 100%)`,
                    x: sliderX,
                  }}
                  drag="x"
                  dragConstraints={{ left: 0, right: sliderWidth - 60 }}
                  dragElastic={0}
                  onDragEnd={handleSlideEnd}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-xl">🐚</span>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </main>
    </BeachBackground>
  );
}
