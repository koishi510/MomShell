"use client";

// frontend/app/community/my-posts/page.tsx
/**
 * 我的提问页面
 * 展示用户发布的所有问题
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  getMyQuestions,
  toggleLike,
  toggleCollection,
  type MyQuestionItem,
} from "../../../lib/api/community";
import { getUserId } from "../../../lib/user";
import { type Question } from "../../../types/community";
import CommunityBackground from "../../../components/community/CommunityBackground";
import QuestionDetailModal from "../../../components/community/QuestionDetailModal";
import PostCard from "../../../components/community/PostCard";
import { AuthGuard } from "../../../components/AuthGuard";

function MyPostsContent() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );
  const hasFetched = useRef(false);

  // Convert MyQuestionItem to Question type
  const mapToQuestion = useCallback(
    (item: MyQuestionItem): Question => ({
      id: item.id,
      title: item.title,
      content: item.content_preview,
      content_preview: item.content_preview,
      channel: item.channel as any,
      status: item.status as any,
      author: {
        id: getUserId(),
        nickname: "我",
        avatar_url: null,
        role: "mom",
        is_certified: false,
        certification_title: undefined,
      },
      tags: item.tags,
      image_urls: [],
      view_count: item.view_count,
      answer_count: item.answer_count,
      like_count: item.like_count,
      collection_count: item.collection_count,
      is_liked: item.is_liked,
      is_collected: item.is_collected,
      professional_answer_count: 0,
      experience_answer_count: 0,
      created_at: item.created_at,
      has_accepted_answer: item.has_accepted_answer,
    }),
    [],
  );

  // Load questions
  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMyQuestions({ page: 1, page_size: 50 });
      setQuestions(response.items.map(mapToQuestion));
    } catch (err) {
      console.error("Failed to load questions:", err);
      setError("加载失败，请刷新重试");
    } finally {
      setIsLoading(false);
    }
  }, [mapToQuestion]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadQuestions();
  }, [loadQuestions]);

  const handlePostClick = (question: Question) => {
    setSelectedQuestion(question);
  };

  const handleLike = async (id: string) => {
    try {
      const result = await toggleLike("question", id);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, is_liked: result.is_liked, like_count: result.like_count }
            : q,
        ),
      );
      if (selectedQuestion?.id === id) {
        setSelectedQuestion((prev) =>
          prev
            ? {
                ...prev,
                is_liked: result.is_liked,
                like_count: result.like_count,
              }
            : null,
        );
      }
    } catch (err) {
      console.error("点赞失败:", err);
    }
  };

  const handleCollect = async (id: string) => {
    try {
      const result = await toggleCollection(id);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                is_collected: result.is_collected,
                collection_count: result.collection_count,
              }
            : q,
        ),
      );
      if (selectedQuestion?.id === id) {
        setSelectedQuestion((prev) =>
          prev
            ? {
                ...prev,
                is_collected: result.is_collected,
                collection_count: result.collection_count,
              }
            : null,
        );
      }
    } catch (err) {
      console.error("收藏失败:", err);
    }
  };

  const handleQuestionDeleted = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    setSelectedQuestion(null);
  };

  const handleViewCountUpdated = (questionId: string, viewCount: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, view_count: viewCount } : q,
      ),
    );
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion((prev) =>
        prev ? { ...prev, view_count: viewCount } : null,
      );
    }
  };

  const handleAnswerCreated = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, answer_count: q.answer_count + 1 } : q,
      ),
    );
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion((prev) =>
        prev ? { ...prev, answer_count: prev.answer_count + 1 } : null,
      );
    }
  };

  const handleAnswerCountUpdated = (
    questionId: string,
    answerCount: number,
  ) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, answer_count: answerCount } : q,
      ),
    );
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion((prev) =>
        prev ? { ...prev, answer_count: answerCount } : null,
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
          <span className="text-2xl">📝</span>
          <span className="text-lg font-medium text-stone-700">我的提问</span>
        </div>
      </motion.header>

      {/* 主内容 */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 副标题 */}
        <div className="text-center mb-8">
          <p className="text-stone-500 text-sm">
            你提出的每一个问题，都是成长的脚印
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
                loadQuestions();
              }}
              className="px-4 py-2 bg-stone-800 text-white text-sm rounded-full hover:bg-stone-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* 问题列表 */}
        {!isLoading && !error && (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {questions.map((question) => (
                <PostCard
                  key={question.id}
                  question={question}
                  onLike={handleLike}
                  onCollect={handleCollect}
                  onClick={handlePostClick}
                />
              ))}
            </AnimatePresence>

            {/* 空状态 */}
            {questions.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="text-5xl mb-4 opacity-50">🌱</div>
                <h3 className="text-stone-600 font-medium mb-2">
                  还没有发布过问题
                </h3>
                <p className="text-stone-400 text-sm mb-6">
                  有什么想问的，勇敢说出来吧
                </p>
                <Link
                  href="/community"
                  className="inline-block px-6 py-2.5 bg-[#e8a4b8] text-white rounded-full text-sm hover:bg-[#d88a9f] transition-colors"
                >
                  去提问
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
        onAnswerCountUpdated={handleAnswerCountUpdated}
      />
    </div>
  );
}

export default function MyPostsPage() {
  return (
    <AuthGuard>
      <MyPostsContent />
    </AuthGuard>
  );
}
