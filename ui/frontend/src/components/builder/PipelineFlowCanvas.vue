<template>
  <div class="pfc-wrap">
    <div v-if="!pipelineStore.yaml" class="pfc-empty animate-fade-up">
      <div class="pfc-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></div>
      <p class="pfc-empty-title">{{ t('builder_select_pipeline') }}</p>
      <p class="pfc-empty-hint">{{ t('builder_flow_hint') }}</p>
    </div>

    <template v-else>
      <div v-if="parseError" class="pfc-error-bar">YAML syntax error — fix in editor to sync canvas</div>
      <div class="pfc-body">

        <!-- Breadcrumb context nav -->
        <div v-if="contextStack.length > 1" class="pfc-breadcrumb">
          <button v-for="(loc, i) in contextStack" :key="i"
            class="pfc-crumb-btn" :class="{active: i===contextStack.length-1}"
            @click="setActiveByIndex(i)">{{ crumbLabel(loc, i) }}</button>
        </div>

        <!-- Servers (root only) -->
        <section v-if="contextStack.length===1" class="pfc-servers-section">
          <div class="pfc-section-head">
            <span class="pfc-sec-icon pfc-sec-icon--srv"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg></span>
            <span class="pfc-sec-title">Servers</span>
            <button class="pfc-sec-add" @click="addingServer=!addingServer"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          </div>
          <div class="pfc-servers-grid">
            <div v-for="(path, name) in servers" :key="name" class="pfc-srv-pill">
              <span class="pfc-srv-dot" :style="{background:kindColor(name)}"/>
              <span class="pfc-srv-name">{{ name }}</span><span class="pfc-srv-sep">·</span>
              <span class="pfc-srv-path">{{ path }}</span>
              <button class="pfc-pill-del" @click="deleteServer(name)">×</button>
            </div>
          </div>
          <div v-if="addingServer" class="pfc-add-srv-form">
            <input v-model="newServerName" class="pfc-mini-in" placeholder="name" @keydown.enter="confirmAddServer"/>
            <input v-model="newServerPath" class="pfc-mini-in" placeholder="servers/path" @keydown.enter="confirmAddServer"/>
            <button class="pfc-mini-ok" @click="confirmAddServer">Add</button>
            <button class="pfc-mini-cancel" @click="addingServer=false">Cancel</button>
          </div>
          <div class="pfc-divider"/>
        </section>

        <!-- Pipeline steps -->
        <section class="pfc-pipeline-section">
          <div class="pfc-section-head">
            <span class="pfc-sec-icon pfc-sec-icon--pipe"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>
            <span class="pfc-sec-title">{{ contextLabel }}</span>
            <div class="pfc-palette">
              <button class="pfc-pal-btn pfc-pal-step" @click="insertNode('step')">+ Step</button>
              <button class="pfc-pal-btn pfc-pal-loop" @click="insertNode('loop')">+ Loop</button>
              <button class="pfc-pal-btn pfc-pal-branch" @click="insertNode('branch')">+ Branch</button>
            </div>
          </div>

          <div v-if="!currentSteps.length" class="pfc-no-steps">Use toolbar above to add steps</div>

          <div class="pfc-step-list">
            <template v-for="(node, idx) in currentSteps" :key="nodeKey(node,idx)">
              <div v-if="idx>0" class="pfc-connector"><div class="pfc-conn-line"/><span class="pfc-conn-arrow">▼</span></div>

              <!-- STEP -->
              <div v-if="node.kind==='step'" class="flow-node" :style="{'--node-color': kindColor(node.server)}">
                <div class="flow-node-header">
                  <span class="flow-node-server" :data-module="inferKind(node.server)">{{ node.server||'?' }}</span>
                  <div class="flow-node-actions">
                    <button class="pfc-act-btn" :disabled="idx===0" @click="moveStep(idx,-1)">▲</button>
                    <button class="pfc-act-btn" :disabled="idx===currentSteps.length-1" @click="moveStep(idx,1)">▼</button>
                    <button class="pfc-act-btn pfc-act-del" @click="removeNode(idx)">×</button>
                  </div>
                </div>
                <div class="flow-node-body">
                  <div v-if="editingIdx!==nodeKey(node,idx)" class="flow-node-label" @click="startEdit(idx,node)">
                    <span class="flow-node-dot" :style="{background:kindColor(node.server)}"/>
                    <span class="flow-node-name">{{ node.tool || '—' }}</span>
                  </div>
                  <div v-else class="flow-node-edit">
                    <select v-model="editServer" class="pfc-select">
                      <option value="">-- server --</option>
                      <option v-for="s in serverNames" :key="s" :value="s">{{ s }}</option>
                    </select>
                    <input v-model="editTool" class="pfc-mini-in" placeholder="tool"
                      @keydown.enter="commitEdit(idx)" @keydown.escape="editingIdx=null"/>
                    <button class="pfc-mini-ok" @click="commitEdit(idx)">✓</button>
                    <button class="pfc-mini-cancel" @click="editingIdx=null">✕</button>
                  </div>
                </div>
              </div>

              <!-- LOOP -->
              <div v-else-if="node.kind==='loop'" class="loop-container">
                <div class="loop-header">
                  <div class="loop-header-left">
                    <span class="loop-icon">↻</span>
                    <span class="loop-title">Loop</span>
                    <span class="loop-times-badge">× {{ node.times }}</span>
                    <span class="loop-times-label">times</span>
                  </div>
                  <div class="loop-header-actions">
                    <button class="pfc-act-btn" :disabled="idx===0" @click="moveStep(idx,-1)" title="Move up">▲</button>
                    <button class="pfc-act-btn" :disabled="idx===currentSteps.length-1" @click="moveStep(idx,1)" title="Move down">▼</button>
                    <button class="pfc-act-btn pfc-act-del" @click="removeNode(idx)" title="Delete">×</button>
                  </div>
                </div>
                <button class="loop-open-btn" @click="enterLoop(idx)">Open loop context →</button>
              </div>

              <!-- BRANCH -->
              <div v-else-if="node.kind==='branch'" class="branch-container">
                <div class="branch-header">
                  <div class="branch-header-left">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                    <span class="branch-title">Branch</span>
                  </div>
                  <div class="branch-header-right">
                    <button class="pfc-act-btn" :disabled="idx===0" @click="moveStep(idx,-1)" title="Move up">▲</button>
                    <button class="pfc-act-btn" :disabled="idx===currentSteps.length-1" @click="moveStep(idx,1)" title="Move down">▼</button>
                    <button class="pfc-act-btn pfc-act-del" @click="removeNode(idx)" title="Delete">×</button>
                  </div>
                </div>
                <button class="branch-router-btn" @click="enterBranchRouter(idx)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Router logic →
                </button>
                <div class="branch-cases">
                  <div v-for="(_, ckey) in (node.branches??{})" :key="ckey" class="branch-case" @click="enterBranchCase(idx,ckey)">
                    <div class="branch-case-head">
                      <span class="branch-case-label">{{ ckey }}</span>
                      <span class="branch-case-meta">{{ (node.branches[ckey]??[]).length }} steps</span>
                    </div>
                    <span class="branch-case-arrow">→</span>
                  </div>
                </div>
                <button class="pfc-mini-add-case" @click="addBranchCase(idx)">+ Add case</button>
              </div>

            </template>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePipelineStore } from '@/stores/pipeline.js'
