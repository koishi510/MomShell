<template>
  <div class="dc-tab-content">
    <Transition name="dc-view" mode="out-in">
      <!-- Inline AI memory -->
      <DcAiMemory v-if="showInlineMemory" key="memory" @back="showInlineMemory = false; emit('update:show-memory', false)" />

      <div v-else key="chat" class="dc-chat-view">
        <div class="dc-section-header">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span class="dc-sh-text">./chat</span>
          <button v-if="authStore.isAuthenticated" class="dc-mem-btn" @click="showInlineMemory = true">记忆库</button>
        </div>

        <div class="dc-chat-wrap" :style="ambientStyle">
          <div class="dc-terminal-noise" />

          <div class="dc-messages" ref="messagesEl">
            <div class="dc-msg-list">
              <article
                v-for="msg in messages"
                :key="msg.id"
                :class="['dc-log-entry', `is-${msg.role}`]"
              >
                <template v-if="msg.role === 'user'">
                  <div class="dc-log-line dc-log-line-user">
                    <span class="dc-log-prompt dc-log-prompt-user">{{ userPrompt }}</span>
                    <span class="dc-log-command">{{ msg.text }}</span>
                  </div>
                </template>
                <template v-else-if="msg.role === 'system'">
                  <div class="dc-log-line dc-log-line-ai dc-log-line-memory">
                    <span class="dc-log-prompt dc-log-prompt-ai">{{ assistantPrompt }}</span>
                    <span class="dc-log-output dc-log-output-memory">{{ msg.text }}</span>
                  </div>
                </template>
                <template v-else>
                  <div class="dc-log-line dc-log-line-ai">
                    <span class="dc-log-prompt dc-log-prompt-ai">{{ assistantPrompt }}</span>
                    <pre class="dc-log-output">{{ getDisplayedText(msg) }}<span v-if="isStreamingMessage(msg)" class="dc-cursor" /></pre>
                  </div>
                </template>
              </article>

              <div v-if="sending" class="dc-log-line dc-log-line-ai dc-thinking-line">
                <span class="dc-log-prompt dc-log-prompt-ai">{{ assistantPrompt }}</span>
                <span class="dc-thinking-spinner" aria-live="polite">{{ thinkingFrame }}</span>
              </div>
            </div>

            <form
              v-if="!sending && !isStreaming"
              class="dc-log-line dc-log-line-user dc-terminal-input"
              @submit.prevent="onSend"
              @mousedown.prevent="focusInput"
            >
              <span class="dc-log-prompt dc-log-prompt-user">{{ userPrompt }}</span>
              <span class="dc-log-command dc-terminal-editor-mirror" aria-hidden="true">
                <span>{{ inputBeforeCaret }}</span>
                <span v-if="inputFocused" class="dc-terminal-editor-caret-anchor">{{ activeInputChar || '\u00a0' }}</span>
                <span>{{ inputAfterCaret }}</span>
              </span>
              <textarea
                ref="inputEl"
                v-model="input"
                class="dc-terminal-editor"
                rows="1"
                autocomplete="off"
                autocapitalize="off"
                enterkeyhint="send"
                spellcheck="false"
                @focus="onInputFocus"
                @blur="inputFocused = false"
                @input="onEditorInput"
                @click="syncCaret"
                @keyup="syncCaret"
                @keydown.left="syncCaretAfterKey"
                @keydown.right="syncCaretAfterKey"
                @keydown.home="syncCaretAfterKey"
                @keydown.end="syncCaretAfterKey"
                @keydown.up.prevent="navigateHistory('up')"
                @keydown.down.prevent="navigateHistory('down')"
                @keydown.enter.exact.prevent="onSend"
                />
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts">
interface ChatMessage {
  id: number
  role: 'user' | 'assistant' | 'system'
  text: string
  visualMeta?: import('@/lib/api/chat').VisualMetadata
}

