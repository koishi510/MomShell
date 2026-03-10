<template>
  <Transition name="bar-page">
    <div v-if="visible" class="bar-page">
      <button class="close-btn" @click="close" aria-label="关闭">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>

      <div class="bar-background">
        <img class="bg-top" :src="bgTop" draggable="false" />
        <img class="bg-bottom" :src="bgBottom" draggable="false" />

        <!-- 内容层：独立于背景 -->
        <div class="bar-content">
          <!-- Left: Board -->
          <div class="board-container">
            <div class="board-scroll-area" ref="scrollAreaRef">
              <img class="board-frame-top" :src="boardUp" draggable="false" />
              <div class="notes-scatter" :style="{ minHeight: scatterHeight }">
                <div v-if="loading" class="board-loading">加载中...</div>
                <div v-else-if="posts.length === 0" class="board-empty">暂无帖子</div>
                <div
                  v-for="post in posts"
                  :key="post.id"
                  class="note-card"
                  :style="getCardStyle(post)"
                  @click="openDetail(post)"
                >
                  <img class="note-bg" :src="getNoteImage(post)" draggable="false" />
                  <div class="note-content">
                    <h4>{{ post.title }}</h4>
                    <p>{{ post.content_preview }}</p>
                    <span class="note-meta">{{ post.author.nickname }} · {{ post.answer_count }} 评论</span>
                  </div>
                </div>
                <div ref="sentinelRef" class="load-sentinel" />
              </div>
              <img class="board-frame-bottom" :src="boardDown" draggable="false" />
            </div>
          </div>

          <!-- Right: Action buttons -->
          <div class="side-actions">
            <button class="side-btn" @click="openCompose" aria-label="发帖">
              <img :src="noteImg" draggable="false" />
            </button>
            <button class="side-btn" @click="openCollections" aria-label="收藏">
              <img :src="bagImg" draggable="false" />
            </button>
          </div>
        </div>
      </div>

      <!-- Paper Modal -->
      <Transition name="paper-fade">
        <div v-if="paperMode" class="paper-overlay" @click.self="closePaper">
          <div class="paper-modal">
            <img class="paper-bg" :src="paperImg" draggable="false" />
            <button class="paper-close" @click="closePaper">✕</button>
            <div class="paper-content">
              <!-- Compose mode -->
              <template v-if="paperMode === 'compose'">
                <h3 class="paper-title">发布帖子</h3>
                <input
                  v-model="newPost.title"
                  class="paper-input"
                  placeholder="标题"
                />
                <textarea
                  v-model="newPost.content"
                  class="paper-textarea"
                  placeholder="写点什么..."
                  rows="6"
                />
                <button
                  class="paper-submit"
                  :disabled="posting || !newPost.title.trim() || !newPost.content.trim()"
                  @click="onCreatePost"
                >
                  {{ posting ? '发布中...' : '发布' }}
                </button>
              </template>

              <!-- Detail mode -->
              <template v-if="paperMode === 'detail' && selectedDetail">
                <h3 class="paper-title">{{ selectedDetail.title }}</h3>
                <div class="detail-author">
                  <span class="author-name">{{ selectedDetail.author.nickname }}</span>
                  <span v-if="selectedDetail.author.display_tag" class="author-tag">{{ selectedDetail.author.display_tag }}</span>
                </div>
                <div class="detail-body">{{ selectedDetail.content }}</div>

                <div class="detail-actions-bar">
                  <button class="detail-action-btn" @click="onLikeDetailQuestion">
                    <span :class="['icon-like', { active: selectedDetail.is_liked }]">&#9829;</span>
                    {{ selectedDetail.like_count }}
                  </button>
                  <button class="detail-action-btn" @click="onCollectQuestion">
                    <span :class="['icon-collect', { active: selectedDetail.is_collected }]">{{ selectedDetail.is_collected ? '&#9733;' : '&#9734;' }}</span>
                    {{ selectedDetail.collection_count }}
                  </button>
                </div>

                <div class="comments-section">
                  <h4 class="comments-title">评论 ({{ selectedDetail.answer_count }})</h4>
                  <div v-if="loadingAnswers" class="comments-loading">加载中...</div>
                  <div v-for="a in answers" :key="a.id" class="comment-card">
                    <div class="comment-header">
                      <span class="comment-author">{{ a.author.nickname }}</span>
                      <span v-if="a.author.display_tag" class="author-tag">{{ a.author.display_tag }}</span>
                    </div>
                    <p class="comment-body">{{ a.content }}</p>
                    <div class="comment-actions">
                      <button class="comment-like-btn" @click="onLikeAnswer(a)">
                        <span :class="['icon-like', { active: a.is_liked }]">&#9829;</span> {{ a.like_count }}
                      </button>
                      <button class="comment-like-btn" @click="toggleAnswerComments(a)">
                        &#128172; {{ a.comment_count }}
                      </button>
                      <button class="comment-like-btn" @click="setReplyTarget(a.id)">
                        回复
                      </button>
                    </div>

                    <!-- Nested comments -->
                    <div v-if="loadingComments[a.id]" class="sub-comments-loading">加载中...</div>
                    <div v-if="answerComments[a.id]" class="sub-comments">
                      <div v-for="c in answerComments[a.id]" :key="c.id" class="sub-comment">
                        <span class="sub-comment-author">{{ c.author.nickname }}</span>
                        <span v-if="c.reply_to_user" class="sub-comment-reply-hint">回复 @{{ c.reply_to_user.nickname }}</span>
                        <span class="sub-comment-text">{{ c.content }}</span>
                        <div class="sub-comment-actions">
                          <button class="comment-like-btn" @click="onLikeComment(a.id, c)">
                            <span :class="['icon-like', { active: c.is_liked }]">&#9829;</span> {{ c.like_count }}
                          </button>
                          <button class="comment-like-btn" @click="setReplyTarget(a.id, c.id, c.author.nickname)">
                            回复
                          </button>
                        </div>
                        <!-- Nested replies -->
                        <div v-for="r in c.replies" :key="r.id" class="sub-comment nested">
                          <span class="sub-comment-author">{{ r.author.nickname }}</span>
                          <span v-if="r.reply_to_user" class="sub-comment-reply-hint">回复 @{{ r.reply_to_user.nickname }}</span>
                          <span class="sub-comment-text">{{ r.content }}</span>
                          <div class="sub-comment-actions">
                            <button class="comment-like-btn" @click="onLikeComment(a.id, r)">
                              <span :class="['icon-like', { active: r.is_liked }]">&#9829;</span> {{ r.like_count }}
                            </button>
                            <button class="comment-like-btn" @click="setReplyTarget(a.id, r.id, r.author.nickname)">
                              回复
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="reply-area">
                  <div v-if="replyTarget" class="reply-target-hint">
                    回复 @{{ replyTarget.replyToName || '评论' }}
                    <button class="reply-target-clear" @click="clearReplyTarget">✕</button>
                  </div>
                  <input
                    v-model="replyText"
                    class="reply-input"
                    :placeholder="replyTarget ? `回复 @${replyTarget.replyToName || '评论'}...` : '写下你的评论...'"
                    @keydown.enter="onSubmitReply"
                  />
                  <button class="reply-btn" :disabled="!replyText.trim()" @click="onSubmitReply">发送</button>
                </div>
              </template>

              <!-- Collections mode -->
              <template v-if="paperMode === 'collections'">
                <h3 class="paper-title">我的收藏</h3>
                <div v-if="loadingCollections" class="comments-loading">加载中...</div>
                <div v-else-if="collectionItems.length === 0" class="board-empty">暂无收藏</div>
                <div
                  v-for="item in collectionItems"
                  :key="item.id"
                  class="collection-item"
                  @click="openDetail(item)"
                >
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.content_preview }}</p>
                  <span class="note-meta">{{ item.author.nickname }} · {{ item.answer_count }} 评论</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useUiStore } from '@/stores/ui'
