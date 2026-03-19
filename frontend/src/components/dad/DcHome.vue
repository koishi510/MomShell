<template>
  <div class="dc-tab-content">
    <div class="dc-section-header">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
      <span class="dc-sh-text">./home</span>
    </div>

    <!-- Welcome Header -->
    <div class="dc-home-header dc-float" style="--float-i:0">
      <h2 class="dc-greeting">欢迎来到 <span class="dc-hl">MomShell</span></h2>
      <p class="dc-subtitle">版本 1.3.0</p>
    </div>

    <!-- Main Dashboard Grid -->
    <div class="dc-grid">
      <!-- Status Widget -->
      <div class="dc-widget dc-float" style="--float-i:1">
        <div class="dc-widget-header">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="dc-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span>系统状态</span>
        </div>
        <div class="dc-widget-body">
          <div class="dc-status-item">
            <span class="dc-status-label">内核同步:</span>
            <span class="dc-status-val dc-success">安全</span>
          </div>
          <div class="dc-status-item">
            <span class="dc-status-label">网络连接:</span>
            <span class="dc-status-val dc-accent">已连接</span>
          </div>
          <div class="dc-status-item">
            <span class="dc-status-label">当前任务:</span>
            <span class="dc-status-val dc-text">支持与关爱</span>
          </div>
        </div>
      </div>

      <!-- Daily Tip Widget -->
      <div class="dc-widget dc-float" style="--float-i:2">
        <div class="dc-widget-header">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="dc-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span>每日简报</span>
          <button v-if="!briefingLoading" class="dc-refresh-btn" @click="refreshBriefing" title="刷新">&#8635;</button>
        </div>
        <div class="dc-widget-body">
          <div v-if="loadingTips" class="dc-loading-text" style="color: var(--dc-comment, #565F89); font-size: 13px;">正在生成 AI 简报...</div>
          <template v-else-if="tipsData && tipsData.tips">
            <p class="dc-tip-text">"{{ tipsData.tips }}"</p>
          </template>
          <template v-else>
            <p class="dc-tip-text">"{{ briefingQuote }}"</p>
            <p class="dc-tip-sub">- {{ briefingTip }}</p>
          </template>
        </div>
      </div>
    </div>

    <!-- Quick Actions Grid -->
    <h3 class="dc-section-title dc-float" style="--float-i:3">快捷指令</h3>
    <div class="dc-action-grid">
      <button class="dc-action-card dc-float" style="--float-i:4" @click="$emit('navigate', 'tasks')">
        <div class="dc-action-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path></svg>
        </div>
        <div class="dc-action-text">
          <span class="dc-action-title">任务队列</span>
          <span class="dc-action-desc">./issue</span>
        </div>
      </button>

      <button class="dc-action-card dc-float" style="--float-i:5" @click="$emit('navigate', 'dashboard')">
        <div class="dc-action-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10m-6 10V4M6 20v-4"></path></svg>
        </div>
        <div class="dc-action-text">
          <span class="dc-action-title">系统遥测</span>
          <span class="dc-action-desc">./status</span>
        </div>
      </button>

      <button class="dc-action-card dc-float" style="--float-i:6" @click="$emit('navigate', 'chat')">
        <div class="dc-action-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"></path></svg>
        </div>
        <div class="dc-action-text">
          <span class="dc-action-title">AI 通信</span>
          <span class="dc-action-desc">./chat</span>
        </div>
      </button>

      <button class="dc-action-card dc-float" style="--float-i:7" @click="$emit('navigate', 'community')">
        <div class="dc-action-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path></svg>
        </div>
        <div class="dc-action-text">
          <span class="dc-action-title">互助网络</span>
          <span class="dc-action-desc">./community</span>
        </div>
      </button>

      <button class="dc-action-card dc-float" style="--float-i:8" @click="$emit('navigate', 'whisper')">
        <div class="dc-action-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"></path></svg>
        </div>
        <div class="dc-action-text">
          <span class="dc-action-title">心语情报</span>
          <span class="dc-action-desc">./whisper</span>
        </div>
      </button>

      <button class="dc-action-card dc-float" style="--float-i:9" @click="$emit('navigate', 'profile')">
        <div class="dc-action-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>
        </div>
        <div class="dc-action-text">
          <span class="dc-action-title">个人资料</span>
          <span class="dc-action-desc">./profile</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getWhisperTips, type WhisperTips } from '@/lib/api/whisper'

defineEmits<{
  navigate: [tab: string]
}>()

const tipsData = ref<WhisperTips | null>(null)
const loadingTips = ref(false)