const _messages: ChatMessage[] = []
let _sessionId: string | null = null
let _sessionCounter = 0
let _profileLoaded = false
let _preferredName: string | null = null
</script>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onUnmounted } from 'vue'
import DcAiMemory from './DcAiMemory.vue'
import { useAuthStore } from '@/stores/auth'
import {
  sendChatMessage,
  getChatProfile,
  type ChatResponse,
  type ChatProfile,
} from '@/lib/api/chat'

const authStore = useAuthStore()

const props = withDefaults(defineProps<{ visible?: boolean; showMemory?: boolean }>(), { visible: true, showMemory: false })
const emit = defineEmits<{ 'update:show-memory': [val: boolean] }>()

const messages = ref<ChatMessage[]>(_messages.map(m => ({ ...m })))
const input = ref('')
const sending = ref(false)
const messagesEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)
const sessionId = ref<string | null>(_sessionId)
const preferredName = ref<string | null>(_preferredName)
const typedLength = ref(0)
const streamingMessageId = ref<number | null>(null)
const thinkingIndex = ref(0)
const inputFocused = ref(false)
const caretIndex = ref(0)
const historyIndex = ref(-1)
const draftInput = ref('')
let typingTimer: ReturnType<typeof setInterval> | null = null
let thinkingTimer: ReturnType<typeof setInterval> | null = null
const showInlineMemory = ref(props.showMemory)
const STREAM_INTERVAL_MS = 20
const THINKING_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

watch(() => props.showMemory, (val) => {
  showInlineMemory.value = val
})

function startTypewriter(messageId: number, text: string, onDone?: () => void) {
  streamingMessageId.value = messageId
  typedLength.value = 0
  if (typingTimer) clearInterval(typingTimer)
  typingTimer = setInterval(() => {
    typedLength.value++
    scrollToBottom()
    if (typedLength.value >= text.length) {
      streamingMessageId.value = null
      clearInterval(typingTimer as ReturnType<typeof setInterval>)
      typingTimer = null
      syncPersistent()
      onDone?.()
    }
  }, STREAM_INTERVAL_MS)
}

const ambientColorMap: Record<string, { primary: string; secondary: string }> = {
  soft_pink: { primary: 'rgba(255,182,193,0.15)', secondary: 'rgba(255,228,225,0.05)' },
  warm_gold: { primary: 'rgba(255,215,0,0.12)', secondary: 'rgba(255,248,220,0.04)' },
  gentle_blue: { primary: 'rgba(135,206,235,0.12)', secondary: 'rgba(176,224,230,0.04)' },
  lavender: { primary: 'rgba(200,162,255,0.12)', secondary: 'rgba(230,230,250,0.04)' },
  neutral_white: { primary: 'rgba(255,255,255,0.06)', secondary: 'rgba(255,255,255,0.02)' },
  coral: { primary: 'rgba(255,127,80,0.12)', secondary: 'rgba(255,160,122,0.04)' },
  sage: { primary: 'rgba(143,188,143,0.12)', secondary: 'rgba(193,225,193,0.04)' },
}

const focusColorMap: Record<string, { border: string; glow: string }> = {
  soft_pink:     { border: 'rgba(255,182,193,0.25)', glow: 'rgba(255,182,193,0.08)' },
  warm_gold:     { border: 'rgba(255,215,0,0.25)',   glow: 'rgba(255,215,0,0.08)' },
  gentle_blue:   { border: 'rgba(135,206,235,0.25)', glow: 'rgba(135,206,235,0.08)' },
  lavender:      { border: 'rgba(200,162,255,0.25)', glow: 'rgba(200,162,255,0.08)' },
  neutral_white: { border: 'rgba(255,255,255,0.15)', glow: 'rgba(255,255,255,0.04)' },
  coral:         { border: 'rgba(255,127,80,0.25)',   glow: 'rgba(255,127,80,0.08)' },
  sage:          { border: 'rgba(143,188,143,0.25)', glow: 'rgba(143,188,143,0.08)' },
}

