'use client';

// frontend/components/community/QuestionDetailModal.tsx
/**
 * 问题详情弹窗
 * 显示问题全文和回答列表
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Question, type Answer, ROLE_CONFIG } from '../../types/community';
import { getQuestion, getAnswers, createAnswer, toggleLike, deleteQuestion, deleteAnswer, getComments, createComment, deleteComment, type Comment } from '../../lib/api/community';
import { getUserId } from '../../lib/user';

// 模块级别对象，同步标记正在处理的问题，防止重复调用
const viewingInProgress: Record<string, boolean> = {};

interface QuestionDetailModalProps {
  question: Question | null;
  onClose: () => void;
  onLike: (id: string) => void;
  onCollect: (id: string) => void;
  onAnswerCreated?: (questionId: string) => void;
  onQuestionDeleted?: (questionId: string) => void;
  onViewCountUpdated?: (questionId: string, viewCount: number) => void;
}

export default function QuestionDetailModal({
  question,
  onClose,
  onLike,
  onCollect,
  onAnswerCreated,
  onQuestionDeleted,
  onViewCountUpdated,
}: QuestionDetailModalProps) {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [viewCount, setViewCount] = useState<number>(0);

  // 获取当前用户 ID
  useEffect(() => {
    setCurrentUserId(getUserId());
  }, []);

  // 加载回答列表
  const loadAnswers = useCallback(async (questionId: string) => {
    setIsLoadingAnswers(true);
    try {
      const response = await getAnswers(questionId, {
        page: 1,
        page_size: 50,
        sort_by: 'created_at',
        order: 'desc',
      });
      setAnswers(response.items);
    } catch (err) {
      console.error('加载回答失败:', err);
    } finally {
      setIsLoadingAnswers(false);
    }
  }, []);

  // 当问题变化时加载回答并增加浏览数
  useEffect(() => {
    if (question) {
      loadAnswers(question.id);
      setReplyContent('');
      setViewCount(question.view_count);

      // 使用模块级对象同步标记，确保只调用一次 API
      if (!viewingInProgress[question.id]) {
        viewingInProgress[question.id] = true;
        getQuestion(question.id).then((detail) => {
          setViewCount(detail.view_count);
          onViewCountUpdated?.(question.id, detail.view_count);
        }).catch(console.error);
      }
    } else {
      setAnswers([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, loadAnswers]);

  // 提交回答
  const handleSubmitReply = async () => {
    if (!question || !replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newAnswer = await createAnswer(question.id, {
        content: replyContent.trim(),
      });
      setAnswers((prev) => [newAnswer, ...prev]);
      setReplyContent('');
      // 通知父组件更新回复数
      onAnswerCreated?.(question.id);
    } catch (err: any) {
      console.error('回复失败:', err);
      alert(err.message || '回复失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 点赞回答
  const handleLikeAnswer = async (answerId: string) => {
    try {
      const result = await toggleLike('answer', answerId);
      setAnswers((prev) =>
        prev.map((a) =>
          a.id === answerId
            ? { ...a, is_liked: result.is_liked, like_count: result.like_count }
            : a
        )
      );
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  // 删除问题
  const handleDeleteQuestion = async () => {
    if (!question) return;
    if (!confirm('确定要删除这个问题吗？删除后无法恢复。')) return;

    try {
      await deleteQuestion(question.id);
      onQuestionDeleted?.(question.id);
      onClose();
    } catch (err: any) {
      console.error('删除失败:', err);
      alert(err.message || '删除失败');
    }
  };

  // 删除回答
  const handleDeleteAnswer = async (answerId: string) => {
    if (!confirm('确定要删除这条回答吗？')) return;

    try {
      await deleteAnswer(answerId);
      setAnswers((prev) => prev.filter((a) => a.id !== answerId));
    } catch (err: any) {
      console.error('删除失败:', err);
      alert(err.message || '删除失败');
    }
  };

  // 检查是否可以删除问题（作者本人）
  const canDeleteQuestion = question && currentUserId === question.author.id;

  // 检查是否可以删除回答（回答作者或问题作者）
  const canDeleteAnswer = (answer: Answer) => {
    if (!question) return false;
    return currentUserId === answer.author?.id || currentUserId === question.author.id;
  };

  const roleConfig = question ? ROLE_CONFIG[question.author.role] : ROLE_CONFIG.mom;

  return (
    <AnimatePresence>
      {question && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* 弹窗内容 */}
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full md:w-[600px] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* 头部 */}
            <div className="flex items-center gap-3 p-4 border-b border-stone-100">
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors"
              >
                <ChevronLeftIcon />
              </button>
              <span className="text-stone-600 font-medium">问题详情</span>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto">
              {/* 问题区域 */}
              <div className="p-5">
                {/* 作者信息 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-medium">
                    {question.author.nickname.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-700">
                        {question.author.nickname}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig.badgeColor}`}
                      >
                        {roleConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">
                      {formatRelativeTime(question.created_at)}
                    </p>
                  </div>
                </div>

                {/* 标题和内容 */}
                <h1 className="text-xl font-medium text-stone-800 mb-3">
                  {question.title}
                </h1>
                <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">
                  {question.content}
                </p>

                {/* 标签 */}
                {question.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {question.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2.5 py-1 bg-stone-100 text-stone-600 text-xs rounded-full"
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* 互动栏 */}
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-stone-100">
                  <button
                    onClick={() => onLike(question.id)}
                    className={`flex items-center gap-1.5 ${
                      question.is_liked
                        ? 'text-rose-500'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    <HeartIcon filled={question.is_liked} />
                    <span className="text-sm">{question.like_count}</span>
                  </button>
                  <button
                    onClick={() => onCollect(question.id)}
                    className={`flex items-center gap-1.5 ${
                      question.is_collected
                        ? 'text-amber-500'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    <BookmarkIcon filled={question.is_collected} />
                    <span className="text-sm">收藏</span>
                  </button>
                  <span className="text-sm text-stone-400">
                    {viewCount} 浏览
                  </span>
                  {canDeleteQuestion && (
                    <button
                      onClick={handleDeleteQuestion}
                      className="ml-auto flex items-center gap-1.5 text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <TrashIcon />
                      <span className="text-sm">删除</span>
                    </button>
                  )}
                </div>

                {/* 回答区域 */}
                <div className="mt-6 pt-6 border-t border-stone-100">
                  <h2 className="text-stone-700 font-medium mb-4">
                    {answers.length} 个回答
                  </h2>

                  {/* 回复输入框 */}
                  <div className="mb-6">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="分享你的经验或建议..."
                      className="w-full p-3 border border-stone-200 rounded-xl resize-none focus:outline-none focus:border-stone-400 text-stone-700"
                      rows={3}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleSubmitReply}
                        disabled={!replyContent.trim() || isSubmitting}
                        className="px-4 py-2 bg-[#e8a4b8] text-white text-sm rounded-full hover:bg-[#d88a9f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? '发送中...' : '发送回复'}
                      </button>
                    </div>
                  </div>

                  {/* 加载状态 */}
                  {isLoadingAnswers && (
                    <div className="py-8 text-center text-stone-400">
                      加载中...
                    </div>
                  )}

                  {/* 回答列表 */}
                  {!isLoadingAnswers && answers.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-stone-400">暂无回答，来分享你的经验吧</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {answers.map((answer) => (
                        <AnswerCard
                          key={answer.id}
                          answer={answer}
                          onLike={handleLikeAnswer}
                          onDelete={handleDeleteAnswer}
                          canDelete={canDeleteAnswer(answer)}
                          currentUserId={currentUserId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// 图标组件
function ChevronLeftIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-stone-600"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

// 相对时间格式化
function formatRelativeTime(dateString: string): string {
  const normalizedDateString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
  const date = new Date(normalizedDateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// 回答卡片组件
function AnswerCard({
  answer,
  onLike,
  onDelete,
  canDelete,
  currentUserId,
}: {
  answer: Answer;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  currentUserId: string;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; nickname: string } | null>(null);

  const authorName = answer.author?.nickname || '匿名用户';
  const authorRole = answer.author?.role || 'mom';
  const roleConfig = ROLE_CONFIG[authorRole] || ROLE_CONFIG.mom;

  // 加载评论
  const loadComments = async () => {
    if (isLoadingComments) return;
    setIsLoadingComments(true);
    try {
      const data = await getComments(answer.id);
      setComments(data);
    } catch (err) {
      console.error('加载评论失败:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // 切换显示评论
  const toggleComments = () => {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  // 提交评论
  const handleSubmitComment = async () => {
    if (!commentContent.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const newComment = await createComment(answer.id, {
        content: commentContent.trim(),
        parent_id: replyingTo?.id,
      });

      if (replyingTo) {
        // Find the root comment that contains replyingTo (either itself or in its replies)
        setComments((prev) =>
          prev.map((c) => {
            // If replying to root comment or a reply under this root
            if (c.id === replyingTo.id || c.replies.some((r) => r.id === replyingTo.id)) {
              return { ...c, replies: [...c.replies, newComment] };
            }
            return c;
          })
        );
      } else {
        setComments((prev) => [...prev, newComment]);
      }

      setCommentContent('');
      setReplyingTo(null);
    } catch (err: any) {
      console.error('评论失败:', err);
      alert(err.message || '评论失败');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;

    try {
      await deleteComment(commentId);
      // 从列表或嵌套 replies 中移除
      setComments((prev) =>
        prev
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: c.replies.filter((r) => r.id !== commentId),
          }))
      );
    } catch (err: any) {
      console.error('删除评论失败:', err);
      alert(err.message || '删除失败');
    }
  };

  // 点赞评论
  const handleLikeComment = async (commentId: string) => {
    try {
      const result = await toggleLike('comment', commentId);
      // 更新评论状态
      const updateComment = (c: Comment): Comment =>
        c.id === commentId
          ? { ...c, is_liked: result.is_liked, like_count: result.like_count }
          : { ...c, replies: c.replies.map(updateComment) };
      setComments((prev) => prev.map(updateComment));
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  return (
    <div className="p-4 bg-stone-50 rounded-xl">
      {/* 作者信息 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-sm font-medium">
          {authorName.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700 text-sm">
              {authorName}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${roleConfig.badgeColor}`}
            >
              {roleConfig.label}
            </span>
          </div>
          <p className="text-xs text-stone-400">
            {formatRelativeTime(answer.created_at)}
          </p>
        </div>
      </div>

      {/* 回答内容 */}
      <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap mb-3">
        {answer.content}
      </p>

      {/* 互动栏 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onLike(answer.id)}
          className={`flex items-center gap-1 text-sm ${
            answer.is_liked
              ? 'text-rose-500'
              : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <HeartIcon filled={answer.is_liked} />
          <span>{answer.like_count || 0}</span>
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600"
        >
          <CommentIcon />
          <span>{answer.comment_count || 0}</span>
        </button>
        <button
          onClick={() => {
            setShowComments(true);
            if (comments.length === 0) loadComments();
            setReplyingTo(null);
          }}
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          回复
        </button>
        {canDelete && (
          <button
            onClick={() => onDelete(answer.id)}
            className="ml-auto flex items-center gap-1 text-sm text-stone-400 hover:text-red-500 transition-colors"
          >
            <TrashIcon />
            <span>删除</span>
          </button>
        )}
      </div>

      {/* 评论区 */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-stone-200">
          {/* 评论输入 */}
          <div className="mb-4">
            {replyingTo && (
              <div className="flex items-center gap-2 mb-2 text-xs text-stone-500">
                <span>回复 @{replyingTo.nickname}</span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={replyingTo ? `回复 @${replyingTo.nickname}...` : '写下你的评论...'}
                className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentContent.trim() || isSubmittingComment}
                className="px-3 py-2 bg-[#e8a4b8] text-white text-sm rounded-lg hover:bg-[#d88a9f] disabled:opacity-50"
              >
                {isSubmittingComment ? '...' : '发送'}
              </button>
            </div>
          </div>

          {/* 评论列表 */}
          {isLoadingComments ? (
            <div className="text-center py-4 text-stone-400 text-sm">加载中...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-stone-400 text-sm">暂无评论</div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  onReply={(id, nickname) => setReplyingTo({ id, nickname })}
                  onDelete={handleDeleteComment}
                  onLike={handleLikeComment}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 评论项组件
function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
  onLike,
  isNested = false,
}: {
  comment: Comment;
  currentUserId: string;
  onReply: (parentId: string, nickname: string) => void;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  isNested?: boolean;
}) {
  const canDelete = currentUserId === comment.author.id;

  return (
    <div className={isNested ? 'ml-6 pl-3 border-l-2 border-stone-200' : ''}>
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-xs font-medium shrink-0">
          {comment.author.nickname.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-stone-700 text-xs">
              {comment.author.nickname}
            </span>
            {comment.reply_to_user && (
              <>
                <span className="text-stone-400 text-xs">回复</span>
                <span className="text-[#e8a4b8] text-xs">@{comment.reply_to_user.nickname}</span>
              </>
            )}
            <span className="text-stone-400 text-xs">
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>
          <p className="text-stone-600 text-sm mt-1">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-xs ${
                comment.is_liked ? 'text-rose-500' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <HeartIcon filled={comment.is_liked} />
              {comment.like_count > 0 && <span>{comment.like_count}</span>}
            </button>
            <button
              onClick={() => onReply(comment.id, comment.author.nickname)}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              回复
            </button>
            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-stone-400 hover:text-red-500"
              >
                删除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 回复列表 (只有1层) */}
      {!isNested && comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              onLike={onLike}
              isNested
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 评论图标
function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}
