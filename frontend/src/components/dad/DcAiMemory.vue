<template>
  <div class="dc-tab-content">
    <div class="dc-section-header">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm1-5h-2V7h2z"></path></svg>
      <span class="dc-sh-text">./memory.sh</span>
    </div>

    <!-- Tab bar -->
    <div class="dc-mem-tabs dc-float" style="--float-i:0">
      <button :class="['dc-mem-tab', { active: activeTab === 'facts' }]" @click="activeTab = 'facts'">facts</button>
      <button :class="['dc-mem-tab', { active: activeTab === 'history' }]" @click="activeTab = 'history'">history</button>
    </div>

    <!-- Facts Tab -->
    <template v-if="activeTab === 'facts'">
      <div class="dc-panel dc-float" style="--float-i:1">
        <div class="dc-panel-label">[ memory_store ]</div>

        <div v-if="loading" class="dc-state dc-state-sm">fetching_facts...</div>

        <div v-else-if="facts.length === 0" class="dc-state dc-state-sm">
          <span>no_entries</span>
          <span class="dc-hint"># 和小石光聊天时分享的信息会自动记录在这里</span>
        </div>

        <div v-else class="dc-facts-list">
          <div v-for="fact in facts" :key="fact.id" class="dc-fact-entry">
            <div class="dc-fact-content">
              <span :class="['dc-fact-cat', `dc-fcat-${fact.category}`]">{{ categoryLabel(fact.category) }}</span>
              <span v-if="fact.owner_nickname" class="dc-fact-owner">{{ ownerLabel(fact) }}</span>
              <span class="dc-fact-text">{{ fact.content }}</span>
            </div>
            <button class="dc-fact-del" :disabled="deletingId === fact.id" @click="onDelete(fact.id)">[×]</button>
          </div>
        </div>
      </div>
    </template>

    <!-- History Tab -->
    <template v-if="activeTab === 'history'">
      <div class="dc-panel dc-float" style="--float-i:1">
        <div class="dc-panel-label">[ conversation_log ]</div>

        <div v-if="historyLoading" class="dc-state dc-state-sm">fetching_history...</div>

        <div v-else-if="history.turns.length === 0 && !history.summary" class="dc-state dc-state-sm">
          <span>no_records</span>
          <span class="dc-hint"># 开始和小石光聊天后，对话会出现在这里</span>
        </div>

        <div v-else class="dc-history-content">
          <div v-if="history.summary" class="dc-summary-box">
            <div class="dc-summary-label"># summary</div>
            <p class="dc-summary-text">{{ history.summary }}</p>
          </div>

          <div v-if="history.turns.length > 0" class="dc-turns-section">
            <div class="dc-turns-label">recent_turns [{{ history.turns.length }}]</div>
            <div v-for="(turn, idx) in history.turns" :key="idx" class="dc-turn-entry">
              <div class="dc-turn-line">
                <span class="dc-turn-role dc-role-user">user</span>
                <span class="dc-turn-text">{{ turn.user_input }}</span>
              </div>
              <div class="dc-turn-line">
                <span class="dc-turn-role dc-role-ai">ai</span>
                <span class="dc-turn-text">{{ turn.assistant_response }}</span>
              </div>
            </div>
          </div>

          <button class="dc-danger-btn" :disabled="clearing" @click="onClearHistory">
            {{ clearing ? '> clearing...' : confirmingClear ? '> confirm? click_again' : '> clear_history' }}
          </button>
        </div>
      </div>
    </template>

    <div v-if="error" class="dc-error dc-float" style="--float-i:2">> ERROR: {{ error }}</div>

    <button class="dc-back-btn dc-float" style="--float-i:3" @click="emit('back')">
      > cd ../chat
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  getMemories,
  deleteMemory,
  getConversationHistory,
  clearConversationHistory,
  type MemoryFact,
  type ConversationHistoryResponse,
} from '@/lib/api/chat'
import { getErrorMessage } from '@/lib/apiClient'

const props = withDefaults(defineProps<{ visible?: boolean }>(), { visible: true })
const emit = defineEmits<{ back: [] }>()

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

watch(() => props.visible, async (active) => {
  if (active) {
    activeTab.value = 'facts'
    await loadFacts()
  }
}, { immediate: true })

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
    confirmTimer = setTimeout(() => { confirmingClear.value = false }, 3000)
    return
  }
  if (confirmTimer) { clearTimeout(confirmTimer); confirmTimer = null }
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

