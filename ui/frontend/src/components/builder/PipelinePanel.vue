<template>
  <div class="full-height flex-col">
    <!-- Top toolbar -->
    <div class="pp-toolbar">
      <div class="pp-toolbar-left">
        <div class="pp-pipeline-select-wrap" ref="selectWrap">
          <button class="pp-pipeline-trigger" @click="selectOpen = !selectOpen">
            <span v-if="pipelineStore.selected" class="pp-built-dot" :class="{ built: pipelineStore.isBuilt(pipelineStore.selected) }" />
            <span class="pp-trigger-text">{{ pipelineStore.selected || t('builder_select_pipeline') }}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div v-show="selectOpen" class="pp-pipeline-menu">
            <button
              v-for="p in visiblePipelineList" :key="p.name"
              class="pp-pipeline-opt"
              :class="{ active: pipelineStore.selected === p.name }"
              @click="onSelect(p.name); selectOpen = false"
            >
              <span class="pp-built-dot" :class="{ built: pipelineStore.isBuilt(p.name) }" />
              {{ p.name }}
            </button>
            <div v-if="!pipelineStore.list.length" class="pp-menu-empty">No pipelines</div>
          </div>
        </div>
        <span class="pp-divider">/</span>
        <input
          v-model="pipelineName"
          class="form-input pp-name-input"
          :placeholder="t('builder_pipeline_name_placeholder')"
        />
      </div>
      <div class="pp-toolbar-right">
        <button class="btn btn-secondary btn-sm" @click="showNewModal = true">{{ t('common_new') }}</button>
        <button class="btn btn-secondary btn-sm" :disabled="!pipelineName" @click="onSave">{{ t('common_save') }}</button>
        <button
          class="btn btn-primary btn-sm"
          :disabled="!pipelineStore.selected || pipelineStore.buildStatus === 'building'"
          @click="onBuild"
        >
          <span v-if="pipelineStore.buildStatus === 'building'" class="btn-spinner" />
          {{ pipelineStore.buildStatus === 'building' ? t('builder_build_running') : t('builder_build') }}
        </button>
        <button v-if="pipelineStore.selected" class="btn btn-danger btn-sm" @click="onDelete">{{ t('common_delete') }}</button>
        <span class="build-status-badge" :class="'build-' + pipelineStore.buildStatus">
          {{ buildStatusLabel }}
        </span>
      </div>
    </div>

    <!-- Main: canvas + yaml -->
    <div class="pp-main flex-1 overflow-hidden flex-row">
      <!-- Left: Flow Canvas -->
      <div class="pp-left" :style="{ width: leftW + 'px' }">
        <div class="panel-header">
          <span class="panel-title">{{ t('builder_pipeline_flow') }}</span>
        </div>
        <PipelineFlowCanvas class="flex-1" />
      </div>

      <!-- Resize handle -->
      <div class="pp-resize-handle" @mousedown="startResize" />

      <!-- Right: YAML editor -->
      <div class="flex-1 flex-col overflow-hidden">
        <YamlEditor :value="pipelineStore.yaml" @update:value="pipelineStore.setYaml" />
      </div>
    </div>

    <!-- New Pipeline Modal -->
    <div v-if="showNewModal" class="pp-modal-backdrop" @click.self="showNewModal=false">
      <div class="pp-modal">
        <div class="pp-modal-header">
          <span class="pp-modal-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            New Pipeline
          </span>
          <button class="pp-modal-close" @click="showNewModal=false">×</button>
        </div>
        <div class="pp-modal-body">
          <label class="pp-modal-label">Pipeline name</label>
          <input
            ref="newNameInput"
            v-model="newPipelineNameInput"
            class="form-input"
            placeholder="my_pipeline"
            @keydown.enter="confirmNew"
            @keydown.escape="showNewModal=false"
          />
          <p v-if="newNameError" class="pp-modal-error">{{ newNameError }}</p>
          <p class="pp-modal-hint">Letters, numbers, underscores and hyphens only. Must start with a letter or underscore.</p>
          <div class="pp-modal-template">
            <span class="pp-modal-template-label">Starts with vanilla LLM pipeline:</span>
            <div class="pp-modal-preview">
              <span class="pp-prev-step" data-module="benchmark">benchmark</span>
              <span class="pp-prev-arrow">→</span>
              <span class="pp-prev-step" data-module="generation">generation</span>
              <span class="pp-prev-arrow">→</span>
              <span class="pp-prev-step" data-module="prompt">prompt</span>
              <span class="pp-prev-arrow">→</span>
              <span class="pp-prev-step" data-module="generation">generate</span>
            </div>
          </div>
        </div>
        <div class="pp-modal-footer">
          <button class="btn btn-secondary btn-sm" @click="showNewModal=false">Cancel</button>
          <button class="btn btn-primary btn-sm" @click="confirmNew">Create Pipeline</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePipelineStore } from '@/stores/pipeline.js'
