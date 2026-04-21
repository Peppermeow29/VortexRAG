<template>
  <div class="chat-root">
    <!-- Header -->
    <header class="chat-header">
      <button v-if="sidebarCollapsed" class="btn-sidebar-expand" @click="toggleSidebar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      </button>
      <div class="chat-header-left">
        <div class="pipeline-select-wrap" ref="pipelineWrap">
          <button class="pipeline-trigger" @click="pipelineMenuOpen = !pipelineMenuOpen">
            <span class="pipeline-trigger-label">{{ selectedPipeline || t('select_pipeline') }}</span>
            <span class="pipeline-trigger-sub">VortexRAG</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              :style="{ transform: pipelineMenuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <Transition name="drop">
            <div v-if="pipelineMenuOpen" class="pipeline-menu">
              <button
                v-for="p in builtPipelines" :key="p.name"
                class="pipeline-menu-item"
                :class="{ active: selectedPipeline === p.name }"
                @click="selectPipeline(p.name)"
              ><span class="built-dot" />{{ p.name }}</button>
              <div v-if="!builtPipelines.length" class="pipeline-menu-empty">{{ t('chat_no_built_pipelines') }}</div>
            </div>
          </Transition>
        </div>

      </div>

      <div class="chat-header-right">
        <button class="engine-btn" :class="engineBtnClass" :disabled="chatStore.engineStatus === 'initializing'" @click="toggleEngine">
          <span v-if="chatStore.engineStatus === 'initializing'" class="spinner" />
          {{ engineBtnLabel }}
        </button>
        <span class="engine-badge" :class="'engine-badge--' + chatStore.engineStatus">
          <span class="badge-dot" />{{ engineStatusLabel }}
        </span>
      </div>
    </header>

    <!-- Message area -->
    <div class="chat-scroll-area" ref="scrollEl">
      <div v-if="!session?.messages?.length" class="chat-empty">
        <div class="empty-logo">
          <LogoIcon :size="56" :bg="false" />
        </div>
        <p class="greeting greeting-gradient">{{ t('greeting_explore') }}</p>
        <p class="greeting-sub">{{ selectedPipeline ? selectedPipeline : t('select_pipeline') }}</p>
      </div>
      <ChatMessage
        v-for="(msg, idx) in session?.messages"
        :key="msg.id"
        :message="msg"
        :message-index="idx"
        :show-references="chatStore.showReferences"
        @view-source="onViewSource"
      />
    </div>

    <!-- Rename modal -->
    <Teleport to="body">
      <div v-if="renameModalOpen" class="modal-overlay" @click.self="renameModalOpen = false">
        <div class="modal-card" style="max-width:400px">
          <h3 class="modal-title">{{ t('chat_rename_session') }}</h3>
          <input
            v-model="renameInput"
            class="modal-input"
            :placeholder="t('chat_session_name')"
            @keydown.enter="confirmRename"
            ref="renameInputEl"
          />
          <div class="modal-actions">
            <button class="btn-secondary" @click="renameModalOpen = false">{{ t('cancel') }}</button>
            <button class="btn-primary" @click="confirmRename">{{ t('confirm') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Import file input (hidden) -->
    <input ref="importFileInput" type="file" accept=".json" style="display:none" @change="onImportFile" />

    <!-- Input area -->
    <div class="chat-input-wrapper">
      <div class="chat-input-box" :class="{ focused: inputFocused }">
        <textarea
          ref="inputEl"
          v-model="inputText"
          class="chat-textarea"
          rows="1"
          :placeholder="t('placeholder_chat_input')"
          :disabled="chatStore.isStreaming"
          @focus="inputFocused = true"
          @blur="inputFocused = false"
          @keydown.enter.exact.prevent="onSend"
          @input="autoResize"
        />
        <div class="chat-input-actions">
          <div class="input-left-actions">
            <KbSelector />
            <button
              class="bg-mode-btn"
              :class="{ active: chatStore.backgroundMode }"
              :title="t('background')"
              @click="chatStore.backgroundMode = !chatStore.backgroundMode"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              {{ t('background') }}
            </button>
          </div>
          <div class="input-right-actions">
            <button v-if="!chatStore.isStreaming" class="btn-send" :disabled="!inputText.trim()" @click="onSend">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </button>
            <button v-else class="btn-stop" @click="onStop">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            </button>
          </div>
        </div>
      </div>
      <p v-if="sendError" class="send-error">{{ sendError }}</p>
      <span class="input-hint">Enter to send · Shift+Enter for new line</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/chat.js'
import { usePipelineStore } from '@/stores/pipeline.js'
import { chatApi, backgroundApi, getUserId, streamChat } from '@/api/chat.js'

import ChatMessage from './ChatMessage.vue'
import KbSelector from './KbSelector.vue'
import LogoIcon from '@/components/icons/LogoIcon.vue'

const { t } = useI18n()
const chatStore = useChatStore()
const pipelineStore = usePipelineStore()
const showSource = inject('showSource', () => {})
const sidebarCollapsed = inject('sidebarCollapsed', ref(false))
const toggleSidebar = inject('toggleSidebar', () => {})
const bgTasksPanel = inject('bgTasksPanel', ref(null))

const scrollEl = ref(null)
const inputEl = ref(null)
const pipelineWrap = ref(null)
const inputText = ref('')
const inputFocused = ref(false)
const selectedPipeline = ref(pipelineStore.chatSelected ?? '')
const pipelineMenuOpen = ref(false)
const renameModalOpen = ref(false)
const renameInput = ref('')
const renameInputEl = ref(null)
const importFileInput = ref(null)
let abortCtrl = null

const builtPipelines = computed(() => pipelineStore.builtList)
const session = computed(() => chatStore.currentSession)
// Align with original UI behavior: always run full pipeline in chat mode
// so each answer can return retrieval sources and bottom reference cards.
const shouldForceFullPipeline = computed(() => true)

const engineBtnLabel = computed(() => {
  if (chatStore.engineStatus === 'initializing') return t('status_initializing')
  if (chatStore.engineStatus === 'ready') return 'Stop Engine'
  return 'Start Engine'
})
const engineBtnClass = computed(() => ({
  'engine-btn--active': chatStore.engineStatus === 'ready',
  'engine-btn--loading': chatStore.engineStatus === 'initializing'
}))
const engineStatusLabel = computed(() => {
  const map = { ready: t('status_engine_ready'), offline: t('status_engine_offline'), initializing: t('status_initializing'), error: t('status_engine_error') }
  return map[chatStore.engineStatus] ?? chatStore.engineStatus
})

function onOutsideClick(e) {
  if (pipelineWrap.value && !pipelineWrap.value.contains(e.target)) pipelineMenuOpen.value = false
}
onMounted(async () => {
  if (!chatStore.currentSessionId) chatStore.createSession(selectedPipeline.value || null)
  // Validate persisted engine session — backend may have restarted
  const engineSid = chatStore.getEngineSessionId(selectedPipeline.value)
  if (engineSid && chatStore.engineStatus === 'ready') {
    try {
      const history = await chatApi.getHistory(engineSid)
      if (!history) throw new Error('session not found')
    } catch {
      chatStore.unregisterEngine(selectedPipeline.value)
      chatStore.setEngineStatus('offline')
    }
  }
  document.addEventListener('click', onOutsideClick)
})
onUnmounted(() => document.removeEventListener('click', onOutsideClick))

function selectPipeline(name) {
  selectedPipeline.value = name
  pipelineStore.selectChatPipeline(name)
  pipelineMenuOpen.value = false
}

async function toggleEngine() {
  if (chatStore.engineStatus === 'ready') {
    const sid = chatStore.getEngineSessionId(selectedPipeline.value)
    if (sid) { try { await chatApi.stopEngine(sid) } catch {} }
    chatStore.unregisterEngine(selectedPipeline.value)
    chatStore.setEngineStatus('offline')
  } else {
    if (!selectedPipeline.value) { alert(t('chat_engine_required_message')); return }
    chatStore.setEngineStatus('initializing')
    const sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
    try {
      await chatApi.startEngine(selectedPipeline.value, sid)
      chatStore.registerEngine(selectedPipeline.value, sid)
      chatStore.setEngineStatus('ready')
    } catch (e) { chatStore.setEngineStatus('error'); console.error(e) }
  }
}

const sendError = ref('')

async function onSend() {
  const q = inputText.value.trim()
  if (!q || chatStore.isStreaming) return
  sendError.value = ''
  const engineSid = chatStore.getEngineSessionId(selectedPipeline.value)
  if (!engineSid) { sendError.value = t('chat_engine_required_message'); return }

  // ── Background mode: fire-and-forget via /chat/background ───────────────
  if (chatStore.backgroundMode) {
    chatStore.backgroundMode = false
    inputText.value = ''
    if (inputEl.value) inputEl.value.style.height = 'auto'
    const dynamicParams = chatStore.selectedCollection ? { collection_name: chatStore.selectedCollection } : {}
    try {
      await backgroundApi.sendToBackground(selectedPipeline.value, {
        question: q,
        session_id: engineSid,
        dynamic_params: dynamicParams,
        user_id: getUserId()
      })
      bgTasksPanel.value?.startPolling()
    } catch (e) { sendError.value = e.message }
    return
  }

  // ── Normal streaming mode ────────────────────────────────────────────────
  if (!chatStore.currentSessionId) chatStore.createSession(selectedPipeline.value)
  const chatSid = chatStore.currentSessionId
  inputText.value = ''
  if (inputEl.value) inputEl.value.style.height = 'auto'

  // ── Normal streaming mode ────────────────────────────────────────────────
  chatStore.addMessage(chatSid, { id: `u_${Date.now()}`, role: 'user', content: q, timestamp: Date.now() })
  const aMsgId = `a_${Date.now()}`
  chatStore.addMessage(chatSid, { id: aMsgId, role: 'assistant', content: '', sources: [], steps: [], isStreaming: true, timestamp: Date.now() })
  chatStore.isStreaming = true
  scrollToBottom()

  // Build history excluding the just-added user message (last item) and the placeholder assistant
  const allMsgs = session.value?.messages ?? []
  const history = allMsgs
    .slice(0, -2)  // exclude last user msg + placeholder assistant
    .filter(m => m.content && !m.isStreaming)
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content }))

  const dynamicParams = chatStore.selectedCollection ? { collection_name: chatStore.selectedCollection } : {}
  abortCtrl = streamChat(selectedPipeline.value,
    {
      question: q,
      session_id: engineSid,
      conversation_history: history,
      dynamic_params: dynamicParams,
      force_full_pipeline: shouldForceFullPipeline.value
    },
    {
      onToken(tok) {
        const s = chatStore.sessions.find(s => s.id === chatSid)
        const m = s?.messages.find(m => m.id === aMsgId)
        if (m) m.content += tok
        scrollToBottom()
      },
      onThinkToken(tok) {
        // Append non-final token to the last active step's tokens field
        const s = chatStore.sessions.find(s => s.id === chatSid)
        const m = s?.messages.find(m => m.id === aMsgId)
        if (m && m.steps && m.steps.length) {
          const lastStep = [...m.steps].reverse().find(st => !st.done)
          if (lastStep) lastStep.tokens = (lastStep.tokens ?? '') + tok
        }
        scrollToBottom()
      },
      onSources(src) {
        const s = chatStore.sessions.find(s => s.id === chatSid)
        const m = s?.messages.find(m => m.id === aMsgId)
        if (!m) return
        const incoming = Array.isArray(src) ? src : (src ? [src] : [])
        const merged = [...(m.sources ?? []), ...incoming]
        const seen = new Set()
        m.sources = merged.filter(item => {
          const key = item?.id ?? item?.displayId ?? `${item?.title ?? ''}::${item?.content ?? item?.text ?? item?.chunk ?? ''}`
          if (key == null) return true
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      },
      onStepStart(name, depth) {
        const s = chatStore.sessions.find(s => s.id === chatSid)
        const m = s?.messages.find(m => m.id === aMsgId)
        if (m) m.steps = [...(m.steps ?? []), { name, depth, output: null, done: false }]
      },
      onStepEnd(name, output) {
        const s = chatStore.sessions.find(s => s.id === chatSid)
        const m = s?.messages.find(m => m.id === aMsgId)
        if (m) { const step = [...(m.steps ?? [])].reverse().find(st => st.name === name); if (step) { step.output = output; step.done = true } }
      },
      onFinal(data) {
        console.log('[ChatMainView] onFinal called with data:', data)
        // Update message with final answer if provided
        const updates = { isStreaming: false }
        if (data?.answer) {
          console.log('[ChatMainView] Setting answer content, length:', data.answer.length)
          updates.content = data.answer
        } else {
          console.warn('[ChatMainView] No answer in final data')
        }
        chatStore.updateMessage(chatSid, aMsgId, updates)
        chatStore.isStreaming = false
        scrollToBottom()
      },
      onError(msg) {
        // Detect session expiry (backend restart wiped SESSION_MANAGER)
        const isSessionError = /session/i.test(msg) || /not found/i.test(msg) || /expired/i.test(msg)
        if (isSessionError) {
          chatStore.unregisterEngine(selectedPipeline.value)
          chatStore.setEngineStatus('offline')
          chatStore.updateMessage(chatSid, aMsgId, { content: `**${t('status_engine_offline')}** — Session expired. Please restart the engine.`, isStreaming: false })
        } else {
          chatStore.updateMessage(chatSid, aMsgId, { content: `**Error:** ${msg}`, isStreaming: false })
        }
        chatStore.isStreaming = false
      }
    }
  )
}

function onStop() {
  abortCtrl?.abort()
  const engineSid = chatStore.getEngineSessionId(selectedPipeline.value)
  if (engineSid) { try { chatApi.stopGeneration(engineSid) } catch {} }
  chatStore.isStreaming = false
  const s = chatStore.sessions.find(s => s.id === chatStore.currentSessionId)
  const last = s?.messages?.at(-1)
  if (last?.isStreaming) chatStore.updateMessage(chatStore.currentSessionId, last.id, { isStreaming: false })
}
function onViewSource(source) { showSource(source) }
function scrollToBottom() { nextTick(() => { if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight }) }
function autoResize() {
  if (!inputEl.value) return
  inputEl.value.style.height = 'auto'
  inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 180) + 'px'
}

