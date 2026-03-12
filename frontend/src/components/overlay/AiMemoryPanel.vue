<template>
  <OverlayPanel :visible="uiStore.activePanel === 'ai-memory'" position="center" @close="uiStore.closePanel()">
    <div class="ai-memory-panel">
      <h2 class="panel-title">小石光的记忆</h2>

      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'facts' }"
          @click="activeTab = 'facts'"
        >
          记忆
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          对话历史
        </button>
      </div>

      <!-- Facts Tab -->
      <template v-if="activeTab === 'facts'">
        <p class="panel-subtitle">这些是小石光记住的关于你们的信息，你可以随时删除</p>

        <div v-if="loading" class="loading-state">加载中...</div>

        <div v-else-if="facts.length === 0" class="empty-state">
          <p>还没有记忆条目</p>
          <p class="empty-hint">和小石光聊天时分享的信息会自动记录在这里</p>
        </div>

        <div v-else class="facts-list">
          <div v-for="fact in facts" :key="fact.id" class="fact-card">
            <div class="fact-content">
              <span class="fact-category" :data-category="fact.category">{{ categoryLabel(fact.category) }}</span>
              <span v-if="fact.owner_nickname" class="fact-owner">{{ ownerLabel(fact) }}</span>
              <span class="fact-text">{{ fact.content }}</span>
            </div>
            <button
              class="fact-delete"
              :disabled="deletingId === fact.id"
              @click="onDelete(fact.id)"
              aria-label="删除"
            >
              <svg v-if="deletingId !== fact.id" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
              <span v-else class="deleting-dot" />
            </button>
          </div>
        </div>
      </template>

      <!-- History Tab -->
      <template v-if="activeTab === 'history'">
        <p class="panel-subtitle">你和小石光的对话记录</p>

        <div v-if="historyLoading" class="loading-state">加载中...</div>

        <div v-else-if="history.turns.length === 0 && !history.summary" class="empty-state">
          <p>还没有对话记录</p>
          <p class="empty-hint">开始和小石光聊天后，对话会出现在这里</p>
        </div>

        <div v-else class="history-content">
          <div v-if="history.summary" class="history-summary">
            <div class="summary-label">对话摘要</div>
            <p class="summary-text">{{ history.summary }}</p>
          </div>

          <div v-if="history.turns.length > 0" class="turns-list">
            <div class="turns-label">最近对话 ({{ history.turns.length }})</div>
            <div v-for="(turn, idx) in history.turns" :key="idx" class="turn-card">
              <div class="turn-user">
                <span class="turn-role">我</span>
                <span class="turn-text">{{ turn.user_input }}</span>
              </div>
              <div class="turn-ai">
                <span class="turn-role">小石光</span>
                <span class="turn-text">{{ turn.assistant_response }}</span>
              </div>
            </div>
          </div>

          <button
            class="clear-history-btn"
            :disabled="clearing"
            @click="onClearHistory"
          >
            {{ clearing ? '清除中...' : confirmingClear ? '确认清除？再次点击' : '清除对话历史' }}
          </button>
        </div>
      </template>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <button class="back-btn" @click="uiStore.openPanel('chat')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        返回对话
      </button>
    </div>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import {
  getMemories,
  deleteMemory,
  getConversationHistory,
  clearConversationHistory,
  type MemoryFact,
  type ConversationHistoryResponse,
} from '@/lib/api/chat'
import { getErrorMessage } from '@/lib/apiClient'

const uiStore = useUiStore()

const activeTab = ref<'facts' | 'history'>('facts')
const facts = ref<MemoryFact[]>([])
const loading = ref(false)
const deletingId = ref<string | null>(null)
const error = ref('')

const history = ref<ConversationHistoryResponse>({ turns: [], summary: '' })
const historyLoading = ref(false)
const clearing = ref(false)
const confirmingClear = ref(false)
let confirmTimer: ReturnType<typeof setTimeout> | null = null

const categoryLabels: Record<string, string> = {
  personal_info: '个人',
  family: '家庭',
  interest: '兴趣',
  concern: '关注',
  preference: '偏好',
  other: '其他',
}

function categoryLabel(category: string): string {
  return categoryLabels[category] ?? '其他'
}

function ownerLabel(fact: MemoryFact): string {
  if (fact.category === 'family') return '共同'
  return fact.owner_nickname || ''
}

watch(
  () => uiStore.activePanel,
  async (panel) => {
    if (panel === 'ai-memory') {
      activeTab.value = 'facts'
      await loadFacts()
    }
  },
)

