<template>
  <div class="dad-console">
    <!-- ── Header ── -->
    <header class="dc-header">
      <div class="dc-brand">
        <h1 class="dc-title">控制台</h1>
        <button v-if="currentAge" class="dc-age-badge" @click="showAgeMenu = true">
          {{ ageLabel(currentAge) }}
        </button>
        <button v-else class="dc-age-badge dc-age-empty" @click="showAgeMenu = true">设置年龄</button>
      </div>
      <div class="dc-header-right">
        <div v-if="stats" class="dc-stats">
          <span class="dc-level">Lv.{{ stats.level }}</span>
          <span class="dc-xp">{{ stats.xp }} XP</span>
        </div>
      </div>
    </header>

    <!-- ── Scrollable Body ── -->
    <main class="dc-body">
      <!-- ─ Tasks Tab ─ -->
      <div v-if="activeTab === 'tasks'">
        <div v-if="loading" class="dc-state">
          <span class="dc-state-icon">...</span>
          <span>{{ currentAge ? '正在生成任务' : '加载中' }}</span>
        </div>

        <div v-else-if="tasks.length === 0" class="dc-state">
          <span class="dc-state-icon">--</span>
          <span>今天没有任务</span>
          <button v-if="!currentAge" class="dc-btn dc-btn-accent" @click="showAgeMenu = true">设置宝宝年龄以生成任务</button>
          <button v-else class="dc-btn dc-btn-outline" :disabled="regenerating" @click="onRegenerate">
            {{ regenerating ? '生成中...' : '重新生成' }}
          </button>
        </div>

        <div v-else class="dc-task-list">
          <div
            v-for="t in sortedTasks"
            :key="t.id"
            :class="['dc-card', `dc-pri-${t.priority || 'T2'}`, `dc-st-${t.status}`]"
          >
            <!-- Card top bar -->
            <div class="dc-card-top">
              <div class="dc-badges">
                <span :class="['dc-badge', `dc-pri-${t.priority || 'T2'}`]">{{ priorityLabel(t.priority) }}</span>
                <span class="dc-badge dc-cat">{{ categoryLabel(t.category) }}</span>
              </div>
              <span class="dc-diff">{{ difficultyStars(t.difficulty) }}</span>
            </div>

            <!-- Two-section body -->
            <div class="dc-card-body">
              <div class="dc-kv">
                <div class="dc-k">做什么</div>
                <div class="dc-v dc-v-title">{{ t.title }}</div>
              </div>
              <div class="dc-kv">
                <div class="dc-k">怎么做</div>
                <div class="dc-v">{{ t.description }}</div>
              </div>
            </div>

            <!-- Proof photo -->
            <img
              v-if="t.proof_photo_url && t.status !== 'pending'"
              class="dc-proof-thumb"
              :src="t.proof_photo_url"
              alt=""
              loading="lazy"
            />

            <!-- Footer -->
            <div class="dc-card-foot">
              <span v-if="t.status === 'pending'" class="dc-status dc-status-pending">待完成</span>
              <span v-else-if="t.status === 'completed'" class="dc-status dc-status-done">已完成，等待验收</span>
              <span v-else class="dc-status dc-status-ok">已验收 {{ t.score }}/5</span>
            </div>

            <!-- Full-width complete button -->
            <button
              v-if="t.status === 'pending'"
              class="dc-complete-btn"
              :disabled="completing === t.id"
              @click="openCompleteDialog(t)"
            >
              {{ completing === t.id ? '提交中...' : '完 成' }}
            </button>

            <p v-if="t.comment && t.status === 'verified'" class="dc-comment">{{ t.comment }}</p>
          </div>
        </div>

        <p v-if="error" class="dc-error">{{ error }}</p>

        <button
          v-if="tasks.length > 0 && currentAge"
          class="dc-regen-btn"
          :disabled="regenerating"
          @click="onRegenerate"
        >
          {{ regenerating ? '生成中...' : '重新生成任务' }}
        </button>
      </div>

      <!-- ─ Dashboard Tab ─ -->
      <div v-else-if="activeTab === 'dashboard'">
        <div v-if="loadingDashboard" class="dc-state"><span>加载中...</span></div>
        <div v-else-if="dashboardError" class="dc-error">{{ dashboardError }}</div>
        <div v-else class="dc-dashboard">
          <!-- Radar -->
          <div class="dc-section dc-radar-section">
            <SkillRadarChart v-if="skillRadar" :values="skillRadar" />
          </div>

          <!-- Achievements -->
          <div class="dc-section">
            <div class="dc-section-head">
              <h3 class="dc-section-title">徽章</h3>
              <span v-if="unlockedCount > 0" class="dc-section-hint">{{ unlockedCount }}/{{ achievements.length }}</span>
            </div>
            <div v-if="achievements.length === 0" class="dc-state dc-state-sm">暂无徽章</div>
            <div v-else class="dc-ach-list">
              <div
                v-for="a in sortedAchievements"
                :key="a.id"
                :class="['dc-ach', { unlocked: a.unlocked }]"
              >
                <div class="dc-ach-icon" :style="{ backgroundImage: a.icon_url ? `url(${a.icon_url})` : undefined }" />
                <div class="dc-ach-info">
                  <div class="dc-ach-name">{{ a.title }}</div>
                  <div class="dc-ach-desc">{{ a.description }}</div>
                </div>
                <span :class="['dc-ach-tag', a.unlocked ? 'ok' : 'locked']">{{ a.unlocked ? '已解锁' : '未解锁' }}</span>
              </div>
            </div>
          </div>

          <!-- Perk Cards -->
          <div class="dc-section">
            <div class="dc-section-head">
              <h3 class="dc-section-title">权益背包</h3>
            </div>
            <div v-if="perkCards.length === 0" class="dc-state dc-state-sm">暂无权益卡</div>
            <div v-else class="dc-perk-list">
              <div v-for="c in perkCards" :key="c.id" :class="['dc-perk', `dc-pst-${c.status}`]">
                <div class="dc-perk-head">
                  <span class="dc-perk-title">{{ c.title }}</span>
                  <span class="dc-perk-status">{{ perkStatusLabel(c.status) }}</span>
                </div>
                <p v-if="c.description" class="dc-perk-desc">{{ c.description }}</p>
                <div class="dc-perk-foot">
                  <span class="dc-perk-time">
                    <template v-if="c.status === 'used'">已核销</template>
                    <template v-else-if="c.status === 'expired'">已过期</template>
                    <template v-else>可使用</template>
                  </span>
                  <button
                    v-if="c.status === 'active'"
                    class="dc-btn dc-btn-accent dc-btn-sm"
                    :disabled="usingPerk === c.id"
                    @click="onUsePerk(c.id)"
                  >
                    {{ usingPerk === c.id ? '...' : '使用' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─ Chat Tab ─ -->
      <ChatPanel v-else-if="activeTab === 'chat'" :embedded="true" />

      <!-- ─ Community Tab ─ -->
      <CommunityPanel v-else-if="activeTab === 'community'" :embedded="true" />

      <!-- ─ Whisper Tab ─ -->
      <WhisperPanel v-else-if="activeTab === 'whisper'" :embedded="true" />

      <!-- ─ Profile Tab ─ -->
      <div v-else-if="activeTab === 'profile'" class="dc-profile-wrap">
        <ProfilePanel :embedded="true" />
        <button class="dc-logout-btn" @click="onLogout">退出登录</button>
      </div>
    </main>

    <!-- ── Bottom Tab Bar ── -->
    <nav class="dc-tabbar">
      <button :class="['dc-tab', { active: activeTab === 'tasks' }]" @click="activeTab = 'tasks'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" />
        </svg>
        <span>任务</span>
      </button>
      <button :class="['dc-tab', { active: activeTab === 'dashboard' }]" @click="activeTab = 'dashboard'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span>战绩</span>
      </button>
      <button :class="['dc-tab', { active: activeTab === 'chat' }]" @click="activeTab = 'chat'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>聊天</span>
      </button>
      <button :class="['dc-tab', { active: activeTab === 'community' }]" @click="activeTab = 'community'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>社区</span>
      </button>
      <button :class="['dc-tab', { active: activeTab === 'whisper' }]" @click="activeTab = 'whisper'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 1.6.376 3.112 1.043 4.453L2 22l5.547-1.043A9.96 9.96 0 0 0 12 22z" />
        </svg>
        <span>心语</span>
      </button>
      <button :class="['dc-tab', { active: activeTab === 'profile' }]" @click="activeTab = 'profile'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
        <span>我的</span>
      </button>
    </nav>

    <!-- ── Memory Card Dialog ── -->
    <Transition name="dc-fade">
      <div v-if="showCompleteDialog" class="dc-dialog-backdrop" @click.self="closeCompleteDialog">
        <div class="dc-dialog">
          <h3 class="dc-dialog-title">创建记忆卡片</h3>
          <p v-if="completeTarget" class="dc-dialog-sub">{{ completeTarget.title }}</p>

          <!-- Card image preview -->
          <div v-if="cardPreviewUrl" class="dc-card-preview">
            <img :src="cardPreviewUrl" alt="" class="dc-card-img" />
          </div>

          <!-- Creation options -->
          <div v-if="!cardPreviewUrl" class="dc-card-options">
            <button
              class="dc-btn dc-btn-accent"
              :disabled="generatingCard || proofUploading"
              @click="onGenerateCard"
            >
              {{ generatingCard ? 'AI 生成中...' : 'AI 生成' }}
            </button>
            <label class="dc-proof-picker">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                class="dc-proof-input"
                :disabled="generatingCard || proofUploading"
                @change="onProofFileChange"
              />
              <span class="dc-btn dc-btn-outline">上传图片</span>
            </label>
          </div>

          <!-- Replace card after preview -->
          <div v-else class="dc-card-replace">
            <button class="dc-btn dc-btn-ghost dc-btn-sm" :disabled="generatingCard || proofUploading" @click="resetCard">重新选择</button>
          </div>

          <p v-if="completeDialogError" class="dc-error">{{ completeDialogError }}</p>

          <div class="dc-dialog-actions">
            <button class="dc-btn dc-btn-ghost" :disabled="proofUploading || generatingCard" @click="closeCompleteDialog">取消</button>
            <button class="dc-btn dc-btn-outline" :disabled="proofUploading || generatingCard || !completeTarget" @click="submitWithoutCard">跳过</button>
            <button
              class="dc-btn dc-btn-accent"
              :disabled="proofUploading || generatingCard || !completeTarget || !cardPreviewUrl"
              @click="submitWithCard"
            >
              {{ proofUploading ? '提交中...' : '完成' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Age Picker ── -->
    <Transition name="dc-fade">
      <div v-if="showAgeMenu" class="dc-dialog-backdrop" @click.self="showAgeMenu = false">
        <div class="dc-dialog dc-dialog-sm">
          <h3 class="dc-dialog-title">选择宝宝年龄</h3>
          <div class="dc-age-grid">
            <button
              v-for="opt in AGE_OPTIONS"
              :key="opt.value"
              :class="['dc-age-opt', { active: currentAge === opt.value }]"
              :disabled="settingAge"
              @click="onSelectAge(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import SkillRadarChart from '@/components/task/SkillRadarChart.vue'
import ChatPanel from '@/components/overlay/ChatPanel.vue'
import CommunityPanel from '@/components/overlay/CommunityPanel.vue'
import WhisperPanel from '@/components/overlay/WhisperPanel.vue'
import ProfilePanel from '@/components/overlay/ProfilePanel.vue'
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

function priorityLabel(p?: string): string {
  const v = (p || 'T2').toUpperCase()
  if (v === 'T0') return '紧急'
  if (v === 'T1') return '里程碑'
  return '日常'
}

const categoryLabels: Record<string, string> = { housework: '家务', parenting: '育儿', health: '健康', emotional: '情感' }
function categoryLabel(cat: string) { return categoryLabels[cat] || cat }
function difficultyStars(d: number) { return '★'.repeat(d) }

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

const unlockedCount = computed(() => achievements.value.filter((a) => a.unlocked).length)
const sortedAchievements = computed(() =>
  [...achievements.value].sort((a, b) => {
    if (a.unlocked === b.unlocked) return a.title.localeCompare(b.title, 'zh-Hans-CN')
    return a.unlocked ? -1 : 1
  }),
)

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

function perkStatusLabel(s: string): string {
  if (s === 'active') return '可用'
  if (s === 'used') return '已使用'
  if (s === 'expired') return '已过期'
  return s
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
    // If it's a local file (blob URL), upload it first
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
const AGE_OPTIONS = [
  { value: 'pregnancy', label: '孕期' },
  { value: '0-3m', label: '0-3个月' },
  { value: '3-6m', label: '3-6个月' },
  { value: '6-12m', label: '6-12个月' },
  { value: '1-2y', label: '1-2岁' },
  { value: '2-3y', label: '2-3岁' },
  { value: '3-4y', label: '3-4岁' },
  { value: '4-5y', label: '4-5岁' },
] as const

const ageLabelMap: Record<string, string> = Object.fromEntries(AGE_OPTIONS.map((o) => [o.value, o.label]))
const showAgeMenu = ref(false)
const currentAge = ref('')
const settingAge = ref(false)

function ageLabel(v: string) { return ageLabelMap[v] || v }

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

// Pause polling when an overlay is open
watch(
  () => uiStore.activePanel,
  (panel) => {
    if (panel) stopPolling()
    else startPolling()
  },
)

// Tab switching
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
  --dc-bg: #0d1b2a;
  --dc-bg2: #152232;
  --dc-surface: rgba(255, 255, 255, 0.04);
  --dc-border: rgba(255, 255, 255, 0.08);
  --dc-accent: #4a9eff;
  --dc-accent-dim: rgba(74, 158, 255, 0.15);
  --dc-text: #e0e6ed;
  --dc-text-dim: rgba(255, 255, 255, 0.5);
  --dc-success: #2ed573;
  --dc-danger: #ff4757;
  --dc-warn: #ffa502;
}

/* ── Layout ── */
.dad-console {
  position: fixed;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--dc-bg) 0%, var(--dc-bg2) 50%, var(--dc-bg) 100%);
  color: var(--dc-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── Header ── */
.dc-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--dc-border);
}

.dc-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dc-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 2px;
  color: var(--dc-text);
}

.dc-age-badge {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--dc-accent-dim);
  background: var(--dc-accent-dim);
  color: var(--dc-accent);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.dc-age-badge:hover { background: rgba(74, 158, 255, 0.22); }
.dc-age-empty { border-style: dashed; color: var(--dc-text-dim); }

.dc-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dc-stats {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dc-level {
  padding: 4px 14px;
  background: var(--dc-accent);
  color: #fff;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 800;
}

.dc-xp {
  color: var(--dc-text-dim);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.dc-icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--dc-border);
  border-radius: 12px;
  background: var(--dc-surface);
  color: var(--dc-text-dim);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.dc-icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--dc-text);
}

