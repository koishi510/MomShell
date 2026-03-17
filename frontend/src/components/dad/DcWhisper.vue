<template>
  <div class="dc-tab-content">
    <div class="dc-section-header">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      <span class="dc-sh-text">./whisper.sh</span>
    </div>

    <!-- Mom view: write whispers -->
    <template v-if="isMom">
      <div class="dc-panel dc-float" style="--float-i:0">
        <div class="dc-panel-label">[ write_whisper ]</div>
        <div class="dc-whisper-form">
          <textarea
            v-model="newContent"
            class="dc-textarea"
            placeholder="// 此刻你在想什么..."
            rows="4"
            maxlength="2000"
          />
          <button class="dc-execute-btn" :disabled="submitting || !newContent.trim()" @click="onSubmit">
            <span>{{ submitting ? '> transmitting...' : '> transmit' }}</span>
          </button>
        </div>
        <div v-if="error" class="dc-error">> ERROR: {{ error }}</div>
        <div v-if="success" class="dc-success">> OK: {{ success }}</div>
      </div>

      <div v-if="whispers.length > 0" class="dc-panel dc-float" style="--float-i:1">
        <div class="dc-panel-head">
          <h3 class="dc-panel-title">log.whispers [{{ whispers.length }}]</h3>
        </div>
        <div class="dc-whisper-list">
          <div v-for="(w, i) in whispers" :key="w.id" class="dc-whisper-entry dc-float" :style="{ '--float-i': i + 2 }">
            <span class="dc-entry-marker">></span>
            <div class="dc-entry-body">
              <p class="dc-entry-text">{{ w.content }}</p>
              <span class="dc-entry-time">{{ formatTime(w.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Dad view: read whispers + AI tips -->
    <template v-else>
      <div v-if="loading" class="dc-state"><span>fetching_data...</span></div>

      <template v-else>
        <!-- AI Tips -->
        <div class="dc-panel dc-float" style="--float-i:0">
          <div class="dc-panel-label">[ ai_advisory ]</div>
          <div v-if="tips" class="dc-tips-content">
            <p class="dc-tips-text">{{ tips }}</p>
          </div>
          <div v-else class="dc-tips-action">
            <button class="dc-execute-btn" :disabled="loadingTips" @click="onLoadTips">
              <span>{{ loadingTips ? '> synthesizing...' : '> request_advisory' }}</span>
            </button>
          </div>
        </div>

        <!-- Whisper list -->
        <div v-if="whispers.length > 0" class="dc-panel dc-float" style="--float-i:1">
          <div class="dc-panel-head">
            <h3 class="dc-panel-title">log.whispers [{{ whispers.length }}]</h3>
          </div>
          <div class="dc-whisper-list">
            <div v-for="(w, i) in whispers" :key="w.id" class="dc-whisper-entry dc-float" :style="{ '--float-i': i + 2 }">
              <span class="dc-entry-marker">></span>
              <div class="dc-entry-body">
                <p class="dc-entry-text">{{ w.content }}</p>
                <span class="dc-entry-time">{{ formatTime(w.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="!loading" class="dc-state dc-state-sm dc-float" style="--float-i:1">no_data</div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { createWhisper, getWhispers, getWhisperTips, type WhisperItem } from '@/lib/api/whisper'
import { getErrorMessage } from '@/lib/apiClient'

const authStore = useAuthStore()

const props = withDefaults(defineProps<{ visible?: boolean }>(), { visible: true })

const isMom = computed(() => authStore.user?.role === 'mom')

const whispers = ref<WhisperItem[]>([])
const loading = ref(false)
const newContent = ref('')
const submitting = ref(false)
const error = ref('')
const success = ref('')
const tips = ref('')
const loadingTips = ref(false)

watch(() => props.visible, async (active) => {
  if (active) {
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
}, { immediate: true })

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
.dc-tab-content { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dc-float {
  animation: floatUp 0.4s ease-out both;
  animation-delay: calc(var(--float-i, 0) * 0.06s);
}
@keyframes floatUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.dc-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-top: 8px; color: var(--dc-accent, #7DCFFF); }
.dc-sh-icon { color: var(--dc-accent, #7DCFFF); }
.dc-sh-text { font-family: var(--dc-font-mono); font-size: 13px; font-weight: bold; }

.dc-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px 20px; color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 13px; }
.dc-state-sm { padding: 30px 16px; }

.dc-panel {
  background: var(--dc-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  padding: 20px;
  margin-bottom: 16px;
}

.dc-panel-label {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: var(--dc-accent, #7DCFFF);
  margin-bottom: 16px;
}

.dc-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  padding-bottom: 12px;
}

.dc-panel-title {
  margin: 0;
  font-family: var(--dc-font-mono);
  font-size: 14px;
  color: var(--dc-text, #C0CAF5);
}

.dc-whisper-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dc-textarea {
  width: 100%;
  padding: 14px 16px;
  background: var(--dc-bg, #1A1B26);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-text, #C0CAF5);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}
.dc-textarea:focus { border-color: rgba(125, 207, 255, 0.3); }
.dc-textarea::placeholder { color: var(--dc-comment, #565F89); }

.dc-execute-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  background: transparent;
  border: 1px solid rgba(125, 207, 255, 0.3);
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-accent, #7DCFFF);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 1px;
}
.dc-execute-btn:hover:not(:disabled) {
  border-color: var(--dc-accent, #7DCFFF);
  background: rgba(125, 207, 255, 0.08);
  box-shadow: 0 0 20px rgba(125, 207, 255, 0.15);
}
.dc-execute-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.dc-error {
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(247, 118, 142, 0.08);
  border-left: 3px solid var(--dc-danger, #F7768E);
  color: var(--dc-danger, #F7768E);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  border-radius: var(--dc-radius, 2px);
}

.dc-success {
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(158, 206, 106, 0.08);
  border-left: 3px solid var(--dc-success, #9ECE6A);
  color: var(--dc-success, #9ECE6A);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  border-radius: var(--dc-radius, 2px);
}

.dc-tips-content {
  font-family: var(--dc-font-mono);
}

.dc-tips-text {
  font-size: 13px;
  color: var(--dc-text, #C0CAF5);
  line-height: 1.7;
  white-space: pre-wrap;
  margin: 0;
}

.dc-whisper-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dc-whisper-entry {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: var(--dc-bg, #1A1B26);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.06));
  border-radius: var(--dc-radius, 2px);
  transition: border-color 0.2s;
}
.dc-whisper-entry:hover { border-color: rgba(125, 207, 255, 0.15); }

.dc-entry-marker {
  color: var(--dc-accent, #7DCFFF);
  font-family: var(--dc-font-mono);
  font-weight: 700;
  flex-shrink: 0;
  line-height: 1.6;
}

.dc-entry-body { flex: 1; min-width: 0; }

.dc-entry-text {
  font-family: var(--dc-font-mono);
  font-size: 13px;
  color: var(--dc-text, #C0CAF5);
  line-height: 1.6;
  margin: 0 0 4px;
  word-break: break-word;
}

.dc-entry-time {
  font-family: var(--dc-font-mono);
  font-size: 11px;
  color: var(--dc-comment, #565F89);
}
</style>
