<template>
  <div class="dad-console">
    <!-- ── Ambient Background ── -->
    <div class="dc-ambient-bg"></div>

    <!-- ── Header ── -->
    <DcHeader
      :stats="stats"
      :current-age="currentAge"
      @open-age-picker="showAgeMenu = true"
      @command="handleCommand"
    />

    <!-- ── Tab Bar (top, below header) ── -->
    <DcTabBar v-model="activeTab" />

    <!-- ── Scrollable Body ── -->
    <main class="dc-body">
      <!-- Home -->
      <DcHome v-if="activeTab === 'home'" @navigate="activeTab = $event as Tab" />

      <!-- Tasks -->
      <DcTaskList
        v-else-if="activeTab === 'tasks'"
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
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"></path></svg>
          <span class="dc-sh-text">./chat.sh</span>
        </div>
        <ChatPanel :embedded="true" />
      </div>

      <!-- Community -->
      <div v-else-if="activeTab === 'community'" class="dc-tab-content-full">
        <div class="dc-section-header dc-sh-overlay">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path></svg>
          <span class="dc-sh-text">./network.sh</span>
        </div>
        <CommunityPanel :embedded="true" />
      </div>

      <!-- Whisper -->
      <div v-else-if="activeTab === 'whisper'" class="dc-tab-content-full">
        <div class="dc-section-header dc-sh-overlay">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"></path></svg>
          <span class="dc-sh-text">./journal.sh</span>
        </div>
        <WhisperPanel :embedded="true" />
      </div>

      <!-- Profile -->
      <div v-else-if="activeTab === 'profile'" class="dc-profile-wrap">
        <div class="dc-section-header">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>
          <span class="dc-sh-text">./config.sh</span>
        </div>
        <ProfilePanel :embedded="true" />
        <button class="dc-logout-btn" @click="onLogout">> logout</button>
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
import DcHome from './DcHome.vue'
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
type Tab = 'home' | 'tasks' | 'dashboard' | 'chat' | 'community' | 'whisper' | 'profile'
const activeTab = ref<Tab>('home')

function handleCommand(cmd: string) {
  const lower = cmd.toLowerCase()
  const map: Record<string, Tab> = {
    'home': 'home',
    'tasks': 'tasks', 'task': 'tasks', './tasks.sh': 'tasks',
    'dashboard': 'dashboard', 'status': 'dashboard', 'metrics': 'dashboard', './status.sh': 'dashboard',
    'chat': 'chat', 'comms': 'chat', './chat.sh': 'chat',
    'community': 'community', 'network': 'community', './network.sh': 'community',
    'whisper': 'whisper', 'journal': 'whisper', 'decrypt': 'whisper', './journal.sh': 'whisper',
    'profile': 'profile', 'config': 'profile', './config.sh': 'profile',
  }

  if (lower === 'logout' || lower === 'exit') {
    onLogout()
  } else if (map[lower]) {
    activeTab.value = map[lower]
  } else {
    // just ignore or maybe show a toast. For now, do nothing if invalid.
  }
}

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
  --dc-bg: #1A1B26;
  --dc-bg2: #24283B;
  --dc-surface: rgba(255, 255, 255, 0.05);
  --dc-border: rgba(255, 255, 255, 0.15);

  --dc-accent: #7DCFFF;
  --dc-accent-dim: rgba(125, 207, 255, 0.15);
  --dc-success: #9ECE6A;
  --dc-danger: #F7768E;
  --dc-warn: #FF9E64;

  --dc-prompt: #7DCFFF;
  --dc-cmd: #A9B1D6;
  --dc-string: #9ECE6A;
  --dc-comment: #565F89;
  --dc-text: #C0CAF5;

  /* Typography */
  --dc-font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  --dc-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --dc-radius: 2px;
}

/* ── Layout ── */
.dad-console {
  position: fixed;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--dc-bg);
  color: var(--dc-text);
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
  background-color: var(--dc-bg);
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
  scrollbar-color: var(--dc-border) transparent;
}

.dc-tab-content-full {
  height: 100%;
  position: relative;
  margin: -16px -20px -24px;
}

/* Section headers */
.dc-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding-top: 8px;
  color: var(--dc-accent);
}

.dc-sh-overlay {
  position: absolute;
  top: 16px;
  left: 20px;
  right: 20px;
  z-index: 10;
  pointer-events: none;
}

.dc-sh-icon {
  color: var(--dc-accent);
}

