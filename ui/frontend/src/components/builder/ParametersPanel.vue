<template>
  <div class="parameter-container">
    <!-- Left sidebar -->
    <aside class="parameter-sidebar">
      <div class="parameter-sidebar-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
        <span>{{ t('builder_params_servers') }}</span>
      </div>
      <nav class="parameter-nav">
        <button v-for="k in serverKeys" :key="k" class="parameter-nav-item" :class="{active: activeServer===k}" @click="activateServer(k)">
          <span class="nav-item-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>
          <span class="nav-item-name">{{ k }}</span>
          <span class="nav-item-count">{{ paramCount(k) }}</span>
        </button>
        <div v-if="!serverKeys.length" class="parameter-nav-empty">{{ pipelineStore.isReady ? t('builder_params_no_servers') : t('builder_params_empty') }}</div>
      </nav>
    </aside>

    <!-- Right main -->
    <main class="parameter-main">
      <div class="parameter-content" ref="paramContent">
        <div v-if="!pipelineStore.isReady" class="parameter-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <p>{{ t('builder_params_empty') }}</p>
        </div>
        <div v-else-if="loading" class="parameter-empty">
          <span class="params-spinner"/><p>{{ t('builder_params_loading') }}</p>
        </div>
        <template v-else>
          <div class="parameter-header-bar">
            <p class="parameter-hint">{{ t('builder_params_hint') }}</p>
            <label class="params-toggle-label">
              <span class="params-toggle-text">{{ t('builder_params_simplified') }}</span>
              <input type="checkbox" v-model="pipelineStore.simplifiedParams" class="params-toggle-checkbox"/>
              <span class="params-toggle-switch"/>
            </label>
          </div>
          <div class="parameter-sections">
            <ParameterCard v-for="k in serverKeys" :key="k" :id="'server-'+k" :server-name="k" :params="getParams(k)" :simplified="pipelineStore.simplifiedParams" @update="v => updateParams(k,v)"/>
          </div>
        </template>
      </div>

      <!-- Bottom actions -->
      <div class="parameter-actions">
        <button class="btn-action btn-save" :disabled="!pipelineStore.isReady||saving" @click="onSave">
          <span v-if="saving" class="btn-spinner"/>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {{ t('builder_params_save') }}
        </button>
        <button class="btn-action btn-chat" @click="goChat">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          {{ t('builder_params_enter_chat') }}
        </button>
        <button class="btn-action btn-reload" @click="reload">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          {{ t('builder_params_reload') }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { usePipelineStore } from '@/stores/pipeline.js'
import { useUiStore } from '@/stores/ui.js'
import { pipelinesApi } from '@/api/pipelines.js'
import ParameterCard from './ParameterCard.vue'

const { t } = useI18n()
const router = useRouter()
const pipelineStore = usePipelineStore()
const uiStore = useUiStore()
const activeServer = ref('')
const paramContent = ref(null)
const loading = ref(false)
const saving = ref(false)

const serverKeys = computed(() => Object.keys(pipelineStore.parameters))
function paramCount(k) { return Object.keys(pipelineStore.parameters[k] ?? {}).length }
function getParams(k) { return pipelineStore.parameters[k] ?? {} }
function updateParams(k, v) { pipelineStore.setParameters({ ...pipelineStore.parameters, [k]: v }) }

function activateServer(k) {
  activeServer.value = k
  const el = paramContent.value?.querySelector(`#server-${k}`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function reload() {
  if (!pipelineStore.selected) return
  loading.value = true
  try {
    const p = await pipelinesApi.getParameters(pipelineStore.selected)
    pipelineStore.setParameters(p)
    if (serverKeys.value.length) activeServer.value = serverKeys.value[0]
    uiStore.appendConsole(t('builder_params_reloaded'))
    // Log pipeline ready (mirrors original: "Pipeline ready to chat")
    uiStore.appendConsole(t('builder_pipeline_ready').replace('{name}', pipelineStore.selected))
  } catch (e) { uiStore.appendConsole(`Error: ${e.message}`) }
  finally { loading.value = false }
}

async function onSave() {
  if (!pipelineStore.selected) return
  saving.value = true
  try {
    await pipelinesApi.saveParameters(pipelineStore.selected, pipelineStore.parameters)
    uiStore.appendConsole(t('builder_params_saved'))
  } catch (e) { uiStore.appendConsole(`Save error: ${e.message}`) }
  finally { saving.value = false }
}

function goChat() { router.push('/chat') }

// Reload when pipeline selection changes
watch(() => pipelineStore.selected, async (name) => {
  if (name && pipelineStore.isReady) await reload()
})
// Reload when build succeeds
watch(() => pipelineStore.buildStatus, async (status) => {
  if (status === 'success') { await reload() }
})
// Reload when switching TO the parameters tab — always reflect current pipeline
watch(() => uiStore.builderMode, async (mode) => {
  if (mode === 'parameters' && pipelineStore.selected && pipelineStore.isReady) await reload()
})
onMounted(async () => {
  if (pipelineStore.selected && pipelineStore.isReady) await reload()
  if (serverKeys.value.length) activeServer.value = serverKeys.value[0]
})
</script>

<style scoped>
.parameter-container{display:flex;height:100%;background:#f8fafc;overflow:hidden}
/* Left sidebar */
.parameter-sidebar{width:200px;background:#fff;display:flex;flex-direction:column;flex-shrink:0;box-shadow:inset -1px 0 0 rgba(15,23,42,.06)}
.parameter-sidebar-header{display:flex;align-items:center;gap:10px;padding:20px;font-size:13.5px;font-weight:600;color:#475569;border-bottom:1px solid rgba(15,23,42,.06)}
.parameter-nav{flex:1;overflow-y:auto;padding:12px}
.parameter-nav-item{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border:none;background:transparent;border-radius:10px;cursor:pointer;transition:all .15s;text-align:left;margin-bottom:4px}
.parameter-nav-item:hover{background:#f1f3f8}
.parameter-nav-item.active{background:#e8f0ff;color:#2563eb;font-weight:600}
.nav-item-icon{display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#edf0f6;border-radius:8px;color:#64748b;flex-shrink:0}
.parameter-nav-item.active .nav-item-icon{background:rgba(37,99,235,.12);color:#2563eb}
.nav-item-name{flex:1;font-size:13.5px;font-weight:500;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.parameter-nav-item.active .nav-item-name{color:#4338ca}
.nav-item-count{font-size:11px;font-weight:600;background:#e2e8f0;color:#64748b;padding:2px 8px;border-radius:10px}
.parameter-nav-item.active .nav-item-count{background:#c7d2fe;color:#4338ca}
.parameter-nav-empty{padding:16px;font-size:12px;color:#94a3b8;line-height:1.6}
/* Right main */
.parameter-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.parameter-content{flex:1;overflow-y:auto;padding:24px 32px}
.parameter-header-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.parameter-hint{color:#6b7280;font-size:13.5px;margin:0;flex:1}
.parameter-sections{display:flex;flex-direction:column;gap:0}
.parameter-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:60px 20px;color:#94a3b8;text-align:center;font-size:13px}
/* Bottom actions */
.parameter-actions{display:flex;align-items:center;justify-content:center;gap:16px;padding:20px 32px;border-top:1px solid rgba(15,23,42,.06);flex-shrink:0}
.btn-action{display:inline-flex;align-items:center;gap:8px;padding:10px 24px;border-radius:99px;border:none;font-size:13.5px;font-weight:500;cursor:pointer;transition:all .15s}
.btn-save{background:#111827;color:#fff}
.btn-save:hover:not(:disabled){background:#1f2937}
.btn-save:disabled{opacity:.4;cursor:not-allowed}
.btn-chat{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
.btn-chat:hover{opacity:.9}
.btn-reload{background:#f1f5f9;color:#475569;border:1px solid rgba(15,23,42,.1)}
.btn-reload:hover{background:#e2e8f0}
.btn-spinner{display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
/* Toggle switch */
.params-toggle-label{display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0}
.params-toggle-text{font-size:12.5px;color:#6b7280}
.params-toggle-checkbox{display:none}
.params-toggle-switch{display:inline-block;width:36px;height:20px;background:#d1d5db;border-radius:10px;position:relative;transition:background .2s}
.params-toggle-switch::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;background:#fff;border-radius:50%;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.params-toggle-checkbox:checked+.params-toggle-switch{background:#2563eb}
.params-toggle-checkbox:checked+.params-toggle-switch::after{left:18px}
/* Spinner */
.params-spinner{display:inline-block;width:28px;height:28px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:spin .7s linear infinite}
</style>