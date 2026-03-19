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

        <div
          v-if="selectedChatStyle === 'ambient'"
          class="dc-chat-wrap dc-chat-wrap-ambient"
          :style="ambientStyle"
        >
          <div class="dc-ambient-bg" :style="ambientGradientStyle" />

          <Transition name="dc-grid">
            <div v-if="showGridPulse" class="dc-send-grid" />
          </Transition>

          <Transition name="dc-toast">
            <div v-if="showMemoryToast" class="dc-memory-toast">记忆已更新</div>
          </Transition>

          <div class="dc-messages dc-messages-ambient" ref="messagesEl">
            <Transition name="dc-msg-replace" mode="out-in">
              <div v-if="messages.length === 0 && !sending" key="empty" class="dc-chat-empty">
                <p class="dc-empty-greeting" v-if="preferredName">你好，{{ preferredName }}</p>
                <p class="dc-empty-greeting" v-else>你好</p>
                <p class="dc-empty-sub">想聊什么都可以和我说。</p>
              </div>

              <div v-else-if="sending" key="loading" class="dc-msg-center">
                <p v-if="latestUserMsg" class="dc-msg-user">你：{{ latestUserMsg.text }}</p>
                <div class="dc-typing"><span /><span /><span /></div>
              </div>

              <div v-else-if="latestAssistantMsg" :key="latestAssistantMsg.id" class="dc-msg-center">
                <p v-if="latestUserMsg" class="dc-msg-user">你：{{ latestUserMsg.text }}</p>
                <p
                  :class="[
                    'dc-msg-ai',
                    latestAssistantMsg.showEffect && latestAssistantMsg.visualMeta
                      ? `dc-fx-${latestAssistantMsg.visualMeta.effect_type}` : '',
                  ]"
                  :style="getBubbleStyle(latestAssistantMsg)"
                >
                  {{ displayedAssistantText }}<span v-if="isStreamingMessage(latestAssistantMsg)" class="dc-cursor" />
                </p>
              </div>

              <div v-else key="fallback" class="dc-chat-empty">
                <p class="dc-empty-sub">继续说说你现在的感受。</p>
              </div>
            </Transition>
          </div>

          <form class="dc-input-area" @submit.prevent="onSend">
            <input
              ref="inputEl"
              v-model="input"
              type="text"
              class="dc-chat-input"
              placeholder="说说你的心情..."
              autocomplete="off"
              autocapitalize="off"
              enterkeyhint="send"
              :disabled="sending || isStreaming"
              @focus="inputFocused = true"
              @blur="inputFocused = false"
            />
            <button type="submit" class="dc-send-btn" :disabled="!input.trim() || sending || isStreaming">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </button>
          </form>
        </div>

        <div
          v-else
          class="dc-chat-wrap dc-chat-wrap-terminal"
          :style="ambientStyle"
          @click="onConsoleClick"
        >
          <div class="dc-terminal-noise" />

          <div class="dc-messages dc-messages-terminal" ref="messagesEl">
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
  showEffect?: boolean
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
import { normalizeDadChatStyle } from '@/constants/dadChat'

const authStore = useAuthStore()

const props = withDefaults(defineProps<{ visible?: boolean; showMemory?: boolean }>(), { visible: true, showMemory: false })
const emit = defineEmits<{ 'update:show-memory': [val: boolean] }>()

const messages = ref<ChatMessage[]>(_messages.map(m => ({ ...m, showEffect: false })))
const input = ref('')
const sending = ref(false)
const messagesEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
const sessionId = ref<string | null>(_sessionId)
const preferredName = ref<string | null>(_preferredName)
const typedLength = ref(0)
const streamingMessageId = ref<number | null>(null)
const thinkingIndex = ref(0)
const inputFocused = ref(false)
const caretIndex = ref(0)
const historyIndex = ref(-1)
const draftInput = ref('')
const showMemoryToast = ref(false)
const showGridPulse = ref(false)
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

