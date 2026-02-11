// frontend/components/echo/partner/BlurredMomView.tsx
/**
 * 模糊妈妈视图组件 - 通过窗户观看
 */

"use client";

import { motion } from "framer-motion";
import { ECHO_COLORS } from "../../../lib/design-tokens";

interface BlurredMomViewProps {
  clarityLevel: number; // 0-100
}

export function BlurredMomView({ clarityLevel }: BlurredMomViewProps) {
  // 计算模糊程度
  const blurAmount = Math.max(0, 20 - (clarityLevel / 100) * 20);

  // 计算可见度
  const opacity = 0.3 + (clarityLevel / 100) * 0.7;

  return (
    <div className="relative h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-900">
      {/* 窗框效果 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: `
            inset 0 0 100px rgba(0, 0, 0, 0.5),
            inset 0 0 40px rgba(255, 255, 255, 0.05)
          `,
        }}
      />

      {/* 毛玻璃层 */}
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: `blur(${blurAmount}px)`,
          background: `rgba(255, 255, 255, ${0.05 + (1 - clarityLevel / 100) * 0.1})`,
        }}
      />

      {/* 妈妈的抽象形象 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          animate={{
            y: [0, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* 光环 */}
          <motion.div
            className="absolute -inset-8 rounded-full"
            style={{
              background: `radial-gradient(circle, ${ECHO_COLORS.mom.accent}${Math.round(opacity * 40).toString(16)} 0%, transparent 70%)`,
              filter: `blur(${blurAmount / 2}px)`,
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* 人形轮廓 */}
          <motion.div
            className="w-24 h-32 rounded-t-full relative"
            style={{
              background: `linear-gradient(180deg,
                ${ECHO_COLORS.mom.accent}${Math.round(opacity * 80).toString(16)} 0%,
                ${ECHO_COLORS.mom.primary}${Math.round(opacity * 60).toString(16)} 100%
              )`,
              filter: `blur(${blurAmount}px)`,
              opacity: opacity,
            }}
          >
            {/* 头部 */}
            <div
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full"
              style={{
                background: ECHO_COLORS.mom.accent,
                opacity: opacity * 0.8,
              }}
            />
          </motion.div>

          {/* 星光点缀 */}
          {clarityLevel > 50 && (
            <>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-amber-200"
                  style={{
                    top: `${20 + i * 30}%`,
                    left: `${10 + i * 40}%`,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.5,
                    repeat: Infinity,
                  }}
                />
              ))}
            </>
          )}
        </motion.div>
      </div>

      {/* 提示文字 */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-white/60 text-sm">
          {clarityLevel < 30 && "窗户太模糊了...完成任务来擦亮它"}
          {clarityLevel >= 30 && clarityLevel < 60 && "她的轮廓渐渐清晰..."}
          {clarityLevel >= 60 && clarityLevel < 90 && "你能看到她了..."}
          {clarityLevel >= 90 && "守护让一切变得清晰 ✨"}
        </p>
      </div>
    </div>
  );
}
