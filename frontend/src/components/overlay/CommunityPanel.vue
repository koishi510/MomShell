<template>
  <OverlayPanel :visible="uiStore.activePanel === 'community'" position="right" @close="uiStore.closePanel()">
    <div class="community-panel">
      <h2 class="panel-title">社区</h2>

      <!-- Channel tabs -->
      <div class="channel-tabs">
        <button
          :class="['channel-tab', { active: channel === 'experience' }]"
          @click="channel = 'experience'"
        >
          经验分享
        </button>
        <button
          :class="['channel-tab', { active: channel === 'professional' }]"
          @click="channel = 'professional'"
        >
          专业问答
        </button>
      </div>

      <!-- Create post -->
      <button class="create-btn" @click="showCompose = true">
        <span>+</span> 发帖
      </button>

      <!-- List -->
      <div v-if="loading" class="loading-state">加载中...</div>
      <div v-else-if="questions.length === 0" class="empty-state">暂无帖子</div>
      <div v-else class="question-list">
        <button
          v-for="q in questions"
          :key="q.id"
          class="question-card"
          @click="selectedQuestion = q"
        >
          <h3 class="q-title">{{ q.title }}</h3>
          <p class="q-preview">{{ q.content_preview }}</p>
          <div class="q-meta">
            <span>{{ q.author.nickname }}</span>
            <span>· {{ q.answer_count }} 回答</span>
            <span>· {{ q.like_count }} 赞</span>
          </div>
        </button>
      </div>

      <!-- Compose modal -->
      <div v-if="showCompose" class="compose-overlay" @click.self="showCompose = false">
        <form class="compose-form" @submit.prevent="onCreatePost">
          <h3 class="compose-title">发布问题</h3>
          <input v-model="newPost.title" class="compose-input" placeholder="标题" required />
          <textarea v-model="newPost.content" class="compose-textarea" placeholder="描述你的问题..." required rows="4" />
          <div class="compose-actions">
            <button type="button" class="compose-cancel" @click="showCompose = false">取消</button>
            <button type="submit" class="compose-submit" :disabled="posting">
              {{ posting ? '发布中...' : '发布' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Question detail modal -->
      <div v-if="selectedQuestion" class="detail-overlay" @click.self="selectedQuestion = null">
        <div class="detail-card">
          <button class="detail-close" @click="selectedQuestion = null">×</button>
          <h2 class="detail-title">{{ selectedQuestion.title }}</h2>
          <p class="detail-author">{{ selectedQuestion.author.nickname }}</p>
          <div class="detail-content">{{ selectedQuestion.content_preview }}</div>

          <!-- Answers -->
          <div class="answers-section">
            <h3 class="answers-title">回答 ({{ selectedQuestion.answer_count }})</h3>
            <div v-if="loadingAnswers" class="loading-state">加载中...</div>
            <div v-for="a in answers" :key="a.id" class="answer-card">
              <p class="answer-author">
                {{ a.author.nickname }}
                <span v-if="a.is_professional" class="pro-badge">专业</span>
              </p>
              <p class="answer-content">{{ a.content }}</p>
              <div class="answer-meta">
                <button class="like-btn" @click="onLikeAnswer(a)">
                  {{ a.is_liked ? '❤️' : '🤍' }} {{ a.like_count }}
                </button>
              </div>
            </div>
          </div>

          <!-- Reply input -->
          <div class="reply-area">
            <input
              v-model="replyText"
              class="reply-input"
              placeholder="写下你的回答..."
              @keydown.enter="onReply"
            />
            <button class="reply-btn" :disabled="!replyText.trim()" @click="onReply">发送</button>
          </div>
        </div>
      </div>
    </div>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import {
  getQuestions,
  getAnswers,
  createQuestion,
  createAnswer,
  toggleLike,
  type QuestionListItem,
  type AnswerListItem,
} from '@/lib/api/community'
import { getErrorMessage } from '@/lib/apiClient'

const uiStore = useUiStore()

const channel = ref<'experience' | 'professional'>('experience')
const questions = ref<QuestionListItem[]>([])
const loading = ref(false)
const showCompose = ref(false)
const posting = ref(false)
const newPost = ref({ title: '', content: '' })

const selectedQuestion = ref<QuestionListItem | null>(null)
const answers = ref<AnswerListItem[]>([])
const loadingAnswers = ref(false)
const replyText = ref('')

async function fetchQuestions() {
  loading.value = true
  try {
    const res = await getQuestions({ channel: channel.value, page: 1, page_size: 20 })
    questions.value = res.items
  } catch {
    // silent
  } finally {
    loading.value = false
  }
}

watch(
  () => uiStore.activePanel,
  (panel) => {
    if (panel === 'community') fetchQuestions()
  },
)

watch(channel, () => fetchQuestions())

watch(selectedQuestion, async (q) => {
  if (q) {
    loadingAnswers.value = true
    answers.value = []
    try {
      const res = await getAnswers(q.id, { page: 1, page_size: 50 })
      answers.value = res.items
    } catch {
      // silent
    } finally {
      loadingAnswers.value = false
    }
  }
})

async function onCreatePost() {
  posting.value = true
  try {
    await createQuestion({
      title: newPost.value.title,
      content: newPost.value.content,
      channel: channel.value,
    })
    showCompose.value = false
    newPost.value = { title: '', content: '' }
    await fetchQuestions()
  } catch (e) {
    alert(getErrorMessage(e))
  } finally {
    posting.value = false
  }
}

async function onReply() {
  if (!replyText.value.trim() || !selectedQuestion.value) return
  try {
    const answer = await createAnswer(selectedQuestion.value.id, replyText.value)
    answers.value = [...answers.value, answer]
    replyText.value = ''
  } catch (e) {
    alert(getErrorMessage(e))
  }
}

async function onLikeAnswer(a: AnswerListItem) {
  try {
    const res = await toggleLike('answer', a.id, a.is_liked)
    answers.value = answers.value.map((ans) =>
      ans.id === a.id ? { ...ans, is_liked: res.is_liked, like_count: res.like_count } : ans,
    )
  } catch {
    // silent
  }
}
</script>

<style scoped>
.community-panel {
  padding: 32px 24px;
  min-height: 100vh;
}

.panel-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.channel-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 4px;
}

.channel-tab {
  flex: 1;
  padding: 10px 0;
  border-radius: 11px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.channel-tab.active {
  background: rgba(255, 255, 255, 0.14);
  color: var(--text-primary);
}

.create-btn {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 16px;
}

.create-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.question-card {
  text-align: left;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.question-card:hover {
  background: rgba(255, 255, 255, 0.08);
}

.q-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.q-preview {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.q-meta {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  gap: 4px;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Compose */
.compose-overlay, .detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.compose-form {
  width: min(440px, 90vw);
  padding: 28px 24px;
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  box-shadow: var(--glass-shadow);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.compose-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.compose-input, .compose-textarea {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 15px;
  outline: none;
  resize: vertical;
  font-family: inherit;
}

.compose-input:focus, .compose-textarea:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.compose-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.compose-cancel {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
}

.compose-submit {
  padding: 10px 24px;
  background: var(--accent-warm);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.compose-submit:disabled { opacity: 0.5; }

/* Detail */
.detail-card {
  position: relative;
  width: min(520px, 92vw);
  max-height: 85vh;
  padding: 28px 24px;
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  box-shadow: var(--glass-shadow);
  overflow-y: auto;
}

.detail-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
}

.detail-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  padding-right: 32px;
}

.detail-author {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

.detail-content {
  font-size: 15px;
  color: var(--text-primary);
  line-height: 1.7;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 20px;
}

.answers-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.answer-card {
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.answer-author {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.pro-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(100, 180, 255, 0.2);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #8ac4ff;
  margin-left: 6px;
}

.answer-content {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.answer-meta {
  display: flex;
  gap: 12px;
}

.like-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.reply-area {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.reply-input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.reply-input::placeholder { color: var(--text-secondary); }

.reply-btn {
  padding: 10px 18px;
  background: var(--accent-warm);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.reply-btn:disabled { opacity: 0.5; }
</style>
