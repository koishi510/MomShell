'use client';

// frontend/app/community/profile/page.tsx
/**
 * 个人中心页面
 * 查看和编辑用户资料
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyProfile, updateMyProfile, type UserProfile } from '../../../lib/api/community';
import { changePassword, getAccessToken } from '../../../lib/auth';
import { getErrorMessage } from '../../../lib/apiClient';
import CommunityBackground from '../../../components/community/CommunityBackground';
import { useAuth } from '../../../contexts/AuthContext';
import { AuthGuard } from '../../../components/AuthGuard';

// Role display names
const roleNames: Record<string, string> = {
  mom: '妈妈',
  dad: '爸爸',
  family: '家属',
  certified_doctor: '认证医生',
  certified_therapist: '认证康复师',
  certified_nurse: '认证护士',
  admin: '管理员',
  ai_assistant: 'AI 助手',
};

// Family roles that users can select
const familyRoles = [
  { value: 'mom', label: '妈妈' },
  { value: 'dad', label: '爸爸' },
  { value: 'family', label: '家属' },
] as const;

// Professional roles (cannot be changed by user)
const professionalRoles = ['certified_doctor', 'certified_therapist', 'certified_nurse', 'admin'];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editRole, setEditRole] = useState<'mom' | 'dad' | 'family'>('mom');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ show: boolean; success: boolean; text: string }>({
    show: false,
    success: true,
    text: '',
  });
  const hasFetched = useRef(false);

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Email change state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // Check if user has a professional role (cannot change)
  const isProfessional = profile ? professionalRoles.includes(profile.role) : false;

  useEffect(() => {
    if (hasFetched.current) return;
    // Only fetch profile if authenticated
    if (authLoading || !isAuthenticated) return;
    hasFetched.current = true;

    async function loadProfile() {
      try {
        const data = await getMyProfile();
        setProfile(data);
        setEditNickname(data.nickname);
        // Set editRole only if it's a family role
        if (['mom', 'dad', 'family'].includes(data.role)) {
          setEditRole(data.role as 'mom' | 'dad' | 'family');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('加载失败，请刷新重试');
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [authLoading, isAuthenticated]);

  const handleSave = async () => {
    if (!editNickname.trim()) {
      setSaveMessage({ show: true, success: false, text: '昵称不能为空' });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
      return;
    }

    if (editNickname.length > 50) {
      setSaveMessage({ show: true, success: false, text: '昵称不能超过50个字符' });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
      return;
    }

    setIsSaving(true);
    try {
      const updateParams: { nickname: string; role?: 'mom' | 'dad' | 'family' } = {
        nickname: editNickname.trim(),
      };
      // Only include role if user is not a professional
      if (!isProfessional) {
        updateParams.role = editRole;
      }
      const updatedProfile = await updateMyProfile(updateParams);
      setProfile(updatedProfile);
      setIsEditing(false);
      setSaveMessage({ show: true, success: true, text: '保存成功' });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setSaveMessage({ show: true, success: false, text: '保存失败，请重试' });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditNickname(profile?.nickname || '');
    if (profile && ['mom', 'dad', 'family'].includes(profile.role)) {
      setEditRole(profile.role as 'mom' | 'dad' | 'family');
    }
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setSaveMessage({ show: true, success: false, text: '请填写所有密码字段' });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
      return;
    }

    if (newPassword.length < 6) {
      setSaveMessage({ show: true, success: false, text: '新密码至少6位' });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
      return;
    }

    if (newPassword !== confirmPassword) {
      setSaveMessage({ show: true, success: false, text: '两次输入的新密码不一致' });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error('未登录');
      await changePassword(token, oldPassword, newPassword);
      setSaveMessage({ show: true, success: true, text: '密码修改成功' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
    } catch (err: unknown) {
      console.error('Failed to change password:', err);
      setSaveMessage({ show: true, success: false, text: getErrorMessage(err) });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!editEmail.trim()) {
      setSaveMessage({ show: true, success: false, text: '邮箱不能为空' });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      setSaveMessage({ show: true, success: false, text: '请输入有效的邮箱地址' });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
      return;
    }

    setIsSavingEmail(true);
    try {
      const updatedProfile = await updateMyProfile({ email: editEmail.trim() });
      setProfile(updatedProfile);
      setIsEditingEmail(false);
      setSaveMessage({ show: true, success: true, text: '邮箱修改成功' });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
    } catch (err: unknown) {
      console.error('Failed to update email:', err);
      setSaveMessage({ show: true, success: false, text: getErrorMessage(err) });
      setTimeout(() => setSaveMessage({ show: false, success: true, text: '' }), 3000);
    } finally {
      setIsSavingEmail(false);
    }
  };

  return (
    <AuthGuard>
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景 */}
      <CommunityBackground />

      {/* 保存结果提示 */}
      <AnimatePresence>
        {saveMessage.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-lg backdrop-blur-md ${
              saveMessage.success
                ? 'bg-emerald-500/90 text-white'
                : 'bg-red-500/90 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {saveMessage.success ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{saveMessage.text}</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span>{saveMessage.text}</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <span className="text-2xl">👤</span>
          <span className="text-lg font-medium text-stone-700">个人中心</span>
        </div>
      </motion.header>

      {/* 主内容 */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* 加载状态 */}
        {(authLoading || isLoading) && (
          <div className="flex justify-center py-16">
            <div className="text-stone-500">加载中...</div>
          </div>
        )}

        {/* 错误状态 */}
        {error && !isLoading && !authLoading && (
          <div className="flex flex-col items-center py-16">
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-stone-800 text-white text-sm rounded-full hover:bg-stone-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* 个人资料卡片 */}
        {!isLoading && !authLoading && !error && profile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 头像和基本信息 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-stone-100/50">
              <div className="flex items-center gap-4 mb-6">
                {/* 头像 */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-amber-50 flex items-center justify-center text-4xl shadow-sm">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.nickname}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    '👩'
                  )}
                </div>

                {/* 昵称和角色 */}
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700"
                        placeholder="输入昵称"
                        maxLength={50}
                        autoFocus
                      />
                      {/* Role selector - only for non-professional users */}
                      {!isProfessional && (
                        <div className="space-y-2">
                          <label className="text-sm text-stone-500">选择身份</label>
                          <div className="flex gap-2">
                            {familyRoles.map((role) => (
                              <button
                                key={role.value}
                                type="button"
                                onClick={() => setEditRole(role.value)}
                                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                                  editRole === role.value
                                    ? 'bg-[#e8a4b8] text-white'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                              >
                                {role.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="px-4 py-1.5 bg-[#e8a4b8] text-white text-sm rounded-full hover:bg-[#d88a9f] transition-colors disabled:opacity-50"
                        >
                          {isSaving ? '保存中...' : '保存'}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="px-4 py-1.5 bg-stone-100 text-stone-600 text-sm rounded-full hover:bg-stone-200 transition-colors disabled:opacity-50"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-medium text-stone-800">
                          {profile.nickname}
                        </h2>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-stone-400 hover:text-stone-600 transition-colors"
                          title="编辑昵称"
                        >
                          <EditIcon />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full text-xs">
                          {roleNames[profile.role] || profile.role}
                        </span>
                        {profile.is_certified && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            已认证
                          </span>
                        )}
                      </div>
                      {profile.certification_title && (
                        <p className="text-stone-400 text-sm mt-1">
                          {profile.certification_title}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 注册时间 */}
              <div className="text-stone-400 text-sm">
                加入时间：{new Date(profile.created_at).toLocaleDateString('zh-CN')}
              </div>
            </div>

            {/* 数据统计 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-stone-100/50">
              <h3 className="text-stone-700 font-medium mb-4">我的数据</h3>
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  icon="📝"
                  label="提问数"
                  value={profile.stats.question_count}
                  href="/community/my-posts"
                />
                <StatCard
                  icon="💬"
                  label="回答数"
                  value={profile.stats.answer_count}
                  href="/community/my-replies"
                />
                <StatCard
                  icon="❤️"
                  label="获赞数"
                  value={profile.stats.like_received_count}
                />
                <StatCard
                  icon="🐚"
                  label="收藏数"
                  value={profile.stats.collection_count}
                  href="/community/collections"
                />
              </div>
            </div>

            {/* 快捷入口 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-stone-100/50">
              <h3 className="text-stone-700 font-medium mb-4">快捷入口</h3>
              <div className="space-y-2">
                <QuickLink href="/community/my-posts" icon="📝" label="我的提问" />
                <QuickLink href="/community/my-replies" icon="💬" label="我的回答" />
                <QuickLink href="/community/collections" icon="🐚" label="我的收藏" />
                <QuickLink href="/community/certification" icon="🏥" label="专业认证" />
                {profile.role === 'admin' && (
                  <QuickLink href="/community/admin/certifications" icon="🛡️" label="认证审核" />
                )}
              </div>
            </div>

            {/* 账号安全 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-stone-100/50">
              <h3 className="text-stone-700 font-medium mb-4">账号安全</h3>

              {/* 用户名展示 */}
              <div className="mb-4 p-3 bg-stone-50/80 rounded-xl">
                <div className="text-sm text-stone-500 mb-1">用户名</div>
                <div className="text-stone-700 font-mono">{user?.username}</div>
              </div>

              {/* 邮箱展示/编辑 */}
              <div className="mb-4 p-3 bg-stone-50/80 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-stone-500">邮箱</span>
                  {!isEditingEmail && (
                    <button
                      onClick={() => {
                        setEditEmail(profile?.email || '');
                        setIsEditingEmail(true);
                      }}
                      className="text-xs text-[#e8a4b8] hover:text-[#d88a9f] transition-colors"
                    >
                      修改
                    </button>
                  )}
                </div>
                {isEditingEmail ? (
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700 text-sm"
                      placeholder="输入新邮箱"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEmail}
                        disabled={isSavingEmail}
                        className="px-3 py-1 bg-[#e8a4b8] text-white text-xs rounded-full hover:bg-[#d88a9f] transition-colors disabled:opacity-50"
                      >
                        {isSavingEmail ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={() => setIsEditingEmail(false)}
                        disabled={isSavingEmail}
                        className="px-3 py-1 bg-stone-100 text-stone-600 text-xs rounded-full hover:bg-stone-200 transition-colors disabled:opacity-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-stone-700">{profile?.email}</div>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-stone-600">修改密码</span>
                {!isChangingPassword && (
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="text-sm text-[#e8a4b8] hover:text-[#d88a9f] transition-colors"
                  >
                    修改
                  </button>
                )}
              </div>

              {isChangingPassword ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-stone-500 block mb-1">当前密码</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700"
                      placeholder="输入当前密码"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-stone-500 block mb-1">新密码</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700"
                      placeholder="输入新密码（至少6位）"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-stone-500 block mb-1">确认新密码</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:border-[#e8a4b8] focus:outline-none focus:ring-2 focus:ring-[#e8a4b8]/20 text-stone-700"
                      placeholder="再次输入新密码"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleChangePassword}
                      disabled={isUpdatingPassword}
                      className="px-4 py-2 bg-[#e8a4b8] text-white text-sm rounded-full hover:bg-[#d88a9f] transition-colors disabled:opacity-50"
                    >
                      {isUpdatingPassword ? '修改中...' : '确认修改'}
                    </button>
                    <button
                      onClick={() => {
                        setIsChangingPassword(false);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      disabled={isUpdatingPassword}
                      className="px-4 py-2 bg-stone-100 text-stone-600 text-sm rounded-full hover:bg-stone-200 transition-colors disabled:opacity-50"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-stone-500 text-sm">定期修改密码有助于账号安全</p>
              )}

              {/* 退出登录 */}
              <div className="mt-6 pt-6 border-t border-stone-100">
                <button
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  className="w-full py-3 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  退出登录
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
    </AuthGuard>
  );
}

// 统计卡片
function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className={`p-4 rounded-2xl bg-stone-50/80 ${href ? 'hover:bg-stone-100/80 transition-colors cursor-pointer' : ''}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-semibold text-stone-800">{value}</div>
      <div className="text-sm text-stone-500">{label}</div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// 快捷入口
function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50/80 transition-colors group">
        <span className="text-xl">{icon}</span>
        <span className="text-stone-600 flex-1">{label}</span>
        <svg
          className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

// 编辑图标
function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
