/**
 * Community Page - 圈
 * Social community for sharing experiences
 * Design: Calm app inspired - Lavender Dream / Deep Ocean Night
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { getIdentity, UserIdentity } from '../../lib/api/beach';
import {
  getQuestions,
  getHotQuestions,
  createQuestion,
  QuestionListItem,
  formatRelativeTime,
} from '../../lib/api/community';
import BottomNav from '../../components/BottomNav';

type TabType = 'latest' | 'hot';

// Calm-inspired color themes
const THEME = {
  mom: {
    bg: 'linear-gradient(180deg, #F8F6FF 0%, #F3EFFF 50%, #EDE7FF 100%)',
    text: '#4A4063',
    textLight: '#7B6F99',
    accent: '#B8A9E8',
    accentGradient: 'linear-gradient(135deg, #B8A9E8 0%, #D4C8F0 100%)',
    card: 'rgba(255, 255, 255, 0.72)',
    cardBorder: 'rgba(184, 169, 232, 0.25)',
    headerBg: 'rgba(248, 246, 255, 0.92)',
    inputBg: 'rgba(255, 255, 255, 0.5)',
    tagBg: 'rgba(184, 169, 232, 0.12)',
    glow: 'rgba(184, 169, 232, 0.35)',
  },
  dad: {
    bg: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 50%, #1F3044 100%)',
    text: '#E8EEF4',
    textLight: '#8BA4BC',
    accent: '#64B5F6',
    accentGradient: 'linear-gradient(135deg, #64B5F6 0%, #90CAF9 100%)',
    card: 'rgba(27, 40, 56, 0.75)',
    cardBorder: 'rgba(100, 181, 246, 0.18)',
    headerBg: 'rgba(13, 27, 42, 0.92)',
    inputBg: 'rgba(27, 40, 56, 0.5)',
    tagBg: 'rgba(100, 181, 246, 0.12)',
    glow: 'rgba(100, 181, 246, 0.3)',
  },
};

export default function CommunityPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('latest');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMom = identity === 'origin_seeker';
  const theme = isMom ? THEME.mom : THEME.dad;

  const fetchQuestions = useCallback(async (tab: TabType) => {
    try {
      setIsRefreshing(true);
      const data = tab === 'hot'
        ? await getHotQuestions({ page_size: 20 })
        : await getQuestions({ sort_by: 'created_at', order: 'desc', page_size: 20 });
      setQuestions(data.items);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setError('加载失败，请稍后重试');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      if (!authLoading) {
        if (!isAuthenticated) {
          router.push('/');
          return;
        }
        try {
          const data = await getIdentity();
          setIdentity(data.identity);
          await fetchQuestions('latest');
        } catch {
          router.push('/');
        } finally {
          setIsLoading(false);
        }
      }
    }
    init();
  }, [authLoading, isAuthenticated, router, fetchQuestions]);

  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    await fetchQuestions(tab);
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    setIsPosting(true);
    try {
      await createQuestion({
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        channel: 'experience',
      });
      setNewPostTitle('');
      setNewPostContent('');
      setShowNewPost(false);
      await fetchQuestions(activeTab);
    } catch (err) {
      console.error('Failed to create post:', err);
      setError('发布失败，请稍后重试');
    } finally {
      setIsPosting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-5xl"
        >
          🐚
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: theme.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-5 pt-12 pb-5 backdrop-blur-2xl"
        style={{ backgroundColor: theme.headerBg }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-medium tracking-tight" style={{ color: theme.text }}>
              贝壳圈
            </h1>
            <p className="text-sm mt-1 opacity-70" style={{ color: theme.textLight }}>
              分享你的故事
            </p>
          </div>
          <motion.button
            onClick={() => setShowNewPost(true)}
            className="px-5 py-2.5 rounded-full text-sm font-medium"
            style={{
              background: theme.accentGradient,
              color: isMom ? '#4A4063' : '#0D1B2A',
              boxShadow: `0 4px 16px ${theme.glow}`,
            }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            发帖
          </motion.button>
        </div>

        {/* Tabs */}
        <div
          className="flex p-1 rounded-2xl"
          style={{ backgroundColor: isMom ? 'rgba(184,169,232,0.1)' : 'rgba(100,181,246,0.1)' }}
        >
          {(['latest', 'hot'] as const).map((tab) => (
            <motion.button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: activeTab === tab ? theme.accentGradient : 'transparent',
                color: activeTab === tab ? (isMom ? '#4A4063' : '#0D1B2A') : theme.textLight,
              }}
              whileTap={{ scale: 0.98 }}
            >
              {tab === 'latest' ? '最新' : '热门'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-3 mb-4 rounded-2xl"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
          >
            {error}
          </motion.div>
        )}

        {isRefreshing ? (
          <div className="flex justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="text-4xl"
            >
              🌊
            </motion.div>
          </div>
        ) : questions.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="text-7xl mb-6"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🐚
            </motion.div>
            <h2 className="text-lg font-medium mb-2" style={{ color: theme.text }}>
              还没有帖子
            </h2>
            <p className="text-sm opacity-60" style={{ color: theme.textLight }}>
              成为第一个分享的人吧
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                theme={theme}
                isMom={isMom}
                index={index}
                onClick={() => router.push(`/community/${question.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPost && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" style={{ background: theme.bg }} />

            {/* Modal Header */}
            <div
              className="relative flex items-center justify-between px-5 py-4 border-b backdrop-blur-2xl"
              style={{
                backgroundColor: theme.headerBg,
                borderColor: theme.cardBorder,
              }}
            >
              <button
                onClick={() => setShowNewPost(false)}
                className="text-sm px-4 py-2 rounded-full transition-colors"
                style={{
                  color: theme.textLight,
                  backgroundColor: isMom ? 'rgba(184,169,232,0.1)' : 'rgba(100,181,246,0.1)',
                }}
              >
                取消
              </button>
              <h2 className="font-medium" style={{ color: theme.text }}>发布</h2>
              <motion.button
                onClick={handleCreatePost}
                disabled={!newPostTitle.trim() || !newPostContent.trim() || isPosting}
                className="px-5 py-2 rounded-full text-sm font-medium disabled:opacity-40"
                style={{
                  background: theme.accentGradient,
                  color: isMom ? '#4A4063' : '#0D1B2A',
                }}
                whileTap={{ scale: 0.95 }}
              >
                {isPosting ? '发布中...' : '发布'}
              </motion.button>
            </div>

            {/* Modal Content */}
            <div className="relative flex-1 px-5 py-5 overflow-y-auto">
              <input
                type="text"
                placeholder="标题"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl mb-4 focus:outline-none transition-all text-base"
                style={{
                  backgroundColor: theme.inputBg,
                  border: `1px solid ${theme.cardBorder}`,
                  color: theme.text,
                }}
                maxLength={200}
              />
              <textarea
                placeholder="分享你的想法..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl focus:outline-none resize-none transition-all text-base"
                style={{
                  backgroundColor: theme.inputBg,
                  border: `1px solid ${theme.cardBorder}`,
                  color: theme.text,
                  minHeight: '200px',
                }}
                maxLength={10000}
              />
              <p className="text-xs mt-3 text-right opacity-50" style={{ color: theme.textLight }}>
                {newPostContent.length}/10000
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav currentPage="community" identity={identity} />
    </div>
  );
}

function QuestionCard({
  question,
  theme,
  isMom,
  index,
  onClick,
}: {
  question: QuestionListItem;
  theme: typeof THEME.mom;
  isMom: boolean;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      className={`rounded-3xl p-5 cursor-pointer ${isMom ? 'glass-card' : 'glass-card-dark'}`}
      style={{
        backgroundColor: theme.card,
        border: `1px solid ${theme.cardBorder}`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
    >
      {/* Author */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{
            background: isMom
              ? 'linear-gradient(135deg, #DDD6F5 0%, #E8C4C4 100%)'
              : 'linear-gradient(135deg, #1F3044 0%, #2A4A6B 100%)',
            border: `2px solid ${theme.cardBorder}`,
          }}
        >
          {question.author.avatar_url ? (
            <img src={question.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            '👤'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: theme.text }}>
              {question.author.nickname}
            </span>
            {question.author.is_certified && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
              >
                认证
              </span>
            )}
          </div>
          <span className="text-xs opacity-60" style={{ color: theme.textLight }}>
            {formatRelativeTime(question.created_at)}
          </span>
        </div>
        {question.is_pinned && (
          <span
            className="text-xs px-3 py-1 rounded-full font-medium"
            style={{
              background: theme.accentGradient,
              color: isMom ? '#4A4063' : '#0D1B2A',
            }}
          >
            置顶
          </span>
        )}
      </div>

      {/* Content */}
      <h3 className="font-medium mb-2 line-clamp-2" style={{ color: theme.text }}>
        {question.title}
      </h3>
      <p
        className="text-sm mb-4 line-clamp-2 opacity-70 break-words"
        style={{ color: theme.textLight, wordBreak: 'break-word' }}
      >
        {question.content_preview}
      </p>

      {/* Tags */}
      {question.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {question.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="text-xs px-3 py-1 rounded-full"
              style={{
                backgroundColor: theme.tagBg,
                color: theme.textLight,
              }}
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-5 text-xs opacity-60" style={{ color: theme.textLight }}>
        <span className="flex items-center gap-1.5">
          <span>👁</span> {question.view_count}
        </span>
        <span className="flex items-center gap-1.5">
          <span>💬</span> {question.answer_count}
        </span>
        <span className="flex items-center gap-1.5">
          <span>❤️</span> {question.like_count}
        </span>
        {question.has_accepted_answer && (
          <span style={{ color: '#22c55e' }}>✓ 已解决</span>
        )}
      </div>
    </motion.div>
  );
}
