"use client";

// frontend/components/home/AnimatedText.tsx
/**
 * 动画文字组件
 * 使用 staggerChildren 实现逐字浮现效果
 */

import { motion } from "framer-motion";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export default function AnimatedText({
  text,
  className = "",
  delay = 0,
}: AnimatedTextProps) {
  const characters = text.split("");

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: delay,
        staggerChildren: 0.03,
      },
    },
  };

  const child = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: "blur(10px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      className={`flex flex-wrap justify-center ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {characters.map((char, index) => (
        <motion.span
          key={index}
          variants={child}
          className={char === " " ? "w-2" : ""}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.div>
  );
}

// 带衬线体的标题组件
export function SerifTitle({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <AnimatedText
      text={children}
      className={`font-serif tracking-widest ${className}`}
      delay={0.1}
    />
  );
}

// 副标题组件
export function Subtitle({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <AnimatedText
      text={children}
      className={`tracking-wide ${className}`}
      delay={0.3}
    />
  );
}
