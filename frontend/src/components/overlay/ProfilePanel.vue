<template>
  <OverlayPanel :visible="uiStore.activePanel === 'profile'" position="right" @close="uiStore.closePanel()">
    <div class="profile-panel">
      <div class="profile-header">
        <div class="profile-avatar" @click="triggerAvatarUpload">
          <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" />
          <span v-else class="avatar-placeholder">{{ displayInitial }}</span>
          <span class="avatar-edit-hint">{{ avatarUploading ? '...' : '✎' }}</span>
          <input
            ref="avatarInput"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style="display: none"
            @change="onAvatarChange"
          />
        </div>
        <div class="profile-info">
          <div v-if="!editingNickname" class="nickname-row" @click="startEditNickname">
            <h2 class="profile-name">{{ displayNickname }}</h2>
            <span class="edit-icon">✎</span>
          </div>
          <div v-else class="nickname-edit">
            <input
              ref="nicknameInput"
              v-model="nicknameValue"
              class="nickname-input"
              maxlength="20"
              @keydown.enter="saveNickname"
              @blur="saveNickname"
            />
          </div>
          <p class="profile-username">@{{ profile?.username || auth.user?.username }}</p>
          <span class="role-badge" :class="'role-' + (auth.user?.role || 'mom')">{{ roleName }}</span>
        </div>
      </div>

      <div v-if="nicknameError" class="inline-error">{{ nicknameError }}</div>

      <div class="stats-grid">
        <div class="stat-cell">
          <span class="stat-value">{{ profile?.stats.question_count ?? 0 }}</span>
          <span class="stat-label">发帖</span>
        </div>
        <div class="stat-cell">
          <span class="stat-value">{{ profile?.stats.answer_count ?? 0 }}</span>
          <span class="stat-label">回答</span>
        </div>
        <div class="stat-cell">
          <span class="stat-value">{{ profile?.stats.like_received_count ?? 0 }}</span>
          <span class="stat-label">获赞</span>
        </div>
        <div class="stat-cell">
          <span class="stat-value">{{ profile?.stats.collection_count ?? 0 }}</span>
          <span class="stat-label">收藏</span>
        </div>
      </div>

      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <template v-if="activeTab === 'questions'">
          <div v-if="questionsLoading && myQuestions.length === 0" class="loading-state">加载中...</div>
          <div v-else-if="myQuestions.length === 0" class="empty-state">还没有发布过问题</div>
          <template v-else>
            <div class="item-list">
              <div v-for="q in myQuestions" :key="q.id" class="item-card">
                <div class="item-top">
                  <h4 class="item-title">{{ q.title }}</h4>
                  <span class="status-badge" :class="'status-' + q.status">{{ statusText(q.status) }}</span>
                </div>
                <p class="item-preview">{{ q.content_preview }}</p>
                <div class="item-meta">
                  <span>💬 {{ q.answer_count }}</span>
                  <span>❤️ {{ q.like_count }}</span>
                  <span>{{ formatDate(q.created_at) }}</span>
                </div>
              </div>
            </div>
            <button
              v-if="questionsPage < questionsTotalPages"
              class="load-more-btn"
              :disabled="questionsLoading"
              @click="loadMoreQuestions"
            >
              {{ questionsLoading ? '加载中...' : '加载更多' }}
            </button>
          </template>
        </template>

        <template v-if="activeTab === 'answers'">
          <div v-if="answersLoading && myAnswers.length === 0" class="loading-state">加载中...</div>
          <div v-else-if="myAnswers.length === 0" class="empty-state">还没有回答过问题</div>
          <template v-else>
            <div class="item-list">
              <div v-for="a in myAnswers" :key="a.id" class="item-card">
                <div class="item-top">
                  <span class="item-ref">{{ a.question.title }}</span>
                  <span class="status-badge" :class="'status-' + a.status">{{ statusText(a.status) }}</span>
                </div>
                <p class="item-preview">{{ a.content_preview }}</p>
                <div class="item-meta">
                  <span>❤️ {{ a.like_count }}</span>
                  <span v-if="a.is_accepted" class="accepted-tag">✓ 已采纳</span>
                  <span>{{ formatDate(a.created_at) }}</span>
                </div>
              </div>
            </div>
            <button
              v-if="answersPage < answersTotalPages"
              class="load-more-btn"
              :disabled="answersLoading"
              @click="loadMoreAnswers"
            >
              {{ answersLoading ? '加载中...' : '加载更多' }}
            </button>
          </template>
        </template>

        <template v-if="activeTab === 'settings'">
          <!-- Profile Info -->
          <div class="settings-section">
            <h3 class="settings-heading">个人资料</h3>
            <div class="profile-form">
              <label class="form-label">头像</label>
              <div class="avatar-upload-row">
                <div class="avatar-preview-small">
                  <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" />
                  <span v-else class="avatar-placeholder-small">{{ displayInitial }}</span>
                </div>
                <button class="upload-btn" :disabled="avatarUploading" @click="triggerAvatarUpload">
                  {{ avatarUploading ? '上传中...' : '更换头像' }}
                </button>
                <span class="upload-hint">JPG/PNG/GIF/WebP, 最大 2MB</span>
              </div>
              <div v-if="avatarError" class="form-error">{{ avatarError }}</div>
              <label class="form-label">用户名</label>
              <input
                v-model="profileForm.username"
                type="text"
                class="form-input"
                placeholder="用户名"
                maxlength="50"
                minlength="3"
              />
              <label class="form-label">昵称</label>
              <input
                v-model="profileForm.nickname"
                type="text"
                class="form-input"
                placeholder="昵称"
                maxlength="50"
              />
              <label class="form-label">邮箱</label>
              <input
                v-model="profileForm.email"
                type="email"
                class="form-input"
                placeholder="email@example.com"
              />
              <div v-if="profileFormError" class="form-error">{{ profileFormError }}</div>
              <div v-if="profileFormSuccess" class="form-success">{{ profileFormSuccess }}</div>
              <button
                class="submit-btn"
                :disabled="profileFormLoading"
                @click="onSaveProfile"
              >
                {{ profileFormLoading ? '保存中...' : '保存资料' }}
              </button>
            </div>
          </div>

          <!-- Identity Role -->
          <div class="settings-section">
            <h3 class="settings-heading">身份标签</h3>
            <div class="role-selector">
              <button
                v-for="opt in roleOptions"
                :key="opt.key"
                :class="['role-option', { active: selectedRole === opt.key }]"
                @click="selectedRole = opt.key"
              >
                {{ opt.label }}
              </button>
            </div>
            <div v-if="roleError" class="form-error">{{ roleError }}</div>
            <div v-if="roleSuccess" class="form-success">{{ roleSuccess }}</div>
            <button
              class="submit-btn"
              :disabled="roleLoading || selectedRole === (profile?.role || auth.user?.role)"
              @click="onSaveRole"
            >
              {{ roleLoading ? '保存中...' : '保存身份' }}
            </button>
          </div>

          <!-- Change Password -->
          <div class="settings-section">
            <h3 class="settings-heading">修改密码</h3>
            <form class="password-form" @submit.prevent="onChangePassword">
              <input
                v-model="pwForm.old_password"
                type="password"
                class="form-input"
                placeholder="当前密码"
                required
                autocomplete="current-password"
              />
              <input
                v-model="pwForm.new_password"
                type="password"
                class="form-input"
                placeholder="新密码"
                required
                minlength="6"
                autocomplete="new-password"
              />
              <input
                v-model="pwForm.confirm_password"
                type="password"
                class="form-input"
                placeholder="确认新密码"
                required
                minlength="6"
                autocomplete="new-password"
              />
              <div v-if="pwError" class="form-error">{{ pwError }}</div>
              <div v-if="pwSuccess" class="form-success">{{ pwSuccess }}</div>
              <button type="submit" class="submit-btn" :disabled="pwLoading">
                {{ pwLoading ? '提交中...' : '修改密码' }}
              </button>
            </form>
          </div>

          <div class="settings-section">
            <button class="logout-btn" @click="onLogout">退出登录</button>
          </div>
        </template>
      </div>
    </div>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  getMyQuestions,
  getMyAnswers,
  changePassword,
  type UserProfile,
  type MyQuestionListItem,
  type MyAnswerListItem,
} from '@/lib/api/user'
import { getErrorMessage } from '@/lib/apiClient'
import avatarDefault from '@/assets/avatar.png'

