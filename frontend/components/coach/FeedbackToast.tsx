// frontend/components/coach/FeedbackToast.tsx
/**
 * 实时反馈提示组件
 * 展示训练过程中的各类反馈信息
 * 支持不同类型的反馈样式和动画
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";

// 反馈类型
export type FeedbackType =
  | "correction"
  | "safety_warning"
  | "encouragement"
  | "info";

export interface Feedback {
  text: string;
  type: FeedbackType;
  audio?: string;
}

// 反馈样式配置
const FEEDBACK_STYLES: Record<
  FeedbackType,
  {
    bg: string;
    border: string;
    text: string;
    icon: string;
    glow: string;
  }
> = {
  correction: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    icon: "⚡",
    glow: "shadow-amber-200/50",
  },
  safety_warning: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    icon: "⚠️",
    glow: "shadow-rose-200/50",
  },
  encouragement: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    icon: "✨",
    glow: "shadow-emerald-200/50",
  },
  info: {
    bg: "bg-stone-50",
    border: "border-stone-200",
    text: "text-stone-700",
    icon: "💡",
    glow: "shadow-stone-200/50",
  },
};

export interface FeedbackToastProps {
  feedback: Feedback | null;
  position?: "top" | "bottom" | "center";
  autoDismiss?: boolean;
  dismissDelay?: number;
  showAudioIndicator?: boolean;
  onDismiss?: () => void;
}

export function FeedbackToast({
  feedback,
  position = "bottom",
  autoDismiss = false,
  dismissDelay = 5000,
  showAudioIndicator = true,
  onDismiss,
}: FeedbackToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    if (feedback) {
      // 使用 requestAnimationFrame 避免同步 setState 警告
      const rafId = requestAnimationFrame(() => {
        setIsVisible(true);
        setIsPlayingAudio(!!feedback.audio);
      });

      if (autoDismiss) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          onDismiss?.();
        }, dismissDelay);
        return () => {
          cancelAnimationFrame(rafId);
          clearTimeout(timer);
        };
      }
      return () => cancelAnimationFrame(rafId);
    } else {
      const rafId = requestAnimationFrame(() => {
        setIsVisible(false);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [feedback, autoDismiss, dismissDelay, onDismiss]);

  // 模拟音频播放结束
  useEffect(() => {
    if (isPlayingAudio) {
      const timer = setTimeout(() => setIsPlayingAudio(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isPlayingAudio]);

  const positionClasses = {
    top: "top-4",
    bottom: "bottom-4",
    center: "top-1/2 -translate-y-1/2",
  };

  const style = feedback
    ? FEEDBACK_STYLES[feedback.type]
    : FEEDBACK_STYLES.info;

  return (
    <AnimatePresence>
      {isVisible && feedback && (
        <motion.div
          initial={{
            opacity: 0,
            y: position === "top" ? -20 : 20,
            scale: 0.95,
          }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: position === "top" ? -20 : 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`
            absolute left-4 right-4 ${positionClasses[position]}
            ${style.bg} ${style.border} border
            rounded-2xl p-4 shadow-lg ${style.glow}
            backdrop-blur-sm z-30
          `}
        >
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <motion.span
              className="text-xl flex-shrink-0"
              animate={
                feedback.type === "encouragement" ? { scale: [1, 1.2, 1] } : {}
              }
              transition={{
                duration: 0.5,
                repeat: feedback.type === "encouragement" ? 2 : 0,
              }}
            >
              {style.icon}
            </motion.span>

            {/* 文本内容 */}
            <div className="flex-1 min-w-0">
              <motion.p
                key={feedback.text}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`${style.text} text-base leading-relaxed`}
              >
                {feedback.text}
              </motion.p>
            </div>

            {/* 音频指示器 */}
            {showAudioIndicator && feedback.audio && (
              <div className="flex-shrink-0">
                <AudioIndicator isPlaying={isPlayingAudio} />
              </div>
            )}
          </div>

          {/* 安全警告额外提示 */}
          {feedback.type === "safety_warning" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-2 pt-2 border-t border-rose-200"
            >
              <p className="text-xs text-rose-600">
                请注意安全，如有不适请立即停止
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 音频播放指示器
function AudioIndicator({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-center gap-0.5 h-5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1 bg-[#e8a4b8] rounded-full"
          animate={
            isPlaying
              ? {
                  height: ["8px", "16px", "8px"],
                }
              : { height: "8px" }
          }
          transition={{
            duration: 0.5,
            repeat: isPlaying ? Infinity : 0,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// 紧凑版反馈显示（用于侧边栏）
export interface FeedbackPanelProps {
  feedback: Feedback | null;
  className?: string;
}

export function FeedbackPanel({
  feedback,
  className = "",
}: FeedbackPanelProps) {
  const style = feedback
    ? FEEDBACK_STYLES[feedback.type]
    : FEEDBACK_STYLES.info;

  return (
    <div
      className={`
        ${style.bg} backdrop-blur-sm rounded-2xl p-4 min-h-[100px]
        border ${style.border} transition-colors duration-300
        ${className}
      `}
    >
      <AnimatePresence mode="wait">
        {feedback ? (
          <motion.div
            key={feedback.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2"
          >
            <span className="text-lg">{style.icon}</span>
            <p className={`${style.text} text-base leading-relaxed`}>
              {feedback.text}
            </p>
          </motion.div>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-stone-400 text-base"
          >
            准备开始...
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// 反馈历史记录组件
export interface FeedbackHistoryProps {
  feedbacks: Array<Feedback & { timestamp: number }>;
  maxItems?: number;
}

export function FeedbackHistory({
  feedbacks,
  maxItems = 5,
}: FeedbackHistoryProps) {
  const displayedFeedbacks = feedbacks.slice(-maxItems).reverse();

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-stone-500">反馈记录</h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {displayedFeedbacks.length === 0 ? (
          <p className="text-xs text-stone-400">暂无反馈</p>
        ) : (
          displayedFeedbacks.map((fb, index) => {
            const style = FEEDBACK_STYLES[fb.type];
            return (
              <motion.div
                key={fb.timestamp}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  text-xs p-2 rounded-lg ${style.bg} ${style.border} border
                  flex items-center gap-2
                `}
              >
                <span>{style.icon}</span>
                <span className={style.text}>{fb.text}</span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// 快速反馈弹出（用于得分变化）
export interface ScorePopupProps {
  score: number;
  previousScore: number | null;
  show: boolean;
}

export function ScorePopup({ score, previousScore, show }: ScorePopupProps) {
  const diff = previousScore !== null ? score - previousScore : 0;
  const isPositive = diff > 0;

  return (
    <AnimatePresence>
      {show && Math.abs(diff) >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            px-4 py-2 rounded-full font-bold text-lg
            ${isPositive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}
            shadow-lg
          `}
        >
          {isPositive ? "+" : ""}
          {diff}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 阶段切换提示
export interface PhaseTransitionProps {
  phase: string;
  show: boolean;
}

export function PhaseTransition({ phase, show }: PhaseTransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-40"
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="bg-white/90 rounded-3xl px-8 py-6 text-center shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-4xl mb-2"
            >
              {phase === "吸气"
                ? "🌬️"
                : phase === "呼气"
                  ? "💨"
                  : phase === "保持"
                    ? "⏸️"
                    : "🧘"}
            </motion.div>
            <h2 className="text-2xl font-medium text-stone-700">{phase}</h2>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