.dc-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 20px; color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 13px; }
.dc-state-sm { padding: 30px 16px; }
.dc-hint { font-size: 11px; color: var(--dc-comment, #565F89); opacity: 0.7; }

.dc-panel {
  background: var(--dc-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  padding: 20px;
  margin-bottom: 16px;
}
.dc-panel-label { font-family: var(--dc-font-mono); font-size: 12px; color: var(--dc-accent, #7DCFFF); margin-bottom: 16px; }

/* Tabs */
.dc-mem-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 16px;
  background: var(--dc-surface, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.06));
  border-radius: var(--dc-radius, 2px);
  padding: 2px;
}
.dc-mem-tab {
  flex: 1;
  padding: 8px 0;
  background: transparent;
  border: none;
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.dc-mem-tab.active { background: rgba(125, 207, 255, 0.1); color: var(--dc-accent, #7DCFFF); }
.dc-mem-tab:hover:not(.active) { color: var(--dc-text, #C0CAF5); }

/* Facts */
.dc-facts-list { display: flex; flex-direction: column; gap: 8px; max-height: 50vh; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent; }

.dc-fact-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--dc-bg, #1A1B26);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.06));
  border-radius: var(--dc-radius, 2px);
  transition: border-color 0.2s;
}
.dc-fact-entry:hover { border-color: rgba(125, 207, 255, 0.15); }

.dc-fact-content { flex: 1; display: flex; align-items: baseline; gap: 8px; min-width: 0; flex-wrap: wrap; }

.dc-fact-cat {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: var(--dc-radius, 2px);
  font-family: var(--dc-font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.dc-fcat-personal_info { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
.dc-fcat-family { background: rgba(247, 118, 142, 0.12); color: var(--dc-danger, #F7768E); }
.dc-fcat-interest { background: rgba(255, 158, 100, 0.12); color: var(--dc-warn, #FF9E64); }
.dc-fcat-concern { background: rgba(125, 207, 255, 0.12); color: var(--dc-accent, #7DCFFF); }
.dc-fcat-preference { background: rgba(158, 206, 106, 0.12); color: var(--dc-success, #9ECE6A); }
.dc-fcat-other { background: var(--dc-surface, rgba(255,255,255,0.05)); color: var(--dc-comment, #565F89); }

.dc-fact-owner { flex-shrink: 0; padding: 2px 6px; border-radius: var(--dc-radius, 2px); font-family: var(--dc-font-mono); font-size: 10px; background: var(--dc-surface, rgba(255,255,255,0.05)); color: var(--dc-comment, #565F89); }

.dc-fact-text { font-family: var(--dc-font-mono); font-size: 13px; color: var(--dc-text, #C0CAF5); line-height: 1.5; word-break: break-word; }

.dc-fact-del {
  flex-shrink: 0;
  background: transparent;
  border: 1px solid var(--dc-border, rgba(255,255,255,0.06));
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.dc-fact-del:hover:not(:disabled) { border-color: rgba(247, 118, 142, 0.3); color: var(--dc-danger, #F7768E); background: rgba(247, 118, 142, 0.08); }
.dc-fact-del:disabled { opacity: 0.5; cursor: not-allowed; }

/* History */
.dc-history-content { max-height: 50vh; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent; }

.dc-summary-box {
  padding: 12px;
  background: var(--dc-bg, #1A1B26);
  border: 1px solid var(--dc-border, rgba(255,255,255,0.06));
  border-radius: var(--dc-radius, 2px);
  margin-bottom: 16px;
}
.dc-summary-label { font-family: var(--dc-font-mono); font-size: 11px; color: var(--dc-comment, #565F89); margin-bottom: 8px; }
.dc-summary-text { font-family: var(--dc-font-mono); font-size: 13px; color: var(--dc-text, #C0CAF5); line-height: 1.6; margin: 0; }

.dc-turns-section { display: flex; flex-direction: column; gap: 8px; }
.dc-turns-label { font-family: var(--dc-font-mono); font-size: 11px; color: var(--dc-comment, #565F89); margin-bottom: 4px; }

.dc-turn-entry {
  padding: 10px 12px;
  background: var(--dc-bg, #1A1B26);
  border: 1px solid var(--dc-border, rgba(255,255,255,0.06));
  border-radius: var(--dc-radius, 2px);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dc-turn-line { display: flex; gap: 8px; align-items: baseline; }

.dc-turn-role {
  flex-shrink: 0;
  font-family: var(--dc-font-mono);
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--dc-radius, 2px);
}
.dc-role-user { background: rgba(167, 139, 250, 0.15); color: #a78bfa; }
.dc-role-ai { background: rgba(125, 207, 255, 0.12); color: var(--dc-accent, #7DCFFF); }

.dc-turn-text { font-family: var(--dc-font-mono); font-size: 12px; color: var(--dc-text, #C0CAF5); line-height: 1.5; word-break: break-word; }

.dc-danger-btn {
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 10px 0;
  background: rgba(247, 118, 142, 0.08);
  border: 1px solid rgba(247, 118, 142, 0.2);
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-danger, #F7768E);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.dc-danger-btn:hover:not(:disabled) { background: rgba(247, 118, 142, 0.15); border-color: rgba(247, 118, 142, 0.3); }
.dc-danger-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.dc-error {
  padding: 10px 14px;
  background: rgba(247, 118, 142, 0.08);
  border-left: 3px solid var(--dc-danger, #F7768E);
  color: var(--dc-danger, #F7768E);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  border-radius: var(--dc-radius, 2px);
  margin-bottom: 16px;
}

.dc-back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  padding: 10px 20px;
  background: transparent;
  border: 1px solid var(--dc-border, rgba(255,255,255,0.15));
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.dc-back-btn:hover { border-color: rgba(125, 207, 255, 0.3); color: var(--dc-accent, #7DCFFF); }
</style>
