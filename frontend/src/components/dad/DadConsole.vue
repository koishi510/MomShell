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
      <DcHome v-if="activeTab === 'home'" :key="tabKey" @navigate="activeTab = $event as Tab" />

      <!-- Tasks -->
      <DcTaskList
        v-else-if="activeTab === 'tasks'"
        :key="tabKey"
        :sorted-tasks="sortedTasks"
        :loading="loading"
        :completing="completing"
        :error="error"
        :regenerating="regeneratingIntel"
        :action-error="intelActionError"
        @complete="openCompleteDialog"
        @regenerate-intel="onRegenerateIntel"
      />

      <!-- Dashboard -->
      <DcDashboard
        v-else-if="activeTab === 'dashboard'"
        :key="tabKey"
        :loading="loadingDashboard"
        :error="dashboardError"
        :radar="skillRadar"
        :achievements="achievements"
        :perk-cards="perkCards"
        :using-perk="usingPerk"
        @use-perk="onUsePerk"
      />

      <!-- Chat -->
      <DcChat v-else-if="activeTab === 'chat'" :key="tabKey" :visible="activeTab === 'chat'" :show-memory="chatShowMemory" @update:show-memory="chatShowMemory = $event" />

      <!-- Community -->
      <DcCommunity v-else-if="activeTab === 'community'" :key="tabKey" :visible="activeTab === 'community'" />

      <!-- Whisper -->
      <DcWhisper
        v-else-if="activeTab === 'whisper'"
        :key="tabKey"
        :visible="activeTab === 'whisper'"
        :refresh-token="intelRefreshToken"
        :regenerating="regeneratingIntel"
        :action-error="intelActionError"
        @regenerate-intel="onRegenerateIntel"
      />

      <!-- Profile -->
      <DcProfile v-else-if="activeTab === 'profile'" :key="tabKey" :visible="activeTab === 'profile'" @logout="onLogout" />
    </main>

    <!-- ── Dialogs ── -->
    <DcMemoryCardDialog
      :visible="showCompleteDialog"
      :target-title="completeTarget?.title ?? ''"
      :preview-url="proofPreviewUrl"
      :uploading="proofUploading"
      :error="completeDialogError"
      @close="closeCompleteDialog"
      @upload="onProofFileChange"
      @submit-without-photo="submitCompleteWithoutPhoto"
      @submit-with-photo="submitCompleteWithPhoto"
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
import DcChat from './DcChat.vue'
import DcCommunity from './DcCommunity.vue'
import DcWhisper from './DcWhisper.vue'
import DcProfile from './DcProfile.vue'
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
  getAchievements,
  getBabyAge,
  getDailyTasks,
  getSkillRadar,
  getTaskStats,
  type AchievementItem,
  type SkillRadar,
  type TaskStats,
  type UserTaskItem,
} from '@/lib/api/task'
import { getErrorMessage } from '@/lib/apiClient'
import { getPerkCards, usePerkCard, type PerkCardItem } from '@/lib/api/perkCard'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { regenerateFutureLetter } from '@/lib/api/whisper'

const authStore = useAuthStore()
const uiStore = useUiStore()

// ── Tabs ──
type Tab = 'home' | 'tasks' | 'dashboard' | 'chat' | 'community' | 'whisper' | 'profile'
const activeTab = ref<Tab>('home')
const chatShowMemory = ref(false)
const tabKey = ref(0)

function handleCommand(cmd: string) {
  const lower = cmd.toLowerCase()
  const map: Record<string, Tab> = {
    'home': 'home', './home': 'home',
    'issue': 'tasks', './issue': 'tasks',
    'status': 'dashboard', './status': 'dashboard',
    'chat': 'chat', './chat': 'chat',
    'community': 'community', './community': 'community',
    'whisper': 'whisper', './whisper': 'whisper', './whisper.sh': 'whisper', 'future-letter': 'whisper', './future-letter': 'whisper',
    'profile': 'profile', './profile': 'profile',
    'memory': 'chat', './memory': 'chat',
  }

  if (lower === 'logout' || lower === 'exit' || lower === 'quit') {
    onLogout()
    return
  }

  const isMemory = lower === 'memory' || lower === './memory'
  const target = map[lower]
  if (!target) return

  // Re-entering the same page: bump key to re-trigger entry animation
  if (target === activeTab.value && !isMemory) {
    tabKey.value++
  }

  if (isMemory) {
    chatShowMemory.value = true
  } else if (target === 'chat') {
    chatShowMemory.value = false
  }

  activeTab.value = target
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
const regeneratingIntel = ref(false)
const intelActionError = ref('')
const intelRefreshToken = ref(0)
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

async function pollTasks() {
  try {
    const [taskList, taskStats] = await Promise.all([getDailyTasks(), getTaskStats()])
    tasks.value = taskList
    if (stats.value?.xp !== taskStats.xp || stats.value?.level !== taskStats.level) {
      stats.value = taskStats
    }
  } catch { /* ignore */ }
}

async function onRegenerateIntel() {
  regeneratingIntel.value = true
  intelActionError.value = ''
  try {
    await regenerateFutureLetter()
    await fetchTasks()
    intelRefreshToken.value++
  } catch (e) {
    intelActionError.value = getErrorMessage(e)
  } finally {
    regeneratingIntel.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(pollTasks, 5000)
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
const proofPreviewUrl = ref('')

function resetProof() {
  if (proofPreviewUrl.value) {
    URL.revokeObjectURL(proofPreviewUrl.value)
  }
  proofFile.value = null
  proofPreviewUrl.value = ''
}

function openCompleteDialog(task: UserTaskItem) {
  completeTarget.value = task
  completeDialogError.value = ''
  resetProof()
  showCompleteDialog.value = true
}

function closeCompleteDialog() {
  showCompleteDialog.value = false
  completeTarget.value = null
  completeDialogError.value = ''
  resetProof()
}

function onProofFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  resetProof()
  if (file) {
    proofFile.value = file
    proofPreviewUrl.value = URL.createObjectURL(file)
  }
  input.value = ''
}

async function submitCompleteWithoutPhoto() {
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

async function submitCompleteWithPhoto() {
  if (!completeTarget.value || !proofFile.value) return
  const id = completeTarget.value.id
  completing.value = id
  proofUploading.value = true
  completeDialogError.value = ''
  try {
    const uploaded = await uploadPhoto(proofFile.value, `任务证明：${completeTarget.value.title}`)
    const updated = await completeTask(id, { proof_photo_url: uploaded.image_url })
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

async function onSelectAge(value: string) {
  settingAge.value = true
  error.value = ''
  intelActionError.value = ''
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

/* ── Desktop ── */
@media (min-width: 769px) {
  .dc-body {
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }
}

</style>
