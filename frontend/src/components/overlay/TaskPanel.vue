<template>
  <OverlayPanel :visible="uiStore.activePanel === 'task'" position="center" @close="uiStore.closePanel()">
    <div class="task-panel">
      <!-- Dad view: daily tasks -->
      <template v-if="isDad">
        <h2 class="panel-title">今日任务</h2>
        <p class="panel-subtitle">完成任务，一起成长</p>

        <!-- Stats bar -->
        <div v-if="stats" class="stats-bar">
          <span class="level-badge">Lv.{{ stats.level }}</span>
          <span class="xp-text">{{ stats.xp }} XP</span>
        </div>

        <div v-if="loading" class="loading-state">加载中...</div>

        <div v-else-if="tasks.length === 0" class="empty-state">今天没有任务</div>

        <div v-else class="task-list">
          <div v-for="t in tasks" :key="t.id" :class="['task-card', `status-${t.status}`]">
            <div class="task-header">
              <span :class="['category-badge', `cat-${t.category}`]">{{ categoryLabel(t.category) }}</span>
              <span class="difficulty">{{ difficultyStars(t.difficulty) }}</span>
            </div>
            <h3 class="task-title">{{ t.title }}</h3>
            <p class="task-desc">{{ t.description }}</p>
            <div class="task-footer">
              <span v-if="t.status === 'pending'" class="status-text pending">待完成</span>
              <span v-else-if="t.status === 'completed'" class="status-text completed">已完成，等待验收</span>
              <span v-else class="status-text verified">已验收 {{ t.score }}/5</span>
              <button
                v-if="t.status === 'pending'"
                class="action-btn complete-btn"
                :disabled="completing === t.id"
                @click="onComplete(t.id)"
              >
                {{ completing === t.id ? '...' : '完成' }}
              </button>
            </div>
            <p v-if="t.comment && t.status === 'verified'" class="score-comment">{{ t.comment }}</p>
          </div>
        </div>
      </template>

      <!-- Mom view: partner tasks review -->
      <template v-else>
        <h2 class="panel-title">伴侣任务</h2>
        <p class="panel-subtitle">查看他的完成情况</p>

        <!-- Stats bar -->
        <div v-if="stats" class="stats-bar">
          <span class="level-badge">Lv.{{ stats.level }}</span>
          <span class="xp-text">{{ stats.xp }} XP</span>
        </div>

        <div v-if="loading" class="loading-state">加载中...</div>

        <div v-else-if="tasks.length === 0" class="empty-state">今天还没有任务</div>

        <div v-else class="task-list">
          <div v-for="t in tasks" :key="t.id" :class="['task-card', `status-${t.status}`]">
            <div class="task-header">
              <span :class="['category-badge', `cat-${t.category}`]">{{ categoryLabel(t.category) }}</span>
              <span class="difficulty">{{ difficultyStars(t.difficulty) }}</span>
            </div>
            <h3 class="task-title">{{ t.title }}</h3>
            <p class="task-desc">{{ t.description }}</p>
            <div class="task-footer">
              <span v-if="t.status === 'pending'" class="status-text pending">未完成</span>
              <span v-else-if="t.status === 'completed'" class="status-text completed">待验收</span>
              <span v-else class="status-text verified">已验收 {{ t.score }}/5</span>
            </div>

            <!-- Score UI for completed tasks -->
            <div v-if="t.status === 'completed'" class="score-section">
              <div class="score-stars">
                <button
                  v-for="s in 5"
                  :key="s"
                  :class="['star-btn', { active: (scoreMap[t.id]?.score ?? 0) >= s }]"
                  @click="setScore(t.id, s)"
                >
                  {{ (scoreMap[t.id]?.score ?? 0) >= s ? '★' : '☆' }}
                </button>
              </div>
              <input
                v-model="scoreMap[t.id]!.comment"
                class="score-input"
                placeholder="留一句评价..."
                maxlength="500"
              />
              <div class="score-actions">
                <button
                  class="action-btn reject-btn"
                  :disabled="scoring === t.id"
                  @click="onReject(t.id)"
                >
                  {{ scoring === t.id ? '...' : '未完成' }}
                </button>
                <button
                  class="action-btn score-btn"
                  :disabled="scoring === t.id || !(scoreMap[t.id]?.score)"
                  @click="onScore(t.id)"
                >
                  {{ scoring === t.id ? '提交中...' : '验收' }}
                </button>
              </div>
            </div>

            <p v-if="t.comment && t.status === 'verified'" class="score-comment">{{ t.comment }}</p>
          </div>
        </div>
      </template>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref, watch, computed, reactive, onUnmounted } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import {
  getDailyTasks,
  getPartnerTasks,
  completeTask,
  scoreTask,
  rejectTask,
  getTaskStats,
  type UserTaskItem,
  type TaskStats,
} from '@/lib/api/task'
import { getErrorMessage } from '@/lib/apiClient'

const uiStore = useUiStore()
const authStore = useAuthStore()

const isDad = computed(() => authStore.user?.role === 'dad')

const tasks = ref<UserTaskItem[]>([])
const stats = ref<TaskStats | null>(null)
const loading = ref(false)
const error = ref('')
const completing = ref('')
const scoring = ref('')
const scoreMap = reactive<Record<string, { score: number; comment: string }>>({})
let pollTimer: ReturnType<typeof setInterval> | null = null

async function fetchTasks() {
  const [taskList, taskStats] = await Promise.all([
    isDad.value ? getDailyTasks() : getPartnerTasks(),
    getTaskStats(),
  ])
  tasks.value = taskList
  stats.value = taskStats
  initScoreMap(taskList)
}

