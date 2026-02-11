// frontend/components/echo/mom/MeditationTimer.tsx
/**
 * 冥想计时器组件 - 包含呼吸引导
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ECHO_COLORS } from "../../../lib/design-tokens";
import type { MeditationPhase } from "../../../types/echo";
import {
  MEDITATION_PHASE_LABELS,
  BREATHING_RHYTHM,
  BREATHING_CYCLE_SECONDS,
} from "../../../types/echo";

interface MeditationTimerProps {
  targetDurationMinutes: number;
  breathingRhythm: Record<MeditationPhase, number>;
  onTimeUpdate: (seconds: number) => void;
  onPhaseChange: (phase: MeditationPhase) => void;
  onComplete: () => void;
}

export function MeditationTimer({
  targetDurationMinutes,
  breathingRhythm,
  onTimeUpdate,
  onPhaseChange,
  onComplete,
}: MeditationTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<MeditationPhase>("inhale");
  const [phaseProgress, setPhaseProgress] = useState(0); // 0-1

  const targetSeconds = targetDurationMinutes * 60;
  const cycleSeconds = BREATHING_CYCLE_SECONDS;

  // 呼吸阶段序列
  const phases: MeditationPhase[] = ["inhale", "hold", "exhale"];
  const phaseDurations = phases.map(
    (p) => breathingRhythm[p] || BREATHING_RHYTHM[p],
  );

  // 计算当前在呼吸周期中的位置
  const calculatePhase = useCallback(
    (totalSeconds: number) => {
      const cyclePosition = totalSeconds % cycleSeconds;
      let accumulated = 0;

      for (let i = 0; i < phases.length; i++) {
        const duration = phaseDurations[i];
        if (cyclePosition < accumulated + duration) {
          const progress = (cyclePosition - accumulated) / duration;
          return { phase: phases[i], progress };
        }
        accumulated += duration;
      }

      return { phase: "exhale" as MeditationPhase, progress: 1 };
    },
    [cycleSeconds, phaseDurations],
  );

  // 定时器只更新本地状态
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const newValue = prev + 0.1; // 更新频率 100ms

        if (newValue >= targetSeconds) {
          clearInterval(interval);
          return targetSeconds;
        }

        // 更新呼吸阶段（本地状态）
        const { phase, progress } = calculatePhase(newValue);
        setCurrentPhase(phase);
        setPhaseProgress(progress);

        return newValue;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [targetSeconds, calculatePhase]);

  // 单独的 useEffect 处理父组件回调，避免在 setState 内部调用
  useEffect(() => {
    onTimeUpdate(Math.floor(elapsedSeconds));
  }, [elapsedSeconds, onTimeUpdate]);

  useEffect(() => {
    onPhaseChange(currentPhase);
  }, [currentPhase, onPhaseChange]);

  useEffect(() => {
    if (elapsedSeconds >= targetSeconds && targetSeconds > 0) {
      onComplete();
    }
  }, [elapsedSeconds, targetSeconds, onComplete]);

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 圆环进度
  const progress = elapsedSeconds / targetSeconds;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // 呼吸圆圈大小
  const breathCircleScale =
    currentPhase === "inhale"
      ? 0.6 + phaseProgress * 0.4 // 0.6 -> 1.0
      : currentPhase === "hold"
        ? 1.0 // 保持
        : 1.0 - phaseProgress * 0.4; // 1.0 -> 0.6

  // 阶段颜色
  const phaseColors = {
    inhale: ECHO_COLORS.breathing.inhale,
    hold: ECHO_COLORS.breathing.hold,
    exhale: ECHO_COLORS.breathing.exhale,
  };

  return (
    <div className="flex flex-col items-center">
      {/* 主圆环 */}
      <div className="relative w-72 h-72">
        {/* 背景圆环 */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="144"
            cy="144"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="8"
          />
          {/* 进度圆环 */}
          <motion.circle
            cx="144"
            cy="144"
            r={radius}
            fill="none"
            stroke={phaseColors[currentPhase]}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 0.1s linear, stroke 0.3s ease",
            }}
          />
        </svg>

        {/* 呼吸圆圈 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="rounded-full"
            style={{
              backgroundColor: phaseColors[currentPhase] + "40",
              boxShadow: `0 0 60px ${phaseColors[currentPhase]}60`,
            }}
            animate={{
              scale: breathCircleScale,
              width: 160,
              height: 160,
            }}
            transition={{
              type: "tween",
              ease: "easeInOut",
            }}
          />
        </div>

        {/* 时间显示 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.p
            className="text-4xl font-light text-white mb-2"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {formatTime(elapsedSeconds)}
          </motion.p>
          <p className="text-white/60 text-sm">/ {formatTime(targetSeconds)}</p>
        </div>
      </div>

      {/* 呼吸提示 */}
      <motion.div
        key={currentPhase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 text-center"
      >
        <p
          className="text-2xl font-medium"
          style={{ color: phaseColors[currentPhase] }}
        >
          {MEDITATION_PHASE_LABELS[currentPhase]}
        </p>
        <p className="text-white/60 text-sm mt-1">
          {currentPhase === "inhale" && "缓慢深吸..."}
          {currentPhase === "hold" && "保持..."}
          {currentPhase === "exhale" && "慢慢呼出..."}
        </p>
      </motion.div>

      {/* 呼吸节奏指示器 */}
      <div className="flex gap-2 mt-6">
        {phases.map((phase) => (
          <div
            key={phase}
            className={`w-3 h-3 rounded-full transition-all ${
              currentPhase === phase ? "scale-125" : "opacity-40"
            }`}
            style={{ backgroundColor: phaseColors[phase] }}
          />
        ))}
      </div>
    </div>
  );
}
