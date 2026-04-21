<template>
  <div class="canvas-console" :class="{ collapsed: !uiStore.consoleOpen }">
    <div class="console-header" @click="uiStore.toggleConsole">
      <div class="console-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
        </svg>
        <span>{{ t('builder_console_title') }}</span>
        <span v-if="uiStore.consoleLogs.length" class="console-log-count">{{ uiStore.consoleLogs.length }}</span>
      </div>
      <div class="console-header-right">
        <button class="console-clear-btn" @click.stop="uiStore.clearConsole" title="Clear">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button>
        <button class="console-toggle-btn">
          <svg class="chevron-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
      </div>
    </div>
    <pre ref="logEl" class="console-output"><span v-if="!uiStore.consoleLogs.length" class="console-empty">{{ t('builder_console_empty') }}</span><span v-for="(line,i) in uiStore.consoleLogs" :key="i">{{ line }}
</span></pre>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui.js'

const { t } = useI18n()
const uiStore = useUiStore()
const logEl = ref(null)

// Auto-scroll when new logs arrive
watch(() => uiStore.consoleLogs.length, () => {
  nextTick(() => {
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
  })
})

// Legacy: allow direct append calls from PipelinePanel ref
function append(msg) { uiStore.appendConsole(msg) }
defineExpose({ append })
</script>

<style scoped>
.canvas-console{
  flex-shrink:0;
  background:#f8fafc;
  border-top:1px solid #e2e8f0;
  display:flex;
  flex-direction:column;
  max-height:220px;
  transition:max-height .25s ease;
}
.canvas-console.collapsed{
  max-height:40px;
}
.console-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:10px 16px;
  background:#f1f5f9;
  cursor:pointer;
  user-select:none;
  flex-shrink:0;
  border-bottom:1px solid #e2e8f0;
  transition:background .15s;
}
.console-header:hover{background:#e2e8f0}
.console-title{
  display:flex;
  align-items:center;
  gap:8px;
  font-size:12px;
  font-weight:600;
  text-transform:uppercase;
  letter-spacing:.05em;
  color:#64748b;
}
.console-log-count{
  font-size:10px;
  font-weight:700;
  background:#cbd5e1;
  color:#475569;
  padding:1px 6px;
  border-radius:99px;
  min-width:18px;
  text-align:center;
}
.console-header-right{display:flex;align-items:center;gap:4px}
.console-clear-btn{
  background:transparent;
  border:none;
  color:#94a3b8;
  padding:3px 5px;
  border-radius:4px;
  cursor:pointer;
  transition:all .15s;
  display:flex;
  align-items:center;
}
.console-clear-btn:hover{background:#e2e8f0;color:#ef4444}
.console-toggle-btn{
  background:transparent;
  border:none;
  color:#64748b;
  padding:4px;
  border-radius:4px;
  cursor:pointer;
  transition:all .15s;
  display:flex;
  align-items:center;
}
.console-toggle-btn:hover{background:#e2e8f0;color:#334155}
.chevron-icon{
  transition:transform .25s ease;
}
.canvas-console.collapsed .chevron-icon{
  transform:rotate(180deg);
}
.console-output{
  flex:1;
  margin:0;
  padding:10px 16px;
  background:#fff;
  color:#059669;
  font-family:var(--font-mono);
  font-size:12.5px;
  line-height:1.6;
  overflow-y:auto;
  white-space:pre-wrap;
  word-break:break-all;
}
.canvas-console.collapsed .console-output{
  display:none;
}
.console-empty{color:#94a3b8;font-style:italic}
</style>
