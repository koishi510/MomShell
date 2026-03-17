<template>
  <div class="dad-console">
    <!-- ── Ambient Background ── -->
    <div class="dc-ambient-bg">
      <div class="dc-grid-overlay"></div>
    </div>

    <!-- ── Header ── -->
    <DcHeader
      :stats="stats"
      :current-age="currentAge"
      @open-age-picker="showAgeMenu = true"
    />

    <!-- ── Tab Bar (top, below header) ── -->
    <DcTabBar v-model="activeTab" />

    <!-- ── Scrollable Body ── -->
    <main class="dc-body">
      <!-- Tasks -->
      <DcTaskList
        v-if="activeTab === 'tasks'"
        :sorted-tasks="sortedTasks"
        :loading="loading"
        :has-age="!!currentAge"
        :completing="completing"
        :regenerating="regenerating"
        :error="error"
        @complete="openCompleteDialog"
        @regenerate="onRegenerate"
        @open-age-picker="showAgeMenu = true"
      />

      <!-- Dashboard -->
      <DcDashboard
        v-else-if="activeTab === 'dashboard'"
        :loading="loadingDashboard"
        :error="dashboardError"
        :radar="skillRadar"
        :achievements="achievements"
        :perk-cards="perkCards"
        :using-perk="usingPerk"
        @use-perk="onUsePerk"
      />

      <!-- Chat -->
      <div v-else-if="activeTab === 'chat'" class="dc-tab-content-full">
        <div class="dc-section-header dc-sh-overlay">
          <div class="dc-sh-line"></div>
          <span class="dc-sh-text">SYS.COMMS</span>
        </div>
        <ChatPanel :embedded="true" />
      </div>

      <!-- Community -->
      <div v-else-if="activeTab === 'community'" class="dc-tab-content-full">
        <div class="dc-section-header dc-sh-overlay">
          <div class="dc-sh-line"></div>
          <span class="dc-sh-text">SYS.NETWORK</span>
        </div>
        <CommunityPanel :embedded="true" />
      </div>

      <!-- Whisper -->
      <div v-else-if="activeTab === 'whisper'" class="dc-tab-content-full">
        <div class="dc-section-header dc-sh-overlay">
          <div class="dc-sh-line"></div>
          <span class="dc-sh-text">SYS.DECRYPT</span>
        </div>
        <WhisperPanel :embedded="true" />
      </div>

      <!-- Profile -->
      <div v-else-if="activeTab === 'profile'" class="dc-profile-wrap">
        <div class="dc-section-header">
          <div class="dc-sh-line"></div>
          <span class="dc-sh-text">SYS.CONFIG</span>
        </div>
        <ProfilePanel :embedded="true" />
        <button class="dc-logout-btn" @click="onLogout">> TERMINATE_SESSION</button>
      </div>
    </main>

    <!-- ── Dialogs ── -->
    <DcMemoryCardDialog
      :visible="showCompleteDialog"
      :target-title="completeTarget?.title ?? ''"
      :preview-url="cardPreviewUrl"
      :generating="generatingCard"
      :uploading="proofUploading"
      :error="completeDialogError"
      @close="closeCompleteDialog"
      @generate="onGenerateCard"
      @upload="onProofFileChange"
      @reset="resetCard"
      @submit-without-card="submitWithoutCard"
      @submit-with-card="submitWithCard"
    />

    <DcAgePicker
      :visible="showAgeMenu"
      :current-age="currentAge"
      :disabled="settingAge"
      @select="onSelectAge"
      @close="showAgeMenu = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ChatPanel from '@/components/overlay/ChatPanel.vue'
import CommunityPanel from '@/components/overlay/CommunityPanel.vue'
import WhisperPanel from '@/components/overlay/WhisperPanel.vue'
import ProfilePanel from '@/components/overlay/ProfilePanel.vue'
import DcHeader from './DcHeader.vue'
import DcTabBar from './DcTabBar.vue'
import DcTaskList from './DcTaskList.vue'
import DcDashboard from './DcDashboard.vue'
import DcMemoryCardDialog from './DcMemoryCardDialog.vue'
import DcAgePicker from './DcAgePicker.vue'
import { uploadPhoto } from '@/lib/api/photo'
import {
  completeTask,
  generateTaskCard,
  getAchievements,
  getBabyAge,
  getDailyTasks,
  getSkillRadar,
  getTaskStats,
  regenerateTasks,
  type AchievementItem,
  type SkillRadar,
  type TaskStats,
  type UserTaskItem,
} from '@/lib/api/task'
import { getErrorMessage } from '@/lib/apiClient'
import { getPerkCards, usePerkCard, type PerkCardItem } from '@/lib/api/perkCard'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const authStore = useAuthStore()
const uiStore = useUiStore()

