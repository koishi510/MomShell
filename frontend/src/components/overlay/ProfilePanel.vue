<template>
  <OverlayPanel :visible="uiStore.activePanel === 'profile'" position="right" @close="uiStore.closePanel()">
    <div class="profile-panel">
      <div class="profile-header">
        <div class="profile-avatar">
          <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="avatar" />
          <span v-else class="avatar-placeholder">{{ auth.user?.nickname?.charAt(0) || '?' }}</span>
        </div>
        <div class="profile-info">
          <h2 class="profile-name">{{ auth.user?.nickname }}</h2>
          <p class="profile-username">@{{ auth.user?.username }}</p>
        </div>
      </div>

      <!-- Settings -->
      <div class="profile-section">
        <h3 class="section-title">设置</h3>
        <div class="settings-list">
          <button class="setting-item" @click="settingsView = 'nickname'">
            <span>修改昵称</span>
            <span class="setting-arrow">›</span>
          </button>
          <button class="setting-item danger" @click="onLogout">
            <span>退出登录</span>
            <span class="setting-arrow">›</span>
          </button>
        </div>
      </div>

      <!-- Photo Wall / Memoirs -->
      <div class="profile-section">
        <h3 class="section-title">照片墙</h3>
        <div v-if="loadingMemoirs" class="loading-state">加载中...</div>
        <div v-else-if="memoirs.length === 0" class="empty-state">还没有回忆记录</div>
        <div v-else class="memoir-grid">
          <div v-for="m in memoirs" :key="m.id" class="memoir-card">
            <img v-if="m.cover_image_url" :src="m.cover_image_url" :alt="m.title" class="memoir-img" />
            <div v-else class="memoir-placeholder">
              <span>{{ m.title.charAt(0) }}</span>
            </div>
            <p class="memoir-title">{{ m.title }}</p>
          </div>
        </div>
      </div>
    </div>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { getMemoirs, type Memoir } from '@/lib/api/echo'

const uiStore = useUiStore()
const auth = useAuthStore()

const settingsView = ref<string | null>(null)
const memoirs = ref<Memoir[]>([])
const loadingMemoirs = ref(false)

watch(
  () => uiStore.activePanel,
  async (panel) => {
    if (panel === 'profile' && auth.isAuthenticated) {
      loadingMemoirs.value = true
      try {
        const res = await getMemoirs(20, 0)
        memoirs.value = res.memoirs
      } catch {
        // silent
      } finally {
        loadingMemoirs.value = false
      }
    }
  },
)

function onLogout() {
  auth.logout()
  uiStore.closePanel()
}
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
  padding-bottom: 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 24px;
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
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
  font-size: 26px;
  font-weight: 600;
  color: var(--accent-warm);
}

.profile-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.profile-username {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.profile-section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  overflow: hidden;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s;
}

.setting-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.setting-item.danger {
  color: #ff8888;
}

.setting-arrow {
  font-size: 18px;
  color: var(--text-secondary);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.memoir-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.memoir-card {
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.memoir-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.memoir-placeholder {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 210, 140, 0.1);
  font-size: 28px;
  color: var(--accent-warm);
}

.memoir-title {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
