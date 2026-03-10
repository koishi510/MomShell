<template>
  <OverlayPanel :visible="uiStore.activePanel === 'chat'" position="right" @close="uiStore.closePanel()">
    <div class="chat-panel">
      <h2 class="chat-title">Echo 倾听</h2>

      <Transition name="toast">
        <div v-if="showMemoryToast" class="memory-toast">✨ 记住了</div>
      </Transition>

      <!-- Messages -->
      <div class="messages" ref="messagesEl">
        <div v-if="messages.length === 0" class="chat-empty">
          <p v-if="preferredName">{{ preferredName }}，你好，我是你的贝壳伙伴。</p>
          <p v-else>你好，我是你的贝壳伙伴。</p>
          <p>有什么想聊的吗？</p>
        </div>
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['message', msg.role]"
        >
          <div
            :class="[
              'msg-bubble',
              msg.showEffect && msg.visualMeta ? `effect-${msg.visualMeta.effect_type}` : '',
            ]"
            :style="getBubbleStyle(msg)"
          >
            {{ msg.text }}
          </div>
        </div>
        <div v-if="sending" class="message assistant">
          <div class="msg-bubble typing">
            <span /><span /><span />
          </div>
        </div>
      </div>

      <!-- Input -->
      <form class="chat-input-area" @submit.prevent="onSend">
        <input
          v-model="input"
          type="text"
          class="chat-input"
          placeholder="说点什么..."
          :disabled="sending"
        />
        <button type="submit" class="send-btn" :disabled="!input.trim() || sending">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 10L17 3L10 17L9 11L3 10Z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </div>
  </OverlayPanel>
</template>

<script lang="ts">
import type { VisualMetadata } from '@/lib/api/chat'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  visualMeta?: VisualMetadata
  showEffect: boolean
}

const _messages: ChatMessage[] = []
let _sessionId: string | null = null
let _profileLoaded = false
let _preferredName: string | null = null
</script>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import {
  sendChatMessage,
  getChatProfile,
  type ChatResponse,
  type ChatProfile,
} from '@/lib/api/chat'

const uiStore = useUiStore()
const authStore = useAuthStore()

const messages = ref<ChatMessage[]>(_messages.map(m => ({ ...m, showEffect: false })))
const input = ref('')
const sending = ref(false)
const messagesEl = ref<HTMLElement | null>(null)
const preferredName = ref<string | null>(_preferredName)
const showMemoryToast = ref(false)

const isOpen = computed(() => uiStore.activePanel === 'chat')

const colorToneMap: Record<string, string> = {
  soft_pink: 'rgba(255,182,193,0.15)',
  warm_gold: 'rgba(255,215,0,0.15)',
  gentle_blue: 'rgba(135,206,235,0.12)',
  lavender: 'rgba(200,162,255,0.15)',
  neutral_white: 'rgba(255,255,255,0.1)',
  coral: 'rgba(255,127,80,0.15)',
  sage: 'rgba(143,188,143,0.15)',
}

function generateSessionId(): string {
  return crypto.randomUUID()
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
      background: `radial-gradient(ellipse at 30% 50%, ${color}, rgba(255,255,255,0.1))`,
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

watch(isOpen, (open) => {
  if (open) {
    scrollToBottom()
    if (authStore.isAuthenticated && !_profileLoaded) {
      loadProfile()
    }
  }
})

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
      showEffect: hasVisual,
    }
    messages.value = [...messages.value, assistantMsg]

    if (hasVisual) {
      setTimeout(() => {
        const idx = messages.value.findIndex(m => m.id === msgId)
        if (idx !== -1) {
          messages.value[idx] = { ...messages.value[idx], showEffect: false }
        }
        syncPersistent()
      }, 3000)
    }

    if (res.memory_updated) {
      showMemoryToast.value = true
      setTimeout(() => {
        showMemoryToast.value = false
      }, 2000)
    }
  } catch {
    messages.value = [
      ...messages.value,
      {
        id: Date.now(),
        role: 'assistant',
        text: '抱歉，暂时无法回复，请稍后再试。',
        showEffect: false,
      },
    ]
  } finally {
    sending.value = false
    syncPersistent()
    scrollToBottom()
  }
}
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
}

