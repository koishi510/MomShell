<template>
  <OverlayPanel :visible="uiStore.activePanel === 'community'" position="right" @close="uiStore.closePanel()">
    <div class="community-panel">
      <h2 class="panel-title">社区</h2>

      <div class="channel-tabs">
        <button
          :class="['channel-tab', { active: channel === 'experience' }]"
          @click="switchChannel('experience')"
        >
          经验分享
        </button>
        <button
          :class="['channel-tab', { active: channel === 'professional' }]"
          @click="switchChannel('professional')"
        >
          专业问答
        </button>
        <button
          :class="['channel-tab', { active: channel === 'hot' }]"
          @click="switchChannel('hot')"
        >
          热门
        </button>
      </div>

      <button class="create-btn" @click="openCompose">
        <span>+</span> 发帖
      </button>

      <div v-if="loading" class="loading-state">加载中...</div>
      <div v-else-if="questions.length === 0" class="empty-state">暂无帖子</div>
      <template v-else>
        <div class="question-list">
          <button
            v-for="q in questions"
            :key="q.id"
            class="question-card"
            @click="openDetail(q)"
          >
            <h3 class="q-title">{{ q.title }}</h3>
            <p class="q-preview">{{ q.content_preview }}</p>
            <div v-if="q.tags && q.tags.length" class="q-tags">
              <span v-for="tag in q.tags" :key="tag.id" class="q-tag">{{ tag.name }}</span>
            </div>
            <div class="q-meta">
              <span>{{ q.author.nickname }}</span>
              <span>· {{ q.answer_count }} 回答</span>
              <span class="q-like-action" @click.stop="onLikeQuestion(q)">
                {{ q.is_liked ? '❤️' : '🤍' }} {{ q.like_count }}
              </span>
              <span>· 📑 {{ q.collection_count }}</span>
            </div>
          </button>
        </div>
        <button
          v-if="currentPage < totalPages"
          class="load-more-btn"
          :disabled="loadingMore"
          @click="loadMore"
        >
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </template>

      <div v-if="showCompose" class="compose-overlay" @click.self="showCompose = false">
        <form class="compose-form" @submit.prevent="onCreatePost">
          <h3 class="compose-title">发布问题</h3>
          <input v-model="newPost.title" class="compose-input" placeholder="标题" required />
          <textarea
            v-model="newPost.content"
            class="compose-textarea"
            placeholder="描述你的问题..."
            required
            rows="4"
          />
          <div v-if="hotTags.length" class="tag-picker">
            <span class="tag-picker-label">选择标签</span>
            <div class="tag-chips">
              <button
                v-for="tag in hotTags"
                :key="tag.id"
                type="button"
                :class="['tag-chip', { selected: selectedTagIds.includes(tag.id) }]"
                @click="toggleTag(tag.id)"
              >
                {{ tag.name }}
              </button>
            </div>
          </div>
          <div class="compose-actions">
            <button type="button" class="compose-cancel" @click="showCompose = false">取消</button>
            <button type="submit" class="compose-submit" :disabled="posting">
              {{ posting ? '发布中...' : '发布' }}
            </button>
          </div>
        </form>
      </div>

      <div v-if="selectedDetail" class="detail-overlay" @click.self="closeDetail">
        <div class="detail-card">
          <button class="detail-close" @click="closeDetail">×</button>
          <h2 class="detail-title">{{ selectedDetail.title }}</h2>
          <p class="detail-author">{{ selectedDetail.author.nickname }}</p>
          <div v-if="selectedDetail.tags && selectedDetail.tags.length" class="detail-tags">
            <span v-for="tag in selectedDetail.tags" :key="tag.id" class="q-tag">{{ tag.name }}</span>
          </div>
          <div class="detail-content">{{ selectedDetail.content }}</div>

          <div class="detail-actions-bar">
            <button class="detail-action-btn" @click="onLikeDetailQuestion">
              {{ selectedDetail.is_liked ? '❤️' : '🤍' }}
              <span>{{ selectedDetail.like_count }}</span>
            </button>
            <button class="detail-action-btn" @click="onCollectQuestion">
              {{ selectedDetail.is_collected ? '🔖' : '📑' }}
              <span>{{ selectedDetail.collection_count }}</span>
            </button>
          </div>

          <div class="answers-section">
            <h3 class="answers-title">回答 ({{ selectedDetail.answer_count }})</h3>
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
                <button class="comment-toggle-btn" @click="toggleComments(a.id)">
                  评论 ({{ a.comment_count }})
                </button>
              </div>

              <div v-if="expandedComments[a.id]" class="comments-section">
                <div v-if="loadingComments[a.id]" class="loading-state comment-loading">加载中...</div>
                <template v-else>
                  <div
                    v-for="c in commentsMap[a.id] || []"
                    :key="c.id"
                    class="comment-item"
                  >
                    <span class="comment-author">{{ c.author.nickname }}</span>
                    <span class="comment-text">{{ c.content }}</span>
                    <div v-if="c.replies && c.replies.length" class="comment-replies">
                      <div v-for="r in c.replies" :key="r.id" class="comment-item reply-item">
                        <span class="comment-author">{{ r.author.nickname }}</span>
                        <span v-if="r.reply_to_user" class="reply-to">
                          回复 {{ r.reply_to_user.nickname }}
                        </span>
                        <span class="comment-text">{{ r.content }}</span>
                      </div>
                    </div>
                  </div>
                </template>
                <div class="comment-input-area">
                  <input
                    v-model="commentInputs[a.id]"
                    class="comment-input"
                    placeholder="写评论..."
                    @keydown.enter="onPostComment(a.id)"
                  />
                  <button
                    class="comment-send-btn"
                    :disabled="!commentInputs[a.id]?.trim()"
                    @click="onPostComment(a.id)"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          </div>

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
import { ref, reactive, watch } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import {
  getQuestions,
  getHotQuestions,
  getQuestion,
  createQuestion,
  getAnswers,
  createAnswer,
  getComments,
  createComment,
  toggleLike,
  toggleCollection,
  getHotTags,
  type QuestionListItem,
  type QuestionDetail,
  type AnswerListItem,
  type CommentListItem,
  type TagListItem,
} from '@/lib/api/community'
import { getErrorMessage } from '@/lib/apiClient'

