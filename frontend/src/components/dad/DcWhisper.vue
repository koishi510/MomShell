<template>
  <div class="dc-tab-content">
    <div class="dc-section-head">
      <div class="dc-section-header">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span class="dc-sh-text">./whisper</span>
      </div>
      <button
        class="dc-header-action-btn"
        type="button"
        :disabled="regenerating"
        @click="$emit('regenerate-intel')"
      >
        <svg v-if="regenerating" class="dc-spin" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
        <svg v-else viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
        <span>{{ regenerating ? '重生成中...' : '重新生成' }}</span>
      </button>
    </div>

    <div v-if="loading && !view" class="dc-state"><span>正在同步心语情报...</span></div>
    <div v-else-if="error && !view" class="dc-state dc-error-state"><span>{{ error }}</span></div>

    <template v-else>
      <div class="dc-panel dc-float" style="--float-i:0">
        <div v-if="latestResponse" class="dc-intel-head">
          <div>
            <h3 class="dc-panel-title">{{ latestResponse.dad_plan_title }}</h3>
            <p class="dc-panel-copy">{{ latestResponse.dad_headline }}</p>
          </div>
          <span class="dc-time-block">{{ formatTime(latestResponse.created_at) }}</span>
        </div>
        <div v-if="latestResponse" class="dc-signal-row">
          <span class="dc-signal-chip">{{ latestResponse.stage_label }}</span>
          <span class="dc-signal-chip">{{ latestResponse.state_label }}</span>
        </div>
        <p v-if="latestResponse" class="dc-summary">{{ latestResponse.dad_summary }}</p>

        <!-- Integrated Wish -->
        <div v-if="latestResponse?.wish_content" class="dc-wish-block">
          <div class="dc-wish-top">
            <h4 class="dc-panel-title dc-wish-title">她的心愿</h4>
            <span class="dc-source-label">原话</span>
          </div>
          <article class="dc-source-card dc-wish-card">
            <p class="dc-quote">“{{ latestResponse.wish_content }}”</p>
          </article>
        </div>

        <div v-else-if="!latestResponse" class="dc-empty-copy">
          暂无心语情报，等待同步 AI 解读。
        </div>
      </div>

      <div v-if="latestResponse?.dad_advice_items?.length" class="dc-panel dc-float" style="--float-i:3">
        <div class="dc-panel-head">
          <h3 class="dc-panel-title">小石光的建议</h3>
        </div>
        <div class="dc-advice-grid">
          <article
            v-for="(advice, index) in latestResponse.dad_advice_items"
            :key="`${advice.kind}-${advice.title}`"
            class="dc-advice-card dc-float"
            :style="{ '--float-i': index + 4 }"
          >
            <div class="dc-advice-top">
              <span class="dc-advice-badge">{{ adviceKindLabel(advice.kind) }}</span>
            </div>
            <h4 class="dc-task-title">{{ advice.title }}</h4>
            <p class="dc-task-desc">{{ advice.description }}</p>
          </article>
        </div>
      </div>

      <div v-if="latestResponse?.dad_advice_sources?.length" class="dc-panel dc-float" style="--float-i:2">
        <div class="dc-panel-head">
          <h3 class="dc-panel-title">建议依据</h3>
        </div>
        <div class="dc-source-list">
          <article
            v-for="(source, index) in latestResponse.dad_advice_sources"
            :key="`${source.label}-${index}`"
            class="dc-source-card dc-float"
            :style="{ '--float-i': index + 3 }"
          >
            <span class="dc-source-label">{{ source.label }}</span>
            <p class="dc-source-detail">{{ source.detail }}</p>
          </article>
        </div>
      </div>

      <div v-if="historyList.length > 0" class="dc-panel dc-float" style="--float-i:4">
        <div class="dc-panel-head">
          <h3 class="dc-panel-title">最近情报记录</h3>
          <span class="dc-panel-note">最近 {{ historyList.length }} 条</span>
        </div>
        <div class="dc-history-list">
          <div v-for="(item, index) in historyList" :key="item.id" class="dc-history-entry dc-float" :style="{ '--float-i': index + 5 }">
            <div class="dc-history-meta">
              <span>{{ item.dad_plan_title }}</span>
              <span>{{ formatTime(item.created_at) }}</span>
            </div>
            <p class="dc-history-copy">{{ item.stage_label }} / {{ item.state_label }}</p>
            <p class="dc-history-headline">{{ item.dad_headline }}</p>
          </div>
        </div>
      </div>

      <div v-if="error && view" class="dc-inline-error dc-float" style="--float-i:5">{{ error }}</div>
      <div v-if="actionError" class="dc-inline-error dc-float" style="--float-i:6">{{ actionError }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { getErrorMessage } from '@/lib/apiClient'
import { getFutureLetter, type FutureLetterResponseItem, type FutureLetterView } from '@/lib/api/whisper'

const props = withDefaults(defineProps<{
  visible?: boolean
  refreshToken?: number
  regenerating?: boolean
  actionError?: string
}>(), {
  visible: true,
  refreshToken: 0,
  regenerating: false,
  actionError: '',
})

defineEmits<{
  'regenerate-intel': []
}>()

const view = ref<FutureLetterView | null>(null)
const loading = ref(false)
const error = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

const latestResponse = computed<FutureLetterResponseItem | null>(() => view.value?.latest_response ?? null)
const historyList = computed(() => view.value?.recent_responses.slice(1) ?? [])

watch(() => props.visible, async (active) => {
  if (!active) {
    stopPolling()
    return
  }

  await loadFutureLetter()
  startPolling()
}, { immediate: true })

watch(() => props.refreshToken, async () => {
  if (!props.visible) return
  await loadFutureLetter()
})

onUnmounted(stopPolling)

async function loadFutureLetter() {
  loading.value = true
  try {
    view.value = await getFutureLetter()
    error.value = ''
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    void loadFutureLetter()
  }, 5000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function adviceKindLabel(kind: string) {
  const map: Record<string, string> = {
    decode: '状态解读',
    opening: '沟通建议',
    observe: '观察建议',
    avoid: '避免事项',
  }
  return map[kind] ?? '行动建议'
}

function formatTime(value: string) {
  const date = new Date(value)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
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
  animation-delay: calc(var(--float-i, 0) * 0.05s);
}

@keyframes floatUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.dc-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-top: 8px; color: var(--dc-accent, #7DCFFF); }
.dc-sh-icon { color: var(--dc-accent, #7DCFFF); }
.dc-sh-text { font-family: var(--dc-font-mono); font-size: 13px; font-weight: bold; }

.dc-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.dc-settings-btn,
.dc-regenerate-btn {
  background: transparent;
  border: 1px solid rgba(125, 207, 255, 0.2);
  color: var(--dc-accent, #7DCFFF);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  border-radius: var(--dc-radius, 2px);
}

.dc-settings-btn {
  padding: 6px 10px;
  cursor: pointer;
}

.dc-settings-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(125, 207, 255, 0.12);
  border-radius: var(--dc-radius, 2px);
}

.dc-settings-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dc-settings-title {
  color: var(--dc-text, #C0CAF5);
  font-family: var(--dc-font-mono);
  font-size: 13px;
}

.dc-settings-note {
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  line-height: 1.6;
}

.dc-regenerate-btn {
  padding: 10px 12px;
  cursor: pointer;
  white-space: nowrap;
}

.dc-regenerate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dc-state {
  display: flex;
  justify-content: center;
  padding: 56px 20px;
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 13px;
}

.dc-error-state { color: var(--dc-danger, #F7768E); }

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

.dc-intel-head,
.dc-advice-top,
.dc-panel-head,
.dc-history-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.dc-panel-head {
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
}

.dc-panel-title,
.dc-task-title {
  margin: 0;
  color: var(--dc-text, #C0CAF5);
}

.dc-panel-copy,
.dc-summary,
.dc-summary-note,
.dc-task-desc,
.dc-history-copy,
.dc-history-headline,
.dc-empty-copy,
.dc-quote,
.dc-source-detail {
  margin: 10px 0 0;
  color: var(--dc-comment, #8b92b5);
  line-height: 1.7;
}

.dc-panel-copy,
.dc-history-headline {
  color: var(--dc-accent, #7DCFFF);
}

.dc-summary-note {
  color: var(--dc-comment, #565F89);
  font-size: 13px;
}

.dc-signal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.dc-signal-chip,
.dc-advice-badge,
.dc-source-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border: 1px solid rgba(125, 207, 255, 0.25);
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-accent, #7DCFFF);
  font-family: var(--dc-font-mono);
  font-size: 11px;
}

.dc-source-list,
.dc-advice-grid,
.dc-history-list {
  display: grid;
  gap: 12px;
}

.dc-source-card,
.dc-advice-card,
.dc-history-entry {
  border: 1px solid rgba(125, 207, 255, 0.12);
  background: rgba(17, 24, 39, 0.45);
  border-radius: var(--dc-radius, 2px);
  padding: 16px;
}

.dc-source-label {
  justify-content: flex-start;
}

.dc-task-title {
  margin-top: 12px;
  font-size: 16px;
}

.dc-time-block,
.dc-panel-note,
.dc-history-meta {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: var(--dc-comment, #565F89);
}

.dc-quote {
  color: var(--dc-string, #9ECE6A);
}

.dc-wish-block {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed var(--dc-border, rgba(255, 255, 255, 0.1));
  display: grid;
  gap: 12px;
}

.dc-wish-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dc-wish-title {
  font-size: 14px;
}

.dc-wish-card {
  position: relative;
}

.dc-wish-card .dc-quote {
  margin: 0;
  color: var(--dc-text, #C0CAF5);
  line-height: 1.8;
  white-space: pre-wrap;
}

.dc-inline-error {
  color: var(--dc-danger, #F7768E);
  font-family: var(--dc-font-mono);
  font-size: 12px;
}

.dc-header-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid rgba(125, 207, 255, 0.3);
  color: var(--dc-accent, #7DCFFF);
  font-family: var(--dc-font-mono);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dc-header-action-btn:hover:not(:disabled) {
  background: rgba(125, 207, 255, 0.1);
  border-color: var(--dc-accent, #7DCFFF);
}

.dc-header-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dc-spin {
  animation: dc-spin 1s linear infinite;
}

@keyframes dc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .dc-section-head,
  .dc-settings-card,
  .dc-intel-head,
  .dc-advice-top,
  .dc-wish-top,
  .dc-panel-head,
  .dc-history-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .dc-regenerate-btn {
    width: 100%;
  }
}
</style>
