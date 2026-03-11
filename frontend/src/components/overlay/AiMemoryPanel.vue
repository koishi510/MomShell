<template>
  <OverlayPanel :visible="uiStore.activePanel === 'ai-memory'" position="center" @close="uiStore.closePanel()">
    <div class="ai-memory-panel">
      <h2 class="panel-title">小石光的记忆</h2>
      <p class="panel-subtitle">这些是 AI 记住的关于你的信息，你可以随时删除</p>

      <div v-if="loading" class="loading-state">加载中...</div>

      <div v-else-if="facts.length === 0" class="empty-state">
        <p>还没有记忆条目</p>
        <p class="empty-hint">和小石光聊天时分享的信息会自动记录在这里</p>
      </div>

      <div v-else class="facts-list">
        <div v-for="fact in facts" :key="fact.id" class="fact-card">
          <div class="fact-content">
            <span class="fact-category" :data-category="fact.category">{{ categoryLabel(fact.category) }}</span>
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
import { getMemories, deleteMemory, type MemoryFact } from '@/lib/api/chat'
import { getErrorMessage } from '@/lib/apiClient'

const uiStore = useUiStore()

const facts = ref<MemoryFact[]>([])
const loading = ref(false)
const deletingId = ref<string | null>(null)
const error = ref('')

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

watch(
  () => uiStore.activePanel,
  async (panel) => {
    if (panel === 'ai-memory') {
      await loadFacts()
    }
  },
)

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
  margin-bottom: 6px;
}

.panel-subtitle {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
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