// ── Tabs ──
type Tab = 'tasks' | 'dashboard' | 'chat' | 'community' | 'whisper' | 'profile'
const activeTab = ref<Tab>('tasks')

function onLogout() {
  authStore.logout()
  uiStore.openAuth()
}

// ── Tasks ──
const tasks = ref<UserTaskItem[]>([])
const stats = ref<TaskStats | null>(null)
const loading = ref(false)
const error = ref('')
const completing = ref('')
const regenerating = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const priorityRank: Record<string, number> = { T0: 3, T1: 2, T2: 1 }
const statusRank: Record<string, number> = { pending: 3, completed: 2, verified: 1 }

const sortedTasks = computed(() =>
  [...tasks.value].sort((a, b) => {
    const byStatus = (statusRank[b.status] ?? 0) - (statusRank[a.status] ?? 0)
    if (byStatus !== 0) return byStatus
    return (priorityRank[b.priority || 'T2'] ?? 0) - (priorityRank[a.priority || 'T2'] ?? 0)
  }),
)

async function fetchTasks() {
  const [taskList, taskStats] = await Promise.all([getDailyTasks(), getTaskStats()])
  tasks.value = taskList
  stats.value = taskStats
}

function mergeTaskList(incoming: UserTaskItem[]) {
  for (const inc of incoming) {
    const ex = tasks.value.find((t) => t.id === inc.id)
    if (ex) {
      if (ex.status !== inc.status) ex.status = inc.status
      if (ex.score !== inc.score) ex.score = inc.score
      if (ex.comment !== inc.comment) ex.comment = inc.comment
      if (ex.proof_photo_url !== inc.proof_photo_url) ex.proof_photo_url = inc.proof_photo_url
      if (ex.completed_at !== inc.completed_at) ex.completed_at = inc.completed_at
      if (ex.scored_at !== inc.scored_at) ex.scored_at = inc.scored_at
    }
  }
}

async function pollTasks() {
  try {
    const [taskList, taskStats] = await Promise.all([getDailyTasks(), getTaskStats()])
    mergeTaskList(taskList)
    if (stats.value?.xp !== taskStats.xp || stats.value?.level !== taskStats.level) {
      stats.value = taskStats
    }
  } catch { /* ignore */ }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(pollTasks, 10000)
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

// ── Dashboard ──
const loadingDashboard = ref(false)
const dashboardError = ref('')
const skillRadar = ref<SkillRadar | null>(null)
const achievements = ref<AchievementItem[]>([])
const perkCards = ref<PerkCardItem[]>([])
const usingPerk = ref('')

async function fetchDashboard() {
  loadingDashboard.value = true
  dashboardError.value = ''
  try {
    const [radar, achList, cards] = await Promise.all([getSkillRadar(), getAchievements(), getPerkCards()])
    skillRadar.value = radar
    achievements.value = achList
    perkCards.value = cards
  } catch (e) {
    dashboardError.value = getErrorMessage(e)
  } finally {
    loadingDashboard.value = false
  }
}

async function onUsePerk(id: string) {
  usingPerk.value = id
  dashboardError.value = ''
  try {
    const updated = await usePerkCard(id)
    perkCards.value = perkCards.value.map((c) => (c.id === id ? updated : c))
  } catch (e) {
    dashboardError.value = getErrorMessage(e)
  } finally {
    usingPerk.value = ''
  }
}

// ── Complete dialog (memory card) ──
const showCompleteDialog = ref(false)
const completeTarget = ref<UserTaskItem | null>(null)
const proofFile = ref<File | null>(null)
const proofUploading = ref(false)
const completeDialogError = ref('')
const generatingCard = ref(false)
const cardPreviewUrl = ref('')

function resetCard() {
  if (cardPreviewUrl.value && cardPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(cardPreviewUrl.value)
  }
  proofFile.value = null
  cardPreviewUrl.value = ''
}

function openCompleteDialog(task: UserTaskItem) {
  completeTarget.value = task
  completeDialogError.value = ''
  resetCard()
  showCompleteDialog.value = true
}

function closeCompleteDialog() {
  showCompleteDialog.value = false
  completeTarget.value = null
  completeDialogError.value = ''
  resetCard()
}

function onProofFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  resetCard()
  if (file) {
    proofFile.value = file
    cardPreviewUrl.value = URL.createObjectURL(file)
  }
  input.value = ''
}

