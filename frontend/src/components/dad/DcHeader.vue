<template>
  <header class="dc-header">
    <div class="dc-brand">
      <div class="dc-prompt">
        <span class="prompt-user">[{{ promptUsername }}@momshell ~]$</span>
        <div class="dc-head-input-wrap">
          <span ref="cmdInputMirrorRef" class="dc-head-input-mirror" aria-hidden="true">{{ cmdBeforeCursor }}</span>
          <input
            ref="cmdInputRef"
            v-model="cmdInput"
            :maxlength="MAX_CMD_LENGTH"
            class="dc-head-input"
            @focus="handleFocus"
            @blur="isFocused = false"
            @input="handleInput"
            @click="syncCaretPosition"
            @keyup="syncCaretPosition"
            @mouseup="syncCaretPosition"
            @select="syncCaretPosition"
            @keydown.enter="submitCmd"
            @keydown.tab.prevent="handleTabComplete"
            @keydown="onKeyDown"
          />
          <span
            v-if="isFocused"
            class="dc-head-cursor"
            :style="{ transform: `translateX(${cursorOffset}px)` }"
            aria-hidden="true"
          ></span>
        </div>
      </div>
      <div class="dc-subtitle">daemon: <span class="dc-status-text">running</span></div>
    </div>
    <div class="dc-header-right">
      <button v-if="currentAge" class="dc-term-btn" @click="$emit('open-age-picker')">
        [{{ ageLabel(currentAge) }}]
      </button>
      <button v-else class="dc-term-btn dc-term-btn-alert" @click="$emit('open-age-picker')">
        [设置年龄]
      </button>
      <div v-if="stats" class="dc-stats">
        <span class="dc-level">LVL={{ stats.level }}</span>
        <span class="dc-xp">XP={{ stats.xp }}</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { TaskStats } from '@/lib/api/task'
import { useAuthStore } from '@/stores/auth'

defineProps<{
  stats: TaskStats | null
  currentAge: string
}>()

const emit = defineEmits<{
  'open-age-picker': []
  'command': [cmd: string]
}>()

const authStore = useAuthStore()
const MAX_CMD_LENGTH = 32
const cmdInput = ref('')
const isFocused = ref(false)
const caretIndex = ref(0)
const cursorOffset = ref(0)
const cmdInputRef = ref<HTMLInputElement | null>(null)
const cmdInputMirrorRef = ref<HTMLSpanElement | null>(null)
const promptUsername = computed(() => authStore.user?.username || 'dad')
const cmdBeforeCursor = computed(() => cmdInput.value.slice(0, caretIndex.value))

async function syncCursorOffset() {
  await nextTick()
  cursorOffset.value = cmdInputMirrorRef.value?.offsetWidth ?? 0
}

async function syncCaretPosition() {
  await nextTick()
  const input = cmdInputRef.value
  if (!input) return
  caretIndex.value = input.selectionStart ?? cmdInput.value.length
  await syncCursorOffset()
}

function handleFocus() {
  isFocused.value = true
  void syncCaretPosition()
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.value.length > MAX_CMD_LENGTH) {
    const limited = target.value.slice(0, MAX_CMD_LENGTH)
    target.value = limited
    cmdInput.value = limited
  }
  void syncCaretPosition()
}

function submitCmd(e: KeyboardEvent) {
  const target = e.target as HTMLInputElement
  const raw = cmdInput.value.trim()
  if (!raw) return
  emit('command', raw)
  cmdInput.value = ''
  caretIndex.value = 0
  tabCycleMatches.value = []
  target.blur()
}

// ── Tab completion ──
const COMMANDS = [
  'home', './home',
  'issue', './issue',
  'status', './status',
  'chat', './chat',
  'community', './community',
  'whisper', './whisper',
  'profile', './profile',
  'memory', './memory',
  'logout', 'exit', 'quit',
]
const tabCycleMatches = ref<string[]>([])
let tabCycleIndex = 0
let lastTabPrefix = ''

function handleTabComplete() {
  const current = cmdInput.value
  if (!current) return

  // If we're already cycling, advance to next match
  if (tabCycleMatches.value.length > 0 && current === tabCycleMatches.value[tabCycleIndex]) {
    tabCycleIndex = (tabCycleIndex + 1) % tabCycleMatches.value.length
    cmdInput.value = tabCycleMatches.value[tabCycleIndex]
    void syncCaretPosition()
    return
  }

  // New prefix — find matches
  lastTabPrefix = current.toLowerCase()
  const matches = COMMANDS.filter((c) => c.startsWith(lastTabPrefix))
  if (matches.length === 0) return

  tabCycleMatches.value = matches
  tabCycleIndex = 0
  cmdInput.value = matches[0]
  void syncCaretPosition()
}

function onKeyDown(e: KeyboardEvent) {
  // Reset tab cycle on any key except Tab
  if (e.key !== 'Tab') {
    tabCycleMatches.value = []
  }
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

watch(cmdBeforeCursor, () => {
  void syncCursorOffset()
})

onMounted(() => {
  void syncCaretPosition()
})
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
.prompt-char { color: var(--dc-text, #C0CAF5); }

.dc-head-input-wrap {
  position: relative;
  display: inline-block;
  width: 32ch;
  min-width: 32ch;
  max-width: 32ch;
  margin-left: 1ch;
}

.dc-head-input-mirror {
  position: absolute;
  left: 0;
  top: 0;
  visibility: hidden;
  white-space: pre;
  font-family: var(--dc-font-mono);
  font-size: 16px;
  font-weight: bold;
  line-height: 1.2;
  pointer-events: none;
}

.dc-head-input {
  display: block;
  background: transparent;
  border: none;
  color: var(--dc-text, #C0CAF5);
  font-family: var(--dc-font-mono);
  font-size: 16px;
  font-weight: bold;
  line-height: 1.2;
  caret-color: transparent;
  outline: none;
  width: 100%;
  padding: 0;
  margin: 0;
}

.dc-head-cursor {
  position: absolute;
  left: 0;
  bottom: 0.06em;
  width: 0.72ch;
  height: 2px;
  background: var(--dc-accent, #7DCFFF);
  border-radius: 999px;
  opacity: 1;
  animation: terminal-cursor-blink 1s steps(1, end) infinite;
  pointer-events: none;
}

@keyframes terminal-cursor-blink {
  50% { opacity: 0; }
}

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
