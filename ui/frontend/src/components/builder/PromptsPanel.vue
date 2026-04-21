<template>
  <div class="prompts-layout">
    <aside class="prompts-sidebar">
      <div class="panel-header">
        <span class="panel-title">Prompt Files</span>
        <button class="btn-icon" :title="t('common_new')" @click="onNew">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <input v-model="search" class="prompt-search" :placeholder="t('common_search') + '...'" />
      <div class="overflow-y-auto flex-1">
        <div
          v-for="f in filteredFiles" :key="f.path"
          class="prompt-item"
          :class="{ active: activeTab === f.path }"
          @click="openFile(f)"
        >
          <span class="prompt-item-name">{{ f.name }}</span>
          <span v-if="isDirty(f.path)" class="modified-dot" />
          <div class="prompt-item-actions">
            <button class="btn-icon" @click.stop="startRename(f)">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon" @click.stop="onDelete(f)">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>
        </div>
        <div v-if="!filteredFiles.length" class="prompt-list-empty">No files</div>
      </div>
    </aside>

    <div class="prompts-right">
      <div class="prompt-tabs-bar">
        <span
          v-for="tab in openTabs" :key="tab.path"
          class="prompt-tab"
          :class="{ active: activeTab === tab.path }"
          @click="activeTab = tab.path"
        >
          <span class="prompt-tab-name">{{ tab.name }}</span>
          <span v-if="isDirty(tab.path)" class="tab-dirty">●</span>
          <button class="tab-close" @click.stop="closeTab(tab.path)">×</button>
        </span>
        <span v-if="!openTabs.length" class="tabs-empty-hint">Open a file from the list</span>
      </div>

      <div v-if="activeTab" class="prompt-toolbar">
        <span class="prompt-filename">{{ openTabs.find(t => t.path === activeTab)?.name }}</span>
        <span v-if="isDirty(activeTab)" class="modified-badge">● Modified</span>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
          <button class="btn btn-secondary btn-sm" @click="startRename(openTabs.find(t => t.path === activeTab))">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {{ t('common_rename') }}
          </button>
          <button class="btn btn-danger btn-sm" @click="onDelete(openTabs.find(t => t.path === activeTab))">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            {{ t('common_delete') }}
          </button>
          <button class="btn btn-primary btn-sm" :disabled="!isDirty(activeTab)" @click="onSave">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2l11 0 5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {{ t('common_save') }}
          </button>
        </div>
      </div>

      <div v-if="activeTab" class="prompt-editor-wrap">
        <div class="prompt-gutter" ref="gutterEl" aria-hidden="true">
          <!-- Render a single pre block instead of N span elements;
               dramatically reduces DOM node count for large files. -->
          <pre class="gutter-pre">{{ gutterText }}</pre>
        </div>
        <textarea
          ref="editorEl"
          class="prompt-textarea"
          :value="currentContent"
          spellcheck="false"
          @input="onInput"
          @keydown.tab.prevent="insertTab"
          @scroll="syncScroll"
        />
      </div>

      <div v-else class="prompt-empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p>Select a prompt file to edit</p>
      </div>
    </div>

    <!-- New Prompt Modal -->
    <Teleport to="body">
      <Transition name="pmodal">
        <div v-if="showNewModal" class="pp-modal-backdrop" @click.self="showNewModal=false">
          <div class="pp-modal">
            <div class="pp-modal-header">
              <span class="pp-modal-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                {{ t('builder_new_prompt') }}
              </span>
              <button class="pp-modal-close" @click="showNewModal=false">×</button>
            </div>
            <div class="pp-modal-body">
              <label class="pp-modal-label">{{ t('builder_prompt_filename_label') || 'Filename' }}</label>
              <input
                ref="newNameInputEl"
                v-model="newPromptName"
                class="form-input"
                placeholder="my_prompt.jinja"
                @keydown.enter="confirmNew"
                @keydown.escape="showNewModal=false"
              />
              <p v-if="newPromptError" class="pp-modal-error">{{ newPromptError }}</p>
              <p class="pp-modal-hint">{{ t('builder_prompt_new_hint') || 'Files without an extension will automatically get .jinja appended.' }}</p>
            </div>
            <div class="pp-modal-footer">
              <button class="btn btn-secondary btn-sm" @click="showNewModal=false">{{ t('cancel') || 'Cancel' }}</button>
              <button class="btn btn-primary btn-sm" @click="confirmNew">{{ t('common_create') || 'Create' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Rename Modal -->
    <Teleport to="body">
      <Transition name="pmodal">
        <div v-if="renameFile" class="pp-modal-backdrop" @click.self="renameFile=null">
          <div class="pp-modal">
            <div class="pp-modal-header">
              <span class="pp-modal-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                {{ t('common_rename') }}
              </span>
              <button class="pp-modal-close" @click="renameFile=null">×</button>
            </div>
            <div class="pp-modal-body">
              <label class="pp-modal-label">{{ t('builder_prompt_filename_label') || 'New filename' }}</label>
              <input
                ref="renameInputEl"
                v-model="renameName"
                class="form-input"
                @keydown.enter="confirmRename"
                @keydown.escape="renameFile=null"
              />
            </div>
            <div class="pp-modal-footer">
              <button class="btn btn-secondary btn-sm" @click="renameFile=null">{{ t('cancel') || 'Cancel' }}</button>
              <button class="btn btn-primary btn-sm" @click="confirmRename">{{ t('common_rename') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { promptsApi } from '@/api/prompts.js'
import { useUiStore } from '@/stores/ui.js'

const { t } = useI18n()
const uiStore = useUiStore()
const files = ref([])
const search = ref('')
const openTabs = ref([])
const activeTab = ref('')
const contents = ref({})
const savedContents = ref({})
const editorEl = ref(null)
const gutterEl = ref(null)
const renameFile = ref(null)
const renameName = ref('')
const renameInputEl = ref(null)
const showNewModal = ref(false)
const newPromptName = ref('')
const newPromptError = ref('')
const newNameInputEl = ref(null)

async function load() { try { files.value = await promptsApi.list() } catch {} }
load()

const filteredFiles = computed(() =>
  files.value.filter(f => f.name.toLowerCase().includes(search.value.toLowerCase()))
)
const currentContent = computed(() => contents.value[activeTab.value] ?? '')
// Sync current prompt content to uiStore so AIAssistantPanel can include it in context
watch(currentContent, (v) => { uiStore.activePromptContent = v }, { immediate: true })

// Watch for AI assistant apply-prompt trigger — update editor + save to API
watch(() => uiStore.promptApplyTrigger, async (trigger) => {
  if (!trigger) return
  const { filepath, content } = trigger
  // If the file isn't open yet, open it first
  const existingTab = openTabs.value.find(t => t.path === filepath)
  if (!existingTab) {
    const fileObj = files.value.find(f => f.path === filepath)
    if (fileObj) await openFile(fileObj)
    else {
      // file not in list yet — just update contents directly
      openTabs.value.push({ path: filepath, name: filepath.split('/').pop() })
    }
  }
  // Update local editor state
  activeTab.value = filepath
  uiStore.activePromptFile = filepath
  contents.value = { ...contents.value, [filepath]: content }
  savedContents.value = { ...savedContents.value, [filepath]: content }
  // Save to server
  try {
    await promptsApi.update(filepath, content)
  } catch (e) {
    console.error('Failed to save prompt from AI apply:', e)
  }
}, { deep: true })
// Line count: avoid Array.from + regex on every keystroke.
// Count newlines with a tight loop — ~3x faster for large files.
const lineCount = computed(() => {
  const s = currentContent.value
  let n = 1
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) === 10) n++
  }
  return n
})
function isDirty(path) {
  return contents.value[path] !== undefined && contents.value[path] !== savedContents.value[path]
}
async function openFile(f) {
  // If already open, just switch to it
  if (openTabs.value.find(t => t.path === f.path)) {
    activeTab.value = f.path
    uiStore.activePromptFile = f.path  // 用 path 而非 name，与原版一致
    return
  }
  // Add tab first so user sees it immediately
  openTabs.value.push({ path: f.path, name: f.name })
  activeTab.value = f.path
  uiStore.activePromptFile = f.path  // 用 path 而非 name
  try {
    const data = await promptsApi.get(f.path)
    const text = data.content ?? ''
    contents.value = { ...contents.value, [f.path]: text }
    savedContents.value = { ...savedContents.value, [f.path]: text }
  } catch (e) {
    console.error('Failed to load prompt:', e)
    contents.value = { ...contents.value, [f.path]: '' }
    savedContents.value = { ...savedContents.value, [f.path]: '' }
  }
}
function closeTab(path) {
  const idx = openTabs.value.findIndex(t => t.path === path)
  openTabs.value.splice(idx, 1)
  if (activeTab.value === path) {
    activeTab.value = openTabs.value[Math.max(0, idx - 1)]?.path ?? ''
    uiStore.activePromptFile = openTabs.value[Math.max(0, idx - 1)]?.path ?? ''  // 用 path 而非 name
  }
}
function onInput(e) { contents.value[activeTab.value] = e.target.value }
function insertTab(e) {
  const el = e.target; const start = el.selectionStart; const val = el.value
  el.value = val.slice(0, start) + '  ' + val.slice(el.selectionEnd)
  el.selectionStart = el.selectionEnd = start + 2
  contents.value[activeTab.value] = el.value
}
// Pre-build gutter text once per line-count change (avoids v-for DOM churn)
const gutterText = computed(() => {
  let s = ''
  for (let i = 1; i <= lineCount.value; i++) s += i + '\n'
  return s
})

function syncScroll(e) {
  if (gutterEl.value) gutterEl.value.scrollTop = e.target.scrollTop
}
async function onSave() {
  if (!activeTab.value) return
  try { await promptsApi.update(activeTab.value, currentContent.value); savedContents.value[activeTab.value] = currentContent.value } catch (e) { console.error(e) }
}
function onNew() {
  newPromptName.value = ''
  newPromptError.value = ''
  showNewModal.value = true
  nextTick(() => newNameInputEl.value?.focus())
}

async function confirmNew() {
  let name = newPromptName.value.trim()
  if (!name) { newPromptError.value = 'Filename is required'; return }
  if (!name.includes('.')) name = name + '.jinja'
  try {
    await promptsApi.create(name, '')
    showNewModal.value = false
    await load()
    const f = files.value.find(f => f.name === name || f.path === name)
    if (f) openFile(f)
  } catch (e) { newPromptError.value = e.message }
}
async function onDelete(f) {
  if (!confirm(`Delete "${f.name}"?`)) return
  try { await promptsApi.delete(f.path); closeTab(f.path); await load() } catch (e) { alert(e.message) }
}
function startRename(f) { renameFile.value = f; renameName.value = f.name; nextTick(() => renameInputEl.value?.focus()) }
async function confirmRename() {
  if (!renameFile.value || !renameName.value) return
  try {
    await promptsApi.rename(renameFile.value.path, renameName.value)
    const tab = openTabs.value.find(t => t.path === renameFile.value.path)
    if (tab) { tab.name = renameName.value; tab.path = renameName.value }
    if (activeTab.value === renameFile.value.path) activeTab.value = renameName.value
    const c = contents.value[renameFile.value.path]; const s = savedContents.value[renameFile.value.path]
    if (c !== undefined) { contents.value[renameName.value] = c; delete contents.value[renameFile.value.path] }
    if (s !== undefined) { savedContents.value[renameName.value] = s; delete savedContents.value[renameFile.value.path] }
    renameFile.value = null; await load()
  } catch (e) { alert(e.message) }
}
</script>

<style scoped>
.prompts-layout{display:flex;width:100%;height:100%;overflow:hidden;position:relative;flex:1}
.prompts-right{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;min-height:0;height:100%;position:relative}
.prompts-sidebar{width:210px;min-width:210px;border-right:1px solid var(--border-subtle);display:flex;flex-direction:column;background:var(--bg-sidebar)}
.prompt-search{margin:6px 8px;padding:6px 10px;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);font-size:12px;background:var(--bg-card);outline:none;width:calc(100% - 16px)}
.prompt-search:focus{border-color:var(--accent-blue)}
.prompt-item{display:flex;align-items:center;padding:6px 10px;cursor:pointer;font-size:12.5px;transition:background var(--transition);gap:5px;border-left:3px solid transparent;min-height:34px}
.prompt-item:hover{background:var(--bg-hover)}
.prompt-item:hover .prompt-item-actions{opacity:1}
.prompt-item.active{background:var(--bg-active);font-weight:600;border-left-color:var(--accent)}
.prompt-item-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-mono);font-size:11.5px}
.prompt-item-actions{display:flex;gap:2px;opacity:0;transition:opacity var(--transition);flex-shrink:0}
.modified-dot{width:6px;height:6px;border-radius:50%;background:var(--accent-yellow);flex-shrink:0}
.prompt-list-empty{padding:16px 12px;font-size:12px;color:var(--text-tertiary)}
.prompt-tabs-bar{display:flex;align-items:stretch;background:var(--bg-surface);border-bottom:1px solid var(--border-subtle);overflow-x:auto;flex-shrink:0;min-height:36px}
.prompt-tab{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border:none;border-right:1px solid var(--border-subtle);background:transparent;cursor:pointer;font-size:12px;color:var(--text-secondary);white-space:nowrap;transition:background var(--transition);border-bottom:2px solid transparent;user-select:none}
.prompt-tab:hover{background:var(--bg-hover);color:var(--text-primary)}
.prompt-tab.active{background:var(--bg-card);color:var(--text-primary);font-weight:600;border-bottom-color:var(--accent)}
.prompt-tab-name{font-family:var(--font-mono);font-size:11.5px}
.tab-dirty{font-size:10px;color:var(--accent-yellow);line-height:1}
.tab-close{background:none;border:none;cursor:pointer;font-size:14px;color:var(--text-tertiary);padding:0 2px;line-height:1;transition:color var(--transition)}
.tab-close:hover{color:var(--accent-red)}
.tabs-empty-hint{display:flex;align-items:center;padding:0 14px;font-size:12px;color:var(--text-tertiary)}
.prompt-toolbar{display:flex;align-items:center;padding:8px 14px;border-bottom:1px solid var(--border-subtle);background:var(--bg-card);flex-shrink:0;gap:10px;min-height:48px}

