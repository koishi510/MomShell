'use client';

// frontend/components/community/CommunityFeed.tsx
/**
 * 社区主页面组件
 * Feed 流 + 侧边栏布局
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChannelSwitcher from './ChannelSwitcher';
import PostCard from './PostCard';
import { type ChannelType, type Question, type HotTopic } from '../../types/community';
import { mockQuestions, mockHotTopics, mockCollections } from './mockData';

export default function CommunityFeed() {
  const [activeChannel, setActiveChannel] = useState<ChannelType>('experience');
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);

  // 根据频道筛选问题
  const filteredQuestions = questions.filter(
    (q) => q.channel === activeChannel && q.status !== 'hidden'
  );

  const handleLike = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              is_liked: !q.is_liked,
              like_count: q.is_liked ? q.like_count - 1 : q.like_count + 1,
            }
          : q
      )
    );
  };

  const handleCollect = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, is_collected: !q.is_collected } : q
      )
    );
  };

  const handlePostClick = (question: Question) => {
    // TODO: 打开详情弹窗或跳转详情页
    console.log('Open question:', question.id);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* 页面头部 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo / 标题 */}
            <div className="flex items-center gap-3">
              <motion.h1
                className="text-2xl font-light text-stone-700 tracking-wide"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                互助社区
              </motion.h1>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-xs rounded-full">
                Beta
              </span>
            </div>

            {/* 发帖按钮 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="
                px-5 py-2.5 rounded-full
                bg-stone-800 text-white text-sm font-medium
                shadow-lg shadow-stone-800/20
                hover:bg-stone-700 transition-colors
              "
            >
              <span className="flex items-center gap-2">
                <PlusIcon />
                提问
              </span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 左侧 Feed 流 */}
          <div className="flex-1 min-w-0">
            {/* 频道切换器 */}
            <div className="flex justify-center mb-6">
              <ChannelSwitcher
                activeChannel={activeChannel}
                onChannelChange={setActiveChannel}
              />
            </div>

            {/* 问题列表 */}
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredQuestions.map((question, index) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.05,
                      ease: 'easeOut',
                    }}
                  >
                    <PostCard
                      question={question}
                      onLike={handleLike}
                      onCollect={handleCollect}
                      onClick={handlePostClick}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 空状态 */}
              {filteredQuestions.length === 0 && (
                <EmptyState channel={activeChannel} />
              )}
            </div>
          </div>

          {/* 右侧侧边栏 */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-20 space-y-4">
              {/* 今日热门话题 */}
              <HotTopicsCard topics={mockHotTopics} />

              {/* 我的收藏 */}
              <MyCollectionsCard collections={mockCollections} />

              {/* 环境音效入口 */}
              <AmbientSoundCard />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

// 空状态
function EmptyState({ channel }: { channel: ChannelType }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-20 h-20 mb-4 rounded-full bg-stone-100 flex items-center justify-center">
        <span className="text-4xl">🌸</span>
      </div>
      <h3 className="text-lg font-medium text-stone-700 mb-2">
        {channel === 'professional'
          ? '暂无专业解答'
          : '还没有妈妈分享经验'}
      </h3>
      <p className="text-sm text-stone-500 mb-4">
        成为第一个发起话题的人吧
      </p>
      <button className="px-4 py-2 bg-stone-800 text-white text-sm rounded-full hover:bg-stone-700 transition-colors">
        立即提问
      </button>
    </motion.div>
  );
}

// 热门话题卡片
function HotTopicsCard({ topics }: { topics: HotTopic[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-2xl p-5 shadow-sm"
    >
      <h3 className="flex items-center gap-2 text-stone-700 font-medium mb-4">
        <span className="text-lg">🔥</span>
        今日热门话题
      </h3>
      <ul className="space-y-3">
        {topics.map((topic, index) => (
          <li key={topic.id}>
            <button className="w-full flex items-center gap-3 group">
              <span
                className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium
                  ${
                    index < 3
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-stone-100 text-stone-500'
                  }
                `}
              >
                {index + 1}
              </span>
              <span className="flex-1 text-sm text-stone-600 text-left truncate group-hover:text-stone-800 transition-colors">
                {topic.name}
              </span>
              <span className="text-xs text-stone-400">
                {topic.question_count}讨论
              </span>
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// 我的收藏卡片
function MyCollectionsCard({
  collections,
}: {
  collections: { id: string; title: string }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-2xl p-5 shadow-sm"
    >
      <h3 className="flex items-center gap-2 text-stone-700 font-medium mb-4">
        <span className="text-lg">⭐</span>
        我的收藏
      </h3>
      {collections.length > 0 ? (
        <ul className="space-y-2">
          {collections.slice(0, 5).map((item) => (
            <li key={item.id}>
              <button className="w-full text-sm text-stone-600 text-left truncate hover:text-stone-800 transition-colors">
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-400">还没有收藏内容</p>
      )}
      {collections.length > 5 && (
        <button className="mt-3 text-sm text-stone-500 hover:text-stone-700 transition-colors">
          查看全部 →
        </button>
      )}
    </motion.div>
  );
}

// 环境音效入口卡片
function AmbientSoundCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: 'linear-gradient(135deg, #DDD6FE 0%, #BFDBFE 100%)',
      }}
    >
      {/* 装饰性光晕 */}
      <motion.div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/30 blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🎵</span>
          <h3 className="text-stone-700 font-medium">放松一下</h3>
        </div>
        <p className="text-sm text-stone-600 mb-3">
          开启舒缓音乐，放松身心
        </p>
        <button className="px-4 py-2 bg-white/80 backdrop-blur-sm text-stone-700 text-sm rounded-full hover:bg-white transition-colors">
          打开音效 →
        </button>
      </div>
    </motion.div>
  );
}

// 加号图标
function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