watch(activeTab, async (tab) => {
  error.value = ''
  if (tab === 'facts' && facts.value.length === 0) {
    await loadFacts()
  } else if (tab === 'history' && history.value.turns.length === 0 && !history.value.summary) {
    await loadHistory()
  }
})

async function loadFacts() {
  loading.value = true
  error.value = ''
  try {
    const res = await getMemories()
    facts.value = res.facts
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  historyLoading.value = true
  error.value = ''
  try {
    history.value = await getConversationHistory()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    historyLoading.value = false
  }
}

async function onDelete(id: string) {
  deletingId.value = id
  error.value = ''
  try {
    await deleteMemory(id)
    facts.value = facts.value.filter((f) => f.id !== id)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    deletingId.value = null
  }
}

async function onClearHistory() {
  if (!confirmingClear.value) {
    confirmingClear.value = true
    confirmTimer = setTimeout(() => {
      confirmingClear.value = false
    }, 3000)
    return
  }

  if (confirmTimer) {
    clearTimeout(confirmTimer)
    confirmTimer = null
  }
  confirmingClear.value = false
  clearing.value = true
  error.value = ''
  try {
    await clearConversationHistory()
    history.value = { turns: [], summary: '' }
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    clearing.value = false
  }
}
</script>

<style scoped>
.ai-memory-panel {
  padding: 32px 28px 28px;
  min-height: 300px;
}

.panel-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 16px;
}

.tab-bar {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 8px 0;
  background: transparent;
  border: none;
  border-radius: 9px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
  font-weight: 500;
}

.tab-btn:hover:not(.active) {
  color: var(--text-primary);
}

.panel-subtitle {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}

.loading-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-secondary);
  font-size: 15px;
}

.empty-hint {
  font-size: 13px;
  margin-top: 8px;
  opacity: 0.7;
}

.facts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
  max-height: 50vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.fact-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  transition: background 0.2s;
}

.fact-card:hover {
  background: rgba(255, 255, 255, 0.09);
}

.fact-content {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.fact-category {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}

.fact-category[data-category="family"] {
  background: rgba(255, 182, 193, 0.18);
  color: #ffb6c1;
}

.fact-category[data-category="interest"] {
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
}

.fact-category[data-category="concern"] {
  background: rgba(135, 206, 235, 0.18);
  color: #87ceeb;
}

.fact-category[data-category="personal_info"] {
  background: rgba(200, 162, 255, 0.18);
  color: #c8a2ff;
}

.fact-category[data-category="preference"] {
  background: rgba(143, 188, 143, 0.18);
  color: #8fbc8f;
}

.fact-owner {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  letter-spacing: 0.2px;
}

.fact-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-word;
}

.fact-delete {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.fact-delete:hover:not(:disabled) {
  background: rgba(220, 60, 60, 0.15);
  border-color: rgba(220, 60, 60, 0.25);
  color: #ff9999;
}

.fact-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.deleting-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* History Tab */
.history-content {
  max-height: 50vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  margin-bottom: 20px;
}

.history-summary {
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  margin-bottom: 16px;
}

.summary-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}

.summary-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.6;
  opacity: 0.85;
}

.turns-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
  letter-spacing: 0.3px;
}

.turns-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.turn-card {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.turn-user,
.turn-ai {
  display: flex;
  gap: 10px;
  align-items: baseline;
}

.turn-role {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  letter-spacing: 0.3px;
}

.turn-user .turn-role {
  background: rgba(200, 162, 255, 0.15);
  color: #c8a2ff;
}

.turn-ai .turn-role {
  background: rgba(135, 206, 235, 0.15);
  color: #87ceeb;
}

.turn-text {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-word;
  opacity: 0.9;
}

.clear-history-btn {
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 10px 0;
  background: rgba(220, 60, 60, 0.1);
  border: 1px solid rgba(220, 60, 60, 0.2);
  border-radius: 12px;
  color: #ff9999;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-history-btn:hover:not(:disabled) {
  background: rgba(220, 60, 60, 0.18);
  border-color: rgba(220, 60, 60, 0.3);
}

.clear-history-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  padding: 10px 14px;
  background: rgba(220, 60, 60, 0.15);
  border: 1px solid rgba(220, 60, 60, 0.25);
  border-radius: 10px;
  color: #ff9999;
  font-size: 13px;
  margin-bottom: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 auto;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: var(--text-primary);
}
</style>
