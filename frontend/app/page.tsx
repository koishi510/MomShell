/**
 * MomShell v2.0 Landing Page
 * Flow: Landing → Auth (Login/Register) → Identity Selection (only for new users) → Beach
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { getIdentity, selectIdentity, UserIdentity } from '../lib/api/beach';

// Pre-defined star positions to avoid hydration mismatch
const STAR_POSITIONS = [
  { size: 2.0, left: 5, top: 3, duration: 2.5, delay: 0.2 },
  { size: 1.5, left: 12, top: 8, duration: 3.2, delay: 0.8 },
  { size: 2.5, left: 18, top: 5, duration: 2.8, delay: 1.5 },
  { size: 1.8, left: 25, top: 12, duration: 3.5, delay: 0.5 },
  { size: 2.2, left: 32, top: 7, duration: 2.3, delay: 1.2 },
  { size: 1.3, left: 38, top: 15, duration: 3.8, delay: 0.3 },
  { size: 2.8, left: 45, top: 4, duration: 2.6, delay: 1.8 },
  { size: 1.6, left: 52, top: 10, duration: 3.1, delay: 0.7 },
  { size: 2.1, left: 58, top: 6, duration: 2.9, delay: 1.4 },
  { size: 1.9, left: 65, top: 14, duration: 3.4, delay: 0.4 },
  { size: 2.4, left: 72, top: 8, duration: 2.4, delay: 1.1 },
  { size: 1.4, left: 78, top: 11, duration: 3.6, delay: 0.9 },
  { size: 2.6, left: 85, top: 5, duration: 2.7, delay: 1.6 },
  { size: 1.7, left: 92, top: 9, duration: 3.3, delay: 0.6 },
  { size: 2.3, left: 8, top: 18, duration: 2.2, delay: 1.3 },
  { size: 1.2, left: 22, top: 20, duration: 3.7, delay: 0.1 },
  { size: 2.7, left: 35, top: 17, duration: 2.5, delay: 1.9 },
  { size: 1.5, left: 48, top: 22, duration: 3.0, delay: 0.5 },
  { size: 2.0, left: 62, top: 19, duration: 2.8, delay: 1.0 },
  { size: 1.8, left: 75, top: 21, duration: 3.2, delay: 0.8 },
  { size: 2.9, left: 88, top: 16, duration: 2.3, delay: 1.7 },
  { size: 1.1, left: 15, top: 2, duration: 3.9, delay: 0.4 },
  { size: 2.5, left: 28, top: 23, duration: 2.6, delay: 1.2 },
  { size: 1.6, left: 42, top: 1, duration: 3.4, delay: 0.7 },
  { size: 2.2, left: 55, top: 24, duration: 2.9, delay: 1.5 },
  { size: 1.4, left: 68, top: 3, duration: 3.1, delay: 0.3 },
  { size: 2.8, left: 82, top: 13, duration: 2.4, delay: 1.8 },
  { size: 1.9, left: 95, top: 7, duration: 3.5, delay: 0.6 },
  { size: 2.1, left: 3, top: 16, duration: 2.7, delay: 1.1 },
  { size: 1.3, left: 98, top: 20, duration: 3.8, delay: 0.9 },
];

type FlowStep = 'landing' | 'auth' | 'identity';
type AuthMode = 'choice' | 'login' | 'register';

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, login, register } = useAuth();
  const [flowStep, setFlowStep] = useState<FlowStep>('landing');
  const [authMode, setAuthMode] = useState<AuthMode>('choice');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingIdentity, setPendingIdentity] = useState<UserIdentity | null>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // Check if already logged in
  useEffect(() => {
    async function checkAuth() {
      if (!authLoading && isAuthenticated && user) {
        try {
          const identityData = await getIdentity();
          if (identityData.identity) {
            router.push(identityData.identity === 'origin_seeker' ? '/beach/mom' : '/beach/dad');
          } else {
            setFlowStep('identity');
          }
        } catch {
          // Stay on landing
        }
      }
    }
    checkAuth();
  }, [authLoading, isAuthenticated, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await login({ login: username, password }, true);
      const identityData = await getIdentity();
      if (identityData.identity) {
        router.push(identityData.identity === 'origin_seeker' ? '/beach/mom' : '/beach/dad');
      } else {
        setFlowStep('identity');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败，请检查用户名和密码');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await register({
        username,
        email,
        password,
        nickname: nickname || username,
      });
      await login({ login: username, password }, true);
      setFlowStep('identity');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIdentityClick = (identity: UserIdentity) => {
    setPendingIdentity(identity);
    setShowConfirm(true);
  };

  const handleIdentityConfirm = async () => {
    if (!pendingIdentity) return;
    setIsSubmitting(true);
    setError('');

    try {
      await selectIdentity(pendingIdentity);
      router.push(pendingIdentity === 'origin_seeker' ? '/beach/mom' : '/beach/dad');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '设置身份失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestMode = () => {
    router.push('/beach/mom');
  };

  return (
    <div className="min-h-screen overflow-hidden relative">
      <AnimatePresence mode="wait">
        {flowStep === 'landing' && (
          <LandingView key="landing" onStart={() => setFlowStep('auth')} />
        )}

        {flowStep === 'auth' && (
          <AuthView
            key="auth"
            authMode={authMode}
            setAuthMode={setAuthMode}
            username={username}
            setUsername={setUsername}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            nickname={nickname}
            setNickname={setNickname}
            error={error}
            setError={setError}
            isSubmitting={isSubmitting}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onGuest={handleGuestMode}
            onBack={() => {
              setFlowStep('landing');
              setAuthMode('choice');
              setError('');
            }}
          />
        )}

        {flowStep === 'identity' && (
          <IdentitySelectView
            key="identity"
            pendingIdentity={pendingIdentity}
            showConfirm={showConfirm}
            isSubmitting={isSubmitting}
            error={error}
            onSelect={handleIdentityClick}
            onConfirm={handleIdentityConfirm}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Landing View - Beautiful sea sunrise poster
 */
