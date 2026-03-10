import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'

export type PanelName = 'auth' | 'role' | 'memory' | 'community' | 'chat' | 'car' | 'bar' | 'whisper' | 'task' | null
export type AuthMode = 'login' | 'register' | 'guest'

export const useUiStore = defineStore('ui', () => {
  const activePanel = ref<PanelName>(null)
  const authMode = ref<AuthMode>('login')
  const showLanding = ref(true)

  function openPanel(panel: PanelName) {
    activePanel.value = panel
  }

  function closePanel() {
    activePanel.value = null
  }

  function closeLanding() {
    showLanding.value = false
  }

  function openAuth(mode: AuthMode = 'login') {
    authMode.value = mode
    activePanel.value = 'auth'
  }

  /** Open a feature panel, but intercept if guest → force auth */
  function openFeature(panel: 'car' | 'memory' | 'community' | 'chat' | 'bar' | 'whisper' | 'task') {
    const auth = useAuthStore()
    if (!auth.isAuthenticated && !auth.isGuest) {
      openAuth()
      return
    }
    if (auth.isGuest) {
      openAuth('register')
      return
    }
    activePanel.value = panel
  }

  return {
    activePanel,
    authMode,
    showLanding,
    openPanel,
    closePanel,
    closeLanding,
    openAuth,
    openFeature,
  }
})
