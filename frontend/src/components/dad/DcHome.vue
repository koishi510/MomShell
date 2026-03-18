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
        </div>
        <div class="dc-widget-body">
          <div v-if="loadingTips" class="dc-loading-text" style="color: var(--dc-comment, #565F89); font-size: 13px;">正在生成 AI 简报...</div>
          <template v-else-if="tipsData && tipsData.tips">
            <p class="dc-tip-text">"{{ tipsData.tips }}"</p>
          </template>
          <template v-else>
            <p class="dc-tip-text">"父亲能为孩子做的最重要的事情，就是爱他们的母亲。"</p>
            <p class="dc-tip-sub">- 记得检查队列并完成使命</p>
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

onMounted(async () => {
  loadingTips.value = true
  try {
    tipsData.value = await getWhisperTips()
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
