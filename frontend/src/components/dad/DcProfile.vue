<template>
  <div class="dc-tab-content">
    <div class="dc-section-header">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      <span class="dc-sh-text">./profile</span>
    </div>

    <!-- Profile header -->
    <div class="dc-panel dc-float" style="--float-i:0">
      <div class="dc-profile-header">
        <div class="dc-avatar" @click="triggerAvatarUpload">
          <img v-if="profileAvatarUrl" :src="profileAvatarUrl" alt="" @error="onAvatarImgError" />
          <span v-else class="dc-avatar-placeholder">{{ displayInitial }}</span>
          <span class="dc-avatar-hint">{{ avatarUploading ? '...' : '编辑' }}</span>
          <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none" @change="onAvatarChange" />
        </div>
        <div class="dc-profile-info">
          <div v-if="!editingNickname" class="dc-nick-row" @click="startEditNickname">
            <span class="dc-nick">{{ displayNickname }}</span>
            <span class="dc-edit-hint">编辑</span>
          </div>
          <div v-else class="dc-nick-edit">
            <input ref="nicknameInput" v-model="nicknameValue" class="dc-nick-input" maxlength="20" @keydown.enter="saveNickname" @blur="saveNickname" />
          </div>
          <div class="dc-username">@{{ profile?.username || auth.user?.username }}</div>
          <span class="dc-role-badge">{{ roleName }}</span>
        </div>
      </div>
      <div v-if="nicknameError" class="dc-inline-error">{{ nicknameError }}</div>
      <div v-if="avatarError" class="dc-inline-error">{{ avatarError }}</div>
    </div>

    <!-- Stats -->
    <div class="dc-panel dc-float" style="--float-i:1">
      <div class="dc-panel-label">我的数据</div>
      <div class="dc-stats-grid">
        <div class="dc-stat"><span class="dc-stat-val">{{ profile?.stats.question_count ?? 0 }}</span><span class="dc-stat-key">提问</span></div>
        <div class="dc-stat"><span class="dc-stat-val">{{ profile?.stats.answer_count ?? 0 }}</span><span class="dc-stat-key">回答</span></div>
        <div class="dc-stat"><span class="dc-stat-val">{{ profile?.stats.like_received_count ?? 0 }}</span><span class="dc-stat-key">获赞</span></div>
        <div class="dc-stat"><span class="dc-stat-val">{{ profile?.stats.collection_count ?? 0 }}</span><span class="dc-stat-key">收藏</span></div>
      </div>
    </div>

    <!-- Profile form -->
    <div class="dc-panel dc-float" style="--float-i:2">
      <div class="dc-panel-label">基本资料</div>
      <div class="dc-form">
        <label class="dc-form-label">用户名</label>
        <input v-model="profileForm.username" type="text" class="dc-form-input" placeholder="用户名" maxlength="50" minlength="3" />
        <label class="dc-form-label">昵称</label>
        <input v-model="profileForm.nickname" type="text" class="dc-form-input" placeholder="昵称" maxlength="50" />
        <label class="dc-form-label">邮箱</label>
        <input v-model="profileForm.email" type="email" class="dc-form-input" placeholder="请输入邮箱地址" />
        <div v-if="profileFormError" class="dc-inline-error">{{ profileFormError }}</div>
        <div v-if="profileFormSuccess" class="dc-inline-success">{{ profileFormSuccess }}</div>
        <button class="dc-execute-btn" :disabled="profileFormLoading" @click="onSaveProfile">
          {{ profileFormLoading ? '保存中...' : '保存资料' }}
        </button>
      </div>
    </div>

    <div v-if="isDad" class="dc-panel dc-float" style="--float-i:3">
      <div class="dc-panel-label">AI聊天样式</div>
      <div class="dc-style-grid">
        <button
          v-for="option in dadChatStyleOptions"
          :key="option.value"
          type="button"
          class="dc-style-option"
          :class="{ 'is-active': dadChatStyle === option.value }"
          @click="dadChatStyle = option.value"
        >
          <span class="dc-style-title">{{ option.label }}</span>
        </button>
      </div>
      <div v-if="chatStyleError" class="dc-inline-error">{{ chatStyleError }}</div>
      <div v-if="chatStyleSuccess" class="dc-inline-success">{{ chatStyleSuccess }}</div>
      <button class="dc-execute-btn" style="width:100%" :disabled="chatStyleLoading || dadChatStyle === currentDadChatStyle" @click="onSaveDadChatStyle">
        {{ chatStyleLoading ? '保存中...' : '保存样式' }}
      </button>
    </div>

    <!-- Shell code / Partner binding -->
    <div class="dc-panel dc-float" :style="{ '--float-i': isDad ? 4 : 3 }">
      <div class="dc-panel-label">贝壳码</div>
      <template v-if="isBound">
        <div class="dc-partner-info">
          <span class="dc-partner-label">已绑定：</span>
          <span class="dc-partner-name">{{ profile?.partner?.nickname }}</span>
          <span class="dc-partner-role">({{ profile?.partner?.role === 'mom' ? '溯源者' : '守护者' }})</span>
        </div>
        <button class="dc-danger-btn" :disabled="unbindLoading" @click="onUnbindPartner">
          {{ unbindLoading ? '解除绑定中...' : '解除绑定' }}
        </button>
      </template>
      <template v-else-if="isMom">
        <p class="dc-hint">生成贝壳码分享给守护者，完成伴侣绑定</p>
        <div v-if="profile?.shell_code" class="dc-shell-code">{{ profile.shell_code }}</div>
        <button class="dc-execute-btn" :disabled="shellCodeLoading || !!profile?.shell_code" @click="onGenerateShellCode">
          {{ shellCodeLoading ? '生成中...' : profile?.shell_code ? '已生成' : '生成贝壳码' }}
        </button>
        <div v-if="shellCodeError" class="dc-inline-error">{{ shellCodeError }}</div>
      </template>
      <template v-else>
        <p class="dc-hint">输入溯源者分享的贝壳码，完成伴侣绑定</p>
        <input v-model="bindCode" class="dc-form-input" placeholder="请输入贝壳码" maxlength="8" />
        <div v-if="bindError" class="dc-inline-error">{{ bindError }}</div>
        <div v-if="bindSuccess" class="dc-inline-success">{{ bindSuccess }}</div>
        <button class="dc-execute-btn" :disabled="bindLoading || !bindCode.trim()" @click="onBindPartner">
          {{ bindLoading ? '绑定中...' : '完成绑定' }}
        </button>
      </template>
    </div>

    <!-- Password -->
    <div class="dc-panel dc-float" :style="{ '--float-i': isDad ? 5 : 4 }">
      <div class="dc-panel-label">账号安全</div>
      <form class="dc-form" @submit.prevent="onChangePassword">
        <input v-model="pwForm.old_password" type="password" class="dc-form-input" placeholder="当前密码" required autocomplete="current-password" />
        <input v-model="pwForm.new_password" type="password" class="dc-form-input" placeholder="新密码" required minlength="6" autocomplete="new-password" />
        <input v-model="pwForm.confirm_password" type="password" class="dc-form-input" placeholder="确认新密码" required minlength="6" autocomplete="new-password" />
        <div v-if="pwError" class="dc-inline-error">{{ pwError }}</div>
        <div v-if="pwSuccess" class="dc-inline-success">{{ pwSuccess }}</div>
        <button type="submit" class="dc-execute-btn" :disabled="pwLoading">
          {{ pwLoading ? '更新中...' : '更新密码' }}
        </button>
      </form>
    </div>

    <!-- Logout -->
    <div class="dc-float" :style="{ '--float-i': isDad ? 6 : 5 }">
      <button class="dc-logout-btn" @click="$emit('logout')">
        退出登录
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
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
import aiAvatar from '@/assets/images/ai_avatar.png'
import {
  DAD_CHAT_STYLE_OPTIONS,
  normalizeDadChatStyle,
  type DadChatStyle,
} from '@/constants/dadChat'