/* ── Menu ── (removed - features are now inline tabs) */

/* ── Body ── */
.dc-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 16px 16px 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

/* ── States ── */
.dc-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 20px;
  color: var(--dc-text-dim);
  font-size: 15px;
  font-weight: 600;
}

.dc-state-sm { padding: 24px 16px; font-size: 14px; }

.dc-state-icon {
  font-size: 28px;
  font-weight: 800;
  opacity: 0.4;
}

.dc-error {
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(255, 71, 87, 0.12);
  border: 1px solid rgba(255, 71, 87, 0.25);
  border-radius: 12px;
  color: #ffaaaa;
  font-size: 13px;
}

/* ── Task Cards ── */
.dc-task-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dc-card {
  position: relative;
  padding: 18px;
  background: var(--dc-surface);
  border: 1px solid var(--dc-border);
  border-radius: 18px;
  overflow: hidden;
  transition: border-color 0.2s;
}

/* Priority left accent bar */
.dc-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
}

.dc-card.dc-pri-T0::before { background: var(--dc-danger); }
.dc-card.dc-pri-T1::before { background: var(--dc-accent); }
.dc-card.dc-pri-T2::before { background: rgba(255, 255, 255, 0.06); }

.dc-card.dc-st-completed { border-color: rgba(255, 165, 2, 0.25); }
.dc-card.dc-st-verified { border-color: rgba(46, 213, 115, 0.25); background: rgba(46, 213, 115, 0.03); }