.dc-sh-text {
  font-family: var(--dc-font-mono);
  font-size: 13px;
  font-weight: bold;
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
  background: rgba(247, 118, 142, 0.05);
  border: 1px solid rgba(247, 118, 142, 0.2);
  border-radius: var(--dc-radius);
  color: var(--dc-danger);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.dc-logout-btn:hover { background: rgba(247, 118, 142, 0.12); }

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
   ═══════════════════════════════════════════════════════ */

/* ── OverlayPanel wrapper ── */
.dad-console :deep(.overlay-panel) {
  background: var(--dc-bg);
  backdrop-filter: none;
  border-radius: var(--dc-radius);
}

/* ── ChatPanel (SYS.COMMS) ── */
.dad-console :deep(.chat-panel) {
  background: var(--dc-bg) !important;
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.chat-panel .ambient-bg) {
  background: transparent !important;
}

.dad-console :deep(.chat-header) {
  background: transparent;
}

.dad-console :deep(.memory-btn) {
  color: var(--dc-comment);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
  background: transparent;
}

.dad-console :deep(.memory-btn:hover) {
  color: var(--dc-accent);
  border-color: var(--dc-accent);
}

.dad-console :deep(.chat-empty) {
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.empty-greeting) {
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
  font-size: 18px;
}

.dad-console :deep(.empty-subtitle) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.msg-text.user-text) {
  background: var(--dc-accent-dim);
  border: 1px solid rgba(125, 207, 255, 0.3);
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.msg-text.assistant-text) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.typing-dots span) {
  background: var(--dc-accent);
}

.dad-console :deep(.chat-input-area) {
  background: var(--dc-bg2);
  border-top: 1px solid var(--dc-border);
}

.dad-console :deep(.chat-input) {
  background: var(--dc-bg);
  border: 1px solid var(--dc-border);
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.chat-input:focus) {
  border-color: var(--dc-accent);
}

.dad-console :deep(.chat-input::placeholder) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.send-btn) {
  background: transparent;
  border: 1px solid var(--dc-accent);
  color: var(--dc-accent);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.send-btn:hover) {
  background: var(--dc-accent-dim);
}

.dad-console :deep(.memory-toast) {
  background: var(--dc-bg2);
  border: 1px solid var(--dc-accent);
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

/* ── CommunityPanel ── */
.dad-console :deep(.community-panel) {
  background: var(--dc-bg);
  font-family: var(--dc-font-sans);
}

.dad-console :deep(.community-panel .panel-title) {
  font-family: var(--dc-font-mono);
  color: var(--dc-text);
}

.dad-console :deep(.channel-tabs) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
  overflow: hidden;
}

.dad-console :deep(.channel-tab) {
  background: transparent;
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  border: none;
  border-right: 1px solid var(--dc-border);
  transition: all 0.2s;
}

.dad-console :deep(.channel-tab:last-child) {
  border-right: none;
}

.dad-console :deep(.channel-tab.active) {
  background: var(--dc-accent-dim);
  color: var(--dc-accent);
}

.dad-console :deep(.channel-tab:hover) {
  color: var(--dc-text);
}

.dad-console :deep(.create-btn) {
  background: transparent;
  border: 1px solid var(--dc-accent);
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.create-btn:hover) {
  background: var(--dc-accent-dim);
}

.dad-console :deep(.question-card) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
  transition: border-color 0.2s;
}

.dad-console :deep(.question-card:hover) {
  border-color: rgba(125, 207, 255, 0.3);
}

.dad-console :deep(.q-title) {
  color: var(--dc-text);
  font-weight: 600;
}

.dad-console :deep(.q-preview) {
  color: rgba(192, 202, 245, 0.7);
}

.dad-console :deep(.q-tag) {
  background: var(--dc-accent-dim);
  border: 1px solid rgba(125, 207, 255, 0.3);
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
  font-size: 10px;
  border-radius: var(--dc-radius);
}

.dad-console :deep(.q-meta) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
  font-size: 11px;
}

.dad-console :deep(.author-tag) {
  color: #BB9AF7; /* Tokyo Night purple */
}

.dad-console :deep(.q-like-action .icon-like.active) {
  color: #BB9AF7;
}

.dad-console :deep(.q-collect-action .icon-collect.active) {
  color: var(--dc-warn);
}

.dad-console :deep(.load-more-btn) {
  background: transparent;
  border: 1px solid var(--dc-border);
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.load-more-btn:hover:not(:disabled)) {
  border-color: var(--dc-accent);
  color: var(--dc-accent);
}

