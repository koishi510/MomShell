<template>
  <OverlayPanel :visible="uiStore.activePanel === 'auth'" position="center" @close="uiStore.closePanel()">
    <div class="auth-panel">
      <!-- Tabs -->
      <div class="auth-tabs">
        <button
          :class="['auth-tab', { active: mode === 'guest' }]"
          @click="mode = 'guest'"
        >
          游客模式
        </button>
        <button
          :class="['auth-tab', { active: mode === 'login' }]"
          @click="mode = 'login'"
        >
          登录
        </button>
        <button
          :class="['auth-tab', { active: mode === 'register' }]"
          @click="mode = 'register'"
        >
          注册
        </button>
      </div>

      <!-- Guest -->
      <div v-if="mode === 'guest'" class="auth-form">
        <p class="guest-hint">为了能与伴侣共建 Echo Domain，建议完成后进行绑定。</p>
        <button class="auth-submit" @click="onGuestEnter">以游客身份浏览</button>
      </div>

      <!-- Login -->
      <form v-if="mode === 'login'" class="auth-form" @submit.prevent="onLogin">
        <label class="auth-label">
          <span>用户名 / 邮箱</span>
          <input v-model="loginForm.login" type="text" class="auth-input" required autocomplete="username" />
        </label>
        <label class="auth-label">
          <span>密码</span>
          <input v-model="loginForm.password" type="password" class="auth-input" required autocomplete="current-password" />
        </label>
        <p v-if="error" class="auth-error">{{ error }}</p>
        <button type="submit" class="auth-submit" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <!-- Register -->
      <form v-if="mode === 'register'" class="auth-form" @submit.prevent="onRegister">
        <label class="auth-label">
          <span>用户名</span>
          <input v-model="regForm.username" type="text" class="auth-input" required minlength="3" maxlength="50" autocomplete="username" />
        </label>
        <label class="auth-label">
          <span>邮箱</span>
          <input v-model="regForm.email" type="email" class="auth-input" required autocomplete="email" />
        </label>
        <label class="auth-label">
          <span>昵称</span>
          <input v-model="regForm.nickname" type="text" class="auth-input" required maxlength="50" autocomplete="nickname" />
        </label>
        <label class="auth-label">
          <span>密码</span>
          <input v-model="regForm.password" type="password" class="auth-input" required minlength="8" autocomplete="new-password" />
        </label>
        <label class="auth-label">
          <span>确认密码</span>
          <input v-model="regForm.confirmPassword" type="password" class="auth-input" required autocomplete="new-password" />
        </label>
        <p v-if="error" class="auth-error">{{ error }}</p>
        <button type="submit" class="auth-submit" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>

      <!-- Register success -->
      <div v-if="registered" class="auth-success">
        <p>注册成功！请登录。</p>
        <button class="auth-submit" @click="mode = 'login'; registered = false">去登录</button>
      </div>
    </div>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/lib/apiClient'

const uiStore = useUiStore()
const authStore = useAuthStore()

const mode = ref<'guest' | 'login' | 'register'>(uiStore.authMode === 'register' ? 'register' : 'login')
const loading = ref(false)
const error = ref('')
const registered = ref(false)

const loginForm = reactive({ login: '', password: '' })
const regForm = reactive({
  username: '',
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
})

watch(() => uiStore.authMode, (m) => {
  if (m === 'register') mode.value = 'register'
  else if (m === 'guest') mode.value = 'guest'
  else mode.value = 'login'
})

function onGuestEnter() {
  authStore.enterGuestMode()
  uiStore.closePanel()
}

async function onLogin() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login({ login: loginForm.login, password: loginForm.password })
    uiStore.closePanel()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function onRegister() {
  error.value = ''
  if (regForm.password !== regForm.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }
  loading.value = true
  try {
    await authStore.register({
      username: regForm.username,
      email: regForm.email,
      nickname: regForm.nickname,
      password: regForm.password,
    })
    // Registration auto-logs in → go to role selection
    uiStore.openPanel('role')
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-panel {
  padding: 32px 28px 28px;
}

.auth-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 28px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 4px;
}

.auth-tab {
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

.auth-tab.active {
  background: rgba(255, 255, 255, 0.14);
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.auth-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-label span {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.auth-input {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  color: var(--text-primary);
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}

.auth-input:focus {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.12);
}

.auth-input::placeholder {
  color: var(--text-secondary);
}

.auth-submit {
  margin-top: 4px;
  padding: 13px 0;
  background: var(--accent-warm);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.auth-submit:hover { background: var(--accent-warm-hover); }
.auth-submit:active { transform: scale(0.98); }
.auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.auth-error {
  padding: 10px 14px;
  background: rgba(220, 60, 60, 0.15);
  border: 1px solid rgba(220, 60, 60, 0.25);
  border-radius: 10px;
  color: #ff9999;
  font-size: 13px;
}

.auth-success {
  text-align: center;
  padding: 20px 0;
  color: var(--text-primary);
}

.auth-success p {
  margin-bottom: 16px;
  font-size: 16px;
}

.guest-hint {
  padding: 16px;
  background: rgba(255, 210, 140, 0.1);
  border: 1px solid rgba(255, 210, 140, 0.2);
  border-radius: 14px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}
</style>
