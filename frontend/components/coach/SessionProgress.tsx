// frontend/components/coach/SessionProgress.tsx
/**
 * 训练进度组件
 * 展示当前训练的进度、组数、次数和得分
 */

'use client';

import { motion } from 'framer-motion';

export interface SessionProgressProps {
  progress: number; // 0-100
  currentSet: number;
  totalSets: number;
  currentRep: number;
  totalReps: number;
  currentPhase: string;
  score: number | null;
}

// 得分颜色映射
function getScoreColor(score: number | null): string {
  if (score === null) return 'bg-stone-500';
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getScoreTextColor(score: number | null): string {
  if (score === null) return 'text-stone-500';
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-rose-600';
}

export function SessionProgress({
  progress,
  currentSet,
  totalSets,
  currentRep,
  totalReps,
  currentPhase,
  score,
}: SessionProgressProps) {
  return (
    <div className="space-y-4">
      {/* 进度条 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-stone-600">训练进度</span>
          <span className="text-sm text-stone-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-stone-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#e8a4b8] to-[#8bc99b] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-sm text-stone-500 mt-2">
          <span>第 {currentSet}/{totalSets} 组</span>
          <span>第 {currentRep}/{totalReps} 次</span>
        </div>
      </div>

      {/* 当前阶段和得分 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 当前阶段 */}
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <span className="text-xs text-stone-400 block mb-1">当前阶段</span>
          <motion.span
            key={currentPhase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-medium text-stone-700"
          >
            {currentPhase}
          </motion.span>
        </motion.div>

        {/* 实时得分 */}
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <span className="text-xs text-stone-400 block mb-1">实时得分</span>
          <motion.span
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`text-2xl font-bold ${getScoreTextColor(score)}`}
          >
            {score ?? '--'}
          </motion.span>
        </motion.div>
      </div>
    </div>
  );
}

// 紧凑版进度显示（用于视频覆盖层）
export function SessionProgressOverlay({
  currentPhase,
  score,
}: Pick<SessionProgressProps, 'currentPhase' | 'score'>) {
  return (
    <div className="absolute inset-x-0 top-0 p-4 flex justify-between pointer-events-none">
      {/* 当前阶段 */}
      <motion.div
        key={currentPhase}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-black/70 text-white px-3 py-2 rounded-lg backdrop-blur-sm"
      >
        {currentPhase}
      </motion.div>

      {/* 实时得分 */}
      <motion.div
        key={score}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        className={`px-3 py-2 rounded-lg backdrop-blur-sm text-white ${getScoreColor(score)}`}
      >
        <span className="text-xl font-bold">{score ?? '--'}</span>
        <span className="text-xs ml-1">分</span>
      </motion.div>
    </div>
  );
}

// 环形进度指示器
interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function CircularProgress({
  progress,
  size = 60,
  strokeWidth = 4,
  color = '#e8a4b8',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景环 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e7e5e4"
          strokeWidth={strokeWidth}
        />
        {/* 进度环 */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress / 100) }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-medium text-stone-700">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