import { useUiStore } from '@/stores/ui.js'
import { pipelinesApi } from '@/api/pipelines.js'
import YamlEditor from './YamlEditor.vue'
import PipelineFlowCanvas from './PipelineFlowCanvas.vue'

const { t } = useI18n()
const pipelineStore = usePipelineStore()
const uiStore = useUiStore()
const pipelineName = ref('')
const leftW = ref(460)
const servers = ref([])
const selectOpen = ref(false)
const selectWrap = ref(null)

// Keep builderSelected in sync with local pipelineName so AI context banner always reflects current state
watch(pipelineName, (name) => {
  if (name && pipelineStore.builderSelected !== name) {
    pipelineStore.builderSelected = name
  }
})

// New pipeline modal
const showNewModal = ref(false)
const newPipelineNameInput = ref('')
const newNameError = ref('')
const newNameInput = ref(null)

// Vanilla pipeline template — mirrors original UI VANILLA_PIPELINE_TEMPLATE
// Follows canonical format: # servers section lists MCP server paths, # pipeline section lists steps
const VANILLA_YAML = `# servers: declare the MCP servers used in this pipeline
servers:
  benchmark: servers/benchmark
  generation: servers/generation
  prompt: servers/prompt

# pipeline: ordered list of steps (server.tool format)
pipeline:
  - benchmark.get_data
  - generation.generation_init
  - prompt.qa_boxed
  - generation.generate
`

// Pipeline list sorted alphabetically
const sortedPipelineList = computed(() =>
  [...pipelineStore.list].sort((a, b) => a.name.localeCompare(b.name))
)

// 虚拟滚动：只显示前100个 pipeline
const visiblePipelineList = computed(() => {
  const list = sortedPipelineList.value
  return list.length > 100 ? list.slice(0, 100) : list
})

const buildStatusLabel = computed(() => ({
  idle: '', building: t('builder_build_running'),
  success: t('builder_build_success'), failed: t('builder_build_failed')
}[pipelineStore.buildStatus] ?? ''))

async function onSelect(name) {
  pipelineStore.selectPipeline(name)
  pipelineName.value = name
  if (!name) return
  try {
    const data = await pipelinesApi.get(name)
    pipelineStore.setYaml(data._raw_yaml ?? data.yaml ?? '')
    pipelineStore.markSaved()
  } catch (e) { console.error(e) }
}

function onNew() {
  newPipelineNameInput.value = ''
  newNameError.value = ''
  showNewModal.value = true
  nextTick(() => newNameInput.value?.focus())
}

function confirmNew() {
  const name = newPipelineNameInput.value.trim()
  if (!name) { newNameError.value = 'Name is required'; return }
  if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
    newNameError.value = 'Invalid name: letters, numbers, _ or - only, must start with letter or _'
    return
  }
  if (pipelineStore.list.some(p => p.name === name)) {
    newNameError.value = `Pipeline "${name}" already exists`
    return
  }
  showNewModal.value = false
  pipelineStore.selectPipeline(null)
  pipelineStore.setYaml(VANILLA_YAML)
  pipelineName.value = name
  uiStore.appendConsole(`Created new pipeline: ${name} (unsaved — click Save to persist)`)
}

