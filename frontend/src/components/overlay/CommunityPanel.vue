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
          :class="['channel-tab', { active: channel === 'collections' }]"
          @click="switchChannel('collections')"
        >
          我的收藏
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
              <img :src="getAvatar(q.author)" class="meta-avatar" @error="onAvatarError" />
              <span>{{ q.author.nickname }}</span>
              <span class="author-tag">{{ q.author.display_tag }}</span>
              <span>· {{ q.answer_count }} 回答</span>
              <span class="q-like-action" @click.stop="onLikeQuestion(q)">
                <span :class="['icon-like', { active: q.is_liked }]">&#9829;</span> {{ q.like_count }}
              </span>
              <span class="q-collect-action" @click.stop="onCollectListQuestion(q)">
                <span :class="['icon-collect', { active: q.is_collected }]">{{ q.is_collected ? '&#9733;' : '&#9734;' }}</span> {{ q.collection_count }}
              </span>
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
          <div class="detail-scroll">
            <button class="detail-close" @click="closeDetail">×</button>
            <template v-if="editingQuestion">
              <input v-model="editQuestionData.title" class="compose-input" placeholder="标题" />
              <textarea v-model="editQuestionData.content" class="compose-textarea" rows="6" />
              <div class="edit-actions">
                <button class="edit-cancel-btn" @click="editingQuestion = false">取消</button>
                <button class="edit-save-btn" @click="onSaveQuestion">保存</button>
              </div>
            </template>
            <template v-else>
              <h2 class="detail-title">{{ selectedDetail.title }}</h2>
              <div class="detail-author">
                <img :src="getAvatar(selectedDetail.author)" class="author-avatar" @error="onAvatarError" />
                <span>{{ selectedDetail.author.nickname }}</span>
                <span class="author-tag">{{ selectedDetail.author.display_tag }}</span>
                <span v-if="canModify(selectedDetail.author.id)" class="modify-actions">
                  <button class="modify-btn" @click="startEditQuestion">编辑</button>
                  <button class="modify-btn delete" @click="onDeleteQuestion">删除</button>
                </span>
              </div>
              <div v-if="selectedDetail.tags && selectedDetail.tags.length" class="detail-tags">
                <span v-for="tag in selectedDetail.tags" :key="tag.id" class="q-tag">{{ tag.name }}</span>
              </div>
              <div class="detail-content">{{ selectedDetail.content }}</div>
            </template>

            <div class="detail-actions-bar">
              <button class="detail-action-btn" @click="onLikeDetailQuestion">
                <span :class="['icon-like', { active: selectedDetail.is_liked }]">&#9829;</span>
                <span>{{ selectedDetail.like_count }}</span>
              </button>
              <button class="detail-action-btn" @click="onCollectQuestion">
                <span :class="['icon-collect', { active: selectedDetail.is_collected }]">{{ selectedDetail.is_collected ? '&#9733;' : '&#9734;' }}</span>
                <span>{{ selectedDetail.collection_count }}</span>
              </button>
            </div>

            <div class="answers-section">
              <h3 class="answers-title">回答 ({{ selectedDetail.answer_count }})</h3>
              <div v-if="loadingAnswers" class="loading-state">加载中...</div>
              <div v-for="a in answers" :key="a.id" class="answer-card">
                <div class="answer-author">
                  <img :src="getAvatar(a.author)" class="author-avatar" @error="onAvatarError" />
                  <span>{{ a.author.nickname }}</span>
                  <span class="author-tag">{{ a.author.display_tag }}</span>
                  <span v-if="canModify(a.author.id)" class="modify-actions">
                    <button v-if="editingAnswerId !== a.id" class="modify-btn" @click="startEditAnswer(a)">编辑</button>
                    <button class="modify-btn delete" @click="onDeleteAnswer(a)">删除</button>
                  </span>
                </div>
                <template v-if="editingAnswerId === a.id">
                  <textarea v-model="editAnswerContent" class="compose-textarea" rows="4" />
                  <div class="edit-actions">
                    <button class="edit-cancel-btn" @click="editingAnswerId = null">取消</button>
                    <button class="edit-save-btn" @click="onSaveAnswer">保存</button>
                  </div>
                </template>
                <template v-else>
                  <p class="answer-content">{{ a.content }}</p>
                  <div v-if="a.is_expert_post" class="expert-post-badge">专家帖</div>
                  <div v-if="a.is_expert_post && a.sources" class="expert-sources">
                    <span class="sources-label">来源依据：</span>
                    <span class="sources-text">{{ a.sources }}</span>
                  </div>
                </template>
                <div class="answer-meta">
                  <button class="like-btn" @click="onLikeAnswer(a)">
                    <span :class="['icon-like', { active: a.is_liked }]">&#9829;</span> {{ a.like_count }}
                  </button>
                  <button class="comment-toggle-btn" @click="onToggleComments(a)">
                    评论 ({{ a.comment_count }})
                  </button>
                </div>

                <div v-if="expandedComments[a.id]" class="comments-section">
                  <div v-if="loadingComments[a.id]" class="loading-state comment-loading">加载中...</div>
                  <template v-else>
                    <div v-for="c in commentsMap[a.id] || []" :key="c.id" class="comment-item">
                      <div class="comment-header">
                        <img :src="getAvatar(c.author)" class="comment-avatar" @error="onAvatarError" />
                        <span class="comment-author">{{ c.author.nickname }}</span>
                        <span v-if="c.reply_to_user" class="reply-to">@{{ c.reply_to_user.nickname }}</span>
                      </div>
                      <div class="comment-body">{{ c.content }}</div>
                      <div class="comment-actions">
                        <button class="comment-action-btn" @click="onLikeComment(c)">
                          <span :class="['icon-like', { active: c.is_liked }]">&#9829;</span> {{ c.like_count }}
                        </button>
                        <button class="comment-action-btn" @click="setCommentTarget(a.id, c)">回复</button>
                        <button v-if="canModify(c.author.id)" class="comment-action-btn delete" @click="onDeleteComment(c, a.id)">删除</button>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="reply-area">
            <div v-if="commentTarget" class="reply-target-hint">
              {{ commentTarget.nickname ? `回复 @${commentTarget.nickname}` : '写评论' }}
              <button class="cancel-reply-btn" @click="clearCommentTarget">×</button>
            </div>
            <div v-if="!commentTarget && isCertifiedUser" class="expert-post-controls">
              <label class="expert-checkbox-label">
                <input v-model="isExpertPost" type="checkbox" class="expert-checkbox" />
                <span>发布为专家帖</span>
              </label>
              <input
                v-if="isExpertPost"
                v-model="expertSources"
                class="expert-sources-input"
                placeholder="请填写来源依据（必填）"
              />
            </div>
            <div class="reply-input-row">
              <input
                ref="replyInputRef"
                v-model="replyText"
                class="reply-input"
                :placeholder="commentTarget ? (commentTarget.nickname ? `回复 @${commentTarget.nickname}...` : '写评论...') : '写下你的回答...'"
                @keydown.enter="onSubmitReply"
              />
              <button class="reply-btn" :disabled="!replyText.trim() || (isExpertPost && !commentTarget && !expertSources.trim())" @click="onSubmitReply">发送</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Transition name="toast">
      <div v-if="panelError" class="panel-toast-error">{{ panelError }}</div>
    </Transition>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import avatarDefault from '@/assets/images/avatar.png'
