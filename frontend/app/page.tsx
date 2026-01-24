// frontend/app/page.tsx
/**
 * 首页 - 功能导航
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const features = [
  {
    title: '情感陪伴',
    subtitle: 'Soulful Companion',
    description: '在这一刻，你并不孤单',
    href: '/chat',
    icon: '💝',
    gradient: 'from-rose-100 to-pink-100',
    hoverGradient: 'hover:from-rose-200 hover:to-pink-200',
  },
  {
    title: 'AI 康复教练',
    subtitle: 'Recovery Coach',
    description: '专业指导，温柔陪伴你的恢复之旅',
    href: '/rehab',
    icon: '🧘‍♀️',
    gradient: 'from-blue-100 to-cyan-100',
    hoverGradient: 'hover:from-blue-200 hover:to-cyan-200',
  },
  {
    title: '互助社区',
    subtitle: 'Community',
    description: '分享经验，获取专业建议',
    href: '/community',
    icon: '👩‍👩‍👧',
    gradient: 'from-amber-100 to-orange-100',
    hoverGradient: 'hover:from-amber-200 hover:to-orange-200',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex flex-col">
      {/* Header */}
      <header className="pt-16 pb-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-light text-stone-700 tracking-wide"
        >
          MomShell
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-3 text-stone-500 text-lg"
        >
          为新妈妈打造的温暖空间
        </motion.p>
      </header>

      {/* Feature Cards */}
      <main className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl w-full">
          {features.map((feature, index) => (
            <motion.div
              key={feature.href}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
            >
              <Link href={feature.href}>
                <div
                  className={`
                    block p-8 rounded-3xl bg-gradient-to-br ${feature.gradient} ${feature.hoverGradient}
                    border border-white/50 shadow-lg hover:shadow-xl
                    transition-all duration-300 cursor-pointer
                    transform hover:scale-[1.02]
                  `}
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h2 className="text-2xl font-medium text-stone-700 mb-1">
                    {feature.title}
                  </h2>
                  <p className="text-sm text-stone-500 mb-3">{feature.subtitle}</p>
                  <p className="text-stone-600">{feature.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-stone-400 text-sm">
        <p>用心陪伴每一位妈妈的恢复之旅</p>
      </footer>
    </div>
  );
}
