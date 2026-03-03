<template>
  <OverlayPanel :visible="uiStore.activePanel === 'memory'" position="center" @close="uiStore.closePanel()">
    <div class="memory-panel">
      <h2 class="memory-title">哪段记忆在闪光？</h2>
      <p class="memory-subtitle">请输入或选择记忆砂砾</p>

      <!-- Tags -->
      <div class="tag-section">
        <div v-if="loadingTags" class="loading-state">加载中...</div>
        <div v-else class="tag-cloud">
          <button
            v-for="tag in allTags"
            :key="tag.id"
            :class="['tag-chip', { selected: selectedTag === tag.id }]"
            @click="onSelectTag(tag)"
          >
            {{ tag.content }}
          </button>
          <span v-if="allTags.length === 0" class="empty-hint">暂无标签，可以手动输入</span>
        </div>
      </div>

      <!-- Input -->
      <div class="memory-input-area">
        <input
          v-model="inputText"
          type="text"
          class="memory-input"
          placeholder="输入一段记忆碎片..."
          @keydown.enter="onGenerate"
        />
        <button class="generate-btn" :disabled="generating || (!inputText.trim() && !selectedTag)" @click="onGenerate">
          {{ generating ? '生成中...' : '生成贴纸' }}
        </button>
      </div>

      <!-- Error -->
      <p v-if="error" class="memory-error">{{ error }}</p>

      <!-- Result -->
      <div v-if="result" class="result-card">
        <img v-if="result.cover_image_url" :src="result.cover_image_url" alt="" class="result-img" />
        <h3 class="result-title">{{ result.title }}</h3>
        <p class="result-content">{{ result.content }}</p>
      </div>
    </div>
  </OverlayPanel>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import OverlayPanel from './OverlayPanel.vue'
import { useUiStore } from '@/stores/ui'
import {
  getIdentityTags,
  generateMemoir,
  type IdentityTag,
  type IdentityTagList,
  type Memoir,
} from '@/lib/api/echo'
import { getErrorMessage } from '@/lib/apiClient'

const uiStore = useUiStore()

const tags = ref<IdentityTagList | null>(null)
const loadingTags = ref(false)
const selectedTag = ref<string | null>(null)
const inputText = ref('')
const generating = ref(false)
const result = ref<Memoir | null>(null)
const error = ref('')

const allTags = computed<IdentityTag[]>(() => {
  if (!tags.value) return []
  return [
    ...tags.value.music,
    ...tags.value.sound,
    ...tags.value.literature,
    ...tags.value.memory,
  ]
})

watch(
  () => uiStore.activePanel,
  async (panel) => {
    if (panel === 'memory') {
      loadingTags.value = true
      try {
        tags.value = await getIdentityTags()
      } catch {
        // silent
      } finally {
        loadingTags.value = false
      }
    }
  },
)

function onSelectTag(tag: IdentityTag) {
  if (selectedTag.value === tag.id) {
    selectedTag.value = null
    inputText.value = ''
  } else {
    selectedTag.value = tag.id
    inputText.value = tag.content
  }
}

async function onGenerate() {
  const theme = inputText.value.trim()
  if (!theme && !selectedTag.value) return

  error.value = ''
  generating.value = true
  result.value = null
  try {
    result.value = await generateMemoir(theme || undefined)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    generating.value = false
  }
}
</script>

<style scoped>
.memory-panel {
  padding: 32px 28px 28px;
}

.memory-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 6px;
}

.memory-subtitle {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
}

.tag-section {
  margin-bottom: 20px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.tag-chip {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-chip:hover {
  background: rgba(255, 255, 255, 0.14);
}

.tag-chip.selected {
  background: var(--accent-warm);
  border-color: var(--accent-warm);
  color: #fff;
}

.empty-hint {
  color: var(--text-secondary);
  font-size: 13px;
}

.memory-input-area {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.memory-input {
  flex: 1;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  color: var(--text-primary);
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.memory-input:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.memory-input::placeholder {
  color: var(--text-secondary);
}

.generate-btn {
  padding: 12px 20px;
  background: var(--accent-warm);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.generate-btn:hover { background: var(--accent-warm-hover); }
.generate-btn:active { transform: scale(0.97); }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.memory-error {
  padding: 10px 14px;
  background: rgba(220, 60, 60, 0.15);
  border: 1px solid rgba(220, 60, 60, 0.25);
  border-radius: 10px;
  color: #ff9999;
  font-size: 13px;
  margin-bottom: 16px;
}

.result-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  overflow: hidden;
}

.result-img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
}

.result-title {
  padding: 16px 18px 4px;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.result-content {
  padding: 4px 18px 18px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.loading-state {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
