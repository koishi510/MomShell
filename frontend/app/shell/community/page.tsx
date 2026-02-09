// frontend/app/shell/community/page.tsx
/**
 * 社区页 - 圈
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import {
  BeachBackground,
  TopHeader,
} from '../../../components/shell';
import { SHELL_COLORS, SPRING_CONFIGS } from '../../../lib/design-tokens';

interface CommunityPost {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  createdAt: string;
  likes: number;
  comments: number;
}

export default function CommunityPage() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 根据路径判断主题
  const isPartnerMode = pathname.includes('/partner');
  const theme = isPartnerMode ? 'night' : 'day';
  const colors = theme === 'day' ? SHELL_COLORS.mom : SHELL_COLORS.partner;

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 500));

      // 模拟数据
      const mockPosts: CommunityPost[] = [
        {
          id: '1',
          author: '温柔妈妈',
          content: '今天宝宝第一次叫妈妈，感动得眼泪都出来了...',
          createdAt: '2 小时前',
          likes: 128,
          comments: 32,
        },
        {
          id: '2',
          author: '新手爸爸',
          content: '请问各位，怎么更好地支持产后的妻子呢？',
          createdAt: '5 小时前',
          likes: 86,
          comments: 45,
        },
        {
          id: '3',
          author: '开心妈咪',
          content: '分享一个让宝宝安睡的小技巧~',
          createdAt: '昨天',
          likes: 256,
          comments: 78,
        },
      ];

      setPosts(mockPosts);
      setIsLoading(false);
    };

    loadPosts();
  }, []);

  return (
    <BeachBackground theme={theme}>
      <TopHeader
        title="圈"
        theme={theme}
        avatarUrl={user?.avatar_url}
      />

      <main className="relative min-h-[calc(100vh-120px)] px-4 pt-4 pb-24">
        {/* 社区说明 */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm" style={{ color: `${colors.text}99` }}>
            在这里分享故事，获得力量
          </p>
        </motion.div>

        {/* 帖子列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-4xl"
            >
              🌊
            </motion.div>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                className="rounded-2xl p-4"
                style={{
                  background: theme === 'day'
                    ? 'rgba(255, 255, 255, 0.8)'
                    : 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* 作者信息 */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: `${colors.accent}30` }}
                  >
                    <span className="text-lg">👤</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: colors.text }}>
                      {post.author}
                    </p>
                    <p className="text-xs" style={{ color: `${colors.text}60` }}>
                      {post.createdAt}
                    </p>
                  </div>
                </div>

                {/* 内容 */}
                <p className="text-sm mb-3" style={{ color: colors.text }}>
                  {post.content}
                </p>

                {/* 互动 */}
                <div className="flex gap-4">
                  <button
                    className="flex items-center gap-1 text-sm"
                    style={{ color: `${colors.text}80` }}
                  >
                    <span>❤️</span>
                    <span>{post.likes}</span>
                  </button>
                  <button
                    className="flex items-center gap-1 text-sm"
                    style={{ color: `${colors.text}80` }}
                  >
                    <span>💬</span>
                    <span>{post.comments}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 发帖按钮 */}
        <motion.button
          className="fixed right-6 bottom-28 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${colors.accent} 0%, ${theme === 'day' ? '#FFA726' : '#5C6BC0'} 100%)`,
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-2xl text-white">+</span>
        </motion.button>
      </main>
    </BeachBackground>
  );
}
