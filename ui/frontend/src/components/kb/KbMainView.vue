<template>
  <div class="kb-root">
    <!-- Header -->
    <header class="kb-header">
      <h3 class="kb-title">{{ t('kb_collections') }}</h3>
      <div class="kb-header-actions">
        <DbStatusChip @click="dbOpen = true" />
        <button class="btn-outline" @click="dbOpen = true">{{ t('kb_configure_db') }}</button>
        <button class="btn-dark" @click="importOpen = true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ t('kb_new_collection') }}
        </button>
      </div>
    </header>

    <!-- Bookshelf -->
    <div class="kb-wrapper">
      <!-- Empty state -->
      <div v-if="!sorted.length" class="kb-empty">
        <div class="kb-empty-icon">📚</div>
        <h5>{{ t('kb_library_empty_title') }}</h5>
        <p>{{ t('kb_library_empty_hint') }}</p>
      </div>

      <!-- Bookshelf grid -->
      <div v-else class="bookshelf-grid">
        <div
          v-for="c in sorted" :key="c.name"
          class="collection-card"
          @click="inspectCollection(c.name)"
        >
          <div class="kb-card-main">
            <div class="kb-icon-box" :style="{ background: palette(c.name).bg, color: palette(c.name).text }">
              {{ initial(c.display_name || c.name) }}
            </div>
            <div class="kb-info-box">
              <template v-if="renamingCollection === c.name">
                <input
                  class="kb-card-title-input"
                  v-model="renameValue"
                  @keydown.enter.stop="commitCollectionRename(c)"
                  @keydown.escape.stop="cancelCollectionRename"
                  @blur="commitCollectionRename(c)"
                  @click.stop
                  ref="collectionRenameInput"
                />
              </template>
              <template v-else>
                <div
                  class="kb-card-title"
                  :title="c.display_name || c.name"
                  @dblclick.stop="startCollectionRename(c)"
                >{{ c.display_name || c.name }}</div>
              </template>
              <div class="kb-meta-count">{{ c.count ?? 0 }} {{ t('kb_vectors') }}</div>
            </div>
            <button class="btn-delete-book" @click.stop="handleDelete(c.name)" :title="t('kb_delete_collection')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <ImportModal v-if="importOpen" @close="importOpen = false" @done="refresh" />
    <DbConfigModal v-if="dbOpen" @close="dbOpen = false" @saved="refresh" />
    <FolderInspectModal
      v-if="inspectOpen"
      :category="inspectCategory"
      :folder-name="inspectFolderName"
      @close="inspectOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKbStore } from '@/stores/kb.js'
import { kbApi } from '@/api/kb.js'
import DbStatusChip from './DbStatusChip.vue'
import ImportModal from './ImportModal.vue'
import DbConfigModal from './DbConfigModal.vue'
import FolderInspectModal from './FolderInspectModal.vue'

const { t } = useI18n()
const kbStore = useKbStore()
const importOpen = ref(false)
const dbOpen = ref(false)
const inspectOpen = ref(false)
const inspectCategory = ref('')
const inspectFolderName = ref('')
const renamingCollection = ref(null)
const renameValue = ref('')
const collectionRenameInput = ref(null)

const sorted = computed(() =>
  kbStore.collections.slice().sort((a, b) =>
    (a.display_name || a.name).localeCompare(b.display_name || b.name)
  )
)

const COLORS = [
  { bg: '#e0f2fe', text: '#0369a1' },
  { bg: '#dcfce7', text: '#15803d' },
  { bg: '#f3e8ff', text: '#7e22ce' },
  { bg: '#fee2e2', text: '#b91c1c' },
  { bg: '#ffedd5', text: '#c2410c' },
  { bg: '#e0e7ff', text: '#4338ca' },
  { bg: '#fce7f3', text: '#be185d' },
  { bg: '#f0fdf4', text: '#166534' },
]