function LandingView({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Beautiful gradient background */}
      <div className="fixed inset-0 -z-10">
        {/* Deep ocean to sunset sky */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(180deg,
                #1e1b4b 0%,
                #312e81 8%,
                #4c1d95 15%,
                #7c3aed 22%,
                #a78bfa 30%,
                #c4b5fd 38%,
                #fcd34d 48%,
                #fbbf24 55%,
                #f59e0b 62%,
                #ea580c 70%,
                #dc2626 78%,
                #1e3a5f 88%,
                #0c4a6e 100%
              )
            `,
          }}
        />

        {/* Sun glow */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: '42%',
            width: '300px',
            height: '150px',
            background: 'radial-gradient(ellipse at center, rgba(255,220,100,0.9) 0%, rgba(255,180,50,0.6) 30%, rgba(255,150,50,0.3) 50%, transparent 70%)',
            filter: 'blur(2px)',
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.9, 1, 0.9],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Sun reflection on water */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-2"
          style={{
            top: '60%',
            height: '35%',
            background: 'linear-gradient(180deg, rgba(255,200,100,0.6) 0%, rgba(255,150,50,0.3) 50%, transparent 100%)',
            filter: 'blur(4px)',
          }}
          animate={{
            scaleX: [1, 1.5, 1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Stars in the dark sky - using fixed positions to avoid hydration mismatch */}
        {STAR_POSITIONS.map((star, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: star.size + 'px',
              height: star.size + 'px',
              left: `${star.left}%`,
              top: `${star.top}%`,
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              delay: star.delay,
            }}
          />
        ))}

        {/* Ocean waves */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[15%]"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(6,78,118,0.3) 50%, #0c4a6e 100%)',
          }}
        />
      </div>

      {/* Glowing shell */}
      <motion.div
        className="absolute text-7xl md:text-8xl"
        style={{ top: '25%' }}
        animate={{
          y: [0, -10, 0],
          filter: [
            'drop-shadow(0 0 20px rgba(251,191,36,0.5))',
            'drop-shadow(0 0 40px rgba(251,191,36,0.8))',
            'drop-shadow(0 0 20px rgba(251,191,36,0.5))',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        🐚
      </motion.div>

      {/* Main text */}
      <motion.div
        className="text-center px-8 z-10 mt-20"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <h1 className="text-3xl md:text-4xl font-serif text-white leading-relaxed drop-shadow-lg">
          每一位母亲
        </h1>
        <p className="text-xl md:text-2xl font-serif text-amber-100 mt-3 drop-shadow-md">
          都是被岁月尘封的珍珠
        </p>
      </motion.div>

      {/* Start button */}
      <motion.button
        onClick={onStart}
        className="mt-16 px-14 py-5 rounded-full text-lg font-medium relative overflow-hidden group"
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.9) 0%, rgba(245,158,11,0.9) 100%)',
          color: '#78350f',
          boxShadow: '0 8px 40px rgba(251,191,36,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        whileHover={{
          scale: 1.05,
          boxShadow: '0 12px 50px rgba(251,191,36,0.6), inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="relative z-10">开启回响</span>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        />
      </motion.button>

      {/* App name */}
      <motion.div
        className="absolute bottom-12 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <p className="text-sm tracking-[0.4em] text-amber-200/70 font-light">
          MOMSHELL
        </p>
        <p className="text-xs text-amber-200/50 mt-1">贝壳回响</p>
      </motion.div>
    </motion.div>
  );
}

/**
 * Auth View - Login/Register
 */
function AuthView({
  authMode,
  setAuthMode,
  username,
  setUsername,
  email,
  setEmail,
  password,
  setPassword,
  nickname,
  setNickname,
  error,
  setError,
  isSubmitting,
  onLogin,
  onRegister,
  onGuest,
  onBack,
}: {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  username: string;
  setUsername: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  nickname: string;
  setNickname: (v: string) => void;
  error: string;
  setError: (v: string) => void;
  isSubmitting: boolean;
  onLogin: (e: React.FormEvent) => void;
  onRegister: (e: React.FormEvent) => void;
  onGuest: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Beautiful gradient background */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(135deg,
                #fef3c7 0%,
                #fde68a 25%,
                #fcd34d 50%,
                #fbbf24 75%,
                #f59e0b 100%
              )
            `,
          }}
        />
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-orange-300/30 blur-3xl" />
      </div>

      {/* Back button */}
      <motion.button
        onClick={onBack}
        className="fixed top-6 left-6 z-50 p-3 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all shadow-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg className="w-5 h-5 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </motion.button>

      <motion.div
        className="w-full max-w-md"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            className="text-7xl mb-4"
            animate={{
              y: [0, -5, 0],
              filter: [
                'drop-shadow(0 4px 20px rgba(251,191,36,0.3))',
                'drop-shadow(0 8px 30px rgba(251,191,36,0.5))',
                'drop-shadow(0 4px 20px rgba(251,191,36,0.3))',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            🐚
          </motion.div>
          <h1 className="text-2xl font-serif text-amber-900 tracking-wide">MomShell</h1>
          <p className="text-amber-700/70 text-sm mt-1">贝壳回响</p>
        </div>

        {/* Auth card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-amber-500/10 border border-white/50">
          <AnimatePresence mode="wait">
            {authMode === 'choice' && (
              <motion.div
                key="choice"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-medium text-center text-gray-800 mb-8">欢迎回来</h2>
                <button
                  onClick={() => setAuthMode('login')}
                  className="w-full py-4 rounded-2xl font-medium bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-300/30 hover:shadow-amber-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  登录
                </button>
                <button
                  onClick={() => setAuthMode('register')}
                  className="w-full py-4 rounded-2xl font-medium border-2 border-amber-400 text-amber-700 hover:bg-amber-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  注册新账号
                </button>
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-amber-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/80 text-amber-600/60">或</span>
                  </div>
                </div>
                <button
                  onClick={onGuest}
                  className="w-full py-3 text-sm text-amber-600/70 hover:text-amber-700 transition-all"
                >
                  游客模式浏览
                </button>
              </motion.div>
            )}

            {authMode === 'login' && (
              <motion.form
                key="login"
                onSubmit={onLogin}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <h2 className="text-xl font-medium text-center text-gray-800 mb-6">登录</h2>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 text-red-600 text-sm text-center py-3 px-4 rounded-xl border border-red-100"
                  >
                    {error}
                  </motion.div>
                )}
                <input
                  type="text"
                  placeholder="用户名或邮箱"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-amber-50/50 border border-amber-100 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all text-gray-700 placeholder:text-amber-400/60"
                  required
                />
                <input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-amber-50/50 border border-amber-100 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all text-gray-700 placeholder:text-amber-400/60"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl font-medium bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-300/30 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? '登录中...' : '登录'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('choice'); setError(''); }}
                  className="w-full py-2 text-sm text-amber-600/70 hover:text-amber-700"
                >
                  返回
                </button>
              </motion.form>
            )}

            {authMode === 'register' && (
              <motion.form
                key="register"
                onSubmit={onRegister}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-medium text-center text-gray-800 mb-2">注册</h2>
                <p className="text-sm text-center text-amber-600/70 mb-4">注册后将选择您的身份</p>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 text-red-600 text-sm text-center py-3 px-4 rounded-xl border border-red-100"
                  >
                    {error}
                  </motion.div>
                )}
                <input
                  type="text"
                  placeholder="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-amber-50/50 border border-amber-100 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all text-gray-700 placeholder:text-amber-400/60"
                  required
                />
                <input
                  type="email"
                  placeholder="邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-amber-50/50 border border-amber-100 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all text-gray-700 placeholder:text-amber-400/60"
                  required
                />
                <input
                  type="text"
                  placeholder="昵称（可选）"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-amber-50/50 border border-amber-100 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all text-gray-700 placeholder:text-amber-400/60"
                />
                <input
                  type="password"
                  placeholder="密码（至少6位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-amber-50/50 border border-amber-100 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-all text-gray-700 placeholder:text-amber-400/60"
                  required
                  minLength={6}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl font-medium bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-300/30 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? '注册中...' : '注册'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('choice'); setError(''); }}
                  className="w-full py-2 text-sm text-amber-600/70 hover:text-amber-700"
                >
                  返回
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Identity Selection View - 50/50 vertical split
 */
function IdentitySelectView({
  pendingIdentity,
  showConfirm,
  isSubmitting,
  error,
  onSelect,
  onConfirm,
  onCancel,
}: {
  pendingIdentity: UserIdentity | null;
  showConfirm: boolean;
  isSubmitting: boolean;
  error: string;
  onSelect: (identity: UserIdentity) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      className="min-h-screen flex flex-col md:flex-row"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Title overlay */}
      <div className="absolute top-8 left-0 right-0 z-20 text-center">
        <motion.h1
          className="text-2xl font-serif text-white drop-shadow-lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          选择你的身份
        </motion.h1>
        <motion.p
          className="text-sm text-white/70 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          此选择不可更改
        </motion.p>
      </div>

      {/* Left: 溯源者 (Mom) */}
      <motion.button
        onClick={() => onSelect('origin_seeker')}
        className="flex-1 relative flex flex-col items-center justify-center p-8 transition-all overflow-hidden group"
        whileHover={{ flex: 1.15 }}
        transition={{ duration: 0.3 }}
      >
        {/* Background */}
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 30%, #fcd34d 60%, #fbbf24 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-amber-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Content */}
        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="text-8xl md:text-9xl mb-6"
            animate={{
              y: [0, -8, 0],
              filter: [
                'drop-shadow(0 10px 30px rgba(120,53,15,0.2))',
                'drop-shadow(0 20px 40px rgba(120,53,15,0.3))',
                'drop-shadow(0 10px 30px rgba(120,53,15,0.2))',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            🦪
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-serif mb-4 text-amber-900">
            溯源者
          </h2>
          <p className="text-base md:text-lg text-amber-800/80 max-w-xs leading-relaxed">
            洗去尘嚣
            <br />
            让自我重新发光
          </p>
        </motion.div>
      </motion.button>

      {/* Right: 守护者 (Dad) */}
      <motion.button
        onClick={() => onSelect('guardian')}
        className="flex-1 relative flex flex-col items-center justify-center p-8 transition-all overflow-hidden group"
        whileHover={{ flex: 1.15 }}
        transition={{ duration: 0.3 }}
      >
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #1e293b 40%, #0f172a 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Stars */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Content */}
        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            className="text-8xl md:text-9xl mb-6"
            animate={{
              y: [0, -8, 0],
              filter: [
                'drop-shadow(0 10px 30px rgba(148,163,184,0.2))',
                'drop-shadow(0 20px 40px rgba(148,163,184,0.4))',
                'drop-shadow(0 10px 30px rgba(148,163,184,0.2))',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          >
            🐚
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-serif mb-4 text-slate-100">
            守护者
          </h2>
          <p className="text-base md:text-lg text-slate-300/80 max-w-xs leading-relaxed">
            守望她的
            <br />
            流光溢彩
          </p>
        </motion.div>
      </motion.button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <div className="text-center mb-8">
                <motion.div
                  className="text-7xl mb-4"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {pendingIdentity === 'origin_seeker' ? '🦪' : '🐚'}
                </motion.div>
                <h3 className="text-2xl font-serif text-gray-800 mb-3">
                  确认选择
                </h3>
                <p className="text-lg text-gray-600">
                  「{pendingIdentity === 'origin_seeker' ? '溯源者' : '守护者'}」
                </p>
                <p className="text-amber-600 text-sm font-medium mt-4 flex items-center justify-center gap-1">
                  <span>⚠️</span> 身份选定后不可更改
                </p>
                {error && (
                  <p className="text-red-500 text-sm mt-3">{error}</p>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 font-medium"
                >
                  再想想
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="flex-1 py-4 rounded-2xl text-white transition-all disabled:opacity-50 font-medium"
                  style={{
                    background: pendingIdentity === 'origin_seeker'
                      ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                      : 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                  }}
                >
                  {isSubmitting ? '确认中...' : '确定'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
