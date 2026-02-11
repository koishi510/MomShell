// frontend/app/echo/page.tsx
/**
 * Echo Domain 入口页面 - 双色星云选择界面
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AuthGuard } from "../../components/AuthGuard";
import { ECHO_COLORS, SPRING_CONFIGS } from "../../lib/design-tokens";
import { getEchoStatus } from "../../lib/api/echo";
import type { EchoStatus } from "../../types/echo";

function EchoEntrance() {
  const router = useRouter();
  const [status, setStatus] = useState<EchoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredSide, setHoveredSide] = useState<"mom" | "partner" | null>(
    null,
  );

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getEchoStatus();
      setStatus(data);

      // 如果已有角色，自动跳转
      if (data.role === "mom") {
        router.push("/echo/mom");
        return;
      }
      if (data.role === "partner") {
        router.push("/echo/partner");
        return;
      }
    } catch (error) {
      console.error("Failed to load echo status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMomClick = () => {
    // 已选择伴侣角色的用户不能进入妈妈模式
    if (status?.role === "partner") {
      return;
    }
    router.push("/echo/mom");
  };

  const handlePartnerClick = () => {
    // 已选择妈妈角色的用户不能进入伴侣模式
    if (status?.role === "mom") {
      return;
    }
    router.push("/echo/partner");
  };

  // 判断按钮是否禁用
  const isMomDisabled = status?.role === "partner";
  const isPartnerDisabled = status?.role === "mom";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-indigo-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-lg text-gray-600"
        >
          正在进入回声域...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-hidden relative">
      {/* 返回首页按钮 */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 text-gray-500 hover:text-gray-700 bg-white/70 hover:bg-white/90 px-4 py-2 rounded-full backdrop-blur-sm shadow-sm transition-all hover:shadow-md"
      >
        ← 返回首页
      </Link>
      {/* 妈妈模式 - 左侧 */}
      <motion.div
        className={`relative flex-1 flex flex-col items-center justify-center overflow-hidden ${
          isMomDisabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
        style={{
          background: `linear-gradient(135deg, ${ECHO_COLORS.mom.gradient[0]} 0%, ${ECHO_COLORS.mom.gradient[1]} 100%)`,
          opacity: isMomDisabled ? 0.5 : 1,
        }}
        animate={{
          flex:
            hoveredSide === "mom" && !isMomDisabled
              ? 1.2
              : hoveredSide === "partner" && !isPartnerDisabled
                ? 0.8
                : 1,
        }}
        transition={SPRING_CONFIGS.smooth}
        onMouseEnter={() => !isMomDisabled && setHoveredSide("mom")}
        onMouseLeave={() => setHoveredSide(null)}
        onClick={handleMomClick}
      >
        {/* 背景粒子效果 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-amber-300/30"
              initial={{
                x: Math.random() * 100 + "%",
                y: Math.random() * 100 + "%",
              }}
              animate={{
                y: [
                  Math.random() * 100 + "%",
                  Math.random() * 100 + "%",
                  Math.random() * 100 + "%",
                ],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 10 + Math.random() * 10,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>

        {/* 内容 */}
        <motion.div
          className="relative z-10 text-center px-8"
          animate={{
            scale: hoveredSide === "mom" ? 1.05 : 1,
          }}
          transition={SPRING_CONFIGS.gentle}
        >
          {/* 星云按钮 */}
          <motion.div
            className="w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle, ${ECHO_COLORS.mom.accent} 0%, ${ECHO_COLORS.mom.primary} 70%)`,
              boxShadow:
                hoveredSide === "mom"
                  ? `0 0 40px ${ECHO_COLORS.mom.glow}, 0 0 80px ${ECHO_COLORS.mom.glow}`
                  : `0 0 20px ${ECHO_COLORS.mom.shadow}`,
            }}
            animate={{
              scale: hoveredSide === "mom" ? [1, 1.05, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: hoveredSide === "mom" ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            <span className="text-5xl">🌸</span>
          </motion.div>

          <h2
            className="text-3xl font-bold mb-2"
            style={{ color: ECHO_COLORS.mom.text }}
          >
            自我之境
          </h2>
          <p
            className="text-lg mb-4 opacity-80"
            style={{ color: ECHO_COLORS.mom.text }}
          >
            The Origin
          </p>
          <p
            className="text-sm max-w-xs mx-auto opacity-70"
            style={{ color: ECHO_COLORS.mom.text }}
          >
            回到成为妈妈之前的自己，在温暖的画卷中找回内心的宁静
          </p>

          {status && status.role === "mom" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm"
              style={{ color: ECHO_COLORS.mom.text }}
            >
              已冥想 {status.total_meditation_minutes} 分钟
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* 分隔线 */}
      <div className="w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

      {/* 爸爸模式 - 右侧 */}
      <motion.div
        className={`relative flex-1 flex flex-col items-center justify-center overflow-hidden ${
          isPartnerDisabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
        style={{
          background: `linear-gradient(135deg, ${ECHO_COLORS.partner.gradient[0]} 0%, ${ECHO_COLORS.partner.gradient[1]} 100%)`,
          opacity: isPartnerDisabled ? 0.5 : 1,
        }}
        animate={{
          flex:
            hoveredSide === "partner" && !isPartnerDisabled
              ? 1.2
              : hoveredSide === "mom" && !isMomDisabled
                ? 0.8
                : 1,
        }}
        transition={SPRING_CONFIGS.smooth}
        onMouseEnter={() => !isPartnerDisabled && setHoveredSide("partner")}
        onMouseLeave={() => setHoveredSide(null)}
        onClick={handlePartnerClick}
      >
        {/* 背景粒子效果 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-indigo-300/30"
              initial={{
                x: Math.random() * 100 + "%",
                y: Math.random() * 100 + "%",
              }}
              animate={{
                y: [
                  Math.random() * 100 + "%",
                  Math.random() * 100 + "%",
                  Math.random() * 100 + "%",
                ],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 10 + Math.random() * 10,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>

        {/* 内容 */}
        <motion.div
          className="relative z-10 text-center px-8"
          animate={{
            scale: hoveredSide === "partner" ? 1.05 : 1,
          }}
          transition={SPRING_CONFIGS.gentle}
        >
          {/* 星云按钮 */}
          <motion.div
            className="w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle, ${ECHO_COLORS.partner.accent} 0%, ${ECHO_COLORS.partner.primary} 70%)`,
              boxShadow:
                hoveredSide === "partner"
                  ? `0 0 40px ${ECHO_COLORS.partner.glow}, 0 0 80px ${ECHO_COLORS.partner.glow}`
                  : `0 0 20px ${ECHO_COLORS.partner.shadow}`,
            }}
            animate={{
              scale: hoveredSide === "partner" ? [1, 1.05, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: hoveredSide === "partner" ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            <span className="text-5xl">🛡️</span>
          </motion.div>

          <h2
            className="text-3xl font-bold mb-2"
            style={{ color: ECHO_COLORS.partner.text }}
          >
            同步守护
          </h2>
          <p
            className="text-lg mb-4 opacity-80"
            style={{ color: ECHO_COLORS.partner.text }}
          >
            The Guardian
          </p>
          <p
            className="text-sm max-w-xs mx-auto opacity-70"
            style={{ color: ECHO_COLORS.partner.text }}
          >
            透过任务窗户，守护她的宁静，为她注入温暖的回忆
          </p>

          {status && status.role === "partner" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm"
              style={{ color: ECHO_COLORS.partner.text }}
            >
              已绑定伴侣关系
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function EchoPage() {
  return (
    <AuthGuard>
      <EchoEntrance />
    </AuthGuard>
  );
}
