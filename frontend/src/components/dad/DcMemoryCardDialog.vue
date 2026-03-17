<template>
  <Transition name="dc-fade">
    <div v-if="visible" class="dc-dialog-backdrop" @click.self="$emit('close')">
      <div class="dc-term-modal">
        <div class="dc-term-modal-header">
          <span>SYS.UPLOAD_MEMORY</span>
          <button class="dc-term-modal-close" @click="$emit('close')">[×]</button>
        </div>
        <div class="dc-term-modal-body">
          <h3 class="dc-dialog-title">CREATE_MEMORY_FRAGMENT</h3>
          <p v-if="targetTitle" class="dc-dialog-sub">TARGET: {{ targetTitle }}</p>

          <!-- Card image preview -->
          <div v-if="previewUrl" class="dc-card-preview">
            <img :src="previewUrl" alt="" class="dc-card-img" />
          </div>

          <!-- Creation options -->
          <div v-if="!previewUrl" class="dc-card-options">
            <button
              class="dc-action-btn dc-action-btn-iri"
              :disabled="generating || uploading"
              @click="$emit('generate')"
            >
              {{ generating ? '> synthesizing...' : '> ai_synthesis' }}
            </button>
            <label class="dc-proof-picker">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                class="dc-proof-input"
                :disabled="generating || uploading"
                @change="$emit('upload', $event)"
              />
              <span class="dc-action-btn dc-action-btn-outline">> upload_data</span>
            </label>
          </div>

          <!-- Replace after preview -->
          <div v-else class="dc-card-replace">
            <button class="dc-action-btn dc-btn-sm dc-action-btn-ghost" :disabled="generating || uploading" @click="$emit('reset')">> reset</button>
          </div>

          <p v-if="error" class="dc-error">> ERROR: {{ error }}</p>
        </div>

        <div class="dc-term-modal-footer">
          <button class="dc-action-btn dc-action-btn-ghost" :disabled="uploading || generating" @click="$emit('close')">cancel</button>
          <button class="dc-action-btn dc-action-btn-outline" :disabled="uploading || generating || !targetTitle" @click="$emit('submit-without-card')">bypass</button>
          <button
            class="dc-action-btn"
            :disabled="uploading || generating || !targetTitle || !previewUrl"
            @click="$emit('submit-with-card')"
          >
            {{ uploading ? 'transmitting...' : 'commit' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  targetTitle: string
  previewUrl: string
  generating: boolean
  uploading: boolean
  error: string
}>()

defineEmits<{
  close: []
  generate: []
  upload: [event: Event]
  reset: []
  'submit-without-card': []
  'submit-with-card': []
}>()
</script>

<style scoped>
.dc-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 27, 38, 0.9);
  padding: 20px;
}

.dc-term-modal {
  width: 100%;
  max-width: 500px;
  background: var(--dc-bg2, #24283B);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.dc-term-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--dc-bg, #1A1B26);
  border-bottom: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  font-family: var(--dc-font-mono);
  font-size: 12px;
  color: var(--dc-comment, #565F89);
}

.dc-term-modal-close {
  background: transparent;
  border: none;
  color: var(--dc-comment, #565F89);
  font-family: var(--dc-font-mono);
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
}
.dc-term-modal-close:hover { color: var(--dc-text, #C0CAF5); }

.dc-term-modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: 70vh;
}

.dc-dialog-title {
  margin: 0 0 8px;
  font-family: var(--dc-font-mono);
  font-size: 16px;
  color: var(--dc-text, #C0CAF5);
}

.dc-dialog-sub { margin: 0 0 24px; font-family: var(--dc-font-mono); font-size: 12px; color: var(--dc-comment, #565F89); }

.dc-card-preview { position: relative; border-radius: var(--dc-radius, 2px); overflow: hidden; border: 1px solid var(--dc-border, rgba(255,255,255,0.15)); margin-bottom: 20px; }
.dc-card-img { width: 100%; display: block; max-height: 300px; object-fit: cover; }
.dc-card-options { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.dc-proof-picker { width: 100%; cursor: pointer; display: block; }
.dc-proof-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.dc-card-replace { margin-bottom: 16px; display: flex; justify-content: flex-end; }

.dc-term-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: var(--dc-bg, #1A1B26);
  border-top: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
}

.dc-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px;
  background: var(--dc-bg2, #24283B);
  border: 1px solid var(--dc-border, rgba(255, 255, 255, 0.15));
  border-radius: var(--dc-radius, 2px);
  color: var(--dc-text, #C0CAF5);
  font-family: var(--dc-font-mono);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 1px;
}

.dc-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dc-action-btn-outline { border-color: var(--dc-accent, #7DCFFF); color: var(--dc-accent, #7DCFFF); background: transparent; }
.dc-action-btn-outline:hover:not(:disabled) { background: rgba(125, 207, 255, 0.1); }
.dc-action-btn-ghost { background: transparent; border-color: transparent; color: var(--dc-comment, #565F89); }
.dc-action-btn-ghost:hover:not(:disabled) { color: var(--dc-text, #C0CAF5); }

.dc-action-btn-iri {
  border-color: var(--dc-accent, #7DCFFF);
  color: var(--dc-accent, #7DCFFF);
  background: transparent;
}
.dc-action-btn-iri:hover:not(:disabled) { background: rgba(125, 207, 255, 0.1); }

.dc-term-modal-footer .dc-action-btn { width: auto; min-width: 100px; padding: 10px 16px; }
.dc-btn-sm { padding: 8px 16px; width: auto; font-size: 11px; }

.dc-error {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(247, 118, 142, 0.08);
  border-left: 3px solid var(--dc-danger, #F7768E);
  color: var(--dc-danger, #F7768E);
  font-family: var(--dc-font-mono);
  font-size: 12px;
}

.dc-fade-enter-active, .dc-fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.dc-fade-enter-from, .dc-fade-leave-to { opacity: 0; transform: scale(0.98); }
</style>
