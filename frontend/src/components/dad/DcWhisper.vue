<template>
  <div class="dc-tab-content">
    <div class="dc-section-header">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      <span class="dc-sh-text">./whisper</span>
    </div>

    <div v-if="loading && !view" class="dc-state"><span>正在同步心语情报...</span></div>
    <div v-else-if="error && !view" class="dc-state dc-error-state"><span>{{ error }}</span></div>

    <template v-else>
      <div class="dc-panel dc-float" style="--float-i:0">
        <div class="dc-panel-label">intel.summary</div>
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
        <div v-else class="dc-empty-copy">
          她还没有发来新的心语情报。等她在 mom 端提交问卷和一句心愿，这里会同步 AI 解读结果。
        </div>
      </div>

      <div v-if="latestResponse?.wish_content" class="dc-panel dc-float" style="--float-i:1">
        <div class="dc-panel-label">wish.raw</div>
        <p class="dc-quote">“{{ latestResponse.wish_content }}”</p>
      </div>

      <div v-if="latestResponse?.dad_tasks?.length" class="dc-panel dc-float" style="--float-i:2">
        <div class="dc-panel-head">
          <h3 class="dc-panel-title">小石光的建议</h3>
          <span class="dc-panel-note">工单已同步到 `./issue`</span>
        </div>
        <div class="dc-task-grid">
          <article v-for="(task, index) in latestResponse.dad_tasks" :key="task.title" class="dc-task-card dc-float" :style="{ '--float-i': index + 3 }">
            <div class="dc-task-top">
              <span class="dc-task-badge">{{ categoryLabel(task.category) }}</span>
              <span class="dc-task-stars">{{ difficultyStars(task.difficulty) }}</span>
            </div>
            <h4 class="dc-task-title">{{ task.title }}</h4>
            <p class="dc-task-desc">{{ task.description }}</p>
            <div class="dc-task-foot">{{ priorityLabel(task.priority) }}</div>
          </article>
        </div>
      </div>

      <div v-if="historyList.length > 0" class="dc-panel dc-float" style="--float-i:3">
        <div class="dc-panel-head">
          <h3 class="dc-panel-title">最近情报记录</h3>
          <span class="dc-panel-note">最近 {{ historyList.length }} 条</span>
        </div>
        <div class="dc-history-list">
          <div v-for="(item, index) in historyList" :key="item.id" class="dc-history-entry dc-float" :style="{ '--float-i': index + 4 }">
            <div class="dc-history-meta">
              <span>{{ item.dad_plan_title }}</span>
              <span>{{ formatTime(item.created_at) }}</span>
            </div>
            <p class="dc-history-copy">{{ item.stage_label }} / {{ item.state_label }}</p>
            <p class="dc-history-headline">{{ item.dad_headline }}</p>
          </div>
        </div>
      </div>

      <div v-if="error && view" class="dc-inline-error dc-float" style="--float-i:4">{{ error }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { getErrorMessage } from '@/lib/apiClient'
import { getFutureLetter, type FutureLetterResponseItem, type FutureLetterView } from '@/lib/api/whisper'

const props = withDefaults(defineProps<{ visible?: boolean }>(), { visible: true })

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

function categoryLabel(category: string) {
  const map: Record<string, string> = {
    housework: '后勤',
    parenting: '育儿',
    health: '修复',
    emotional: '陪伴',
  }
  return map[category] ?? category
}

function priorityLabel(priority: string) {
  const map: Record<string, string> = {
    T0: '立即执行',
    T1: '今晚完成',
    T2: '顺手补齐',
  }
  return map[priority] ?? priority
}

function difficultyStars(value: number) {
  return '★'.repeat(Math.max(1, value))
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
.dc-task-top,
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
.dc-task-desc,
.dc-history-copy,
.dc-history-headline,
.dc-empty-copy,
.dc-quote {
  margin: 10px 0 0;
  color: var(--dc-comment, #8b92b5);
  line-height: 1.7;
}

.dc-panel-copy,
.dc-history-headline {
  color: var(--dc-accent, #7DCFFF);
}

.dc-signal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.dc-signal-chip,
.dc-task-badge {
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

.dc-task-grid,
.dc-history-list {
  display: grid;
  gap: 12px;
}

.dc-task-card,
.dc-history-entry {
  border: 1px solid rgba(125, 207, 255, 0.12);
  background: rgba(17, 24, 39, 0.45);
  border-radius: var(--dc-radius, 2px);
  padding: 16px;
}

.dc-task-title {
  margin-top: 12px;
  font-size: 16px;
}

.dc-task-foot,
.dc-time-block,
.dc-panel-note,
.dc-history-meta {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: var(--dc-comment, #565F89);
}

.dc-task-stars {
  color: #fbbf24;
  letter-spacing: 0.15em;
}

.dc-quote {
  color: var(--dc-string, #9ECE6A);
}

.dc-inline-error {
  color: var(--dc-danger, #F7768E);
  font-family: var(--dc-font-mono);
  font-size: 12px;
}

@media (max-width: 768px) {
  .dc-intel-head,
  .dc-task-top,
  .dc-panel-head,
  .dc-history-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
