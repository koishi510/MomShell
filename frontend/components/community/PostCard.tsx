'use client';

// frontend/components/community/PostCard.tsx
/**
 * 信息流卡片组件
 * 支持问题展示、用户信息、互动功能
 */

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { type Question, ROLE_CONFIG } from '../../types/community';

interface PostCardProps {
  question: Question;
  onLike?: (id: string) => void;
  onCollect?: (id: string) => void;
  onClick?: (question: Question) => void;
}

export default function PostCard({
  question,
  onLike,
  onCollect,
  onClick,
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(question.is_liked);
  const [likeCount, setLikeCount] = useState(question.like_count);
  const [isCollected, setIsCollected] = useState(question.is_collected);

  const isPending = question.status === 'pending_review';
  const roleConfig = ROLE_CONFIG[question.author.role];
  const isCertified = question.author.is_certified;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
    onLike?.(question.id);
  };

  const handleCollect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollected(!isCollected);
    onCollect?.(question.id);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      onClick={() => onClick?.(question)}
      className={`
        relative bg-white rounded-2xl p-5
        shadow-sm hover:shadow-lg
        transition-shadow duration-300
        cursor-pointer
        ${isPending ? 'opacity-70' : ''}
      `}
    >
      {/* 审核中状态 - Shimmer 效果 */}
      {isPending && <ShimmerOverlay />}

      {/* 头部：用户信息 */}
      <header className="flex items-center gap-3 mb-4">
        {/* 头像 */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-stone-200 overflow-hidden">
            {question.author.avatar_url ? (
              <Image
                src={question.author.avatar_url}
                alt={question.author.nickname}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm font-medium">
                {question.author.nickname.charAt(0)}
              </div>
            )}
          </div>

          {/* 认证徽章 */}
          {isCertified && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="white"
                stroke="white"
                strokeWidth="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>
          )}
        </div>

        {/* 用户信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-700 truncate">
              {question.author.nickname}
            </span>
            <span
              className={`
                px-2 py-0.5 rounded-full text-xs font-medium
                ${roleConfig.badgeColor}
              `}
            >
              {roleConfig.icon && <span className="mr-0.5">{roleConfig.icon}</span>}
              {roleConfig.label}
            </span>
          </div>
          {question.author.certification_title && (
            <p className="text-xs text-stone-400 truncate mt-0.5">
              {question.author.certification_title}
            </p>
          )}
        </div>

        {/* 时间 */}
        <time className="text-xs text-stone-400 shrink-0">
          {formatRelativeTime(question.created_at)}
        </time>
      </header>

      {/* 内容区 */}
      <div className="mb-4">
        <h3 className="text-lg font-medium text-stone-800 leading-snug mb-2 line-clamp-2">
          {question.title}
        </h3>
        <p className="text-stone-600 text-sm leading-relaxed line-clamp-3">
          {question.content_preview}
        </p>
      </div>

      {/* 图片网格 */}
      {question.image_urls.length > 0 && (
        <ImageGrid images={question.image_urls} />
      )}

      {/* 标签 */}
      {question.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {question.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="px-2.5 py-1 bg-stone-100 text-stone-600 text-xs rounded-full"
            >
              #{tag.name}
            </span>
          ))}
          {question.tags.length > 3 && (
            <span className="px-2.5 py-1 text-stone-400 text-xs">
              +{question.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 互动栏 */}
      <footer className="flex items-center justify-between pt-3 border-t border-stone-100">
        <div className="flex items-center gap-4">
          {/* 点赞 */}
          <LikeButton
            isLiked={isLiked}
            count={likeCount}
            onClick={handleLike}
          />

          {/* 评论 */}
          <button className="flex items-center gap-1.5 text-stone-500 hover:text-stone-700 transition-colors">
            <CommentIcon />
            <span className="text-sm">{question.answer_count}</span>
          </button>

          {/* 分享 */}
          <button className="flex items-center gap-1.5 text-stone-500 hover:text-stone-700 transition-colors">
            <ShareIcon />
          </button>
        </div>

        {/* 收藏 */}
        <CollectButton
          isCollected={isCollected}
          onClick={handleCollect}
        />
      </footer>

      {/* 频道指示器 */}
      <div
        className={`
          absolute top-4 right-4 w-2 h-2 rounded-full
          ${question.channel === 'professional' ? 'bg-sky-400' : 'bg-amber-400'}
        `}
        title={question.channel === 'professional' ? '专业频道' : '经验频道'}
      />
    </motion.article>
  );
}

// Shimmer 审核中效果
function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-10">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px]" />
      <motion.div
        className="absolute inset-0 -translate-x-full"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        }}
        animate={{
          translateX: ['−100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full shadow-sm">
          <motion.div
            className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <span className="text-sm text-stone-600">AI 安全卫士正在审核中...</span>
        </div>
      </div>
    </div>
  );
}

// 图片网格
function ImageGrid({ images }: { images: string[] }) {
  const count = Math.min(images.length, 4);

  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2',
  }[count];

  return (
    <div className={`grid ${gridClass} gap-2 mb-4`}>
      {images.slice(0, 4).map((url, index) => (
        <div
          key={index}
          className={`
            relative rounded-xl overflow-hidden bg-stone-100
            ${count === 1 ? 'aspect-video' : 'aspect-square'}
          `}
        >
          <Image
            src={url}
            alt={`图片 ${index + 1}`}
            fill
            className="object-cover"
          />
          {index === 3 && images.length > 4 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-lg font-medium">
                +{images.length - 4}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// 点赞按钮（带弹簧动画）
function LikeButton({
  isLiked,
  count,
  onClick,
}: {
  isLiked: boolean;
  count: number;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 transition-colors
        ${isLiked ? 'text-rose-500' : 'text-stone-500 hover:text-stone-700'}
      `}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        animate={isLiked ? { scale: 1.2 } : { scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 10,
        }}
      >
        <HeartIcon filled={isLiked} />
      </motion.div>
      <span className="text-sm">{count}</span>
    </motion.button>
  );
}

// 收藏按钮
function CollectButton({
  isCollected,
  onClick,
}: {
  isCollected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        transition-colors
        ${isCollected ? 'text-amber-500' : 'text-stone-400 hover:text-stone-600'}
      `}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <BookmarkIcon filled={isCollected} />
    </motion.button>
  );
}

// 图标组件
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

function CommentIcon() {
  return (
    <svg
      width="18"
      height="18"
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

function ShareIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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