function initScoreMap(taskList: UserTaskItem[]) {
  for (const t of taskList) {
    if (t.status === 'completed' && !scoreMap[t.id]) {
      scoreMap[t.id] = { score: 0, comment: '' }
    }
  }
}

async function pollTasks() {
  try {
    const [taskList, taskStats] = await Promise.all([
      isDad.value ? getDailyTasks() : getPartnerTasks(),
      getTaskStats(),
    ])
    for (const incoming of taskList) {
      const existing = tasks.value.find((t) => t.id === incoming.id)
      if (existing) {
        if (existing.status !== incoming.status) existing.status = incoming.status
        if (existing.score !== incoming.score) existing.score = incoming.score
        if (existing.comment !== incoming.comment) existing.comment = incoming.comment
        if (existing.completed_at !== incoming.completed_at) existing.completed_at = incoming.completed_at
        if (existing.scored_at !== incoming.scored_at) existing.scored_at = incoming.scored_at
      }
    }
    if (stats.value?.xp !== taskStats.xp || stats.value?.level !== taskStats.level) {
      stats.value = taskStats
    }
    initScoreMap(taskList)
  } catch {
    // Silently ignore poll errors
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(pollTasks, 10000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onUnmounted(stopPolling)

watch(
  () => uiStore.activePanel,
  async (panel) => {
    if (panel === 'task') {
      error.value = ''
      loading.value = true
      try {
        await fetchTasks()
      } catch (e) {
        error.value = getErrorMessage(e)
      } finally {
        loading.value = false
      }
      startPolling()
    } else {
      stopPolling()
    }
  },
)

async function onComplete(id: string) {
  completing.value = id
  error.value = ''
  try {
    const updated = await completeTask(id)
    tasks.value = tasks.value.map((t) => (t.id === id ? updated : t))
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    completing.value = ''
  }
}

function setScore(taskId: string, score: number) {
  if (!scoreMap[taskId]) scoreMap[taskId] = { score: 0, comment: '' }
  scoreMap[taskId].score = score
}

async function onScore(id: string) {
  const entry = scoreMap[id]
  if (!entry || !entry.score) return

  scoring.value = id
  error.value = ''
  try {
    const updated = await scoreTask(id, {
      score: entry.score,
      comment: entry.comment || undefined,
    })
    tasks.value = tasks.value.map((t) => (t.id === id ? updated : t))
    stats.value = await getTaskStats()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    scoring.value = ''
  }
}

async function onReject(id: string) {
  const entry = scoreMap[id]
  scoring.value = id
  error.value = ''
  try {
    const updated = await rejectTask(id, {
      comment: entry?.comment || undefined,
    })
    tasks.value = tasks.value.map((t) => (t.id === id ? updated : t))
    delete scoreMap[id]
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    scoring.value = ''
  }
}

const categoryLabels: Record<string, string> = {
  housework: '家务',
  parenting: '育儿',
  health: '健康',
  emotional: '情感',
}

function categoryLabel(cat: string) {
  return categoryLabels[cat] || cat
}

function difficultyStars(d: number) {
  return '★'.repeat(d)
}
</script>

<style scoped>
.task-panel {
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
  margin-bottom: 16px;
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.level-badge {
  padding: 4px 14px;
  background: var(--accent-warm);
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
}

.xp-text {
  color: var(--text-secondary);
  font-size: 14px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: border-color 0.2s;
}

.task-card.status-completed {
  border-color: rgba(255, 200, 80, 0.3);
}

.task-card.status-verified {
  border-color: rgba(80, 200, 120, 0.3);
  background: rgba(80, 200, 120, 0.05);
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.category-badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.cat-housework { background: rgba(100, 180, 255, 0.15); color: #8ac4ff; }
.cat-parenting { background: rgba(255, 180, 100, 0.15); color: #ffc070; }
.cat-health { background: rgba(100, 220, 150, 0.15); color: #80e0a0; }
.cat-emotional { background: rgba(220, 140, 255, 0.15); color: #d8a0ff; }

.difficulty {
  color: var(--accent-warm);
  font-size: 14px;
  letter-spacing: 2px;
}

.task-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.task-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.task-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-text {
  font-size: 13px;
  font-weight: 500;
}

.status-text.pending { color: var(--text-secondary); }
.status-text.completed { color: #ffc060; }
.status-text.verified { color: #80e0a0; }

.action-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.action-btn:active { transform: scale(0.96); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.complete-btn {
  background: var(--accent-warm);
  color: #fff;
}

.complete-btn:hover { background: var(--accent-warm-hover); }

.score-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.score-stars {
  display: flex;
  gap: 6px;
}

.star-btn {
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 22px;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
  line-height: 1;
}

.star-btn.active {
  color: var(--accent-warm);
}

.star-btn:hover {
  transform: scale(1.2);
}

.score-input {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.score-input::placeholder { color: var(--text-secondary); }

.score-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.score-btn {
  background: rgba(80, 200, 120, 0.8);
  color: #fff;
}

.score-btn:hover { background: rgba(80, 200, 120, 1); }

.reject-btn {
  background: rgba(255, 160, 80, 0.3);
  color: #ffb060;
}

.reject-btn:hover { background: rgba(255, 160, 80, 0.5); }

.score-comment {
  margin-top: 8px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-secondary);
  font-style: italic;
}

.error-msg {
  margin-top: 16px;
  padding: 10px 14px;
  background: rgba(220, 60, 60, 0.15);
  border: 1px solid rgba(220, 60, 60, 0.25);
  border-radius: 10px;
  color: #ff9999;
  font-size: 13px;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