.dc-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.dc-badges { display: flex; gap: 6px; }

.dc-badge {
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.dc-badge.dc-pri-T0 { background: rgba(255, 71, 87, 0.15); color: #ff6b7a; }
.dc-badge.dc-pri-T1 { background: var(--dc-accent-dim); color: var(--dc-accent); }
.dc-badge.dc-pri-T2 { background: rgba(255, 255, 255, 0.06); color: var(--dc-text-dim); }
.dc-badge.dc-cat { background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.65); }

.dc-diff {
  color: var(--dc-warn);
  font-size: 13px;
  letter-spacing: 2px;
}

/* Two-section body */
.dc-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}

.dc-kv {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dc-k {
  font-size: 11px;
  font-weight: 800;
  color: var(--dc-accent);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.dc-v {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.5;
}

.dc-v-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--dc-text);
}

.dc-proof-thumb {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: 14px;
  border: 1px solid var(--dc-border);
  margin-bottom: 12px;
}

.dc-card-foot {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.dc-status {
  font-size: 13px;
  font-weight: 700;
}

.dc-status-pending { color: var(--dc-text-dim); }
.dc-status-done { color: var(--dc-warn); }
.dc-status-ok { color: var(--dc-success); }

.dc-comment {
  margin: 10px 0 0;
  padding: 10px 12px;
  background: rgba(46, 213, 115, 0.06);
  border-radius: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.4;
}

/* Full-width complete button */
.dc-complete-btn {
  display: block;
  width: 100%;
  margin-top: 14px;
  padding: 14px;
  border: none;
  border-radius: 14px;
  background: var(--dc-accent);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 4px;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  min-height: 48px;
}

.dc-complete-btn:hover { background: #5aabff; }
.dc-complete-btn:active { transform: scale(0.98); }
.dc-complete-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Regenerate button */
.dc-regen-btn {
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  border: 1px dashed var(--dc-border);
  border-radius: 14px;
  background: transparent;
  color: var(--dc-text-dim);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.dc-regen-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--dc-accent);
  color: var(--dc-accent);
}

.dc-regen-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Dashboard ── */
.dc-dashboard {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dc-section {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--dc-border);
  background: var(--dc-surface);
}

.dc-radar-section {
  padding: 12px 8px;
}

/* Override SkillRadarChart warm colors to cool theme */
.dc-radar-section :deep(.radar-wrap) {
  border-color: var(--dc-border);
  background: transparent;
}

.dc-radar-section :deep(.value-fill) {
  fill: rgba(74, 158, 255, 0.18);
}

.dc-radar-section :deep(.value-stroke) {
  stroke: rgba(74, 158, 255, 0.85);
}

.dc-radar-section :deep(.ring) {
  stroke: rgba(255, 255, 255, 0.07);
}

.dc-radar-section :deep(.axis) {
  stroke: rgba(255, 255, 255, 0.08);
}

.dc-radar-section :deep(.label) {
  fill: rgba(255, 255, 255, 0.6);
}

.dc-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.dc-section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--dc-text);
}

