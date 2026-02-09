// frontend/app/echo/partner/page.tsx
/**
 * 爸爸模式主页 - 同步守护
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthGuard } from '../../../components/AuthGuard';
import { ECHO_COLORS, GLASS_STYLES, SPRING_CONFIGS } from '../../../lib/design-tokens';
import {
  getEchoStatus,
  getWindowClarity,
  injectMemory,
} from '../../../lib/api/echo';
import { getDailyTasks, completeTask } from '../../../lib/api/guardian';
import { BlurredMomView } from '../../../components/echo/partner/BlurredMomView';
import { ClarityMeter } from '../../../components/echo/partner/ClarityMeter';
import { MemoryInjector } from '../../../components/echo/partner/MemoryInjector';
import type { EchoStatus, WindowClarity, MemoryInjectRequest } from '../../../types/echo';
import type { DailyTask } from '../../../types/guardian';

function PartnerModePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EchoStatus | null>(null);
  const [clarity, setClarity] = useState<WindowClarity | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [showMemoryInjector, setShowMemoryInjector] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const statusData = await getEchoStatus();
      setStatus(statusData);

      if (!statusData.has_binding) {
        // 没有绑定，需要先去绑定
        return;
      }

      // 分别获取数据并处理各自的错误
      try {
        const clarityData = await getWindowClarity();
        setClarity(clarityData);
      } catch (clarityError) {
        console.error('Failed to load window clarity:', clarityError);
        // 使用默认值
        setClarity({
          clarity_level: 0,
          tasks_completed_today: 0,
          tasks_confirmed_today: 0,
          streak_bonus: 0,
          level_bonus: 0,
          breakdown: {
            base_clarity: 0,
            task_clarity: 0,
            streak_bonus: 0,
            level_bonus: 0,
          },
        });
      }

      try {
        const tasksData = await getDailyTasks();
        setTasks(tasksData);
      } catch (tasksError) {
        console.error('Failed to load daily tasks:', tasksError);
        // 使用空数组
        setTasks([]);
      }
    } catch (error) {
      console.error('Failed to load partner mode data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
      // 重新加载数据
      await loadData();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleInjectMemory = async (data: MemoryInjectRequest) => {
    setSubmitting(true);
    try {
      await injectMemory(data);
      setShowMemoryInjector(false);
      // 可以显示成功提示
    } catch (error) {
      console.error('Failed to inject memory:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${ECHO_COLORS.partner.gradient[0]} 0%, ${ECHO_COLORS.partner.gradient[1]} 100%)`,
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg"
          style={{ color: ECHO_COLORS.partner.text }}
        >
          正在连接守护空间...
        </motion.div>
      </div>
    );
  }

  // 未绑定状态
  if (!status?.has_binding) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{
          background: `linear-gradient(135deg, ${ECHO_COLORS.partner.gradient[0]} 0%, ${ECHO_COLORS.partner.gradient[1]} 100%)`,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <span className="text-6xl mb-6 block">🔗</span>
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: ECHO_COLORS.partner.text }}
          >
            尚未绑定伴侣
          </h2>
          <p
            className="opacity-80 mb-6"
            style={{ color: ECHO_COLORS.partner.text }}
          >
            请先在 Guardian 页面完成伴侣绑定
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/guardian')}
            className="px-6 py-3 rounded-xl font-medium"
            style={{
              backgroundColor: ECHO_COLORS.partner.accent,
              color: ECHO_COLORS.partner.text,
            }}
          >
            前往绑定
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: `linear-gradient(135deg, ${ECHO_COLORS.partner.gradient[0]} 0%, ${ECHO_COLORS.partner.gradient[1]} 100%)`,
      }}
    >
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            style={{ color: ECHO_COLORS.partner.text }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1
            className="text-xl font-bold"
            style={{ color: ECHO_COLORS.partner.text }}
          >
            同步守护
          </h1>
          <button
            onClick={() => setShowMemoryInjector(true)}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            style={{ color: ECHO_COLORS.partner.text }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      {/* 窗户视图 */}
      <section className="px-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md rounded-3xl p-4"
        >
          <BlurredMomView clarityLevel={clarity?.clarity_level || 0} />
        </motion.div>
      </section>

      {/* 清晰度仪表 */}
      <section className="px-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ClarityMeter clarity={clarity} />
        </motion.div>
      </section>

      {/* 今日任务 */}
      <section className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-4"
        >
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: ECHO_COLORS.partner.text }}
          >
            今日任务
          </h2>

          {tasks.length === 0 ? (
            <p
              className="text-center opacity-70 py-4"
              style={{ color: ECHO_COLORS.partner.text }}
            >
              今天没有待完成的任务
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  className={`p-4 rounded-xl transition-colors ${
                    task.status === 'confirmed'
                      ? 'bg-green-500/20'
                      : task.status === 'completed'
                      ? 'bg-blue-500/20'
                      : 'bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3
                        className="font-medium"
                        style={{ color: ECHO_COLORS.partner.text }}
                      >
                        {task.template.title}
                      </h3>
                      <p
                        className="text-sm opacity-70"
                        style={{ color: ECHO_COLORS.partner.text }}
                      >
                        {task.template.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            task.template.difficulty === 'easy'
                              ? 'bg-green-500/30 text-green-200'
                              : task.template.difficulty === 'medium'
                              ? 'bg-yellow-500/30 text-yellow-200'
                              : 'bg-red-500/30 text-red-200'
                          }`}
                        >
                          +{task.template.points}分
                        </span>
                        {task.status === 'confirmed' && (
                          <span className="text-xs text-green-300">
                            {task.mom_feedback}
                          </span>
                        )}
                      </div>
                    </div>

                    {task.status === 'available' && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCompleteTask(task.id)}
                        className="px-4 py-2 rounded-lg font-medium"
                        style={{
                          backgroundColor: ECHO_COLORS.partner.accent,
                          color: ECHO_COLORS.partner.text,
                        }}
                      >
                        完成
                      </motion.button>
                    )}

                    {task.status === 'completed' && (
                      <span
                        className="text-sm opacity-70"
                        style={{ color: ECHO_COLORS.partner.text }}
                      >
                        待确认
                      </span>
                    )}

                    {task.status === 'confirmed' && (
                      <span className="text-2xl">✓</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <p
            className="text-center text-sm opacity-60 mt-4"
            style={{ color: ECHO_COLORS.partner.text }}
          >
            完成任务可以提高窗户清晰度
          </p>
        </motion.div>
      </section>

      {/* 记忆注入模态框 */}
      <AnimatePresence>
        {showMemoryInjector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setShowMemoryInjector(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <MemoryInjector
                currentClarity={clarity?.clarity_level || 0}
                onSubmit={handleInjectMemory}
                onCancel={() => setShowMemoryInjector(false)}
                submitting={submitting}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EchoPartnerPage() {
  return (
    <AuthGuard>
      <PartnerModePage />
    </AuthGuard>
  );
}