async function onGenerateCard() {
  if (!completeTarget.value) return
  generatingCard.value = true
  completeDialogError.value = ''
  try {
    const resp = await generateTaskCard(completeTarget.value.id)
    cardPreviewUrl.value = resp.image_url
  } catch (e) {
    completeDialogError.value = getErrorMessage(e)
  } finally {
    generatingCard.value = false
  }
}

async function submitWithoutCard() {
  if (!completeTarget.value) return
  const id = completeTarget.value.id
  completing.value = id
  proofUploading.value = true
  completeDialogError.value = ''
  try {
    const updated = await completeTask(id)
    tasks.value = tasks.value.map((t) => (t.id === id ? updated : t))
    closeCompleteDialog()
  } catch (e) {
    completeDialogError.value = getErrorMessage(e)
  } finally {
    proofUploading.value = false
    completing.value = ''
  }
}

async function submitWithCard() {
  if (!completeTarget.value || !cardPreviewUrl.value) return
  const id = completeTarget.value.id
  completing.value = id
  proofUploading.value = true
  completeDialogError.value = ''
  try {
    let imageUrl = cardPreviewUrl.value
    if (proofFile.value) {
      const uploaded = await uploadPhoto(proofFile.value, `记忆卡片：${completeTarget.value.title}`)
      imageUrl = uploaded.image_url
    }
    const updated = await completeTask(id, { proof_photo_url: imageUrl })
    tasks.value = tasks.value.map((t) => (t.id === id ? updated : t))
    closeCompleteDialog()
  } catch (e) {
    completeDialogError.value = getErrorMessage(e)
  } finally {
    proofUploading.value = false
    completing.value = ''
  }
}

// ── Age picker ──
const showAgeMenu = ref(false)
const currentAge = ref('')
const settingAge = ref(false)

async function fetchBabyAge() {
  try {
    const resp = await getBabyAge()
    currentAge.value = resp.age_stage || ''
  } catch { /* ignore */ }
}

async function onRegenerate() {
  regenerating.value = true
  error.value = ''
  try {
    const newTasks = await regenerateTasks()
    tasks.value = newTasks
    stats.value = await getTaskStats()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    regenerating.value = false
  }
}

async function onSelectAge(value: string) {
  settingAge.value = true
  error.value = ''
  try {
    const { setBabyAge } = await import('@/lib/api/task')
    await setBabyAge(value)
    currentAge.value = value
    showAgeMenu.value = false
    loading.value = true
    await fetchTasks()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    settingAge.value = false
    loading.value = false
  }
}

// ── Lifecycle ──
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([fetchTasks(), fetchBabyAge()])
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
  startPolling()
})

onUnmounted(stopPolling)

watch(
  () => uiStore.activePanel,
  (panel) => {
    if (panel) stopPolling()
    else startPolling()
  },
)

watch(activeTab, async (tab) => {
  if (tab === 'tasks') {
    startPolling()
  } else {
    stopPolling()
    if (tab === 'dashboard') await fetchDashboard()
  }
})
</script>

