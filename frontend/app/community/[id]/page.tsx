/**
 * Question Detail Page - 帖子详情
 * View question and answers
 * Design: Calm-inspired soft gradients, glassmorphism
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { getIdentity, UserIdentity } from '../../../lib/api/beach';
import {
  getQuestion,
  getQuestionAnswers,
  createAnswer,
  QuestionDetail,
  formatRelativeTime,
  AnswerInfo,
} from '../../../lib/api/community';
import BottomNav from '../../../components/BottomNav';

// Calm-inspired theme colors
const THEME = {
  mom: {
    bg: 'linear-gradient(180deg, #F8F6FF 0%, #F3EFFF 50%, #EDE7FF 100%)',
    text: '#4A4063',
    textLight: '#7B6F99',
    accent: '#B8A9E8',
    accentGradient: 'linear-gradient(135deg, #B8A9E8 0%, #D4C8F0 100%)',
    card: 'rgba(255, 255, 255, 0.72)',
    cardBorder: 'rgba(184, 169, 232, 0.25)',
    headerBg: 'rgba(248, 246, 255, 0.92)',
    inputBg: 'rgba(255, 255, 255, 0.5)',
    tagBg: 'rgba(184, 169, 232, 0.12)',
    glow: 'rgba(184, 169, 232, 0.35)',
  },
  dad: {
    bg: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 50%, #1F3044 100%)',
    text: '#E8EEF4',
    textLight: '#8BA4BC',
    accent: '#64B5F6',
    accentGradient: 'linear-gradient(135deg, #64B5F6 0%, #90CAF9 100%)',
    card: 'rgba(27, 40, 56, 0.75)',
    cardBorder: 'rgba(100, 181, 246, 0.18)',
    headerBg: 'rgba(13, 27, 42, 0.92)',
    inputBg: 'rgba(27, 40, 56, 0.5)',
    tagBg: 'rgba(100, 181, 246, 0.12)',
    glow: 'rgba(100, 181, 246, 0.3)',
  },
};

export default function QuestionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const questionId = params.id as string;

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [answers, setAnswers] = useState<AnswerInfo[]>([]);
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [answerContent, setAnswerContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMom = identity === 'origin_seeker';
  const theme = isMom ? THEME.mom : THEME.dad;

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [questionData, answersData] = await Promise.all([
        getQuestion(questionId),
        getQuestionAnswers(questionId),
      ]);
      setQuestion(questionData);
      setAnswers(answersData.items);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch question:', err);
      setError('加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    async function init() {
      if (!authLoading) {
        if (!isAuthenticated) {
          router.push('/');
          return;
        }
        try {
          const data = await getIdentity();
          setIdentity(data.identity);
          await fetchData();
        } catch {
          router.push('/');
        }
      }
    }
    init();
  }, [authLoading, isAuthenticated, router, fetchData]);

  const handleSubmitAnswer = async () => {
    if (!answerContent.trim() || !questionId) return;

    setIsSubmitting(true);
    try {
      await createAnswer(questionId, answerContent.trim());
      setAnswerContent('');
      setShowAnswerInput(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('回复失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'certified_doctor':
      case 'certified_therapist':
      case 'certified_nurse':
        return '👨‍⚕️';
      case 'ai_assistant':
        return '🐚';
      default:
        return null;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-4xl"
        >
          🐚
        </motion.div>
      </div>
    );
  }

  if (error && !question) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: theme.bg }}>
        <p className="text-lg mb-4" style={{ color: theme.text }}>{error}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-2xl font-medium"
          style={{
            background: theme.accentGradient,
            color: isMom ? '#4A4063' : '#0D1B2A',
            boxShadow: `0 4px 15px ${theme.glow}`,
          }}
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: theme.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 py-4 backdrop-blur-xl flex items-center gap-3"
        style={{ backgroundColor: theme.headerBg }}
      >
        <motion.button
          onClick={() => router.back()}
          className="p-2.5 rounded-xl"
          style={{
            backgroundColor: theme.tagBg,
          }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-lg" style={{ color: theme.text }}>←</span>
        </motion.button>
        <h1 className="text-lg font-medium flex-1 truncate" style={{ color: theme.text }}>
          帖子详情
        </h1>
      </div>

      {/* Question Content */}
      {question && (
        <div className="px-4 py-4">
          <motion.div
            className={`rounded-3xl p-6 mb-5 backdrop-blur-sm ${isMom ? 'glass-card' : 'glass-card-dark'}`}
            style={{
              backgroundColor: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              boxShadow: `0 8px 32px ${theme.glow}`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Author */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                style={{
                  background: theme.accentGradient,
                }}
              >
                {question.author.avatar_url ? (
                  <img src={question.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  getRoleIcon(question.author.role) || '👤'
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: theme.text }}>
                    {question.author.nickname}
                  </span>
                  {question.author.is_certified && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                    >
                      认证
                    </span>
                  )}
                </div>
                <span className="text-sm" style={{ color: theme.textLight }}>
                  {formatRelativeTime(question.created_at)}
                </span>
              </div>
            </div>

            {/* Title & Content */}
            <h2 className="text-xl font-medium mb-4" style={{ color: theme.text }}>
              {question.title}
            </h2>
            <div
              className="whitespace-pre-wrap leading-relaxed mb-5 break-words overflow-hidden"
              style={{ color: theme.textLight, wordBreak: 'break-word' }}
            >
              {question.content}
            </div>

            {/* Tags */}
            {question.tags && question.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {question.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-xs px-3 py-1.5 rounded-full"
                    style={{
                      backgroundColor: theme.tagBg,
                      color: theme.textLight,
                    }}
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div
              className="flex items-center gap-6 text-sm pt-4 border-t"
              style={{ borderColor: theme.cardBorder }}
            >
              <span className="flex items-center gap-2" style={{ color: theme.textLight }}>
                <span className="opacity-70">👁️</span> {question.view_count}
              </span>
              <span className="flex items-center gap-2" style={{ color: theme.textLight }}>
                <span className="opacity-70">💬</span> {question.answer_count}
              </span>
              <span className="flex items-center gap-2" style={{ color: theme.textLight }}>
                <span className="opacity-70">❤️</span> {question.like_count}
              </span>
            </div>
          </motion.div>

          {/* Answers Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg" style={{ color: theme.text }}>
                回答 ({answers.length})
              </h3>
              <motion.button
                onClick={() => setShowAnswerInput(true)}
                className="px-5 py-2.5 rounded-2xl text-sm font-medium"
                style={{
                  background: theme.accentGradient,
                  color: isMom ? '#4A4063' : '#0D1B2A',
                  boxShadow: `0 4px 15px ${theme.glow}`,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                写回答
              </motion.button>
            </div>

            {answers.length === 0 ? (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-4xl mb-3 opacity-50">💬</div>
                <p style={{ color: theme.textLight }}>暂无回答，来写第一个吧</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {answers.map((answer, index) => (
                  <motion.div
                    key={answer.id}
                    className={`rounded-2xl p-5 backdrop-blur-sm ${isMom ? 'glass-card' : 'glass-card-dark'}`}
                    style={{
                      backgroundColor: theme.card,
                      border: `1px solid ${theme.cardBorder}`,
                      boxShadow: `0 4px 16px ${theme.glow}`,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* Answer Author */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{
                          background: theme.accentGradient,
                        }}
                      >
                        {answer.author.avatar_url ? (
                          <img src={answer.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          getRoleIcon(answer.author.role) || '👤'
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: theme.text }}>
                            {answer.author.nickname}
                          </span>
                          {answer.author.is_certified && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                            >
                              认证
                            </span>
                          )}
                          {answer.is_accepted && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: theme.accentGradient,
                                color: isMom ? '#4A4063' : '#0D1B2A',
                              }}
                            >
                              已采纳
                            </span>
                          )}
                        </div>
                        <span className="text-xs" style={{ color: theme.textLight }}>
                          {formatRelativeTime(answer.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Answer Content */}
                    <div
                      className="text-sm whitespace-pre-wrap leading-relaxed mb-4 break-words overflow-hidden"
                      style={{ color: theme.textLight, wordBreak: 'break-word' }}
                    >
                      {answer.content}
                    </div>

                    {/* Answer Stats */}
                    <div className="flex items-center gap-5 text-xs" style={{ color: theme.textLight }}>
                      <span className="flex items-center gap-1.5">
                        <span className="opacity-70">❤️</span> {answer.like_count}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="opacity-70">💬</span> {answer.comment_count}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Answer Input Modal */}
      <AnimatePresence>
        {showAnswerInput && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" style={{ background: theme.bg }} />

            <div
              className="relative flex-shrink-0 flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl"
              style={{
                backgroundColor: theme.headerBg,
                borderColor: theme.cardBorder,
              }}
            >
              <button
                onClick={() => setShowAnswerInput(false)}
                className="text-sm px-3 py-1.5 rounded-full"
                style={{
                  color: theme.textLight,
                  backgroundColor: theme.tagBg,
                }}
              >
                取消
              </button>
              <h2 className="font-medium" style={{ color: theme.text }}>写回答</h2>
              <motion.button
                onClick={handleSubmitAnswer}
                disabled={!answerContent.trim() || isSubmitting}
                className="px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-50"
                style={{
                  background: theme.accentGradient,
                  color: isMom ? '#4A4063' : '#0D1B2A',
                  boxShadow: `0 2px 8px ${theme.glow}`,
                }}
                whileTap={{ scale: 0.95 }}
              >
                {isSubmitting ? '发送中...' : '发送'}
              </motion.button>
            </div>

            <div className="relative flex-1 px-5 py-5">
              <textarea
                placeholder="写下你的回答..."
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                className="w-full h-full px-5 py-4 rounded-2xl border focus:outline-none focus:ring-2 resize-none"
                style={{
                  backgroundColor: theme.inputBg,
                  borderColor: theme.cardBorder,
                  color: theme.text,
                  minHeight: '200px',
                  boxShadow: `0 4px 16px ${theme.glow}`,
                }}
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav currentPage="community" identity={identity} />
    </div>
  );
}