const uiStore = useUiStore()

const channel = ref<'experience' | 'professional' | 'hot'>('experience')
const questions = ref<QuestionListItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)

const showCompose = ref(false)
const posting = ref(false)
const newPost = ref({ title: '', content: '' })
const hotTags = ref<TagListItem[]>([])
const selectedTagIds = ref<string[]>([])

const selectedDetail = ref<QuestionDetail | null>(null)
const answers = ref<AnswerListItem[]>([])
const loadingAnswers = ref(false)
const replyText = ref('')

const expandedComments = reactive<Record<string, boolean>>({})
const commentsMap = reactive<Record<string, CommentListItem[]>>({})
const loadingComments = reactive<Record<string, boolean>>({})
const commentInputs = reactive<Record<string, string>>({})

const PAGE_SIZE = 15

async function fetchQuestions(page = 1) {
  if (page === 1) {
    loading.value = true
  } else {
    loadingMore.value = true
  }
  try {
    const res =
      channel.value === 'hot'
        ? await getHotQuestions({ page, page_size: PAGE_SIZE })
        : await getQuestions({ channel: channel.value, page, page_size: PAGE_SIZE })
    if (page === 1) {
      questions.value = res.items
    } else {
      questions.value = [...questions.value, ...res.items]
    }
    currentPage.value = res.page
    totalPages.value = res.total_pages
  } catch {
    // silent
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function switchChannel(c: 'experience' | 'professional' | 'hot') {
  if (channel.value === c) return
  channel.value = c
  currentPage.value = 1
  totalPages.value = 1
  fetchQuestions(1)
}

function loadMore() {
  fetchQuestions(currentPage.value + 1)
}

watch(
  () => uiStore.activePanel,
  (panel) => {
    if (panel === 'community') fetchQuestions(1)
  },
)

async function openDetail(q: QuestionListItem) {
  selectedDetail.value = null
  answers.value = []
  Object.keys(expandedComments).forEach((k) => delete expandedComments[k])
  Object.keys(commentsMap).forEach((k) => delete commentsMap[k])
  Object.keys(loadingComments).forEach((k) => delete loadingComments[k])
  Object.keys(commentInputs).forEach((k) => delete commentInputs[k])
  try {
    const [detail, answerRes] = await Promise.all([
      getQuestion(q.id),
      getAnswers(q.id, { page: 1, page_size: 50 }),
    ])
    selectedDetail.value = detail
    answers.value = answerRes.items
  } catch {
    // silent
  }
}

function closeDetail() {
  selectedDetail.value = null
  answers.value = []
  replyText.value = ''
}

async function openCompose() {
  showCompose.value = true
  newPost.value = { title: '', content: '' }
  selectedTagIds.value = []
  try {
    hotTags.value = await getHotTags()
  } catch {
    hotTags.value = []
  }
}

function toggleTag(tagId: string) {
  const idx = selectedTagIds.value.indexOf(tagId)
  if (idx === -1) {
    selectedTagIds.value = [...selectedTagIds.value, tagId]
  } else {
    selectedTagIds.value = selectedTagIds.value.filter((id) => id !== tagId)
  }
}

async function onCreatePost() {
  posting.value = true
  try {
    await createQuestion({
      title: newPost.value.title,
      content: newPost.value.content,
      channel: channel.value === 'hot' ? 'experience' : channel.value,
      tag_ids: selectedTagIds.value.length ? selectedTagIds.value : undefined,
    })
    showCompose.value = false
    newPost.value = { title: '', content: '' }
    selectedTagIds.value = []
    await fetchQuestions(1)
  } catch (e) {
    alert(getErrorMessage(e))
  } finally {
    posting.value = false
  }
}

async function onLikeQuestion(q: QuestionListItem) {
  try {
    const res = await toggleLike('question', q.id, q.is_liked)
    questions.value = questions.value.map((item) =>
      item.id === q.id ? { ...item, is_liked: res.is_liked, like_count: res.new_count } : item,
    )
  } catch {
    // silent
  }
}

async function onLikeDetailQuestion() {
  if (!selectedDetail.value) return
  try {
    const res = await toggleLike('question', selectedDetail.value.id, selectedDetail.value.is_liked)
    selectedDetail.value = {
      ...selectedDetail.value,
      is_liked: res.is_liked,
      like_count: res.new_count,
    }
    questions.value = questions.value.map((item) =>
      item.id === selectedDetail.value!.id
        ? { ...item, is_liked: res.is_liked, like_count: res.new_count }
        : item,
    )
  } catch {
    // silent
  }
}

async function onCollectQuestion() {
  if (!selectedDetail.value) return
  try {
    const res = await toggleCollection(selectedDetail.value.id, selectedDetail.value.is_collected)
    selectedDetail.value = {
      ...selectedDetail.value,
      is_collected: res.is_collected,
      collection_count: res.new_count,
    }
    questions.value = questions.value.map((item) =>
      item.id === selectedDetail.value!.id
        ? { ...item, is_collected: res.is_collected, collection_count: res.new_count }
        : item,
    )
  } catch {
    // silent
  }
}

async function onLikeAnswer(a: AnswerListItem) {
  try {
    const res = await toggleLike('answer', a.id, a.is_liked)
    answers.value = answers.value.map((ans) =>
      ans.id === a.id ? { ...ans, is_liked: res.is_liked, like_count: res.new_count } : ans,
    )
  } catch {
    // silent
  }
}

async function onReply() {
  if (!replyText.value.trim() || !selectedDetail.value) return
  try {
    const answer = await createAnswer(selectedDetail.value.id, replyText.value)
    answers.value = [...answers.value, answer]
    replyText.value = ''
    selectedDetail.value = {
      ...selectedDetail.value,
      answer_count: selectedDetail.value.answer_count + 1,
    }
  } catch (e) {
    alert(getErrorMessage(e))
  }
}

async function toggleComments(answerId: string) {
  if (expandedComments[answerId]) {
    expandedComments[answerId] = false
    return
  }
  expandedComments[answerId] = true
  if (commentsMap[answerId]) return
  loadingComments[answerId] = true
  try {
    commentsMap[answerId] = await getComments(answerId)
  } catch {
    commentsMap[answerId] = []
  } finally {
    loadingComments[answerId] = false
  }
}

async function onPostComment(answerId: string) {
  const text = commentInputs[answerId]?.trim()
  if (!text) return
  try {
    const comment = await createComment(answerId, { content: text })
    commentsMap[answerId] = [...(commentsMap[answerId] || []), comment]
    commentInputs[answerId] = ''
    answers.value = answers.value.map((a) =>
      a.id === answerId ? { ...a, comment_count: a.comment_count + 1 } : a,
    )
  } catch (e) {
    alert(getErrorMessage(e))
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

.q-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.q-tag {
  padding: 2px 10px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  font-size: 11px;
  color: var(--text-secondary);
}

.q-meta {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.q-like-action {
  cursor: pointer;
  margin-left: 4px;
  transition: opacity 0.15s;
}

.q-like-action:hover {
  opacity: 0.8;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.load-more-btn {
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.load-more-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.compose-overlay,
.detail-overlay {
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

.compose-input,
.compose-textarea {
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

.compose-input:focus,
.compose-textarea:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.tag-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-picker-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 5px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-chip.selected {
  background: var(--accent-warm);
  border-color: var(--accent-warm);
  color: #fff;
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

.compose-submit:disabled {
  opacity: 0.5;
}

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
  margin-bottom: 10px;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.detail-content {
  font-size: 15px;
  color: var(--text-primary);
  line-height: 1.7;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 12px;
  white-space: pre-wrap;
}

.detail-actions-bar {
  display: flex;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 20px;
}

.detail-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.detail-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
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

.comment-toggle-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s;
}

.comment-toggle-btn:hover {
  color: var(--text-primary);
}

.comments-section {
  margin-top: 10px;
  padding-left: 16px;
  border-left: 2px solid rgba(255, 255, 255, 0.06);
}

.comment-loading {
  padding: 12px 0;
}

.comment-item {
  padding: 8px 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.comment-author {
  font-weight: 600;
  color: var(--text-primary);
  margin-right: 6px;
}

.comment-text {
  color: var(--text-secondary);
}

.reply-to {
  color: var(--accent-warm);
  font-size: 12px;
  margin-right: 4px;
}

.comment-replies {
  padding-left: 14px;
  border-left: 1px solid rgba(255, 255, 255, 0.04);
  margin-top: 4px;
}

.comment-input-area {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.comment-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

.comment-input::placeholder {
  color: var(--text-secondary);
}

.comment-send-btn {
  padding: 8px 14px;
  background: var(--accent-warm);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.comment-send-btn:disabled {
  opacity: 0.5;
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

.reply-input::placeholder {
  color: var(--text-secondary);
}

.reply-btn {
  padding: 10px 18px;
  background: var(--accent-warm);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.reply-btn:disabled {
  opacity: 0.5;
}
</style>