const latestColorTone = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const m = messages.value[i]
    if (m.role === 'assistant' && m.visualMeta?.color_tone) return m.visualMeta.color_tone
  }
  return 'gentle_blue'
})

const ambientStyle = computed(() => ({
  '--ambient-primary': ambientColorMap[latestColorTone.value]?.primary ?? ambientColorMap.gentle_blue.primary,
  '--ambient-secondary': ambientColorMap[latestColorTone.value]?.secondary ?? ambientColorMap.gentle_blue.secondary,
  '--focus-border': focusColorMap[latestColorTone.value]?.border ?? focusColorMap.gentle_blue.border,
  '--focus-glow': focusColorMap[latestColorTone.value]?.glow ?? focusColorMap.gentle_blue.glow,
}))

const promptUserName = computed(() => authStore.user?.username || preferredName.value || 'user')
const userPrompt = computed(() => `[${promptUserName.value}@momshell ~]$`)
const assistantPrompt = '[stone@momshell ~]$'
const isStreaming = computed(() => streamingMessageId.value !== null)
const thinkingFrame = computed(() => THINKING_FRAMES[thinkingIndex.value] ?? THINKING_FRAMES[0])
const commandHistory = computed(() => messages.value.filter((msg) => msg.role === 'user').map((msg) => msg.text))
const inputBeforeCaret = computed(() => input.value.slice(0, caretIndex.value))
const activeInputChar = computed(() => input.value[caretIndex.value] ?? '')
const inputAfterCaret = computed(() => input.value.slice(caretIndex.value + (activeInputChar.value ? 1 : 0)))

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return Date.now().toString(36) + (++_sessionCounter).toString(36)
}

function syncPersistent() {
  _messages.length = 0
  _messages.push(...messages.value.map(m => ({ ...m })))
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}

function clearEditableInput() {
  if (inputEl.value) {
    inputEl.value.value = ''
  }
  input.value = ''
  caretIndex.value = 0
  historyIndex.value = -1
  draftInput.value = ''
}

function startThinkingSpinner() {
  thinkingIndex.value = 0
  if (thinkingTimer) clearInterval(thinkingTimer)
  thinkingTimer = setInterval(() => {
    thinkingIndex.value = (thinkingIndex.value + 1) % THINKING_FRAMES.length
  }, 80)
}

function stopThinkingSpinner() {
  if (thinkingTimer) {
    clearInterval(thinkingTimer)
    thinkingTimer = null
  }
  thinkingIndex.value = 0
}

function focusInput() {
  nextTick(() => {
    if (!inputEl.value) return
    inputEl.value.focus()
    const length = inputEl.value.value.length
    inputEl.value.setSelectionRange(length, length)
    caretIndex.value = length
  })
}

function setInputValue(value: string) {
  input.value = value
  nextTick(() => {
    if (!inputEl.value) return
    inputEl.value.value = value
    const length = value.length
    inputEl.value.setSelectionRange(length, length)
    caretIndex.value = length
    scrollToBottom()
  })
}

function syncCaret() {
  if (!inputEl.value) return
  caretIndex.value = inputEl.value.selectionStart ?? input.value.length
}

function syncCaretAfterKey() {
  requestAnimationFrame(() => {
    syncCaret()
  })
}

function onInputFocus() {
  inputFocused.value = true
  syncCaret()
}

function onEditorInput() {
  syncCaret()
  scrollToBottom()
}

function navigateHistory(direction: 'up' | 'down') {
  if (!commandHistory.value.length || sending.value || isStreaming.value) return

  if (direction === 'up') {
    if (historyIndex.value === -1) {
      draftInput.value = input.value
      historyIndex.value = commandHistory.value.length - 1
    } else {
      historyIndex.value = Math.max(0, historyIndex.value - 1)
    }
    setInputValue(commandHistory.value[historyIndex.value] ?? '')
    return
  }

  if (historyIndex.value === -1) return
  const nextIndex = historyIndex.value + 1
  if (nextIndex >= commandHistory.value.length) {
    historyIndex.value = -1
    setInputValue(draftInput.value)
    return
  }
  historyIndex.value = nextIndex
  setInputValue(commandHistory.value[historyIndex.value] ?? '')
}

