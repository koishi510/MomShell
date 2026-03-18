<template>
  <Transition :name="embedded ? '' : 'paper-fade'">
    <div
      v-if="isActive"
      :class="embedded ? 'embedded-wrapper' : 'paper-overlay'"
      @click="!embedded && onBackdropClick($event)"
    >
      <div :class="['paper-modal', { 'is-embedded': embedded }]">
        <img class="paper-bg" :src="paperImg" draggable="false" alt="" />
        <button v-if="!embedded" class="paper-close" @click="uiStore.closePanel()">✕</button>
        <div class="paper-content whisper-panel">
          <template v-if="isMom">
            <h2 class="panel-title">写下此刻的心声</h2>
            <p class="panel-subtitle">简单记录现在的状态，让伴侣更懂你。</p>

            <div v-if="loading && !view" class="loading-state">加载中...</div>
            <div v-else-if="error && !view" class="error-msg">{{ error }}</div>

            <template v-else-if="view">
              <section class="intro-card">
                <p class="card-kicker">当前话题</p>
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
                <p class="card-kicker">补一句想说的话</p>
                <textarea
                  v-model="wishContent"
                  class="wish-textarea"
                  :placeholder="view.wish_prompt || '如果有想对他说的悄悄话，可以写在这里。'"
                  maxlength="300"
                />
                <div class="wish-meta">
                  <span>{{ wishContent.length }}/300</span>
                </div>
              </section>

              <div class="action-row">
                <button class="submit-btn" :disabled="submitting || !hasValidSelection" @click="onSubmit">
                  {{ submitting ? '发送中...' : '分享心声' }}
                </button>
              </div>

              <p v-if="error" class="error-msg">{{ error }}</p>
              <p v-if="success" class="success-msg">{{ success }}</p>
            </template>
          </template>

          <template v-else>
            <h2 class="panel-title">心语信箱</h2>
            <p class="panel-subtitle">查看伴侣的心声，以及基于对话整理的相处建议。</p>

            <div v-if="loading && !view" class="loading-state">加载中...</div>
            <div v-else-if="error && !view" class="error-msg">{{ error }}</div>

            <template v-else>
              <section class="result-card">
                <div class="result-head">
                  <div>
                    <p class="card-kicker">最新心声</p>
                    <h3 class="card-title">{{ latestResponse?.dad_plan_title || '还没有新的状态' }}</h3>
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
                  <div v-if="latestResponse.dad_advice_sources.length > 0" class="history-section" style="margin-top: 14px;">
                    <div class="section-head">
                      <div>
                        <p class="card-kicker">建议依据</p>
                        <h3 class="section-title">建议来源</h3>
                      </div>
                      <span class="section-note">问卷 · 心愿 · 对话 · 记忆</span>
                    </div>
                    <div class="history-list">
                      <article
                        v-for="(source, index) in latestResponse.dad_advice_sources"
                        :key="`${source.label}-${index}`"
                        class="history-card"
                      >
                        <div class="history-meta">
                          <span>{{ source.label }}</span>
                        </div>
                        <p class="history-text">{{ source.detail }}</p>
                      </article>
                    </div>
                  </div>
                </template>
                <p v-else class="card-copy">她还没有记录新的状态。等她写下之后，这里会出现整理后的建议。</p>
              </section>

              <section v-if="latestResponse?.dad_advice_items?.length" class="history-section">
                <div class="section-head">
                  <div>
                    <p class="card-kicker">AI 建议</p>
                    <h3 class="section-title">更好的靠近方式</h3>
                  </div>
                  <span class="section-note">陪伴建议</span>
                </div>
                <div class="task-preview-list">
                  <article v-for="advice in latestResponse.dad_advice_items" :key="`${advice.kind}-${advice.title}`" class="task-preview-card">
                    <div class="task-preview-top">
                      <span class="task-badge">{{ adviceKindLabel(advice.kind) }}</span>
                    </div>
                    <h4 class="task-preview-title">{{ advice.title }}</h4>
                    <p class="task-preview-desc">{{ advice.description }}</p>
                  </article>
                </div>
              </section>

              <section v-if="dadHistoryList.length > 0" class="history-section">
                <div class="section-head">
                  <div>
                    <p class="card-kicker">历史记录</p>
                    <h3 class="section-title">最近状态</h3>
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
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
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
import paperImg from '@/assets/images/paper.png'

const uiStore = useUiStore()
const authStore = useAuthStore()

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false })
const isActive = computed(() => props.embedded || uiStore.activePanel === 'whisper')
const isMom = computed(() => authStore.user?.role === 'mom')

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    uiStore.closePanel()
  }
}

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
const selectedStageLabel = computed(() => stageQuestion.value?.options.find((item) => item.id === selectedStage.value)?.label ?? '')
const selectedStateLabel = computed(() => stateQuestion.value?.options.find((item) => item.id === selectedState.value)?.label ?? '')
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
      stage_option_label: selectedStageLabel.value,
      state_option_label: selectedStateLabel.value,
      wish_content: wishContent.value.trim() || undefined,
    })
    applyResponse(response)
    wishContent.value = ''
    success.value = '心声已分享给伴侣。'
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
.paper-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.embedded-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.paper-modal {
  position: relative;
  width: min(500px, 85vw);
  max-height: 85vh;
}