import { parseYaml, serializeYaml, makeStep, makeLoop, makeBranch, inferKind, KIND_COLORS } from '@/utils/pipelineParser.js'

const { t } = useI18n()
const pipelineStore = usePipelineStore()
const servers = ref({})
const steps = ref([])
const parseError = ref(false)
const addingServer = ref(false)
const newServerName = ref('')
const newServerPath = ref('')
const contextStack = ref([{ type: 'root' }])
const editingIdx = ref(null)
const editServer = ref('')
const editTool = ref('')
let _internalUpdate = false

function applyYaml(yaml) {
  const result = parseYaml(yaml)
  if (result === null) { parseError.value = true; return }
  parseError.value = false
  servers.value = result.servers ?? {}
  steps.value = result.steps ?? []
  contextStack.value = [{ type: 'root' }]
  editingIdx.value = null
}
watch(() => pipelineStore.yaml, yaml => { if (_internalUpdate) return; applyYaml(yaml) }, { immediate: true })
watch(() => pipelineStore.builderSelected, () => { _internalUpdate = false; applyYaml(pipelineStore.yaml) })
function emitYaml() {
  _internalUpdate = true
  pipelineStore.setYaml(serializeYaml(servers.value, steps.value))
  Promise.resolve().then(() => { _internalUpdate = false })
}