<style scoped>
/* ── Theme variables ── */
.dad-console {
  --dc-bg: #0a0e14;
  --dc-bg2: #0f1419;
  --dc-surface: rgba(255, 255, 255, 0.03);
  --dc-border: rgba(255, 255, 255, 0.06);

  /* Iridescent spectrum */
  --dc-iri-blue: #7dd3fc;
  --dc-iri-violet: #a78bfa;
  --dc-iri-pink: #f0abfc;
  --dc-iri-cyan: #67e8f9;
  --dc-iri-gold: #fbbf24;

  --dc-accent: #7dd3fc;
  --dc-accent-dim: rgba(125, 211, 252, 0.12);
  --dc-gradient-iri: linear-gradient(135deg, #7dd3fc, #a78bfa, #f0abfc, #67e8f9);

  /* Terminal syntax */
  --dc-prompt: #7dd3fc;
  --dc-cmd: #a5d6ff;
  --dc-string: #a5d6a7;
  --dc-comment: rgba(255, 255, 255, 0.3);

  /* Semantic */
  --dc-success: #2dd4bf;
  --dc-danger: #f87171;
  --dc-warn: #fbbf24;

  /* Typography */
  --dc-font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  --dc-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ── Layout ── */
.dad-console {
  position: fixed;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--dc-bg);
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--dc-font-sans);
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

/* ── Ambient Background ── */
.dc-ambient-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.dc-grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 30px 30px;
  mask-image: radial-gradient(circle at center, black 20%, transparent 80%);
  -webkit-mask-image: radial-gradient(circle at center, black 20%, transparent 80%);
}

/* ── Body ── */
.dc-body {
  position: relative;
  z-index: 10;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 16px 20px 24px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.06) transparent;
}

.dc-tab-content-full {
  height: 100%;
  position: relative;
  margin: -16px -20px -24px;
}

/* Section headers for embedded panels */
.dc-section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-top: 8px;
}

.dc-sh-overlay {
  position: absolute;
  top: 16px;
  left: 20px;
  right: 20px;
  z-index: 10;
  pointer-events: none;
}

.dc-sh-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent);
}

.dc-sh-text {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 2px;
}

/* ── Profile ── */
.dc-profile-wrap {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.dc-profile-wrap :deep(.overlay-panel),
.dc-profile-wrap :deep(.embedded-panel) {
  flex: 0 1 auto;
  overflow-y: auto;
}

.dc-logout-btn {
  flex-shrink: 0;
  margin-top: 24px;
  margin-bottom: 8px;
  width: 100%;
  padding: 14px;
  background: rgba(248, 113, 113, 0.05);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 6px;
  color: #f87171;
  font-family: var(--dc-font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.dc-logout-btn:hover { background: rgba(248, 113, 113, 0.12); }

/* ── Desktop ── */
@media (min-width: 769px) {
  .dc-body {
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }
}

/* ═══════════════════════════════════════════════════════
   Embedded Panel Shell Overrides (:deep)
   All panels inside .dad-console get terminal styling
   without modifying their source files.
   ═══════════════════════════════════════════════════════ */

/* ── OverlayPanel wrapper ── */
.dad-console :deep(.overlay-panel) {
  background: #0a0e14;
  backdrop-filter: none;
}

/* ── ChatPanel (SYS.COMMS) ── */
.dad-console :deep(.chat-panel) {
  background: #0a0e14 !important;
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.chat-panel .ambient-bg) {
  background: radial-gradient(ellipse at 50% 80%, rgba(125, 211, 252, 0.04), transparent 70%) !important;
}

.dad-console :deep(.chat-header) {
  background: transparent;
}

.dad-console :deep(.memory-btn) {
  color: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  background: transparent;
}

.dad-console :deep(.memory-btn:hover) {
  color: #7dd3fc;
  border-color: rgba(125, 211, 252, 0.3);
}

.dad-console :deep(.chat-empty) {
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.empty-greeting) {
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  font-size: 18px;
}

.dad-console :deep(.empty-subtitle) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.msg-text.user-text) {
  background: rgba(125, 211, 252, 0.08);
  border: 1px solid rgba(125, 211, 252, 0.15);
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.msg-text.assistant-text) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.typing-dots span) {
  background: #7dd3fc;
}

.dad-console :deep(.chat-input-area) {
  background: rgba(10, 14, 20, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.dad-console :deep(.chat-input) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.chat-input:focus) {
  border-color: rgba(125, 211, 252, 0.3);
  box-shadow: 0 0 12px rgba(125, 211, 252, 0.08);
}

.dad-console :deep(.chat-input::placeholder) {
  color: rgba(255, 255, 255, 0.2);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.send-btn) {
  background: transparent;
  border: 1px solid rgba(125, 211, 252, 0.3);
  color: #7dd3fc;
  border-radius: 6px;
}

.dad-console :deep(.send-btn:hover) {
  background: rgba(125, 211, 252, 0.08);
}

.dad-console :deep(.memory-toast) {
  background: rgba(15, 20, 25, 0.95);
  border: 1px solid rgba(125, 211, 252, 0.2);
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
}

/* ── CommunityPanel (SYS.NETWORK) ── */
.dad-console :deep(.community-panel) {
  background: #0a0e14;
  font-family: var(--dc-font-sans);
}

.dad-console :deep(.community-panel .panel-title) {
  font-family: var(--dc-font-mono);
  color: #fff;
  letter-spacing: 1px;
}

.dad-console :deep(.channel-tabs) {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  overflow: hidden;
}

.dad-console :deep(.channel-tab) {
  background: transparent;
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  border: none;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s;
}

.dad-console :deep(.channel-tab:last-child) {
  border-right: none;
}

.dad-console :deep(.channel-tab.active) {
  background: rgba(125, 211, 252, 0.08);
  color: #7dd3fc;
}

.dad-console :deep(.channel-tab:hover) {
  color: rgba(255, 255, 255, 0.6);
}

.dad-console :deep(.create-btn) {
  background: transparent;
  border: 1px solid rgba(125, 211, 252, 0.3);
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.create-btn:hover) {
  background: rgba(125, 211, 252, 0.08);
}

.dad-console :deep(.question-card) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  transition: border-color 0.2s;
}

.dad-console :deep(.question-card:hover) {
  border-color: rgba(125, 211, 252, 0.15);
}

.dad-console :deep(.q-title) {
  color: #fff;
  font-weight: 600;
}

.dad-console :deep(.q-preview) {
  color: rgba(255, 255, 255, 0.4);
}

.dad-console :deep(.q-tag) {
  background: rgba(125, 211, 252, 0.08);
  border: 1px solid rgba(125, 211, 252, 0.15);
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  font-size: 10px;
  border-radius: 4px;
}

.dad-console :deep(.q-meta) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
  font-size: 11px;
}