const auth = useAuthStore()

const props = withDefaults(defineProps<{ visible?: boolean }>(), { visible: true })
defineEmits<{ logout: [] }>()

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
const dadChatStyle = ref<DadChatStyle>('terminal')
const chatStyleLoading = ref(false)
const chatStyleError = ref('')
const chatStyleSuccess = ref('')

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
const dadChatStyleOptions = DAD_CHAT_STYLE_OPTIONS

const roleMap: Record<string, string> = { mom: '溯源者', dad: '守护者', professional: '专业认证' }
const displayNickname = computed(() => profile.value?.nickname || auth.user?.nickname || '用户')
const displayInitial = computed(() => displayNickname.value.charAt(0))
const isDad = computed(() => (profile.value?.role || auth.user?.role) === 'dad')
const defaultAvatar = computed(() => isDad.value ? aiAvatar : avatarDefault)
const profileAvatarUrl = computed(() => profile.value?.avatar_url || auth.user?.avatar_url || defaultAvatar.value)
const roleName = computed(() => roleMap[profile.value?.role || auth.user?.role || 'mom'] || '溯源者')
const currentDadChatStyle = computed<DadChatStyle>(() =>
  normalizeDadChatStyle(profile.value?.dad_chat_style || auth.user?.dad_chat_style),
)

