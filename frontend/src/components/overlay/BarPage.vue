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
            <div class="board-scroll-area" ref="scrollAreaRef" @wheel="onScrollWheel">
              <div :style="bounceStyle" class="board-scroll-inner">
              <img class="board-frame-top" :src="boardUp" draggable="false" />
              <div class="notes-scatter" :style="{ minHeight: scatterHeight }">
                <div v-if="loading" class="board-loading">加载中...</div>
                <div v-else-if="posts.length === 0" class="board-empty">暂无帖子</div>
                <div
                  v-for="post in posts"
                  :key="post.id"
                  :class="['note-card', { 'note-card-pro': post.channel === 'professional' }]"
                  :style="getCardStyle(post)"
                  @click="openDetail(post)"
                >
                  <img class="note-bg" :src="getNoteImage(post)" draggable="false" />
                  <div :class="['note-content', { 'note-content-n2': getNoteImage(post) === note2, 'note-content-n3': getNoteImage(post) === note3 }]">
                    <h4>{{ post.title }}</h4>
                    <p>{{ post.content_preview }}</p>
                    <span class="note-meta"><img :src="getAvatar(post.author)" class="note-meta-avatar" @error="onAvatarError" />{{ post.author.nickname }} · {{ post.answer_count }} 评论</span>
                  </div>
                </div>
                <div ref="sentinelRef" class="load-sentinel" />
              </div>
              <img class="board-frame-bottom" :src="boardDown" draggable="false" />
              </div>
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
                <label class="channel-toggle">
                  <input
                    type="checkbox"
                    :checked="newPost.channel === 'professional'"
                    @change="newPost.channel = ($event.target as HTMLInputElement).checked ? 'professional' : 'experience'"
                  />
                  <span>专家帖</span>
                  <span class="channel-hint">仅认证专家可回复</span>
                  <button
                    class="paper-submit"
                    :disabled="posting || !newPost.title.trim() || !newPost.content.trim()"
                    @click="onCreatePost"
                  >
                    {{ posting ? '发布中...' : '发布' }}
                  </button>
                </label>
              </template>

              <!-- Detail mode -->
              <template v-if="paperMode === 'detail' && selectedDetail">
                <template v-if="!editingPost">
                  <h3 class="paper-title">{{ selectedDetail.title }}</h3>
                  <div class="detail-author">
                    <img :src="getAvatar(selectedDetail.author)" class="detail-avatar" @error="onAvatarError" />
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
                      <span :class="['icon-collect', { active: selectedDetail.is_collected }]">&#9733;</span>
                      {{ selectedDetail.collection_count }}
                    </button>
                    <template v-if="canModify(selectedDetail.author.id)">
                      <button class="detail-action-btn detail-action-right" @click="startEditPost">编辑</button>
                      <button class="detail-action-btn detail-action-danger" @click="onDeletePost">删除</button>
                    </template>
                  </div>
                </template>
                <template v-else>
                  <input v-model="editPostForm.title" class="paper-input" placeholder="标题" />
                  <textarea v-model="editPostForm.content" class="paper-textarea" rows="6" />
                  <div class="detail-actions-bar">
                    <button class="detail-action-btn" @click="saveEditPost">保存</button>
                    <button class="detail-action-btn" @click="cancelEditPost">取消</button>
                    <button class="detail-action-btn detail-action-right detail-action-danger" @click="onDeletePost">删除</button>
                  </div>
                </template>

                <div class="comments-section">
                  <h4 class="comments-title">评论 ({{ selectedDetail.answer_count }})</h4>
                  <div v-if="loadingAnswers" class="comments-loading">加载中...</div>
                  <div v-for="a in answers" :key="a.id" class="comment-card">
                    <div class="comment-header">
                      <img :src="getAvatar(a.author)" class="comment-avatar" @error="onAvatarError" />
                      <span class="comment-author">{{ a.author.nickname }}</span>
                      <span v-if="a.author.display_tag" class="author-tag">{{ a.author.display_tag }}</span>
                    </div>
                    <template v-if="editingAnswerId === a.id">
                      <textarea v-model="editAnswerContent" class="edit-answer-textarea" rows="3" />
                      <div class="detail-manage">
                        <button class="manage-btn" @click="saveEditAnswer">保存</button>
                        <button class="manage-btn" @click="cancelEditAnswer">取消</button>
                        <button class="manage-btn manage-btn-danger" @click="onDeleteAnswer(a)">删除</button>
                      </div>
                    </template>
                    <p v-else class="comment-body">{{ a.content }}</p>
                    <div class="comment-actions">
                      <button class="comment-like-btn" @click="onLikeAnswer(a)">
                        <span :class="['icon-like', { active: a.is_liked }]">&#9829;</span> {{ a.like_count }}
                      </button>
                      <button class="comment-like-btn" @click="toggleAnswerComments(a)">
                        <svg class="icon-comment" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H8l-4 4v-4H4a2 2 0 01-2-2V4z"/></svg> {{ a.comment_count }}
                      </button>
                      <button class="comment-like-btn" @click="setReplyTarget(a.id)">
                        回复
                      </button>
                      <button v-if="canModify(a.author.id)" class="comment-like-btn" @click="startEditAnswer(a)">编辑</button>
                    </div>

                    <!-- Nested comments -->
                    <div v-if="loadingComments[a.id]" class="sub-comments-loading">加载中...</div>
                    <div v-if="answerComments[a.id]" class="sub-comments">
                      <div v-for="c in answerComments[a.id]" :key="c.id" class="sub-comment">
                        <img :src="getAvatar(c.author)" class="sub-comment-avatar" @error="onAvatarError" />
                        <span class="sub-comment-author">{{ c.author.nickname }}</span>
                        <span v-if="c.reply_to_user" class="sub-comment-reply-hint">回复 @{{ c.reply_to_user.nickname }}</span>
                        <template v-if="editingCommentId === c.id">
                          <div class="edit-comment-area">
                            <input v-model="editingCommentContent" class="reply-input" @keydown.enter="onSaveComment(a.id)" />
                            <button class="reply-btn" :disabled="!editingCommentContent.trim()" @click="onSaveComment(a.id)">保存</button>
                            <button class="comment-like-btn" @click="cancelEditComment">取消</button>
                          </div>
                        </template>
                        <span v-else class="sub-comment-text">{{ c.content }}</span>
                        <div class="sub-comment-actions">
                          <button class="comment-like-btn" @click="onLikeComment(a.id, c)">
                            <span :class="['icon-like', { active: c.is_liked }]">&#9829;</span> {{ c.like_count }}
                          </button>
                          <button class="comment-like-btn" @click="setReplyTarget(a.id, c.id, c.author.nickname)">
                            回复
                          </button>
                          <button v-if="canModify(c.author.id)" class="comment-like-btn" @click="startEditComment(c)">编辑</button>
                          <button v-if="canModify(c.author.id)" class="comment-like-btn manage-text-danger" @click="onDeleteComment(a.id, c.id)">删除</button>
                        </div>
                        <!-- Nested replies -->
                        <div v-for="r in c.replies" :key="r.id" class="sub-comment nested">
                          <img :src="getAvatar(r.author)" class="sub-comment-avatar" @error="onAvatarError" />
                          <span class="sub-comment-author">{{ r.author.nickname }}</span>
                          <span v-if="r.reply_to_user" class="sub-comment-reply-hint">回复 @{{ r.reply_to_user.nickname }}</span>
                          <template v-if="editingCommentId === r.id">
                            <div class="edit-comment-area">
                              <input v-model="editingCommentContent" class="reply-input" @keydown.enter="onSaveComment(a.id)" />
                              <button class="reply-btn" :disabled="!editingCommentContent.trim()" @click="onSaveComment(a.id)">保存</button>
                              <button class="comment-like-btn" @click="cancelEditComment">取消</button>
                            </div>
                          </template>
                          <span v-else class="sub-comment-text">{{ r.content }}</span>
                          <div class="sub-comment-actions">
                            <button class="comment-like-btn" @click="onLikeComment(a.id, r)">
                              <span :class="['icon-like', { active: r.is_liked }]">&#9829;</span> {{ r.like_count }}
                            </button>
                            <button class="comment-like-btn" @click="setReplyTarget(a.id, r.id, r.author.nickname)">
                              回复
                            </button>
                            <button v-if="canModify(r.author.id)" class="comment-like-btn" @click="startEditComment(r)">编辑</button>
                            <button v-if="canModify(r.author.id)" class="comment-like-btn manage-text-danger" @click="onDeleteComment(a.id, r.id)">删除</button>
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
                <div class="bag-tabs">
                  <button :class="['bag-tab', { active: bagTab === 'collections' }]" @click="bagTab = 'collections'">我的收藏</button>
                  <button :class="['bag-tab', { active: bagTab === 'my-questions' }]" @click="bagTab = 'my-questions'">我的提问</button>
                  <button :class="['bag-tab', { active: bagTab === 'my-answers' }]" @click="bagTab = 'my-answers'">我的回答</button>
                </div>
                <div v-if="loadingCollections" class="comments-loading">加载中...</div>
                <template v-else>
                  <!-- 收藏 -->
                  <template v-if="bagTab === 'collections'">
                    <div v-if="collectionItems.length === 0" class="board-empty">暂无收藏</div>
                    <div
                      v-for="item in collectionItems"
                      :key="item.id"
                      class="collection-item"
                      @click="openDetail(item)"
                    >
                      <h4>{{ item.title }}</h4>
                      <p>{{ item.content_preview }}</p>
                      <span class="note-meta"><img :src="getAvatar(item.author)" class="note-meta-avatar" @error="onAvatarError" />{{ item.author.nickname }} · {{ item.answer_count }} 评论</span>
                    </div>
                  </template>
                  <!-- 我的提问 -->
                  <template v-if="bagTab === 'my-questions'">
                    <div v-if="myQuestions.length === 0" class="board-empty">暂无提问</div>
                    <div
                      v-for="item in myQuestions"
                      :key="item.id"
                      class="collection-item"
                      @click="openDetail(item)"
                    >
                      <h4>{{ item.title }}</h4>
                      <p>{{ item.content_preview }}</p>
                      <span class="note-meta">{{ item.answer_count }} 评论 · {{ item.like_count }} 赞</span>
                    </div>
                  </template>
                  <!-- 我的回答 -->
                  <template v-if="bagTab === 'my-answers'">
                    <div v-if="myAnswers.length === 0" class="board-empty">暂无回答</div>
                    <div
                      v-for="item in myAnswers"
                      :key="item.id"
                      class="collection-item"
                    >
                      <p>{{ item.content_preview }}</p>
                      <span class="note-meta">{{ item.like_count }} 赞 · {{ item.comment_count }} 评论</span>
                    </div>
                  </template>
                </template>
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
  updateQuestion,
  deleteQuestion,
  updateAnswer,
  deleteAnswer,
  deleteComment,
  updateComment,
  getMyQuestions,
  getMyAnswers,
  type QuestionListItem,
  type QuestionDetail,
  type AnswerListItem,
  type CommentListItem,
} from '@/lib/api/community'
import { getErrorMessage } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/auth'

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
import avatarDefault from '@/assets/images/avatar.png'
import aiAvatar from '@/assets/images/ai_avatar.png'

