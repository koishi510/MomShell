'use client';

// frontend/components/community/QuestionDetailModal.tsx
/**
 * 问题详情弹窗
 * 显示问题全文、回答列表、评论功能
 */

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { type Question, type Answer, ROLE_CONFIG } from '../../types/community';

interface QuestionDetailModalProps {
  question: Question | null;
  onClose: () => void;
  onLike: (id: string) => void;
  onCollect: (id: string) => void;
}

// Mock 回答数据
const mockAnswers: Answer[] = [
  {
    id: 'a1',
    question_id: '1',
    author: {
      id: 'u3',
      nickname: '张医生',
      avatar_url: null,
      role: 'certified_doctor',
      is_certified: true,
      certification_title: '北京协和医院 康复科 主任医师',
    },
    content:
      '腹直肌分离两指宽属于中度分离，在产后6个月内通过正确的康复训练是可以恢复的。建议：\n\n1. 避免做仰卧起坐等传统腹肌训练\n2. 可以做腹式呼吸、骨盆倾斜等基础训练\n3. 建议在专业康复师指导下进行\n4. 如果半年后仍无改善，可考虑就医评估',
    content_preview: '腹直肌分离两指宽属于中度分离，在产后6个月内通过正确的康复训练是可以恢复的...',
    image_urls: [],
    is_professional: true,
    is_accepted: false,
    like_count: 45,
    comment_count: 3,
    is_liked: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'a2',
    question_id: '1',
    author: {
      id: 'u7',
      nickname: '二胎妈妈小美',
      avatar_url: null,
      role: 'mom',
      is_certified: false,
    },
    content:
      '我当时也是两指宽，坚持做了三个月的康复训练，现在已经恢复到一指以内了！主要是每天做腹式呼吸和凯格尔运动，一定要坚持！',
    content_preview: '我当时也是两指宽，坚持做了三个月的康复训练，现在已经恢复到一指以内了...',
    image_urls: [],
    is_professional: false,
    is_accepted: false,
    like_count: 23,
    comment_count: 5,
    is_liked: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

export default function QuestionDetailModal({
  question,
  onClose,
  onLike,
  onCollect,
}: QuestionDetailModalProps) {
  const [newComment, setNewComment] = useState('');
  const [answers, setAnswers] = useState<Answer[]>(mockAnswers);

  if (!question) return null;

  const roleConfig = ROLE_CONFIG[question.author.role];

  const handleSubmitAnswer = () => {
    if (!newComment.trim()) return;

    const newAnswer: Answer = {
      id: `new-${Date.now()}`,
      question_id: question.id,
      author: {
        id: 'current-user',
        nickname: '我',
        avatar_url: null,
        role: 'mom',
        is_certified: false,
      },
      content: newComment,
      content_preview: newComment.slice(0, 100) + '...',
      image_urls: [],
      is_professional: false,
      is_accepted: false,
      like_count: 0,
      comment_count: 0,
      is_liked: false,
      created_at: new Date().toISOString(),
    };

    setAnswers((prev) => [...prev, newAnswer]);
    setNewComment('');
  };

  return (
    <AnimatePresence>
      {question && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* 弹窗内容 */}
          <motion.div
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
              <div className="p-5 border-b border-stone-100">
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

                {/* 图片 */}
                {question.image_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {question.image_urls.map((url, index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-lg overflow-hidden bg-stone-100"
                      >
                        <Image
                          src={url}
                          alt={`图片 ${index + 1}`}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

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
                    {question.view_count} 浏览
                  </span>
                </div>
              </div>

              {/* 回答区域 */}
              <div className="p-5">
                <h2 className="text-stone-700 font-medium mb-4">
                  {answers.length} 个回答
                </h2>

                <div className="space-y-4">
                  {answers.map((answer) => (
                    <AnswerCard key={answer.id} answer={answer} />
                  ))}
                </div>

                {answers.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-stone-400">暂无回答，来分享你的经验吧</p>
                  </div>
                )}
              </div>
            </div>

            {/* 底部输入区 */}
            <div className="p-4 border-t border-stone-100 bg-white">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="写下你的回答..."
                  className="flex-1 px-4 py-3 rounded-full border border-stone-200 bg-stone-50 text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:bg-white transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitAnswer();
                    }
                  }}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmitAnswer}
                  disabled={!newComment.trim()}
                  className="px-6 py-3 rounded-full bg-stone-800 text-white font-medium hover:bg-stone-700 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
                >
                  发送
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// 回答卡片
function AnswerCard({ answer }: { answer: Answer }) {
  const [isLiked, setIsLiked] = useState(answer.is_liked);
  const [likeCount, setLikeCount] = useState(answer.like_count);
  const [showComments, setShowComments] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [replies, setReplies] = useState([
    { id: 'r1', author: '小美妈妈', content: '谢谢分享，很有帮助！', time: '1小时前' },
    { id: 'r2', author: '豆豆妈', content: '请问每天做多久呢？', time: '30分钟前' },
  ]);
  const roleConfig = ROLE_CONFIG[answer.author.role];

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleAddReply = () => {
    if (!newReply.trim()) return;
    setReplies((prev) => [
      ...prev,
      { id: `r-${Date.now()}`, author: '我', content: newReply, time: '刚刚' },
    ]);
    setNewReply('');
  };

  return (
    <div className="bg-stone-50 rounded-xl p-4">
      {/* 作者信息 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-sm font-medium">
            {answer.author.nickname.charAt(0)}
          </div>
          {answer.author.is_certified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-700">
              {answer.author.nickname}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs ${roleConfig.badgeColor}`}
            >
              {roleConfig.label}
            </span>
            {answer.is_professional && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
                专业回答
              </span>
            )}
          </div>
          {answer.author.certification_title && (
            <p className="text-xs text-stone-400">{answer.author.certification_title}</p>
          )}
        </div>
        <span className="text-xs text-stone-400">
          {formatRelativeTime(answer.created_at)}
        </span>
      </div>

      {/* 回答内容 */}
      <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">
        {answer.content}
      </p>

      {/* 互动 */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-200">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 text-sm ${
            isLiked ? 'text-rose-500' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <HeartIcon filled={isLiked} size={14} />
          <span>{likeCount}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1 text-sm ${
            showComments ? 'text-stone-700' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <CommentIcon size={14} />
          <span>{replies.length}</span>
        </button>
      </div>

      {/* 评论区 */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-stone-200 space-y-2">
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-2 text-sm">
                  <span className="text-stone-700 font-medium shrink-0">{reply.author}:</span>
                  <span className="text-stone-600 flex-1">{reply.content}</span>
                  <span className="text-stone-400 text-xs shrink-0">{reply.time}</span>
                </div>
              ))}

              {/* 回复输入 */}
              <div className="flex gap-2 mt-2 pt-2">
                <input
                  type="text"
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="写下你的评论..."
                  className="flex-1 px-3 py-1.5 rounded-full border border-stone-200 bg-white text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddReply();
                    }
                  }}
                />
                <button
                  onClick={handleAddReply}
                  disabled={!newReply.trim()}
                  className="px-3 py-1.5 rounded-full bg-stone-700 text-white text-sm hover:bg-stone-600 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
                >
                  发送
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

function HeartIcon({ filled, size = 18 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

function CommentIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

// 相对时间格式化
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
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
