<template>
  <OverlayPanel :visible="uiStore.activePanel === 'chat'" position="right" @close="uiStore.closePanel()">
    <div class="chat-panel">
      <h2 class="chat-title">Echo 倾听</h2>

      <!-- Messages -->
      <div class="messages" ref="messagesEl">
        <div v-if="messages.length === 0" class="chat-empty">
          <p>你好，我是你的贝壳伙伴。</p>
          <p>有什么想聊的吗？</p>
        </div>
        <div
          v-for="(msg, i) in messages"
          :key="i"
          :class="['message', msg.role]"
        >
          <div class="msg-bubble">{{ msg.text }}</div>
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
            <path d="M3 10L17 3L10 17L9 11L3 10Z" fill="currentColor"/>
          </svg>
        </button>
      </form>
    </div>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import { sendChatMessage } from '@/lib/api/chat'

const uiStore = useUiStore()

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const messages = ref<Message[]>([])
const input = ref('')
const sending = ref(false)
const messagesEl = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}

async function onSend() {
  const text = input.value.trim()
  if (!text) return

  messages.value = [...messages.value, { role: 'user', text }]
  input.value = ''
  sending.value = true
  scrollToBottom()

  try {
    const res = await sendChatMessage({ content: text })
    messages.value = [...messages.value, { role: 'assistant', text: res.text }]
  } catch {
    messages.value = [...messages.value, { role: 'assistant', text: '抱歉，暂时无法回复，请稍后再试。' }]
  } finally {
    sending.value = false
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
}

.chat-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 24px 24px 16px;
  flex-shrink: 0;
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
