"use client";

// frontend/components/home/MeshGradientBackground.tsx
/**
 * 动态弥散渐变背景
 * 实现"呼吸感"的色彩流动效果
 */

import { motion } from "framer-motion";

export default function MeshGradientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* 基础渐变层 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFF8F0] via-[#FFF0F5] to-[#F0FFF4]" />

      {/* 动态色块 1 - 奶油色 */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-60"
        style={{
          background: "radial-gradient(circle, #FFF3E0 0%, transparent 70%)",
          top: "-20%",
          left: "-10%",
        }}
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 动态色块 2 - 柔粉色 */}
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full blur-[100px] opacity-50"
        style={{
          background: "radial-gradient(circle, #FFE4EC 0%, transparent 70%)",
          top: "30%",
          right: "-15%",
        }}
        animate={{
          scale: [1.1, 1, 1.1],
          x: [0, -40, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* 动态色块 3 - 薄荷绿 */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[100px] opacity-40"
        style={{
          background: "radial-gradient(circle, #E0F7E9 0%, transparent 70%)",
          bottom: "-10%",
          left: "20%",
        }}
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 30, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />

      {/* 动态色块 4 - 淡紫色点缀 */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[80px] opacity-30"
        style={{
          background: "radial-gradient(circle, #F3E8FF 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {/* 丁达尔效应 - 光线微粒 */}
      <TyndallEffect />
    </div>
  );
}

// 丁达尔效应组件 - 模拟阳光微粒
// 预计算的粒子数据（避免在渲染时使用 Math.random）
const PARTICLE_DATA = [
  { id: 0, left: 45, top: 23, duration: 6.2, delay: 2.1 },
  { id: 1, left: 72, top: 67, duration: 5.8, delay: 4.3 },
  { id: 2, left: 18, top: 89, duration: 7.1, delay: 1.5 },
  { id: 3, left: 83, top: 12, duration: 4.9, delay: 3.7 },
  { id: 4, left: 31, top: 45, duration: 6.7, delay: 0.8 },
  { id: 5, left: 56, top: 78, duration: 5.3, delay: 2.9 },
  { id: 6, left: 67, top: 34, duration: 7.5, delay: 4.1 },
  { id: 7, left: 24, top: 56, duration: 4.6, delay: 1.2 },
  { id: 8, left: 89, top: 91, duration: 6.9, delay: 3.4 },
  { id: 9, left: 41, top: 8, duration: 5.1, delay: 0.3 },
  { id: 10, left: 78, top: 42, duration: 7.3, delay: 2.6 },
  { id: 11, left: 15, top: 73, duration: 4.4, delay: 4.8 },
  { id: 12, left: 62, top: 19, duration: 6.1, delay: 1.9 },
  { id: 13, left: 33, top: 85, duration: 5.7, delay: 3.2 },
  { id: 14, left: 86, top: 51, duration: 7.8, delay: 0.6 },
  { id: 15, left: 49, top: 37, duration: 4.2, delay: 2.4 },
  { id: 16, left: 21, top: 64, duration: 6.4, delay: 4.5 },
  { id: 17, left: 74, top: 96, duration: 5.5, delay: 1.7 },
  { id: 18, left: 58, top: 28, duration: 7.0, delay: 3.9 },
  { id: 19, left: 37, top: 71, duration: 4.8, delay: 0.1 },
];

function TyndallEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 光束 */}
      <motion.div
        className="absolute top-0 right-[20%] w-[300px] h-[600px] origin-top"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)",
          transform: "rotate(15deg)",
          filter: "blur(30px)",
        }}
        animate={{
          opacity: [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 漂浮微粒 */}
      {PARTICLE_DATA.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            filter: "blur(1px)",
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}