function onAvatarImgError(e: Event) {
  const img = e.target as HTMLImageElement
  if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = defaultAvatar.value }
}

function syncProfileForm() {
  profileForm.username = profile.value?.username || auth.user?.username || ''
  profileForm.nickname = profile.value?.nickname || auth.user?.nickname || ''
  profileForm.email = profile.value?.email || auth.user?.email || ''
  dadChatStyle.value = currentDadChatStyle.value
  chatStyleError.value = ''
  chatStyleSuccess.value = ''
}

async function fetchProfile() {
  try { profile.value = await getUserProfile(); syncProfileForm() }
  catch { syncProfileForm() }
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
  if (!trimmed || trimmed === displayNickname.value) { editingNickname.value = false; return }
  try {
    const updated = await updateUserProfile({ nickname: trimmed })
    profile.value = updated
    if (auth.user) auth.user.nickname = updated.nickname
    profileForm.nickname = updated.nickname
    nicknameError.value = ''
  } catch (e) { nicknameError.value = getErrorMessage(e) }
  editingNickname.value = false
}

function triggerAvatarUpload() { avatarInput.value?.click() }

async function onAvatarChange(e: Event) {
  const inp = e.target as HTMLInputElement
  const file = inp.files?.[0]
  if (!file) return
  inp.value = ''
  if (file.size > 2 * 1024 * 1024) { avatarError.value = '图片大小不能超过 2MB'; return }
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) { avatarError.value = '仅支持 JPG、PNG、GIF、WebP 格式'; return }
  avatarError.value = ''
  avatarUploading.value = true
  try {
    const updated = await uploadAvatar(file)
    profile.value = updated
    if (auth.user) auth.user.avatar_url = updated.avatar_url
  } catch (e) { avatarError.value = getErrorMessage(e) }
  finally { avatarUploading.value = false }
}

async function onSaveProfile() {
  profileFormError.value = ''; profileFormSuccess.value = ''
  const data: Record<string, string> = {}
  const p = profile.value
  const tu = profileForm.username.trim(), tn = profileForm.nickname.trim(), te = profileForm.email.trim()
  if (tu && tu !== (p?.username || auth.user?.username)) { if (tu.length < 3) { profileFormError.value = '用户名至少3个字符'; return }; data.username = tu }
  if (tn && tn !== (p?.nickname || auth.user?.nickname)) data.nickname = tn
  if (te && te !== (p?.email || auth.user?.email)) data.email = te
  if (Object.keys(data).length === 0) { profileFormSuccess.value = '没有需要更新的内容'; return }
  profileFormLoading.value = true
  try {
    const updated = await updateUserProfile(data)
    profile.value = updated
    if (auth.user) { auth.user.username = updated.username; auth.user.nickname = updated.nickname; auth.user.email = updated.email; auth.user.avatar_url = updated.avatar_url }
    syncProfileForm()
    profileFormSuccess.value = '资料已更新'
  } catch (e) { profileFormError.value = getErrorMessage(e) }
  finally { profileFormLoading.value = false }
}

