'use client';

// frontend/components/home/MoodBall.tsx
/**
 * 心情球组件
 * 像水母一样缓慢收缩和扩张，营造治愈氛围
 */

import { motion } from 'framer-motion';

interface MoodBallProps {
  className?: string;
}

export default function MoodBall({ className = '' }: MoodBallProps) {
  return (
    <div className={`relative ${className}`}>
      {/* 外层光晕 */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,182,193,0.3) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* 中层球体 */}
      <motion.div
        className="absolute inset-2 rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,228,235,0.9) 0%, rgba(255,182,193,0.6) 50%, rgba(255,160,180,0.4) 100%)',
          boxShadow: 'inset 0 0 20px rgba(255,255,255,0.5)',
        }}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />

      {/* 核心球体 */}
      <motion.div
        className="relative w-16 h-16 rounded-full overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 35% 35%, #FFF0F3 0%, #FFD6E0 40%, #FFB6C1 100%)',
          boxShadow: `
            0 0 30px rgba(255,182,193,0.5),
            inset 0 0 15px rgba(255,255,255,0.6),
            inset 3px 3px 10px rgba(255,255,255,0.8)
          `,
        }}
        animate={{
          scale: [1, 1.08, 0.95, 1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* 高光 */}
        <motion.div
          className="absolute top-2 left-3 w-4 h-3 rounded-full bg-white/60"
          style={{ filter: 'blur(2px)' }}
          animate={{
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* 内部流动 */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 60% 60%, rgba(255,200,210,0.4) 0%, transparent 50%)',
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </motion.div>

      {/* 触手效果 - 水母风格 */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="w-0.5 rounded-full"
            style={{
              height: 12 + i * 2,
              background: 'linear-gradient(180deg, rgba(255,182,193,0.6) 0%, transparent 100%)',
            }}
            animate={{
              scaleY: [1, 1.3, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