/* ── Prompt modals (shared with pipeline modal style) ─────────────────────── */
.pp-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)}
.pp-modal{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);width:400px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden}
.pp-modal-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border-subtle);background:var(--bg-surface)}
.pp-modal-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--text-primary)}
.pp-modal-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-tertiary);line-height:1;padding:0 4px;transition:color var(--transition)}
.pp-modal-close:hover{color:var(--text-primary)}
.pp-modal-body{padding:18px}
.pp-modal-label{display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px}
.pp-modal-error{font-size:12px;color:var(--accent-red);margin-top:6px}
.pp-modal-hint{font-size:11.5px;color:var(--text-tertiary);margin-top:6px;line-height:1.5}
.pp-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid var(--border-subtle);background:var(--bg-surface)}
/* Transition */
.pmodal-enter-active{transition:opacity .15s,transform .15s cubic-bezier(.34,1.56,.64,1)}
.pmodal-leave-active{transition:opacity .1s ease}
.pmodal-enter-from,.pmodal-leave-to{opacity:0;transform:scale(.96)}
.prompt-filename{font-size:13px;font-weight:600;color:var(--text-primary);font-family:var(--font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}
.modified-badge{font-size:11.5px;font-weight:600;color:var(--accent-yellow);padding:3px 10px;background:rgba(247,184,75,.12);border:1px solid rgba(247,184,75,.3);border-radius:var(--radius-full);flex-shrink:0}
.prompt-editor-wrap{display:flex;flex:1;overflow:hidden;background:var(--bg-card);min-height:0;height:0}
.prompt-gutter{width:44px;padding:14px 0 14px;font-size:12px;line-height:1.6;color:var(--text-tertiary);background:var(--bg-surface);border-right:1px solid var(--border-subtle);text-align:right;overflow:hidden;user-select:none;font-family:var(--font-mono);flex-shrink:0}
.gutter-pre{margin:0;padding:0 8px;font:inherit;line-height:1.6;white-space:pre;background:none;border:none;color:inherit}
.prompt-textarea{flex:1;padding:14px 14px;font-family:var(--font-mono);font-size:12.5px;line-height:1.6;resize:none;border:none;outline:none;background:var(--bg-card);color:var(--text-primary);tab-size:2;white-space:pre;overflow:auto}
.prompt-empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--text-tertiary);font-size:13px}
</style>