async function onSaveDadChatStyle() {
  chatStyleError.value = ''
  chatStyleSuccess.value = ''
  if (!isDad.value) return
  if (dadChatStyle.value === currentDadChatStyle.value) {
    chatStyleSuccess.value = '当前已是该样式'
    return
  }

  chatStyleLoading.value = true
  try {
    const updated = await updateUserProfile({ dad_chat_style: dadChatStyle.value })
    profile.value = updated
    if (auth.user) auth.user.dad_chat_style = updated.dad_chat_style
    dadChatStyle.value = normalizeDadChatStyle(updated.dad_chat_style)
    chatStyleSuccess.value = 'AI聊天样式已更新'
  } catch (e) {
    chatStyleError.value = getErrorMessage(e)
  } finally {
    chatStyleLoading.value = false
  }
}

async function onGenerateShellCode() {
  shellCodeError.value = ''; shellCodeLoading.value = true
  try { profile.value = await generateShellCode() }
  catch (e) { shellCodeError.value = getErrorMessage(e) }
  finally { shellCodeLoading.value = false }
}

async function onBindPartner() {
  if (!bindCode.value.trim()) return
  bindError.value = ''; bindSuccess.value = ''; bindLoading.value = true
  try { profile.value = await bindPartner(bindCode.value.trim()); bindSuccess.value = '绑定成功'; bindCode.value = '' }
  catch (e) { bindError.value = getErrorMessage(e) }
  finally { bindLoading.value = false }
}

async function onUnbindPartner() {
  unbindLoading.value = true
  try { profile.value = await unbindPartner() }
  catch (e) { bindError.value = getErrorMessage(e) }
  finally { unbindLoading.value = false }
}

async function onChangePassword() {
  pwError.value = ''; pwSuccess.value = ''
  if (pwForm.value.new_password !== pwForm.value.confirm_password) { pwError.value = '两次输入的新密码不一致'; return }
  if (pwForm.value.new_password.length < 6) { pwError.value = '新密码长度不能少于6位'; return }
  pwLoading.value = true
  try {
    const res = await changePassword({ old_password: pwForm.value.old_password, new_password: pwForm.value.new_password })
    pwSuccess.value = res.message || '密码修改成功'
    pwForm.value = { old_password: '', new_password: '', confirm_password: '' }
  } catch (e) { pwError.value = getErrorMessage(e) }
  finally { pwLoading.value = false }
}

watch(() => props.visible, (active) => {
  if (active) {
    pwForm.value = { old_password: '', new_password: '', confirm_password: '' }
    pwError.value = ''; pwSuccess.value = ''
    fetchProfile()
  }
}, { immediate: true })
</script>

