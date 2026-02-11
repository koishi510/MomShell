// frontend/components/echo/partner/ClarityMeter.tsx
/**
 * 清晰度仪表盘组件
 */

"use client";

import { motion } from "framer-motion";
import { ECHO_COLORS } from "../../../lib/design-tokens";
import type { WindowClarity } from "../../../types/echo";

interface ClarityMeterProps {
  clarity: WindowClarity | null;
}

export function ClarityMeter({ clarity }: ClarityMeterProps) {
  const level = clarity?.clarity_level || 0;

  // 根据清晰度确定状态
  const getStatus = () => {
    if (level < 30) return { label: "模糊", color: "#EF4444" };
    if (level < 60) return { label: "朦胧", color: "#F59E0B" };
    if (level < 90) return { label: "清晰", color: "#10B981" };
    return { label: "透明", color: "#8B5CF6" };
  };

  const status = getStatus();

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium" style={{ color: ECHO_COLORS.partner.text }}>
          窗户清晰度
        </h3>
        <span className="text-2xl font-bold" style={{ color: status.color }}>
          {level}%
        </span>
      </div>

      {/* 进度条 */}
      <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: status.color }}
          initial={{ width: 0 }}
          animate={{ width: `${level}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* 状态标签 */}
      <div className="flex items-center justify-center mb-4">
        <span
          className="px-3 py-1 rounded-full text-sm font-medium"
          style={{
            backgroundColor: status.color + "30",
            color: status.color,
          }}
        >
          {status.label}
        </span>
      </div>

      {/* 详细分解 */}
      {clarity && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <p style={{ color: ECHO_COLORS.partner.text }}>
              {clarity.breakdown.base_clarity}%
            </p>
            <p
              className="text-xs opacity-60"
              style={{ color: ECHO_COLORS.partner.text }}
            >
              确认任务
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <p style={{ color: ECHO_COLORS.partner.text }}>
              {clarity.breakdown.task_clarity}%
            </p>
            <p
              className="text-xs opacity-60"
              style={{ color: ECHO_COLORS.partner.text }}
            >
              完成任务
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <p style={{ color: ECHO_COLORS.partner.text }}>
              +{clarity.streak_bonus}%
            </p>
            <p
              className="text-xs opacity-60"
              style={{ color: ECHO_COLORS.partner.text }}
            >
              连续奖励
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <p style={{ color: ECHO_COLORS.partner.text }}>
              +{clarity.level_bonus}%
            </p>
            <p
              className="text-xs opacity-60"
              style={{ color: ECHO_COLORS.partner.text }}
            >
              等级加成
            </p>
          </div>
        </div>
      )}

      {/* 今日统计 */}
      {clarity && (
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-around">
          <div className="text-center">
            <p
              className="text-lg font-bold"
              style={{ color: ECHO_COLORS.partner.text }}
            >
              {clarity.tasks_completed_today}
            </p>
            <p
              className="text-xs opacity-60"
              style={{ color: ECHO_COLORS.partner.text }}
            >
              今日完成
            </p>
          </div>
          <div className="text-center">
            <p
              className="text-lg font-bold"
              style={{ color: ECHO_COLORS.partner.text }}
            >
              {clarity.tasks_confirmed_today}
            </p>
            <p
              className="text-xs opacity-60"
              style={{ color: ECHO_COLORS.partner.text }}
            >
              已确认
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