.dc-section-hint {
  font-size: 12px;
  font-weight: 700;
  color: var(--dc-text-dim);
}

/* Achievements */
.dc-ach-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dc-ach {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid var(--dc-border);
  background: rgba(255, 255, 255, 0.02);
}

.dc-ach.unlocked {
  border-color: rgba(74, 158, 255, 0.2);
  background: rgba(74, 158, 255, 0.04);
}

.dc-ach-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--dc-border);
  background-size: cover;
  background-position: center;
}

.dc-ach-info { min-width: 0; }

.dc-ach-name {
  font-size: 13px;
  font-weight: 800;
  color: var(--dc-text);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dc-ach-desc {
  font-size: 12px;
  color: var(--dc-text-dim);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dc-ach-tag {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.dc-ach-tag.ok { background: rgba(46, 213, 115, 0.14); color: #7aebb0; }
.dc-ach-tag.locked { background: rgba(255, 255, 255, 0.04); color: var(--dc-text-dim); }

/* Perk Cards */
.dc-perk-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dc-perk {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--dc-border);
  background: rgba(255, 255, 255, 0.02);
}

.dc-perk.dc-pst-active { border-color: rgba(74, 158, 255, 0.2); }
.dc-perk.dc-pst-used { opacity: 0.65; }
.dc-perk.dc-pst-expired { opacity: 0.5; }

.dc-perk-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.dc-perk-title { font-size: 14px; font-weight: 800; color: var(--dc-text); }
.dc-perk-status { font-size: 12px; font-weight: 700; color: var(--dc-text-dim); }

.dc-perk-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
  margin: 0 0 10px;
}

.dc-perk-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dc-perk-time { font-size: 12px; color: var(--dc-text-dim); font-weight: 700; }

/* ── Tab Bar ── */
.dc-tabbar {
  flex-shrink: 0;
  display: flex;
  border-top: 1px solid var(--dc-border);
  background: rgba(255, 255, 255, 0.02);
  padding: 6px 8px;
  padding-bottom: max(6px, env(safe-area-inset-bottom));
}

.dc-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--dc-text-dim);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  min-height: 48px;
}

