<template>
  <OverlayPanel :visible="uiStore.activePanel === 'whisper'" position="center" @close="uiStore.closePanel()">
    <div class="whisper-panel">
      <!-- Mom view: write whispers -->
      <template v-if="isMom">
        <h2 class="panel-title">写下此刻的心声</h2>
        <p class="panel-subtitle">你的感受、心情或小小的愿望</p>

        <div class="whisper-input-area">
          <textarea
            v-model="newContent"
            class="whisper-textarea"
            placeholder="此刻你在想什么..."
            rows="4"
            maxlength="2000"
          />
          <button class="submit-btn" :disabled="submitting || !newContent.trim()" @click="onSubmit">
            {{ submitting ? '发送中...' : '写下心语' }}
          </button>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <p v-if="success" class="success-msg">{{ success }}</p>

        <div v-if="whispers.length > 0" class="whisper-list">
          <h3 class="section-title">我的心语</h3>
          <div v-for="w in whispers" :key="w.id" class="whisper-card">
            <p class="whisper-content">{{ w.content }}</p>
            <span class="whisper-time">{{ formatTime(w.created_at) }}</span>
          </div>
        </div>
      </template>

      <!-- Dad view: read whispers + AI tips -->
      <template v-else>
        <h2 class="panel-title">她的心声</h2>
        <p class="panel-subtitle">了解她此刻的感受</p>

        <div v-if="loading" class="loading-state">加载中...</div>

        <template v-else>
          <!-- AI Tips -->
          <div v-if="tips" class="tips-card">
            <div class="tips-header">
              <img src="@/assets/images/ai_avatar.png" alt="" class="tips-avatar" />
              <span class="tips-label">小石光的建议</span>
            </div>
            <p class="tips-content">{{ tips }}</p>
          </div>
          <div v-else class="tips-card">
            <button class="tips-btn" :disabled="loadingTips" @click="onLoadTips">
              {{ loadingTips ? '生成建议中...' : '获取小石光的建议' }}
            </button>
          </div>

          <!-- Whisper list -->
          <div v-if="whispers.length > 0" class="whisper-list">
            <h3 class="section-title">她的心语</h3>
            <div v-for="w in whispers" :key="w.id" class="whisper-card">
              <p class="whisper-content">{{ w.content }}</p>
              <span class="whisper-time">{{ formatTime(w.created_at) }}</span>
            </div>
          </div>
          <div v-else class="empty-state">她还没有写下心语</div>
        </template>
      </template>
    </div>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { createWhisper, getWhispers, getWhisperTips, type WhisperItem } from '@/lib/api/whisper'
import { getErrorMessage } from '@/lib/apiClient'

const uiStore = useUiStore()
const authStore = useAuthStore()

const isMom = computed(() => authStore.user?.role === 'mom')

const whispers = ref<WhisperItem[]>([])
const loading = ref(false)
const newContent = ref('')
const submitting = ref(false)
const error = ref('')
const success = ref('')
const tips = ref('')
const loadingTips = ref(false)

watch(
  () => uiStore.activePanel,
  async (panel) => {
    if (panel === 'whisper') {
      error.value = ''
      success.value = ''
      tips.value = ''
      loading.value = true
      try {
        whispers.value = await getWhispers()
      } catch {
        // silent
      } finally {
        loading.value = false
      }
    }
  },
)

async function onSubmit() {
  const content = newContent.value.trim()
  if (!content) return

  error.value = ''
  success.value = ''
  submitting.value = true
  try {
    const item = await createWhisper(content)
    whispers.value = [item, ...whispers.value]
    newContent.value = ''
    success.value = '心语已写下'
    setTimeout(() => { success.value = '' }, 3000)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    submitting.value = false
  }
}

async function onLoadTips() {
  loadingTips.value = true
  try {
    const result = await getWhisperTips()
    tips.value = result.tips
    if (result.whispers.length > 0) {
      whispers.value = result.whispers
    }
  } catch {
    tips.value = '暂时无法生成建议，请稍后再试。'
  } finally {
    loadingTips.value = false
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${h}:${m}`
}
</script>

<style scoped>
.whisper-panel {
  padding: 32px 28px 28px;
}

.panel-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 6px;
}

.panel-subtitle {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
}

.whisper-input-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.whisper-textarea {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.whisper-textarea:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.whisper-textarea::placeholder {
  color: var(--text-secondary);
}

.submit-btn {
  align-self: flex-end;
  padding: 12px 24px;
  background: var(--accent-warm);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.submit-btn:hover { background: var(--accent-warm-hover); }
.submit-btn:active { transform: scale(0.97); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.error-msg {
  padding: 10px 14px;
  background: rgba(220, 60, 60, 0.15);
  border: 1px solid rgba(220, 60, 60, 0.25);
  border-radius: 10px;
  color: #ffbbbb;
  font-size: 13px;
  margin-bottom: 16px;
}

.success-msg {
  padding: 10px 14px;
  background: rgba(60, 180, 100, 0.15);
  border: 1px solid rgba(60, 180, 100, 0.25);
  border-radius: 10px;
  color: #a8f0c0;
  font-size: 13px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.whisper-list {
  margin-top: 20px;
}

.whisper-card {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  margin-bottom: 10px;
}

.whisper-content {
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 6px;
}

.whisper-time {
  color: var(--text-secondary);
  font-size: 12px;
}

.tips-card {
  padding: 18px;
  background: rgba(255, 200, 120, 0.08);
  border: 1px solid rgba(255, 200, 120, 0.2);
  border-radius: 16px;
  margin-bottom: 20px;
}

.tips-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.tips-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.tips-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-warm);
}

.tips-content {
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.tips-btn {
  width: 100%;
  padding: 14px;
  background: var(--accent-warm);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.tips-btn:hover { background: var(--accent-warm-hover); }
.tips-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.loading-state, .empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .whisper-panel {
    padding: 24px 16px 20px;
  }

  .panel-title {
    font-size: 20px;
  }

  .whisper-textarea {
    font-size: 16px;
  }

  .submit-btn,
  .tips-btn {
    min-height: 44px;
  }
}
</style>