const BRIEFINGS = [
  { quote: '父亲能为孩子做的最重要的事情，就是爱他们的母亲。', tip: '今天给妈妈一个拥抱，告诉她辛苦了。' },
  { quote: '陪伴是最长情的告白。', tip: '放下手机，和孩子一起玩20分钟。' },
  { quote: '孩子的安全感，来自父亲的肩膀。', tip: '检查任务队列，完成一项待办任务。' },
  { quote: '最好的教育，是言传身教。', tip: '今天带孩子做一件有意义的小事。' },
  { quote: '不要等到完美才开始，开始了才会完美。', tip: '从任务列表里挑一个最简单的开始做。' },
  { quote: '家是最小国，国是千万家。', tip: '和家人一起吃一顿饭，聊聊今天的趣事。' },
  { quote: '耐心是给孩子最好的礼物。', tip: '今天试着多听孩子说，少急着给答案。' },
  { quote: '成长不可逆，每一天都值得珍惜。', tip: '用手机记录一个孩子今天的可爱瞬间。' },
  { quote: '真正的强大，是温柔地对待最亲近的人。', tip: '主动承担一项家务，让妈妈休息一会。' },
  { quote: '你不必完美，但你需要在场。', tip: '今晚给孩子讲一个睡前故事。' },
  { quote: '每个孩子都是独一无二的星星。', tip: '发现并夸赞孩子今天做得好的一件事。' },
  { quote: '父爱如山，不在于高度，而在于厚度。', tip: '查看心声情报，了解妈妈最近的心情。' },
  { quote: '最好的投资，是投资在家人身上。', tip: '计划一次周末家庭活动。' },
  { quote: '生活的意义，在于那些微小而确定的幸福。', tip: '给家人准备一份小惊喜。' },
  { quote: '做一个有温度的爸爸。', tip: '今天主动问问妈妈需要什么帮助。' },
  { quote: '孩子不会记住你给了什么，只会记住你陪了多久。', tip: '抽出30分钟陪孩子做他喜欢的事。' },
  { quote: '情绪稳定，是一个家庭最大的风水。', tip: '遇到烦心事时，先深呼吸三次再回应。' },
  { quote: '父亲的格局，决定孩子的未来。', tip: '和孩子分享一个你今天学到的新知识。' },
  { quote: '幸福不是拥有最多，而是需要最少。', tip: '整理一下家里不用的物品，简化生活。' },
  { quote: '爱是动词，需要每天练习。', tip: '对家里每个人说一句感谢的话。' },
  { quote: '好爸爸不是天生的，是练出来的。', tip: '回顾本周完成的任务，看看自己的进步。' },
  { quote: '与其担心未来，不如把握当下。', tip: '今天专注完成任务队列中的第一个任务。' },
  { quote: '有质量的十分钟，胜过心不在焉的一小时。', tip: '和孩子全身心地玩一个短游戏。' },
  { quote: '家庭的温度，取决于你回家时的态度。', tip: '进门前调整心情，用微笑打开家门。' },
  { quote: '一个微笑，能治愈一天的疲惫。', tip: '给妈妈发一条温暖的消息。' },
  { quote: '沟通是桥梁，沉默是高墙。', tip: '今天和妈妈聊聊最近的感受。' },
  { quote: '成为孩子的榜样，比成为孩子的英雄更重要。', tip: '让孩子看到你认真做事的样子。' },
  { quote: '每一次弯腰系鞋带，都是最温柔的力量。', tip: '帮孩子做一件他还做不到的小事。' },
  { quote: '用心倾听，是最好的回应。', tip: '今天找机会认真听妈妈说完一件事。' },
  { quote: '幸福的家庭都相似：彼此尊重，互相支持。', tip: '在社区互助网络看看其他爸爸的经验。' },
]

const briefingQuote = ref('')
const briefingTip = ref('')
const briefingLoading = ref(false)

function getDayIndex(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return dayOfYear % BRIEFINGS.length
}

function setBriefing(index: number) {
  const b = BRIEFINGS[index]
  briefingQuote.value = b.quote
  briefingTip.value = b.tip
}

const TIPS_CACHE_KEY = 'dc_briefing_cache'

function cacheTips(data: WhisperTips) {
  try { sessionStorage.setItem(TIPS_CACHE_KEY, JSON.stringify(data)) } catch { /* ignore quota errors */ }
}

function loadCachedTips(): WhisperTips | null {
  try {
    const raw = sessionStorage.getItem(TIPS_CACHE_KEY)
    return raw ? JSON.parse(raw) as WhisperTips : null
  } catch { return null }
}

