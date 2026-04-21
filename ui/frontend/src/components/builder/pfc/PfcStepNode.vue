<template>
  <div class="step-node" :class="'step-node--' + kind" :style="{ borderLeftColor: kindCol }">
    <div class="step-node-header">
      <span class="step-dot" :style="{ background: kindCol }"/>
      <span v-if="!editing" class="step-label" @click="startEdit">{{ node.server }}.{{ node.tool }}</span>
      <template v-else>
        <select v-model="editServer" class="step-select" @change="editTool = ''">
          <option value="">-- server --</option>
          <option v-for="s in serverNames" :key="s" :value="s">{{ s }}</option>
        </select>
        <input v-model="editTool" class="step-input" placeholder="tool"
          @keydown.enter="commitEdit" @keydown.escape="cancelEdit"/>
      </template>
      <span class="step-kind-badge" style="display:none">{{ kind }}</span>
      <div class="step-actions">
        <button class="step-action-btn" :title="expanded ? 'Collapse IO' : 'Expand IO'" @click="expanded=!expanded">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline v-if="expanded" points="18 15 12 9 6 15"/><polyline v-else points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <button v-if="editing" class="step-action-btn step-action-ok" @click="commitEdit" title="Confirm">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="step-action-btn step-action-del" @click="$emit('delete')" title="Delete">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
    <div v-if="expanded" class="step-io">
      <div class="io-section">
        <span class="io-label">INPUT</span>
        <div v-for="(val, key) in editInput" :key="key" class="io-row">
          <input :value="key" class="io-key" placeholder="key" @change="renameKey(editInput, key, $event.target.value)"/>
          <span class="io-arrow">→</span>
          <input :value="val" class="io-val" placeholder="value" @input="editInput[key]=$event.target.value;emitUpdate()"/>
          <button class="io-del" @click="removeKey(editInput, key)">×</button>
        </div>
        <button class="io-add" @click="addKey(editInput)">+ add</button>
      </div>
      <div class="io-section">
        <span class="io-label">OUTPUT</span>
        <div v-for="(val, key) in editOutput" :key="key" class="io-row">
          <input :value="key" class="io-key" @change="renameKey(editOutput, key, $event.target.value)"/>
          <span class="io-arrow">→</span>
          <input :value="val" class="io-val" @input="editOutput[key]=$event.target.value;emitUpdate()"/>
          <button class="io-del" @click="removeKey(editOutput, key)">×</button>
        </div>
        <button class="io-add" @click="addKey(editOutput)">+ add</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { inferKind, KIND_COLORS } from '@/utils/pipelineParser.js'

const props = defineProps({ node: Object, servers: Object })
const emit = defineEmits(['update', 'delete'])

const editing = ref(false)
const expanded = ref(false)
const editServer = ref(props.node.server)
const editTool = ref(props.node.tool)
const editInput = ref({ ...props.node.input })
const editOutput = ref({ ...props.node.output })

const serverNames = computed(() => Object.keys(props.servers ?? {}))
const kind = computed(() => inferKind(props.node.server))
const kindCol = computed(() => KIND_COLORS[kind.value] ?? KIND_COLORS.server)

watch(() => props.node.id, () => {
  if (!editing.value) {
    editServer.value = props.node.server
    editTool.value = props.node.tool
    editInput.value = { ...props.node.input }
    editOutput.value = { ...props.node.output }
  }
})

function startEdit() { editing.value = true }
function cancelEdit() { editing.value = false }
function commitEdit() { editing.value = false; emitUpdate() }
function emitUpdate() {
  emit('update', { ...props.node, server: editServer.value, tool: editTool.value, input: { ...editInput.value }, output: { ...editOutput.value } })
}
function renameKey(obj, oldKey, newKey) {
  if (!newKey || newKey === oldKey) return
  const val = obj[oldKey]; delete obj[oldKey]; obj[newKey] = val; emitUpdate()
}
function removeKey(obj, key) { delete obj[key]; emitUpdate() }
function addKey(obj) { obj[`key${Object.keys(obj).length + 1}`] = ''; emitUpdate() }
</script>

<style scoped>
.step-node{background:var(--bg-card);border:1px solid var(--border-subtle);border-left:3px solid var(--border-strong);border-radius:var(--radius-md);overflow:hidden;transition:box-shadow var(--transition)}
.step-node:hover{box-shadow:var(--shadow-sm)}
.step-node-header{display:flex;align-items:center;gap:7px;padding:8px 10px;cursor:default}
.step-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.step-label{flex:1;font-size:13px;font-weight:600;font-family:var(--font-mono);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.step-label:hover{color:var(--accent)}
.step-select{padding:3px 6px;border:1px solid var(--border-subtle);border-radius:var(--radius-xs);background:var(--bg-input);color:var(--text-primary);font-size:12px;outline:none}
.step-input{padding:3px 6px;border:1px solid var(--border-subtle);border-radius:var(--radius-xs);background:var(--bg-input);color:var(--text-primary);font-size:12px;outline:none;width:90px}
.step-kind-badge{font-size:10px;padding:2px 6px;border-radius:var(--radius-full);background:var(--bg-surface);color:var(--text-tertiary);border:1px solid var(--border-subtle);flex-shrink:0;font-family:var(--font-mono)}
.step-actions{display:flex;gap:2px;flex-shrink:0}
.step-action-btn{width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:none;border:none;border-radius:var(--radius-xs);cursor:pointer;color:var(--text-tertiary);transition:all var(--transition)}
.step-action-btn:hover{background:var(--bg-hover);color:var(--text-primary)}
.step-action-del:hover{color:var(--accent-red)!important}
.step-action-ok{color:var(--accent-green)!important}
.step-io{border-top:1px solid var(--border-subtle);padding:8px 12px;display:flex;flex-direction:column;gap:8px;background:var(--bg-surface)}
.io-section{display:flex;flex-direction:column;gap:4px}
.io-label{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-tertiary)}
.io-row{display:flex;align-items:center;gap:5px}
.io-key,.io-val{padding:3px 7px;border:1px solid var(--border-subtle);border-radius:var(--radius-xs);background:var(--bg-input);color:var(--text-primary);font-size:12px;font-family:var(--font-mono);outline:none;width:95px}
.io-key:focus,.io-val:focus{border-color:var(--accent)}
.io-arrow{color:var(--text-tertiary);font-size:11px}
.io-del{background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-size:14px;line-height:1;transition:color var(--transition)}
.io-del:hover{color:var(--accent-red)}
.io-add{align-self:flex-start;background:none;border:1px dashed var(--border-strong);border-radius:var(--radius-xs);padding:2px 8px;font-size:11px;cursor:pointer;color:var(--text-tertiary);margin-top:2px;transition:all var(--transition)}
.io-add:hover{border-color:var(--accent);color:var(--accent)}
</style>