function getAvatar(author: { avatar_url: string | null; role: string }) {
  if (author.role === 'ai_assistant') return aiAvatar
  return author.avatar_url || avatarDefault
}

function onAvatarError(e: Event) {
  const img = e.target as HTMLImageElement
  if (!img.dataset.fallback) {
    img.dataset.fallback = '1'
    img.src = avatarDefault
  }
}

const uiStore = useUiStore()
const auth = useAuthStore()

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
const newPost = ref({ title: '', content: '', channel: 'experience' as string })
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
// Collections / My content state
const collectionItems = ref<QuestionListItem[]>([])
const myQuestions = ref<QuestionListItem[]>([])
const myAnswers = ref<AnswerListItem[]>([])
const loadingCollections = ref(false)
type BagTab = 'collections' | 'my-questions' | 'my-answers'
const bagTab = ref<BagTab>('collections')

// Edit/delete state
const editingPost = ref(false)
const editPostForm = ref({ title: '', content: '' })
const editingAnswerId = ref<string | null>(null)
const editAnswerContent = ref('')

function canModify(authorId: string) {
  return auth.user?.id === authorId || auth.user?.is_admin
}

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
  if (post.channel === 'professional') return notePro
  return NOTE_VARIANTS[simpleHash(post.id) % 3]
}

