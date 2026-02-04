'use client';

// frontend/components/home/FloatingCard.tsx
/**
 * 漂浮卡片组件
 * 带彩色软阴影效果
 */

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FloatingCardProps {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: string;
  gradient: string;
  shadowColor: string;
  index: number;
  requiresAuth?: boolean;
  isAuthenticated?: boolean;
}

export default function FloatingCard({
  title,
  subtitle,
  description,
  href,
  icon,
  gradient,
  shadowColor,
  index,
  requiresAuth = false,
  isAuthenticated = false,
}: FloatingCardProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (requiresAuth && !isAuthenticated) {
      e.preventDefault();
      router.push('/auth/login');
    }
  };

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.5 + index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Link href={href} className="block h-full" onClick={handleClick}>
        <motion.div
          className={`
            relative p-8 rounded-3xl h-full
            bg-white/70 backdrop-blur-md
            border border-white/50
            cursor-pointer overflow-hidden
          `}
          style={{
            boxShadow: `
              0 4px 30px ${shadowColor}30,
              0 8px 60px ${shadowColor}20,
              0 0 0 1px rgba(255,255,255,0.5) inset
            `,
          }}
          whileHover={{
            y: -8,
            scale: 1.02,
            boxShadow: `
              0 8px 40px ${shadowColor}40,
              0 16px 80px ${shadowColor}30,
              0 0 0 1px rgba(255,255,255,0.8) inset
            `,
          }}
          whileTap={{ scale: 0.98 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
        >
          {/* 背景渐变光晕 */}
          <motion.div
            className="absolute inset-0 rounded-3xl opacity-0"
            style={{
              background: `linear-gradient(135deg, ${gradient})`,
            }}
            whileHover={{ opacity: 0.15 }}
            transition={{ duration: 0.3 }}
          />

          {/* 顶部光效 */}
          <div
            className="absolute top-0 left-0 right-0 h-1/2 rounded-t-3xl"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)',
            }}
          />

          {/* 内容 */}
          <div className="relative z-10">
            {/* 图标 */}
            <motion.div
              className="text-5xl mb-5"
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.5,
              }}
            >
              {icon}
            </motion.div>

            {/* 标题 */}
            <h2 className="text-2xl font-medium text-stone-700 mb-1">
              {title}
            </h2>

            {/* 副标题 */}
            <p className="text-sm text-stone-400 mb-3 font-light tracking-wide">
              {subtitle}
            </p>

            {/* 描述 */}
            <p className="text-stone-600 leading-relaxed">
              {description}
            </p>
          </div>

          {/* 箭头指示 */}
          <motion.div
            className="absolute bottom-6 right-6 text-stone-300 z-10"
            whileHover={{ x: 5, color: '#78716c' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
