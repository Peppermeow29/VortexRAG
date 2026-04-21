<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="import-modal">

      <!-- Header -->
      <div class="modal-header">
        <div class="modal-header-info">
          <h5 class="modal-title">{{ t('kb_import_knowledge') }}</h5>
          <small class="modal-subtitle">{{ t('kb_import_subtitle') }}</small>
        </div>
        <div class="modal-header-actions">
          <button class="btn-clear" @click="clearStaging">{{ t('kb_delete_all') }}</button>
          <button class="btn-close-x" @click="$emit('close')">×</button>
        </div>
      </div>

      <!-- Status bar -->
      <div v-if="taskMsg" class="status-bar" :class="{ error: taskError }">
        <span v-if="!taskError" class="task-spinner" />
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span class="status-msg">{{ taskMsg }}</span>
      </div>

      <!-- Pipeline Grid -->
      <div class="modal-body">
        <div class="kb-pipeline-grid">
          <KbStageCard
            :title="t('kb_raw_files')" :step="1"
            :files="kbStore.rawFiles" :action-label="t('kb_action_parse')"
            :existing-snapshot="existingSnapshot"
            show-upload
            @upload="onUpload" @action="f => runTask('build_text_corpus', f)"
            @delete="f => del('raw', f)" @inspect="onInspect" @rename="onRename"
          />
          <KbStageCard
            :title="t('kb_corpus')" :step="2"
            :files="kbStore.corpusFiles" :action-label="t('kb_action_chunk')"
            :existing-snapshot="existingSnapshot"
            @action="f => runTask('corpus_chunk', f)" @delete="f => del('corpus', f)"
            @settings="chunkOpen = true" @inspect="onInspect" @rename="onRename"
          ><template #settings /></KbStageCard>
          <KbStageCard
            :title="t('kb_chunks')" :step="3"
            :files="kbStore.chunkFiles" :action-label="t('kb_action_index')"
            :existing-snapshot="existingSnapshot"
            @action="f => runTask('milvus_index', f)" @delete="f => del('chunks', f)"
            @settings="indexOpen = true" @inspect="onInspect" @rename="onRename"
          ><template #settings /></KbStageCard>
        </div>
      </div>

    </div>

    <!-- Chunk Config Dialog -->
    <Teleport to="body">
      <div v-if="chunkOpen" class="cfg-backdrop" @click.self="chunkOpen=false">
        <div class="cfg-dialog">
          <div class="cfg-head">
            <h6>{{ t('kb_chunk_configuration') }}</h6>
            <button class="btn-close-x" @click="chunkOpen=false">×</button>
          </div>
          <div class="cfg-body">
            <div class="cfg-field">
              <label class="cfg-label">{{ t('kb_chunk_backend') }}</label>
              <select v-model="form.chunkBackend" class="cfg-select">
                <option value="token">token</option>
                <option value="sentence">sentence</option>
                <option value="recursive">recursive</option>
              </select>
            </div>
            <div class="cfg-field">
              <label class="cfg-label">{{ t('kb_tokenizer_counter') }}</label>
              <select v-model="form.tokenizer" class="cfg-select">
                <option value="gpt2">gpt2</option>
                <option value="character">character</option>
                <option value="word">word</option>
              </select>
            </div>
            <div class="cfg-field">
              <label class="cfg-label">{{ t('kb_chunk_size') }}</label>
              <input v-model.number="form.chunkSize" type="number" min="1" class="cfg-input" />
            </div>
            <div class="cfg-field">
              <label class="cfg-label">{{ t('kb_use_title') }}</label>
              <select v-model="form.useTitle" class="cfg-select">
                <option :value="true">True</option>
                <option :value="false">False</option>
              </select>
              <span class="cfg-hint">{{ t('kb_use_title_help') }}</span>
            </div>
          </div>
          <div class="cfg-foot">
            <button class="btn-cfg-cancel" @click="chunkOpen=false">{{ t('kb_cancel') }}</button>
            <button class="btn-cfg-save" @click="saveChunkConfig">{{ t('kb_save_config') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Index Config Dialog (Embedding only, no collection/mode) -->
    <Teleport to="body">
      <div v-if="indexOpen" class="cfg-backdrop" @click.self="indexOpen=false">
        <div class="cfg-dialog" style="width:420px">
          <div class="cfg-head">
            <h6>{{ t('kb_embedding_configuration') }}</h6>
            <button class="btn-close-x" @click="indexOpen=false">×</button>
          </div>
          <div class="cfg-body">
            <p class="cfg-desc">{{ t('kb_embedding_desc') }}</p>
            <div class="cfg-field">
              <label class="cfg-label">{{ t('kb_api_key') }}</label>
              <input v-model="form.embApiKey" type="password" class="cfg-input" placeholder="sk-..." />
              <span class="cfg-hint">{{ t('kb_api_key_help') }}</span>
            </div>
            <div class="cfg-field">
              <label class="cfg-label">{{ t('kb_base_url') }}</label>
              <input v-model="form.embBaseUrl" class="cfg-input" placeholder="https://api.openai.com/v1" />
              <span class="cfg-hint">{{ t('kb_base_url_help') }}</span>
            </div>
            <div class="cfg-field">
              <label class="cfg-label">{{ t('kb_model_name') }}</label>
              <input v-model="form.embModel" class="cfg-input" placeholder="text-embedding-3-small" />
              <span class="cfg-hint">{{ t('kb_model_name_help') }}</span>
            </div>
          </div>
          <div class="cfg-foot">
            <button class="btn-cfg-cancel" @click="indexOpen=false">{{ t('kb_cancel') }}</button>
            <button class="btn-cfg-save" @click="saveIndexConfig">{{ t('kb_save_config') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <FolderInspectModal
      v-if="inspectOpen"
      :category="inspectCategory"
      :folder-name="inspectFolderName"
      :display-name="inspectDisplayName"
      @close="inspectOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKbStore } from '@/stores/kb.js'
import { kbApi } from '@/api/kb.js'
import KbStageCard from './KbStageCard.vue'
import FolderInspectModal from './FolderInspectModal.vue'

const emit = defineEmits(['close', 'done'])
const { t } = useI18n()
const kbStore = useKbStore()
const taskMsg = ref('')
const taskError = ref(false)
const chunkOpen = ref(false)
const indexOpen = ref(false)
const inspectOpen = ref(false)
const inspectCategory = ref('')
const inspectFolderName = ref('')
const inspectDisplayName = ref('')

// Snapshot for NEW badge
const existingSnapshot = ref(new Set())

const form = reactive({
  chunkBackend: 'token',
  tokenizer: 'gpt2',
  chunkSize: 500,
  useTitle: true,
  embApiKey: '',
  embBaseUrl: 'https://api.openai.com/v1',
  embModel: 'text-embedding-3-small',
})

onMounted(async () => {
  await refresh()
  // Record current file paths before any action (for NEW badge)
  const snap = new Set()
  ;[...kbStore.rawFiles, ...kbStore.corpusFiles, ...kbStore.chunkFiles].forEach(f => {
    if (f.path) snap.add(f.path)
  })
  existingSnapshot.value = snap
  try {
    const cfg = await kbApi.getConfig()
    if (cfg.embedding) {
      form.embApiKey = cfg.embedding.api_key ?? ''
      form.embBaseUrl = cfg.embedding.base_url ?? form.embBaseUrl
      form.embModel = cfg.embedding.model_name ?? form.embModel
    }
    if (cfg.chunk) {
      form.chunkBackend = cfg.chunk.chunk_backend ?? form.chunkBackend
      form.tokenizer = cfg.chunk.tokenizer_or_token_counter ?? form.tokenizer
      form.chunkSize = cfg.chunk.chunk_size ?? form.chunkSize
      form.useTitle = cfg.chunk.use_title ?? form.useTitle
    }
  } catch {}
})

async function refresh() {
  try { kbStore.setFiles(await kbApi.getFiles()) } catch {}
}

async function onUpload(files) {
  await kbApi.upload(Array.from(files))
  await refresh()
}

async function runTask(pipeline, file) {
  taskMsg.value = `Running ${pipeline}...`
  taskError.value = false
  try {
    const res = await kbApi.runTask({
      pipeline_name: pipeline,
      target_file: file,
      chunk_backend: form.chunkBackend,
      tokenizer_or_token_counter: form.tokenizer,
      chunk_size: form.chunkSize,
      use_title: form.useTitle,
      emb_api_key: form.embApiKey,
      emb_base_url: form.embBaseUrl,
      emb_model_name: form.embModel,
    })
    const taskId = res.task_id
    if (taskId) {
      for (let i = 0; i < 300; i++) {
        await new Promise(r => setTimeout(r, 2000))
        let status
        try { status = await kbApi.getTaskStatus(taskId) } catch { continue }
        if (status.message) taskMsg.value = status.message
        if (status.error || status.status === 'failed') throw new Error(status.error || 'Task failed')
        if (status.status === 'success' || status.done || status.progress === 100) break
      }
    }
    await refresh()
    emit('done')
    taskMsg.value = ''
  } catch (e) {
    taskError.value = true
    taskMsg.value = `Error: ${e.message}`
    setTimeout(() => { taskMsg.value = ''; taskError.value = false }, 6000)
  }
}

async function del(cat, name) {
  await kbApi.deleteFile(cat, name)
  await refresh()
}

async function clearStaging() {
  try { await kbApi.clearStaging(); await refresh() } catch {}
}

async function saveChunkConfig() {
  if (!form.chunkSize || form.chunkSize <= 0) { taskError.value = true; taskMsg.value = t('kb_chunk_size_invalid'); setTimeout(() => { taskMsg.value = ''; taskError.value = false }, 3000); return }
  try {
    await kbApi.saveConfig({ chunk: { chunk_backend: form.chunkBackend, tokenizer_or_token_counter: form.tokenizer, chunk_size: form.chunkSize, use_title: form.useTitle } })
    chunkOpen.value = false
  } catch (e) {
    taskError.value = true
    taskMsg.value = `Save error: ${e.message}`
    setTimeout(() => { taskMsg.value = ''; taskError.value = false }, 3000)
  }
}

async function saveIndexConfig() {
  if (!form.embBaseUrl) { taskError.value = true; taskMsg.value = t('kb_base_url_required'); setTimeout(() => { taskMsg.value = ''; taskError.value = false }, 3000); return }
  if (!form.embModel) { taskError.value = true; taskMsg.value = t('kb_model_name_required'); setTimeout(() => { taskMsg.value = ''; taskError.value = false }, 3000); return }
  try {
    await kbApi.saveConfig({ embedding: { api_key: form.embApiKey, base_url: form.embBaseUrl, model_name: form.embModel } })
    indexOpen.value = false
  } catch (e) {
    taskError.value = true
    taskMsg.value = `Save error: ${e.message}`
    setTimeout(() => { taskMsg.value = ''; taskError.value = false }, 3000)
  }
}

function onInspect(f) {
  inspectCategory.value = f.category || 'raw'
  inspectFolderName.value = f.name
  inspectDisplayName.value = f.display_name || f.name
  inspectOpen.value = true
}

async function onRename({ file, displayName }) {
  try {
    await kbApi.renameFile(file.category, file.name, displayName)
    await refresh()
  } catch (e) {
    taskError.value = true
    taskMsg.value = `Rename error: ${e.message}`
    setTimeout(() => { taskMsg.value = ''; taskError.value = false }, 3000)
  }
}
</script>

<style scoped>
/* ── Backdrop ────────────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  z-index: 900;
  display: flex; align-items: center; justify-content: center;
}

/* ── Modal shell ─────────────────────────────────────────────────────────── */
.import-modal {
  width: 90vw; max-width: 1200px; height: 85vh;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,.25);
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  flex-shrink: 0; gap: 12px;
}
.modal-header-info { display: flex; flex-direction: column; gap: 2px; }
.modal-title { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.3; }
.modal-subtitle { font-size: 11.5px; color: #94a3b8; }
.modal-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.btn-clear {
  padding: 5px 12px; font-size: 12px; font-weight: 500;
  background: transparent; border: 1px solid #fecaca; color: #ef4444;
  border-radius: 7px; cursor: pointer; transition: all .15s;
}
.btn-clear:hover { background: #fee2e2; border-color: #fca5a5; }
.btn-close-x {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  font-size: 18px; line-height: 1; font-weight: 400;
  background: transparent; border: none; color: #94a3b8;
  cursor: pointer; border-radius: 6px; transition: all .15s; padding: 0;
}
.btn-close-x:hover { background: #f1f5f9; color: #1e293b; }

/* ── Status bar ──────────────────────────────────────────────────────────── */
.status-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 20px;
  background: rgba(59,130,246,.08);
  border-bottom: 1px solid rgba(59,130,246,.15);
  flex-shrink: 0; font-size: 12.5px; color: #2563eb;
}
.status-bar.error { background: rgba(239,68,68,.07); border-color: rgba(239,68,68,.15); color: #dc2626; }
.status-msg { flex: 1; }
.task-spinner {
  width: 14px; height: 14px;
  border: 2px solid currentColor; border-top-color: transparent;
  border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Modal body ──────────────────────────────────────────────────────────── */
.modal-body {
  flex: 1; overflow: hidden;
  display: flex; flex-direction: column;
  background: #f8fafc; padding: 16px; min-height: 0;
}

.parse-mode-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
}

.parse-mode-label {
  font-size: 12px;
  color: #475569;
  font-weight: 600;
}

.parse-mode-select {
  min-width: 220px;
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #0f172a;
  font-size: 12.5px;
  outline: none;
}

.parse-mode-select:focus {
  border-color: #6366f1;
  background: #fff;
}

/* ── Pipeline grid ───────────────────────────────────────────────────────── */
.kb-pipeline-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px; height: 100%; min-height: 0;
}
@media (max-width: 768px) {
  .kb-pipeline-grid { grid-template-columns: 1fr; height: auto; overflow-y: auto; }
}

/* ── Config dialog ───────────────────────────────────────────────────────── */
.cfg-backdrop {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0,0,0,.35);
  display: flex; align-items: center; justify-content: center;
}
.cfg-dialog {
  width: 400px; max-width: 92vw;
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 14px; box-shadow: 0 16px 48px rgba(0,0,0,.2);
  overflow: hidden; display: flex; flex-direction: column;
}
.cfg-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 12px; border-bottom: 1px solid #e2e8f0;
}
.cfg-head h6 { margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; }
.cfg-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.cfg-foot {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 10px 16px 14px; border-top: 1px solid #e2e8f0;
}
.cfg-field { display: flex; flex-direction: column; gap: 3px; }
.cfg-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
.cfg-input {
  padding: 7px 10px; border: 1px solid #e2e8f0; border-radius: 7px;
  background: #f8fafc; color: #0f172a; font-size: 12.5px;
  outline: none; width: 100%; box-sizing: border-box; transition: border-color .15s;
}
.cfg-input:focus { border-color: #6366f1; background: #fff; }
.cfg-select {
  padding: 7px 10px; border: 1px solid #e2e8f0; border-radius: 7px;
  background: #f8fafc; color: #0f172a; font-size: 12.5px;
  outline: none; width: 100%; transition: border-color .15s;
}
.cfg-select:focus { border-color: #6366f1; }
.cfg-hint { font-size: 11px; color: #94a3b8; margin-top: 2px; display: block; }
.cfg-desc { font-size: 12px; color: #64748b; margin-bottom: 4px; }
.btn-cfg-cancel {
  padding: 6px 14px; font-size: 12.5px; font-weight: 500;
  background: #f1f5f9; color: #475569;
  border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all .15s;
}
.btn-cfg-cancel:hover { background: #e2e8f0; }
.btn-cfg-save {
  padding: 6px 14px; font-size: 12.5px; font-weight: 600;
  background: #0f172a; color: #fff;
  border: none; border-radius: 8px; cursor: pointer; transition: opacity .15s;
}
.btn-cfg-save:hover { opacity: .85; }
</style>