const serverNames = computed(() => Object.keys(servers.value))

const currentSteps = computed(() => {
  let arr = steps.value
  for (const frame of contextStack.value) {
    if (frame.type === 'root') continue
    const node = arr[frame.stepIdx]
    if (!node) return []
    if (frame.type === 'loop') { arr = node.steps ?? []; continue }
    if (frame.type === 'branch-router') { arr = node.router ?? []; continue }
    if (frame.type === 'branch-case') { arr = (node.branches ?? {})[frame.caseKey] ?? []; continue }
  }
  return arr
})

const contextLabel = computed(() => {
  const top = contextStack.value.at(-1)
  if (top.type === 'root') return 'Pipeline'
  if (top.type === 'loop') return 'Loop'
  if (top.type === 'branch-router') return 'Branch Router'
  if (top.type === 'branch-case') return `Case: ${top.caseKey}`
  return 'Pipeline'
})

function crumbLabel(loc, i) {
  if (i === 0) return 'Pipeline'
  if (loc.type === 'loop') return 'Loop'
  if (loc.type === 'branch-router') return 'Router'
  if (loc.type === 'branch-case') return loc.caseKey
  return '?'
}
function setActiveByIndex(i) { contextStack.value = contextStack.value.slice(0, i + 1); editingIdx.value = null }
function enterLoop(idx) { contextStack.value = [...contextStack.value, { type: 'loop', stepIdx: idx }]; editingIdx.value = null }
function enterBranchRouter(idx) { contextStack.value = [...contextStack.value, { type: 'branch-router', stepIdx: idx }]; editingIdx.value = null }
function enterBranchCase(idx, caseKey) { contextStack.value = [...contextStack.value, { type: 'branch-case', stepIdx: idx, caseKey }]; editingIdx.value = null }

function mutateCurrentSteps(fn) {
  let arr = steps.value
  for (const frame of contextStack.value) {
    if (frame.type === 'root') continue
    const node = arr[frame.stepIdx]
    if (!node) return
    if (frame.type === 'loop') { if (!node.steps) node.steps = []; arr = node.steps; continue }
    if (frame.type === 'branch-router') { if (!node.router) node.router = []; arr = node.router; continue }
    if (frame.type === 'branch-case') {
      if (!node.branches) node.branches = {}
      if (!node.branches[frame.caseKey]) node.branches[frame.caseKey] = []
      arr = node.branches[frame.caseKey]; continue
    }
  }
  fn(arr)
  emitYaml()
}

function insertNode(type) {
  mutateCurrentSteps(arr => {
    if (type === 'step') arr.push(makeStep())
    else if (type === 'loop') arr.push(makeLoop())
    else arr.push(makeBranch())
  })
}
function removeNode(idx) {
  const top = contextStack.value.at(-1)
  mutateCurrentSteps(arr => arr.splice(idx, 1))
  if (top.type !== 'root' && top.stepIdx === idx) contextStack.value = contextStack.value.slice(0, -1)
}
function moveStep(idx, dir) {
  mutateCurrentSteps(arr => {
    const t = idx + dir
    if (t < 0 || t >= arr.length) return
    ;[arr[idx], arr[t]] = [arr[t], arr[idx]]
  })
}
function updateLoopTimes(idx, val) { mutateCurrentSteps(arr => { arr[idx].times = Math.max(1, Number(val) || 1) }) }
function addBranchCase(idx) {
  mutateCurrentSteps(arr => {
    const node = arr[idx]; if (!node.branches) node.branches = {}
    node.branches[`case_${Object.keys(node.branches).length + 1}`] = []
  })
}

