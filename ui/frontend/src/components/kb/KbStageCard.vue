<template>
  <div class="pipeline-card">
    <!-- Card Header -->
    <div class="card-head">
      <div class="head-title">
        <span class="step-badge">{{ step }}</span>
        <span class="head-label">{{ title }}</span>
      </div>
      <div class="head-actions">
        <!-- Upload button (Raw Files) -->
        <template v-if="showUpload">
          <input ref="fi" type="file" multiple hidden @change="onFileChange" />
          <button class="btn-head-dark" @click="fi?.click()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {{ t('kb_upload') }}
          </button>
        </template>
        <!-- Settings button (Corpus / Chunks) -->
        <button v-if="hasSettings" class="btn-head-settings" @click="emit('settings')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          {{ t('settings') }}
        </button>
      </div>
    </div>

    <!-- Card Body (scrollable file list) -->
    <div class="card-body-scroll">
      <div v-if="!files.length" class="stage-empty">{{ t('kb_empty') }}</div>

      <div
        v-for="f in sortedFiles"
        :key="f.path ?? f.name"
        class="file-item"
        :class="{ 'new-upload': isNew(f) }"
      >
        <div class="file-item-inner" @click="onItemClick(f)">
          <!-- Icon -->
          <div class="file-icon-wrapper">
            <svg v-if="f.type === 'folder'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#3b82f6"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#94a3b8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <!-- Info -->
          <div class="file-info-wrapper">
            <template v-if="editingPath === (f.path ?? f.name)">
              <input
                class="file-title-input"
                v-model="editingName"
                @keydown.enter="commitRename(f)"
                @keydown.escape="cancelRename"
                @blur="commitRename(f)"
                ref="renameInput"
                @click.stop
              />
            </template>
            <template v-else>
              <div
                class="file-title"
                :title="f.display_name && f.display_name !== f.name ? `${f.display_name}\n(${f.name})` : f.name"
                @dblclick.stop="startRename(f)"
              >
                {{ f.display_name || f.name }}
              </div>
            </template>
            <div class="file-meta">
              <template v-if="f.type === 'folder' && f.file_count">
                {{ f.file_count }} {{ t('kb_files') }} ·
              </template>
              {{ f.size ? (f.size / 1024).toFixed(1) + ' KB' : '' }}
            </div>
          </div>
          <!-- Actions -->
          <div class="file-actions">
            <button
              class="btn-file-action"
              @click.stop="emit('action', f.path)"
            >{{ actionLabel }}</button>
            <button
              class="btn-file-delete"
              :title="t('kb_delete')"
              @click.stop="emit('delete', f.name)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, useSlots, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const slots = useSlots()
const hasSettings = !!slots.settings

const props = defineProps({
  title: String,
  step: Number,
  files: { type: Array, default: () => [] },
  actionLabel: String,
  showUpload: Boolean,
  existingSnapshot: { type: Set, default: () => new Set() },
})

const emit = defineEmits(['action', 'delete', 'upload', 'settings', 'inspect', 'rename'])
const fi = ref(null)
const renameInput = ref(null)
const editingPath = ref(null)
const editingName = ref('')

const sortedFiles = computed(() =>
  [...props.files].sort((a, b) => (b.mtime || 0) - (a.mtime || 0))
)

function isNew(f) {
  return props.existingSnapshot.size > 0 && !props.existingSnapshot.has(f.path)
}

function onFileChange(e) {
  const f = e.target.files
  if (f && f.length) emit('upload', f)
  e.target.value = ''
}

function onItemClick(f) {
  if (f.type === 'folder') {
    emit('inspect', f)
  }
}

function startRename(f) {
  editingPath.value = f.path ?? f.name
  editingName.value = f.display_name || f.name
  nextTick(() => {
    if (renameInput.value) {
      const el = Array.isArray(renameInput.value) ? renameInput.value[0] : renameInput.value
      el?.focus()
      el?.select()
    }
  })
}

function cancelRename() {
  editingPath.value = null
  editingName.value = ''
}

function commitRename(f) {
  const newName = editingName.value.trim()
  if (newName && newName !== (f.display_name || f.name)) {
    emit('rename', { file: f, displayName: newName })
  }
  cancelRename()
}
</script>

<style scoped>
/* ── Card shell ──────────────────────────────────────────────────────────── */
.pipeline-card {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  height: 100%;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.02);
}

/* ── Card head ───────────────────────────────────────────────────────────── */
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  gap: 8px;
}

.head-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.step-badge {
  background: #0f172a;
  color: #fff;
  width: 22px;
  height: 22px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.head-label {
  font-weight: 700;
  font-size: 13px;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* Upload button (dark, Step 1) */
.btn-head-dark {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  background: #0f172a;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity .15s;
  line-height: 1.6;
}
.btn-head-dark:hover { opacity: .85; }

/* Settings button (light, Step 2/3) */
.btn-head-settings {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 500;
  background: #fff;
  color: #64748b;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;
  line-height: 1.6;
}
.btn-head-settings:hover { border-color: #94a3b8; color: #334155; background: #f1f5f9; }

/* ── Card body ───────────────────────────────────────────────────────────── */
.card-body-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #fff;
}
.card-body-scroll::-webkit-scrollbar { width: 5px; }
.card-body-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.card-body-scroll::-webkit-scrollbar-track { background: transparent; }

.stage-empty {
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  margin-top: 32px;
  opacity: .7;
}

/* ── File item ───────────────────────────────────────────────────────────── */
.file-item {
  display: block;
  background: #fff;
  margin-bottom: 8px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all .2s;
  box-shadow: 0 1px 2px rgba(0,0,0,.02);
  overflow: hidden;
}
.file-item:hover {
  border-color: #d1d5db;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0,0,0,.04);
}
.file-item.new-upload {
  background: #eff6ff;
  border: 1px solid #60a5fa;
  box-shadow: 0 2px 6px rgba(37,99,235,.15);
  position: relative;
}
.file-item.new-upload::after {
  content: 'NEW';
  position: absolute;
  top: 6px; right: 6px;
  background: #2563eb;
  color: #fff;
  font-size: 9px;
  padding: 2px 5px;
  border-radius: 4px;
  font-weight: 800;
  letter-spacing: .5px;
  pointer-events: none;
}

.file-item-inner {
  display: flex;
  align-items: flex-start;
  padding: 10px 12px;
  cursor: pointer;
  gap: 0;
}

.file-icon-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  flex-shrink: 0;
  background: #f8fafc;
  border-radius: 6px;
  margin-top: 2px;
}

.file-info-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.file-title {
  font-weight: 600;
  font-size: 13px;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  cursor: text;
}
.file-title-input {
  font-weight: 600;
  font-size: 13px;
  color: #1e293b;
  line-height: 1.4;
  width: 100%;
  border: 1px solid #6366f1;
  border-radius: 4px;
  padding: 1px 5px;
  outline: none;
  background: #fff;
  box-sizing: border-box;
}

.file-meta {
  font-size: 11.5px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

/* ── File action buttons ─────────────────────────────────────────────────── */
.file-actions {
  display: flex;
  align-items: center;
  margin-left: 10px;
  gap: 4px;
  flex-shrink: 0;
}

.btn-file-action {
  padding: 3px 10px;
  font-size: 11.5px;
  font-weight: 500;
  background: #fff;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.btn-file-action:hover { background: #f1f5f9; border-color: #cbd5e1; }

.btn-file-delete {
  width: 26px;
  height: 26px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  transition: all .15s;
}
.btn-file-delete:hover { background: #fee2e2; color: #ef4444; }
</style>
