<template>
  <OverlayPanel :visible="embedded || uiStore.activePanel === 'profile'" :embedded="embedded" position="center" @close="uiStore.closePanel()">
    <div class="profile-panel">
      <div class="profile-header">
        <div class="profile-avatar" @click="triggerAvatarUpload">
          <img v-if="profileAvatarUrl" :src="profileAvatarUrl" alt="avatar" @error="onAvatarImgError" />
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
          <span class="role-badge">{{ roleName }}</span>
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

      <div class="settings-content">
        <!-- Profile Info -->
        <div class="settings-section">
          <h3 class="settings-heading">个人资料</h3>
          <div class="profile-form">
            <label class="form-label">头像</label>
            <div class="avatar-upload-row">
              <div class="avatar-preview-small">
                <img v-if="profileAvatarUrl" :src="profileAvatarUrl" alt="avatar" @error="onAvatarImgError" />
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
            <button class="submit-btn" :disabled="profileFormLoading" @click="onSaveProfile">
              {{ profileFormLoading ? '保存中...' : '保存资料' }}
            </button>
          </div>
        </div>

        <!-- Shell Code / Partner Binding -->
        <div class="settings-section">
          <h3 class="settings-heading">贝壳码</h3>
          <template v-if="isBound">
            <div class="partner-card">
              <span class="partner-label">已绑定：</span>
              <span class="partner-name">{{ profile?.partner?.nickname }}</span>
              <span class="partner-role">（{{ profile?.partner?.role === 'mom' ? '溯源者' : '守护者' }}）</span>
            </div>
            <button class="submit-btn danger-btn" :disabled="unbindLoading" @click="onUnbindPartner">
              {{ unbindLoading ? '解绑中...' : '解除绑定' }}
            </button>
          </template>
          <template v-else-if="isMom">
            <p class="shell-hint">生成贝壳码分享给守护者，完成伴侣绑定。</p>
            <div v-if="profile?.shell_code" class="shell-code-display">{{ profile.shell_code }}</div>
            <button class="submit-btn" :disabled="shellCodeLoading || !!profile?.shell_code" @click="onGenerateShellCode">
              {{ shellCodeLoading ? '生成中...' : profile?.shell_code ? '已生成' : '生成贝壳码' }}
            </button>
            <div v-if="shellCodeError" class="form-error">{{ shellCodeError }}</div>
          </template>
          <template v-else>
            <p class="shell-hint">输入溯源者分享的贝壳码，完成伴侣绑定。</p>
            <input v-model="bindCode" class="form-input" placeholder="请输入贝壳码" maxlength="8" />
            <div v-if="bindError" class="form-error">{{ bindError }}</div>
            <div v-if="bindSuccess" class="form-success">{{ bindSuccess }}</div>
            <button class="submit-btn" :disabled="bindLoading || !bindCode.trim()" @click="onBindPartner">
              {{ bindLoading ? '绑定中...' : '绑定' }}
            </button>
          </template>
        </div>

        <!-- Change Password -->
        <div class="settings-section">
          <h3 class="settings-heading">修改密码</h3>
          <form class="password-form" @submit.prevent="onChangePassword">
            <input v-model="pwForm.old_password" type="password" class="form-input" placeholder="当前密码" required autocomplete="current-password" />
            <input v-model="pwForm.new_password" type="password" class="form-input" placeholder="新密码" required minlength="6" autocomplete="new-password" />
            <input v-model="pwForm.confirm_password" type="password" class="form-input" placeholder="确认新密码" required minlength="6" autocomplete="new-password" />
            <div v-if="pwError" class="form-error">{{ pwError }}</div>
            <div v-if="pwSuccess" class="form-success">{{ pwSuccess }}</div>
            <button type="submit" class="submit-btn" :disabled="pwLoading">
              {{ pwLoading ? '提交中...' : '修改密码' }}
            </button>
          </form>
        </div>
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
  generateShellCode,
  bindPartner,
  unbindPartner,
  changePassword,
  type UserProfile,
} from '@/lib/api/user'
import { getErrorMessage } from '@/lib/apiClient'
import avatarDefault from '@/assets/images/avatar.png'

const uiStore = useUiStore()
const auth = useAuthStore()

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const isActive = computed(() => props.embedded || uiStore.activePanel === 'profile')

const profile = ref<UserProfile | null>(null)
const editingNickname = ref(false)
const nicknameValue = ref('')
const nicknameError = ref('')
const nicknameInput = ref<HTMLInputElement | null>(null)

const pwForm = ref({ old_password: '', new_password: '', confirm_password: '' })
const pwError = ref('')
const pwSuccess = ref('')
const pwLoading = ref(false)

const profileForm = reactive({ username: '', nickname: '', email: '' })
const profileFormError = ref('')
const profileFormSuccess = ref('')
const profileFormLoading = ref(false)

const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const avatarError = ref('')

const shellCodeLoading = ref(false)
const shellCodeError = ref('')
const bindCode = ref('')
const bindLoading = ref(false)
const bindError = ref('')
const bindSuccess = ref('')
const unbindLoading = ref(false)

const isBound = computed(() => !!profile.value?.partner)
const isMom = computed(() => (profile.value?.role || auth.user?.role) === 'mom')

