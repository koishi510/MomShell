<template>
  <div class="dc-tab-content">
    <!-- Inline AI memory -->
    <DcAiMemory v-if="showInlineMemory" @back="showInlineMemory = false" />

    <template v-else>
      <div class="dc-section-header">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span class="dc-sh-text">./chat.sh</span>
        <button v-if="authStore.isAuthenticated" class="dc-mem-btn" @click="showInlineMemory = true">[mem]</button>
      </div>

      <div class="dc-chat-wrap" :style="ambientStyle">
        <!-- Ambient bg -->
        <div class="dc-ambient-bg" :style="ambientGradientStyle" />

        <!-- Grid pulse on send -->
        <Transition name="dc-grid">
          <div v-if="showGridPulse" class="dc-send-grid" />
        </Transition>

        <!-- Memory toast -->
        <Transition name="dc-toast">
          <div v-if="showMemoryToast" class="dc-memory-toast">mem_updated</div>
        </Transition>

        <!-- Messages -->
        <div class="dc-messages" ref="messagesEl">
          <Transition name="dc-msg-replace" mode="out-in">
            <div v-if="messages.length === 0 && !sending" key="empty" class="dc-chat-empty">
              <p class="dc-empty-greeting" v-if="preferredName">$ hello {{ preferredName }}</p>
              <p class="dc-empty-greeting" v-else>$ hello</p>
              <p class="dc-empty-sub"># awaiting_input...</p>
            </div>
            <div v-else-if="sending" key="loading" class="dc-msg-center">
              <p v-if="latestUserMsg" class="dc-msg-user">$ {{ latestUserMsg.text }}</p>
              <div class="dc-typing"><span /><span /><span /></div>
            </div>
            <div v-else-if="latestAssistantMsg" :key="latestAssistantMsg.id" class="dc-msg-center">
              <p v-if="latestUserMsg" class="dc-msg-user">$ {{ latestUserMsg.text }}</p>
              <p
                :class="[
                  'dc-msg-ai',
                  latestAssistantMsg.showEffect && latestAssistantMsg.visualMeta
                    ? `dc-fx-${latestAssistantMsg.visualMeta.effect_type}` : '',
                ]"
                :style="getBubbleStyle(latestAssistantMsg)"
              >
                {{ displayedAssistantText }}<span v-if="!typingComplete" class="dc-cursor" />
              </p>
            </div>
          </Transition>
        </div>

        <!-- Input -->
        <form class="dc-input-area" @submit.prevent="onSend">
          <input
            v-model="input"
            type="text"
            class="dc-chat-input"
            placeholder="> 说说你的心情..."
            :disabled="sending"
          />
          <button type="submit" class="dc-send-btn" :disabled="!input.trim() || sending">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
        </form>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  visualMeta?: import('@/lib/api/chat').VisualMetadata
  showEffect: boolean
}

const _messages: ChatMessage[] = []
let _sessionId: string | null = null
let _sessionCounter = 0
let _profileLoaded = false
let _preferredName: string | null = null
</script>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import DcAiMemory from './DcAiMemory.vue'
import { useAuthStore } from '@/stores/auth'
import {
  sendChatMessage,
  getChatProfile,
  type ChatResponse,
  type ChatProfile,
} from '@/lib/api/chat'

const authStore = useAuthStore()

const props = withDefaults(defineProps<{ visible?: boolean }>(), { visible: true })

const messages = ref<ChatMessage[]>(_messages.map(m => ({ ...m, showEffect: false })))
const input = ref('')
const sending = ref(false)
const messagesEl = ref<HTMLElement | null>(null)
const preferredName = ref<string | null>(_preferredName)
const showMemoryToast = ref(false)
const showGridPulse = ref(false)
const typedLength = ref(0)
const typingComplete = ref(true)
let typingTimer: ReturnType<typeof setInterval> | null = null
const showInlineMemory = ref(false)

function startTypewriter(text: string) {
  typedLength.value = 0
  typingComplete.value = false
  if (typingTimer) clearInterval(typingTimer)
  typingTimer = setInterval(() => {
    typedLength.value++
    if (typedLength.value >= text.length) {
      typingComplete.value = true
      clearInterval(typingTimer!)
      typingTimer = null
    }
  }, 30)
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
  opacity: 0.2
}))

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
  if (typingComplete.value) return latestAssistantMsg.value.text
  return latestAssistantMsg.value.text.slice(0, typedLength.value)
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