function nodeKey(node, idx) { return node.id ?? `idx_${idx}` }
function startEdit(idx, node) { editingIdx.value = nodeKey(node, idx); editServer.value = node.server ?? ''; editTool.value = node.tool ?? '' }
function commitEdit(idx) {
  mutateCurrentSteps(arr => { arr[idx] = { ...arr[idx], server: editServer.value, tool: editTool.value } })
  editingIdx.value = null
}

function deleteServer(name) { const s = { ...servers.value }; delete s[name]; servers.value = s; emitYaml() }
function confirmAddServer() {
  const n = newServerName.value.trim(), p = newServerPath.value.trim()
  if (!n || !p) return
  servers.value = { ...servers.value, [n]: p }
  newServerName.value = ''; newServerPath.value = ''; addingServer.value = false; emitYaml()
}

function kindColor(name) { return KIND_COLORS[inferKind(name)] ?? KIND_COLORS.server }
</script>

<style scoped>
.pfc-wrap{display:flex;flex-direction:column;height:100%;overflow:hidden;background:var(--bg-surface)}
.pfc-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#9ca3af;padding:40px;text-align:center}
.pfc-empty-icon{width:56px;height:56px;border-radius:var(--radius-md);background:var(--bg-card);border:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-xs);color:var(--text-tertiary)}
.pfc-empty-title{font-size:13.5px;font-weight:600;color:var(--text-secondary)}
.pfc-empty-hint{font-size:12px;max-width:220px;line-height:1.7;color:var(--text-tertiary)}
.pfc-error-bar{padding:8px 14px;background:rgba(248,113,113,.08);color:var(--accent-red);font-size:12px;border-bottom:1px solid rgba(248,113,113,.15);flex-shrink:0}
.pfc-body{flex:1;overflow-y:auto;padding:16px 20px 60px}
.pfc-breadcrumb{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:14px}
.pfc-crumb-btn{background:var(--bg-card);border:1px solid var(--border-subtle);color:var(--text-tertiary);font-size:12px;font-weight:500;padding:4px 12px;border-radius:var(--radius-full);cursor:pointer;transition:all .15s}
.pfc-crumb-btn:hover{background:var(--bg-hover);color:var(--text-primary)}
.pfc-crumb-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.pfc-section-head{display:flex;align-items:center;gap:7px;margin-bottom:8px}
.pfc-sec-icon{width:20px;height:20px;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pfc-sec-icon--srv{background:rgba(59,130,246,.15);color:var(--accent-blue)}
.pfc-sec-icon--pipe{background:rgba(99,102,241,.15);color:var(--accent)}
.pfc-sec-title{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--text-tertiary)}
.pfc-sec-count{font-size:11px;color:var(--text-tertiary);background:var(--bg-card);padding:1px 8px;border-radius:var(--radius-full);border:1px solid var(--border-subtle)}
.pfc-sec-add{width:20px;height:20px;display:flex;align-items:center;justify-content:center;background:none;border:1px dashed var(--border-strong);border-radius:4px;cursor:pointer;color:var(--text-tertiary);transition:all .15s}
.pfc-sec-add:hover{border-color:var(--accent-blue);color:var(--accent-blue)}
.pfc-divider{height:1px;background:var(--border-subtle);margin:12px 0}
.pfc-servers-grid{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
.pfc-srv-pill{display:flex;align-items:center;gap:7px;padding:6px 10px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);font-size:12px;box-shadow:var(--shadow-xs);transition:border-color var(--transition)}
.pfc-srv-pill:hover{border-color:var(--border-strong)}
.pfc-srv-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.pfc-srv-name{font-weight:700;font-family:var(--font-mono);font-size:11.5px;color:var(--text-primary)}
.pfc-srv-sep{color:var(--text-tertiary);font-size:10px}
.pfc-srv-path{color:var(--text-tertiary);font-family:var(--font-mono);font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pfc-pill-del{background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-size:15px;line-height:1;margin-left:auto;transition:color .15s;flex-shrink:0}
.pfc-pill-del:hover{color:var(--accent-red)}
.pfc-add-srv-form{display:flex;gap:5px;align-items:center;margin-top:6px;flex-wrap:wrap}
.pfc-mini-in{padding:5px 9px;border:1px solid var(--border-subtle);border-radius:var(--radius-xs);background:var(--bg-input);color:var(--text-primary);font-size:12px;outline:none;min-width:0;flex:1}
.pfc-mini-in:focus{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-glow)}
.pfc-mini-ok{padding:5px 12px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-xs);font-size:12px;cursor:pointer;flex-shrink:0}
.pfc-mini-ok:hover{filter:brightness(1.1)}
.pfc-mini-cancel{padding:5px 10px;background:none;border:1px solid var(--border-subtle);border-radius:var(--radius-xs);font-size:12px;cursor:pointer;color:var(--text-secondary);flex-shrink:0}
.pfc-mini-cancel:hover{background:var(--bg-hover)}
.pfc-palette{display:flex;gap:4px;margin-left:auto}
.pfc-pal-btn{display:inline-flex;align-items:center;padding:4px 10px;border:1px solid var(--border-subtle);border-radius:var(--radius-xs);background:var(--bg-card-2);font-size:11px;cursor:pointer;color:var(--text-secondary);transition:all .15s;font-weight:500}
.pfc-pal-step:hover{border-color:var(--accent);color:var(--accent);background:rgba(99,102,241,.08)}
.pfc-pal-loop:hover{border-color:var(--accent-yellow);color:var(--accent-yellow);background:rgba(251,191,36,.08)}
.pfc-pal-branch:hover{border-color:var(--accent-red);color:var(--accent-red);background:rgba(248,113,113,.08)}
.pfc-no-steps{text-align:center;padding:28px 0;color:var(--text-tertiary);font-size:13px;border:1px dashed var(--border-strong);border-radius:var(--radius-sm);margin-top:8px;background:var(--bg-card)}
.pfc-step-list{display:flex;flex-direction:column;align-items:center;gap:0}
.pfc-connector{height:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;margin:-1px 0}
.pfc-conn-line{width:1px;height:14px;background:var(--border-strong)}
.pfc-conn-arrow{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid var(--border-strong);margin-top:-1px}
/* Flow node — pixels match .canvas-main .flow-node */
.flow-node{width:320px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);box-shadow:var(--shadow-card);overflow:hidden;position:relative;transition:box-shadow .2s,transform .2s}
.flow-node:hover{box-shadow:var(--shadow-sm);transform:translateY(-1px)}
.flow-node-header{padding:8px 12px;border-bottom:1px solid var(--border-subtle);background:var(--bg-surface);display:flex;justify-content:center;align-items:center;position:relative}
.flow-node-server{display:inline-flex;align-items:center;justify-content:center;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:rgba(99,102,241,.15);color:var(--accent);white-space:nowrap}
.flow-node-server[data-module="retriever"]{background:rgba(245,158,11,.15);color:var(--accent-yellow)}
.flow-node-server[data-module="generator"]{background:rgba(16,185,129,.15);color:var(--accent-green)}
.flow-node-server[data-module="reranker"]{background:rgba(244,114,182,.18);color:#f472b6}
.flow-node-server[data-module="prompt"]{background:rgba(99,102,241,.18);color:var(--accent)}
.flow-node-server[data-module="router"]{background:rgba(20,184,166,.15);color:var(--accent-teal)}
.flow-node-server[data-module="embedder"]{background:rgba(34,211,238,.15);color:var(--accent-cyan)}
.flow-node-server[data-module="corpus"]{background:rgba(251,146,60,.15);color:var(--accent-orange)}
.flow-node-server[data-module="benchmark"]{background:rgba(148,163,184,.15);color:var(--text-secondary)}
.flow-node-actions{position:absolute;top:6px;right:8px;display:flex;gap:3px;opacity:0;transition:opacity .2s}
.flow-node:hover .flow-node-actions{opacity:1}
.flow-node-body{padding:12px;font-size:13px;font-weight:500;color:var(--text-primary);text-align:center}
.flow-node-label{display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;min-height:20px}
.flow-node-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.flow-node-name{font-family:var(--font-mono);font-size:13px;font-weight:500;color:var(--text-primary)}
.flow-node-edit{display:flex;align-items:center;gap:5px;flex-wrap:wrap;justify-content:center}
.pfc-select{padding:4px 7px;border:1px solid rgba(15,23,42,.12);border-radius:6px;background:#fff;color:#111827;font-size:12px;outline:none}
.pfc-select:focus{border-color:#2563eb}
.pfc-act-btn{display:inline-flex;align-items:center;justify-content:center;padding:3px 8px;background:var(--bg-card-2);border:none;border-radius:5px;font-size:11px;cursor:pointer;color:var(--text-secondary);transition:all .15s;white-space:nowrap}
.pfc-act-btn:hover:not(:disabled){background:var(--bg-hover);color:var(--text-primary)}
.pfc-act-btn:disabled{opacity:.3;cursor:not-allowed}
.pfc-act-del:hover{background:rgba(248,113,113,.12) !important;color:var(--accent-red) !important}
.pfc-act-enter:hover{background:rgba(99,102,241,.1) !important;color:var(--accent) !important}
.loop-container{width:320px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0;box-sizing:border-box;overflow:hidden;box-shadow:var(--shadow-card)}
.loop-header{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(245,158,11,.06);border-bottom:1px dashed rgba(245,158,11,.2)}
.loop-header-left{display:flex;align-items:center;gap:7px}
.loop-header-actions{display:flex;align-items:center;gap:3px;opacity:0;transition:opacity .2s}
.loop-container:hover .loop-header-actions{opacity:1}
.loop-icon{font-size:15px;color:var(--accent-yellow);line-height:1;flex-shrink:0}
.loop-title{font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em}
.loop-times-badge{font-size:12px;font-weight:700;color:var(--accent-yellow);background:rgba(245,158,11,.1);padding:2px 8px;border-radius:var(--radius-full);border:1px solid rgba(245,158,11,.22)}
.loop-times-label{font-size:11px;color:var(--text-tertiary)}
.loop-open-btn{display:flex;align-items:center;justify-content:center;width:100%;padding:9px 12px;background:none;border:none;font-size:12px;font-weight:500;color:var(--text-tertiary);cursor:pointer;transition:all .15s;gap:6px}
.loop-open-btn:hover{background:rgba(245,158,11,.05);color:var(--accent-yellow)}
.branch-container{width:320px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0;box-sizing:border-box;overflow:hidden;box-shadow:var(--shadow-card)}
.branch-header{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(248,113,113,.05);border-bottom:1px dashed rgba(248,113,113,.15)}
.branch-header-left,.branch-header-right{display:flex;align-items:center;gap:6px}
.branch-header-right{opacity:0;transition:opacity .2s}
.branch-container:hover .branch-header-right{opacity:1}
.branch-title{font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em}
.branch-router-btn{display:flex;align-items:center;gap:6px;width:100%;padding:8px 12px;background:rgba(248,113,113,.04);border:none;border-bottom:1px solid rgba(248,113,113,.08);font-size:12px;font-weight:500;color:var(--text-tertiary);cursor:pointer;transition:all .15s}
.branch-router-btn:hover{background:rgba(248,113,113,.08);color:var(--accent-red)}
.branch-cases{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;padding:10px 12px 6px}
.branch-case{background:var(--bg-card-2);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:6px;cursor:pointer;transition:all .15s}
.branch-case:hover{border-color:rgba(248,113,113,.3);box-shadow:0 2px 8px rgba(248,113,113,.06)}
.branch-case:nth-child(4n+2){background:#eff6ff}
.branch-case:nth-child(4n+3){background:#f0fdf4}
.branch-case:nth-child(4n+4){background:#fdf2f8}
.branch-case-head{display:flex;flex-direction:column;gap:2px;min-width:0}
.branch-case-label{font-size:11.5px;font-weight:700;font-family:var(--font-mono);color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.branch-case-meta{font-size:10px;color:var(--text-tertiary)}
.branch-case-arrow{font-size:12px;color:var(--text-tertiary);flex-shrink:0;transition:color .15s}
.branch-case:hover .branch-case-arrow{color:var(--accent-red)}
.pfc-mini-add-case{width:calc(100% - 24px);margin:0 12px 10px;padding:5px 0;background:none;border:1px dashed var(--border-strong);border-radius:var(--radius-xs);font-size:11.5px;cursor:pointer;color:var(--text-tertiary);transition:all .15s}
.pfc-mini-add-case:hover{border-color:var(--accent-red);color:var(--accent-red)}
</style>
