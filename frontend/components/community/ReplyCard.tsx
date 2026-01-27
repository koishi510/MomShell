'use client';

// frontend/components/community/ReplyCard.tsx
/**
 * 回答卡片组件
 * 用于"我的回答"页面，显示回答内容和所属问题上下文
 * 与 PostCard 保持一致的动画风格
 */

import { motion } from 'framer-motion';
import type { MyAnswerItem } from '../../lib/api/community';
import { CHANNEL_COLORS, SPRING_CONFIGS } from '../../lib/design-tokens';

// Channel display names
const channelNames: Record<string, string> = {
  experience: '经验分享',
  professional: '专业解答',
};

// Status config
const statusConfig: Record<string, { label: string; color: string }> = {
  published: { label: '已发布', color: 'bg-emerald-100 text-emerald-700' },
  pending_review: { label: '审核中', color: 'bg-amber-100 text-amber-700' },
  rejected: { label: '未通过', color: 'bg-red-100 text-red-700' },
};

interface ReplyCardProps {
  answer: MyAnswerItem;
  onClick?: () => void;
  onDelete?: () => void;
}

export default function ReplyCard({ answer, onClick, onDelete }: ReplyCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  const channelColors = CHANNEL_COLORS[answer.question.channel as keyof typeof CHANNEL_COLORS] || CHANNEL_COLORS.experience;
  const isPending = answer.status === 'pending_review';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING_CONFIGS.gentle}
      onClick={onClick}
      className="relative cursor-pointer"
    >
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
        {/* 问题上下文 */}
        <div className="mb-4 pb-4 border-b border-stone-100/80">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-stone-400">
              回复了
            </span>
            <span className="px-2 py-0.5 bg-stone-50 text-stone-500 text-xs rounded-full">
              {channelNames[answer.question.channel] || answer.question.channel}
            </span>
          </div>
          <h4 className="text-stone-700 font-medium line-clamp-1">
            {answer.question.title}
          </h4>
        </div>

        {/* 状态和标签 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[answer.status]?.color || 'bg-stone-100 text-stone-600'}`}>
            {statusConfig[answer.status]?.label || answer.status}
          </span>
          {answer.is_professional && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              专业回答
            </span>
          )}
          {answer.is_accepted && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              已采纳
            </span>
          )}
          <span className="text-xs text-stone-400 ml-auto">
            {formatRelativeTime(answer.created_at)}
          </span>
        </div>

        {/* 回答内容预览 */}
        <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-3">
          {answer.content_preview}
        </p>

        {/* 底部互动栏 */}
        <footer className="flex items-center justify-between pt-4 border-t border-stone-100/80">
          <div className="flex items-center gap-5">
            {/* 点赞 */}
            <div className={`flex items-center gap-1.5 ${answer.is_liked ? 'text-rose-500' : 'text-stone-400'}`}>
              <HeartIcon filled={answer.is_liked} />
              <span className="text-sm">{answer.like_count}</span>
            </div>

            {/* 评论 */}
            <div className="flex items-center gap-1.5 text-stone-400">
              <CommentIcon />
              <span className="text-sm">{answer.comment_count}</span>
            </div>
          </div>

          {/* 删除按钮 */}
          {onDelete && (
            <motion.button
              onClick={handleDelete}
              className="text-stone-300 hover:text-red-500 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="删除"
            >
              <TrashIcon />
            </motion.button>
          )}
        </footer>

        {/* 频道指示器 */}
        <div
          className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: channelColors.primary }}
          title={answer.question.channel === 'professional' ? '专业频道' : '经验频道'}
        />
      </motion.div>
    </motion.article>
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

// Icons
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

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}
