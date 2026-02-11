"use client";

// frontend/components/community/ChannelSwitcher.tsx
/**
 * 双频道切换器
 * 光影平移 + 呼吸光晕效果
 */

import { motion } from "framer-motion";
import { type ChannelType } from "../../types/community";
import { CHANNEL_COLORS, SPRING_CONFIGS } from "../../lib/design-tokens";

interface ChannelSwitcherProps {
  activeChannel: ChannelType;
  onChannelChange: (channel: ChannelType) => void;
}

const CHANNELS: {
  type: ChannelType;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "professional",
    label: "专业频道",
    subtitle: "听听医生怎么说",
    icon: <ProfessionalIcon />,
  },
  {
    type: "experience",
    label: "经验频道",
    subtitle: "看看妈妈们的经验",
    icon: <ExperienceIcon />,
  },
];

export default function ChannelSwitcher({
  activeChannel,
  onChannelChange,
}: ChannelSwitcherProps) {
  const activeColors = CHANNEL_COLORS[activeChannel];

  return (
    <motion.div
      className="relative flex items-center p-1.5 rounded-full"
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(12px)",
        boxShadow: `
          0 4px 24px rgba(0, 0, 0, 0.06),
          0 0 0 1px rgba(255, 255, 255, 0.8) inset
        `,
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      {/* 背景光晕 - 静态 */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none opacity-40"
        style={{
          background: `radial-gradient(ellipse at ${activeChannel === "professional" ? "30%" : "70%"} 50%, ${activeColors.glow}, transparent 70%)`,
        }}
      />

      {CHANNELS.map((channel) => {
        const isActive = activeChannel === channel.type;
        const colors = CHANNEL_COLORS[channel.type];

        return (
          <button
            key={channel.type}
            onClick={() => onChannelChange(channel.type)}
            className="relative z-10 flex flex-col items-center justify-center px-8 py-4 rounded-full transition-colors duration-300"
          >
            {/* 活跃状态的光影背景 */}
            {isActive && (
              <motion.div
                layoutId="channel-glow"
                className="absolute inset-0 rounded-full"
                style={{
                  background: colors.gradient,
                  boxShadow: `
                    0 4px 20px ${colors.shadow},
                    0 0 0 1px rgba(255, 255, 255, 0.9) inset
                  `,
                }}
                transition={SPRING_CONFIGS.smooth}
              />
            )}

            {/* 图标 */}
            <motion.div
              className="relative z-10 mb-1"
              animate={{
                scale: isActive ? 1.1 : 1,
                color: isActive ? colors.primary : "#a8a29e",
              }}
              transition={{ duration: 0.2 }}
            >
              {channel.icon}
            </motion.div>

            {/* 标签 */}
            <span
              className={`relative z-10 text-sm font-medium transition-colors duration-200 ${
                isActive ? "text-stone-700" : "text-stone-400"
              }`}
            >
              {channel.label}
            </span>

            {/* 副标题 - 仅活跃时显示 */}
            <motion.span
              className="relative z-10 text-xs text-stone-500 mt-0.5"
              initial={false}
              animate={{
                opacity: isActive ? 1 : 0,
                height: isActive ? "auto" : 0,
                marginTop: isActive ? 2 : 0,
              }}
              transition={{ duration: 0.2 }}
            >
              {channel.subtitle}
            </motion.span>
          </button>
        );
      })}
    </motion.div>
  );
}

// 专业频道图标
function ProfessionalIcon() {
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
    >
      {/* 听诊器 */}
      <path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 10.3.3" />
      <path d="M8 15v1a6 6 0 006 6 6 6 0 006-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  );
}

// 经验频道图标
function ExperienceIcon() {
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
    >
      {/* 爱心 */}
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