import aiAvatar from '@/assets/images/ai_avatar.png'
import {
  getQuestions,
  getMyCollections,
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
import { useAuthStore } from '@/stores/auth'

const uiStore = useUiStore()
const authStore = useAuthStore()

const channel = ref<'experience' | 'professional' | 'collections'>('experience')
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

function showPanelError(msg: string) {
  panelError.value = msg
  setTimeout(() => {
    panelError.value = ''
  }, 4000)
}

function canModify(authorId: string) {
  return authStore.user?.id === authorId || authStore.user?.is_admin
}

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

async function fetchQuestions(page = 1) {
  if (page === 1) {
    loading.value = true
  } else {
    loadingMore.value = true
  }
  try {
    if (channel.value === 'collections') {
      const res = await getMyCollections({ page, page_size: PAGE_SIZE })
      const items = res.items.map((c) => c.question)
      if (page === 1) {
        questions.value = items
      } else {
        questions.value = [...questions.value, ...items]
      }
      currentPage.value = res.page
      totalPages.value = res.total_pages
    } else {
      const res = await getQuestions({ channel: channel.value, page, page_size: PAGE_SIZE })
      if (page === 1) {
        questions.value = res.items
      } else {
        questions.value = [...questions.value, ...res.items]
      }
      currentPage.value = res.page
      totalPages.value = res.total_pages
    }
  } catch {
    // silent
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function switchChannel(c: 'experience' | 'professional' | 'collections') {
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
  expandedComments.value = {}
  commentsMap.value = {}
  loadingComments.value = {}
  commentTarget.value = null
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
  commentTarget.value = null
  editingQuestion.value = false
  editingAnswerId.value = null
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
      channel: channel.value === 'collections' ? 'experience' : channel.value,
      tag_ids: selectedTagIds.value.length ? selectedTagIds.value : undefined,
    })
    showCompose.value = false
    newPost.value = { title: '', content: '' }
    selectedTagIds.value = []
    await fetchQuestions(1)
  } catch (e) {
    showPanelError(getErrorMessage(e))
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

async function onCollectListQuestion(q: QuestionListItem) {
  try {
    const res = await toggleCollection(q.id, q.is_collected)
    questions.value = questions.value.map((item) =>
      item.id === q.id ? { ...item, is_collected: res.is_collected, collection_count: res.new_count } : item,
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

async function onSubmitReply() {
  if (!replyText.value.trim() || !selectedDetail.value) return
  try {
    if (commentTarget.value) {
      // Posting a comment reply
      const { answerId, parentId } = commentTarget.value
      await createComment(answerId, { content: replyText.value, parent_id: parentId })
      replyText.value = ''
      commentTarget.value = null
      const updated = await getComments(answerId)
      commentsMap.value = { ...commentsMap.value, [answerId]: updated }
      answers.value = answers.value.map((a) =>
        a.id === answerId ? { ...a, comment_count: a.comment_count + 1 } : a,
      )
    } else {
      // Posting an answer
      const options = isExpertPost.value
        ? { is_expert_post: true, sources: expertSources.value }
        : undefined
      await createAnswer(selectedDetail.value.id, replyText.value, options)
      replyText.value = ''
      isExpertPost.value = false
      expertSources.value = ''
      const answerRes = await getAnswers(selectedDetail.value.id, { page: 1, page_size: 50 })
      answers.value = answerRes.items
      selectedDetail.value = {
        ...selectedDetail.value,
        answer_count: selectedDetail.value.answer_count + 1,
      }
    }
  } catch (e) {
    showPanelError(getErrorMessage(e))
  }
}

async function toggleComments(answerId: string) {
  if (expandedComments.value[answerId]) {
    expandedComments.value = { ...expandedComments.value, [answerId]: false }
    return
  }
  expandedComments.value = { ...expandedComments.value, [answerId]: true }
  if (commentsMap.value[answerId]) return
  loadingComments.value = { ...loadingComments.value, [answerId]: true }
  try {
    commentsMap.value = { ...commentsMap.value, [answerId]: await getComments(answerId) }
  } catch {
    commentsMap.value = { ...commentsMap.value, [answerId]: [] }
  } finally {
    loadingComments.value = { ...loadingComments.value, [answerId]: false }
  }
}

function onToggleComments(a: AnswerListItem) {
  toggleComments(a.id)
  commentTarget.value = { answerId: a.id }
  nextTick(() => {
    replyInputRef.value?.focus()
  })
}

async function onLikeComment(c: CommentListItem) {
  try {
    const res = await toggleLike('comment', c.id, c.is_liked)
    for (const [aid, comments] of Object.entries(commentsMap.value)) {
      const idx = comments.findIndex((item) => item.id === c.id)
      if (idx !== -1) {
        const updated = [...comments]
        updated[idx] = { ...updated[idx], is_liked: res.is_liked, like_count: res.new_count }
        commentsMap.value = { ...commentsMap.value, [aid]: updated }
        break
      }
    }
  } catch {
    // silent
  }
}

function setCommentTarget(answerId: string, comment: CommentListItem) {
  commentTarget.value = {
    answerId,
    parentId: comment.id,
    nickname: comment.author.nickname,
  }
  nextTick(() => {
    replyInputRef.value?.focus()
  })
}

function startEditQuestion() {
  if (!selectedDetail.value) return
  editingQuestion.value = true
  editQuestionData.value = { title: selectedDetail.value.title, content: selectedDetail.value.content }
}

async function onSaveQuestion() {
  if (!selectedDetail.value) return
  try {
    await updateQuestion(selectedDetail.value.id, editQuestionData.value)
    selectedDetail.value = {
      ...selectedDetail.value,
      title: editQuestionData.value.title,
      content: editQuestionData.value.content,
    }
    questions.value = questions.value.map((q) =>
      q.id === selectedDetail.value!.id ? { ...q, title: editQuestionData.value.title } : q,
    )
    editingQuestion.value = false
  } catch (e) {
    showPanelError(getErrorMessage(e))
  }
}

async function onDeleteQuestion() {
  if (!selectedDetail.value || !confirm('确定要删除这个问题吗？')) return
  try {
    await deleteQuestion(selectedDetail.value.id)
    questions.value = questions.value.filter((q) => q.id !== selectedDetail.value!.id)
    closeDetail()
  } catch (e) {
    showPanelError(getErrorMessage(e))
  }
}

function startEditAnswer(a: AnswerListItem) {
  editingAnswerId.value = a.id
  editAnswerContent.value = a.content
}

async function onSaveAnswer() {
  if (!editingAnswerId.value) return
  try {
    await updateAnswer(editingAnswerId.value, editAnswerContent.value)
    answers.value = answers.value.map((a) =>
      a.id === editingAnswerId.value ? { ...a, content: editAnswerContent.value } : a,
    )
    editingAnswerId.value = null
    editAnswerContent.value = ''
  } catch (e) {
    showPanelError(getErrorMessage(e))
  }
}

async function onDeleteAnswer(a: AnswerListItem) {
  if (!confirm('确定要删除这个回答吗？')) return
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
    showPanelError(getErrorMessage(e))
  }
}

async function onDeleteComment(c: CommentListItem, answerId: string) {
  if (!confirm('确定要删除这条评论吗？')) return
  try {
    await deleteComment(c.id)
    const updated = (commentsMap.value[answerId] || []).filter((item) => item.id !== c.id)
    commentsMap.value = { ...commentsMap.value, [answerId]: updated }
    answers.value = answers.value.map((a) =>
      a.id === answerId ? { ...a, comment_count: Math.max(0, a.comment_count - 1) } : a,
    )
  } catch (e) {
    showPanelError(getErrorMessage(e))
  }
}

function clearCommentTarget() {
  commentTarget.value = null
}
</script>

<style scoped>
.panel-toast-error {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(220, 53, 69, 0.92);
  color: #fff;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 9999;
  pointer-events: none;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

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

.meta-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 2px;
}

.q-like-action {
  cursor: pointer;
  margin-left: 4px;
  transition: opacity 0.15s;
}

.q-like-action:hover {
  opacity: 0.8;
}

.q-collect-action {
  cursor: pointer;
  margin-left: 4px;
  transition: opacity 0.15s;
}

.q-collect-action:hover {
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
  display: flex;
  flex-direction: column;
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius);
  box-shadow: var(--glass-shadow);
}

.detail-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 28px 24px 0;
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-tag {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(180, 130, 80, 0.15);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(180, 130, 80, 0.8);
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

.comment-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.comment-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-author {
  font-weight: 600;
  color: var(--text-primary);
}

.comment-body {
  color: var(--text-secondary);
  padding-left: 26px;
}

.comment-actions {
  display: flex;
  gap: 12px;
  padding-left: 26px;
  margin-top: 2px;
}

.comment-action-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.comment-action-btn:hover {
  color: var(--text-primary);
}

.comment-text {
  color: var(--text-secondary);
}

.reply-to {
  color: var(--accent-warm);
  font-size: 12px;
}

.reply-target-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--accent-warm);
  margin-bottom: 6px;
}

.cancel-reply-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
}

.icon-like {
  color: var(--text-secondary);
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

.reply-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.reply-input-row {
  display: flex;
  gap: 10px;
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

.expert-post-badge {
  display: inline-block;
  padding: 2px 10px;
  background: rgba(46, 139, 87, 0.15);
  border: 1px solid rgba(46, 139, 87, 0.3);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(46, 180, 100, 0.9);
  margin-bottom: 6px;
}

.expert-sources {
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.04);
  border-left: 3px solid rgba(46, 139, 87, 0.4);
  padding: 6px 12px;
  border-radius: 0 8px 8px 0;
  margin-bottom: 8px;
  line-height: 1.5;
}

.sources-label {
  font-weight: 600;
  color: rgba(46, 180, 100, 0.8);
}

.sources-text {
  white-space: pre-wrap;
}

.expert-post-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 6px;
}

.expert-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(46, 180, 100, 0.9);
  cursor: pointer;
  user-select: none;
}

