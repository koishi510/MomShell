<template>
  <BeachScene />
  <LandingOverlay />
  <AuthPanel />
  <RoleSelectPanel />
  <CarPage />
  <MemoryPanel />
  <CommunityPanel />
  <ChatPanel />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useBackgroundMusicLoop } from '@/composables/useBackgroundMusicLoop'
import BeachScene from '@/components/scene/BeachScene.vue'
import LandingOverlay from '@/components/overlay/LandingOverlay.vue'
import AuthPanel from '@/components/overlay/AuthPanel.vue'
import RoleSelectPanel from '@/components/overlay/RoleSelectPanel.vue'
import CarPage from '@/components/overlay/CarPage.vue'
import MemoryPanel from '@/components/overlay/MemoryPanel.vue'
import CommunityPanel from '@/components/overlay/CommunityPanel.vue'
import ChatPanel from '@/components/overlay/ChatPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const authStore = useAuthStore()
const uiStore = useUiStore()

useBackgroundMusicLoop()

onMounted(async () => {
  await authStore.init()
  if (authStore.isAuthenticated) {
    uiStore.closeLanding()
  }
})
</script>