async function onSave() {
  if (!pipelineName.value) { uiStore.appendConsole(t('builder_pipeline_name_required')); return }
  try {
    await pipelinesApi.saveYaml(pipelineName.value, pipelineStore.yaml)
    pipelineStore.markSaved()
    pipelineStore.list = await pipelinesApi.list()
    if (pipelineStore.selected !== pipelineName.value) {
      pipelineStore.selectPipeline(pipelineName.value)
    }
    uiStore.appendConsole(t('builder_pipeline_saved'))
  } catch (e) { uiStore.appendConsole(`Save error: ${e.message}`) }
}

async function onBuild() {
  if (!pipelineStore.selected) return
  pipelineStore.setBuildStatus('building')
  uiStore.appendConsole(t('builder_building_pipeline').replace('{name}', pipelineStore.selected))
  try {
    // Auto-save current parameters before build so they are not overwritten
    if (pipelineStore.isReady && Object.keys(pipelineStore.parameters).length) {
      try {
        await pipelinesApi.saveParameters(pipelineStore.selected, pipelineStore.parameters)
      } catch (e) { /* non-fatal */ }
    }
    const res = await pipelinesApi.build(pipelineStore.selected)
    pipelineStore.setBuildStatus('success')
    uiStore.appendConsole(t('builder_pipeline_built_log'))
    if (res?.parameters) pipelineStore.setParameters(res.parameters)
    // Auto-switch to parameters tab, then log
    uiStore.setBuilderMode('parameters')
    uiStore.appendConsole(t('builder_switched_to_parameters'))
  } catch (e) {
    pipelineStore.setBuildStatus('failed')
    uiStore.appendConsole(`${t('builder_build_failed')}: ${e.message}`)
  }
}

async function onDelete() {
  if (!pipelineStore.selected || !confirm(`Delete "${pipelineStore.selected}"?`)) return
  await pipelinesApi.delete(pipelineStore.selected)
  pipelineStore.list = await pipelinesApi.list()
  pipelineStore.selectPipeline(null)
  pipelineName.value = ''
}