import {
  getQuestions,
  getQuestion,
  getAnswers,
  createQuestion,
  createAnswer,
  getComments,
  createComment,
  toggleLike,
  toggleCollection,
  getMyCollections,
  type QuestionListItem,
  type QuestionDetail,
  type AnswerListItem,
  type CommentListItem,
} from '@/lib/api/community'
import { getErrorMessage } from '@/lib/apiClient'

import bgTop from '@/assets/images/background_1.png'
import bgBottom from '@/assets/images/background_2.png'
import boardUp from '@/assets/images/board_up.png'
import boardDown from '@/assets/images/board_down.png'
import noteImg from '@/assets/images/note.png'
import note1 from '@/assets/images/note_1.png'
import note2 from '@/assets/images/note_2.png'
import note3 from '@/assets/images/note_3.png'
import notePro from '@/assets/images/note_pro.png'
import bagImg from '@/assets/images/bag.png'
import paperImg from '@/assets/images/paper.png'

const uiStore = useUiStore()

const visible = computed(() => uiStore.activePanel === 'bar')

// Posts state
const posts = ref<QuestionListItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)
const PAGE_SIZE = 15

// Paper modal state
type PaperMode = 'compose' | 'detail' | 'collections' | null
const paperMode = ref<PaperMode>(null)