.dc-tab:hover { background: rgba(255, 255, 255, 0.04); }

.dc-tab.active {
  color: var(--dc-accent);
  background: var(--dc-accent-dim);
}

.dc-tab svg {
  width: 20px;
  height: 20px;
}

/* ── Buttons ── */
.dc-btn {
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  border: none;
  min-height: 44px;
}

.dc-btn:active { transform: scale(0.97); }
.dc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.dc-btn-accent { background: var(--dc-accent); color: #fff; }
.dc-btn-accent:hover { background: #5aabff; }

.dc-btn-outline {
  background: transparent;
  border: 1px solid var(--dc-border);
  color: var(--dc-text);
}
.dc-btn-outline:hover { background: rgba(255, 255, 255, 0.06); }

.dc-btn-ghost {
  background: transparent;
  color: var(--dc-text-dim);
}
.dc-btn-ghost:hover { background: rgba(255, 255, 255, 0.04); }

.dc-btn-sm { padding: 8px 14px; font-size: 13px; min-height: 36px; }

/* ── Dialogs ── */
.dc-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.dc-dialog {
  width: min(480px, 90vw);
  padding: 28px 24px;
  border-radius: 22px;
  background: #1a2a3a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.dc-dialog-sm { width: min(360px, 88vw); }

.dc-dialog-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 800;
  color: var(--dc-text);
}

.dc-dialog-sub {
  margin: 0 0 20px;
  font-size: 14px;
  color: var(--dc-text-dim);
}

.dc-dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 20px;
  flex-wrap: wrap;
}

/* Proof photo */
.dc-proof-picker { cursor: pointer; }

.dc-proof-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

/* Memory card dialog */
.dc-card-preview {
  margin: 16px 0;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--dc-border);
}

