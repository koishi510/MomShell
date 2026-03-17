<template>
  <header class="dc-header">
    <div class="dc-brand">
      <div class="dc-prompt">
        <span class="prompt-user">dad@momshell</span><span class="prompt-colon">:</span><span class="prompt-path">~</span><span class="prompt-char">$</span>
        <input v-model="cmdInput" class="dc-head-input" placeholder="_" @keydown.enter="submitCmd" />
      </div>
      <div class="dc-subtitle">daemon: <span class="dc-status-text">running</span></div>
    </div>
    <div class="dc-header-right">
      <button v-if="currentAge" class="dc-term-btn" @click="$emit('open-age-picker')">
        [{{ ageLabel(currentAge) }}]
      </button>
      <button v-else class="dc-term-btn dc-term-btn-alert" @click="$emit('open-age-picker')">
        [REQ_AGE]
      </button>
      <div v-if="stats" class="dc-stats">
        <span class="dc-level">LVL={{ stats.level }}</span>
        <span class="dc-xp">XP={{ stats.xp }}</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TaskStats } from '@/lib/api/task'

defineProps<{
  stats: TaskStats | null
  currentAge: string
}>()

const emit = defineEmits<{
  'open-age-picker': []
  'command': [cmd: string]
}>()

const cmdInput = ref('')

function submitCmd(e: KeyboardEvent) {
  const target = e.target as HTMLInputElement
  const raw = cmdInput.value.trim()
  if (!raw) return
  emit('command', raw)
  cmdInput.value = ''
  target.blur()
}

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
  align-items: flex-end;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--dc-bg, #1A1B26);
  border-bottom: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
}

.dc-brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dc-prompt {
  font-family: var(--dc-font-mono);
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
}

.prompt-user { color: var(--dc-success, #9ECE6A); }
.prompt-colon { color: var(--dc-text, #C0CAF5); }
.prompt-path { color: var(--dc-accent, #7DCFFF); }
.prompt-char { color: var(--dc-text, #C0CAF5); margin-left: 8px; margin-right: 8px;}

.dc-head-input {
  background: transparent;
  border: none;
  color: var(--dc-text, #C0CAF5);
  font-family: var(--dc-font-mono);
  font-size: 16px;
  outline: none;
  width: 150px;
  padding: 0;
  margin: 0;
}
.dc-head-input::placeholder {
  color: var(--dc-accent, #7DCFFF);
  opacity: 1;
  animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink { 50% { opacity: 0; } }

.dc-subtitle {
  font-family: var(--dc-font-mono);
  font-size: 11px;
  color: var(--dc-comment, #565F89);
}

.dc-status-text {
  color: var(--dc-success, #9ECE6A);
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
  color: var(--dc-accent, #7DCFFF);
  font-family: var(--dc-font-mono);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.dc-term-btn:hover {
  text-decoration: underline;
}

.dc-term-btn-alert { color: var(--dc-warn, #FF9E64); }

.dc-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: var(--dc-text, #C0CAF5);
}

.dc-level {
  color: var(--dc-accent, #7DCFFF);
}

.dc-xp {
  color: var(--dc-comment, #565F89);
}
</style>