function isStreamingMessage(msg: ChatMessage) {
  return msg.role === 'assistant' && streamingMessageId.value === msg.id
}

function getDisplayedText(msg: ChatMessage) {
  if (!isStreamingMessage(msg)) return msg.text
  return msg.text.slice(0, typedLength.value)
}

async function loadProfile() {
  if (_profileLoaded) {
    preferredName.value = _preferredName
    return
  }
  try {
    const profile: ChatProfile = await getChatProfile()
    _preferredName = profile.preferred_name
    _profileLoaded = true
    preferredName.value = _preferredName
  } catch {
    _profileLoaded = true
  }
}

watch(() => props.visible, (open) => {
  if (open) {
    scrollToBottom()
    focusInput()
    if (authStore.isAuthenticated && !_profileLoaded) {
      loadProfile()
    }
  }
}, { immediate: true })

watch(isStreaming, (streaming) => {
  if (!streaming && props.visible && !showInlineMemory.value) {
    focusInput()
  }
})

watch(input, () => {
  if (!showInlineMemory.value) {
    scrollToBottom()
  }
})

onUnmounted(() => {
  if (typingTimer) {
    clearInterval(typingTimer)
    typingTimer = null
  }
  stopThinkingSpinner()
})

async function onSend() {
  const text = input.value.trim()
  if (!text || sending.value || isStreaming.value) return

  if (!sessionId.value) {
    sessionId.value = generateSessionId()
    _sessionId = sessionId.value
  }

  messages.value = [
    ...messages.value,
    { id: Date.now(), role: 'user', text },
  ]
  clearEditableInput()
  sending.value = true
  startThinkingSpinner()
  syncPersistent()
  scrollToBottom()

  try {
    const res: ChatResponse = await sendChatMessage({
      content: text,
      session_id: sessionId.value,
    })
    const msgId = Date.now()
    const assistantMsg: ChatMessage = {
      id: msgId,
      role: 'assistant',
      text: res.text,
      visualMeta: res.visual_metadata,
    }
    messages.value = [...messages.value, assistantMsg]
    startTypewriter(msgId, res.text, () => {
      if (!res.memory_updated) return
      messages.value = [
        ...messages.value,
        { id: Date.now() + 1, role: 'system', text: '记忆已更新' },
      ]
      syncPersistent()
      scrollToBottom()
    })
  } catch {
    const msgId = Date.now()
    messages.value = [
      ...messages.value,
      { id: msgId, role: 'assistant', text: '暂时无法回复，请稍后再试。' },
    ]
    startTypewriter(msgId, '暂时无法回复，请稍后再试。')
  } finally {
    sending.value = false
    stopThinkingSpinner()
    syncPersistent()
    scrollToBottom()
  }
}
</script>

