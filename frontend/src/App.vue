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

    <!-- Shared overlays (auth, role) -->
    <AuthPanel />
    <RoleSelectPanel />
<<<<<<< HEAD
=======
    <CarPage v-if="!isDad" />
    <CommunityPanel v-if="!isDad" />
    <BarPage v-if="!isDad" />
    <ChatPanel v-if="!isDad" />
    <AiMemoryPanel v-if="!isDad" />
    <WhisperPanel v-if="!isDad" />
    <TaskPanel v-if="!isDad" />
>>>>>>> 430ee74 (feat: replace shell gifts with future letter workflow)
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
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
const { startTutorial, stopTutorial, cancelPending } = useTutorial()

const isDad = computed(() => authStore.isAuthenticated && authStore.user?.role === 'dad')

useBackgroundMusicLoop()

onMounted(async () => {
  await authStore.init()
})

// Trigger tutorial when user enters the system (auth or guest) + no panel open
watch(
  () => ({
    entered: authStore.isAuthenticated || authStore.isGuest,
    panel: uiStore.activePanel,
  }),
  (state) => {
    if (state.entered && !state.panel && !isDad.value) {
      setTimeout(() => {
        startTutorial()
      }, 1000)
    }
  },
  { deep: true, immediate: true }
)

// If a panel opens while the tutorial is pending or active, stop/cancel it
watch(
  () => uiStore.activePanel,
  (panel) => {
    if (panel) {
      cancelPending()
      stopTutorial()
    }
  }
)
</script>
