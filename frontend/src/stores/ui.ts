import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'

export type PanelName = 'auth' | 'role' | 'community' | 'chat' | 'car' | 'bar' | 'whisper' | 'task' | 'ai-memory' | 'profile' | null
export type AuthMode = 'login' | 'register' | 'guest'

export const useUiStore = defineStore('ui', () => {
  const activePanel = ref<PanelName>(null)
  const authMode = ref<AuthMode>('login')

  // Parallax scrollTo bridge: set by BeachScene, called by tutorial
  let _parallaxScrollTo: ((offset: number) => void) | null = null

  function setParallaxScrollTo(fn: (offset: number) => void) {
    _parallaxScrollTo = fn
  }

  function parallaxScrollTo(offset: number) {
    _parallaxScrollTo?.(offset)
  }

  function openPanel(panel: PanelName) {
    activePanel.value = panel
  }

  function closePanel() {
    activePanel.value = null
  }

  function openAuth(mode: AuthMode = 'login') {
    authMode.value = mode
    activePanel.value = 'auth'
  }

  /** Open a feature panel, but intercept if guest → force auth */
  function openFeature(panel: 'car' | 'community' | 'chat' | 'bar' | 'whisper' | 'task') {
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
    openPanel,
    closePanel,
    openAuth,
    openFeature,
    setParallaxScrollTo,
    parallaxScrollTo,
  }
})