// Compose state
const newPost = ref({ title: '', content: '' })
const posting = ref(false)

// Detail state
const selectedDetail = ref<QuestionDetail | null>(null)
const answers = ref<AnswerListItem[]>([])
const loadingAnswers = ref(false)
const replyText = ref('')

// Nested comments state
const answerComments = ref<Record<string, CommentListItem[]>>({})
const loadingComments = ref<Record<string, boolean>>({})
const replyTarget = ref<{
  answerId: string
  parentId?: string
  replyToName?: string
} | null>(null)

// Collections state
const collectionItems = ref<QuestionListItem[]>([])
const loadingCollections = ref(false)

// Refs for infinite scroll
const scrollAreaRef = ref<HTMLElement | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

// Note image variants
const NOTE_VARIANTS = [note1, note2, note3]

function simpleHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function getNoteImage(post: QuestionListItem): string {
  if (post.author.is_certified) return notePro
  return NOTE_VARIANTS[simpleHash(post.id) % 3]
}

function getCardStyle(post: QuestionListItem) {
  const idx = posts.value.indexOf(post)
  const hash = simpleHash(post.id)
  const col = idx % 3
  const row = Math.floor(idx / 3)
  const baseLeft = 8 + col * 30
  const baseTop = 5 + row * 28
  const jitterX = ((hash % 17) - 8) * 0.8
  const jitterY = (((hash >> 4) % 13) - 6) * 0.7
  const rotation = (((hash >> 8) % 21) - 10) * 0.8
  return {
    left: `${baseLeft + jitterX}%`,
    top: `${baseTop + jitterY}%`,
    transform: `rotate(${rotation}deg)`,
    zIndex: (hash % 5) + 2,
  }
}

const scatterHeight = computed(() => {
  const rows = Math.ceil(posts.value.length / 3)
  return `${Math.max(100, rows * 28 + 10)}%`
})

