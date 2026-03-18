<template>
  <OverlayPanel :visible="uiStore.activePanel === 'auth'" position="center" @close="uiStore.closePanel()">
    <div class="auth-panel">
      <!-- Header Section -->
      <div class="auth-header">
        <h2 class="auth-title">MomShell</h2>
        <p class="auth-desc">{{ modeTitle }}</p>
      </div>

      <!-- Tab Switcher -->
      <div class="auth-tabs">
        <button
          v-for="t in tabs"
          :key="t.id"
          :class="['auth-tab', { active: mode === t.id }]"
          @click="mode = t.id"
        >
          {{ t.label }}
        </button>
        <div class="tab-indicator" :style="indicatorStyle"></div>
      </div>

      <div class="form-container">
        <Transition name="form-fade" mode="out-in">
          <!-- Guest -->
          <div v-if="mode === 'guest'" key="guest" class="auth-form">
            <div class="info-card">
              <p>以访客身份进入，您可以浏览公开内容并与 AI 进行基础对话。为了保存您的个人记忆，建议随后注册账号。</p>
            </div>
            <button class="submit-btn primary" @click="onGuestEnter">进入体验</button>
          </div>

          <!-- Login -->
          <form v-else-if="mode === 'login'" key="login" class="auth-form" @submit.prevent="onLogin">
            <div class="input-group">
              <div class="input-wrapper">
                <input v-model="loginForm.login" type="text" placeholder="用户名 / 邮箱" required autocomplete="username" />
              </div>
              <div class="input-wrapper">
                <input v-model="loginForm.password" type="password" placeholder="密码" required autocomplete="current-password" />
              </div>
            </div>
            <p v-if="error" class="error-msg">{{ error }}</p>
            <button type="submit" class="submit-btn primary" :disabled="loading">
              {{ loading ? '验证中...' : '登录系统' }}
            </button>
          </form>

          <!-- Register -->
          <form v-else-if="mode === 'register'" key="register" class="auth-form" @submit.prevent="onRegister">
            <div class="input-grid">
              <div class="input-wrapper">
                <input v-model="regForm.username" type="text" placeholder="用户名" required minlength="3" autocomplete="username" />
              </div>
              <div class="input-wrapper">
                <input v-model="regForm.email" type="email" placeholder="电子邮箱" required autocomplete="email" />
              </div>
              <div class="input-wrapper">
                <input v-model="regForm.nickname" type="text" placeholder="称呼 (Nickname)" required autocomplete="nickname" />
              </div>
              <div class="input-wrapper">
                <input v-model="regForm.password" type="password" placeholder="设置密码" required minlength="8" autocomplete="new-password" />
              </div>
              <div class="input-wrapper full-width">
                <input v-model="regForm.confirmPassword" type="password" placeholder="确认密码" required autocomplete="new-password" />
              </div>
            </div>
            <p v-if="error" class="error-msg">{{ error }}</p>
            <button type="submit" class="submit-btn primary" :disabled="loading">
              {{ loading ? '创建中...' : '开启旅程' }}
            </button>
          </form>
        </Transition>
      </div>

      <div class="auth-footer">
        <p v-if="mode === 'login'">还没有账号? <a @click="mode = 'register'">立即注册</a></p>
        <p v-else-if="mode === 'register'">已有账号? <a @click="mode = 'login'">前往登录</a></p>
      </div>
    </div>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/lib/apiClient'

const uiStore = useUiStore()
const authStore = useAuthStore()

type Mode = 'guest' | 'login' | 'register'
const mode = ref<Mode>(uiStore.authMode || 'login')
const loading = ref(false)
const error = ref('')

const tabs = [
  { id: 'guest', label: '访客' },
  { id: 'login', label: '登录' },
  { id: 'register', label: '注册' }
] as const

const modeTitle = computed(() => {
  if (mode.value === 'guest') return '无需账号，即刻探索'
  if (mode.value === 'login') return '欢迎回来'
  return '创建一个新的家庭空间'
})

const indicatorStyle = computed(() => {
  const index = tabs.findIndex(t => t.id === mode.value)
  return {
    transform: `translateX(${index * 100}%)`,
    width: `${100 / tabs.length}%`
  }
})

const loginForm = reactive({ login: '', password: '' })
const regForm = reactive({
  username: '',
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
})

watch(() => uiStore.authMode, (m) => {
  if (m) mode.value = m as Mode
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
  padding: 48px 40px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  min-width: 400px;
}

.auth-header {
  text-align: center;
}

.auth-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 2px;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.auth-desc {
  font-size: 14px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

/* Tab Switcher */
.auth-tabs {
  position: relative;
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 4px;
  overflow: hidden;
}

.auth-tab {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  z-index: 1;
  transition: color 0.3s;
}

.auth-tab.active {
  color: #fff;
}

.tab-indicator {
  position: absolute;
  top: 4px;
  left: 0;
  height: calc(100% - 8px);
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Forms */
.form-container {
  min-height: 240px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.input-group, .input-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.full-width {
  grid-column: span 2;
}

.input-wrapper input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: all 0.2s;
}

.input-wrapper input:focus {
  background: rgba(255, 255, 255, 0.1);
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.info-card {
  padding: 20px;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.submit-btn {
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn.primary {
  background: #6366f1;
  color: #fff;
}

.submit-btn.primary:hover {
  background: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.submit-btn:active {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  font-size: 13px;
  color: #f87171;
  margin: 0;
  text-align: center;
}

.auth-footer {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}

.auth-footer a {
  color: #a5b4fc;
  cursor: pointer;
  font-weight: 500;
}

.auth-footer a:hover {
  text-decoration: underline;
}

/* Transitions */
.form-fade-enter-active, .form-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.form-fade-enter-from {
  opacity: 0;
  transform: translateX(10px);
}
.form-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

@media (max-width: 768px) {
  .auth-panel {
    padding: 32px 20px;
    min-width: 100%;
  }
  .input-grid {
    grid-template-columns: 1fr;
  }
  .full-width {
    grid-column: span 1;
  }
}
</style>
