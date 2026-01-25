'use client';

// frontend/components/community/CommunityFeed.tsx
/**
 * 社区主页面组件
 * Feed 流 + 侧边栏布局
 * 视觉风格与首页"呼吸感"保持一致
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ChannelSwitcher from './ChannelSwitcher';
import PostCard from './PostCard';
import QuestionModal from './QuestionModal';
import QuestionDetailModal from './QuestionDetailModal';
import CommunityBackground from './CommunityBackground';
import { type ChannelType, type Question, type HotTopic } from '../../types/community';
import { mockQuestions, mockHotTopics, mockCollections } from './mockData';
import { SPRING_CONFIGS, GLASS_STYLES } from '../../lib/design-tokens';

// 敏感词库（模拟）
const SENSITIVE_KEYWORDS = {
  // 色情相关
  pornography: ['色情', '裸体', '性爱', '约炮', '一夜情', '援交', '卖淫', '嫖娼', 'AV', '黄片', '做爱'],
  // 暴力相关
  violence: ['杀人', '砍死', '打死', '暴力', '血腥', '虐待', '施暴', '殴打致死'],
  // 赌博相关
  gambling: ['赌博', '赌钱', '赌场', '博彩', '押注', '下注', '赌球', '六合彩', '时时彩', '网赌'],
  // 毒品相关
  drugs: ['毒品', '吸毒', '贩毒', '冰毒', '海洛因', '大麻', '摇头丸', 'K粉', '可卡因'],
  // 诈骗相关
  fraud: ['诈骗', '骗钱', '传销', '非法集资', '庞氏骗局'],
  // 政治敏感
  political: ['反党', '反政府', '颠覆政权', '分裂国家'],
  // 自残自杀
  selfHarm: ['自杀方法', '割腕教程', '跳楼方式', '怎么去死'],
};

// 审核函数
function moderateContent(title: string, content: string): { passed: boolean; reason?: string; category?: string } {
  const fullText = `${title} ${content}`.toLowerCase();

  for (const [category, keywords] of Object.entries(SENSITIVE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        const categoryNames: Record<string, string> = {
          pornography: '色情低俗',
          violence: '暴力血腥',
          gambling: '赌博相关',
          drugs: '毒品相关',
          fraud: '诈骗信息',
          political: '敏感内容',
          selfHarm: '危险信息',
        };
        return {
          passed: false,
          reason: `内容包含${categoryNames[category] || '敏感'}信息`,
          category,
        };
      }
    }
  }

  return { passed: true };
}

export default function CommunityFeed() {
  const [activeChannel, setActiveChannel] = useState<ChannelType>('experience');
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [moderationAlert, setModerationAlert] = useState<{ show: boolean; passed: boolean; reason?: string }>({
    show: false,
    passed: true,
  });

  // 模拟审核过程
  const simulateModeration = useCallback((questionId: string, title: string, content: string) => {
    // 模拟 2-4 秒的审核时间
    const delay = 2000 + Math.random() * 2000;

    setTimeout(() => {
      const result = moderateContent(title, content);

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, status: result.passed ? 'published' : 'hidden' }
            : q
        )
      );

      // 显示审核结果提示
      setModerationAlert({
        show: true,
        passed: result.passed,
        reason: result.reason,
      });

      // 3秒后隐藏提示
      setTimeout(() => {
        setModerationAlert({ show: false, passed: true });
      }, 3000);
    }, delay);
  }, []);

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
    setSelectedQuestion(question);
  };

  const handleNewQuestion = (title: string, content: string, channel: ChannelType) => {
    const questionId = `new-${Date.now()}`;
    const newQuestion: Question = {
      id: questionId,
      title,
      content,
      content_preview: content.slice(0, 100) + '...',
      channel,
      status: 'pending_review',
      author: {
        id: 'current-user',
        nickname: '我',
        avatar_url: null,
        role: 'mom',
        is_certified: false,
      },
      tags: [],
      image_urls: [],
      view_count: 0,
      answer_count: 0,
      like_count: 0,
      collection_count: 0,
      is_liked: false,
      is_collected: false,
      professional_answer_count: 0,
      experience_answer_count: 0,
      created_at: new Date().toISOString(),
      has_accepted_answer: false,
    };
    setQuestions((prev) => [newQuestion, ...prev]);
    setIsQuestionModalOpen(false);

    // 触发模拟审核
    simulateModeration(questionId, title, content);
  };

  // 点击热门话题
  const handleTopicClick = (topic: HotTopic) => {
    // 查找包含该话题关键词的问题
    const relatedQuestion = questions.find(
      (q) => q.title.includes(topic.name.slice(0, 4)) || q.tags.some((t) => t.name.includes(topic.name.slice(0, 4)))
    );
    if (relatedQuestion) {
      setSelectedQuestion(relatedQuestion);
    } else {
      alert(`暂无"${topic.name}"相关的问题，快来发起讨论吧！`);
    }
  };

  // 点击收藏
  const handleCollectionClick = (collection: { id: string; title: string }) => {
    const question = questions.find((q) => q.title === collection.title);
    if (question) {
      setSelectedQuestion(question);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 动态弥散渐变背景（低透明度） */}
      <CommunityBackground />

      {/* 审核结果提示 */}
      <AnimatePresence>
        {moderationAlert.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={SPRING_CONFIGS.gentle}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-lg backdrop-blur-md ${
              moderationAlert.passed
                ? 'bg-emerald-500/90 text-white'
                : 'bg-red-500/90 text-white'
            }`}
            style={{
              boxShadow: moderationAlert.passed
                ? '0 8px 32px rgba(16, 185, 129, 0.4)'
                : '0 8px 32px rgba(239, 68, 68, 0.4)',
            }}
          >
            <div className="flex items-center gap-2">
              {moderationAlert.passed ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>审核通过，已发布</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>审核未通过：{moderationAlert.reason}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 返回首页按钮 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Link
          href="/"
          className="fixed top-4 left-4 z-50 px-4 py-2.5 bg-white/70 backdrop-blur-md rounded-full text-stone-500 hover:text-stone-700 hover:bg-white/90 transition-all shadow-sm border border-white/50"
        >
          ← 返回首页
        </Link>
      </motion.div>

      {/* 页面头部 */}
      <header
        className="sticky top-0 z-40 border-b border-white/30"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
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
              <motion.span
                className="px-2.5 py-1 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-600 text-xs rounded-full font-medium"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                Beta
              </motion.span>
            </div>

            {/* 发帖按钮 */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsQuestionModalOpen(true)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="px-6 py-2.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, #1c1917 0%, #44403c 100%)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(28, 25, 23, 0.3)',
              }}
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
              <HotTopicsCard topics={mockHotTopics} onTopicClick={handleTopicClick} />

              {/* 我的收藏 */}
              <MyCollectionsCard collections={mockCollections} onCollectionClick={handleCollectionClick} />
            </div>
          </aside>
        </div>
      </main>

      {/* 提问弹窗 */}
      <QuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        onSubmit={handleNewQuestion}
        defaultChannel={activeChannel}
      />

      {/* 问题详情弹窗 */}
      <QuestionDetailModal
        question={selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
        onLike={handleLike}
        onCollect={handleCollect}
      />
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
function HotTopicsCard({
  topics,
  onTopicClick
}: {
  topics: HotTopic[];
  onTopicClick: (topic: HotTopic) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      whileHover={{ y: -3 }}
      className="rounded-3xl p-5 border border-white/50"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(251, 113, 133, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
      }}
    >
      <h3 className="flex items-center gap-2 text-stone-700 font-medium mb-4">
        <span className="text-lg">🔥</span>
        今日热门话题
      </h3>
      <ul className="space-y-3">
        {topics.map((topic, index) => (
          <li key={topic.id}>
            <motion.button
              onClick={() => onTopicClick(topic)}
              className="w-full flex items-center gap-3 group"
              whileHover={{ x: 3 }}
              transition={{ duration: 0.2 }}
            >
              <span
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${
                    index < 3
                      ? 'bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600'
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
            </motion.button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// 我的收藏卡片
function MyCollectionsCard({
  collections,
  onCollectionClick,
}: {
  collections: { id: string; title: string }[];
  onCollectionClick: (collection: { id: string; title: string }) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      whileHover={{ y: -3 }}
      className="rounded-3xl p-5 border border-white/50"
      style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 24px rgba(251, 191, 36, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
      }}
    >
      <h3 className="flex items-center gap-2 text-stone-700 font-medium mb-4">
        <span className="text-lg">⭐</span>
        我的收藏
      </h3>
      {collections.length > 0 ? (
        <ul className="space-y-2">
          {collections.slice(0, 5).map((item) => (
            <li key={item.id}>
              <motion.button
                onClick={() => onCollectionClick(item)}
                className="w-full text-sm text-stone-600 text-left truncate hover:text-stone-800 transition-colors"
                whileHover={{ x: 3 }}
                transition={{ duration: 0.2 }}
              >
                {item.title}
              </motion.button>
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
