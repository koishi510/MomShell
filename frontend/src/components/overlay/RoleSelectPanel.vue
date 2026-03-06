<template>
  <OverlayPanel
    :visible="uiStore.activePanel === 'role'"
    position="fullscreen"
    :show-close="false"
    :dismissible="false"
    @close="() => {}"
  >
    <div class="role-select">
      <!-- Mom -->
      <button class="role-half role-mom" @click="selectRole('mom')">
        <div class="role-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <ellipse cx="32" cy="38" rx="22" ry="16" fill="rgba(200,160,100,0.15)" />
            <ellipse cx="32" cy="36" rx="18" ry="13" fill="rgba(200,160,100,0.25)" />
            <circle cx="32" cy="30" r="6" fill="rgba(255,220,160,0.6)" />
          </svg>
        </div>
        <h2 class="role-title">溯源者</h2>
        <p class="role-subtitle">洗去尘嚣，让自我重新发光。</p>
      </button>
      <!-- Dad -->
      <button class="role-half role-dad" @click="selectRole('dad')">
        <div class="role-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path d="M16 40C16 40 22 20 32 18C42 20 48 40 48 40" stroke="rgba(255,255,255,0.2)" stroke-width="2" fill="none" />
            <path d="M20 38C20 38 25 24 32 22C39 24 44 38 44 38" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" fill="none" />
          </svg>
        </div>
        <h2 class="role-title">守护者</h2>
        <p class="role-subtitle">守望她的流光溢彩。</p>
      </button>
    </div>

    <ConfirmDialog
      :visible="showConfirm"
      :message="`确定选择「${pendingRole === 'mom' ? '溯源者' : '守护者'}」吗？之后可以在个人设置中更改。`"
      @confirm="onConfirm"
      @cancel="showConfirm = false"
    />
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

const uiStore = useUiStore()
const authStore = useAuthStore()

const showConfirm = ref(false)
const pendingRole = ref<'mom' | 'dad'>('mom')
const saving = ref(false)

function selectRole(role: 'mom' | 'dad') {
  pendingRole.value = role
  showConfirm.value = true
}

async function onConfirm() {
  showConfirm.value = false
  saving.value = true
  try {
    await authStore.setRole(pendingRole.value)
  } catch {
    // Role set failed, but user is already logged in — allow continuing
  } finally {
    saving.value = false
  }
  uiStore.closePanel()
}
</script>

<style scoped>
.role-select {
  display: flex;
  width: 100%;
  height: 100vh;
}

.role-half {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  border: none;
  cursor: pointer;
  transition: filter 0.3s, flex 0.4s cubic-bezier(0.16,1,0.3,1);
  padding: 40px 20px;
}

.role-half:hover {
  flex: 1.15;
}

.role-mom {
  background: var(--accent-cream);
}

.role-dad {
  background: var(--accent-blue);
}

.role-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin-bottom: 8px;
}

.role-mom .role-icon {
  background: rgba(200, 160, 100, 0.12);
}

.role-dad .role-icon {
  background: rgba(255, 255, 255, 0.06);
}

.role-title {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 4px;
}

.role-mom .role-title {
  color: #5a4a3a;
}

.role-dad .role-title {
  color: rgba(255, 255, 255, 0.9);
}

.role-subtitle {
  font-size: 14px;
  letter-spacing: 1px;
  max-width: 200px;
  text-align: center;
  line-height: 1.6;
}

.role-mom .role-subtitle {
  color: rgba(90, 74, 58, 0.6);
}

.role-dad .role-subtitle {
  color: rgba(255, 255, 255, 0.5);
}

@media (max-width: 640px) {
  .role-select {
    flex-direction: column;
  }
  .role-half {
    height: 50vh;
  }
}
</style>
