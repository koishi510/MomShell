<template>
  <OverlayPanel :visible="embedded || uiStore.activePanel === 'whisper'" :embedded="embedded" position="center" @close="uiStore.closePanel()">
    <div class="whisper-panel">
      <template v-if="isMom">
        <h2 class="panel-title">写下此刻的心声</h2>
        <p class="panel-subtitle">用两个选择和一句补充，让小石光把你的需要整理成发给他的心语情报。</p>

        <div v-if="loading && !view" class="loading-state">加载中...</div>
        <div v-else-if="error && !view" class="error-msg">{{ error }}</div>

        <template v-else-if="view">
          <section class="intro-card">
            <p class="card-kicker">本轮主题</p>
            <h3 class="card-title">{{ view.title }}</h3>
            <p class="card-copy">{{ view.intro }}</p>
          </section>

          <section v-for="(question, index) in view.questions" :key="question.id" class="question-card">
            <div class="question-head">
              <span class="question-index">{{ index + 1 }}</span>
              <div>
                <h3 class="question-title">{{ question.prompt }}</h3>
              </div>
            </div>
            <div class="option-list">
              <button
                v-for="option in question.options"
                :key="option.id"
                :class="['option-btn', { selected: selectedValue(question.id) === option.id }]"
                @click="selectOption(question.id, option.id)"
              >
                <span class="option-label">{{ option.label }}</span>
                <span v-if="option.hint" class="option-hint">{{ option.hint }}</span>
              </button>
            </div>
          </section>

          <section class="wish-card">
            <p class="card-kicker">补一句心愿</p>
            <textarea
              v-model="wishContent"
              class="wish-textarea"
              :placeholder="view.wish_prompt || '如果还有一句想补充的话，可以写在这里。'"
              maxlength="300"
            />
            <div class="wish-meta">
              <span>{{ wishContent.length }}/300</span>
              <span>这句也会被一起编译进心语情报</span>
            </div>
          </section>

          <div class="action-row">
            <button class="submit-btn" :disabled="submitting || !hasValidSelection" @click="onSubmit">
              {{ submitting ? '发送中...' : '发给他' }}
            </button>
          </div>

          <p v-if="error" class="error-msg">{{ error }}</p>
          <p v-if="success" class="success-msg">{{ success }}</p>

          <section v-if="latestResponse" class="result-card">
            <div class="result-head">
              <div>
                <p class="card-kicker">最近一次情报</p>
                <h3 class="card-title">{{ latestResponse.dad_plan_title }}</h3>
              </div>
              <span class="result-time">{{ formatTime(latestResponse.created_at) }}</span>
            </div>
            <p class="result-headline">{{ latestResponse.dad_headline }}</p>
            <p class="card-copy">{{ latestResponse.dad_summary }}</p>
            <div class="signal-row">
              <span class="signal-chip">{{ latestResponse.stage_label }}</span>
              <span class="signal-chip">{{ latestResponse.state_label }}</span>
            </div>
            <div v-if="latestResponse.dad_tasks.length > 0" class="task-preview-list">
              <article v-for="task in latestResponse.dad_tasks" :key="task.title" class="task-preview-card">
                <div class="task-preview-top">
                  <span class="task-badge">{{ categoryLabel(task.category) }}</span>
                  <span class="task-inline-meta">{{ priorityLabel(task.priority) }} · {{ difficultyStars(task.difficulty) }}</span>
                </div>
                <h4 class="task-preview-title">{{ task.title }}</h4>
                <p class="task-preview-desc">{{ task.description }}</p>
              </article>
            </div>
          </section>

          <section v-if="historyList.length > 0" class="history-section">
            <div class="section-head">
              <div>
                <p class="card-kicker">过往记录</p>
                <h3 class="section-title">最近情报</h3>
              </div>
              <span class="section-note">按时间倒序</span>
            </div>
            <div class="history-list">
              <article v-for="item in historyList" :key="item.id" class="history-card">
                <div class="history-meta">
                  <span>{{ item.dad_plan_title }}</span>
                  <span>{{ formatTime(item.created_at) }}</span>
                </div>
                <p class="history-text">{{ item.stage_label }} / {{ item.state_label }}</p>
                <p class="history-wish">{{ item.dad_headline }}</p>
              </article>
            </div>
          </section>
        </template>
      </template>

      <template v-else>
        <h2 class="panel-title">心语情报</h2>
        <p class="panel-subtitle">查看她刚刚发来的心愿、AI 解读和执行建议。</p>

        <div v-if="loading && !view" class="loading-state">加载中...</div>
        <div v-else-if="error && !view" class="error-msg">{{ error }}</div>

        <template v-else>
          <section class="result-card">
            <div class="result-head">
              <div>
                <p class="card-kicker">最新情报</p>
                <h3 class="card-title">{{ latestResponse?.dad_plan_title || '还没有新的情报' }}</h3>
              </div>
              <span v-if="latestResponse" class="result-time">{{ formatTime(latestResponse.created_at) }}</span>
            </div>

            <template v-if="latestResponse">
              <p class="result-headline">{{ latestResponse.dad_headline }}</p>
              <p class="card-copy">{{ latestResponse.dad_summary }}</p>
              <div class="signal-row">
                <span class="signal-chip">{{ latestResponse.stage_label }}</span>
                <span class="signal-chip">{{ latestResponse.state_label }}</span>
              </div>
              <div v-if="latestResponse.wish_content" class="wish-note">
                <p class="card-kicker">她补充的一句心愿</p>
                <p class="wish-note-copy">“{{ latestResponse.wish_content }}”</p>
              </div>
            </template>
            <p v-else class="card-copy">她还没有提交新的问卷与心愿。等她写下之后，这里会出现 AI 整理后的情报。</p>
          </section>

          <section v-if="latestResponse?.dad_tasks?.length" class="history-section">
            <div class="section-head">
              <div>
                <p class="card-kicker">执行建议</p>
                <h3 class="section-title">已同步到任务面板</h3>
              </div>
              <span class="section-note">去任务页提交回执</span>
            </div>
            <div class="task-preview-list">
              <article v-for="task in latestResponse.dad_tasks" :key="task.title" class="task-preview-card">
                <div class="task-preview-top">
                  <span class="task-badge">{{ categoryLabel(task.category) }}</span>
                  <span class="task-inline-meta">{{ priorityLabel(task.priority) }} · {{ difficultyStars(task.difficulty) }}</span>
                </div>
                <h4 class="task-preview-title">{{ task.title }}</h4>
                <p class="task-preview-desc">{{ task.description }}</p>
              </article>
            </div>
          </section>

          <section v-if="dadHistoryList.length > 0" class="history-section">
            <div class="section-head">
              <div>
                <p class="card-kicker">过往情报</p>
                <h3 class="section-title">最近记录</h3>
              </div>
              <span class="section-note">自动刷新</span>
            </div>
            <div class="history-list">
              <article v-for="item in dadHistoryList" :key="item.id" class="history-card">
                <div class="history-meta">
                  <span>{{ item.dad_plan_title }}</span>
                  <span>{{ formatTime(item.created_at) }}</span>
                </div>
                <p class="history-text">{{ item.stage_label }} / {{ item.state_label }}</p>
                <p class="history-wish">{{ item.dad_headline }}</p>
              </article>
            </div>
          </section>

          <p v-if="error && view" class="error-msg">{{ error }}</p>
        </template>
      </template>
    </div>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import {
  getFutureLetter,
  respondFutureLetter,
  type FutureLetterQuestion,
  type FutureLetterResponseItem,
  type FutureLetterView,
} from '@/lib/api/whisper'
import { getErrorMessage } from '@/lib/apiClient'

