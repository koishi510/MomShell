'use client';

// frontend/components/community/ChannelSwitcher.tsx
/**
 * 双频道切换器
 * 使用 Framer Motion layoutId 实现丝滑滑动动画
 */

import { motion } from 'framer-motion';
import { type ChannelType, CHANNEL_CONFIG } from '../../types/community';

interface ChannelSwitcherProps {
  activeChannel: ChannelType;
  onChannelChange: (channel: ChannelType) => void;
}

export default function ChannelSwitcher({
  activeChannel,
  onChannelChange,
}: ChannelSwitcherProps) {
  const channels: ChannelType[] = ['professional', 'experience'];

  return (
    <div className="relative flex items-center gap-1 p-1.5 bg-stone-100/80 backdrop-blur-sm rounded-full">
      {channels.map((channel) => {
        const config = CHANNEL_CONFIG[channel];
        const isActive = activeChannel === channel;

        return (
          <button
            key={channel}
            onClick={() => onChannelChange(channel)}
            className={`
              relative z-10 flex flex-col items-center justify-center
              px-6 py-3 rounded-full
              transition-colors duration-300
              ${isActive ? 'text-stone-800' : 'text-stone-500 hover:text-stone-600'}
            `}
          >
            {/* 背景滑块 */}
            {isActive && (
              <motion.div
                layoutId="channel-indicator"
                className="absolute inset-0 bg-white rounded-full shadow-md"
                style={{
                  boxShadow: `0 2px 12px ${config.color.accent}20`,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}

            {/* 频道图标 */}
            <motion.div
              className="relative z-10 mb-0.5"
              animate={{
                scale: isActive ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {channel === 'professional' ? (
                <ProfessionalIcon isActive={isActive} />
              ) : (
                <ExperienceIcon isActive={isActive} />
              )}
            </motion.div>

            {/* 频道名称 */}
            <span className="relative z-10 text-sm font-medium">
              {config.label}
            </span>

            {/* 副标题 */}
            <motion.span
              className="relative z-10 text-xs mt-0.5"
              initial={false}
              animate={{
                opacity: isActive ? 1 : 0,
                height: isActive ? 'auto' : 0,
              }}
              transition={{ duration: 0.2 }}
            >
              {config.subtitle}
            </motion.span>
          </button>
        );
      })}

      {/* 装饰性光晕 */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${
            activeChannel === 'professional' ? '30%' : '70%'
          } 50%, ${CHANNEL_CONFIG[activeChannel].color.accent}20, transparent 70%)`,
        }}
        animate={{
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

// 专业频道图标
function ProfessionalIcon({ isActive }: { isActive: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-colors duration-200 ${
        isActive ? 'text-sky-600' : 'text-stone-400'
      }`}
    >
      {/* 听诊器图标 */}
      <path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 10.3.3" />
      <path d="M8 15v1a6 6 0 006 6 6 6 0 006-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  );
}

// 经验频道图标
function ExperienceIcon({ isActive }: { isActive: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-colors duration-200 ${
        isActive ? 'text-amber-600' : 'text-stone-400'
      }`}
    >
      {/* 爱心对话图标 */}
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