function palette(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

function initial(name) {
  return (name || '?')[0].toUpperCase()
}

function inspectCollection(name) {
  inspectCategory.value = 'collection'
  inspectFolderName.value = name
  inspectOpen.value = true
}

async function handleDelete(name) {
  if (!confirm(t('kb_delete_collection') + ': ' + name + '?')) return
  await kbApi.deleteFile('collection', name)
  await refresh()
}

function startCollectionRename(c) {
  renamingCollection.value = c.name
  renameValue.value = c.display_name || c.name
  nextTick(() => {
    const el = Array.isArray(collectionRenameInput.value)
      ? collectionRenameInput.value[0]
      : collectionRenameInput.value
    el?.focus()
    el?.select()
  })
}

function cancelCollectionRename() {
  renamingCollection.value = null
  renameValue.value = ''
}

async function commitCollectionRename(c) {
  const newName = renameValue.value.trim()
  if (newName && newName !== (c.display_name || c.name)) {
    try {
      await kbApi.renameFile('collection', c.name, newName)
      await refresh()
    } catch (e) {
      console.error('Rename failed:', e)
    }
  }
  cancelCollectionRename()
}

async function refresh() {
  try { kbStore.setFiles(await kbApi.getFiles()) } catch {}
}

onMounted(refresh)
</script>

<style scoped>
/* ── Root ────────────────────────────────────────────────────────────────── */
.kb-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fcfcfc;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.kb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border-subtle);
  background: #fff;
  flex-shrink: 0;
}
.kb-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}
.kb-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-outline {
  padding: 6px 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-full);
  background: transparent;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  color: var(--text-primary);
  transition: all .15s;
}
.btn-outline:hover { background: var(--bg-hover); }
.btn-dark {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--text-primary);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .15s;
}
.btn-dark:hover { opacity: .85; }

/* ── Wrapper / scroll area ───────────────────────────────────────────────── */
.kb-wrapper {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 28px 28px 60px;
  scroll-behavior: smooth;
}
.kb-wrapper::-webkit-scrollbar { width: 6px; }
.kb-wrapper::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.kb-wrapper::-webkit-scrollbar-track { background: transparent; }

/* ── Empty state ─────────────────────────────────────────────────────────── */
.kb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  text-align: center;
  color: var(--text-tertiary);
  animation: fadeUp .35s ease both;
}
.kb-empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: .35; }
.kb-empty h5 { font-size: 15px; font-weight: 600; color: var(--text-secondary); margin: 0 0 8px; }
.kb-empty p  { font-size: 13px; margin: 0; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Bookshelf grid ──────────────────────────────────────────────────────── */
.bookshelf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  animation: fadeUp .3s ease both;
}

/* ── Collection card ─────────────────────────────────────────────────────── */
.collection-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 130px;
  box-shadow: 0 1px 2px rgba(0,0,0,.05);
  cursor: pointer;
}
.collection-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px -4px rgba(0,0,0,.1), 0 4px 8px -2px rgba(0,0,0,.06);
  border-color: #d1d5db;
}

/* ── Card interior ───────────────────────────────────────────────────────── */
.kb-card-main {
  padding: 18px 16px 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}
.kb-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 14px;
  flex-shrink: 0;
}
.kb-info-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.kb-card-title {
  font-weight: 600;
  font-size: 14px;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -.01em;
  cursor: text;
}
.kb-card-title-input {
  font-weight: 600;
  font-size: 14px;
  color: #0f172a;
  width: 100%;
  border: 1px solid #6366f1;
  border-radius: 4px;
  padding: 1px 5px;
  outline: none;
  background: #fff;
  box-sizing: border-box;
  letter-spacing: -.01em;
}
.kb-meta-count {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

/* ── Delete button (hover reveal) ────────────────────────────────────────── */
.btn-delete-book {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity .15s, background .15s, color .15s;
  cursor: pointer;
}
.collection-card:hover .btn-delete-book { opacity: 1; }
.btn-delete-book:hover { background: #fee2e2; color: #ef4444; }
</style>
