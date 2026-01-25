'use client';

// frontend/components/home/PageTransition.tsx
/**
 * 页面过渡动画包装器
 * 实现水滴融合般的平滑过渡效果
 */

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        {children}

        {/* 过渡遮罩层 */}
        <motion.div
          className="fixed inset-0 z-[9999] pointer-events-none"
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {/* 水滴效果 - 多层圆形扩散 */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at center, #FFF0F5 0%, #FFF8F0 50%, transparent 70%)',
            }}
            variants={rippleVariants}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// 页面内容动画
const pageVariants = {
  initial: {
    opacity: 0,
    scale: 0.98,
    filter: 'blur(10px)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.02,
    filter: 'blur(10px)',
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

// 遮罩层动画
const overlayVariants = {
  initial: {
    opacity: 1,
  },
  animate: {
    opacity: 0,
    transition: {
      duration: 0.8,
      ease: 'easeOut' as const,
      delay: 0.2,
    },
  },
  exit: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeIn' as const,
    },
  },
};

// 水波纹动画
const rippleVariants = {
  initial: {
    scale: 0,
    opacity: 1,
  },
  animate: {
    scale: 3,
    opacity: 0,
    transition: {
      duration: 1,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
  exit: {
    scale: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeIn' as const,
    },
  },
};