const uiStore = useUiStore()
const authStore = useAuthStore()

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const isActive = computed(() => props.embedded || uiStore.activePanel === 'whisper')
const isMom = computed(() => authStore.user?.role === 'mom')

const view = ref<FutureLetterView | null>(null)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const success = ref('')
const selectedStage = ref('')
const selectedState = ref('')
const wishContent = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

const stageQuestion = computed<FutureLetterQuestion | null>(
  () => view.value?.questions.find((item) => item.id === 'stage') ?? null,
)
const stateQuestion = computed<FutureLetterQuestion | null>(
  () => view.value?.questions.find((item) => item.id === 'state') ?? null,
)
const latestResponse = computed<FutureLetterResponseItem | null>(() => view.value?.latest_response ?? null)
const historyList = computed(() => view.value?.recent_responses.slice(1) ?? [])
const dadHistoryList = computed(() => view.value?.recent_responses.slice(1) ?? [])
const hasValidSelection = computed(() => {
  const primaryIds = new Set(stageQuestion.value?.options.map((item) => item.id) ?? [])
  const secondaryIds = new Set(stateQuestion.value?.options.map((item) => item.id) ?? [])
  return primaryIds.has(selectedStage.value) && secondaryIds.has(selectedState.value)
})

watch(isActive, async (active) => {
  if (!active) {
    stopPolling()
    return
  }

  await loadFutureLetter()
  if (!isMom.value) startPolling()
}, { immediate: true })

onUnmounted(stopPolling)

