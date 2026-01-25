// frontend/components/coach/EnergyRing.tsx
/**
 * 四维能量环组件
 * 展示核心力量、盆底肌、体态、柔韧性四个维度的恢复进度
 * 动效：顺时针生长 + 呼吸光晕
 */

'use client';

import { motion } from 'framer-motion';
import type { EnergyMetrics } from '../../types/coach';
import { METRIC_LABELS, METRIC_COLORS } from '../../types/coach';

interface EnergyRingProps {
  metrics: EnergyMetrics;
  size?: number;
  showBreathing?: boolean;
}

// 环配置：由内向外
const RING_CONFIG: Array<{
  key: keyof EnergyMetrics;
  radius: number;
  strokeWidth: number;
}> = [
  { key: 'core_strength', radius: 50, strokeWidth: 10 },
  { key: 'pelvic_floor', radius: 68, strokeWidth: 10 },
  { key: 'posture', radius: 86, strokeWidth: 10 },
  { key: 'flexibility', radius: 104, strokeWidth: 10 },
];

// 呼吸动画配置
const BREATHING_TRANSITION = {
  duration: 3,
  repeat: Infinity,
  ease: 'easeInOut' as const,
};

export function EnergyRing({ metrics, size = 240, showBreathing = true }: EnergyRingProps) {
  const viewBoxSize = 240;
  const center = viewBoxSize / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full"
        style={{ transform: 'rotate(-90deg)' }} // 从顶部开始绘制
      >
        {/* SVG 滤镜定义 - 呼吸光晕效果 */}
        <defs>
          {RING_CONFIG.map(({ key }) => {
            const color = METRIC_COLORS[key];
            return (
              <filter
                key={`glow-${key}`}
                id={`glow-${key}`}
                x="-100%"
                y="-100%"
                width="300%"
                height="300%"
              >
                {/* 外发光层 */}
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="4"
                  floodColor={color}
                  floodOpacity="0.6"
                />
                {/* 内发光层 */}
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="2"
                  floodColor={color}
                  floodOpacity="0.4"
                />
              </filter>
            );
          })}
        </defs>

        {/* 背景环（灰色轨道） */}
        {RING_CONFIG.map(({ key, radius, strokeWidth }) => (
          <circle
            key={`bg-${key}`}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e7e5e4"
            strokeWidth={strokeWidth}
            opacity={0.4}
          />
        ))}

        {/* 进度环 - 带呼吸效果 */}
        {RING_CONFIG.map(({ key, radius, strokeWidth }, index) => {
          const value = metrics[key];
          const color = METRIC_COLORS[key];

          return (
            <motion.circle
              key={`progress-${key}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              filter={`url(#glow-${key})`}
              // 顺时针生长动画
              initial={{ pathLength: 0, opacity: 0.6 }}
              animate={{
                pathLength: value / 100,
                opacity: showBreathing ? [0.7, 1, 0.7] : 1,
              }}
              transition={{
                pathLength: {
                  duration: 1.2,
                  delay: index * 0.15,
                  ease: 'easeOut',
                },
                opacity: showBreathing
                  ? {
                      ...BREATHING_TRANSITION,
                      delay: index * 0.3,
                    }
                  : { duration: 0.3 },
              }}
            />
          );
        })}
      </svg>

      {/* 中心数值显示 */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <motion.span
          className="text-3xl font-light text-stone-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          {Math.round(
            (metrics.core_strength +
              metrics.pelvic_floor +
              metrics.posture +
              metrics.flexibility) /
              4
          )}
        </motion.span>
        <span className="text-xs text-stone-400 mt-1">综合指数</span>
      </motion.div>
    </div>
  );
}

// 指标标签组件 - 带动画入场
export function MetricLegend({ metrics }: { metrics: EnergyMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-6">
      {RING_CONFIG.map(({ key }, index) => (
        <motion.div
          key={key}
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
        >
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: METRIC_COLORS[key] }}
            animate={{
              boxShadow: [
                `0 0 4px ${METRIC_COLORS[key]}60`,
                `0 0 8px ${METRIC_COLORS[key]}80`,
                `0 0 4px ${METRIC_COLORS[key]}60`,
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.3,
            }}
          />
          <span className="text-sm text-stone-600">
            {METRIC_LABELS[key]}
          </span>
          <span className="text-sm font-medium text-stone-700 ml-auto">
            {metrics[key]}%
          </span>
        </motion.div>
      ))}
    </div>
  );
}
