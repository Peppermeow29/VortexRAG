<template>
  <div class="branch-node">
    <div class="branch-header">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f26565" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
      <span class="branch-title">Branch</span>
      <div style="margin-left:auto;display:flex;gap:4px">
        <button class="branch-action" @click="addBranch">+ branch</button>
        <button class="branch-action branch-action--del" @click="$emit('delete')"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    </div>

    <!-- Router -->
    <div class="branch-router">
      <span class="branch-sub-label">router</span>
      <template v-for="(node, idx) in editRouter" :key="node.id">
        <div v-if="idx>0" class="br-conn"><div class="br-conn-line"/><span class="br-conn-tip">▼</span></div>
        <PfcStepNode :node="node" :servers="servers"
          @update="v=>{editRouter[idx]=v;emitUpdate()}"
          @delete="editRouter.splice(idx,1);emitUpdate()"/>
      </template>
      <button class="branch-mini-add" @click="editRouter.push(makeStep());emitUpdate()">+ router step</button>
    </div>

    <!-- Branch columns -->
    <div class="branch-columns">
      <div v-for="(bnodes, bkey) in editBranches" :key="bkey" class="branch-col">
        <div class="branch-col-head">
          <input :value="bkey" class="branch-key-in" @change="renameBranch(bkey, $event.target.value)"/>
          <button class="branch-col-del" @click="deleteBranch(bkey)">×</button>
        </div>
        <template v-for="(node, idx) in bnodes" :key="node.id">
          <div v-if="idx>0" class="br-conn"><div class="br-conn-line"/><span class="br-conn-tip">▼</span></div>
          <div class="branch-step-row">
            <div class="node-move-btns">
              <button class="move-btn" :disabled="idx===0" @click="moveInCol(bkey,idx,-1)">▲</button>
              <button class="move-btn" :disabled="idx===bnodes.length-1" @click="moveInCol(bkey,idx,1)">▼</button>
            </div>
            <div class="branch-step-content">
              <PfcStepNode v-if="node.kind==='step'" :node="node" :servers="servers"
                @update="v=>{bnodes[idx]=v;emitUpdate()}"
                @delete="bnodes.splice(idx,1);emitUpdate()"/>
              <PfcLoopNode v-else-if="node.kind==='loop'" :node="node" :servers="servers"
                @update="v=>{bnodes[idx]=v;emitUpdate()}"
                @delete="bnodes.splice(idx,1);emitUpdate()"/>
            </div>
          </div>
        </template>
        <div v-if="!bnodes.length" class="branch-col-empty">(empty)</div>
        <div class="branch-col-actions">
          <button class="branch-mini-add branch-mini-add--step" @click="addToCol(bkey,'step')">+step</button>
          <button class="branch-mini-add branch-mini-add--loop" @click="addToCol(bkey,'loop')">+loop</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { makeStep, makeLoop } from '@/utils/pipelineParser.js'
import PfcStepNode from './PfcStepNode.vue'
import PfcLoopNode from './PfcLoopNode.vue'

const props = defineProps({ node: Object, servers: Object })
const emit = defineEmits(['update', 'delete'])

const editRouter = ref(props.node.router?.map(s => ({ ...s })) ?? [])
const editBranches = ref(cloneBranches(props.node.branches ?? {}))

function cloneBranches(b) {
  const out = {}
  for (const [k, v] of Object.entries(b)) out[k] = (v ?? []).map(s => ({ ...s }))
  return out
}

watch(() => props.node.id, () => {
  editRouter.value = (props.node.router ?? []).map(s => ({ ...s }))
  editBranches.value = cloneBranches(props.node.branches ?? {})
})

function emitUpdate() {
  emit('update', { ...props.node, router: [...editRouter.value], branches: { ...editBranches.value } })
}
function addBranch() {
  const key = `branch_${Object.keys(editBranches.value).length + 1}`
  editBranches.value[key] = []; emitUpdate()
}
function deleteBranch(key) { delete editBranches.value[key]; emitUpdate() }
function renameBranch(oldKey, newKey) {
  if (!newKey || newKey === oldKey) return
  const val = editBranches.value[oldKey]
  delete editBranches.value[oldKey]
  editBranches.value[newKey] = val; emitUpdate()
}
function addToCol(key, type) {
  editBranches.value[key].push(type === 'step' ? makeStep() : makeLoop())
  emitUpdate()
}
function moveInCol(key, idx, dir) {
  const arr = [...editBranches.value[key]]
  const target = idx + dir
  if (target < 0 || target >= arr.length) return
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
  editBranches.value[key] = arr; emitUpdate()
}
</script>

