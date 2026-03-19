<template>
  <div class="dc-tab-content">
    <div class="dc-section-header">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
      <span class="dc-sh-text">./community</span>
    </div>

    <!-- Channel tabs -->
    <div class="dc-chan-tabs dc-float" style="--float-i:0">
      <button :class="['dc-chan-tab', { active: channel === 'experience' }]" @click="switchChannel('experience')">经验交流</button>
      <button :class="['dc-chan-tab', { active: channel === 'professional' }]" @click="switchChannel('professional')">专业支持</button>
      <button :class="['dc-chan-tab', { active: channel === 'mine' }]" @click="switchChannel('mine')">我的</button>
    </div>

    <div v-if="channel === 'mine'" class="dc-sub-tabs dc-float" style="--float-i:1">
      <button :class="['dc-sub-tab', { active: mineSection === 'collections' }]" @click="switchMineSection('collections')">收藏</button>
      <button :class="['dc-sub-tab', { active: mineSection === 'questions' }]" @click="switchMineSection('questions')">提问</button>
      <button :class="['dc-sub-tab', { active: mineSection === 'answers' }]" @click="switchMineSection('answers')">回答</button>
    </div>

    <!-- Create button -->
    <button
      v-if="channel !== 'mine'"
      class="dc-create-btn dc-float"
      :style="{ '--float-i': 1 }"
      @click="openCompose"
    >
      发布问题
    </button>

    <!-- Loading / Empty -->
    <div v-if="loading" class="dc-state dc-float" :style="{ '--float-i': channel === 'mine' ? 3 : 2 }">正在加载内容...</div>
    <div v-else-if="displayedItemCount === 0" class="dc-state dc-float" :style="{ '--float-i': channel === 'mine' ? 3 : 2 }">{{ emptyStateText }}</div>

    <!-- Question list -->
    <template v-else>
      <div v-if="isAnswerView" class="dc-q-list">
        <button
          v-for="(a, i) in myAnswers"
          :key="a.id"
          class="dc-q-card dc-q-card-answer dc-float"
          :style="{ '--float-i': i + 3 }"
          @click="openDetailByQuestionId(a.question_id)"
        >
          <div class="dc-q-tags">
            <span class="dc-badge dc-badge-tag">我的回答</span>
            <span v-if="a.is_expert_post" class="dc-badge dc-badge-expert">专业回答</span>
          </div>
          <div class="dc-q-comment dc-q-answer-preview">{{ a.content_preview || a.content }}</div>
          <div class="dc-q-meta">
            <img :src="getAvatar(a.author)" class="dc-meta-avatar" @error="onAvatarError" alt="" />
            <span>{{ a.author.nickname }}</span>
            <span v-if="a.author.display_tag" class="dc-author-tag">{{ a.author.display_tag }}</span>
            <span class="dc-meta-sep">·</span>
            <span>{{ a.comment_count }} 条评论</span>
            <span class="dc-q-action" @click.stop="onLikeAnswer(a)">
              <svg :class="['icon-like', { active: a.is_liked }]" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg> {{ a.like_count }}
            </span>
          </div>
        </button>
      </div>
      <div v-else class="dc-q-list">
        <button v-for="(q, i) in questions" :key="q.id" class="dc-q-card dc-float" :style="{ '--float-i': i + 2 }" @click="openDetail(q)">
          <div class="dc-q-prompt">{{ q.title }}</div>
          <div v-if="q.content_preview" class="dc-q-comment">{{ q.content_preview }}</div>
          <div v-if="q.tags && q.tags.length" class="dc-q-tags">
            <span v-for="tag in q.tags" :key="tag.id" class="dc-badge dc-badge-tag">{{ tag.name }}</span>
          </div>
          <div class="dc-q-meta">
            <img :src="getAvatar(q.author)" class="dc-meta-avatar" @error="onAvatarError" alt="" />
            <span>{{ q.author.nickname }}</span>
            <span v-if="q.author.display_tag" class="dc-author-tag">{{ q.author.display_tag }}</span>
            <span class="dc-meta-sep">·</span>
            <span>{{ q.answer_count }} 条回答</span>
            <span class="dc-q-action" @click.stop="onLikeQuestion(q)">
              <svg :class="['icon-like', { active: q.is_liked }]" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg> {{ q.like_count }}
            </span>
            <span class="dc-q-action" @click.stop="onCollectListQuestion(q)">
              <svg :class="['icon-collect', { active: q.is_collected }]" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg> {{ q.collection_count }}
            </span>
          </div>
        </button>
      </div>
      <button
        v-if="currentPage < totalPages"
        class="dc-load-more dc-float"
        :style="{ '--float-i': displayedItemCount + (channel === 'mine' ? 3 : 2) }"
        :disabled="loadingMore"
        @click="loadMore"
      >
        {{ loadingMore ? '正在加载...' : '查看更多' }}
      </button>
    </template>

    <!-- Compose overlay -->
    <Transition name="dc-fade">
      <div v-if="showCompose" class="dc-overlay" @click.self="showCompose = false">
        <div class="dc-term-modal">
          <div class="dc-term-modal-header">
            <span>发布问题</span>
            <button class="dc-term-modal-close" @click="showCompose = false">关闭</button>
          </div>
          <form class="dc-term-modal-body" @submit.prevent="onCreatePost">
            <input v-model="newPost.title" class="dc-form-input" placeholder="标题" required />
            <textarea v-model="newPost.content" class="dc-form-input dc-form-textarea" placeholder="描述你的问题..." required rows="4" />
            <div v-if="hotTags.length" class="dc-tag-picker">
              <span class="dc-tag-label">相关标签：</span>
              <div class="dc-tag-chips">
                <button v-for="tag in hotTags" :key="tag.id" type="button" :class="['dc-tag-chip', { selected: selectedTagIds.includes(tag.id) }]" @click="toggleTag(tag.id)">{{ tag.name }}</button>
              </div>
            </div>
            <div class="dc-term-modal-footer">
              <button type="button" class="dc-btn-ghost" @click="showCompose = false">取消</button>
              <button type="submit" class="dc-btn-accent" :disabled="posting">{{ posting ? '发布中...' : '发布' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Detail overlay -->
    <Transition name="dc-fade">
      <div v-if="selectedDetail" class="dc-overlay" @click.self="closeDetail">
        <div class="dc-term-modal dc-term-modal-lg">
          <div class="dc-term-modal-header">
            <span>问题详情</span>
            <button class="dc-term-modal-close" @click="closeDetail">关闭</button>
          </div>
          <div class="dc-detail-scroll">
            <!-- Edit mode -->
            <template v-if="editingQuestion">
              <input v-model="editQuestionData.title" class="dc-form-input" placeholder="标题" />
              <textarea v-model="editQuestionData.content" class="dc-form-input dc-form-textarea" rows="6" />
              <div class="dc-edit-actions">
                <button class="dc-btn-ghost" @click="editingQuestion = false">取消</button>
                <button class="dc-btn-accent" @click="onSaveQuestion">保存</button>
              </div>
            </template>
            <!-- View mode -->
            <template v-else>
              <h2 class="dc-detail-title">{{ selectedDetail.title }}</h2>
              <div class="dc-detail-author">
                <img :src="getAvatar(selectedDetail.author)" class="dc-author-avatar" @error="onAvatarError" alt="" />
                <span>{{ selectedDetail.author.nickname }}</span>
                <span v-if="selectedDetail.author.display_tag" class="dc-author-tag">{{ selectedDetail.author.display_tag }}</span>
                <span v-if="canModify(selectedDetail.author.id)" class="dc-modify-actions">
                  <button class="dc-modify-btn" @click="startEditQuestion">编辑</button>
                  <button class="dc-modify-btn dc-modify-del" @click="onDeleteQuestion">删除</button>
                </span>
              </div>
              <div v-if="selectedDetail.tags && selectedDetail.tags.length" class="dc-detail-tags">
                <span v-for="tag in selectedDetail.tags" :key="tag.id" class="dc-badge dc-badge-tag">{{ tag.name }}</span>
              </div>
              <div class="dc-detail-content">{{ selectedDetail.content }}</div>
            </template>

            <!-- Actions bar -->
            <div class="dc-actions-bar">
              <button class="dc-action-btn" @click="onLikeDetailQuestion">
                <svg :class="['icon-like', { active: selectedDetail.is_liked }]" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg> {{ selectedDetail.like_count }}
              </button>
              <button class="dc-action-btn" @click="onCollectQuestion">
                <svg :class="['icon-collect', { active: selectedDetail.is_collected }]" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg> {{ selectedDetail.collection_count }}
              </button>
            </div>

            <!-- Answers -->
            <div class="dc-answers-section">
              <h3 class="dc-answers-title">回答（{{ selectedDetail.answer_count }}）</h3>
              <div v-if="loadingAnswers" class="dc-state dc-state-sm">正在加载回答...</div>
              <div v-for="a in answers" :key="a.id" class="dc-answer-card">
                <div class="dc-answer-author">
                  <img :src="getAvatar(a.author)" class="dc-author-avatar" @error="onAvatarError" alt="" />
                  <span>{{ a.author.nickname }}</span>
                  <span v-if="a.author.display_tag" class="dc-author-tag">{{ a.author.display_tag }}</span>
                  <span v-if="canModify(a.author.id)" class="dc-modify-actions">
                    <button v-if="editingAnswerId !== a.id" class="dc-modify-btn" @click="startEditAnswer(a)">编辑</button>
                    <button class="dc-modify-btn dc-modify-del" @click="onDeleteAnswer(a)">删除</button>
                  </span>
                </div>
                <template v-if="editingAnswerId === a.id">
                  <textarea v-model="editAnswerContent" class="dc-form-input dc-form-textarea" rows="4" />
                  <div class="dc-edit-actions">
                    <button class="dc-btn-ghost" @click="editingAnswerId = null">取消</button>
                    <button class="dc-btn-accent" @click="onSaveAnswer">保存</button>
                  </div>
                </template>
                <template v-else>
                  <p class="dc-answer-text">{{ a.content }}</p>
                  <div v-if="a.is_expert_post" class="dc-expert-badge">专业回答</div>
                  <div v-if="a.is_expert_post && a.sources" class="dc-expert-sources">
                    <span class="dc-sources-label">依据：</span> {{ a.sources }}
                  </div>
                </template>
                <div class="dc-answer-meta">
                  <button class="dc-like-btn" @click="onLikeAnswer(a)">
                    <svg :class="['icon-like', { active: a.is_liked }]" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg> {{ a.like_count }}
                  </button>
                  <button class="dc-comment-toggle" @click="onToggleComments(a)">
                    评论（{{ a.comment_count }}）
                  </button>
                </div>

                <!-- Comments -->
                <div v-if="expandedComments[a.id]" class="dc-comments-section">
                  <div v-if="loadingComments[a.id]" class="dc-state dc-state-sm">正在加载评论...</div>
                  <template v-else>
                    <div v-for="c in commentsMap[a.id] || []" :key="c.id" class="dc-comment-item">
                      <div class="dc-comment-head">
                        <img :src="getAvatar(c.author)" class="dc-comment-avatar" @error="onAvatarError" alt="" />
                        <span class="dc-comment-author">{{ c.author.nickname }}</span>
                        <span v-if="c.reply_to_user" class="dc-reply-to">@{{ c.reply_to_user.nickname }}</span>
                      </div>
                      <div class="dc-comment-body">{{ c.content }}</div>
                      <div class="dc-comment-actions">
                        <button class="dc-comment-action" @click="onLikeComment(c)">
                          <svg :class="['icon-like', { active: c.is_liked }]" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg> {{ c.like_count }}
                        </button>
                        <button class="dc-comment-action" @click="setCommentTarget(a.id, c)">回复</button>
                        <button v-if="canModify(c.author.id)" class="dc-comment-action dc-comment-del" @click="onDeleteComment(c, a.id)">删除</button>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Reply area -->
          <div class="dc-reply-area">
            <div v-if="commentTarget" class="dc-reply-hint">
              {{ commentTarget.nickname ? `回复 @${commentTarget.nickname}` : '正在评论' }}
              <button class="dc-cancel-reply" @click="clearCommentTarget">取消</button>
            </div>
            <div v-if="!commentTarget && isCertifiedUser" class="dc-expert-controls">
              <label class="dc-expert-label">
                <input v-model="isExpertPost" type="checkbox" class="dc-expert-check" />
                <span>作为专业回答发布</span>
              </label>
              <input v-if="isExpertPost" v-model="expertSources" class="dc-form-input dc-form-sm" placeholder="来源依据（必填）" />
            </div>
            <div class="dc-reply-row">
              <input
                ref="replyInputRef"
                v-model="replyText"
                class="dc-form-input"
                :placeholder="commentTarget ? (commentTarget.nickname ? `回复 @${commentTarget.nickname}...` : '写评论...') : '写下你的回答...'"
                @keydown.enter="onSubmitReply"
              />
              <button class="dc-btn-accent dc-btn-sm" :disabled="!replyText.trim() || (isExpertPost && !commentTarget && !expertSources.trim())" @click="onSubmitReply">发送</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Error toast -->
    <Transition name="dc-toast">
      <div v-if="panelError" class="dc-toast-error">操作失败：{{ panelError }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import avatarDefault from '@/assets/images/avatar.png'
import aiAvatar from '@/assets/images/ai_avatar.png'
import {
  getQuestions,
  getMyCollections,
  getMyQuestions,
  getMyAnswers,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getAnswers,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  getComments,
  createComment,
  deleteComment,
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

const authStore = useAuthStore()

const props = withDefaults(defineProps<{ visible?: boolean }>(), { visible: true })

const channel = ref<'experience' | 'professional' | 'mine'>('experience')
const mineSection = ref<'collections' | 'questions' | 'answers'>('collections')
const questions = ref<QuestionListItem[]>([])
const myAnswers = ref<AnswerListItem[]>([])
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

const expandedComments = ref<Record<string, boolean>>({})
const commentsMap = ref<Record<string, CommentListItem[]>>({})
const loadingComments = ref<Record<string, boolean>>({})
const commentTarget = ref<{ answerId: string; parentId?: string; nickname?: string } | null>(null)
const replyInputRef = ref<HTMLInputElement | null>(null)
const PAGE_SIZE = 15

const editingQuestion = ref(false)
const editQuestionData = ref({ title: '', content: '' })
const editingAnswerId = ref<string | null>(null)
const editAnswerContent = ref('')
const panelError = ref('')
const isExpertPost = ref(false)
const expertSources = ref('')

const isCertifiedUser = computed(() => {
  const role = authStore.user?.role
  return role === 'certified_doctor' || role === 'certified_therapist' || role === 'certified_nurse'
})
const isAnswerView = computed(() => channel.value === 'mine' && mineSection.value === 'answers')
const displayedItemCount = computed(() => isAnswerView.value ? myAnswers.value.length : questions.value.length)
const emptyStateText = computed(() => {
  if (channel.value !== 'mine') return '暂时还没有内容'
  if (mineSection.value === 'collections') return '暂无收藏'
  if (mineSection.value === 'questions') return '暂无提问'
  return '暂无回答'
})

function showPanelError(msg: string) {
  panelError.value = msg
  setTimeout(() => { panelError.value = '' }, 4000)
}

function canModify(authorId: string) {
  return authStore.user?.id === authorId || authStore.user?.is_admin
}

function getAvatar(author: { avatar_url: string | null; role: string }) {
  if (author.role === 'ai_assistant') return aiAvatar
  if (!author.avatar_url) return author.role === 'dad' ? aiAvatar : avatarDefault
  return author.avatar_url
}

function onAvatarError(e: Event) {
  const img = e.target as HTMLImageElement
  if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = avatarDefault }
}

async function fetchQuestions(page = 1) {
  if (page === 1) { loading.value = true } else { loadingMore.value = true }
  try {
    if (channel.value === 'mine') {
      if (mineSection.value === 'collections') {
        const res = await getMyCollections({ page, page_size: PAGE_SIZE })
        const items = res.items.map((c) => c.question)
        questions.value = page === 1 ? items : [...questions.value, ...items]
        if (page === 1) myAnswers.value = []
        currentPage.value = res.page
        totalPages.value = res.total_pages
      } else if (mineSection.value === 'questions') {
        const res = await getMyQuestions({ page, page_size: PAGE_SIZE })
        questions.value = page === 1 ? res.items : [...questions.value, ...res.items]
        if (page === 1) myAnswers.value = []
        currentPage.value = res.page
        totalPages.value = res.total_pages
      } else {
        const res = await getMyAnswers({ page, page_size: PAGE_SIZE })
        myAnswers.value = page === 1 ? res.items : [...myAnswers.value, ...res.items]
        if (page === 1) questions.value = []
        currentPage.value = res.page
        totalPages.value = res.total_pages
      }
    } else {
      const res = await getQuestions({ channel: channel.value, page, page_size: PAGE_SIZE })
      questions.value = page === 1 ? res.items : [...questions.value, ...res.items]
      if (page === 1) myAnswers.value = []
      currentPage.value = res.page
      totalPages.value = res.total_pages
    }
  } catch { /* silent */ }
  finally { loading.value = false; loadingMore.value = false }
}

function switchChannel(c: 'experience' | 'professional' | 'mine') {
  if (channel.value === c) return
  channel.value = c
  currentPage.value = 1
  totalPages.value = 1
  fetchQuestions(1)
}

function switchMineSection(section: 'collections' | 'questions' | 'answers') {
  if (mineSection.value === section) return
  mineSection.value = section
  currentPage.value = 1
  totalPages.value = 1
  fetchQuestions(1)
}

function loadMore() { fetchQuestions(currentPage.value + 1) }

watch(() => props.visible, (active) => { if (active) fetchQuestions(1) }, { immediate: true })

async function openDetail(q: QuestionListItem) {
  await openDetailByQuestionId(q.id)
}

async function openDetailByQuestionId(questionId: string) {
  selectedDetail.value = null; answers.value = []; expandedComments.value = {}; commentsMap.value = {}; loadingComments.value = {}; commentTarget.value = null
  try {
    const [detail, answerRes] = await Promise.all([getQuestion(questionId), getAnswers(questionId, { page: 1, page_size: 50 })])
    selectedDetail.value = detail; answers.value = answerRes.items
  } catch { /* silent */ }
}

function closeDetail() {
  selectedDetail.value = null; answers.value = []; replyText.value = ''; commentTarget.value = null; editingQuestion.value = false; editingAnswerId.value = null
}

async function openCompose() {
  showCompose.value = true; newPost.value = { title: '', content: '' }; selectedTagIds.value = []
  try { hotTags.value = await getHotTags() } catch { hotTags.value = [] }
}

function toggleTag(tagId: string) {
  const idx = selectedTagIds.value.indexOf(tagId)
  selectedTagIds.value = idx === -1 ? [...selectedTagIds.value, tagId] : selectedTagIds.value.filter((id) => id !== tagId)
}

async function onCreatePost() {
  posting.value = true
  try {
    await createQuestion({
      title: newPost.value.title,
      content: newPost.value.content,
      channel: channel.value === 'professional' ? 'professional' : 'experience',
      tag_ids: selectedTagIds.value.length ? selectedTagIds.value : undefined,
    })
    showCompose.value = false; newPost.value = { title: '', content: '' }; selectedTagIds.value = []; await fetchQuestions(1)
  } catch (e) { showPanelError(getErrorMessage(e)) }
  finally { posting.value = false }
}

async function onLikeQuestion(q: QuestionListItem) {
  try {
    const res = await toggleLike('question', q.id, q.is_liked)
    questions.value = questions.value.map((item) => item.id === q.id ? { ...item, is_liked: res.is_liked, like_count: res.new_count } : item)
  } catch { /* silent */ }
}

async function onCollectListQuestion(q: QuestionListItem) {
  try {
    const res = await toggleCollection(q.id, q.is_collected)
    const shouldRemove = channel.value === 'mine' && mineSection.value === 'collections' && !res.is_collected
    questions.value = shouldRemove
      ? questions.value.filter((item) => item.id !== q.id)
      : questions.value.map((item) => item.id === q.id ? { ...item, is_collected: res.is_collected, collection_count: res.new_count } : item)
  } catch { /* silent */ }
}

async function onLikeDetailQuestion() {
  if (!selectedDetail.value) return
  try {
    const res = await toggleLike('question', selectedDetail.value.id, selectedDetail.value.is_liked)
    selectedDetail.value = { ...selectedDetail.value, is_liked: res.is_liked, like_count: res.new_count }
    questions.value = questions.value.map((item) => item.id === selectedDetail.value!.id ? { ...item, is_liked: res.is_liked, like_count: res.new_count } : item)
  } catch { /* silent */ }
}

async function onCollectQuestion() {
  if (!selectedDetail.value) return
  try {
    const res = await toggleCollection(selectedDetail.value.id, selectedDetail.value.is_collected)
    selectedDetail.value = { ...selectedDetail.value, is_collected: res.is_collected, collection_count: res.new_count }
    const shouldRemove = channel.value === 'mine' && mineSection.value === 'collections' && !res.is_collected
    questions.value = shouldRemove
      ? questions.value.filter((item) => item.id !== selectedDetail.value!.id)
      : questions.value.map((item) => item.id === selectedDetail.value!.id ? { ...item, is_collected: res.is_collected, collection_count: res.new_count } : item)
  } catch { /* silent */ }
}

async function onLikeAnswer(a: AnswerListItem) {
  try {
    const res = await toggleLike('answer', a.id, a.is_liked)
    answers.value = answers.value.map((ans) => ans.id === a.id ? { ...ans, is_liked: res.is_liked, like_count: res.new_count } : ans)
    myAnswers.value = myAnswers.value.map((ans) => ans.id === a.id ? { ...ans, is_liked: res.is_liked, like_count: res.new_count } : ans)
  } catch { /* silent */ }
}

async function onSubmitReply() {
  if (!replyText.value.trim() || !selectedDetail.value) return
  try {
    if (commentTarget.value) {
      const { answerId, parentId } = commentTarget.value
      await createComment(answerId, { content: replyText.value, parent_id: parentId })
      replyText.value = ''; commentTarget.value = null
      const updated = await getComments(answerId)
      commentsMap.value = { ...commentsMap.value, [answerId]: updated }
      answers.value = answers.value.map((a) => a.id === answerId ? { ...a, comment_count: a.comment_count + 1 } : a)
    } else {
      const options = isExpertPost.value ? { is_expert_post: true, sources: expertSources.value } : undefined
      await createAnswer(selectedDetail.value.id, replyText.value, options)
      replyText.value = ''; isExpertPost.value = false; expertSources.value = ''
      const answerRes = await getAnswers(selectedDetail.value.id, { page: 1, page_size: 50 })
      answers.value = answerRes.items
      selectedDetail.value = { ...selectedDetail.value, answer_count: selectedDetail.value.answer_count + 1 }
    }
  } catch (e) { showPanelError(getErrorMessage(e)) }
}

async function toggleComments(answerId: string) {
  if (expandedComments.value[answerId]) { expandedComments.value = { ...expandedComments.value, [answerId]: false }; return }
  expandedComments.value = { ...expandedComments.value, [answerId]: true }
  if (commentsMap.value[answerId]) return
  loadingComments.value = { ...loadingComments.value, [answerId]: true }
  try { commentsMap.value = { ...commentsMap.value, [answerId]: await getComments(answerId) } }
  catch { commentsMap.value = { ...commentsMap.value, [answerId]: [] } }
  finally { loadingComments.value = { ...loadingComments.value, [answerId]: false } }
}

function onToggleComments(a: AnswerListItem) {
  toggleComments(a.id)
  commentTarget.value = { answerId: a.id }
  nextTick(() => { replyInputRef.value?.focus() })
}

async function onLikeComment(c: CommentListItem) {
  try {
    const res = await toggleLike('comment', c.id, c.is_liked)
    for (const [aid, comments] of Object.entries(commentsMap.value)) {
      const idx = comments.findIndex((item) => item.id === c.id)
      if (idx !== -1) {
        const updated = [...comments]; updated[idx] = { ...updated[idx], is_liked: res.is_liked, like_count: res.new_count }
        commentsMap.value = { ...commentsMap.value, [aid]: updated }; break
      }
    }
  } catch { /* silent */ }
}

function setCommentTarget(answerId: string, comment: CommentListItem) {
  commentTarget.value = { answerId, parentId: comment.id, nickname: comment.author.nickname }
  nextTick(() => { replyInputRef.value?.focus() })
}

function startEditQuestion() {
  if (!selectedDetail.value) return
  editingQuestion.value = true; editQuestionData.value = { title: selectedDetail.value.title, content: selectedDetail.value.content }
}

async function onSaveQuestion() {
  if (!selectedDetail.value) return
  try {
    await updateQuestion(selectedDetail.value.id, editQuestionData.value)
    selectedDetail.value = { ...selectedDetail.value, title: editQuestionData.value.title, content: editQuestionData.value.content }
    questions.value = questions.value.map((q) => q.id === selectedDetail.value!.id ? { ...q, title: editQuestionData.value.title } : q)
    editingQuestion.value = false
  } catch (e) { showPanelError(getErrorMessage(e)) }
}

async function onDeleteQuestion() {
  if (!selectedDetail.value || !confirm('确定要删除这个问题吗？')) return
  try { await deleteQuestion(selectedDetail.value.id); questions.value = questions.value.filter((q) => q.id !== selectedDetail.value!.id); closeDetail() }
  catch (e) { showPanelError(getErrorMessage(e)) }
}

function startEditAnswer(a: AnswerListItem) { editingAnswerId.value = a.id; editAnswerContent.value = a.content }

async function onSaveAnswer() {
  if (!editingAnswerId.value) return
  try {
    await updateAnswer(editingAnswerId.value, editAnswerContent.value)
    answers.value = answers.value.map((a) => a.id === editingAnswerId.value ? { ...a, content: editAnswerContent.value } : a)
    myAnswers.value = myAnswers.value.map((a) => a.id === editingAnswerId.value ? { ...a, content: editAnswerContent.value, content_preview: editAnswerContent.value } : a)
    editingAnswerId.value = null; editAnswerContent.value = ''
  } catch (e) { showPanelError(getErrorMessage(e)) }
}

async function onDeleteAnswer(a: AnswerListItem) {
  if (!confirm('确定要删除这个回答吗？')) return
  try {
    await deleteAnswer(a.id); answers.value = answers.value.filter((ans) => ans.id !== a.id)
    myAnswers.value = myAnswers.value.filter((ans) => ans.id !== a.id)
    if (selectedDetail.value) { selectedDetail.value = { ...selectedDetail.value, answer_count: selectedDetail.value.answer_count - 1 } }
  } catch (e) { showPanelError(getErrorMessage(e)) }
}

async function onDeleteComment(c: CommentListItem, answerId: string) {
  if (!confirm('确定要删除这条评论吗？')) return
  try {
    await deleteComment(c.id)
    commentsMap.value = { ...commentsMap.value, [answerId]: (commentsMap.value[answerId] || []).filter((item) => item.id !== c.id) }
    answers.value = answers.value.map((a) => a.id === answerId ? { ...a, comment_count: Math.max(0, a.comment_count - 1) } : a)
  } catch (e) { showPanelError(getErrorMessage(e)) }
}

function clearCommentTarget() { commentTarget.value = null }
</script>

<style scoped>
.dc-tab-content { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.dc-float { animation: floatUp 0.4s ease-out both; animation-delay: calc(var(--float-i, 0) * 0.06s); }
@keyframes floatUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

.dc-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-top: 8px; color: var(--dc-accent, #7DCFFF); }
.dc-sh-icon { color: var(--dc-accent, #7DCFFF); }
.dc-sh-text { font-family: var(--dc-font-mono); font-size: 13px; font-weight: bold; }
.dc-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px 20px; color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 13px; }
.dc-state-sm { padding: 20px 16px; }

/* Channel tabs */
.dc-chan-tabs {
  display: flex; gap: 2px; margin-bottom: 16px; padding: 2px;
  background: var(--dc-surface, rgba(255,255,255,0.03)); border: 1px solid var(--dc-border, rgba(255,255,255,0.06)); border-radius: var(--dc-radius, 2px);
}
.dc-chan-tab {
  flex: 1; padding: 8px 0; background: transparent; border: none; border-radius: var(--dc-radius, 2px);
  color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 12px; cursor: pointer; transition: all 0.2s;
}
.dc-chan-tab.active { background: rgba(125,207,255,0.1); color: var(--dc-accent, #7DCFFF); }
.dc-chan-tab:hover:not(.active) { color: var(--dc-text, #C0CAF5); }

.dc-sub-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.dc-sub-tab {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--dc-border, rgba(255,255,255,0.06));
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.dc-sub-tab.active {
  border-color: rgba(125,207,255,0.3);
  background: rgba(125,207,255,0.08);
  color: var(--dc-accent, #7DCFFF);
}

.dc-sub-tab:hover:not(.active) { color: var(--dc-text, #C0CAF5); }

.dc-create-btn {
  width: 100%; padding: 10px; background: transparent; border: 1px dashed var(--dc-border, rgba(255,255,255,0.15));
  border-radius: var(--dc-radius, 2px); color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 13px;
  cursor: pointer; transition: all 0.2s; margin-bottom: 16px;
}
.dc-create-btn:hover { border-color: rgba(125,207,255,0.3); color: var(--dc-accent, #7DCFFF); }

/* Question cards */
.dc-q-list { display: flex; flex-direction: column; gap: 8px; }
.dc-q-card {
  text-align: left; padding: 16px; background: var(--dc-surface, rgba(255,255,255,0.03));
  border: 1px solid var(--dc-border, rgba(255,255,255,0.06)); border-radius: var(--dc-radius, 2px);
  cursor: pointer; transition: all 0.2s;
}
.dc-q-card:hover { border-color: rgba(125,207,255,0.15); }

.dc-q-prompt { font-family: var(--dc-font-mono); font-size: 14px; line-height: 1.6; margin-bottom: 4px; color: var(--dc-text, #C0CAF5); font-weight: 600; }
.dc-prompt { color: var(--dc-accent, #7DCFFF); font-weight: 700; margin-right: 4px; }
.dc-string { color: var(--dc-string, #9ECE6A); }
.dc-q-comment { font-family: var(--dc-font-mono); font-size: 12px; color: var(--dc-comment, #565F89); line-height: 1.5; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.dc-comment-marker { color: var(--dc-comment, rgba(255,255,255,0.2)); margin-right: 4px; }

.dc-q-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.dc-badge { font-family: var(--dc-font-mono); font-size: 10px; padding: 2px 6px; border-radius: var(--dc-radius, 2px); letter-spacing: 0.5px; }
.dc-badge-tag { background: var(--dc-surface, rgba(255,255,255,0.05)); color: var(--dc-comment, #565F89); border: 1px solid var(--dc-border, rgba(255,255,255,0.06)); }
.dc-badge-expert { background: rgba(158,206,106,0.1); color: var(--dc-success, #9ECE6A); border: 1px solid rgba(158,206,106,0.25); }
.dc-q-card-answer { display: flex; flex-direction: column; gap: 8px; }
.dc-q-answer-preview { -webkit-line-clamp: 3; margin-bottom: 0; }

.dc-q-meta { font-family: var(--dc-font-mono); font-size: 11px; color: var(--dc-comment, #565F89); display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.dc-meta-avatar { width: 16px; height: 16px; border-radius: 50%; object-fit: cover; margin-right: 2px; }
.dc-meta-sep { opacity: 0.5; }
.dc-author-tag { padding: 1px 5px; background: rgba(255,158,100,0.12); border-radius: var(--dc-radius, 2px); font-size: 10px; color: var(--dc-warn, #FF9E64); margin-left: 2px; }

.dc-q-action { cursor: pointer; margin-left: 4px; transition: opacity 0.15s; display: inline-flex; align-items: center; gap: 3px; }
.dc-q-action:hover { opacity: 0.8; }
.icon-like { color: var(--dc-comment, #565F89); transition: color 0.15s; vertical-align: middle; }
.icon-like.active { color: #e74c5e; }
.icon-collect { color: var(--dc-comment, #565F89); transition: color 0.15s; vertical-align: middle; }
.icon-collect.active { color: #e7a84c; }

.dc-load-more {
  display: block; width: 100%; margin-top: 12px; padding: 10px; background: transparent;
  border: 1px solid var(--dc-border, rgba(255,255,255,0.06)); border-radius: var(--dc-radius, 2px);
  color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 12px; cursor: pointer; transition: all 0.2s;
}
.dc-load-more:hover:not(:disabled) { border-color: rgba(125,207,255,0.2); color: var(--dc-accent, #7DCFFF); }
.dc-load-more:disabled { opacity: 0.5; cursor: default; }

/* Overlays */
.dc-overlay {
  position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center;
  background: rgba(26,27,38,0.9); padding: 20px;
}

.dc-term-modal {
  width: 100%; max-width: 500px; background: var(--dc-bg2, #24283B);
  border: 1px solid var(--dc-border, rgba(255,255,255,0.15)); border-radius: var(--dc-radius, 2px);
  overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.dc-term-modal-lg { max-width: 560px; max-height: 85vh; }

.dc-term-modal-header {
  display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;
  background: var(--dc-bg, #1A1B26); border-bottom: 1px solid var(--dc-border, rgba(255,255,255,0.15));
  font-family: var(--dc-font-mono); font-size: 12px; color: var(--dc-comment, #565F89);
}
.dc-term-modal-close { background: transparent; border: none; color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 14px; cursor: pointer; }
.dc-term-modal-close:hover { color: var(--dc-text, #C0CAF5); }

.dc-term-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.dc-term-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

.dc-form-input {
  width: 100%; padding: 10px 12px; background: var(--dc-bg, #1A1B26); border: 1px solid var(--dc-border, rgba(255,255,255,0.15));
  border-radius: var(--dc-radius, 2px); color: var(--dc-text, #C0CAF5); font-family: var(--dc-font-mono); font-size: 13px; outline: none; transition: border-color 0.2s;
}
.dc-form-input:focus { border-color: rgba(125,207,255,0.3); }
.dc-form-input::placeholder { color: var(--dc-comment, #565F89); }
.dc-form-textarea { resize: vertical; line-height: 1.6; }
.dc-form-sm { font-size: 12px; padding: 6px 10px; }

.dc-btn-ghost { padding: 8px 16px; background: transparent; border: 1px solid transparent; border-radius: var(--dc-radius, 2px); color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 12px; cursor: pointer; }
.dc-btn-ghost:hover { color: var(--dc-text, #C0CAF5); }
.dc-btn-accent { padding: 8px 16px; background: transparent; border: 1px solid rgba(125,207,255,0.3); border-radius: var(--dc-radius, 2px); color: var(--dc-accent, #7DCFFF); font-family: var(--dc-font-mono); font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.dc-btn-accent:hover:not(:disabled) { background: rgba(125,207,255,0.08); border-color: var(--dc-accent, #7DCFFF); }
.dc-btn-accent:disabled { opacity: 0.5; cursor: not-allowed; }
.dc-btn-sm { padding: 8px 12px; }

/* Tag picker */
.dc-tag-picker { display: flex; flex-direction: column; gap: 6px; }
.dc-tag-label { font-family: var(--dc-font-mono); font-size: 11px; color: var(--dc-comment, #565F89); }
.dc-tag-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dc-tag-chip {
  padding: 4px 10px; background: var(--dc-surface, rgba(255,255,255,0.03)); border: 1px solid var(--dc-border, rgba(255,255,255,0.06));
  border-radius: var(--dc-radius, 2px); color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 11px; cursor: pointer; transition: all 0.2s;
}
.dc-tag-chip.selected { background: rgba(125,207,255,0.1); border-color: var(--dc-accent, #7DCFFF); color: var(--dc-accent, #7DCFFF); }

/* Detail */
.dc-detail-scroll { flex: 1; overflow-y: auto; padding: 20px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
.dc-detail-title { font-family: var(--dc-font-mono); font-size: 18px; font-weight: 600; color: var(--dc-text, #C0CAF5); margin: 0 0 8px; padding-right: 24px; }
.dc-detail-author { font-family: var(--dc-font-mono); font-size: 12px; color: var(--dc-comment, #565F89); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.dc-author-avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }
.dc-detail-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.dc-detail-content { font-family: var(--dc-font-mono); font-size: 13px; color: var(--dc-text, #C0CAF5); line-height: 1.7; padding-bottom: 16px; border-bottom: 1px solid var(--dc-border, rgba(255,255,255,0.06)); margin-bottom: 12px; white-space: pre-wrap; }

.dc-actions-bar { display: flex; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid var(--dc-border, rgba(255,255,255,0.06)); margin-bottom: 16px; }
.dc-action-btn {
  display: flex; align-items: center; gap: 6px; padding: 6px 12px;
  background: var(--dc-surface, rgba(255,255,255,0.03)); border: 1px solid var(--dc-border, rgba(255,255,255,0.06));
  border-radius: var(--dc-radius, 2px); color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 12px; cursor: pointer; transition: all 0.2s;
}
.dc-action-btn:hover { border-color: rgba(125,207,255,0.15); }

/* Answers */
.dc-answers-title { font-family: var(--dc-font-mono); font-size: 13px; color: var(--dc-accent, #7DCFFF); margin: 0 0 12px; }
.dc-answer-card { padding: 12px 0; border-bottom: 1px solid var(--dc-border, rgba(255,255,255,0.04)); }
.dc-answer-author { font-family: var(--dc-font-mono); font-size: 12px; color: var(--dc-text, #C0CAF5); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.dc-answer-text { font-family: var(--dc-font-mono); font-size: 13px; color: var(--dc-comment, #565F89); line-height: 1.6; margin: 0 0 8px; }
.dc-answer-meta { display: flex; gap: 12px; }
.dc-like-btn { background: none; border: none; color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 12px; cursor: pointer; padding: 0; }
.dc-comment-toggle { background: none; border: none; color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 12px; cursor: pointer; padding: 0; transition: color 0.15s; }
.dc-comment-toggle:hover { color: var(--dc-text, #C0CAF5); }

.dc-expert-badge { display: inline-block; padding: 2px 6px; background: rgba(158,206,106,0.1); border: 1px solid rgba(158,206,106,0.25); border-radius: var(--dc-radius, 2px); font-family: var(--dc-font-mono); font-size: 10px; color: var(--dc-success, #9ECE6A); margin-bottom: 6px; }
.dc-expert-sources { font-family: var(--dc-font-mono); font-size: 11px; color: var(--dc-comment, #565F89); background: var(--dc-surface, rgba(255,255,255,0.02)); border-left: 2px solid rgba(158,206,106,0.3); padding: 4px 10px; border-radius: 0 2px 2px 0; margin-bottom: 8px; line-height: 1.5; }
.dc-sources-label { color: var(--dc-success, #9ECE6A); font-weight: 600; }

/* Comments */
.dc-comments-section { margin-top: 8px; padding-left: 12px; border-left: 2px solid var(--dc-border, rgba(255,255,255,0.06)); }
.dc-comment-item { padding: 6px 0; font-size: 12px; line-height: 1.5; }
.dc-comment-head { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.dc-comment-avatar { width: 16px; height: 16px; border-radius: 50%; object-fit: cover; }
.dc-comment-author { font-family: var(--dc-font-mono); font-weight: 600; color: var(--dc-text, #C0CAF5); font-size: 11px; }
.dc-comment-body { font-family: var(--dc-font-mono); color: var(--dc-comment, #565F89); padding-left: 22px; font-size: 12px; }
.dc-comment-actions { display: flex; gap: 10px; padding-left: 22px; margin-top: 2px; }
.dc-comment-action { background: none; border: none; color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 11px; cursor: pointer; padding: 0; transition: color 0.15s; }
.dc-comment-action:hover { color: var(--dc-text, #C0CAF5); }
.dc-comment-del { color: rgba(247,118,142,0.7); }
.dc-comment-del:hover { color: var(--dc-danger, #F7768E); }
.dc-reply-to { font-family: var(--dc-font-mono); color: var(--dc-accent, #7DCFFF); font-size: 11px; }

/* Modify actions */
.dc-modify-actions { display: inline-flex; gap: 4px; margin-left: auto; }
.dc-modify-btn { background: none; border: none; color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 11px; cursor: pointer; padding: 2px 4px; transition: color 0.15s; }
.dc-modify-btn:hover { color: var(--dc-text, #C0CAF5); }
.dc-modify-del { color: rgba(247,118,142,0.7); }
.dc-modify-del:hover { color: var(--dc-danger, #F7768E); }

.dc-edit-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }

/* Reply area */
.dc-reply-area { display: flex; flex-direction: column; gap: 6px; padding: 12px 20px; border-top: 1px solid var(--dc-border, rgba(255,255,255,0.06)); flex-shrink: 0; }
.dc-reply-hint { display: flex; align-items: center; gap: 6px; font-family: var(--dc-font-mono); font-size: 11px; color: var(--dc-accent, #7DCFFF); }
.dc-cancel-reply { background: none; border: none; color: var(--dc-comment, #565F89); font-family: var(--dc-font-mono); font-size: 12px; cursor: pointer; padding: 0; }
.dc-reply-row { display: flex; gap: 8px; }

.dc-expert-controls { display: flex; flex-direction: column; gap: 6px; }
.dc-expert-label { display: flex; align-items: center; gap: 6px; font-family: var(--dc-font-mono); font-size: 11px; color: var(--dc-success, #9ECE6A); cursor: pointer; }
.dc-expert-check { accent-color: var(--dc-success, #9ECE6A); cursor: pointer; }

/* Transitions */
.dc-fade-enter-active, .dc-fade-leave-active { transition: opacity 0.3s ease; }
.dc-fade-enter-from, .dc-fade-leave-to { opacity: 0; }
.dc-fade-enter-active .dc-term-modal { transition: transform 0.3s ease; }
.dc-fade-enter-from .dc-term-modal { transform: translateY(20px); }

/* Toast */
.dc-toast-error {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: rgba(247,118,142,0.9); color: #fff; padding: 8px 20px; border-radius: var(--dc-radius, 2px);
  font-family: var(--dc-font-mono); font-size: 12px; z-index: 9999; pointer-events: none;
}
.dc-toast-enter-active, .dc-toast-leave-active { transition: opacity 0.3s, transform 0.3s; }
.dc-toast-enter-from, .dc-toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>
