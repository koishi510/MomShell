<template>
  <header class="dc-header">
    <div class="dc-brand">
      <div class="dc-traffic-dots">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
      </div>
      <div class="dc-brand-text">
        <h1 class="dc-title"><span class="dc-title-shimmer">MomShell</span><span class="dc-cursor">_</span></h1>
        <div class="dc-subtitle">KERNEL_SYNC: <span class="dc-status-text">SECURE</span></div>
      </div>
    </div>
    <div class="dc-header-right">
      <button v-if="currentAge" class="dc-term-btn" @click="$emit('open-age-picker')">
        [{{ ageLabel(currentAge) }}]
      </button>
      <button v-else class="dc-term-btn dc-term-btn-alert" @click="$emit('open-age-picker')">
        [REQ_AGE]
      </button>
      <div v-if="stats" class="dc-stats">
        <span class="dc-level">[LVL.{{ stats.level }}]</span>
        <span class="dc-xp">{{ stats.xp }} XP</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { TaskStats } from '@/lib/api/task'

defineProps<{
  stats: TaskStats | null
  currentAge: string
}>()

defineEmits<{
  'open-age-picker': []
}>()

const AGE_LABELS: Record<string, string> = {
  pregnancy: '孕期',
  '0-3m': '0-3个月',
  '3-6m': '3-6个月',
  '6-12m': '6-12个月',
  '1-2y': '1-2岁',
  '2-3y': '2-3岁',
  '3-4y': '3-4岁',
  '4-5y': '4-5岁',
}

function ageLabel(v: string) { return AGE_LABELS[v] || v }
</script>

<style scoped>
.dc-header {
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(10, 14, 20, 0.9);
  border-bottom: 1px solid transparent;
  background-clip: padding-box;
}

.dc-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--dc-gradient-iri, linear-gradient(135deg, #7dd3fc, #a78bfa, #f0abfc, #67e8f9));
  opacity: 0.5;
}

.dc-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dc-traffic-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red { background: #ff5f57; }
.dot-yellow { background: #febc2e; }
.dot-green { background: #28c840; }

.dc-brand-text {
  display: flex;
  flex-direction: column;
}

.dc-title {
  margin: 0;
  font-family: var(--dc-font-mono);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
}

.dc-title-shimmer {
  background: linear-gradient(135deg, #7dd3fc, #a78bfa, #f0abfc, #67e8f9, #7dd3fc);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: iri-shift 6s ease-in-out infinite;
}

.dc-cursor {
  display: inline-block;
  width: 8px;
  color: #7dd3fc;
  animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink { 50% { opacity: 0; } }

@keyframes iri-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.dc-subtitle {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.dc-status-text {
  color: #2dd4bf;
  font-weight: bold;
}

.dc-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.dc-term-btn {
  background: transparent;
  border: none;
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.dc-term-btn-alert { color: #fbbf24; }

.dc-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--dc-font-mono);
  font-variant-numeric: tabular-nums;
}

.dc-level {
  color: #7dd3fc;
  font-size: 11px;
  font-weight: 700;
}

.dc-xp {
  color: rgba(255, 255, 255, 0.3);
  font-size: 11px;
}
</style>