<style scoped>
.dc-tab-content { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.dc-float { animation: floatUp 0.4s ease-out both; animation-delay: calc(var(--float-i, 0) * 0.06s); }
@keyframes floatUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

.dc-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-top: 8px; color: var(--dc-accent, #7DCFFF); }
.dc-sh-icon { color: var(--dc-accent, #7DCFFF); }
.dc-sh-text { font-family: var(--dc-font-mono); font-size: 13px; font-weight: bold; }

.dc-panel {
  background: var(--dc-surface, rgba(255,255,255,0.05));
  border: 1px solid var(--dc-border, rgba(255,255,255,0.15));
  border-radius: var(--dc-radius, 2px);
  padding: 20px;
  margin-bottom: 16px;
}
.dc-panel-label { font-family: var(--dc-font-mono); font-size: 12px; color: var(--dc-accent, #7DCFFF); margin-bottom: 16px; }

/* Profile header */
.dc-profile-header { display: flex; align-items: center; gap: 16px; }

.dc-avatar {
  position: relative; width: 64px; height: 64px; flex-shrink: 0; cursor: pointer;
}
.dc-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--dc-border, rgba(255,255,255,0.15)); }
.dc-avatar-placeholder {
  display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;
  border-radius: 50%; background: var(--dc-surface, rgba(255,255,255,0.05)); border: 2px solid var(--dc-border, rgba(255,255,255,0.15));
  color: var(--dc-text, #C0CAF5); font-family: var(--dc-font-mono); font-size: 24px; font-weight: 600;
}
.dc-avatar-hint {
  position: absolute; bottom: 0; right: 0;
  padding: 2px 4px; background: var(--dc-bg, #1A1B26); border: 1px solid var(--dc-border, rgba(255,255,255,0.15));
  border-radius: var(--dc-radius, 2px); font-family: var(--dc-font-mono); font-size: 9px; color: var(--dc-comment, #565F89);
}

.dc-profile-info { flex: 1; min-width: 0; }

.dc-nick-row { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.dc-nick { font-family: var(--dc-font-mono); font-size: 18px; font-weight: 700; color: var(--dc-text, #C0CAF5); }
.dc-edit-hint { font-family: var(--dc-font-mono); font-size: 11px; color: var(--dc-comment, #565F89); }

.dc-nick-input {
  width: 100%; padding: 4px 8px; background: var(--dc-bg, #1A1B26); border: 1px solid var(--dc-border, rgba(255,255,255,0.15));
  border-radius: var(--dc-radius, 2px); color: var(--dc-text, #C0CAF5); font-family: var(--dc-font-mono); font-size: 16px; font-weight: 600; outline: none;
}
.dc-nick-input:focus { border-color: rgba(125,207,255,0.3); }

.dc-username { margin: 4px 0 6px; font-family: var(--dc-font-mono); font-size: 12px; color: var(--dc-comment, #565F89); }
.dc-role-badge {
  display: inline-block; padding: 2px 6px; border-radius: var(--dc-radius, 2px);
  font-family: var(--dc-font-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.5px;
  background: rgba(125,207,255,0.1); color: var(--dc-accent, #7DCFFF); border: 1px solid rgba(125,207,255,0.2);
}

/* Stats */
.dc-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.dc-stat {
  text-align: center; padding: 10px 4px;
  background: var(--dc-bg, #1A1B26); border: 1px solid var(--dc-border, rgba(255,255,255,0.06));
  border-radius: var(--dc-radius, 2px);
}
.dc-stat-val { display: block; font-family: var(--dc-font-mono); font-size: 18px; font-weight: 800; color: var(--dc-text, #C0CAF5); }
.dc-stat-key { display: block; font-family: var(--dc-font-mono); font-size: 10px; color: var(--dc-comment, #565F89); margin-top: 2px; }

/* Form */
.dc-form { display: flex; flex-direction: column; gap: 10px; }
.dc-form-label { font-family: var(--dc-font-mono); font-size: 11px; color: var(--dc-comment, #565F89); letter-spacing: 0.5px; }
.dc-form-input {
  width: 100%; padding: 10px 12px; background: var(--dc-bg, #1A1B26); border: 1px solid var(--dc-border, rgba(255,255,255,0.15));
  border-radius: var(--dc-radius, 2px); color: var(--dc-text, #C0CAF5); font-family: var(--dc-font-mono); font-size: 13px; outline: none; transition: border-color 0.2s;
}
.dc-form-input:focus { border-color: rgba(125,207,255,0.3); }
.dc-form-input::placeholder { color: var(--dc-comment, #565F89); }

.dc-execute-btn {
  display: flex; align-items: center; justify-content: center; padding: 12px 20px;
  background: transparent; border: 1px solid rgba(125,207,255,0.3); border-radius: var(--dc-radius, 2px);
  color: var(--dc-accent, #7DCFFF); font-family: var(--dc-font-mono); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; letter-spacing: 1px; margin-top: 4px;
}
.dc-execute-btn:hover:not(:disabled) { border-color: var(--dc-accent, #7DCFFF); background: rgba(125,207,255,0.08); box-shadow: 0 0 20px rgba(125,207,255,0.15); }
.dc-execute-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.dc-style-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.dc-style-option {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid var(--dc-border, rgba(255,255,255,0.12));
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-text, #C0CAF5);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.dc-style-option:hover {
  border-color: rgba(125,207,255,0.3);
}

.dc-style-option.is-active {
  border-color: rgba(125,207,255,0.45);
  background: rgba(125,207,255,0.08);
  box-shadow: 0 0 20px rgba(125,207,255,0.1);
}

.dc-style-title {
  font-family: var(--dc-font-mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
}

.dc-style-desc {
  font-family: var(--dc-font-mono);
  font-size: 11px;
  line-height: 1.6;
  color: var(--dc-comment, #565F89);
}

.dc-style-command {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  color: var(--dc-accent, #7DCFFF);
}

.dc-inline-error { padding: 6px 10px; background: rgba(247,118,142,0.08); border-left: 2px solid var(--dc-danger, #F7768E); color: var(--dc-danger, #F7768E); font-family: var(--dc-font-mono); font-size: 11px; border-radius: var(--dc-radius, 2px); margin-top: 6px; }
.dc-inline-success { padding: 6px 10px; background: rgba(158,206,106,0.08); border-left: 2px solid var(--dc-success, #9ECE6A); color: var(--dc-success, #9ECE6A); font-family: var(--dc-font-mono); font-size: 11px; border-radius: var(--dc-radius, 2px); margin-top: 6px; }

/* Shell code */
.dc-hint { font-family: var(--dc-font-mono); font-size: 12px; color: var(--dc-comment, #565F89); line-height: 1.5; margin: 0 0 12px; }

.dc-shell-code {
  padding: 14px; text-align: center; background: var(--dc-bg, #1A1B26); border: 1px dashed rgba(125,207,255,0.3);
  border-radius: var(--dc-radius, 2px); font-family: var(--dc-font-mono); font-size: 22px; font-weight: 800; letter-spacing: 4px;
  color: var(--dc-accent, #7DCFFF); margin-bottom: 12px; font-variant-numeric: tabular-nums;
}

/* Partner */
.dc-partner-info {
  padding: 10px 12px; background: var(--dc-bg, #1A1B26); border: 1px solid var(--dc-border, rgba(255,255,255,0.06));
  border-radius: var(--dc-radius, 2px); font-family: var(--dc-font-mono); font-size: 13px; color: var(--dc-text, #C0CAF5); margin-bottom: 12px;
}
.dc-partner-label { color: var(--dc-comment, #565F89); }
.dc-partner-name { font-weight: 600; }
.dc-partner-role { color: var(--dc-comment, #565F89); font-size: 12px; }

.dc-danger-btn {
  display: flex; align-items: center; justify-content: center; width: 100%; padding: 12px 20px;
  background: rgba(247,118,142,0.08); border: 1px solid rgba(247,118,142,0.25); border-radius: var(--dc-radius, 2px);
  color: var(--dc-danger, #F7768E); font-family: var(--dc-font-mono); font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.dc-danger-btn:hover:not(:disabled) { background: rgba(247,118,142,0.15); border-color: rgba(247,118,142,0.4); }
.dc-danger-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Logout */
.dc-logout-btn {
  display: flex; align-items: center; justify-content: center; width: 100%; padding: 14px 20px; margin-top: 8px;
  background: rgba(247,118,142,0.05); border: 1px solid rgba(247,118,142,0.2); border-radius: var(--dc-radius, 2px);
  color: var(--dc-danger, #F7768E); font-family: var(--dc-font-mono); font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; letter-spacing: 1px;
}
.dc-logout-btn:hover { background: rgba(247,118,142,0.12); border-color: rgba(247,118,142,0.35); box-shadow: 0 0 16px rgba(247,118,142,0.1); }

@media (max-width: 768px) {
  .dc-avatar { width: 52px; height: 52px; }
  .dc-nick { font-size: 16px; }
  .dc-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .dc-style-grid { grid-template-columns: 1fr; }
}
</style>