.dad-console :deep(.author-tag) {
  color: rgba(167, 139, 250, 0.7);
}

.dad-console :deep(.q-like-action .icon-like.active) {
  color: #f0abfc;
}

.dad-console :deep(.q-collect-action .icon-collect.active) {
  color: #fbbf24;
}

.dad-console :deep(.load-more-btn) {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.load-more-btn:hover:not(:disabled)) {
  border-color: rgba(125, 211, 252, 0.2);
  color: #7dd3fc;
}

.dad-console :deep(.community-panel .loading-state),
.dad-console :deep(.community-panel .empty-state) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
}

/* Community compose/detail overlays */
.dad-console :deep(.compose-overlay),
.dad-console :deep(.detail-overlay) {
  background: rgba(0, 0, 0, 0.8);
}

.dad-console :deep(.compose-form),
.dad-console :deep(.detail-panel) {
  background: #0f1419;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.dad-console :deep(.compose-title) {
  font-family: var(--dc-font-mono);
  color: #fff;
}

.dad-console :deep(.compose-input),
.dad-console :deep(.compose-textarea) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.compose-input:focus),
.dad-console :deep(.compose-textarea:focus) {
  border-color: rgba(125, 211, 252, 0.3);
}

/* ── WhisperPanel (SYS.DECRYPT) ── */
.dad-console :deep(.whisper-panel) {
  background: #0a0e14;
}

.dad-console :deep(.whisper-panel .panel-title) {
  font-family: var(--dc-font-mono);
  color: #fff;
  letter-spacing: 1px;
}

.dad-console :deep(.whisper-panel .panel-subtitle) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.whisper-textarea) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.whisper-textarea:focus) {
  border-color: rgba(125, 211, 252, 0.3);
  box-shadow: 0 0 12px rgba(125, 211, 252, 0.08);
}

.dad-console :deep(.whisper-textarea::placeholder) {
  color: rgba(255, 255, 255, 0.2);
}

.dad-console :deep(.whisper-panel .submit-btn) {
  background: transparent;
  border: 1px solid rgba(125, 211, 252, 0.3);
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.whisper-panel .submit-btn:hover) {
  background: rgba(125, 211, 252, 0.08);
}

.dad-console :deep(.whisper-panel .section-title) {
  font-family: var(--dc-font-mono);
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
}

