'use client';

// frontend/components/community/PostCard.tsx
/**
 * 帖子卡片组件
 * 圆润卡片 + 彩色软阴影 + 悬停浮动 + 专业认证徽章
 */

import Image from 'next/image';
import { motion } from 'framer-motion';
import { type Question, type UserRole } from '../../types/community';
import { CHANNEL_COLORS, SPRING_CONFIGS } from '../../lib/design-tokens';

interface PostCardProps {
  question: Question;
  onLike?: (id: string) => void;
  onCollect?: (id: string) => void;
  onClick?: (question: Question) => void;
}

// 角色配置
const ROLE_CONFIG: Record<UserRole, { label: string; badgeClass: string; icon?: string }> = {
  guest: { label: '游客', badgeClass: 'bg-gray-100 text-gray-600' },
  mom: { label: '妈妈', badgeClass: 'bg-pink-100 text-pink-700' },
  dad: { label: '爸爸', badgeClass: 'bg-blue-100 text-blue-700' },
  family: { label: '家属', badgeClass: 'bg-stone-100 text-stone-600' },
  certified_doctor: { label: '认证医生', badgeClass: 'bg-emerald-100 text-emerald-700', icon: '✓' },
  certified_therapist: { label: '认证康复师', badgeClass: 'bg-teal-100 text-teal-700', icon: '✓' },
  certified_nurse: { label: '认证护士', badgeClass: 'bg-cyan-100 text-cyan-700', icon: '✓' },
  admin: { label: '管理员', badgeClass: 'bg-purple-100 text-purple-700', icon: '★' },
  ai_assistant: { label: 'AI 助手', badgeClass: 'bg-amber-100 text-amber-700', icon: '❤' },
};

export default function PostCard({
  question,
  onLike,
  onCollect,
  onClick,
}: PostCardProps) {
  // Use props directly - parent manages state after API calls
  const isLiked = question.is_liked;
  const likeCount = question.like_count;
  const isCollected = question.is_collected;

  const isPending = question.status === 'pending_review';
  const roleConfig = ROLE_CONFIG[question.author.role] || { label: '用户', badgeClass: 'bg-gray-100 text-gray-600' };
  const isCertified = question.author.is_certified;
  const channelColors = CHANNEL_COLORS[question.channel];

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.(question.id);
  };

  const handleCollect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCollect?.(question.id);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING_CONFIGS.gentle}
      onClick={() => onClick?.(question)}
      className="relative cursor-pointer"
    >
      {/* 卡片主体 */}
      <motion.div
        className={`
          relative rounded-3xl p-6
          bg-white/80 backdrop-blur-sm
          border border-white/60
          ${isPending ? 'opacity-70' : ''}
        `}
        style={{
          boxShadow: `
            0 4px 24px ${channelColors.shadow},
            0 8px 48px rgba(0, 0, 0, 0.04),
            0 0 0 1px rgba(255, 255, 255, 0.8) inset
          `,
        }}
        whileHover={{
          boxShadow: `
            0 8px 32px ${channelColors.shadow.replace('0.25', '0.35')},
            0 16px 64px rgba(0, 0, 0, 0.06),
            0 0 0 1px rgba(255, 255, 255, 0.9) inset
          `,
        }}
      >
        {/* 审核中状态 - Shimmer 效果 */}
        {isPending && <ShimmerOverlay />}

        {/* 头部：用户信息 */}
        <header className="flex items-center gap-3 mb-4">
          {/* 头像 + 认证徽章 */}
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden">
              {question.author.avatar_url ? (
                <Image
                  src={question.author.avatar_url}
                  alt={question.author.nickname}
                  width={44}
                  height={44}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm font-medium">
                  {question.author.nickname.charAt(0)}
                </div>
              )}
            </div>

            {/* 专业认证徽章 - 呼吸闪烁效果 */}
            {isCertified && <CertifiedBadge role={question.author.role} />}
          </div>

          {/* 用户信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-medium truncate ${
                  question.author.role === 'mom'
                    ? 'text-pink-600'
                    : isCertified
                    ? 'text-emerald-600'
                    : 'text-stone-700'
                }`}
              >
                {question.author.nickname}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig.badgeClass}`}
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
                className="px-3 py-1 bg-stone-50 text-stone-500 text-xs rounded-full border border-stone-100"
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
        <footer className="flex items-center justify-between pt-4 border-t border-stone-100/80">
          <div className="flex items-center gap-5">
            {/* 点赞 */}
            <LikeButton
              isLiked={isLiked}
              count={likeCount}
              onClick={handleLike}
            />

            {/* 评论 */}
            <button className="flex items-center gap-1.5 text-stone-400 hover:text-stone-600 transition-colors">
              <CommentIcon />
              <span className="text-sm">{question.answer_count}</span>
            </button>

            {/* 浏览数 */}
            <div className="flex items-center gap-1.5 text-stone-400">
              <EyeIcon />
              <span className="text-sm">{question.view_count}</span>
            </div>
          </div>

          {/* 收藏 */}
          <CollectButton
            isCollected={isCollected}
            onClick={handleCollect}
          />
        </footer>

        {/* 频道指示器 - 静态 */}
        <div
          className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: channelColors.primary }}
          title={question.channel === 'professional' ? '专业频道' : '经验频道'}
        />
      </motion.div>
    </motion.article>
  );
}

// 专业认证徽章（静态发光）
function CertifiedBadge({ role }: { role: UserRole }) {
  const glowColor = role === 'certified_doctor'
    ? 'rgba(16, 185, 129, 0.5)'
    : role === 'certified_therapist'
    ? 'rgba(20, 184, 166, 0.5)'
    : 'rgba(6, 182, 212, 0.5)';

  return (
    <div
      className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #10B981, #059669)',
        boxShadow: `0 0 0 2px white, 0 0 10px ${glowColor}`,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

// Shimmer 审核中效果（简化版）
function ShimmerOverlay() {
  return (
    <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-10">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px]" />
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full shadow-sm">
          <div className="w-4 h-4 border-2 border-stone-300 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm text-stone-600">AI 安全卫士审核中...</span>
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
            relative rounded-2xl overflow-hidden bg-stone-100
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

// 点赞按钮
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
      className={`flex items-center gap-1.5 transition-colors ${
        isLiked ? 'text-rose-500' : 'text-stone-400 hover:text-stone-600'
      }`}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        animate={isLiked ? { scale: 1.2 } : { scale: 1 }}
        transition={SPRING_CONFIGS.bouncy}
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
      className={`transition-colors ${
        isCollected ? 'text-amber-500' : 'text-stone-300 hover:text-stone-500'
      }`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <BookmarkIcon filled={isCollected} />
    </motion.button>
  );
}

// 图标
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

// 相对时间格式化
function formatRelativeTime(dateString: string): string {
  // 后端返回的是 UTC 时间，需要添加 Z 标识
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
