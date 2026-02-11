// frontend/app/page.tsx
/**
 * 首页 - 治愈系避风港
 * 极度治愈、温馨且充满动态呼吸感
 */

"use client";

import Link from "next/link";
import MeshGradientBackground from "../components/home/MeshGradientBackground";
import MoodBall from "../components/home/MoodBall";
import { SerifTitle, Subtitle } from "../components/home/AnimatedText";
import FloatingCard from "../components/home/FloatingCard";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

const features = [
  {
    title: "心灵港湾",
    subtitle: "Soul Companion",
    description: "每一个瞬间，你都不再孤单",
    href: "/chat",
    icon: "💝",
    gradient: "#FFE4EC, #FFF0F5",
    shadowColor: "#FFB6C1",
    requiresAuth: true,
  },
  {
    title: "经验连接",
    subtitle: "Sisterhood Bond",
    description: "每一次交流，你都能获得力量",
    href: "/community",
    icon: "👩‍👩‍👧",
    gradient: "#FFF3E0, #FFE4B5",
    shadowColor: "#FFB347",
    requiresAuth: true,
  },
  {
    title: "身体重塑",
    subtitle: "Recovery Coach",
    description: "每一项训练，你都在重塑自我",
    href: "/coach",
    icon: "🧘‍♀️",
    gradient: "#E0F7FA, #B2EBF2",
    shadowColor: "#4DD0E1",
    requiresAuth: true,
  },
  {
    title: "伴侣守护",
    subtitle: "Guardian Partner",
    description: "每一份坚持，你都有贴心守护",
    href: "/guardian",
    icon: "🤝",
    gradient: "#E8F5E9, #C8E6C9",
    shadowColor: "#81C784",
  },
  {
    title: "心灵回响",
    subtitle: "Echo Bond",
    description: "每一段回忆，都是爱的回响",
    href: "/echo",
    icon: "🔮",
    gradient: "#EDE7F6, #D1C4E9",
    shadowColor: "#B39DDB",
    requiresAuth: true,
  },
];

export default function HomePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 动态弥散渐变背景 */}
      <MeshGradientBackground />

      {/* 心情球 - 左上角 */}
      <motion.div
        className="fixed top-8 left-8 z-20"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.5, ease: "backOut" }}
      >
        <MoodBall />
      </motion.div>

      {/* 用户按钮 - 右上角 */}
      <motion.div
        className="fixed top-8 right-8 z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.3 }}
      >
        {isLoading ? (
          <div className="w-10 h-10 rounded-full bg-white/50 animate-pulse" />
        ) : isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-600 bg-white/70 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {user.nickname}
            </span>
            <button
              onClick={logout}
              className="text-sm text-stone-500 hover:text-stone-700 bg-white/70 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
            >
              退出
            </button>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="flex items-center gap-2 bg-white/70 hover:bg-white/90 px-4 py-2 rounded-full backdrop-blur-sm shadow-sm transition-all hover:shadow-md"
          >
            <span className="text-sm text-stone-600">登录</span>
            <span className="text-stone-400">/</span>
            <span className="text-sm text-stone-600">注册</span>
          </Link>
        )}
      </motion.div>

      {/* 主内容 */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* 问候区 */}
        <header className="pt-20 pb-12 text-center">
          {/* 主标题 - 衬线体，逐字浮现 */}
          <SerifTitle className="text-5xl md:text-6xl text-stone-700">
            MomShell
          </SerifTitle>

          {/* 副标题 */}
          <Subtitle className="mt-6 text-lg text-stone-500">
            为新妈妈打造的温暖空间
          </Subtitle>

          {/* 装饰线 */}
          <motion.div
            className="mx-auto mt-8 w-16 h-0.5 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, #FFB6C1, transparent)",
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          />
        </header>

        {/* 模块入口 */}
        <main className="flex-1 flex items-center justify-center px-6 pb-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
            {features.map((feature, index) => (
              <FloatingCard
                key={feature.href}
                {...feature}
                index={index}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        </main>

        {/* 底部 */}
        <motion.footer
          className="py-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <p className="text-stone-400 text-sm font-light tracking-wide">
            用心陪伴每一位妈妈的恢复之旅
          </p>

          {/* 底部装饰 */}
          <motion.div
            className="flex justify-center gap-2 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {["🌸", "🌿", "🦋"].map((emoji, i) => (
              <motion.span
                key={i}
                className="text-lg opacity-50"
                animate={{
                  y: [0, -5, 0],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5,
                }}
              >
                {emoji}
              </motion.span>
            ))}
          </motion.div>
        </motion.footer>
      </div>
    </div>
  );
}