.expert-checkbox {
  accent-color: rgba(46, 139, 87, 0.8);
  cursor: pointer;
}

.expert-sources-input {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(46, 139, 87, 0.3);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

.expert-sources-input::placeholder {
  color: var(--text-secondary);
}

.modify-actions {
  display: inline-flex;
  gap: 6px;
  margin-left: auto;
}

.modify-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition: all 0.15s;
}

.modify-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.modify-btn.delete {
  color: rgba(231, 76, 94, 0.7);
}

.modify-btn.delete:hover {
  background: rgba(231, 76, 94, 0.1);
  color: #e74c5e;
}

.comment-action-btn.delete {
  color: rgba(231, 76, 94, 0.7);
}

.comment-action-btn.delete:hover {
  color: #e74c5e;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.edit-cancel-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.edit-save-btn {
  padding: 6px 16px;
  background: var(--accent-warm);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .community-panel {
    padding: 24px 16px;
  }

  .panel-title {
    font-size: 20px;
  }

  .channel-tab {
    font-size: 13px;
    padding: 8px 0;
  }

  .question-card {
    padding: 14px;
  }

  .q-meta {
    flex-wrap: wrap;
    gap: 6px;
  }

  .compose-input,
  .compose-textarea,
  .answer-input,
  .reply-input {
    font-size: 16px;
  }
}
</style>