function getBubbleStyle(msg: ChatMessage): Record<string, string> {
  if (msg.role !== 'assistant' || !msg.visualMeta) return {}
  const color = colorToneMap[msg.visualMeta.color_tone] ?? colorToneMap.neutral_white
  if (msg.showEffect) {
    return {
      '--effect-color': color,
      '--effect-intensity': String(0.5 + msg.visualMeta.intensity * 0.5),
    }
  }
  return {}
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
    if (authStore.isAuthenticated && !_profileLoaded) {
      loadProfile()
    }
  }
}, { immediate: true })

async function onSend() {
  const text = input.value.trim()
  if (!text || sending.value) return

  if (!_sessionId) {
    _sessionId = generateSessionId()
  }

  messages.value = [
    ...messages.value,
    { id: Date.now(), role: 'user', text, showEffect: false },
  ]
  input.value = ''
  sending.value = true
  showGridPulse.value = true
  setTimeout(() => { showGridPulse.value = false }, 1000)
  syncPersistent()
  scrollToBottom()

  try {
    const res: ChatResponse = await sendChatMessage({
      content: text,
      session_id: _sessionId,
    })
    const hasVisual = !!res.visual_metadata
    const msgId = Date.now()
    const assistantMsg: ChatMessage = {
      id: msgId,
      role: 'assistant',
      text: res.text,
      visualMeta: res.visual_metadata,
      showEffect: false,
    }
    messages.value = [...messages.value, assistantMsg]
    startTypewriter(res.text)

    // Trigger grid pulse to reflect the new color tone from AI
    showGridPulse.value = false
    setTimeout(() => {
      showGridPulse.value = true
      setTimeout(() => { showGridPulse.value = false }, 1200)
    }, 50)

    if (hasVisual) {
      const effectDelay = res.text.length * 30 + 200
      setTimeout(() => {
        const idx = messages.value.findIndex(m => m.id === msgId)
        if (idx !== -1) {
          messages.value[idx] = { ...messages.value[idx], showEffect: true }
        }
      }, effectDelay)
      setTimeout(() => {
        const idx = messages.value.findIndex(m => m.id === msgId)
        if (idx !== -1) {
          messages.value[idx] = { ...messages.value[idx], showEffect: false }
        }
        syncPersistent()
      }, effectDelay + 3000)
    }

    if (res.memory_updated) {
      showMemoryToast.value = true
      setTimeout(() => { showMemoryToast.value = false }, 2000)
    }
  } catch {
    messages.value = [
      ...messages.value,
      { id: Date.now(), role: 'assistant', text: '> ERROR: 暂时无法回复，请稍后再试。', showEffect: false },
    ]
  } finally {
    sending.value = false
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

.dc-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding-top: 8px; color: var(--dc-accent, #7DCFFF); }
.dc-sh-icon { color: var(--dc-accent, #7DCFFF); }
.dc-sh-text { font-family: var(--dc-font-mono); font-size: 13px; font-weight: bold; }

.dc-mem-btn {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--dc-border, rgba(255,255,255,0.15));
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 11px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.dc-mem-btn:hover { border-color: rgba(125,207,255,0.3); color: var(--dc-accent, #7DCFFF); }

/* Chat wrapper */
.dc-chat-wrap {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 220px);
  min-height: 300px;
  position: relative;
  background: var(--dc-surface, rgba(255,255,255,0.03));
  border: 1px solid var(--dc-border, rgba(255,255,255,0.06));
  border-radius: var(--dc-radius, 2px);
  overflow: hidden;
}

.dc-ambient-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.4;
}

/* Grid pulse */
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

/* Toast */
.dc-memory-toast {
  position: absolute;
  top: 12px; left: 50%;
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

/* Messages */
.dc-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.1) transparent;
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

/* Visual effects */
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

/* Typing */
.dc-typing {
  display: flex; gap: 6px; justify-content: center; padding: 8px 0;
}
.dc-typing span {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--dc-accent, #7DCFFF);
  animation: typeDot 1.2s infinite ease-in-out;
}
.dc-typing span:nth-child(2) { animation-delay: 0.15s; }
.dc-typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes typeDot {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-5px); }
}

/* Input */
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
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
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

/* Cursor */
.dc-cursor {
  display: inline-block;
  width: 2px; height: 1em;
  background: var(--dc-accent, #7DCFFF);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: cursorBlink 0.8s steps(2) infinite;
}
@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@media (max-width: 768px) {
  .dc-chat-wrap { height: calc(100vh - 200px); }
  .dc-messages { padding: 0 12px 12px; }
  .dc-msg-ai { max-width: 100%; font-size: 15px; }
  .dc-input-area { padding: 10px 12px; }
  .dc-chat-input { font-size: 16px; }
}
</style>
