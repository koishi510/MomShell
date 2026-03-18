<template>
  <div :class="{ 'dad-mode': isDad }">
    <!-- Anime Landing Page for unauthenticated & non-guest users -->
    <AnimeLanding v-if="!authStore.isAuthenticated && !authStore.isGuest" />

    <!-- Dad: full-screen console replaces beach scene -->
    <DadConsole v-else-if="isDad" />

    <!-- Mom / Guest: beach scene -->
    <template v-else-if="authStore.isAuthenticated || authStore.isGuest">
      <BeachScene />
      <NavBar />
      <CarPage />
      <CommunityPanel />
      <BarPage />
      <ChatPanel />
      <AiMemoryPanel />
      <WhisperPanel />
      <TaskPanel />
    </template>

    <!-- Shared overlays (auth, role) -->
    <AuthPanel />
    <RoleSelectPanel />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBackgroundMusicLoop } from '@/composables/useBackgroundMusicLoop'
import AnimeLanding from '@/components/overlay/AnimeLanding.vue'
import DadConsole from '@/components/dad/DadConsole.vue'
import BeachScene from '@/components/scene/BeachScene.vue'
import NavBar from '@/components/scene/NavBar.vue'
import AuthPanel from '@/components/overlay/AuthPanel.vue'
import RoleSelectPanel from '@/components/overlay/RoleSelectPanel.vue'
import CarPage from '@/components/overlay/CarPage.vue'
import CommunityPanel from '@/components/overlay/CommunityPanel.vue'
import BarPage from '@/components/overlay/BarPage.vue'
import ChatPanel from '@/components/overlay/ChatPanel.vue'
import AiMemoryPanel from '@/components/overlay/AiMemoryPanel.vue'
import WhisperPanel from '@/components/overlay/WhisperPanel.vue'
import TaskPanel from '@/components/overlay/TaskPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useTutorial } from '@/composables/useTutorial'

const authStore = useAuthStore()
const uiStore = useUiStore()
const { startTutorial } = useTutorial()
useBackgroundMusicLoop()

const isDad = computed(() => authStore.user?.role === 'dad')

onMounted(async () => {
  // Always initialize auth state
  await authStore.init()

  // Clear URL params that might be confusing
  if (window.location.search.includes('token=') || window.location.search.includes('error=')) {
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  // Handle tutorial logic only for new standard users (not dad, not guest)
  if (authStore.isAuthenticated && !authStore.isGuest && !isDad.value) {
    const hasSeenTutorial = localStorage.getItem('momshell_tutorial_seen')
    if (!hasSeenTutorial) {
      setTimeout(() => {
        uiStore.closePanel()
        startTutorial()
        localStorage.setItem('momshell_tutorial_seen', 'true')
      }, 500)
    }
  }
})
</script>

<style>
/* Full screen layout */
html, body, #app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: #f7f1e3;
}

#app {
  position: relative;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
  color: #333;
}

.dad-mode {
  background-color: #1A1B26; /* Terminal background */
  color: #C0CAF5;
}
</style>