function refreshBriefing() {
  loadingTips.value = true
  getWhisperTips()
    .then((data) => { tipsData.value = data; cacheTips(data) })
    .catch(() => {
      const current = BRIEFINGS.findIndex((b) => b.quote === briefingQuote.value)
      const arr = new Uint32Array(1)
      crypto.getRandomValues(arr)
      let next = arr[0] % BRIEFINGS.length
      while (next === current && BRIEFINGS.length > 1) {
        crypto.getRandomValues(arr)
        next = arr[0] % BRIEFINGS.length
      }
      setBriefing(next)
    })
    .finally(() => { loadingTips.value = false })
}

onMounted(async () => {
  setBriefing(getDayIndex())
  const cached = loadCachedTips()
  if (cached) {
    tipsData.value = cached
    return
  }
  loadingTips.value = true
  try {
    const data = await getWhisperTips()
    tipsData.value = data
    cacheTips(data)
  } catch (e) {
    console.error('Failed to load tips:', e)
  } finally {
    loadingTips.value = false
  }
})
</script>

<style scoped>
.dc-tab-content { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Staggered float-up for child elements */
.dc-float {
  animation: floatUp 0.4s ease-out both;
  animation-delay: calc(var(--float-i, 0) * 0.05s);
}
@keyframes floatUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.dc-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-top: 8px; color: var(--dc-accent, #7DCFFF); }
.dc-sh-icon { color: var(--dc-accent, #7DCFFF); }
.dc-sh-text { font-family: var(--dc-font-mono); font-size: 13px; font-weight: bold; }

/* Header */
.dc-home-header {
  margin-bottom: 24px;
  text-align: center;
}

.dc-greeting {
  font-family: var(--dc-font-mono);
  font-size: 20px;
  margin: 0 0 8px;
  color: var(--dc-text);
  font-weight: bold;
}

.dc-hl { color: var(--dc-accent, #7DCFFF); }

.dc-subtitle {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: var(--dc-comment, #565F89);
  margin: 0;
}

/* Grid */
.dc-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 32px;
}

@media (min-width: 768px) {
  .dc-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Widgets */
.dc-widget {
  background: var(--dc-surface, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.dc-widget-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--dc-font-mono);
  font-size: 12px;
  font-weight: bold;
  color: var(--dc-comment, #565F89);
  margin-bottom: 12px;
  border-bottom: 1px dashed var(--dc-border, rgba(255, 255, 255, 0.15));
  padding-bottom: 8px;
}

.dc-icon {
  color: var(--dc-accent, #7DCFFF);
}

.dc-widget-body {
  flex: 1;
}

/* Status Widget */
.dc-status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-family: var(--dc-font-mono);
  font-size: 13px;
}
.dc-status-item:last-child { margin-bottom: 0; }

.dc-status-label { color: var(--dc-text, #C0CAF5); }
.dc-status-val.dc-success { color: var(--dc-success, #9ECE6A); }
.dc-status-val.dc-accent { color: var(--dc-accent, #7DCFFF); }
.dc-status-val.dc-text { color: var(--dc-text, #C0CAF5); }

/* Tip Widget */
.dc-tip-text {
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 12px;
  font-style: italic;
  color: var(--dc-text, #C0CAF5);
}

.dc-tip-sub {
  font-size: 12px;
  color: var(--dc-comment, #565F89);
  margin: 0;
  line-height: 1.4;
}

.dc-refresh-btn {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--dc-comment, #565F89);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.2s;
}
.dc-refresh-btn:hover { color: var(--dc-accent, #7DCFFF); }

/* Section Title */
.dc-section-title {
  font-family: var(--dc-font-mono);
  font-size: 12px;
  font-weight: bold;
  color: var(--dc-comment, #565F89);
  margin: 0 0 16px;
  letter-spacing: 1px;
}

/* Action Grid */
.dc-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.dc-action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--dc-bg2, #24283B);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.dc-action-card:hover {
  background: var(--dc-surface, rgba(255, 255, 255, 0.05));
  border-color: rgba(125, 207, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.dc-action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(125, 207, 255, 0.1);
  color: var(--dc-accent, #7DCFFF);
  border-radius: var(--dc-radius, 2px);
  flex-shrink: 0;
}

.dc-action-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dc-action-title {
  font-family: var(--dc-font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--dc-text, #C0CAF5);
}

.dc-action-desc {
  font-family: var(--dc-font-mono);
  font-size: 11px;
  color: var(--dc-comment, #565F89);
}
</style>