function getCardStyle(post: QuestionListItem) {
  const idx = posts.value.indexOf(post)
  const hash = simpleHash(post.id)
  const col = idx % 3
  const row = Math.floor(idx / 3)
  const baseLeft = 8 + col * 30
  const baseTop = 3 + row * 18
  const jitterX = ((hash % 17) - 8) * 0.8
  const jitterY = (((hash >> 4) % 13) - 6) * 0.5
  const rotation = (((hash >> 8) % 21) - 10) * 0.8
  return {
    left: `${baseLeft + jitterX}%`,
    top: `${baseTop + jitterY}vh`,
    transform: `rotate(${rotation}deg)`,
    zIndex: (hash % 5) + 2,
  }
}

const scatterHeight = computed(() => {
  const rows = Math.ceil(posts.value.length / 3)
  const height = rows * 18 + 15
  return `${Math.max(50, height)}vh`
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
  newPost.value = { title: '', content: '', channel: 'experience' }
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
  bagTab.value = 'collections'
  collectionItems.value = []
  myQuestions.value = []
  myAnswers.value = []
  loadingCollections.value = true
  try {
    const [colRes, qRes, aRes] = await Promise.all([
      getMyCollections({ page: 1, page_size: 50 }),
      getMyQuestions({ page: 1, page_size: 50 }),
      getMyAnswers({ page: 1, page_size: 50 }),
    ])
    collectionItems.value = colRes.items.map((c) => c.question)
    myQuestions.value = qRes.items
    myAnswers.value = aRes.items
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
  editingPost.value = false
  editingAnswerId.value = null
}

async function onCreatePost() {
  if (!newPost.value.title.trim() || !newPost.value.content.trim()) return
  posting.value = true
  try {
    await createQuestion({
      title: newPost.value.title,
      content: newPost.value.content,
      channel: newPost.value.channel,
    })
    paperMode.value = null
    newPost.value = { title: '', content: '', channel: 'experience' }
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

// Edit/delete post (question)
function startEditPost() {
  if (!selectedDetail.value) return
  editPostForm.value = {
    title: selectedDetail.value.title,
    content: selectedDetail.value.content,
  }
  editingPost.value = true
}

function cancelEditPost() {
  editingPost.value = false
  editPostForm.value = { title: '', content: '' }
}

async function saveEditPost() {
  if (!selectedDetail.value) return
  try {
    await updateQuestion(selectedDetail.value.id, editPostForm.value)
    selectedDetail.value = {
      ...selectedDetail.value,
      title: editPostForm.value.title,
      content: editPostForm.value.content,
    }
    posts.value = posts.value.map((p) =>
      p.id === selectedDetail.value!.id
        ? { ...p, title: editPostForm.value.title, content_preview: editPostForm.value.content.slice(0, 100) }
        : p,
    )
    editingPost.value = false
  } catch (e) {
    alert(getErrorMessage(e))
  }
}

async function onDeletePost() {
  if (!selectedDetail.value || !confirm('确定删除此帖？')) return
  try {
    await deleteQuestion(selectedDetail.value.id)
    posts.value = posts.value.filter((p) => p.id !== selectedDetail.value!.id)
    closePaper()
  } catch (e) {
    alert(getErrorMessage(e))
  }
}

// Edit/delete answer
function startEditAnswer(a: AnswerListItem) {
  editingAnswerId.value = a.id
  editAnswerContent.value = a.content
}

function cancelEditAnswer() {
  editingAnswerId.value = null
  editAnswerContent.value = ''
}

async function saveEditAnswer() {
  if (!editingAnswerId.value) return
  try {
    await updateAnswer(editingAnswerId.value, editAnswerContent.value)
    answers.value = answers.value.map((a) =>
      a.id === editingAnswerId.value ? { ...a, content: editAnswerContent.value } : a,
    )
    editingAnswerId.value = null
    editAnswerContent.value = ''
  } catch (e) {
    alert(getErrorMessage(e))
  }
}

async function onDeleteAnswer(a: AnswerListItem) {
  if (!confirm('确定删除此回复？')) return
  try {
    await deleteAnswer(a.id)
    answers.value = answers.value.filter((ans) => ans.id !== a.id)
    if (selectedDetail.value) {
      selectedDetail.value = {
        ...selectedDetail.value,
        answer_count: selectedDetail.value.answer_count - 1,
      }
    }
  } catch (e) {
    alert(getErrorMessage(e))
  }
}

// Delete comment
function removeCommentFromList(list: CommentListItem[], commentId: string): CommentListItem[] {
  return list
    .filter((c) => c.id !== commentId)
    .map((c) => ({ ...c, replies: removeCommentFromList(c.replies, commentId) }))
}

async function onDeleteComment(answerId: string, commentId: string) {
  if (!confirm('确定删除此评论？')) return
  try {
    await deleteComment(commentId)
    const comments = answerComments.value[answerId]
    if (comments) {
      answerComments.value[answerId] = removeCommentFromList(comments, commentId)
    }
    answers.value = answers.value.map((a) =>
      a.id === answerId ? { ...a, comment_count: a.comment_count - 1 } : a,
    )
  } catch (e) {
    alert(getErrorMessage(e))
  }
}

// Edit comment
const editingCommentId = ref<string | null>(null)
const editingCommentContent = ref('')

function startEditComment(c: CommentListItem) {
  editingCommentId.value = c.id
  editingCommentContent.value = c.content
}

function cancelEditComment() {
  editingCommentId.value = null
  editingCommentContent.value = ''
}

function editCommentInList(
  list: CommentListItem[],
  commentId: string,
  newContent: string,
): CommentListItem[] {
  return list.map((c) =>
    c.id === commentId
      ? { ...c, content: newContent }
      : { ...c, replies: editCommentInList(c.replies, commentId, newContent) },
  )
}

async function onSaveComment(answerId: string) {
  if (!editingCommentId.value || !editingCommentContent.value.trim()) return
  try {
    const res = await updateComment(editingCommentId.value, editingCommentContent.value)
    const comments = answerComments.value[answerId]
    if (comments) {
      answerComments.value[answerId] = editCommentInList(comments, res.id, res.content)
    }
    cancelEditComment()
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

// Elastic bounce effect
const bounceOffset = ref(0)
let bounceRaf = 0

function onScrollWheel(e: WheelEvent) {
  const el = scrollAreaRef.value
  if (!el) return

  const atTop = el.scrollTop <= 0
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight

  if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
    e.preventDefault()
    bounceOffset.value += e.deltaY * -0.3
    // Clamp
    bounceOffset.value = Math.max(-80, Math.min(80, bounceOffset.value))
    cancelAnimationFrame(bounceRaf)
    bounceRaf = requestAnimationFrame(springBack)
  }
}

function springBack() {
  bounceOffset.value *= 0.85
  if (Math.abs(bounceOffset.value) < 0.5) {
    bounceOffset.value = 0
    return
  }
  bounceRaf = requestAnimationFrame(springBack)
}

const bounceStyle = computed(() =>
  bounceOffset.value ? { transform: `translateY(${bounceOffset.value}px)` } : {},
)

onUnmounted(() => {
  if (observer) observer.disconnect()
  cancelAnimationFrame(bounceRaf)
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
}

/* Board container */
.board-container {
  width: 80%;
  height: 100%;
  align-self: stretch;
  min-height: 0;
}

.board-frame-top,
.board-frame-bottom {
  width: 100%;
  display: block;
  z-index: 1;
  pointer-events: none;
}

.board-scroll-area {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  min-height: 0;
  position: relative;
  padding-top: 5vh;
  padding-bottom: 25vh;
}

.board-scroll-area::-webkit-scrollbar {
  display: none;
}

.board-scroll-inner {
  will-change: transform;
}

/* Notes scatter */
.notes-scatter {
  position: relative;
  width: 100%;
  min-height: 100%;
  background: url('@/assets/images/board_med.png') repeat-y center / 100% auto;
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

.note-card-pro {
  width: 20.8%;
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
  text-align: center;
  align-items: center;
}

.note-content-n2 {
  inset: 19% 12% 14% 12%;
}

.note-content-n3 {
  inset: 19% 12% 14% 12%;
}

.note-content h4 {
  font-size: 17px;
  font-weight: 700;
  color: #3a2a1a;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-content p {
  font-size: 15px;
  color: #5a4a3a;
  line-height: 1.4;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.note-meta {
  font-size: 11px;
  color: #8a7a6a;
  margin-top: auto;
}

/* Avatar styles */
.note-meta-avatar {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  object-fit: cover;
  vertical-align: middle;
  margin-right: 2px;
}

.detail-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.sub-comment-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  object-fit: cover;
  vertical-align: middle;
  margin-right: 2px;
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
  transform: translateY(-100px) scale(1.3);
}

.side-btn:last-child {
  transform: translateY(45px) scale(1.3);
}

.side-btn:first-child:hover {
  transform: translateY(-100px) scale(1.4);
}

.side-btn:last-child:hover {
  transform: translateY(45px) scale(1.4);
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
  text-align: center;
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
  margin-left: auto;
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

.detail-action-right {
  margin-left: auto;
}

.detail-action-danger {
  color: #c0392b !important;
  border-color: rgba(192, 57, 43, 0.3);
}

.detail-action-danger:hover {
  background: rgba(192, 57, 43, 0.1);
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

.icon-comment {
  vertical-align: middle;
  color: #8a7a6a;
}

.icon-collect {
  font-size: 14px;
  color: #8a7a6a;
}

.icon-collect.active {
  color: #e7a84c;
}

/* Comments section */
.comments-section {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
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

.edit-comment-area {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
  margin: 4px 0;
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
.bag-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 14px;
  border-bottom: 1px solid rgba(90, 62, 43, 0.15);
}

.bag-tab {
  flex: 1;
  padding: 8px 0;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 13px;
  font-weight: 600;
  color: #8a7a6a;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.bag-tab.active {
  color: #3a2a1a;
  border-bottom-color: #8a6a4a;
}

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

.channel-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 13px;
  color: #5a4a3a;
  cursor: pointer;
}

.channel-toggle input[type="checkbox"] {
  accent-color: #8a6a4a;
}

.channel-hint {
  font-size: 11px;
  color: #8a7a6a;
}

.detail-manage {
  display: flex;
  gap: 8px;
  margin: 6px 0;
}

.manage-btn {
  font-size: 12px;
  padding: 2px 10px;
  border: 1px solid #c5b8a8;
  border-radius: 4px;
  background: transparent;
  color: #5a4a3a;
  cursor: pointer;
}

.manage-btn-danger {
  color: #c44;
  border-color: #c44;
}

.manage-text-danger {
  color: #c44 !important;
}

.edit-answer-textarea {
  width: 100%;
  font-size: 13px;
  padding: 6px;
  border: 1px solid #c5b8a8;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}
</style>