.dad-console :deep(.whisper-card) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.dad-console :deep(.whisper-content) {
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.whisper-time) {
  color: rgba(255, 255, 255, 0.2);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.tips-card) {
  background: rgba(167, 139, 250, 0.05);
  border: 1px solid rgba(167, 139, 250, 0.15);
  border-radius: 6px;
}

.dad-console :deep(.tips-label) {
  font-family: var(--dc-font-mono);
  color: #a78bfa;
}

.dad-console :deep(.tips-content) {
  color: rgba(255, 255, 255, 0.6);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.tips-btn) {
  background: transparent;
  border: 1px solid rgba(167, 139, 250, 0.3);
  color: #a78bfa;
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.tips-btn:hover) {
  background: rgba(167, 139, 250, 0.08);
}

.dad-console :deep(.whisper-panel .loading-state),
.dad-console :deep(.whisper-panel .empty-state) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.whisper-panel .error-msg) {
  background: rgba(248, 113, 113, 0.08);
  border-left: 3px solid #f87171;
  color: #f87171;
  font-family: var(--dc-font-mono);
  border-radius: 0 6px 6px 0;
}

.dad-console :deep(.whisper-panel .success-msg) {
  background: rgba(45, 212, 191, 0.08);
  border-left: 3px solid #2dd4bf;
  color: #2dd4bf;
  font-family: var(--dc-font-mono);
  border-radius: 0 6px 6px 0;
}

/* ── ProfilePanel (SYS.CONFIG) ── */
.dad-console :deep(.profile-panel) {
  background: transparent;
}

.dad-console :deep(.profile-header) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.dad-console :deep(.profile-avatar) {
  border: 2px solid rgba(125, 211, 252, 0.2);
}

.dad-console :deep(.profile-avatar img) {
  border-radius: 50%;
}

.dad-console :deep(.avatar-placeholder) {
  background: rgba(125, 211, 252, 0.1);
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.avatar-edit-hint) {
  background: rgba(10, 14, 20, 0.9);
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.profile-name) {
  color: #fff;
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.edit-icon) {
  color: rgba(255, 255, 255, 0.2);
}

.dad-console :deep(.profile-username) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.role-badge) {
  background: rgba(125, 211, 252, 0.1);
  border: 1px solid rgba(125, 211, 252, 0.2);
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  font-size: 11px;
  border-radius: 4px;
}

.dad-console :deep(.nickname-input) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(125, 211, 252, 0.3);
  color: #fff;
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.stats-grid) {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
}

.dad-console :deep(.stat-value) {
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  font-variant-numeric: tabular-nums;
}

.dad-console :deep(.stat-label) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
  font-size: 11px;
}

.dad-console :deep(.settings-heading) {
  font-family: var(--dc-font-mono);
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
  font-size: 12px;
}

.dad-console :deep(.form-label) {
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--dc-font-mono);
  font-size: 11px;
}

.dad-console :deep(.form-input) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.form-input:focus) {
  border-color: rgba(125, 211, 252, 0.3);
  box-shadow: 0 0 12px rgba(125, 211, 252, 0.08);
}

.dad-console :deep(.form-input::placeholder) {
  color: rgba(255, 255, 255, 0.2);
}

.dad-console :deep(.profile-panel .submit-btn) {
  background: transparent;
  border: 1px solid rgba(125, 211, 252, 0.3);
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.profile-panel .submit-btn:hover:not(:disabled)) {
  background: rgba(125, 211, 252, 0.08);
}

.dad-console :deep(.upload-btn) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.upload-btn:hover:not(:disabled)) {
  border-color: rgba(125, 211, 252, 0.2);
  color: #7dd3fc;
}

.dad-console :deep(.upload-hint) {
  color: rgba(255, 255, 255, 0.2);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.danger-btn) {
  background: rgba(248, 113, 113, 0.05);
  border: 1px solid rgba(248, 113, 113, 0.2);
  color: #f87171;
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.danger-btn:hover:not(:disabled)) {
  background: rgba(248, 113, 113, 0.12);
}

.dad-console :deep(.inline-error),
.dad-console :deep(.form-error) {
  color: #f87171;
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.form-success) {
  color: #2dd4bf;
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.partner-card) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.dad-console :deep(.partner-label) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.partner-name) {
  color: #fff;
}

