// frontend/components/CompanionInterface.tsx
/**
 * Soulful Companion 核心交互组件
 * 整合所有子组件，实现无对话框的情感交互界面
 */

'use client';

import Link from 'next/link';
import { useCompanion } from '@/hooks/useCompanion';
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

      {/* 返回按钮 */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-30 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-stone-500 hover:text-stone-700 hover:bg-white transition-all shadow-sm"
      >
        ← 返回首页
      </Link>

      {/* 主内容区域 */}
      <main className="flex-1 flex flex-col relative z-10 pt-20 pb-32">
        {/* 顶部标题 */}
        <header className="text-center py-8">
          <h1 className="text-2xl font-light text-stone-500 tracking-wide">
            Soulful Companion
          </h1>
          <p className="text-sm text-stone-400 mt-2">
            在这一刻，你并不孤单
          </p>
        </header>

        {/* 响应文字 */}
        <ResponseText text={response?.text || null} isLoading={isLoading} />

        {/* 错误提示 */}
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
      </main>

      {/* 输入区域 */}
      <InputArea onSend={send} isLoading={isLoading} />
    </div>
  );
}