.paper-modal.is-embedded {
  width: 100%;
  max-height: none;
}

.paper-bg {
  width: 100%;
  display: block;
  pointer-events: none;
}

.paper-close {
  position: absolute;
  top: 8%;
  right: 10%;
  background: none;
  border: none;
  font-size: 20px;
  color: #5a3e2b;
  cursor: pointer;
  z-index: 2;
}

.paper-content {
  position: absolute;
  inset: 12% 14% 10% 14%;
  overflow-y: auto;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
}

.paper-content::-webkit-scrollbar {
  display: none;
}

.paper-fade-enter-active,
.paper-fade-leave-active {
  transition: opacity 0.25s ease;
}

.paper-fade-enter-from,
.paper-fade-leave-to {
  opacity: 0;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #3a2a1a;
  text-align: center;
  margin: 0 0 8px;
}

.panel-subtitle {
  text-align: center;
  color: #5a4a3a;
  font-size: 13px;
  margin: 0 auto 16px;
  max-width: 480px;
  line-height: 1.6;
}

.intro-card,
.question-card,
.wish-card,
.result-card,
.history-section {
  padding: 14px;
  border-radius: 12px;
  background: rgba(138, 106, 74, 0.08);
  border: 1px solid rgba(138, 106, 74, 0.15);
  margin-bottom: 14px;
}

.card-kicker {
  margin: 0 0 6px;
  color: #8a6a4a;
  font-size: 11px;
  letter-spacing: 0.1em;
  font-weight: 600;
}

.card-title,
.section-title,
.question-title,
.task-preview-title {
  margin: 0;
  color: #3a2a1a;
  font-size: 15px;
  font-weight: 700;
}

.card-copy,
.task-preview-desc,
.history-text,
.history-wish,
.wish-note-copy {
  margin: 8px 0 0;
  color: #5a4a3a;
  line-height: 1.6;
  font-size: 13px;
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
  margin-bottom: 12px;
}

.question-index {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(138, 106, 74, 0.15);
  color: #6a4a2a;
  font-size: 12px;
  font-weight: 700;
  flex: 0 0 auto;
}

.option-list,
.task-preview-list,
.history-list {
  display: grid;
  gap: 8px;
}

.option-btn {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid #c4a882;
  color: #3a2a1a;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}

.option-btn:hover {
  background: rgba(255, 255, 255, 0.6);
  transform: translateY(-1px);
}

.option-btn.selected {
  background: rgba(138, 106, 74, 0.15);
  border-color: #8a6a4a;
}

.option-label {
  display: block;
  font-weight: 600;
  line-height: 1.5;
  font-size: 13px;
}

.option-hint,
.result-time,
.section-note,
.task-inline-meta,
.history-meta,
.wish-meta {
  color: #6a5a4a;
  font-size: 11px;
  line-height: 1.5;
}

.wish-textarea {
  width: 100%;
  min-height: 90px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid #c4a882;
  color: #3a2a1a;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  margin-bottom: 8px;
}

.wish-textarea:focus {
  border-color: #8a6a4a;
}

.submit-btn {
  margin-left: auto;
  padding: 10px 20px;
  background: #8a6a4a;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.submit-btn:hover:not(:disabled) { background: #6a4a2a; }
.submit-btn:active { transform: scale(0.97); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.signal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.signal-chip,
.task-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(138, 106, 74, 0.15);
  border: 1px solid rgba(138, 106, 74, 0.25);
  color: #6a4a2a;
  font-size: 11px;
  font-weight: 600;
}

.task-preview-card,
.history-card,
.wish-note {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(138, 106, 74, 0.15);
}

.task-preview-title {
  margin-top: 8px;
  font-size: 14px;
}

.result-headline {
  margin: 12px 0 0;
  color: #8a6a4a;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 700;
}

.history-wish {
  color: #3a2a1a;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 30px 20px;
  color: #6a5a4a;
  font-size: 13px;
}

.error-msg {
  padding: 8px 12px;
  background: rgba(192, 57, 43, 0.1);
  border: 1px solid rgba(192, 57, 43, 0.3);
  border-radius: 8px;
  color: #c0392b;
  font-size: 12px;
  margin-top: 12px;
}

.success-msg {
  padding: 8px 12px;
  background: rgba(39, 174, 96, 0.1);
  border: 1px solid rgba(39, 174, 96, 0.3);
  border-radius: 8px;
  color: #27ae60;
  font-size: 12px;
  margin-top: 12px;
}

@media (max-width: 768px) {
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

  .paper-close {
    font-size: 18px;
    top: 6%;
    right: 8%;
  }
}
</style>