.dc-card-img {
  width: 100%;
  max-height: 280px;
  object-fit: cover;
  display: block;
}

.dc-card-options {
  display: flex;
  gap: 10px;
  margin: 16px 0;
}

.dc-card-options .dc-btn { flex: 1; text-align: center; }

.dc-card-replace {
  display: flex;
  justify-content: center;
  margin-bottom: 4px;
}

/* Age picker */
.dc-age-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 16px;
}

.dc-age-opt {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--dc-border);
  background: var(--dc-surface);
  color: var(--dc-text);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  min-height: 48px;
}

.dc-age-opt:hover { background: rgba(255, 255, 255, 0.08); }

.dc-age-opt.active {
  background: var(--dc-accent-dim);
  border-color: var(--dc-accent);
  color: var(--dc-accent);
}

.dc-age-opt:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Profile wrap ── */
.dc-profile-wrap {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.dc-logout-btn {
  display: block;
  width: 100%;
  margin-top: 24px;
  padding: 14px;
  border: 1px solid rgba(255, 71, 87, 0.25);
  border-radius: 14px;
  background: rgba(255, 71, 87, 0.08);
  color: #ff8a95;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.dc-logout-btn:hover {
  background: rgba(255, 71, 87, 0.15);
}

/* ── Transitions ── */
.dc-fade-enter-active { transition: opacity 0.25s ease; }
.dc-fade-leave-active { transition: opacity 0.2s ease; }
.dc-fade-enter-from,
.dc-fade-leave-to { opacity: 0; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .dc-header { padding: 12px 16px; }
  .dc-title { font-size: 17px; }
  .dc-body { padding: 12px 12px 6px; }
  .dc-stats { gap: 8px; }
  .dc-level { font-size: 12px; padding: 3px 10px; }
  .dc-xp { font-size: 12px; }

  .dc-dialog-actions {
    flex-direction: column;
  }

  .dc-dialog-actions .dc-btn {
    width: 100%;
    text-align: center;
  }
}

/* Desktop: limit content width */
@media (min-width: 769px) {
  .dc-body {
    max-width: 680px;
    margin: 0 auto;
    width: 100%;
  }
}
</style>