.chat-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 24px 24px 16px;
  flex-shrink: 0;
}

/* Memory toast */
.memory-toast {
  position: absolute;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 16px;
  background: rgba(255, 215, 0, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 215, 0, 0.18);
  border-radius: 16px;
  color: var(--accent-warm);
  font-size: 13px;
  letter-spacing: 0.3px;
  z-index: 5;
  pointer-events: none;
  white-space: nowrap;
}

.toast-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-leave-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overscroll-behavior: contain;
}

.chat-empty {
  text-align: center;
  padding: 60px 0 20px;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 2;
}

.message {
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.msg-bubble {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
}

.message.user .msg-bubble {
  background: var(--accent-warm);
  color: #fff;
  border-bottom-right-radius: 6px;
}

.message.assistant .msg-bubble {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom-left-radius: 6px;
  transition: background 0.6s ease, box-shadow 0.6s ease;
}

/* Visual effects */
.effect-ripple {
  animation: effectRipple 3s ease-out forwards;
}

.effect-sunlight {
  animation: effectSunlight 3s ease-out forwards;
}

.effect-calm {
  animation: effectCalm 3s ease-in-out forwards;
}

.effect-warm_glow {
  animation: effectWarmGlow 3s ease-out forwards;
}

.effect-gentle_wave {
  animation: effectGentleWave 3s ease-in-out forwards;
}

@keyframes effectRipple {
  0% { box-shadow: 0 0 0 0 var(--effect-color, rgba(255, 255, 255, 0.1)); }
  30% { box-shadow: 0 0 14px 6px var(--effect-color, rgba(255, 255, 255, 0.1)); }
  100% { box-shadow: 0 0 0 0 transparent; }
}

@keyframes effectSunlight {
  0% { box-shadow: inset 10px 0 24px -10px var(--effect-color, rgba(255, 215, 0, 0.15)); }
  100% { box-shadow: inset 0 0 0 0 transparent; }
}

@keyframes effectCalm {
  0% { transform: scale(1); box-shadow: 0 0 10px 0 var(--effect-color, rgba(255, 255, 255, 0.1)); }
  50% { transform: scale(1.008); box-shadow: 0 0 14px 3px var(--effect-color, rgba(255, 255, 255, 0.1)); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
}

@keyframes effectWarmGlow {
  0% { box-shadow: 0 0 18px 4px var(--effect-color, rgba(255, 215, 0, 0.12)); }
  100% { box-shadow: 0 0 0 0 transparent; }
}

@keyframes effectGentleWave {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(1.5px); }
  40% { transform: translateX(-1.5px); }
  60% { transform: translateX(1px); }
  80% { transform: translateX(-0.5px); }
}

/* Typing indicator */
.msg-bubble.typing {
  display: flex;
  gap: 5px;
  padding: 14px 18px;
}

.msg-bubble.typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: typingDot 1.2s infinite ease-in-out;
}

.msg-bubble.typing span:nth-child(2) { animation-delay: 0.15s; }
.msg-bubble.typing span:nth-child(3) { animation-delay: 0.3s; }

@keyframes typingDot {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
}

/* Input area */
.chat-input-area {
  display: flex;
  gap: 10px;
  padding: 16px 24px 24px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.chat-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  color: var(--text-primary);
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input:focus {
  border-color: rgba(255, 255, 255, 0.25);
}

.chat-input::placeholder {
  color: var(--text-secondary);
}

.send-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-warm);
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  flex-shrink: 0;
}

.send-btn:hover { background: var(--accent-warm-hover); }
.send-btn:active { transform: scale(0.95); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