.dad-console :deep(.partner-role) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.shell-code-display) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-family: var(--dc-font-mono);
  color: #7dd3fc;
  border-radius: 6px;
}

/* ── AiMemoryPanel (inline in Chat) ── */
.dad-console :deep(.ai-memory-panel) {
  background: transparent;
}

.dad-console :deep(.ai-memory-panel .panel-title) {
  font-family: var(--dc-font-mono);
  color: #fff;
  letter-spacing: 1px;
}

.dad-console :deep(.ai-memory-panel .tab-bar) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 3px;
}

.dad-console :deep(.ai-memory-panel .tab-btn) {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.dad-console :deep(.ai-memory-panel .tab-btn.active) {
  background: rgba(125, 211, 252, 0.1);
  color: #7dd3fc;
}

.dad-console :deep(.ai-memory-panel .panel-subtitle) {
  font-family: var(--dc-font-mono);
  color: rgba(255, 255, 255, 0.25);
  font-size: 12px;
}

.dad-console :deep(.ai-memory-panel .loading-state),
.dad-console :deep(.ai-memory-panel .empty-state) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.ai-memory-panel .empty-hint) {
  color: rgba(255, 255, 255, 0.15);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.fact-card) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.dad-console :deep(.fact-card:hover) {
  background: rgba(255, 255, 255, 0.05);
}

.dad-console :deep(.fact-category) {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
}

.dad-console :deep(.fact-category[data-category="family"]) {
  background: rgba(240, 171, 252, 0.12);
  color: #f0abfc;
}

.dad-console :deep(.fact-category[data-category="interest"]) {
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
}

.dad-console :deep(.fact-category[data-category="concern"]) {
  background: rgba(125, 211, 252, 0.12);
  color: #7dd3fc;
}

.dad-console :deep(.fact-category[data-category="personal_info"]) {
  background: rgba(167, 139, 250, 0.12);
  color: #a78bfa;
}

.dad-console :deep(.fact-category[data-category="preference"]) {
  background: rgba(45, 212, 191, 0.12);
  color: #2dd4bf;
}

.dad-console :deep(.fact-owner) {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.dad-console :deep(.fact-text) {
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--dc-font-mono);
  font-size: 13px;
}

.dad-console :deep(.fact-delete) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.3);
}

.dad-console :deep(.fact-delete:hover:not(:disabled)) {
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

/* History tab */
.dad-console :deep(.history-summary) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.dad-console :deep(.summary-label) {
  font-family: var(--dc-font-mono);
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 1px;
}

.dad-console :deep(.summary-text) {
  color: rgba(255, 255, 255, 0.6);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.turns-label) {
  font-family: var(--dc-font-mono);
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 1px;
}

.dad-console :deep(.turn-card) {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.dad-console :deep(.turn-role) {
  font-family: var(--dc-font-mono);
  border-radius: 4px;
}

.dad-console :deep(.turn-user .turn-role) {
  background: rgba(167, 139, 250, 0.12);
  color: #a78bfa;
}

.dad-console :deep(.turn-ai .turn-role) {
  background: rgba(125, 211, 252, 0.12);
  color: #7dd3fc;
}

.dad-console :deep(.turn-text) {
  color: rgba(255, 255, 255, 0.65);
  font-family: var(--dc-font-mono);
  font-size: 12px;
}

.dad-console :deep(.clear-history-btn) {
  background: rgba(248, 113, 113, 0.05);
  border: 1px solid rgba(248, 113, 113, 0.15);
  border-radius: 6px;
  color: #f87171;
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.clear-history-btn:hover:not(:disabled)) {
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.25);
}

.dad-console :deep(.ai-memory-panel .error-msg) {
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.15);
  border-radius: 6px;
  color: #f87171;
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.back-btn) {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.back-btn:hover) {
  border-color: rgba(125, 211, 252, 0.2);
  color: #7dd3fc;
}

/* ── OverlayPanel wrapper (embedded mode) ── */
.dad-console :deep(.embedded-panel) {
  background: transparent;
}

.dad-console :deep(.overlay-backdrop) {
  background: rgba(0, 0, 0, 0.8);
}

.dad-console :deep(.overlay-panel) {
  background: #0a0e14;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.dad-console :deep(.overlay-close) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.overlay-close:hover) {
  color: #fff;
}