const uiStore = useUiStore()
const auth = useAuthStore()

const profile = ref<UserProfile | null>(null)
const activeTab = ref<'questions' | 'answers' | 'settings'>('questions')

const editingNickname = ref(false)
const nicknameValue = ref('')
const nicknameError = ref('')
const nicknameInput = ref<HTMLInputElement | null>(null)

const myQuestions = ref<MyQuestionListItem[]>([])
const questionsPage = ref(1)
const questionsTotalPages = ref(1)
const questionsLoading = ref(false)

const myAnswers = ref<MyAnswerListItem[]>([])
const answersPage = ref(1)
const answersTotalPages = ref(1)
const answersLoading = ref(false)

// Profile form
const profileForm = reactive({ username: '', nickname: '', email: '' })
const profileFormError = ref('')
const profileFormSuccess = ref('')
const profileFormLoading = ref(false)

// Avatar upload
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const avatarError = ref('')

// Identity role
const selectedRole = ref('')
const roleLoading = ref(false)
const roleError = ref('')
const roleSuccess = ref('')
const roleOptions = [
  { key: 'mom', label: '妈妈' },
  { key: 'dad', label: '爸爸' },
  { key: 'family', label: '家人' },
]

// Password
const pwForm = ref({ old_password: '', new_password: '', confirm_password: '' })
const pwError = ref('')
const pwSuccess = ref('')
const pwLoading = ref(false)

