"use client";

// frontend/components/community/CommunityFeed.tsx
/**
 * 社区主页面组件
 * Feed 流 + 侧边栏布局
 * 视觉风格与首页"呼吸感"保持一致
 */

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ChannelSwitcher from "./ChannelSwitcher";
import PostCard from "./PostCard";
import QuestionModal from "./QuestionModal";
import QuestionDetailModal from "./QuestionDetailModal";
import CommunityBackground from "./CommunityBackground";
import UserMenu from "./UserMenu";
import { type ChannelType, type Question } from "../../types/community";
import { SPRING_CONFIGS } from "../../lib/design-tokens";
import {
  getQuestions,
  createQuestion as apiCreateQuestion,
  toggleLike,
  toggleCollection,
} from "../../lib/api/community";
import { getErrorMessage } from "../../lib/apiClient";
import { useAuth } from "../../contexts/AuthContext";

export default function CommunityFeed() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState<ChannelType>("experience");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    show: boolean;
    success: boolean;
    text: string;
  }>({
    show: false,
    success: true,
    text: "",
  });

  // 加载问题列表
  const loadQuestions = useCallback(async (channel?: ChannelType) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getQuestions({
        channel: channel,
        page: 1,
        page_size: 50,
        sort_by: "created_at",
        order: "desc",
      });

      // 转换 API 响应到前端类型
      const mappedQuestions: Question[] = response.items.map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content || item.content_preview || "",
        content_preview: item.content_preview || "",
        channel: item.channel,
        status: "published",
        author: {
          id: item.author?.id || "unknown",
          nickname:
            item.author?.nickname || item.author?.display_name || "匿名用户",
          avatar_url: item.author?.avatar_url || null,
          role: item.author?.role || "mom",
          is_certified: item.author?.is_certified || false,
          certification_title: item.author?.certification_title,
        },
        tags: item.tags || [],
        image_urls: item.image_urls || [],
        view_count: item.view_count || 0,
        answer_count: item.answer_count || 0,
        like_count: item.like_count || 0,
        collection_count: item.collection_count || 0,
        is_liked: item.is_liked || false,
        is_collected: item.is_collected || false,
        professional_answer_count: item.professional_answer_count || 0,
        experience_answer_count: item.experience_answer_count || 0,
        created_at: item.created_at,
        has_accepted_answer: item.has_accepted_answer || false,
      }));

      setQuestions(mappedQuestions);
    } catch (err) {
      console.error("Failed to load questions:", err);
      setError("加载失败，请刷新重试");
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadQuestions(activeChannel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadQuestions]);

  // 切换频道时重新加载
  const handleChannelChange = useCallback(
    (channel: ChannelType) => {
      setActiveChannel(channel);
      loadQuestions(channel);
    },
    [loadQuestions],
  );

  // 根据频道筛选问题（如果 API 已经筛选则不需要前端筛选）
  const filteredQuestions = questions;

  const handleLike = async (id: string) => {
    try {
      const result = await toggleLike("question", id);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                is_liked: result.is_liked,
                like_count: result.like_count,
              }
            : q,
        ),
      );
      // 同步更新详情弹窗中的状态
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
      // 同步更新详情弹窗中的状态
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

  const handlePostClick = (question: Question) => {
    setSelectedQuestion(question);
  };

  const handleAnswerCreated = (questionId: string) => {
    // 更新问题列表中的回复数
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, answer_count: q.answer_count + 1 } : q,
      ),
    );
    // 同步更新详情弹窗中的状态
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion((prev) =>
        prev ? { ...prev, answer_count: prev.answer_count + 1 } : null,
      );
    }
  };

  const handleQuestionDeleted = (questionId: string) => {
    // 从列表中移除被删除的问题
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    setSelectedQuestion(null);
  };

  const handleViewCountUpdated = (questionId: string, viewCount: number) => {
    // 更新问题列表中的浏览数
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, view_count: viewCount } : q,
      ),
    );
    // 同步更新详情弹窗中的状态
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion((prev) =>
        prev ? { ...prev, view_count: viewCount } : null,
      );
    }
  };

  const handleAnswerCountUpdated = (
    questionId: string,
    answerCount: number,
  ) => {
    // 更新问题列表中的回复数（修复 AI 回复计数不同步问题）
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, answer_count: answerCount } : q,
      ),
    );
    // 同步更新详情弹窗中的状态
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion((prev) =>
        prev ? { ...prev, answer_count: answerCount } : null,
      );
    }
  };

  const handleNewQuestion = async (
    title: string,
    content: string,
    channel: ChannelType,
  ) => {
    setIsSubmitting(true);

    try {
      await apiCreateQuestion({
        title,
        content,
        channel,
        tag_ids: [],
        image_urls: [],
      });

      setIsQuestionModalOpen(false);
      setSubmitMessage({ show: true, success: true, text: "发布成功！" });

      // 重新加载列表
      await loadQuestions(activeChannel);

      // 3秒后隐藏提示
      setTimeout(() => {
        setSubmitMessage({ show: false, success: true, text: "" });
      }, 3000);
    } catch (err: unknown) {
      setSubmitMessage({
        show: true,
        success: false,
        text: getErrorMessage(err),
      });

      setTimeout(() => {
        setSubmitMessage({ show: false, success: true, text: "" });
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAskClick = () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    setIsQuestionModalOpen(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 动态弥散渐变背景（低透明度） */}
      <CommunityBackground />

      {/* 提交结果提示 */}
      <AnimatePresence>
        {submitMessage.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            transition={SPRING_CONFIGS.gentle}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-lg backdrop-blur-md ${
              submitMessage.success
                ? "bg-emerald-500/90 text-white"
                : "bg-red-500/90 text-white"
            }`}
            style={{
              boxShadow: submitMessage.success
                ? "0 8px 32px rgba(16, 185, 129, 0.4)"
                : "0 8px 32px rgba(239, 68, 68, 0.4)",
            }}
          >
            <div className="flex items-center gap-2">
              {submitMessage.success ? (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{submitMessage.text}</span>
                </>
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>{submitMessage.text}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 页面头部 */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-stone-200/50"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* 左侧：返回按钮 + 标题 */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-stone-500 hover:text-stone-700 transition-colors"
            >
              ← 首页
            </Link>
            <span className="text-2xl">👩‍👩‍👧</span>
            <span className="text-lg font-medium text-stone-700">经验连接</span>
          </div>

          {/* 发帖按钮 */}
          <button
            onClick={handleAskClick}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 bg-[#e8a4b8] text-white hover:bg-[#d88a9f]"
          >
            <span className="flex items-center gap-2">
              <PlusIcon />
              提问
            </span>
          </button>
        </div>
      </motion.header>

      {/* 主内容区 */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 左侧 Feed 流 */}
          <div className="flex-1 min-w-0">
            {/* 频道切换器 */}
            <div className="flex justify-center mb-6">
              <ChannelSwitcher
                activeChannel={activeChannel}
                onChannelChange={handleChannelChange}
              />
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
                  onClick={() => loadQuestions(activeChannel)}
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
                  {filteredQuestions.map((question) => (
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
                {filteredQuestions.length === 0 && (
                  <EmptyState channel={activeChannel} onAsk={handleAskClick} />
                )}
              </div>
            )}
          </div>

          {/* 右侧侧边栏 */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* 用户菜单 */}
              <UserMenu />
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
        onAnswerCreated={handleAnswerCreated}
        onAnswerCountUpdated={handleAnswerCountUpdated}
        onQuestionDeleted={handleQuestionDeleted}
        onViewCountUpdated={handleViewCountUpdated}
      />
    </div>
  );
}

// 空状态
function EmptyState({
  channel,
  onAsk,
}: {
  channel: ChannelType;
  onAsk: () => void;
}) {
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
        {channel === "professional" ? "暂无专业解答" : "还没有妈妈分享经验"}
      </h3>
      <p className="text-sm text-stone-500 mb-4">成为第一个发起话题的人吧</p>
      <button
        onClick={onAsk}
        className="px-4 py-2 bg-[#e8a4b8] text-white text-sm rounded-full hover:bg-[#d88a9f] transition-colors"
      >
        立即提问
      </button>
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