/* ── ConfirmDialog ── */
.dad-console :deep(.confirm-backdrop) {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: none;
}

.dad-console :deep(.confirm-dialog) {
  background: #0f1419;
  border: 1px solid transparent;
  border-radius: 8px;
  backdrop-filter: none;
  position: relative;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.dad-console :deep(.confirm-dialog)::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 9px;
  background: linear-gradient(135deg, #7dd3fc, #a78bfa, #f0abfc, #67e8f9);
  background-size: 200% 200%;
  animation: iri-shift 6s ease-in-out infinite;
  z-index: -1;
  opacity: 0.4;
}

.dad-console :deep(.confirm-message) {
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--dc-font-mono);
  font-size: 14px;
}

.dad-console :deep(.confirm-btn) {
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.confirm-btn.cancel) {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
}

.dad-console :deep(.confirm-btn.cancel:hover) {
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
}

.dad-console :deep(.confirm-btn.ok) {
  background: transparent;
  border: 1px solid rgba(125, 211, 252, 0.3);
  color: #7dd3fc;
}

.dad-console :deep(.confirm-btn.ok:hover) {
  background: rgba(125, 211, 252, 0.08);
}

/* ── CommunityPanel detail overlay ── */
.dad-console :deep(.detail-overlay) {
  background: rgba(0, 0, 0, 0.8);
}

.dad-console :deep(.detail-card) {
  background: #0f1419;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.dad-console :deep(.detail-close) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
  background: rgba(10, 14, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.dad-console :deep(.detail-close:hover) {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.12);
}

.dad-console :deep(.detail-title) {
  color: #fff;
  font-weight: 600;
}

.dad-console :deep(.detail-author) {
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--dc-font-mono);
  font-size: 12px;
}

.dad-console :deep(.detail-content) {
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.7;
}

.dad-console :deep(.detail-tags .q-tag) {
  background: rgba(125, 211, 252, 0.08);
  border: 1px solid rgba(125, 211, 252, 0.15);
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  font-size: 10px;
}

.dad-console :deep(.detail-actions-bar) {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.dad-console :deep(.detail-action-btn) {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.detail-action-btn:hover) {
  border-color: rgba(125, 211, 252, 0.2);
  color: #7dd3fc;
}

/* Community answers */
.dad-console :deep(.answers-title) {
  font-family: var(--dc-font-mono);
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
}

.dad-console :deep(.answer-card) {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.dad-console :deep(.answer-author) {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.dad-console :deep(.answer-content) {
  color: rgba(255, 255, 255, 0.7);
}

.dad-console :deep(.answer-meta) {
  color: rgba(255, 255, 255, 0.2);
  font-family: var(--dc-font-mono);
}

/* Community compose */
.dad-console :deep(.compose-overlay) {
  background: rgba(0, 0, 0, 0.8);
}

.dad-console :deep(.compose-form) {
  background: #0f1419;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.dad-console :deep(.compose-title) {
  font-family: var(--dc-font-mono);
  color: #fff;
}

.dad-console :deep(.compose-input),
.dad-console :deep(.compose-textarea) {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.compose-input:focus),
.dad-console :deep(.compose-textarea:focus) {
  border-color: rgba(125, 211, 252, 0.3);
}

.dad-console :deep(.compose-cancel) {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.4);
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.compose-submit) {
  background: transparent;
  border: 1px solid rgba(125, 211, 252, 0.3);
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

.dad-console :deep(.compose-submit:hover:not(:disabled)) {
  background: rgba(125, 211, 252, 0.08);
}

/* Community tag picker */
.dad-console :deep(.tag-picker) {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.dad-console :deep(.tag-picker-label) {
  color: rgba(255, 255, 255, 0.3);
  font-family: var(--dc-font-mono);
  font-size: 11px;
}

/* Community panel toast */
.dad-console :deep(.panel-toast-error) {
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.2);
  color: #f87171;
  font-family: var(--dc-font-mono);
  border-radius: 6px;
}

/* ── RoleSelectPanel (if triggered from dad) ── */
.dad-console :deep(.role-select) {
  background: #0a0e14;
}

.dad-console :deep(.role-half) {
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.dad-console :deep(.role-title) {
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.role-subtitle) {
  font-family: var(--dc-font-mono);
  color: rgba(255, 255, 255, 0.3);
}
</style>
