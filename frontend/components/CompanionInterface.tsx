// frontend/components/CompanionInterface.tsx
/**
 * Soulful Companion 核心交互组件
 * 整合所有子组件，实现无对话框的情感交互界面
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCompanion } from '../hooks/useCompanion';
import { AmbientCanvas } from './AmbientCanvas';
import { ResponseText } from './ResponseText';
import { InputArea } from './InputArea';

export function CompanionInterface() {
  const {
    isLoading,
    response,
    visualState,
    error,
    send,
    isRippling,
  } = useCompanion();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col relative overflow-hidden">
      {/* 动态背景画布 */}
      <AmbientCanvas visualState={visualState} isRippling={isRippling} />

      {/* 顶部标题栏 */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200/50"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-stone-500 hover:text-stone-700 transition-colors"
          >
            ← 首页
          </Link>
          <span className="text-2xl">💝</span>
          <span className="text-lg font-medium text-stone-700">心灵港湾</span>
        </div>
      </motion.header>

      {/* 主内容区域 */}
      <main className="flex-1 flex flex-col relative z-10 pb-32">
        {/* 副标题 */}
        <div className="text-center py-6">
          <p className="text-sm text-stone-400">
            在这一刻，你并不孤单
          </p>
        </div>

        {/* 响应文字 */}
        <ResponseText text={response?.text || null} isLoading={isLoading} />

        {/* 错误提示 */}
        {error && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
      </main>

      {/* 输入区域 */}
      <InputArea onSend={send} isLoading={isLoading} />
    </div>
  );
}