.dad-console :deep(.community-panel .loading-state),
.dad-console :deep(.community-panel .empty-state) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

/* Community overlays */
.dad-console :deep(.compose-overlay),
.dad-console :deep(.detail-overlay) {
  background: rgba(26, 27, 38, 0.9);
}

.dad-console :deep(.compose-form),
.dad-console :deep(.detail-panel),
.dad-console :deep(.detail-card) {
  background: var(--dc-bg2);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.compose-title),
.dad-console :deep(.detail-title) {
  font-family: var(--dc-font-mono);
  color: var(--dc-text);
}

.dad-console :deep(.compose-input),
.dad-console :deep(.compose-textarea) {
  background: var(--dc-bg);
  border: 1px solid var(--dc-border);
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.compose-input:focus),
.dad-console :deep(.compose-textarea:focus) {
  border-color: var(--dc-accent);
}

/* ── WhisperPanel ── */
.dad-console :deep(.whisper-panel) {
  background: var(--dc-bg);
}

.dad-console :deep(.whisper-panel .panel-title) {
  font-family: var(--dc-font-mono);
  color: var(--dc-text);
}

.dad-console :deep(.whisper-panel .panel-subtitle) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.whisper-textarea) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.whisper-textarea:focus) {
  border-color: var(--dc-accent);
}

.dad-console :deep(.whisper-textarea::placeholder) {
  color: var(--dc-comment);
}

.dad-console :deep(.whisper-panel .submit-btn) {
  background: transparent;
  border: 1px solid var(--dc-accent);
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.whisper-panel .submit-btn:hover) {
  background: var(--dc-accent-dim);
}

.dad-console :deep(.whisper-panel .section-title) {
  font-family: var(--dc-font-mono);
  color: var(--dc-comment);
}

.dad-console :deep(.whisper-card) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.whisper-content) {
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.whisper-time) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.tips-card) {
  background: rgba(187, 154, 247, 0.05);
  border: 1px solid rgba(187, 154, 247, 0.2);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.tips-label) {
  font-family: var(--dc-font-mono);
  color: #BB9AF7;
}

.dad-console :deep(.tips-content) {
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.tips-btn) {
  background: transparent;
  border: 1px solid rgba(187, 154, 247, 0.3);
  color: #BB9AF7;
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.tips-btn:hover) {
  background: rgba(187, 154, 247, 0.08);
}

.dad-console :deep(.whisper-panel .loading-state),
.dad-console :deep(.whisper-panel .empty-state) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.whisper-panel .error-msg) {
  background: rgba(247, 118, 142, 0.08);
  border-left: 3px solid var(--dc-danger);
  color: var(--dc-danger);
  font-family: var(--dc-font-mono);
  border-radius: 0 var(--dc-radius) var(--dc-radius) 0;
}

.dad-console :deep(.whisper-panel .success-msg) {
  background: rgba(158, 206, 106, 0.08);
  border-left: 3px solid var(--dc-success);
  color: var(--dc-success);
  font-family: var(--dc-font-mono);
  border-radius: 0 var(--dc-radius) var(--dc-radius) 0;
}

/* ── ProfilePanel ── */
.dad-console :deep(.profile-panel) {
  background: transparent;
}

.dad-console :deep(.profile-header) {
  border-bottom: 1px solid var(--dc-border);
}

.dad-console :deep(.profile-avatar) {
  border: 2px solid var(--dc-border);
  border-radius: 0;
}

.dad-console :deep(.profile-avatar img) {
  border-radius: 0;
}

.dad-console :deep(.avatar-placeholder) {
  background: var(--dc-surface);
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.avatar-edit-hint) {
  background: rgba(26, 27, 38, 0.9);
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.profile-name) {
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.edit-icon) {
  color: var(--dc-comment);
}

.dad-console :deep(.profile-username) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.role-badge) {
  background: var(--dc-accent-dim);
  border: 1px solid var(--dc-border);
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
  font-size: 11px;
  border-radius: var(--dc-radius);
}

.dad-console :deep(.nickname-input) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-accent);
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.stats-grid) {
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
  background: var(--dc-surface);
}

.dad-console :deep(.stat-value) {
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
  font-variant-numeric: tabular-nums;
}

.dad-console :deep(.stat-label) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
  font-size: 11px;
}

.dad-console :deep(.settings-heading) {
  font-family: var(--dc-font-mono);
  color: var(--dc-comment);
  letter-spacing: 1px;
  font-size: 12px;
}

