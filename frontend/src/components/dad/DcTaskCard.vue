<template>
  <div
    :class="['dc-card', `dc-pri-${task.priority || 'T2'}`, `dc-st-${task.status}`]"
    :style="{ animationDelay: `${index * 0.05}s` }"
  >
    <!-- Card top bar -->
    <div class="dc-card-top">
      <div class="dc-badges">
        <span class="dc-badge dc-id">#{{ task.id.slice(0, 4).toUpperCase() }}</span>
        <span v-if="task.priority === 'T0'" class="dc-badge dc-urgent">[URGENT]</span>
        <span :class="['dc-badge', `dc-pri-badge-${task.priority || 'T2'}`]">{{ priorityLabel(task.priority) }}</span>
        <span class="dc-badge dc-cat">{{ categoryLabel(task.category) }}</span>
      </div>
      <span class="dc-diff">{{ difficultyStars(task.difficulty) }}</span>
    </div>

    <!-- Shell prompt body -->
    <div class="dc-card-body">
      <div class="dc-prompt-line">
        <span class="dc-prompt">$</span>
        <span class="dc-cmd">task.exec</span>(<span class="dc-string">"{{ task.title }}"</span>)
      </div>
      <div v-if="task.description" class="dc-comment-line">
        <span class="dc-comment-marker">#</span> {{ task.description }}
      </div>
    </div>

    <!-- Proof photo -->
    <div v-if="task.proof_photo_url && task.status !== 'pending'" class="dc-proof-wrapper">
      <img class="dc-proof-thumb" :src="task.proof_photo_url" alt="" loading="lazy" />
    </div>

    <!-- Footer -->
    <div class="dc-card-foot">
      <span v-if="task.status === 'pending'" class="dc-status dc-status-pending">STATUS: PENDING</span>
      <span v-else-if="task.status === 'completed'" class="dc-status dc-status-done">STATUS: AWAITING_REVIEW</span>
      <span v-else class="dc-status dc-status-ok">exit: 0&nbsp;&nbsp;score: {{ task.score }}/5</span>
    </div>

    <!-- Execute button -->
    <button
      v-if="task.status === 'pending'"
      class="dc-execute-btn"
      :disabled="completing"
      @click="$emit('complete', task)"
    >
      <span class="btn-text">{{ completing ? 'EXECUTING...' : '> EXECUTE' }}</span>
    </button>

    <!-- Verified feedback -->
    <div v-if="task.comment && task.status === 'verified'" class="dc-feedback-box">
      <div class="dc-feedback-label">KERNEL_FEEDBACK:</div>
      <p class="dc-feedback">"{{ task.comment }}"</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserTaskItem } from '@/lib/api/task'

defineProps<{
  task: UserTaskItem
  index: number
  completing: boolean
}>()

defineEmits<{
  complete: [task: UserTaskItem]
}>()

const categoryLabels: Record<string, string> = { housework: '家务', parenting: '育儿', health: '健康', emotional: '情感' }

function priorityLabel(p?: string): string {
  const v = (p || 'T2').toUpperCase()
  if (v === 'T0') return '紧急'
  if (v === 'T1') return '里程碑'
  return '日常'
}

function categoryLabel(cat: string) { return categoryLabels[cat] || cat }
function difficultyStars(d: number) { return '★'.repeat(d) }
</script>

<style scoped>
.dc-card {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 20px;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  animation: card-enter 0.4s ease-out both;
}

@keyframes card-enter {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.dc-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
}

.dc-card:hover {
  border-color: rgba(125, 211, 252, 0.15);
}

/* Priority left borders */
.dc-card.dc-pri-T0::before {
  background: linear-gradient(180deg, #7dd3fc, #a78bfa, #f0abfc, #67e8f9);
  background-size: 100% 200%;
  animation: iri-shift-v 6s ease-in-out infinite;
}
.dc-card.dc-pri-T1::before { background: #7dd3fc; }
.dc-card.dc-pri-T2::before { background: rgba(125, 211, 252, 0.3); }

/* Status borders */
.dc-card.dc-st-completed { border-color: rgba(251, 191, 36, 0.25); }
.dc-card.dc-st-verified { border-color: rgba(45, 212, 191, 0.25); background: rgba(45, 212, 191, 0.03); }

@keyframes iri-shift-v {
  0%, 100% { background-position: 50% 0%; }
  50% { background-position: 50% 100%; }
}

.dc-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
}

.dc-badges { display: flex; gap: 8px; flex-wrap: wrap; }

.dc-badge {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.dc-id { color: rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.05); }
.dc-urgent { background: rgba(248, 113, 113, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }
.dc-pri-badge-T0 { background: rgba(248, 113, 113, 0.15); color: #f87171; }
.dc-pri-badge-T1 { background: rgba(125, 211, 252, 0.12); color: #7dd3fc; }
.dc-pri-badge-T2 { background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.3); }
.dc-cat { background: transparent; color: rgba(255, 255, 255, 0.3); border: 1px solid rgba(255, 255, 255, 0.06); }
.dc-diff { color: #fbbf24; font-size: 12px; letter-spacing: 2px; }

/* Shell prompt style body */
.dc-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
  font-family: var(--dc-font-mono);
}

.dc-prompt-line {
  font-size: 15px;
  line-height: 1.6;
}

.dc-prompt { color: #7dd3fc; margin-right: 6px; font-weight: 700; }
.dc-cmd { color: #a5d6ff; }
.dc-string { color: #a5d6a7; }

.dc-comment-line {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.3);
  line-height: 1.6;
}

.dc-comment-marker { color: rgba(255, 255, 255, 0.2); margin-right: 6px; }

/* Proof photo */
.dc-proof-wrapper {
  position: relative;
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 16px;
}

.dc-proof-thumb {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  display: block;
  opacity: 0.85;
  transition: opacity 0.3s;
}

.dc-proof-wrapper:hover .dc-proof-thumb { opacity: 1; }

/* Footer */
.dc-card-foot {
  display: flex;
  align-items: center;
  font-family: var(--dc-font-mono);
  font-size: 11px;
}

.dc-status-pending { color: rgba(255, 255, 255, 0.3); }
.dc-status-done { color: #fbbf24; }
.dc-status-ok { color: #2dd4bf; }

/* Execute button */
.dc-execute-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 16px;
  padding: 14px 20px;
  background: transparent;
  border: 1px solid rgba(125, 211, 252, 0.3);
  border-radius: 6px;
  color: #7dd3fc;
  font-family: var(--dc-font-mono);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 1px;
}

.dc-execute-btn:hover:not(:disabled) {
  border-color: #7dd3fc;
  background: rgba(125, 211, 252, 0.08);
  box-shadow: 0 0 20px rgba(125, 211, 252, 0.15);
}

.dc-execute-btn:active:not(:disabled) { transform: scale(0.98); }
.dc-execute-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Feedback */
.dc-feedback-box {
  margin-top: 16px;
  padding: 12px;
  background: rgba(45, 212, 191, 0.05);
  border-left: 2px solid #2dd4bf;
  border-radius: 4px;
}

.dc-feedback-label {
  font-family: var(--dc-font-mono);
  font-size: 10px;
  color: #2dd4bf;
  margin-bottom: 6px;
}

.dc-feedback {
  font-family: var(--dc-font-mono);
  font-size: 13px;
  color: #a5d6a7;
  line-height: 1.5;
  margin: 0;
}

@media (min-width: 769px) {
  .dc-execute-btn { max-width: 300px; margin-left: auto; }
}
</style>