const colorToneMap: Record<string, string> = {
  soft_pink: 'rgba(255,182,193,0.15)',
  warm_gold: 'rgba(255,215,0,0.15)',
  gentle_blue: 'rgba(135,206,235,0.12)',
  lavender: 'rgba(200,162,255,0.15)',
  neutral_white: 'rgba(255,255,255,0.1)',
  coral: 'rgba(255,127,80,0.15)',
  sage: 'rgba(143,188,143,0.15)',
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

const ambientGradientStyle = computed(() => ({
  backgroundImage: `
    linear-gradient(var(--ambient-primary, rgba(125, 207, 255, 0.1)) 1px, transparent 1px),
    linear-gradient(90deg, var(--ambient-primary, rgba(125, 207, 255, 0.1)) 1px, transparent 1px)
  `,
  backgroundSize: '32px 32px',
  opacity: '0.2',
}))

const selectedChatStyle = computed(() => normalizeDadChatStyle(authStore.user?.dad_chat_style))
const promptUserName = computed(() => authStore.user?.username || preferredName.value || 'user')
const userPrompt = computed(() => `[${promptUserName.value}@momshell ~]$`)
const assistantPrompt = '[stone@momshell ~]$'
const isStreaming = computed(() => streamingMessageId.value !== null)
const thinkingFrame = computed(() => THINKING_FRAMES[thinkingIndex.value] ?? THINKING_FRAMES[0])
const commandHistory = computed(() => messages.value.filter((msg) => msg.role === 'user').map((msg) => msg.text))
const inputBeforeCaret = computed(() => input.value.slice(0, caretIndex.value))
const activeInputChar = computed(() => input.value[caretIndex.value] ?? '')
const inputAfterCaret = computed(() => input.value.slice(caretIndex.value + (activeInputChar.value ? 1 : 0)))
const latestUserMsg = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'user') return messages.value[i]
  }
  return null
})
const latestAssistantMsg = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'assistant') return messages.value[i]
  }
  return null
})
const displayedAssistantText = computed(() => {
  if (!latestAssistantMsg.value) return ''
  return getDisplayedText(latestAssistantMsg.value)
})

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
  _messages.push(...messages.value.map(m => ({ ...m, showEffect: false })))
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
    if (inputEl.value.disabled) return
    inputEl.value.focus()
    const length = inputEl.value.value.length
    inputEl.value.setSelectionRange(length, length)
    caretIndex.value = length
  })
}