.dad-console :deep(.form-label) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
  font-size: 11px;
}

.dad-console :deep(.form-input) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.form-input:focus) {
  border-color: var(--dc-accent);
}

.dad-console :deep(.form-input::placeholder) {
  color: var(--dc-comment);
}

.dad-console :deep(.profile-panel .submit-btn) {
  background: transparent;
  border: 1px solid var(--dc-accent);
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.profile-panel .submit-btn:hover:not(:disabled)) {
  background: var(--dc-accent-dim);
}

.dad-console :deep(.upload-btn) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.upload-btn:hover:not(:disabled)) {
  border-color: rgba(125, 207, 255, 0.3);
  color: var(--dc-accent);
}

.dad-console :deep(.upload-hint) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.danger-btn) {
  background: rgba(247, 118, 142, 0.05);
  border: 1px solid rgba(247, 118, 142, 0.2);
  color: var(--dc-danger);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.danger-btn:hover:not(:disabled)) {
  background: rgba(247, 118, 142, 0.12);
}

.dad-console :deep(.inline-error),
.dad-console :deep(.form-error) {
  color: var(--dc-danger);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.form-success) {
  color: var(--dc-success);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.partner-card) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.partner-label) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.partner-name) {
  color: var(--dc-text);
}

.dad-console :deep(.partner-role) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.shell-code-display) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  font-family: var(--dc-font-mono);
  color: var(--dc-accent);
  border-radius: var(--dc-radius);
}

/* ── AiMemoryPanel ── */
.dad-console :deep(.ai-memory-panel) {
  background: transparent;
}

.dad-console :deep(.ai-memory-panel .panel-title) {
  font-family: var(--dc-font-mono);
  color: var(--dc-text);
}

.dad-console :deep(.ai-memory-panel .tab-bar) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
  padding: 3px;
}

.dad-console :deep(.ai-memory-panel .tab-btn) {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: var(--dc-comment);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.ai-memory-panel .tab-btn.active) {
  background: var(--dc-accent-dim);
  color: var(--dc-accent);
}

.dad-console :deep(.ai-memory-panel .panel-subtitle) {
  font-family: var(--dc-font-mono);
  color: var(--dc-comment);
  font-size: 12px;
}

.dad-console :deep(.ai-memory-panel .loading-state),
.dad-console :deep(.ai-memory-panel .empty-state) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.ai-memory-panel .empty-hint) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.fact-card) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.fact-card:hover) {
  background: rgba(255, 255, 255, 0.08);
}

.dad-console :deep(.fact-category) {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  border-radius: var(--dc-radius);
  background: var(--dc-surface);
  color: var(--dc-comment);
}

.dad-console :deep(.fact-owner) {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  background: var(--dc-surface);
  color: var(--dc-comment);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.fact-text) {
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
  font-size: 13px;
}

.dad-console :deep(.fact-delete) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
  color: var(--dc-comment);
}

.dad-console :deep(.fact-delete:hover:not(:disabled)) {
  background: rgba(247, 118, 142, 0.1);
  border-color: rgba(247, 118, 142, 0.2);
  color: var(--dc-danger);
}

/* History tab */
.dad-console :deep(.history-summary) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.summary-label) {
  font-family: var(--dc-font-mono);
  color: var(--dc-comment);
}

.dad-console :deep(.summary-text) {
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.turns-label) {
  font-family: var(--dc-font-mono);
  color: var(--dc-comment);
}

.dad-console :deep(.turn-card) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.turn-role) {
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.turn-user .turn-role) {
  background: rgba(187, 154, 247, 0.12);
  color: #BB9AF7;
}

.dad-console :deep(.turn-ai .turn-role) {
  background: var(--dc-accent-dim);
  color: var(--dc-accent);
}

.dad-console :deep(.turn-text) {
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
  font-size: 12px;
}

.dad-console :deep(.clear-history-btn) {
  background: rgba(247, 118, 142, 0.05);
  border: 1px solid rgba(247, 118, 142, 0.15);
  border-radius: var(--dc-radius);
  color: var(--dc-danger);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.clear-history-btn:hover:not(:disabled)) {
  background: rgba(247, 118, 142, 0.1);
  border-color: rgba(247, 118, 142, 0.25);
}

