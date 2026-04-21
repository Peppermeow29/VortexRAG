<template>
  <div class="loop-node">
    <div class="loop-header">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f7b84b" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.39"/></svg>
      <span class="loop-title">Loop</span>
      <span class="loop-times-label">×</span>
      <input v-model.number="editTimes" type="number" min="1" max="999" class="loop-times-input" @change="emitUpdate"/>
      <span class="loop-times-label">times</span>
      <div style="margin-left:auto;display:flex;gap:4px">
        <button class="loop-action" @click="addChild('step')">+step</button>
        <button class="loop-action loop-action--loop" @click="addChild('loop')">+loop</button>
        <button class="loop-action loop-action--del" @click="$emit('delete')"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    </div>
    <div class="loop-body">
      <template v-for="(node, idx) in editSteps" :key="node.id">
        <div v-if="idx>0" class="loop-conn"><div class="loop-conn-line"/><span class="loop-conn-tip">▼</span></div>
        <div class="loop-step-row">
          <div class="node-move-btns">
            <button class="move-btn" :disabled="idx===0" @click="moveUp(idx)" title="Move up">▲</button>
            <button class="move-btn" :disabled="idx===editSteps.length-1" @click="moveDown(idx)" title="Move down">▼</button>
          </div>
          <div class="loop-step-content">
            <PfcStepNode v-if="node.kind==='step'" :node="node" :servers="servers"
              @update="v=>{editSteps[idx]=v;emitUpdate()}" @delete="removeStep(idx)"/>
            <PfcLoopNode v-else-if="node.kind==='loop'" :node="node" :servers="servers"
              @update="v=>{editSteps[idx]=v;emitUpdate()}" @delete="removeStep(idx)"/>
          </div>
        </div>
      </template>
      <div v-if="!editSteps.length" class="loop-empty">Empty — add step or loop above</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, defineAsyncComponent } from 'vue'
import { makeStep, makeLoop } from '@/utils/pipelineParser.js'
import PfcStepNode from './PfcStepNode.vue'
const PfcLoopNode = defineAsyncComponent(() => import('./PfcLoopNode.vue'))

const props = defineProps({ node: Object, servers: Object })
const emit = defineEmits(['update', 'delete'])

const editTimes = ref(props.node.times ?? 3)
const editSteps = ref(props.node.steps?.map(s => ({ ...s })) ?? [])

// Only reset when the node identity changes (pipeline switch),
// NOT on every deep prop change (which would clear edits in progress)
watch(() => props.node.id, () => {
  editTimes.value = props.node.times ?? 3
  editSteps.value = (props.node.steps ?? []).map(s => ({ ...s }))
})

function emitUpdate() {
  emit('update', { ...props.node, times: editTimes.value, steps: [...editSteps.value] })
}
function addChild(type) {
  editSteps.value.push(type === 'step' ? makeStep() : makeLoop())
  emitUpdate()
}
function removeStep(idx) {
  editSteps.value.splice(idx, 1); emitUpdate()
}
function moveUp(idx) {
  if (idx === 0) return
  const a = [...editSteps.value];[a[idx-1], a[idx]] = [a[idx], a[idx-1]]
  editSteps.value = a; emitUpdate()
}
function moveDown(idx) {
  if (idx === editSteps.value.length - 1) return
  const a = [...editSteps.value];[a[idx], a[idx+1]] = [a[idx+1], a[idx]]
  editSteps.value = a; emitUpdate()
}
</script>

<style scoped>
.loop-node{border:1.5px solid rgba(247,184,75,.4);border-radius:var(--radius-md);overflow:hidden;background:var(--bg-card)}
.loop-header{display:flex;align-items:center;gap:6px;padding:7px 10px;background:rgba(247,184,75,.07);border-bottom:1px solid rgba(247,184,75,.2)}
.loop-title{font-size:12px;font-weight:700;color:#f7b84b;letter-spacing:.02em}
.loop-times-label{font-size:11.5px;color:var(--text-tertiary)}
.loop-times-input{width:42px;padding:2px 5px;border:1px solid var(--border-subtle);border-radius:var(--radius-xs);background:var(--bg-input);color:var(--text-primary);font-size:12px;outline:none;text-align:center}
.loop-times-input:focus{border-color:#f7b84b}
.loop-action{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;background:none;border:1px solid var(--border-subtle);border-radius:var(--radius-xs);font-size:11px;cursor:pointer;color:var(--text-secondary);transition:all var(--transition)}
.loop-action:hover{border-color:var(--accent);color:var(--accent)}
.loop-action--loop:hover{border-color:#f7b84b;color:#f7b84b}
.loop-action--del:hover{border-color:var(--accent-red);color:var(--accent-red)}
.loop-body{padding:8px 8px 8px 12px}
.loop-step-row{display:flex;align-items:flex-start;gap:4px}
.loop-step-content{flex:1;min-width:0}
.loop-empty{text-align:center;padding:12px 0;color:var(--text-tertiary);font-size:11.5px;border:1px dashed var(--border-subtle);border-radius:var(--radius-sm)}
.loop-conn{display:flex;flex-direction:column;align-items:center;padding:2px 0;margin-left:24px}
.loop-conn-line{width:2px;height:10px;background:var(--border-strong)}
.loop-conn-tip{font-size:7px;color:var(--border-strong);line-height:1}
.node-move-btns{display:flex;flex-direction:column;gap:1px;padding-top:4px;flex-shrink:0}
.move-btn{width:18px;height:16px;display:flex;align-items:center;justify-content:center;background:none;border:1px solid var(--border-subtle);border-radius:3px;cursor:pointer;font-size:8px;color:var(--text-tertiary);transition:all var(--transition);line-height:1}
.move-btn:hover:not(:disabled){background:var(--bg-hover);color:var(--text-primary);border-color:var(--border-strong)}
.move-btn:disabled{opacity:.25;cursor:not-allowed}
</style>
