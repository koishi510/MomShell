"use client";

// frontend/components/community/DailyResonance.tsx
/**
 * 今日共鸣组件
 * 展示3条精选话题，错落布局，温暖治愈风格
 */

import { motion } from "framer-motion";
import { type HotTopic } from "../../types/community";

interface DailyResonanceProps {
  topics: HotTopic[];
  onTopicClick: (topic: HotTopic) => void;
}

// 错落偏移配置
const STAGGER_OFFSETS = [
  { x: 0, rotate: -0.5 },
  { x: 8, rotate: 0.3 },
  { x: -4, rotate: -0.2 },
];

// 柔和的边框颜色
const BORDER_COLORS = [
  "border-rose-200/60",
  "border-amber-200/60",
  "border-emerald-200/60",
];

export default function DailyResonance({
  topics,
  onTopicClick,
}: DailyResonanceProps) {
  const displayTopics = topics.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-4"
    >
      {/* 标题 */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-lg">🧡</span>
        <h3 className="text-stone-600 font-light tracking-wide">~今日共鸣~</h3>
      </div>

      {/* 话题卡片 - 错落布局 */}
      <div className="space-y-3">
        {displayTopics.map((topic, index) => (
          <motion.button
            key={topic.id}
            onClick={() => onTopicClick(topic)}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            whileHover={{
              y: -2,
              transition: { duration: 0.2 },
            }}
            className={`
              w-full text-left p-4 rounded-2xl
              bg-white/40 backdrop-blur-sm
              border ${BORDER_COLORS[index]}
              transition-all duration-300
              hover:bg-white/60
              group
            `}
            style={{
              transform: `translateX(${STAGGER_OFFSETS[index].x}px) rotate(${STAGGER_OFFSETS[index].rotate}deg)`,
            }}
          >
            <p className="text-stone-600 text-sm leading-relaxed group-hover:text-stone-800 transition-colors">
              {topic.name}
            </p>
            <div className="mt-2 flex items-center gap-1 text-xs text-stone-400">
              <span>{topic.question_count}</span>
              <span>位妈妈在讨论</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