.dad-console :deep(.ai-memory-panel .error-msg) {
  background: rgba(247, 118, 142, 0.08);
  border: 1px solid rgba(247, 118, 142, 0.15);
  border-radius: var(--dc-radius);
  color: var(--dc-danger);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.back-btn) {
  background: transparent;
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.back-btn:hover) {
  border-color: var(--dc-accent);
  color: var(--dc-accent);
}

/* ── OverlayPanel wrapper (embedded mode) ── */
.dad-console :deep(.embedded-panel) {
  background: transparent;
}

.dad-console :deep(.overlay-backdrop) {
  background: rgba(26, 27, 38, 0.9);
}

.dad-console :deep(.overlay-panel) {
  background: var(--dc-bg2);
  border: 1px solid var(--dc-border);
}

.dad-console :deep(.overlay-close) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.overlay-close:hover) {
  color: var(--dc-text);
}

/* ── ConfirmDialog ── */
.dad-console :deep(.confirm-backdrop) {
  background: rgba(26, 27, 38, 0.9);
}

.dad-console :deep(.confirm-dialog) {
  background: var(--dc-bg2);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.dad-console :deep(.confirm-message) {
  color: var(--dc-text);
  font-family: var(--dc-font-mono);
  font-size: 14px;
}

.dad-console :deep(.confirm-btn) {
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.confirm-btn.cancel) {
  background: transparent;
  border: 1px solid var(--dc-border);
  color: var(--dc-comment);
}

.dad-console :deep(.confirm-btn.cancel:hover) {
  border-color: rgba(255, 255, 255, 0.3);
  color: var(--dc-text);
}

.dad-console :deep(.confirm-btn.ok) {
  background: transparent;
  border: 1px solid var(--dc-accent);
  color: var(--dc-accent);
}

.dad-console :deep(.confirm-btn.ok:hover) {
  background: var(--dc-accent-dim);
}

/* Community detail overlay */
.dad-console :deep(.detail-close) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
  background: var(--dc-bg);
  border: 1px solid var(--dc-border);
}

.dad-console :deep(.detail-close:hover) {
  color: var(--dc-text);
  border-color: rgba(255, 255, 255, 0.3);
}

.dad-console :deep(.detail-author) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
  font-size: 12px;
}

.dad-console :deep(.detail-content) {
  color: var(--dc-text);
  line-height: 1.7;
}

.dad-console :deep(.detail-tags .q-tag) {
  background: var(--dc-accent-dim);
  border: 1px solid rgba(125, 207, 255, 0.3);
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
  font-size: 10px;
}

.dad-console :deep(.detail-actions-bar) {
  border-top: 1px solid var(--dc-border);
}

.dad-console :deep(.detail-action-btn) {
  background: transparent;
  border: 1px solid var(--dc-border);
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.detail-action-btn:hover) {
  border-color: var(--dc-accent);
  color: var(--dc-accent);
}

/* Community answers */
.dad-console :deep(.answers-title) {
  font-family: var(--dc-font-mono);
  color: var(--dc-comment);
}

.dad-console :deep(.answer-card) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.answer-author) {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: var(--dc-comment);
}

.dad-console :deep(.answer-content) {
  color: var(--dc-text);
}

.dad-console :deep(.answer-meta) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
}

/* Community compose */
.dad-console :deep(.compose-cancel) {
  background: transparent;
  border: 1px solid var(--dc-border);
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.compose-submit) {
  background: transparent;
  border: 1px solid var(--dc-accent);
  color: var(--dc-accent);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.compose-submit:hover:not(:disabled)) {
  background: var(--dc-accent-dim);
}

/* Community tag picker */
.dad-console :deep(.tag-picker) {
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: var(--dc-radius);
}

.dad-console :deep(.tag-picker-label) {
  color: var(--dc-comment);
  font-family: var(--dc-font-mono);
  font-size: 11px;
}

/* Community panel toast */
.dad-console :deep(.panel-toast-error) {
  background: rgba(247, 118, 142, 0.1);
  border: 1px solid rgba(247, 118, 142, 0.2);
  color: var(--dc-danger);
  font-family: var(--dc-font-mono);
  border-radius: var(--dc-radius);
}

/* ── RoleSelectPanel (if triggered from dad) ── */
.dad-console :deep(.role-select) {
  background: var(--dc-bg);
}

.dad-console :deep(.role-half) {
  border: 1px solid var(--dc-border);
}

.dad-console :deep(.role-title) {
  font-family: var(--dc-font-mono);
}

.dad-console :deep(.role-subtitle) {
  font-family: var(--dc-font-mono);
  color: var(--dc-comment);
}
</style>
