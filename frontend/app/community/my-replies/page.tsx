'use client';

// frontend/app/community/my-replies/page.tsx
/**
 * 我的回答页面
 * 展示用户发布的所有回答
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyAnswers, deleteAnswer, toggleLike, toggleCollection, type MyAnswerItem } from '../../../lib/api/community';
import { type Question } from '../../../types/community';
import CommunityBackground from '../../../components/community/CommunityBackground';
import QuestionDetailModal from '../../../components/community/QuestionDetailModal';
import ReplyCard from '../../../components/community/ReplyCard';

export default function MyRepliesPage() {
  const [answers, setAnswers] = useState<MyAnswerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const hasFetched = useRef(false);

  // Load answers
  const loadAnswers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMyAnswers({ page: 1, page_size: 50 });
      setAnswers(response.items);
    } catch (err) {
      console.error('Failed to load answers:', err);
      setError('加载失败，请刷新重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadAnswers();
  }, [loadAnswers]);

  const handleAnswerClick = (answer: MyAnswerItem) => {
    // Construct minimal Question object, modal will fetch full details
    const question: Question = {
      id: answer.question.id,
      title: answer.question.title,
      content: '',
      content_preview: '',
      channel: answer.question.channel as any,
      status: 'published',
      author: {
        id: 'unknown',
        nickname: '匿名用户',
        avatar_url: null,
        role: 'mom',
        is_certified: false,
        certification_title: undefined,
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
      created_at: '',
      has_accepted_answer: false,
    };
    setSelectedQuestion(question);
  };

  const handleDelete = async (answerId: string) => {
    if (!confirm('确定要删除这条回答吗？')) return;

    try {
      await deleteAnswer(answerId);
      setAnswers((prev) => prev.filter((a) => a.id !== answerId));
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  const handleLike = async (id: string) => {
    try {
      const result = await toggleLike('question', id);
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
      if (selectedQuestion?.id === id) {
        setSelectedQuestion((prev) =>
          prev ? { ...prev, is_collected: result.is_collected, collection_count: result.collection_count } : null
        );
      }
    } catch (err) {
      console.error('收藏失败:', err);
    }
  };

  const handleQuestionDeleted = (questionId: string) => {
    setAnswers((prev) => prev.filter((a) => a.question.id !== questionId));
    setSelectedQuestion(null);
  };

  const handleViewCountUpdated = (questionId: string, viewCount: number) => {
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion((prev) =>
        prev ? { ...prev, view_count: viewCount } : null
      );
    }
  };

  const handleAnswerCreated = (questionId: string) => {
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion((prev) =>
        prev ? { ...prev, answer_count: prev.answer_count + 1 } : null
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
          <span className="text-2xl">💬</span>
          <span className="text-lg font-medium text-stone-700">我的回答</span>
        </div>
      </motion.header>

      {/* 主内容 */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 副标题 */}
        <div className="text-center mb-8">
          <p className="text-stone-500 text-sm">
            你的每一份回答，都是爱的传递
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
              onClick={() => {
                hasFetched.current = false;
                loadAnswers();
              }}
              className="px-4 py-2 bg-stone-800 text-white text-sm rounded-full hover:bg-stone-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* 回答列表 */}
        {!isLoading && !error && (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {answers.map((answer) => (
                <ReplyCard
                  key={answer.id}
                  answer={answer}
                  onClick={() => handleAnswerClick(answer)}
                  onDelete={() => handleDelete(answer.id)}
                />
              ))}
            </AnimatePresence>

            {/* 空状态 */}
            {answers.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="text-5xl mb-4 opacity-50">💭</div>
                <h3 className="text-stone-600 font-medium mb-2">
                  还没有回答过问题
                </h3>
                <p className="text-stone-400 text-sm mb-6">
                  去帮助其他妈妈，分享你的经验吧
                </p>
                <Link
                  href="/community"
                  className="inline-block px-6 py-2.5 bg-[#e8a4b8] text-white rounded-full text-sm hover:bg-[#d88a9f] transition-colors"
                >
                  去社区看看
                </Link>
              </motion.div>
            )}
          </div>
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
        onAnswerCreated={handleAnswerCreated}
      />
    </div>
  );
}