function startResize(e) {
  const sx = e.clientX, sw = leftW.value
  // Disable selection and change cursor globally during drag
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'

  const mv = ev => {
    // Allow range from 160px to 80% of window width
    const maxW = Math.floor(window.innerWidth * 0.8)
    leftW.value = Math.max(160, Math.min(sw + ev.clientX - sx, maxW))
  }
  const up = () => {
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    window.removeEventListener('mousemove', mv)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', mv)
  window.addEventListener('mouseup', up)
}

function onOutside(e) {
  if (selectWrap.value && !selectWrap.value.contains(e.target)) selectOpen.value = false
}

onMounted(async () => {
  try { pipelineStore.list = await pipelinesApi.list() } catch {}
  
  // Restore pipelineName from persisted store on page reload
  if (pipelineStore.builderSelected) {
    pipelineName.value = pipelineStore.builderSelected
    // Also reload yaml if not already loaded
    if (!pipelineStore.yaml && pipelineStore.builderSelected) {
      try {
        const data = await pipelinesApi.get(pipelineStore.builderSelected)
        pipelineStore.setYaml(data._raw_yaml ?? data.yaml ?? '')
        pipelineStore.markSaved()
      } catch {}
    }
  } else if (pipelineStore.list.length > 0) {
    // 如果没有选中任何 pipeline，自动选择第一个
    const firstPipeline = pipelineStore.list[0].name
    pipelineStore.selectPipeline(firstPipeline)
    pipelineName.value = firstPipeline
  }
  
  document.addEventListener('click', onOutside)
})
onUnmounted(() => document.removeEventListener('click', onOutside))
</script>

<style scoped>
.pp-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; background: var(--bg-card);
  border-bottom: 1px solid var(--border-subtle); gap: 10px; flex-shrink: 0;
}
.pp-toolbar-left,.pp-toolbar-right { display: flex; align-items: center; gap: 6px; }
.pp-pipeline-select-wrap { position: relative; }
.pp-pipeline-trigger {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 10px; border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); background: var(--bg-card);
  cursor: pointer; font-size: 13px; font-weight: 500;
  transition: all var(--transition); min-width: 160px; max-width: 220px;
}
.pp-pipeline-trigger:hover { border-color: var(--border-strong); background: var(--bg-surface); }
.pp-trigger-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
.pp-pipeline-menu {
  position: absolute; top: calc(100% + 4px); left: 0;
  min-width: 200px; max-width: 280px; max-height: 260px; overflow-y: auto;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md); box-shadow: var(--shadow-float); z-index: 200;
}
.pp-pipeline-opt {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 8px 12px; background: none; border: none;
  font-size: 13px; text-align: left; cursor: pointer;
  transition: background var(--transition); color: var(--text-primary);
}
.pp-pipeline-opt:hover { background: var(--bg-surface); }
.pp-pipeline-opt.active { font-weight: 600; color: var(--accent-blue); }
.pp-menu-empty { padding: 10px 14px; color: var(--text-tertiary); font-size: 12px; }
.pp-built-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--border-strong); flex-shrink: 0;
  transition: background .3s;
}
.pp-built-dot.built { background: #16a34a; box-shadow: 0 0 5px #16a34a66; }
.pp-name-input { max-width: 160px; font-size: 12px; }
.pp-divider { color: var(--text-tertiary); font-size: 14px; }
.build-status-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }
.build-success { background: #dcfce7; color: #15803d; }
.build-failed { background: #fee2e2; color: #b91c1c; }
.build-building { background: #fef9c3; color: #a16207; }
.build-idle { display: none; }
.btn-spinner { display: inline-block; width: 10px; height: 10px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; margin-right: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }
/* New pipeline modal */
.pp-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:center;justify-content:center}
.pp-modal{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);width:440px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden}
.pp-modal-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border-subtle);background:var(--bg-surface)}
.pp-modal-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--text-primary)}
.pp-modal-close{background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-tertiary);line-height:1;padding:0 4px;transition:color var(--transition)}
.pp-modal-close:hover{color:var(--text-primary)}
.pp-modal-body{padding:18px}
.pp-modal-label{display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px}
.pp-modal-error{font-size:12px;color:var(--accent-red);margin-top:6px}
.pp-modal-hint{font-size:11.5px;color:var(--text-tertiary);margin-top:6px;line-height:1.5}
.pp-modal-template{margin-top:16px;padding:12px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-md)}
.pp-modal-template-label{display:block;font-size:11px;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px}
.pp-modal-preview{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pp-prev-step{display:inline-flex;align-items:center;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;background:rgba(37,99,235,.12);color:#2563eb}
.pp-prev-step[data-module="benchmark"]{background:rgba(148,163,184,.2);color:#475569}
.pp-prev-step[data-module="generation"]{background:rgba(16,185,129,.15);color:#059669}
.pp-prev-step[data-module="prompt"]{background:rgba(99,102,241,.15);color:#4f46e5}
.pp-prev-arrow{font-size:11px;color:var(--text-tertiary)}
.pp-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid var(--border-subtle);background:var(--bg-surface)}
.pp-main { display: flex; flex-direction: row; }
.pp-left {
  display: flex; flex-direction: column; overflow: hidden;
  border-right: 1px solid var(--border-subtle); flex-shrink: 0;
  background: var(--bg-sidebar);
}
.pp-resize-handle { width: 4px; cursor: col-resize; background: transparent; flex-shrink: 0; }
.pp-resize-handle:hover { background: var(--border-strong); }
.server-item {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 8px; border-radius: var(--radius-xs); font-size: 12px;
  transition: background var(--transition);
}
.server-item:hover { background: var(--bg-hover); }
.server-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-green); flex-shrink: 0; }
.server-name { flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.server-kind { font-size: 10px; color: var(--text-tertiary); background: var(--bg-input); padding: 1px 6px; border-radius: var(--radius-full); }
</style>
