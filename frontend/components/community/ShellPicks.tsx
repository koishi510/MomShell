"use client";

// frontend/components/community/ShellPicks.tsx
/**
 * 拾贝入口组件
 * 极简卡片，链接到收藏页面
 */

import Link from "next/link";
import { motion } from "framer-motion";

export default function ShellPicks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Link href="/community/collections">
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="
            relative overflow-hidden
            p-6 rounded-3xl
            bg-gradient-to-br from-amber-50/70 to-orange-50/60
            border border-amber-100/50
            cursor-pointer
            group
          "
        >
          {/* 装饰性光斑 */}
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-amber-100/30 blur-2xl" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* 贝壳图标 - 暖色滤镜 */}
            <motion.div
              className="text-4xl mb-3"
              style={{
                filter: "sepia(30%) saturate(150%) hue-rotate(-10deg)",
              }}
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              🐚
            </motion.div>

            {/* 主文案 */}
            <h3 className="text-stone-700 font-medium mb-1">拾贝</h3>

            {/* 副文案 */}
            <p className="text-stone-500 text-sm">捡到的贝壳</p>

            {/* 悬停提示 */}
            <div
              className="
              mt-3 px-3 py-1 rounded-full
              bg-white/60 text-stone-500 text-xs
              opacity-0 group-hover:opacity-100
              transition-opacity duration-300
            "
            >
              查看收藏 →
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