async function loadFutureLetter() {
  loading.value = true
  if (!view.value) error.value = ''
  try {
    view.value = await getFutureLetter()
    normalizeSelectedOptions()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

function normalizeSelectedOptions() {
  const primaryIds = new Set(stageQuestion.value?.options.map((item) => item.id) ?? [])
  const secondaryIds = new Set(stateQuestion.value?.options.map((item) => item.id) ?? [])
  if (!primaryIds.has(selectedStage.value)) selectedStage.value = ''
  if (!secondaryIds.has(selectedState.value)) selectedState.value = ''
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

function selectedValue(id: string) {
  return id === 'stage' ? selectedStage.value : selectedState.value
}

function selectOption(id: string, value: string) {
  if (id === 'stage') {
    selectedStage.value = value
    return
  }
  selectedState.value = value
}

async function onSubmit() {
  if (!view.value || !hasValidSelection.value) return

  submitting.value = true
  error.value = ''
  success.value = ''
  try {
    const response = await respondFutureLetter({
      letter_code: view.value.letter_code,
      stage_option_id: selectedStage.value,
      state_option_id: selectedState.value,
      wish_content: wishContent.value.trim() || undefined,
    })
    applyResponse(response)
    wishContent.value = ''
    success.value = '心语情报已经发出。'
    window.setTimeout(() => {
      success.value = ''
    }, 3200)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    submitting.value = false
  }
}

function applyResponse(response: FutureLetterResponseItem) {
  if (!view.value) return
  const nextHistory = [response, ...view.value.recent_responses.filter((item) => item.id !== response.id)]
  view.value = {
    ...view.value,
    latest_response: response,
    recent_responses: nextHistory.slice(0, 6),
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
  margin: 0 auto 24px;
  max-width: 480px;
  line-height: 1.7;
}

.intro-card,
.question-card,
.wish-card,
.result-card,
.history-section {
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 14px;
}

.card-kicker {
  margin: 0 0 6px;
  color: rgba(255, 200, 120, 0.85);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
}

.card-title,
.section-title,
.question-title,
.task-preview-title {
  margin: 0;
  color: var(--text-primary);
}

.card-copy,
.task-preview-desc,
.history-text,
.history-wish,
.wish-note-copy {
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.question-head,
.result-head,
.section-head,
.history-meta,
.task-preview-top,
.action-row,
.wish-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.question-head {
  align-items: flex-start;
  margin-bottom: 14px;
}

.question-index {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 200, 120, 0.12);
  color: rgba(255, 200, 120, 0.95);
  font-weight: 700;
  flex: 0 0 auto;
}

.option-list,
.task-preview-list,
.history-list {
  display: grid;
  gap: 10px;
}

.option-btn {
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}

.option-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.option-btn.selected {
  border-color: rgba(255, 200, 120, 0.55);
  background: rgba(255, 200, 120, 0.12);
}

.option-label {
  display: block;
  font-weight: 600;
  line-height: 1.6;
}

.option-hint,
.result-time,
.section-note,
.task-inline-meta,
.history-meta,
.wish-meta {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.wish-textarea {
  width: 100%;
  min-height: 110px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
}

.wish-textarea:focus {
  border-color: rgba(255, 200, 120, 0.4);
}

.submit-btn {
  margin-left: auto;
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

.submit-btn:hover:not(:disabled) { background: var(--accent-warm-hover); }
.submit-btn:active { transform: scale(0.97); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.signal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.signal-chip,
.task-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 200, 120, 0.12);
  border: 1px solid rgba(255, 200, 120, 0.22);
  color: rgba(255, 214, 153, 0.95);
  font-size: 11px;
  font-weight: 700;
}

.task-preview-card,
.history-card,
.wish-note {
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.task-preview-title {
  margin-top: 10px;
  font-size: 15px;
}

.result-headline {
  margin: 14px 0 0;
  color: rgba(255, 220, 160, 0.95);
  font-size: 16px;
  line-height: 1.7;
  font-weight: 700;
}

.history-wish {
  color: var(--text-primary);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.error-msg {
  padding: 10px 14px;
  background: rgba(220, 60, 60, 0.15);
  border: 1px solid rgba(220, 60, 60, 0.25);
  border-radius: 10px;
  color: #ffbbbb;
  font-size: 13px;
  margin-top: 14px;
}

.success-msg {
  padding: 10px 14px;
  background: rgba(60, 180, 100, 0.15);
  border: 1px solid rgba(60, 180, 100, 0.25);
  border-radius: 10px;
  color: #a8f0c0;
  font-size: 13px;
  margin-top: 14px;
}

@media (max-width: 768px) {
  .whisper-panel {
    padding: 24px 16px 20px;
  }

  .panel-title {
    font-size: 20px;
  }

  .question-head,
  .result-head,
  .section-head,
  .history-meta,
  .task-preview-top,
  .wish-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .submit-btn {
    width: 100%;
  }
}
</style>