function startRename() {
  renameInput.value = session.value?.title ?? ''
  renameModalOpen.value = true
  nextTick(() => renameInputEl.value?.focus())
}
function confirmRename() {
  if (renameInput.value.trim() && session.value) {
    chatStore.renameSession(session.value.id, renameInput.value.trim())
  }
  renameModalOpen.value = false
}
function clearCurrentSession() {
  if (!session.value) return
  if (confirm(t('chat_confirm_clear'))) {
    chatStore.clearSessionHistory(session.value.id)
  }
}
function deleteCurrentSession() {
  if (!session.value) return
  if (confirm(t('chat_confirm_delete'))) {
    chatStore.deleteSession(session.value.id)
  }
}
function exportCurrentSession() {
  if (!session.value) return
  const json = chatStore.exportSession(session.value.id)
  if (!json) return
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${session.value.title || 'chat-session'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
function triggerImport() {
  importFileInput.value?.click()
}
function onImportFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      chatStore.importSession(ev.target.result)
    } catch (err) {
      alert(t('chat_import_invalid'))
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}
</script>

<style scoped>
.chat-root{display:flex;flex-direction:column;height:100%;overflow:hidden;background:var(--bg-base)}
.chat-header{
  display:flex;align-items:center;gap:4px;
  padding:0 20px;
  height:60px;
  border-bottom:1px solid var(--border-subtle);
  flex-shrink:0;
  background:var(--bg-base);
}
.chat-header-left{display:flex;align-items:center;gap:4px;flex:1}
.chat-header-right{display:flex;align-items:center;gap:8px;margin-left:auto}

/* Sidebar expand */
.btn-sidebar-expand{
  width:34px;height:34px;display:flex;align-items:center;justify-content:center;
  background:transparent;border:none;border-radius:var(--radius-md);
  cursor:pointer;color:var(--text-secondary);transition:all .15s;
  flex-shrink:0;margin-right:4px;
}
.btn-sidebar-expand:hover{background:var(--bg-hover);color:var(--text-primary)}

/* Pipeline selector */
.pipeline-select-wrap{position:relative}
.pipeline-trigger{
  display:flex;align-items:center;gap:8px;
  padding:6px 16px;border:none;
  background:transparent;
  cursor:pointer;font-size:14px;font-weight:600;
  transition:color .15s;
  border-radius:var(--radius-full);
  color:var(--text-primary);
}
.pipeline-trigger:hover{background:rgba(0,0,0,.04)}
.pipeline-trigger-label{font-size:16px;font-weight:700;letter-spacing:-.2px}
.pipeline-trigger-sub{font-size:12px;color:var(--text-tertiary);font-weight:400}
.pipeline-menu{
  position:absolute;top:calc(100% + 8px);left:0;
  min-width:220px;
  background:var(--bg-card);
  border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg);
  box-shadow:0 8px 24px rgba(0,0,0,.12);
  z-index:200;overflow:hidden;
}
.pipeline-menu-item{
  display:flex;align-items:center;gap:10px;
  width:100%;padding:10px 16px;
  background:none;border:none;font-size:13.5px;
  text-align:left;cursor:pointer;
  color:var(--text-primary);
  transition:background .12s;
}
.pipeline-menu-item:hover{background:var(--bg-hover)}
.pipeline-menu-item.active{font-weight:700;color:var(--accent)}
.pipeline-menu-empty{padding:12px 16px;font-size:12px;color:var(--text-tertiary)}
.built-dot{
  width:7px;height:7px;border-radius:50%;
  background:var(--accent-green);flex-shrink:0;
  box-shadow:0 0 5px rgba(52,211,153,.5);
}
/* Dropdown transition */
.drop-enter-active{transition:opacity .15s,transform .15s cubic-bezier(.34,1.56,.64,1)}
.drop-leave-active{transition:opacity .1s,transform .1s ease}
.drop-enter-from,.drop-leave-to{opacity:0;transform:scale(.95) translateY(-6px)}