const roleMap: Record<string, string> = { mom: '溯源者', dad: '守护者', professional: '专业认证' }
const displayNickname = computed(() => profile.value?.nickname || auth.user?.nickname || '用户')
const displayInitial = computed(() => displayNickname.value.charAt(0))
const profileAvatarUrl = computed(() => profile.value?.avatar_url || auth.user?.avatar_url || avatarDefault)
const roleName = computed(() => roleMap[profile.value?.role || auth.user?.role || 'mom'] || '溯源者')

function onAvatarImgError(e: Event) {
  const img = e.target as HTMLImageElement
  if (!img.dataset.fallback) {
    img.dataset.fallback = '1'
    img.src = avatarDefault
  }
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
    syncProfileForm()
  }
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
    if (auth.user) auth.user.nickname = updated.nickname
    profileForm.nickname = updated.nickname
    nicknameError.value = ''
  } catch (e) {
    nicknameError.value = getErrorMessage(e)
  }
  editingNickname.value = false
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
    if (auth.user) auth.user.avatar_url = updated.avatar_url
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
  if (trimmedNickname && trimmedNickname !== (p?.nickname || auth.user?.nickname)) data.nickname = trimmedNickname
  if (trimmedEmail && trimmedEmail !== (p?.email || auth.user?.email)) data.email = trimmedEmail
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

async function onGenerateShellCode() {
  shellCodeError.value = ''
  shellCodeLoading.value = true
  try {
    profile.value = await generateShellCode()
  } catch (e) {
    shellCodeError.value = getErrorMessage(e)
  } finally {
    shellCodeLoading.value = false
  }
}

async function onBindPartner() {
  if (!bindCode.value.trim()) return
  bindError.value = ''
  bindSuccess.value = ''
  bindLoading.value = true
  try {
    profile.value = await bindPartner(bindCode.value.trim())
    bindSuccess.value = '绑定成功'
    bindCode.value = ''
  } catch (e) {
    bindError.value = getErrorMessage(e)
  } finally {
    bindLoading.value = false
  }
}

async function onUnbindPartner() {
  unbindLoading.value = true
  try {
    profile.value = await unbindPartner()
  } catch (e) {
    bindError.value = getErrorMessage(e)
  } finally {
    unbindLoading.value = false
  }
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

watch(isActive, (active) => {
  if (active) {
    pwForm.value = { old_password: '', new_password: '', confirm_password: '' }
    pwError.value = ''
    pwSuccess.value = ''
    fetchProfile()
  }
}, { immediate: true })
</script>

<style scoped>
.profile-panel {
  padding: 32px 28px 28px;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 20px;
}

.profile-avatar {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  cursor: pointer;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.12);
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  font-size: 28px;
  font-weight: 600;
}

.avatar-edit-hint {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  border-radius: 50%;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
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

.profile-name {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.edit-icon {
  color: var(--text-secondary);
  font-size: 14px;
}

.nickname-edit {
  margin-bottom: 4px;
}

.nickname-input {
  width: 100%;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
  outline: none;
  font-family: inherit;
}

.nickname-input:focus { border-color: rgba(255, 255, 255, 0.35); }

.profile-username {
  margin: 4px 0 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.role-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.inline-error {
  padding: 8px 12px;
  background: rgba(220, 60, 60, 0.12);
  border-radius: 8px;
  color: #ffbbbb;
  font-size: 13px;
  margin-bottom: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.stat-cell {
  text-align: center;
  padding: 12px 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
}

.stat-label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-section {
  padding: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
}

.settings-heading {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-form,
.password-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-input:focus { border-color: rgba(255, 255, 255, 0.25); }
.form-input::placeholder { color: var(--text-secondary); }

.avatar-upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.avatar-preview-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-preview-small img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder-small {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.upload-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.upload-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.14); }
.upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.upload-hint {
  font-size: 12px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.form-error {
  padding: 8px 12px;
  background: rgba(220, 60, 60, 0.12);
  border-radius: 8px;
  color: #ffbbbb;
  font-size: 13px;
}

.form-success {
  padding: 8px 12px;
  background: rgba(60, 180, 100, 0.12);
  border-radius: 8px;
  color: #a8f0c0;
  font-size: 13px;
}

.submit-btn {
  padding: 12px 20px;
  background: var(--accent-warm);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  min-height: 44px;
}

.submit-btn:hover:not(:disabled) { background: var(--accent-warm-hover); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.danger-btn {
  background: rgba(220, 60, 60, 0.15);
  color: #ffbbbb;
  border: 1px solid rgba(220, 60, 60, 0.25);
}

.danger-btn:hover:not(:disabled) { background: rgba(220, 60, 60, 0.25); }

.partner-card {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-primary);
}

.partner-label { color: var(--text-secondary); }
.partner-name { font-weight: 600; }
.partner-role { color: var(--text-secondary); font-size: 13px; }

.shell-hint {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
}

.shell-code-display {
  padding: 16px;
  text-align: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 4px;
  color: var(--accent-warm);
  margin-bottom: 12px;
  font-variant-numeric: tabular-nums;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .profile-panel {
    padding: 24px 16px 20px;
  }

  .profile-avatar {
    width: 60px;
    height: 60px;
  }

  .profile-name {
    font-size: 18px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .submit-btn,
  .upload-btn {
    min-height: 44px;
  }
}
</style>