function onConsoleClick(e: MouseEvent) {
  if (sending.value || isStreaming.value) return
  // Don't interfere with text selection
  const sel = window.getSelection()
  if (sel && sel.toString().length > 0) return
  // Don't steal focus from interactive elements
  const target = e.target as HTMLElement
  if (target.closest('a, button, textarea, input')) return
  focusInput()
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

function getBubbleStyle(msg: ChatMessage | null): Record<string, string> {
  if (!msg || msg.role !== 'assistant' || !msg.visualMeta || !msg.showEffect) return {}
  const color = colorToneMap[msg.visualMeta.color_tone] ?? colorToneMap.neutral_white
  return {
    '--effect-color': color,
    '--effect-intensity': String(0.5 + msg.visualMeta.intensity * 0.5),
  }
}

function setAssistantEffect(messageID: number, showEffect: boolean) {
  const idx = messages.value.findIndex((msg) => msg.id === messageID)
  if (idx === -1) return
  messages.value[idx] = { ...messages.value[idx], showEffect }
}

function triggerAmbientGridPulse(duration = 1200) {
  if (selectedChatStyle.value !== 'ambient') return
  showGridPulse.value = false
  requestAnimationFrame(() => {
    showGridPulse.value = true
    setTimeout(() => { showGridPulse.value = false }, duration)
  })
}

function notifyMemoryUpdated() {
  if (selectedChatStyle.value === 'ambient') {
    showMemoryToast.value = true
    setTimeout(() => { showMemoryToast.value = false }, 2000)
    return
  }
  messages.value = [
    ...messages.value,
    { id: Date.now() + 1, role: 'system', text: '记忆已更新', showEffect: false },
  ]
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
    if (!showInlineMemory.value) {
      focusInput()
    }
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

watch(selectedChatStyle, () => {
  if (!props.visible || showInlineMemory.value) return
  scrollToBottom()
  if (!sending.value && !isStreaming.value) {
    focusInput()
  }
})

watch(showInlineMemory, (showMemory) => {
  if (!showMemory && props.visible && !sending.value && !isStreaming.value) {
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
    { id: Date.now(), role: 'user', text, showEffect: false },
  ]
  clearEditableInput()
  sending.value = true
  showMemoryToast.value = false
  triggerAmbientGridPulse(1000)
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
      showEffect: false,
    }
    messages.value = [...messages.value, assistantMsg]
    triggerAmbientGridPulse()
    startTypewriter(msgId, res.text, () => {
      if (res.visual_metadata) {
        setAssistantEffect(msgId, true)
        setTimeout(() => {
          setAssistantEffect(msgId, false)
          syncPersistent()
        }, 3000)
      }
      if (res.memory_updated) {
        notifyMemoryUpdated()
      }
      syncPersistent()
      scrollToBottom()
    })
  } catch {
    const msgId = Date.now()
    messages.value = [
      ...messages.value,
      { id: msgId, role: 'assistant', text: '暂时无法回复，请稍后再试。', showEffect: false },
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
  min-height: 300px;
  position: relative;
  border-radius: var(--dc-radius, 2px);
  overflow: hidden;
}

.dc-chat-wrap-terminal {
  min-height: 340px;
  background:
    radial-gradient(circle at top right, var(--ambient-secondary, rgba(125, 207, 255, 0.05)) 0%, transparent 42%),
    linear-gradient(180deg, rgba(10, 14, 24, 0.98) 0%, rgba(6, 9, 16, 0.98) 100%);
  border: 1px solid var(--focus-border, rgba(125, 207, 255, 0.18));
}

.dc-chat-wrap-ambient {
  background: var(--dc-surface, rgba(255,255,255,0.03));
  border: 1px solid var(--dc-border, rgba(255,255,255,0.06));
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

.dc-ambient-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.4;
}

.dc-send-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background-image:
    linear-gradient(var(--ambient-primary, rgba(125,207,255,0.2)) 1px, transparent 1px),
    linear-gradient(90deg, var(--ambient-primary, rgba(125,207,255,0.2)) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(circle at center, black 30%, transparent 90%);
  -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 90%);
}

.dc-grid-enter-active { animation: gridSoftFlash 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
.dc-grid-leave-active { opacity: 0; transition: opacity 0.3s; }

@keyframes gridSoftFlash {
  0% { opacity: 0; transform: scale(0.98); }
  15% { opacity: 0.5; transform: scale(1); }
  100% { opacity: 0; transform: scale(1); }
}

.dc-memory-toast {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 12px;
  background: rgba(158,206,106,0.12);
  border: 1px solid rgba(158,206,106,0.25);
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-success, #9ECE6A);
  font-family: var(--dc-font-mono);
  font-size: 11px;
  z-index: 5;
  pointer-events: none;
}

.dc-toast-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.dc-toast-leave-active { transition: opacity 0.6s ease, transform 0.6s ease; }
.dc-toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
.dc-toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-4px); }

.dc-messages {
  flex: 1;
  overflow-y: auto;
  position: relative;
  z-index: 2;
  scrollbar-width: thin;
}

.dc-messages-terminal {
  padding: 18px 18px 22px;
  display: flex;
  flex-direction: column;
  scrollbar-color: rgba(125, 207, 255, 0.12) transparent;
  scrollbar-gutter: stable both-edges;
}

.dc-messages-ambient {
  padding: 0 24px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
}

.dc-msg-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
  user-select: text;
  -webkit-user-select: text;
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

.dc-msg-center {
  text-align: center;
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.dc-chat-empty {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-family: var(--dc-font-mono);
}

.dc-empty-greeting { font-size: 16px; color: var(--dc-text, #C0CAF5); font-weight: 300; }
.dc-empty-sub { font-size: 13px; color: var(--dc-comment, #565F89); }

.dc-msg-replace-enter-active { transition: opacity 0.6s ease, transform 0.6s ease; }
.dc-msg-replace-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.dc-msg-replace-enter-from { opacity: 0; transform: translateY(12px); }
.dc-msg-replace-leave-to { opacity: 0; transform: translateY(-8px); }

.dc-msg-user {
  font-family: var(--dc-font-mono);
  font-size: 13px;
  color: var(--dc-comment, #565F89);
  line-height: 1.6;
}

.dc-msg-ai {
  font-family: var(--dc-font-mono);
  font-size: 17px;
  color: var(--dc-text, #C0CAF5);
  font-weight: 300;
  line-height: 1.8;
  max-width: 480px;
  transition: text-shadow 0.6s ease;
}

.dc-fx-ripple { animation: fxRipple 3s ease-out forwards; }
.dc-fx-sunlight { animation: fxSunlight 3s ease-out forwards; }
.dc-fx-calm { animation: fxCalm 3s ease-in-out forwards; }
.dc-fx-warm_glow { animation: fxWarmGlow 3s ease-out forwards; }
.dc-fx-gentle_wave { animation: fxGentleWave 3s ease-in-out forwards; }

@keyframes fxRipple {
  0% { text-shadow: 0 0 0 var(--effect-color, rgba(255,255,255,0.1)); }
  30% { text-shadow: 0 0 20px var(--effect-color, rgba(255,255,255,0.3)); }
  100% { text-shadow: 0 0 0 transparent; }
}

@keyframes fxSunlight {
  0% { text-shadow: 4px 0 24px var(--effect-color, rgba(255,215,0,0.3)); }
  100% { text-shadow: 0 0 0 transparent; }
}

@keyframes fxCalm {
  0% { transform: scale(1); text-shadow: 0 0 10px var(--effect-color, rgba(255,255,255,0.2)); }
  50% { transform: scale(1.01); text-shadow: 0 0 18px var(--effect-color, rgba(255,255,255,0.3)); }
  100% { transform: scale(1); text-shadow: 0 0 0 transparent; }
}

@keyframes fxWarmGlow {
  0% { text-shadow: 0 0 24px var(--effect-color, rgba(255,215,0,0.3)); }
  100% { text-shadow: 0 0 0 transparent; }
}

@keyframes fxGentleWave {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-2px); }
  75% { transform: translateY(2px); }
}

.dc-typing {
  display: flex;
  gap: 6px;
  justify-content: center;
  padding: 8px 0;
}

.dc-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dc-accent, #7DCFFF);
  animation: typeDot 1.2s infinite ease-in-out;
}

.dc-typing span:nth-child(2) { animation-delay: 0.15s; }
.dc-typing span:nth-child(3) { animation-delay: 0.3s; }

@keyframes typeDot {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-5px); }
}

.dc-input-area {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  border-top: 1px solid var(--dc-border, rgba(255,255,255,0.06));
}

.dc-chat-input {
  flex: 1;
  padding: 12px 16px;
  background: var(--dc-bg, #1A1B26);
  border: 1px solid var(--dc-border, rgba(255,255,255,0.15));
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-text, #C0CAF5);
  font-family: var(--dc-font-mono);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.3s;
}

.dc-chat-input:focus {
  border-color: var(--focus-border, rgba(125,207,255,0.25));
  box-shadow: 0 0 12px var(--focus-glow, rgba(125,207,255,0.06));
}

.dc-chat-input::placeholder { color: var(--dc-comment, #565F89); }

.dc-send-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(125,207,255,0.3);
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-accent, #7DCFFF);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.dc-send-btn:hover:not(:disabled) {
  background: rgba(125,207,255,0.08);
  border-color: var(--dc-accent, #7DCFFF);
  box-shadow: 0 0 16px rgba(125,207,255,0.15);
}

.dc-send-btn:active:not(:disabled) { transform: scale(0.95); }
.dc-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

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
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 1.8em;
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

.dc-msg-ai .dc-cursor {
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
}

@media (max-width: 768px) {
  .dc-chat-wrap { height: calc(100vh - 200px); }
  .dc-messages-terminal { padding: 16px 12px 18px; }
  .dc-messages-ambient { padding: 0 12px 12px; }
  .dc-log-line { font-size: 16px; line-height: 1.6; }
  .dc-log-prompt { font-size: inherit; line-height: inherit; margin-right: 8px; }
  .dc-terminal-input { margin-top: 14px; }
  .dc-msg-ai { max-width: 100%; font-size: 15px; }
  .dc-input-area { padding: 10px 12px; }
  .dc-chat-input { font-size: 16px; }
}
</style>