/* Engine btn */
.engine-btn{padding:6px 16px;border-radius:var(--radius-full);border:1px solid var(--border-subtle);background:var(--bg-card);font-size:13px;font-weight:600;cursor:pointer;transition:all var(--transition);display:flex;align-items:center;gap:6px}
.engine-btn:hover:not(:disabled){background:var(--bg-hover);border-color:var(--border-strong)}
.engine-btn:active:not(:disabled){transform:scale(.96)}
.engine-btn:disabled{opacity:.55;cursor:not-allowed}
.engine-btn--active{background:rgba(52,211,153,.1);border-color:rgba(52,211,153,.35);color:var(--accent-green)}
.engine-btn--loading{background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.3);color:var(--accent-yellow)}

/* View toggle */
.view-toggle-btn,.btn-icon-round{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-subtle);border-radius:var(--radius-md);background:transparent;cursor:pointer;color:var(--text-secondary);transition:all var(--transition)}
.view-toggle-btn:hover,.btn-icon-round:hover{background:var(--bg-hover);color:var(--text-primary)}
.view-toggle-btn.active,.btn-icon-round.active{background:var(--accent);border-color:var(--accent);color:#fff}

/* Spinner */
.spinner{width:11px;height:11px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* Badge */
.engine-badge{font-size:12px;padding:3px 11px;border-radius:var(--radius-full);display:flex;align-items:center;gap:5px}
.badge-dot{width:7px;height:7px;border-radius:50%}
.engine-badge--offline{background:var(--bg-input);color:var(--text-tertiary)}
.engine-badge--offline .badge-dot{background:var(--text-tertiary)}
.engine-badge--ready{background:rgba(52,211,153,.1);color:var(--accent-green)}
.engine-badge--ready .badge-dot{background:var(--accent-green);box-shadow:0 0 4px rgba(52,211,153,.6)}
.engine-badge--error{background:rgba(239,68,68,.1);color:var(--accent-red)}
.engine-badge--error .badge-dot{background:var(--accent-red)}
.engine-badge--initializing{background:rgba(251,191,36,.08);color:var(--accent-yellow)}
.engine-badge--initializing .badge-dot{background:var(--accent-yellow)}

/* Scroll area */
.chat-scroll-area{
  flex:1;overflow-y:auto;
  padding: 2.5rem max(1.5rem, calc(50% - 440px));
  display:flex;flex-direction:column;gap:1.8rem;
  scroll-behavior:smooth;
  background: var(--bg-base);
}
.chat-scroll-area::-webkit-scrollbar{width:5px}
.chat-scroll-area::-webkit-scrollbar-track{background:transparent}
.chat-scroll-area::-webkit-scrollbar-thumb{background:var(--border-subtle);border-radius:3px}

/* Empty state */
.chat-empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  flex:1;text-align:center;padding:40px 20px;
  animation:fadeUp .4s ease both;
}
.empty-logo{
  width:72px;height:72px;
  display:flex;align-items:center;justify-content:center;
  margin-bottom:24px;
  animation:floatLogo 3s ease-in-out infinite;
}
@keyframes floatLogo{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-6px)}
}
.greeting{font-size:32px;font-weight:800;margin:0 0 8px;letter-spacing:-.5px}
.greeting-gradient{
  background:linear-gradient(135deg,var(--accent),#5b9cf6);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;
}
.greeting-sub{font-size:15px;color:var(--text-tertiary);margin:0}
@keyframes fadeUp{
  from{opacity:0;transform:translateY(16px)}
  to{opacity:1;transform:translateY(0)}
}

/* Chat input */
.chat-input-wrapper{
  display:flex;flex-direction:column;align-items:center;
  padding:0 1.5rem 1.8rem;
  flex-shrink:0;
  background:var(--bg-base);
  z-index:10;
}
.chat-input-box{
  width:100%;max-width:900px;
  background:#f4f4f4;
  border-radius:30px;
  border:1px solid transparent;
  transition:background .2s,box-shadow .2s;
  display:flex;flex-direction:column;
}
.chat-input-box.focused{
  background:#fff;
  box-shadow:0 4px 12px rgba(0,0,0,.1);
  border-color:var(--border-subtle);
}
:root.dark .chat-input-box,
[data-theme=dark] .chat-input-box{
  background:var(--bg-surface);
}
:root.dark .chat-input-box.focused,
[data-theme=dark] .chat-input-box.focused{
  background:var(--bg-card);
  box-shadow:0 4px 16px rgba(0,0,0,.3);
}
.chat-textarea{
  width:100%;resize:none;border:none;background:transparent;
  padding:16px 22px 8px;
  font-size:1.05rem;color:var(--text-primary);font-family:inherit;
  line-height:1.6;outline:none;
  max-height:200px;min-height:56px;box-sizing:border-box;
  border-radius:30px;
}
.chat-textarea::placeholder{color:var(--text-tertiary)}
.chat-textarea:disabled{opacity:.6}
.chat-input-actions{
  display:flex;align-items:center;justify-content:space-between;
  padding:6px 10px 8px 14px;
}
.input-left-actions,.input-right-actions{display:flex;align-items:center;gap:6px}
.input-hint{
  font-size:10.5px;color:var(--text-tertiary);
  margin-top:6px;text-align:center;
}
.send-error{
  font-size:11.5px;color:var(--accent-red);
  margin-top:4px;text-align:center;
  animation:fadeUp .2s ease;
}

/* Bg mode */
.bg-mode-btn{display:flex;align-items:center;gap:5px;padding:4px 10px;border:1px solid var(--border-subtle);border-radius:var(--radius-full);background:transparent;font-size:11px;font-weight:500;cursor:pointer;transition:all var(--transition);color:var(--text-secondary)}
.bg-mode-btn:hover{background:var(--bg-hover);color:var(--text-primary)}
.bg-mode-btn.active{background:rgba(251,191,36,.1);border-color:rgba(251,191,36,.4);color:var(--accent-yellow)}

/* Send / Stop */
.btn-send{
  width:42px;height:42px;border-radius:50%;
  background:var(--text-primary);color:#fff;
  border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:opacity .2s,transform .15s;
}
.btn-send:hover:not(:disabled){opacity:.85;transform:scale(1.05)}
.btn-send:disabled{opacity:.4;cursor:not-allowed}
.btn-stop{
  width:42px;height:42px;border-radius:50%;
  background:var(--accent-red);color:#fff;
  border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:transform .15s;
}
.btn-stop:hover{transform:scale(1.05)}

/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(3px)}
.modal-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-xl);padding:24px;width:90%;box-shadow:var(--shadow-float)}
.modal-title{font-size:16px;font-weight:700;margin:0 0 16px;color:var(--text-primary)}
.modal-input{width:100%;padding:10px 14px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);background:var(--bg-input);color:var(--text-primary);font-size:14px;outline:none;box-sizing:border-box;transition:border-color var(--transition)}
.modal-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.btn-primary{padding:7px 18px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-md);font-size:13px;font-weight:600;cursor:pointer;transition:all var(--transition)}
.btn-primary:hover{background:var(--accent-hover);transform:scale(1.02)}
.btn-secondary{padding:7px 18px;background:var(--bg-input);color:var(--text-secondary);border:1px solid var(--border-subtle);border-radius:var(--radius-md);font-size:13px;font-weight:600;cursor:pointer;transition:all var(--transition)}
.btn-secondary:hover{background:var(--bg-hover);color:var(--text-primary)}

/* Input hint & error */
.input-hint{font-size:10.5px;color:var(--text-tertiary);margin-top:6px;text-align:center}
.send-error{font-size:11.5px;color:var(--accent-red);margin-top:4px;text-align:center;animation:fadeUp .2s ease}
</style>