// API calls
async function fetchPosts(page = 1) {
  if (page === 1) {
    loading.value = true
  } else {
    loadingMore.value = true
  }
  try {
    const res = await getQuestions({ page, page_size: PAGE_SIZE })
    if (page === 1) {
      posts.value = res.items
    } else {
      posts.value = [...posts.value, ...res.items]
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

function close() {
  uiStore.closePanel()
}

function openCompose() {
  newPost.value = { title: '', content: '' }
  paperMode.value = 'compose'
}

async function openDetail(q: QuestionListItem) {
  paperMode.value = 'detail'
  selectedDetail.value = null
  answers.value = []
  loadingAnswers.value = true
  try {
    const [detail, answerRes] = await Promise.all([
      getQuestion(q.id),
      getAnswers(q.id, { page: 1, page_size: 50 }),
    ])
    selectedDetail.value = detail
    answers.value = answerRes.items
  } catch {
    // silent
  } finally {
    loadingAnswers.value = false
  }
}

async function openCollections() {
  paperMode.value = 'collections'
  collectionItems.value = []
  loadingCollections.value = true
  try {
    const res = await getMyCollections({ page: 1, page_size: 50 })
    collectionItems.value = res.items.map((c) => c.question)
  } catch {
    // silent
  } finally {
    loadingCollections.value = false
  }
}

function closePaper() {
  paperMode.value = null
  selectedDetail.value = null
  answers.value = []
  replyText.value = ''
  answerComments.value = {}
  loadingComments.value = {}
  replyTarget.value = null
}

async function onCreatePost() {
  if (!newPost.value.title.trim() || !newPost.value.content.trim()) return
  posting.value = true
  try {
    await createQuestion({
      title: newPost.value.title,
      content: newPost.value.content,
      channel: 'experience',
    })
    paperMode.value = null
    newPost.value = { title: '', content: '' }
    await fetchPosts(1)
  } catch (e) {
    alert(getErrorMessage(e))
  } finally {
    posting.value = false
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
    posts.value = posts.value.map((item) =>
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
    posts.value = posts.value.map((item) =>
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

async function toggleAnswerComments(a: AnswerListItem) {
  if (answerComments.value[a.id]) {
    delete answerComments.value[a.id]
    return
  }
  loadingComments.value[a.id] = true
  try {
    answerComments.value[a.id] = await getComments(a.id)
  } catch {
    // silent
  } finally {
    loadingComments.value[a.id] = false
  }
}

function setReplyTarget(answerId: string, parentId?: string, replyToName?: string) {
  replyTarget.value = { answerId, parentId, replyToName }
  replyText.value = ''
}

function clearReplyTarget() {
  replyTarget.value = null
}

async function onSubmitReply() {
  if (!replyText.value.trim() || !selectedDetail.value) return
  try {
    if (replyTarget.value) {
      const { answerId, parentId } = replyTarget.value
      await createComment(answerId, {
        content: replyText.value,
        parent_id: parentId,
      })
      answerComments.value[answerId] = await getComments(answerId)
      replyTarget.value = null
    } else {
      await createAnswer(selectedDetail.value.id, replyText.value)
      const answerRes = await getAnswers(selectedDetail.value.id, { page: 1, page_size: 50 })
      answers.value = answerRes.items
      selectedDetail.value = {
        ...selectedDetail.value,
        answer_count: selectedDetail.value.answer_count + 1,
      }
    }
    replyText.value = ''
  } catch (e) {
    alert(getErrorMessage(e))
  }
}

function updateCommentInList(
  list: CommentListItem[],
  targetId: string,
  res: { is_liked: boolean; new_count: number },
): CommentListItem[] {
  return list.map((c) =>
    c.id === targetId
      ? { ...c, is_liked: res.is_liked, like_count: res.new_count }
      : { ...c, replies: updateCommentInList(c.replies, targetId, res) },
  )
}

async function onLikeComment(answerId: string, c: CommentListItem) {
  try {
    const res = await toggleLike('comment', c.id, c.is_liked)
    const comments = answerComments.value[answerId]
    if (comments) {
      answerComments.value[answerId] = updateCommentInList(comments, c.id, res)
    }
  } catch {
    // silent
  }
}

// Infinite scroll
function setupObserver() {
  if (observer) observer.disconnect()
  if (!sentinelRef.value || !scrollAreaRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loadingMore.value && currentPage.value < totalPages.value) {
        fetchPosts(currentPage.value + 1)
      }
    },
    { root: scrollAreaRef.value, threshold: 0.1 },
  )
  observer.observe(sentinelRef.value)
}

watch(visible, (v) => {
  if (v) {
    fetchPosts(1)
    nextTick(setupObserver)
  } else {
    paperMode.value = null
    if (observer) observer.disconnect()
  }
})

watch(posts, () => {
  nextTick(setupObserver)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.bar-page {
  position: fixed;
  inset: 0;
  z-index: 100;
  overflow: hidden;
  background-color: #3a2f28;
}

.close-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 160;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.6);
}

/* Background layout */
.bar-background {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* 背景图：独立绝对定位 */
.bg-top,
.bg-bottom {
  position: absolute;
  left: 0;
  width: 100%;
  height: auto;
  display: block;
}

.bg-top {
  top: 0;
  transform: scaleY(1.25);
  transform-origin: top center;
}

.bg-bottom {
  bottom: 0;
  transform: scaleY(1);
  transform-origin: bottom center;
  z-index: 3;
  pointer-events: none;
}

/* 内容层 */
.bar-content {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 4%;
  padding-bottom: 5vh;
}

/* Board container */
.board-container {
  width: 80%;
  height: 65vh;
  align-self: flex-start;
  margin-top: 1vh;
  min-height: 0;
}

.board-frame-top,
.board-frame-bottom {
  width: 100%;
  display: block;
  z-index: 1;
  position: sticky;
  pointer-events: none;
}

.board-frame-top {
  top: 0;
}

.board-frame-bottom {
  bottom: 0;
}

.board-scroll-area {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  background: url('@/assets/images/board_med.png') repeat-y center / 100% auto;
  min-height: 0;
  position: relative;
}

.board-scroll-area::-webkit-scrollbar {
  display: none;
}

/* Notes scatter */
.notes-scatter {
  position: relative;
  width: 100%;
  min-height: 100%;
}

.board-loading,
.board-empty {
  text-align: center;
  padding: 40px 0;
  color: #5a3e2b;
  font-size: 14px;
}

.note-card {
  position: absolute;
  width: 26%;
  cursor: pointer;
  transition: transform 0.2s, z-index 0s;
}

.note-card:hover {
  transform: scale(1.05) !important;
  z-index: 10 !important;
}

.note-bg {
  width: 100%;
  display: block;
  pointer-events: none;
}

.note-content {
  position: absolute;
  inset: 15% 12% 18% 12%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.note-content h4 {
  font-size: 11px;
  font-weight: 700;
  color: #3a2a1a;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-content p {
  font-size: 9px;
  color: #5a4a3a;
  line-height: 1.4;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.note-meta {
  font-size: 8px;
  color: #8a7a6a;
  margin-top: auto;
}

.load-sentinel {
  height: 1px;
  width: 100%;
  position: absolute;
  bottom: 0;
}

/* Side actions */
.side-actions {
  width: 18%;
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 0 2%;
}

.side-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s;
}

.side-btn:hover {
  transform: scale(1.08);
}

.side-btn img {
  width: min(200px, 24vw);
  height: auto;
}

.side-btn:first-child {
  transform: translateY(-60px);
}

.side-btn:last-child {
  transform: translateY(60px);
}

.side-btn:first-child:hover {
  transform: translateY(-60px) scale(1.08);
}

.side-btn:last-child:hover {
  transform: translateY(60px) scale(1.08);
}

/* Paper overlay */
.paper-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.paper-modal {
  position: relative;
  width: min(500px, 85vw);
  max-height: 85vh;
}

.paper-bg {
  width: 100%;
  display: block;
  pointer-events: none;
}

.paper-close {
  position: absolute;
  top: 8%;
  right: 10%;
  background: none;
  border: none;
  font-size: 20px;
  color: #5a3e2b;
  cursor: pointer;
  z-index: 2;
}

.paper-content {
  position: absolute;
  inset: 12% 14% 10% 14%;
  overflow-y: auto;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
}

.paper-content::-webkit-scrollbar {
  display: none;
}

.paper-title {
  font-size: 18px;
  font-weight: 700;
  color: #3a2a1a;
  margin: 0 0 12px;
}

.paper-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #c4a882;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  color: #3a2a1a;
  outline: none;
  margin-bottom: 10px;
  box-sizing: border-box;
}

.paper-input:focus {
  border-color: #8a6a4a;
}

.paper-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #c4a882;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  color: #3a2a1a;
  outline: none;
  resize: vertical;
  font-family: inherit;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.paper-textarea:focus {
  border-color: #8a6a4a;
}

.paper-submit {
  align-self: flex-end;
  padding: 8px 24px;
  background: #8a6a4a;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.paper-submit:hover {
  background: #6a4a2a;
}

.paper-submit:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Detail mode */
.detail-author {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #5a4a3a;
}

.author-name {
  font-weight: 600;
}

.author-tag {
  display: inline-block;
  padding: 1px 8px;
  background: rgba(180, 130, 80, 0.2);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: #8a6a4a;
}

.detail-body {
  font-size: 14px;
  color: #3a2a1a;
  line-height: 1.7;
  white-space: pre-wrap;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(90, 62, 43, 0.15);
}

.detail-actions-bar {
  display: flex;
  gap: 14px;
  margin-bottom: 16px;
}

.detail-action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: rgba(138, 106, 74, 0.1);
  border: 1px solid rgba(138, 106, 74, 0.2);
  border-radius: 8px;
  color: #5a4a3a;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.detail-action-btn:hover {
  background: rgba(138, 106, 74, 0.2);
}

.icon-like {
  color: #8a7a6a;
  transition: color 0.15s;
}

.icon-like.active {
  color: #e74c5e;
}

.icon-collect {
  font-size: 14px;
}

.icon-collect.active {
  color: #e7a84c;
}

/* Comments section */
.comments-section {
  flex: 1;
  min-height: 0;
}

.comments-title {
  font-size: 14px;
  font-weight: 600;
  color: #3a2a1a;
  margin: 0 0 10px;
}

.comments-loading {
  text-align: center;
  padding: 20px 0;
  color: #8a7a6a;
  font-size: 13px;
}

.comment-card {
  padding: 10px 0;
  border-bottom: 1px solid rgba(90, 62, 43, 0.1);
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.comment-author {
  font-size: 12px;
  font-weight: 600;
  color: #3a2a1a;
}

.comment-body {
  font-size: 13px;
  color: #5a4a3a;
  line-height: 1.5;
  margin: 0 0 4px;
}

.comment-actions {
  display: flex;
  gap: 10px;
}

.comment-like-btn {
  background: none;
  border: none;
  color: #8a7a6a;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

/* Reply area */
.reply-area {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.reply-target-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #8a6a4a;
  margin-bottom: 4px;
  width: 100%;
}

.reply-target-clear {
  background: none;
  border: none;
  color: #8a7a6a;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}

/* Nested comments */
.sub-comments {
  margin-top: 6px;
  padding-left: 16px;
  border-left: 2px solid rgba(90, 62, 43, 0.1);
}

.sub-comments-loading {
  padding: 6px 0 6px 16px;
  color: #8a7a6a;
  font-size: 11px;
}

.sub-comment {
  padding: 4px 0;
  font-size: 12px;
  color: #5a4a3a;
  line-height: 1.5;
}

.sub-comment.nested {
  padding-left: 16px;
}

.sub-comment-author {
  font-weight: 600;
  color: #3a2a1a;
  margin-right: 4px;
}

.sub-comment-reply-hint {
  color: #8a7a6a;
  margin-right: 4px;
  font-size: 11px;
}

.sub-comment-actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.reply-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #c4a882;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  color: #3a2a1a;
  outline: none;
}

.reply-input:focus {
  border-color: #8a6a4a;
}

.reply-btn {
  padding: 8px 16px;
  background: #8a6a4a;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.reply-btn:disabled {
  opacity: 0.5;
}

/* Collections mode */
.collection-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(90, 62, 43, 0.1);
  cursor: pointer;
  transition: background 0.15s;
}

.collection-item:hover {
  background: rgba(138, 106, 74, 0.06);
}

.collection-item h4 {
  font-size: 14px;
  font-weight: 600;
  color: #3a2a1a;
  margin: 0 0 4px;
}

.collection-item p {
  font-size: 12px;
  color: #5a4a3a;
  line-height: 1.4;
  margin: 0 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Transitions */
.bar-page-enter-active,
.bar-page-leave-active {
  transition: opacity 0.35s ease;
}

.bar-page-enter-from,
.bar-page-leave-to {
  opacity: 0;
}

.paper-fade-enter-active,
.paper-fade-leave-active {
  transition: opacity 0.25s ease;
}

.paper-fade-enter-from,
.paper-fade-leave-to {
  opacity: 0;
}
</style>
