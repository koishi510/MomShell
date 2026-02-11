// frontend/components/coach/AchievementBadge.tsx
/**
 * 成就徽章组件
 * 展示用户获得的成就和锁定的成就
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

// 成就图标映射
const ACHIEVEMENT_ICONS: Record<string, string> = {
  footprints: "👣",
  fire: "🔥",
  "calendar-check": "📅",
  trophy: "🏆",
  star: "⭐",
  "check-circle": "✅",
  medal: "🏅",
  "trending-up": "📈",
  award: "🎖️",
  heart: "❤️",
  sparkles: "✨",
  crown: "👑",
};

export interface AchievementBadgeProps {
  id: string;
  name: string;
  description?: string;
  icon: string;
  isEarned: boolean;
  earnedAt?: string;
  showTooltip?: boolean;
}

export function AchievementBadge({
  name,
  description,
  icon,
  isEarned,
  earnedAt,
  showTooltip = true,
}: AchievementBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div
        className={`text-center p-3 rounded-xl transition-all cursor-pointer ${
          isEarned
            ? "bg-gradient-to-br from-amber-100 to-yellow-100 shadow-sm"
            : "bg-stone-100 opacity-50 grayscale"
        }`}
      >
        {/* 图标 */}
        <motion.div
          className="text-2xl mb-1"
          animate={isEarned && isHovered ? { rotate: [0, -10, 10, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          {ACHIEVEMENT_ICONS[icon] || "🌟"}
        </motion.div>

        {/* 名称 */}
        <div className="text-xs font-medium text-stone-700 truncate">
          {name}
        </div>

        {/* 已获得标记 */}
        {isEarned && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
          >
            <span className="text-white text-[10px]">✓</span>
          </motion.div>
        )}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-40"
          >
            <div className="bg-stone-800 text-white text-xs rounded-lg p-2 shadow-lg">
              <div className="font-medium mb-1">{name}</div>
              {description && (
                <div className="text-stone-300 text-[10px]">{description}</div>
              )}
              {isEarned && earnedAt && (
                <div className="text-emerald-400 text-[10px] mt-1">
                  获得于 {new Date(earnedAt).toLocaleDateString("zh-CN")}
                </div>
              )}
              {!isEarned && (
                <div className="text-stone-400 text-[10px] mt-1">🔒 未解锁</div>
              )}
              {/* 小箭头 */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 成就网格组件
interface AchievementGridProps {
  achievements: AchievementBadgeProps[];
  columns?: number;
}

export function AchievementGrid({
  achievements,
  columns = 5,
}: AchievementGridProps) {
  const gridCols =
    {
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-3 md:grid-cols-5",
    }[columns] || "grid-cols-3 md:grid-cols-5";

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {achievements.map((achievement) => (
        <AchievementBadge key={achievement.id} {...achievement} />
      ))}
    </div>
  );
}

// 新成就庆祝弹窗
interface NewAchievementModalProps {
  achievement: AchievementBadgeProps;
  isOpen: boolean;
  onClose: () => void;
}

export function NewAchievementModal({
  achievement,
  isOpen,
  onClose,
}: NewAchievementModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 庆祝图标 */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>

            <h2 className="text-xl font-medium text-stone-700 mb-2">
              获得新成就！
            </h2>

            {/* 成就展示 */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-amber-100 to-yellow-100 rounded-2xl p-6 my-6"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-5xl mb-3"
              >
                {ACHIEVEMENT_ICONS[achievement.icon] || "🌟"}
              </motion.div>
              <div className="text-lg font-medium text-stone-700">
                {achievement.name}
              </div>
              {achievement.description && (
                <div className="text-sm text-stone-500 mt-1">
                  {achievement.description}
                </div>
              )}
            </motion.div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-[#e8a4b8] text-white rounded-full font-medium
                         hover:bg-[#d88a9f] transition-colors"
            >
              太棒了！
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 成就进度条（显示获得比例）
interface AchievementProgressProps {
  earned: number;
  total: number;
}

export function AchievementProgress({
  earned,
  total,
}: AchievementProgressProps) {
  const percentage = total > 0 ? (earned / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className="text-sm text-stone-500 whitespace-nowrap">
        {earned}/{total}
      </span>
    </div>
  );
}
