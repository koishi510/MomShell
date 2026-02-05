'use client';

// frontend/app/community/collections/page.tsx
/**
 * 收藏页面 - 我的贝壳
 * 展示用户收藏的帖子
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyCollections, toggleLike, toggleCollection, type CollectionItem } from '../../../lib/api/community';
import { type Question } from '../../../types/community';
import CommunityBackground from '../../../components/community/CommunityBackground';
import QuestionDetailModal from '../../../components/community/QuestionDetailModal';
import PostCard from '../../../components/community/PostCard';
import { AuthGuard } from '../../../components/AuthGuard';

function CollectionsContent() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function loadCollections() {
      try {
        const response = await getMyCollections({ page: 1, page_size: 50 });
        setCollections(response.items);
      } catch (err) {
        console.error('Failed to load collections:', err);
        setError('加载失败，请刷新重试');
      } finally {
        setIsLoading(false);
      }
    }
    loadCollections();
  }, []);

  // 将 CollectionItem.question 转换为完整的 Question 类型
  const mapToQuestion = (item: CollectionItem['question']): Question => ({
    id: item.id,
    title: item.title,
    content: item.content_preview,
    content_preview: item.content_preview,
    channel: item.channel,
    status: 'published',
    author: {
      id: item.author?.id || 'unknown',
      nickname: item.author?.nickname || '匿名用户',
      avatar_url: item.author?.avatar_url || null,
      role: item.author?.role || 'mom',
      is_certified: item.author?.is_certified || false,
      certification_title: item.author?.certification_title,
    },
    tags: item.tags || [],
    image_urls: [],
    view_count: item.view_count || 0,
    answer_count: item.answer_count || 0,
    like_count: item.like_count || 0,
    collection_count: item.collection_count || 0,
    is_liked: item.is_liked || false,
    is_collected: true,
    professional_answer_count: 0,
    experience_answer_count: 0,
    created_at: item.created_at,
    has_accepted_answer: item.has_accepted_answer || false,
  });

  const handlePostClick = (question: Question) => {
    setSelectedQuestion(question);
  };

  const handleLike = async (id: string) => {
    try {
      const result = await toggleLike('question', id);
      setCollections((prev) =>
        prev.map((c) =>
          c.question.id === id
            ? {
                ...c,
                question: {
                  ...c.question,
                  is_liked: result.is_liked,
                  like_count: result.like_count,
                },
              }
            : c
        )
      );
      if (selectedQuestion?.id === id) {
        setSelectedQuestion((prev) =>
          prev ? { ...prev, is_liked: result.is_liked, like_count: result.like_count } : null
        );
      }
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  const handleCollect = async (id: string) => {
    try {
      const result = await toggleCollection(id);
      if (!result.is_collected) {
        setCollections((prev) => prev.filter((c) => c.question.id !== id));
        setSelectedQuestion(null);
      }
    } catch (err) {
      console.error('收藏失败:', err);
    }
  };

  const handleQuestionDeleted = (questionId: string) => {
    setCollections((prev) => prev.filter((c) => c.question.id !== questionId));
    setSelectedQuestion(null);
  };

  const handleViewCountUpdated = (questionId: string, viewCount: number) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.question.id === questionId
          ? { ...c, question: { ...c.question, view_count: viewCount } }
          : c
      )
    );
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion((prev) =>
        prev ? { ...prev, view_count: viewCount } : null
      );
    }
  };

  const handleAnswerCountUpdated = (questionId: string, answerCount: number) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.question.id === questionId
          ? { ...c, question: { ...c.question, answer_count: answerCount } }
          : c
      )
    );
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion((prev) =>
        prev ? { ...prev, answer_count: answerCount } : null
      );
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景 */}
      <CommunityBackground />

      {/* 顶部标题栏 */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200/50"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/community"
            className="text-stone-500 hover:text-stone-700 transition-colors"
          >
            ← 社区
          </Link>
          <span className="text-2xl">🐚</span>
          <span className="text-lg font-medium text-stone-700">我的贝壳</span>
        </div>
      </motion.header>

      {/* 主内容 */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 副标题 */}
        <div className="text-center mb-8">
          <p className="text-stone-500 text-sm">
            收藏的温暖，随时回顾
          </p>
        </div>

        {/* 加载状态 */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="text-stone-500">加载中...</div>
          </div>
        )}

        {/* 错误状态 */}
        {error && !isLoading && (
          <div className="flex flex-col items-center py-16">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-stone-800 text-white text-sm rounded-full hover:bg-stone-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* 收藏列表 */}
        {!isLoading && !error && (
          <>
            {collections.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {collections.map((collection) => (
                    <PostCard
                      key={collection.id}
                      question={mapToQuestion(collection.question)}
                      onLike={handleLike}
                      onCollect={handleCollect}
                      onClick={handlePostClick}
                    />
                  ))}
                </AnimatePresence>
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
                  className="inline-block px-6 py-2.5 bg-[#e8a4b8] text-white rounded-full text-sm hover:bg-[#d88a9f] transition-colors"
                >
                  去逛逛社区
                </Link>
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* 问题详情弹窗 */}
      <QuestionDetailModal
        question={selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
        onLike={handleLike}
        onCollect={handleCollect}
        onQuestionDeleted={handleQuestionDeleted}
        onViewCountUpdated={handleViewCountUpdated}
        onAnswerCountUpdated={handleAnswerCountUpdated}
      />
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <AuthGuard>
      <CollectionsContent />
    </AuthGuard>
  );
}