<style scoped>
.dc-tab-content { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dc-view-enter-active { animation: fadeIn 0.3s ease-out; }
.dc-view-leave-active { transition: opacity 0.15s ease; }
.dc-view-leave-to { opacity: 0; }

.dc-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding-top: 8px; color: var(--dc-accent, #7DCFFF); }
.dc-sh-icon { color: var(--dc-accent, #7DCFFF); }
.dc-sh-text { font-family: var(--dc-font-mono); font-size: 13px; font-weight: bold; }

.dc-mem-btn {
  margin-left: auto;
  background: transparent;
  border: 1px solid rgba(125, 207, 255, 0.18);
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 11px;
  padding: 5px 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.dc-mem-btn:hover { border-color: rgba(125, 207, 255, 0.35); color: var(--dc-accent, #7DCFFF); background: rgba(125, 207, 255, 0.08); }

.dc-chat-wrap {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 220px);
  min-height: 340px;
  position: relative;
  background:
    radial-gradient(circle at top right, var(--ambient-secondary, rgba(125, 207, 255, 0.05)) 0%, transparent 42%),
    linear-gradient(180deg, rgba(10, 14, 24, 0.98) 0%, rgba(6, 9, 16, 0.98) 100%);
  border: 1px solid var(--focus-border, rgba(125, 207, 255, 0.18));
  border-radius: var(--dc-radius, 2px);
  overflow: hidden;
}

.dc-terminal-noise {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 12%),
    repeating-linear-gradient(
      180deg,
      rgba(255,255,255,0.02) 0,
      rgba(255,255,255,0.02) 1px,
      transparent 1px,
      transparent 4px
    );
  opacity: 0.4;
}

.dc-messages {
  flex: 1;
  overflow-y: auto;
  padding: 18px 18px 22px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
  scrollbar-width: thin;
  scrollbar-color: rgba(125, 207, 255, 0.12) transparent;
  scrollbar-gutter: stable both-edges;
}

.dc-msg-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dc-log-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dc-log-line {
  display: block;
  font-family: var(--dc-font-mono);
  font-size: 13px;
  line-height: 1.8;
}

.dc-log-line-user {
  color: var(--dc-text, #C0CAF5);
}

.dc-log-prompt {
  font-family: var(--dc-font-mono);
  font-size: 13px;
  line-height: 1.8;
  white-space: nowrap;
  display: inline;
  margin-right: 6px;
}

.dc-log-prompt-user {
  color: var(--dc-success, #9ECE6A);
}

.dc-log-prompt-ai {
  color: var(--dc-accent, #7DCFFF);
}

.dc-log-command {
  display: inline;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: var(--dc-text, #C0CAF5);
  white-space: pre-wrap;
  word-break: break-word;
}

.dc-log-output {
  display: inline;
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: var(--dc-text, #C0CAF5);
  white-space: pre-wrap;
  word-break: break-word;
}

.dc-log-line-memory {
  color: var(--dc-comment, #8b92b5);
}

.dc-log-output-memory {
  color: var(--dc-text, #C0CAF5);
}

.dc-thinking-line {
  color: var(--dc-comment, #8b92b5);
}

.dc-thinking-spinner {
  display: inline-block;
  width: 1ch;
  text-align: center;
  font-family: var(--dc-font-mono);
  font-size: inherit;
  line-height: inherit;
  color: var(--dc-accent, #7DCFFF);
  transform: translateY(1px);
}

.dc-terminal-input {
  margin-top: 18px;
  position: relative;
}

.dc-terminal-editor-mirror {
  display: inline;
  white-space: pre-wrap;
  word-break: break-word;
}

.dc-terminal-editor-caret-anchor {
  position: relative;
  display: inline-block;
}

.dc-terminal-editor-caret-anchor::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.08em;
  height: 2px;
  background: var(--dc-accent, #7DCFFF);
  border-radius: 999px;
  animation: terminal-cursor-blink 1s steps(1, end) infinite;
}

.dc-terminal-editor {
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  border: none;
  background: transparent;
  color: transparent;
  caret-color: transparent;
  resize: none;
  overflow: hidden;
  outline: none;
  font: inherit;
  line-height: inherit;
  padding: 0;
  margin: 0;
  pointer-events: none;
  opacity: 0;
}

@keyframes terminal-cursor-blink {
  50% { opacity: 0; }
}

.dc-cursor {
  display: inline-block;
  width: 8px;
  height: 1.15em;
  background: var(--dc-accent, #7DCFFF);
  margin-left: 3px;
  vertical-align: text-bottom;
  animation: cursorBlink 0.8s steps(2) infinite;
}
@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@media (max-width: 768px) {
  .dc-chat-wrap { height: calc(100vh - 200px); }
  .dc-messages { padding: 16px 12px 18px; }
  .dc-log-line { font-size: 16px; line-height: 1.6; }
  .dc-log-prompt { font-size: inherit; line-height: inherit; margin-right: 8px; }
  .dc-terminal-input {
    margin-top: 14px;
  }
}
</style>
