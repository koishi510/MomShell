<template>
  <div class="dc-tab-content">
    <div class="dc-section-header">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="dc-sh-icon"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path></svg>
      <span class="dc-sh-text">./issue</span>
    </div>

    <div v-if="loading" class="dc-state">
      <div class="dc-spinner"></div>
      <span>正在同步心语工单...</span>
    </div>

    <div v-else-if="sortedTasks.length === 0" class="dc-state">
      <span class="dc-state-icon">等待新情报</span>
      <span>她还没有发来新的心语情报</span>
      <span class="dc-state-copy">去 `./whisper` 看看最近的 AI 解读，或者等她提交新的问卷与心愿。</span>
    </div>

    <TransitionGroup v-else name="card-list" tag="div" class="dc-task-list">
      <DcTaskCard
        v-for="(t, index) in sortedTasks"
        :key="t.id"
        :task="t"
        :index="index"
        :completing="completing === t.id"
        @complete="$emit('complete', $event)"
      />
    </TransitionGroup>

    <p v-if="error" class="dc-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import type { UserTaskItem } from '@/lib/api/task'
import DcTaskCard from './DcTaskCard.vue'

defineProps<{
  sortedTasks: UserTaskItem[]
  loading: boolean
  completing: string
  error: string
}>()

defineEmits<{
  complete: [task: UserTaskItem]
}>()
</script>

<style scoped>
.dc-tab-content {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dc-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding-top: 8px;
  color: var(--dc-accent, #7DCFFF);
}

.dc-sh-icon {
  color: var(--dc-accent, #7DCFFF);
}

.dc-sh-text {
  font-family: var(--dc-font-mono);
  font-size: 13px;
  font-weight: bold;
}

.dc-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  text-align: center;
}

.dc-state-icon {
  font-size: 18px;
  color: var(--dc-accent, #7DCFFF);
}

.dc-state-copy {
  max-width: 360px;
  line-height: 1.7;
}

.dc-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-top-color: var(--dc-accent, #7DCFFF);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.dc-task-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dc-error {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(247, 118, 142, 0.08);
  border-left: 3px solid var(--dc-danger, #F7768E);
  color: var(--dc-danger, #F7768E);
  font-family: var(--dc-font-mono);
  font-size: 12px;
}

.card-list-enter-active { transition: all 0.4s ease-out; }
.card-list-leave-active { transition: all 0.3s ease-in; }
.card-list-enter-from { opacity: 0; transform: translateY(20px); }
.card-list-leave-to { opacity: 0; transform: translateX(-20px); }
.card-list-move { transition: transform 0.3s ease; }
</style>