<style scoped>
.branch-node{border:1.5px solid rgba(242,101,101,.35);border-radius:var(--radius-md);overflow:hidden;background:var(--bg-card)}
.branch-header{display:flex;align-items:center;gap:6px;padding:7px 10px;background:rgba(242,101,101,.06);border-bottom:1px solid rgba(242,101,101,.18)}
.branch-title{font-size:12px;font-weight:700;color:#f26565;letter-spacing:.02em}
.branch-action{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;background:none;border:1px solid var(--border-subtle);border-radius:var(--radius-xs);font-size:11px;cursor:pointer;color:var(--text-secondary);transition:all var(--transition)}
.branch-action:hover{border-color:#f26565;color:#f26565}
.branch-action--del:hover{border-color:var(--accent-red);color:var(--accent-red)}
.branch-router{padding:8px 10px;border-bottom:1px solid rgba(242,101,101,.12);background:rgba(242,101,101,.03)}
.branch-sub-label{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(242,101,101,.6);display:block;margin-bottom:5px}
.branch-mini-add{width:100%;margin-top:5px;padding:4px 0;background:none;border:1px dashed var(--border-strong);border-radius:var(--radius-xs);font-size:11px;cursor:pointer;color:var(--text-tertiary);transition:all var(--transition)}
.branch-mini-add:hover{border-color:var(--accent);color:var(--accent)}
.branch-columns{display:flex;gap:6px;padding:8px;overflow-x:auto;min-height:50px}
.branch-col{flex:1;min-width:140px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:6px;display:flex;flex-direction:column;gap:3px}
.branch-col-head{display:flex;align-items:center;gap:4px;margin-bottom:4px}
.branch-key-in{flex:1;padding:3px 6px;border:1px solid var(--border-subtle);border-radius:var(--radius-xs);background:var(--bg-input);color:var(--text-primary);font-size:11.5px;font-weight:600;outline:none;font-family:var(--font-mono)}
.branch-key-in:focus{border-color:#f26565}
.branch-col-del{background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-size:14px;line-height:1;flex-shrink:0;transition:color var(--transition)}
.branch-col-del:hover{color:var(--accent-red)}
.branch-col-empty{text-align:center;padding:10px 0;color:var(--text-tertiary);font-size:11px;border:1px dashed var(--border-subtle);border-radius:var(--radius-xs)}
.branch-col-actions{display:flex;gap:3px;margin-top:2px}
.branch-mini-add--step{border-color:rgba(123,104,238,.3);color:rgba(123,104,238,.7)}
.branch-mini-add--step:hover{border-color:var(--accent);color:var(--accent)}
.branch-mini-add--loop{border-color:rgba(247,184,75,.3);color:rgba(247,184,75,.7)}
.branch-mini-add--loop:hover{border-color:#f7b84b;color:#f7b84b}
.branch-step-row{display:flex;align-items:flex-start;gap:4px}
.branch-step-content{flex:1;min-width:0}
.br-conn{display:flex;flex-direction:column;align-items:center;padding:1px 0;margin-left:22px}
.br-conn-line{width:2px;height:8px;background:var(--border-strong)}
.br-conn-tip{font-size:7px;color:var(--border-strong);line-height:1}
.node-move-btns{display:flex;flex-direction:column;gap:1px;padding-top:4px;flex-shrink:0}
.move-btn{width:18px;height:16px;display:flex;align-items:center;justify-content:center;background:none;border:1px solid var(--border-subtle);border-radius:3px;cursor:pointer;font-size:8px;color:var(--text-tertiary);transition:all var(--transition);line-height:1}
.move-btn:hover:not(:disabled){background:var(--bg-hover);color:var(--text-primary);border-color:var(--border-strong)}
.move-btn:disabled{opacity:.25;cursor:not-allowed}
</style>
