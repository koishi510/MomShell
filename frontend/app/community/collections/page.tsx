'use client';

// frontend/app/community/collections/page.tsx
/**
 * 收藏页面 - 我的贝壳
 * 展示用户收藏的帖子
 */

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { mockCollections, mockQuestions } from '../../../components/community/mockData';
import CommunityBackground from '../../../components/community/CommunityBackground';

export default function CollectionsPage() {
  const [collections] = useState(mockCollections);

  // 通过标题匹配获取完整问题数据
  const getQuestionByTitle = (title: string) => {
    return mockQuestions.find(q => q.title === title);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景 */}
      <CommunityBackground />

      {/* 返回按钮 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Link
          href="/community"
          className="fixed top-4 left-4 z-50 px-4 py-2.5 bg-white/70 backdrop-blur-md rounded-full text-stone-500 hover:text-stone-700 hover:bg-white/90 transition-all shadow-sm border border-white/50"
        >
          ← 返回社区
        </Link>
      </motion.div>

      {/* 主内容 */}
      <main className="max-w-2xl mx-auto px-4 pt-20 pb-12">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            className="text-5xl mb-4"
            style={{
              filter: 'sepia(30%) saturate(150%) hue-rotate(-10deg)',
            }}
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            🐚
          </motion.div>
          <h1 className="text-2xl font-light text-stone-700 tracking-wide mb-2">
            我的贝壳
          </h1>
          <p className="text-stone-500 text-sm">
            收藏的温暖，随时回顾
          </p>
        </motion.div>

        {/* 收藏列表 */}
        <AnimatePresence mode="popLayout">
          {collections.length > 0 ? (
            <div className="space-y-4">
              {collections.map((collection, index) => {
                const question = getQuestionByTitle(collection.title);
                return (
                  <motion.div
                    key={collection.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -3 }}
                    className="
                      p-5 rounded-2xl
                      bg-white/60 backdrop-blur-sm
                      border border-white/50
                      cursor-pointer
                      transition-all duration-300
                      hover:bg-white/80
                    "
                    style={{
                      boxShadow: '0 4px 20px rgba(251, 191, 36, 0.1)',
                    }}
                  >
                    <h3 className="text-stone-700 font-medium mb-2 line-clamp-2">
                      {collection.title}
                    </h3>
                    {question && (
                      <div className="flex items-center gap-3 text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <HeartIcon />
                          {question.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <CommentIcon />
                          {question.answer_count}
                        </span>
                        <span>
                          {question.channel === 'professional' ? '专业频道' : '经验频道'}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* 空状态 */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-5xl mb-4 opacity-50">🏖️</div>
              <h3 className="text-stone-600 font-medium mb-2">
                还没有捡到贝壳
              </h3>
              <p className="text-stone-400 text-sm mb-6">
                在社区中发现喜欢的内容，点击收藏吧
              </p>
              <Link
                href="/community"
                className="inline-block px-6 py-2.5 bg-stone-700 text-white rounded-full text-sm hover:bg-stone-800 transition-colors"
              >
                去逛逛社区
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// 图标组件
function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}