const tabs = [
  { key: 'questions' as const, label: '我的提问' },
  { key: 'answers' as const, label: '我的回答' },
  { key: 'settings' as const, label: '设置' },
]

const roleMap: Record<string, string> = {
  mom: '妈妈',
  dad: '爸爸',
  family: '家人',
  professional: '专业认证',
}

const displayNickname = computed(() => profile.value?.nickname || auth.user?.nickname || '用户')
const displayInitial = computed(() => displayNickname.value.charAt(0))
const avatarUrl = computed(() => profile.value?.avatar_url || auth.user?.avatar_url || avatarDefault)
const roleName = computed(() => roleMap[auth.user?.role || 'mom'] || '妈妈')

function statusText(status: string): string {
  const map: Record<string, string> = {
    published: '已发布',
    pending_review: '审核中',
    hidden: '已隐藏',
    draft: '草稿',
  }
  return map[status] || status
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${m}/${day}`
}

function startEditNickname() {
  nicknameValue.value = displayNickname.value
  nicknameError.value = ''
  editingNickname.value = true
  nextTick(() => nicknameInput.value?.focus())
}

async function saveNickname() {
  if (!editingNickname.value) return
  const trimmed = nicknameValue.value.trim()
  if (!trimmed || trimmed === displayNickname.value) {
    editingNickname.value = false
    return
  }
  try {
    const updated = await updateUserProfile({ nickname: trimmed })
    profile.value = updated
    if (auth.user) {
      auth.user.nickname = updated.nickname
    }
    profileForm.nickname = updated.nickname
    nicknameError.value = ''
  } catch (e) {
    nicknameError.value = getErrorMessage(e)
  }
  editingNickname.value = false
}

function syncProfileForm() {
  profileForm.username = profile.value?.username || auth.user?.username || ''
  profileForm.nickname = profile.value?.nickname || auth.user?.nickname || ''
  profileForm.email = profile.value?.email || auth.user?.email || ''
}

async function fetchProfile() {
  try {
    profile.value = await getUserProfile()
    syncProfileForm()
  } catch {
    // use auth.user as fallback
    syncProfileForm()
  }
}

function triggerAvatarUpload() {
  avatarInput.value?.click()
}

async function onAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''

  if (file.size > 2 * 1024 * 1024) {
    avatarError.value = '图片大小不能超过 2MB'
    return
  }
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    avatarError.value = '仅支持 JPG、PNG、GIF、WebP 格式'
    return
  }

  avatarError.value = ''
  avatarUploading.value = true
  try {
    const updated = await uploadAvatar(file)
    profile.value = updated
    if (auth.user) {
      auth.user.avatar_url = updated.avatar_url
    }
  } catch (e) {
    avatarError.value = getErrorMessage(e)
  } finally {
    avatarUploading.value = false
  }
}

async function onSaveProfile() {
  profileFormError.value = ''
  profileFormSuccess.value = ''

  const data: Record<string, string> = {}
  const p = profile.value
  const trimmedUsername = profileForm.username.trim()
  const trimmedNickname = profileForm.nickname.trim()
  const trimmedEmail = profileForm.email.trim()

  if (trimmedUsername && trimmedUsername !== (p?.username || auth.user?.username)) {
    if (trimmedUsername.length < 3) {
      profileFormError.value = '用户名至少3个字符'
      return
    }
    data.username = trimmedUsername
  }
  if (trimmedNickname && trimmedNickname !== (p?.nickname || auth.user?.nickname)) {
    data.nickname = trimmedNickname
  }
  if (trimmedEmail && trimmedEmail !== (p?.email || auth.user?.email)) {
    data.email = trimmedEmail
  }

  if (Object.keys(data).length === 0) {
    profileFormSuccess.value = '没有需要更新的内容'
    return
  }

  profileFormLoading.value = true
  try {
    const updated = await updateUserProfile(data)
    profile.value = updated
    if (auth.user) {
      auth.user.username = updated.username
      auth.user.nickname = updated.nickname
      auth.user.email = updated.email
      auth.user.avatar_url = updated.avatar_url
    }
    syncProfileForm()
    profileFormSuccess.value = '资料已更新'
  } catch (e) {
    profileFormError.value = getErrorMessage(e)
  } finally {
    profileFormLoading.value = false
  }
}

async function onSaveRole() {
  if (!selectedRole.value) return
  roleError.value = ''
  roleSuccess.value = ''
  roleLoading.value = true
  try {
    const updated = await updateUserProfile({ role: selectedRole.value })
    profile.value = updated
    if (auth.user) {
      auth.user.role = updated.role
    }
    roleSuccess.value = '身份已更新'
  } catch (e) {
    roleError.value = getErrorMessage(e)
  } finally {
    roleLoading.value = false
  }
}

async function fetchQuestions(page: number) {
  questionsLoading.value = true
  try {
    const res = await getMyQuestions({ page, page_size: 10 })
    if (page === 1) {
      myQuestions.value = res.items
    } else {
      myQuestions.value = [...myQuestions.value, ...res.items]
    }
    questionsPage.value = res.page
    questionsTotalPages.value = res.total_pages
  } catch {
    // silent
  } finally {
    questionsLoading.value = false
  }
}

async function fetchAnswers(page: number) {
  answersLoading.value = true
  try {
    const res = await getMyAnswers({ page, page_size: 10 })
    if (page === 1) {
      myAnswers.value = res.items
    } else {
      myAnswers.value = [...myAnswers.value, ...res.items]
    }
    answersPage.value = res.page
    answersTotalPages.value = res.total_pages
  } catch {
    // silent
  } finally {
    answersLoading.value = false
  }
}

function loadMoreQuestions() {
  fetchQuestions(questionsPage.value + 1)
}

function loadMoreAnswers() {
  fetchAnswers(answersPage.value + 1)
}

async function onChangePassword() {
  pwError.value = ''
  pwSuccess.value = ''
  if (pwForm.value.new_password !== pwForm.value.confirm_password) {
    pwError.value = '两次输入的新密码不一致'
    return
  }
  if (pwForm.value.new_password.length < 6) {
    pwError.value = '新密码长度不能少于6位'
    return
  }
  pwLoading.value = true
  try {
    const res = await changePassword({
      old_password: pwForm.value.old_password,
      new_password: pwForm.value.new_password,
    })
    pwSuccess.value = res.message || '密码修改成功'
    pwForm.value = { old_password: '', new_password: '', confirm_password: '' }
  } catch (e) {
    pwError.value = getErrorMessage(e)
  } finally {
    pwLoading.value = false
  }
}

function onLogout() {
  auth.logout()
  uiStore.closePanel()
}

watch(
  () => uiStore.activePanel,
  (panel) => {
    if (panel === 'profile' && auth.isAuthenticated) {
      fetchProfile()
      activeTab.value = 'questions'
      myQuestions.value = []
      myAnswers.value = []
      questionsPage.value = 1
      answersPage.value = 1
      fetchQuestions(1)
    }
  },
)

watch(activeTab, (tab) => {
  if (tab === 'answers' && myAnswers.value.length === 0) {
    fetchAnswers(1)
  }
  if (tab === 'settings') {
    syncProfileForm()
    profileFormError.value = ''
    profileFormSuccess.value = ''
    selectedRole.value = profile.value?.role || auth.user?.role || 'mom'
    roleError.value = ''
    roleSuccess.value = ''
  }
})
</script>

<style scoped>
.profile-panel {
  padding: 32px 24px;
  min-height: 100vh;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 20px;
}

.profile-avatar {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
  cursor: pointer;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  color: var(--accent-warm);
}

.avatar-edit-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 18px;
  opacity: 0;
  transition: opacity 0.2s;
}

.profile-avatar:hover .avatar-edit-hint {
  opacity: 1;
}

/* Avatar Upload */
.avatar-upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-preview-small {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}

.avatar-preview-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder-small {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-warm);
}

.upload-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.upload-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.18);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.upload-hint {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.6;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.nickname-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.nickname-row:hover .edit-icon {
  opacity: 1;
}

.profile-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-icon {
  font-size: 14px;
  color: var(--text-secondary);
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.nickname-edit {
  display: flex;
}

.nickname-input {
  width: 100%;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
  outline: none;
  font-family: inherit;
}

.nickname-input:focus {
  border-color: var(--accent-warm);
}

.profile-username {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 3px;
}

.role-badge {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.role-mom {
  background: rgba(255, 182, 193, 0.2);
  color: #ffb6c1;
}

.role-dad {
  background: rgba(135, 206, 235, 0.2);
  color: #87ceeb;
}

.role-family {
  background: rgba(255, 218, 185, 0.2);
  color: #ffdab9;
}

.role-professional {
  background: rgba(144, 238, 144, 0.2);
  color: #90ee90;
}

.inline-error {
  padding: 8px 14px;
  margin-bottom: 16px;
  background: rgba(255, 100, 100, 0.12);
  border-radius: 10px;
  font-size: 13px;
  color: #ff8888;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 22px;
}

.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 4px;
}

.tab-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: 11px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.14);
  color: var(--text-primary);
}

.tab-content {
  min-height: 200px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item-card {
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  transition: background 0.2s;
}

.item-card:hover {
  background: rgba(255, 255, 255, 0.08);
}

.item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-ref {
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-warm);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.status-published {
  background: rgba(72, 199, 142, 0.18);
  color: #48c78e;
}

.status-pending_review {
  background: rgba(255, 210, 76, 0.18);
  color: #ffd24c;
}

.status-hidden {
  background: rgba(160, 160, 160, 0.18);
  color: #a0a0a0;
}

.status-draft {
  background: rgba(160, 160, 160, 0.18);
  color: #a0a0a0;
}

.item-preview {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-meta {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 10px;
}

.accepted-tag {
  color: #48c78e;
  font-weight: 600;
}

.load-more-btn {
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.load-more-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.settings-section {
  margin-bottom: 28px;
}

.settings-heading {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.profile-form,
.password-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: -6px;
}

.form-input {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 15px;
  outline: none;
  font-family: inherit;
}

.form-input:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.form-input::placeholder {
  color: var(--text-secondary);
}

.form-error {
  padding: 8px 14px;
  background: rgba(255, 100, 100, 0.12);
  border-radius: 10px;
  font-size: 13px;
  color: #ff8888;
}

.form-success {
  padding: 8px 14px;
  background: rgba(72, 199, 142, 0.12);
  border-radius: 10px;
  font-size: 13px;
  color: #48c78e;
}

.submit-btn {
  padding: 12px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.18);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Role Selector */
.role-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.role-option {
  flex: 1;
  padding: 10px 0;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.role-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.role-option.active {
  background: rgba(255, 182, 193, 0.2);
  border-color: rgba(255, 182, 193, 0.4);
  color: var(--text-primary);
}

.logout-btn {
  width: 100%;
  padding: 14px;
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.2);
  border-radius: 14px;
  color: #ff8888;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: rgba(255, 100, 100, 0.18);
}
</style>
