<template>
  <transition name="ai-slide">
    <div
      v-show="uiStore.aiPanelOpen"
      class="ai-panel"
      ref="panelEl"
      :style="panelWidthStyle"
    >
      <!-- Resizer -->
      <div class="ai-panel-resizer" ref="resizerEl" />

      <!-- Header -->
      <div class="ai-header">
        <div class="ai-header-left">
          <div class="ai-logo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>
          </div>
          <span class="ai-title">{{ t('builder_ai_assistant') }}</span>
        </div>
        <div class="ai-header-actions">
          <button v-if="view === 'chat'" class="ai-icon-btn" :title="t('builder_ai_back')" @click="enterHome">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button v-if="view === 'chat'" class="ai-icon-btn" :title="t('builder_ai_new_session')" @click="handleNewSession">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button
            v-if="view === 'chat' && currentMessages.length"
            class="ai-icon-btn ai-icon-btn--clear"
            :title="t('common_delete')"
            @click="clearCurrentSession"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
          <button
            class="ai-icon-btn"
            :class="{ active: settingsOpen }"
            :title="t('builder_ai_settings_title')"
            @click="settingsOpen = !settingsOpen"
          >
            <IconSettings :size="13" />
          </button>
          <button class="ai-icon-btn ai-icon-btn--close" @click="uiStore.aiPanelOpen = false">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <!-- Status bar -->
      <div class="ai-statusbar" :class="statusBarClass" @click="settingsOpen = true" style="cursor:pointer">
        <span class="ai-statusbar-dot" :class="{ loading: isLoading }" />
        <span class="ai-statusbar-text">
          <template v-if="isLoading">{{ t('builder_ai_status_loading') }}</template>
          <template v-else-if="isConnected">{{ connectionLabel }}</template>
          <template v-else-if="cfg.apiKey">{{ t('builder_ai_status_configured_pending') }}</template>
          <template v-else>{{ t('builder_ai_status_not_configured') }}</template>
        </span>
        <span v-if="isConnected" class="ai-model-chip">{{ cfg.model }}</span>
      </div>

      <!-- Settings drawer -->
      <transition name="ai-drawer">
        <div v-if="settingsOpen" class="ai-settings-drawer">
          <div class="ai-settings-header">
            <h4 class="ai-settings-title">{{ t('builder_ai_settings_title') }}</h4>
            <button class="ai-icon-btn" @click="settingsOpen = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="ai-settings-body">
            <div class="ai-settings-group">
              <label class="ai-settings-label">{{ t('builder_ai_settings_provider') }}</label>
              <select v-model="cfg.provider" class="ai-settings-input" @change="onProviderChange">
                <option value="openai">{{ t('builder_ai_provider_openai') }}</option>
                <option value="azure">{{ t('builder_ai_provider_azure') }}</option>
                <option value="anthropic">{{ t('builder_ai_provider_anthropic') }}</option>
                <option value="custom">{{ t('builder_ai_provider_custom') }}</option>
              </select>
            </div>
            <div class="ai-settings-group">
              <label class="ai-settings-label">{{ t('builder_ai_settings_base_url') }}</label>
              <input v-model="cfg.baseUrl" class="ai-settings-input" placeholder="https://api.openai.com/v1" />
            </div>
            <div class="ai-settings-group">
              <label class="ai-settings-label">{{ t('builder_ai_settings_api_key') }}</label>
              <div class="ai-settings-input-wrapper">
                <input
                  v-model="cfg.apiKey"
                  :type="showKey ? 'text' : 'password'"
                  class="ai-settings-input"
                  placeholder="sk-..."
                />
                <button class="ai-toggle-visibility" :title="t('builder_ai_toggle_visibility')" @click="showKey = !showKey">
                  <svg v-if="!showKey" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>
            </div>
            <div class="ai-settings-group">
              <label class="ai-settings-label">{{ t('builder_ai_settings_model') }}</label>
              <input v-model="cfg.model" class="ai-settings-input" placeholder="gpt-4o" />
            </div>
            <div class="ai-settings-actions">
              <button class="ai-save-btn" :disabled="testing" @click="onSaveAndTest">
                <span v-if="testing" class="ai-spinner" />
                <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {{ testing ? t('builder_ai_settings_testing') : t('builder_ai_settings_save_test') }}
              </button>
            </div>
            <div v-if="settingsStatus" class="ai-settings-status" :class="settingsStatusClass">{{ settingsStatus }}</div>
          </div>
        </div>
      </transition>

      <!-- Context banner -->
      <div class="ai-ctx-banner">
        <span class="ai-ctx-mode-dot" :style="{ background: ctxDotColor }" />
        <span class="ai-ctx-text">{{ contextLabel }}</span>
      </div>

      <!-- Main body -->
      <div class="ai-body">

        <!-- ===== HOME VIEW ===== -->
        <div v-show="view === 'home'" class="ai-home-view">
          <div class="ai-welcome">
            <div class="ai-welcome-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                <circle cx="7.5" cy="14.5" r="1.5"/>
                <circle cx="16.5" cy="14.5" r="1.5"/>
              </svg>
          </div>
            <h4 class="ai-welcome-title">{{ t('builder_ai_welcome_title') }}</h4>
          <p class="ai-welcome-desc">{{ t('builder_ai_welcome_desc') }}</p>
            <p class="ai-welcome-hint">{{ t('builder_ai_welcome_hint') }}</p>
            <div class="ai-starter-chips">
              <button
                v-for="chip in starterChips"
                :key="chip.labelKey"
                class="ai-starter-chip"
                @click="fillInput(t(chip.promptKey))"
              >
                <span class="ai-starter-chip-icon" v-html="chip.icon" />
                <span class="ai-starter-chip-text">{{ t(chip.labelKey) }}</span>
            </button>
          </div>
        </div>

          <!-- Recent sessions -->
          <div v-if="nonEmptySessions.length" class="ai-session-section">
            <div class="ai-section-header">
              <span class="ai-section-title">{{ t('builder_ai_recent') }}</span>
              <button class="ai-text-btn ai-text-btn--danger" :title="t('builder_ai_delete_all_sessions')" @click="deleteAllSessions">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
            <div class="ai-session-list">
              <div
                v-for="session in nonEmptySessions"
                :key="session.id"
                class="ai-session-item"
                :class="{ active: session.id === currentSessionId }"
                @click="switchSession(session.id)"
              >
                <div class="ai-session-content">
                  <div class="ai-session-title-text">{{ session.title || t('builder_ai_session_new') }}</div>
                  <div class="ai-session-meta">{{ formatTime(session.updatedAt) }}</div>
                </div>
                <button
                  class="ai-session-delete-btn"
                  :title="t('builder_ai_delete_session')"
                  @click.stop="deleteSession(session.id)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            </div>
          </div>
          <div v-else class="ai-session-empty">{{ t('builder_ai_sessions_empty') }}</div>
        </div>

        <!-- ===== CHAT VIEW ===== -->
        <div v-show="view === 'chat'" class="ai-chat-view">
          <div class="ai-messages" ref="msgsEl">
            <div v-if="!currentMessages.length" class="ai-chat-empty">
              <p>{{ t('builder_ai_chat_empty') }}</p>
            </div>
            <template v-for="msg in currentMessages" :key="msg.id">
              <div v-if="msg.role === 'user'" class="ai-msg ai-msg--user">
                <div class="ai-msg-bubble ai-msg-bubble--user">
                  <span class="ai-msg-text">{{ msg.content }}</span>
                </div>
              </div>
              <div v-else class="ai-msg ai-msg--assistant">
                <div class="ai-msg-bubble ai-msg-bubble--assistant">
                  <div v-if="msg.streaming && !msg.content" class="ai-typing">
                    <span /><span /><span />
                  </div>
                  <div v-else class="ai-msg-markdown" v-html="renderMarkdown(msg.content)" />
                  <div v-if="msg.error" class="ai-msg-error">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {{ msg.error }}
                    <button class="ai-retry-btn" @click="retryLastMessage">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                      {{ t('common_retry') }}
                    </button>
                  </div>
                  <div v-if="msg.actions && msg.actions.length" class="ai-actions">
                    <div
                      v-for="(action, ai) in msg.actions"
                      :key="ai"
                      class="ai-action-card"
                      :class="{ applied: action.applied, rejected: action.rejected }"
                    >
                <div class="ai-action-header">
                  <span class="ai-action-type">
                          <span class="ai-action-type-icon" v-html="actionIcon(action)" />
                          {{ actionLabel(action) }}
                  </span>
                        <span v-if="action.applied" class="ai-action-badge ai-action-badge--applied">{{ t('builder_ai_action_applied') }}</span>
                        <span v-else-if="action.rejected" class="ai-action-badge ai-action-badge--rejected">{{ t('builder_ai_action_rejected') }}</span>
                        <div v-else class="ai-action-btns">
                          <button class="ai-action-btn ai-action-btn--apply" @click="applyAction(msg, action)">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            {{ t('common_apply') }}
                          </button>
                          <button class="ai-action-btn ai-action-btn--reject" @click="rejectAction(msg, action)">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </div>
                      <div v-if="action.preview" class="ai-action-preview">{{ action.preview }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

      </div>

      <!-- ===== PERSISTENT INPUT AREA ===== -->
      <div class="ai-input-area">
        <div class="ai-input-row" :class="{ focused: inputFocused }">
          <textarea
            ref="inputEl"
            v-model="inputText"
            class="ai-input"
            :placeholder="t('builder_ai_input_placeholder')"
            rows="1"
            @keydown.enter.exact.prevent="sendMessage"
            @keydown.enter.shift.exact="() => {}"
            @input="autoResize"
            @focus="inputFocused = true"
            @blur="inputFocused = false"
          />
          <button
            class="ai-send-btn"
            :class="{ active: inputText.trim() && !isStreaming }"
            :disabled="!inputText.trim() || isStreaming"
            @click="sendMessage"
          >
            <svg v-if="!isStreaming" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <span v-else class="ai-spinner" />
            </button>
        </div>
        <div class="ai-input-hint">{{ inputHint }}</div>
      </div>

    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui.js'
import { usePipelineStore } from '@/stores/pipeline.js'
import { useMarkdown } from '@/composables/useMarkdown.js'
import { streamAiChat, aiApi } from '@/api/ai.js'
import { promptsApi } from '@/api/prompts.js'
import IconSettings from '@/components/icons/IconSettings.vue'

const { t } = useI18n()
const uiStore = useUiStore()
const pipelineStore = usePipelineStore()
const { render: renderMarkdown } = useMarkdown()

// ── Panel resize ────────────────────────────────────────────────────────────
const panelEl = ref(null)
const resizerEl = ref(null)
const panelWidth = ref(360)
const panelWidthStyle = computed(() => ({ width: panelWidth.value + 'px' }))

onMounted(() => {
  const resizer = resizerEl.value
  if (!resizer) return
  let startX = 0, startW = 0
  const onMove = (e) => {
    const dx = startX - e.clientX
    panelWidth.value = Math.max(280, Math.min(startW + dx, 700))
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  resizer.addEventListener('mousedown', (e) => {
    startX = e.clientX
    startW = panelWidth.value
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    e.preventDefault()
  })

  // Auto-test connection on mount if API key already configured (mirrors original UI)
  if (cfg.value.apiKey) {
    aiApi.test(cfg.value).then(res => {
      if (res?.success) isConnected.value = true
    }).catch(() => {})
  }
})

// ── Settings ─────────────────────────────────────────────────────────────────
const settingsOpen = ref(false)
const showKey = ref(false)
const testing = ref(false)
const settingsStatus = ref('')
const settingsStatusClass = ref('')

const cfg = ref({ ...uiStore.aiSettings })
watch(() => uiStore.aiSettings, (v) => { cfg.value = { ...v } }, { deep: true })

const PROVIDER_DEFAULTS = {
  openai:    { baseUrl: 'https://api.openai.com/v1',           model: 'gpt-4o' },
  azure:     { baseUrl: 'https://<resource>.openai.azure.com', model: 'gpt-4o' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1',        model: 'claude-3-5-sonnet-20241022' },
  custom:    { baseUrl: '',                                     model: '' }}

function onProviderChange() {
  const defaults = PROVIDER_DEFAULTS[cfg.value.provider] ?? PROVIDER_DEFAULTS.openai
  cfg.value.baseUrl = defaults.baseUrl
  cfg.value.model   = defaults.model
}

async function onSaveAndTest() {
  if (!cfg.value.apiKey) {
    settingsStatus.value = t('builder_ai_settings_api_key_required')
    settingsStatusClass.value = 'error'
    return
  }
  uiStore.aiSettings = { ...cfg.value }
  testing.value = true
  settingsStatus.value = ''
  try {
    const res = await aiApi.test(cfg.value)
    if (res.success) {
      isConnected.value = true
      settingsStatus.value = t('builder_ai_settings_connection_success').replace('{model}', cfg.value.model)
      settingsStatusClass.value = 'success'
    } else {
      isConnected.value = false
      settingsStatus.value = t('builder_ai_settings_connection_failed').replace('{error}', res.error ?? 'Unknown')
      settingsStatusClass.value = 'error'
    }
  } catch (e) {
    isConnected.value = false
    settingsStatus.value = t('builder_ai_settings_connection_failed').replace('{error}', e.message ?? String(e))
    settingsStatusClass.value = 'error'
  } finally {
    testing.value = false
  }
}

// ── Connection state ─────────────────────────────────────────────────────────
const isConnected = ref(false)
const isLoading = ref(false)

const connectionLabel = computed(() =>
  t('builder_ai_status_connected').replace('{model}', cfg.value.model)
)
const providerShort = computed(() => ({
  openai: 'OpenAI', azure: 'Azure', anthropic: 'Anthropic', custom: 'Custom'
})[cfg.value.provider] ?? cfg.value.provider)

const statusBarClass = computed(() => ({
  'ai-statusbar--connected': isConnected.value,
  'ai-statusbar--loading':   isLoading.value,
  'ai-statusbar--error':     !isConnected.value && !!cfg.value.apiKey && !isLoading.value}))

// ── Context banner ────────────────────────────────────────────────────────────
const CTX_COLORS = {
  pipeline:   '#6366f1',
  parameters: '#f59e0b',
  prompts:    '#10b981',
  none:       '#94a3b8'}

const ctxDotColor = computed(() => CTX_COLORS[uiStore.builderMode] ?? CTX_COLORS.none)

// Full context label — mirrors original describeAIContext exactly
// Build the string directly (no i18n interpolation) to guarantee reactivity
const contextLabel = computed(() => {
  const mode     = uiStore.builderMode
  const pipeline = pipelineStore.builderSelected
  const promptFile = uiStore.activePromptFile

  if (mode === 'prompts') {
    if (promptFile) {
      const filename = String(promptFile).split('/').pop()
      return uiStore.language === 'zh'
        ? `正在编辑提示词：${filename}`
        : `Editing Prompt: ${filename}`
    }
    return uiStore.language === 'zh' ? '提示词面板' : 'Prompt panel'
  }
  if (mode === 'parameters') {
    if (pipeline) {
      return uiStore.language === 'zh'
        ? `正在编辑参数：${pipeline}`
        : `Editing Parameters for ${pipeline}`
    }
    return uiStore.language === 'zh' ? '参数面板（未选择 Pipeline）' : 'Parameters panel (no pipeline selected)'
  }
  if (mode === 'pipeline') {
    if (pipeline) {
      return uiStore.language === 'zh'
        ? `正在编辑 Pipeline YAML：${pipeline}`
        : `Editing Pipeline YAML: ${pipeline}`
    }
    return uiStore.language === 'zh' ? 'Pipeline 画布' : 'Pipeline canvas'
  }
  return uiStore.language === 'zh' ? '无活动上下文' : 'No active context'
})

// ── Starter chips ─────────────────────────────────────────────────────────────
const CHIPS = {
  pipeline: [
    { labelKey: 'builder_ai_chip_pipeline_reranker', promptKey: 'builder_ai_chip_pipeline_reranker', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
    { labelKey: 'builder_ai_chip_pipeline_explain',  promptKey: 'builder_ai_chip_pipeline_explain',  icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' },
    { labelKey: 'builder_ai_chip_pipeline_prompt',   promptKey: 'builder_ai_chip_pipeline_prompt',   icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>' },
    { labelKey: 'builder_ai_chip_pipeline_ircot',    promptKey: 'builder_ai_chip_pipeline_ircot',    icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>' }],
  parameters: [
    { labelKey: 'builder_ai_chip_param_topk',  promptKey: 'builder_ai_chip_param_topk',  icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' },
    { labelKey: 'builder_ai_chip_param_chunk', promptKey: 'builder_ai_chip_param_chunk', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
    { labelKey: 'builder_ai_chip_param_code',  promptKey: 'builder_ai_chip_param_code',  icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' },
    { labelKey: 'builder_ai_chip_param_temp',  promptKey: 'builder_ai_chip_param_temp',  icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>' }],
  prompts: [
    { labelKey: 'builder_ai_chip_prompt_rewrite', promptKey: 'builder_ai_chip_prompt_rewrite', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' },
    { labelKey: 'builder_ai_chip_prompt_domain', promptKey: 'builder_ai_chip_prompt_domain', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' },
    { labelKey: 'builder_ai_chip_prompt_cot',    promptKey: 'builder_ai_chip_prompt_cot',    icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>' },
    { labelKey: 'builder_ai_chip_prompt_rag',    promptKey: 'builder_ai_chip_prompt_rag',    icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' }]}

const starterChips = computed(() => CHIPS[uiStore.builderMode] ?? CHIPS.pipeline)

// ── Session management ─────────────────────────────────────────────────────────
const AI_SESSIONS_KEY = 'ai_assistant_sessions'
const AI_CURRENT_KEY  = 'ai_assistant_current_session'

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(AI_SESSIONS_KEY) ?? '[]') } catch { return [] }
}
function saveSessions(s) {
  try { localStorage.setItem(AI_SESSIONS_KEY, JSON.stringify(s)) } catch {}
}
function loadCurrentId() { return localStorage.getItem(AI_CURRENT_KEY) ?? null }
function saveCurrentId(id) {
  if (id) localStorage.setItem(AI_CURRENT_KEY, id)
  else localStorage.removeItem(AI_CURRENT_KEY)
}

const sessions       = ref(loadSessions())
const currentSessionId = ref(loadCurrentId())

watch(sessions,         (v) => saveSessions(v),  { deep: true })
watch(currentSessionId, (v) => saveCurrentId(v))

const currentSession = computed(() =>
  sessions.value.find(s => s.id === currentSessionId.value) ?? null
)
const currentMessages = computed(() => currentSession.value?.messages ?? [])
const nonEmptySessions = computed(() =>
  sessions.value
    .filter(s => s.messages && s.messages.length > 0)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
)

function createSession() {
  const id = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const session = { id, title: '', messages: [], conversationHistory: [], createdAt: Date.now(), updatedAt: Date.now() }
  sessions.value.unshift(session)
  if (sessions.value.length > 30) sessions.value = sessions.value.slice(0, 30)
  currentSessionId.value = id
  return session
}

function ensureSession() {
  if (!currentSession.value) createSession()
  return currentSession.value
}

function deleteSession(id) {
  const idx = sessions.value.findIndex(s => s.id === id)
  if (idx !== -1) sessions.value.splice(idx, 1)
  if (currentSessionId.value === id)
    currentSessionId.value = sessions.value[0]?.id ?? null
}

function deleteAllSessions() {
  sessions.value = []
  currentSessionId.value = null
}

function switchSession(id) {
  currentSessionId.value = id
  view.value = 'chat'
  nextTick(scrollToBottom)
}

function addMessage(msg) {
  const session = ensureSession()
  session.messages.push(msg)
  session.updatedAt = Date.now()
  if (!session.title && msg.role === 'user')
    session.title = msg.content.slice(0, 40)
}

function updateLastAssistantMsg(patch) {
  const session = currentSession.value
  if (!session) return
  const msgs = session.messages
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'assistant') {
      // Replace the element so Vue's reactivity detects the change on the array
      msgs.splice(i, 1, { ...msgs[i], ...patch })
      session.updatedAt = Date.now()
      return
    }
  }
}

// ── View state ────────────────────────────────────────────────────────────────
const view = ref('home')

function enterHome() { view.value = 'home' }

function handleNewSession() {
  createSession()
  view.value = 'chat'
}

function clearCurrentSession() {
  const session = currentSession.value
  if (session) {
    session.messages = []
    session.conversationHistory = []
    session.updatedAt = Date.now()
  }
}

// ── Input ─────────────────────────────────────────────────────────────────────
const inputEl    = ref(null)
const inputText  = ref('')
const inputFocused = ref(false)
const isStreaming = ref(false)
const msgsEl     = ref(null)
let   abortController = null

function autoResize() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 140) + 'px'
}

function scrollToBottom() {
  nextTick(() => {
    const el = msgsEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

const inputHint = computed(() =>
  uiStore.language === 'zh'
    ? 'Enter 发送 · Shift+Enter 换行'
    : 'Enter to send · Shift+Enter for newline'
)

// Fill input from chip click (stay on home, user can review before sending)
function fillInput(text) {
  inputText.value = text
  nextTick(() => {
    autoResize()
    inputEl.value?.focus()
  })
}

// ── Build context payload ─────────────────────────────────────────────────────
function buildContext() {
  const mode = uiStore.builderMode
  const ctx = { currentMode: mode }
  if (pipelineStore.builderSelected) {
    ctx.selectedPipeline = pipelineStore.builderSelected
    if (pipelineStore.yaml) ctx.pipelineYaml = pipelineStore.yaml
    if (Object.keys(pipelineStore.parameters ?? {}).length) ctx.parameters = pipelineStore.parameters
  }
  if (mode === 'prompts' && uiStore.activePromptFile) {
    ctx.currentPromptFile = uiStore.activePromptFile
    if (uiStore.activePromptContent) ctx.promptContent = uiStore.activePromptContent
  }
  return ctx
}

// ── Send message ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return
  if (!cfg.value.apiKey) { settingsOpen.value = true; return }

  view.value = 'chat'
  ensureSession()

  // Add user message to display + conversationHistory (mirrors original addToHistory: true)
  const userMsg = { id: `u_${Date.now()}`, role: 'user', content: text }
  addMessage(userMsg)
  const session = currentSession.value
  if (session) session.conversationHistory.push({ role: 'user', content: text })

  inputText.value = ''
  nextTick(autoResize)
  scrollToBottom()

  // Add empty streaming placeholder
  const assistantMsg = { id: `a_${Date.now()}`, role: 'assistant', content: '', streaming: true, error: null, actions: [] }
  addMessage(assistantMsg)
  scrollToBottom()

  isStreaming.value = true
  isLoading.value   = true

  // Send only conversationHistory (completed turns) — exactly like original
  const history = session?.conversationHistory ?? []

  const payload = {
    messages: history,
    settings: { ...cfg.value },
    context: buildContext(),
    stream: true
  }

  let accumulated = ''
  abortController = streamAiChat(payload, {
    onToken(token) {
      accumulated += token
      updateLastAssistantMsg({ content: accumulated, streaming: true })
      scrollToBottom()
    },
    onDone(actions) {
      const finalText = accumulated || ''
      updateLastAssistantMsg({ content: finalText, streaming: false, actions: actions ?? [] })
      // Add completed assistant reply to conversationHistory
      if (currentSession.value && finalText) {
        currentSession.value.conversationHistory.push({ role: 'assistant', content: finalText })
      }
      isStreaming.value = false
      isLoading.value   = false
      scrollToBottom()
    },
    onError(err) {
      updateLastAssistantMsg({ streaming: false, error: err })
      isStreaming.value = false
      isLoading.value   = false
    }
  })
}

async function retryLastMessage() {
  const session = currentSession.value
  if (!session) return
  const msgs = session.messages
  const lastAssIdx = msgs.map(m => m.role).lastIndexOf('assistant')
  if (lastAssIdx !== -1 && msgs[lastAssIdx].error) msgs.splice(lastAssIdx, 1)
  // Also remove last assistant entry from conversationHistory
  const hist = session.conversationHistory
  if (hist.length && hist[hist.length - 1].role === 'assistant') hist.pop()
  const lastUser = [...msgs].reverse().find(m => m.role === 'user')
  if (!lastUser) return
  // Remove last user from conversationHistory too (sendMessage will re-add it)
  if (hist.length && hist[hist.length - 1].role === 'user') hist.pop()
  inputText.value = lastUser.content
  // Also remove the user message from display so sendMessage re-adds it cleanly
  const lastUserIdx = msgs.map(m => m.role).lastIndexOf('user')
  if (lastUserIdx !== -1) msgs.splice(lastUserIdx, 1)
  await sendMessage()
}

// ── Action handlers ───────────────────────────────────────────────────────────
function actionIcon(action) {
  if (action.type === 'modify_pipeline')  return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
  if (action.type === 'modify_prompt')    return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>'
  if (action.type === 'modify_parameter') return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>'
  return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'
}

function actionLabel(action) {
  const map = {
    modify_pipeline:  'builder_ai_action_modify_pipeline',
    modify_prompt:    'builder_ai_action_modify_prompt',
    modify_parameter: 'builder_ai_action_modify_parameter',
  }
  return t(map[action.type] ?? 'builder_ai_action_modify_generic')
}

function applyAction(msg, action) {
  try {
    if (action.type === 'modify_pipeline' && action.content) {
      pipelineStore.setYaml(action.content)
      uiStore.setBuilderMode('pipeline')
      action.applied  = true
      action.rejected = false
    } else if (action.type === 'modify_prompt' && action.content) {
      // Push content into PromptsPanel via store trigger — PromptsPanel will save + update editor
      const filepath = action.filename || uiStore.activePromptFile
      if (filepath) {
        uiStore.promptApplyTrigger = { filepath, content: action.content, ts: Date.now() }
    uiStore.setBuilderMode('prompts')
      }
      action.applied  = true
      action.rejected = false
    } else if (action.type === 'modify_parameter' && action.path && action.value !== undefined) {
      const parts = action.path.split('.')
      let obj = pipelineStore.parameters
      for (let i = 0; i < parts.length - 1; i++) {
        if (obj[parts[i]] === undefined) obj[parts[i]] = {}
        obj = obj[parts[i]]
      }
      obj[parts[parts.length - 1]] = action.value
      uiStore.setBuilderMode('parameters')
      action.applied  = true
      action.rejected = false
    }
  } catch (e) { console.error('Failed to apply action:', e) }
}

function rejectAction(msg, action) {
  action.rejected = true
  action.applied  = false
}

// ── Time formatting ───────────────────────────────────────────────────────────
function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now - d
  const diffMins  = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays  = Math.floor(diffMs / 86400000)
  if (diffMins  < 1)  return 'just now'
  if (diffMins  < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays  < 7)  return `${diffDays}d ago`
  return d.toLocaleDateString()
}

onUnmounted(() => { abortController?.abort() })
</script>

<style scoped>
/* ── Panel shell ─────────────────────────────────────────────────────────── */
.ai-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-card);
  border-left: 1px solid var(--border-subtle);
  overflow: hidden;
  flex-shrink: 0;
  z-index: 40;
}
.ai-slide-enter-active, .ai-slide-leave-active { transition: width .22s cubic-bezier(.4,0,.2,1), opacity .18s; }
.ai-slide-enter-from, .ai-slide-leave-to { width: 0 !important; opacity: 0; }

.ai-panel-resizer {
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  cursor: col-resize; z-index: 10; background: transparent; transition: background .15s;
}
.ai-panel-resizer:hover { background: var(--accent); opacity: .4; }

/* ── Header ─────────────────────────────────────────────────────────────── */
.ai-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 10px 0 14px; height: 42px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0; background: var(--bg-surface);
}
.ai-header-left    { display: flex; align-items: center; gap: 8px; }
.ai-header-actions { display: flex; align-items: center; gap: 2px; }
.ai-logo {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--accent) 0%, #818cf8 100%);
  border-radius: 6px; color: #fff; flex-shrink: 0;
}
.ai-title { font-size: 13px; font-weight: 700; color: var(--text-primary); letter-spacing: -.01em; }

.ai-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border: none; background: none;
  border-radius: var(--radius-sm); cursor: pointer; color: var(--text-tertiary);
  transition: background var(--transition), color var(--transition);
}
.ai-icon-btn:hover        { background: var(--bg-hover); color: var(--text-primary); }
.ai-icon-btn.active       { background: rgba(99,102,241,.12); color: var(--accent); }
.ai-icon-btn--close:hover { color: var(--accent-red); }
.ai-icon-btn--clear:hover { color: var(--accent-red); }

/* ── Status bar ─────────────────────────────────────────────────────────── */
.ai-statusbar {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 12px; border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface); flex-shrink: 0; transition: background var(--transition);
}
.ai-statusbar--connected { background: rgba(16,185,129,.06); }
.ai-statusbar--error     { background: rgba(239,68,68,.06); }

.ai-statusbar-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
  background: var(--border-strong); transition: background .3s;
}
.ai-statusbar--connected .ai-statusbar-dot { background: #10b981; }
.ai-statusbar--error     .ai-statusbar-dot { background: var(--accent-red); }
.ai-statusbar-dot.loading {
  background: var(--accent);
  animation: pulse-dot 1s ease-in-out infinite;
}
@keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
.ai-statusbar-text { font-size: 11.5px; color: var(--text-secondary); flex: 1; }
.ai-model-chip {
  font-size: 10.5px; font-weight: 700; padding: 1px 7px;
  border-radius: var(--radius-full); background: rgba(99,102,241,.1); color: var(--accent);
  letter-spacing: .02em;
}

/* ── Settings drawer ────────────────────────────────────────────────────── */
.ai-settings-drawer {
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface); flex-shrink: 0; overflow-y: auto; max-height: 360px;
}
.ai-drawer-enter-active, .ai-drawer-leave-active { transition: max-height .2s ease, opacity .15s; overflow: hidden; }
.ai-drawer-enter-from, .ai-drawer-leave-to { max-height: 0; opacity: 0; }
.ai-settings-header {
  display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 6px;
}
.ai-settings-title { font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
.ai-settings-body  { padding: 0 14px 12px; display: flex; flex-direction: column; gap: 9px; }
.ai-settings-group { display: flex; flex-direction: column; gap: 4px; }
.ai-settings-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); }
.ai-settings-input {
  width: 100%; padding: 6px 9px;
  border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);
  background: var(--bg-card); color: var(--text-primary); font-size: 12px;
  outline: none; box-sizing: border-box; transition: border-color var(--transition);
}
.ai-settings-input:focus { border-color: var(--accent); }
.ai-settings-input-wrapper { position: relative; display: flex; }
.ai-settings-input-wrapper .ai-settings-input { padding-right: 32px; }
.ai-toggle-visibility {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: var(--text-tertiary); display: flex; align-items: center; padding: 2px;
}
.ai-toggle-visibility:hover { color: var(--text-primary); }
.ai-settings-actions { padding-top: 2px; }
.ai-save-btn {
  display: flex; align-items: center; gap: 6px; padding: 7px 14px;
  border: none; border-radius: var(--radius-sm);
  background: var(--accent); color: #fff;
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: opacity var(--transition); width: 100%; justify-content: center;
}
.ai-save-btn:hover:not(:disabled) { opacity: .88; }
.ai-save-btn:disabled { opacity: .5; cursor: not-allowed; }
.ai-settings-status { font-size: 11.5px; padding: 5px 8px; border-radius: var(--radius-sm); font-weight: 500; }
.ai-settings-status.success { background: rgba(16,185,129,.1); color: #059669; }
.ai-settings-status.error   { background: rgba(239,68,68,.1);  color: var(--accent-red); }

/* ── Context banner ─────────────────────────────────────────────────────── */
.ai-ctx-banner {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 12px; border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface); flex-shrink: 0;
}
.ai-ctx-mode-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; transition: background .3s; }
.ai-ctx-text {
  font-size: 11px; color: var(--text-secondary); font-weight: 500;
  flex: 1; word-break: break-all;
}

/* ── Body (home + chat share this scrollable area) ──────────────────────── */
.ai-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }

/* ── Home view ──────────────────────────────────────────────────────────── */
.ai-home-view {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column;
  padding: 16px 14px; gap: 20px;
}
.ai-welcome {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 8px; padding: 12px 0 4px;
}
.ai-welcome-icon {
  width: 52px; height: 52px; display: flex; align-items: center; justify-content: center;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(99,102,241,.15) 0%, rgba(129,140,248,.1) 100%);
  color: var(--accent); margin-bottom: 4px;
}
.ai-welcome-title { font-size: 15px; font-weight: 800; color: var(--text-primary); letter-spacing: -.02em; margin: 0; }
.ai-welcome-desc  { font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.5; max-width: 240px; }
.ai-welcome-hint  { font-size: 11px; color: var(--text-tertiary); margin: 0; }

.ai-starter-chips { display: flex; flex-direction: column; gap: 6px; width: 100%; margin-top: 4px; }
.ai-starter-chip {
  display: flex; align-items: center; gap: 9px; padding: 8px 12px;
  border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
  background: var(--bg-surface); cursor: pointer; text-align: left;
  transition: all var(--transition); width: 100%;
}
.ai-starter-chip:hover { border-color: var(--accent); background: rgba(99,102,241,.05); transform: translateX(2px); }
.ai-starter-chip-icon { color: var(--accent); flex-shrink: 0; display: flex; align-items: center; }
.ai-starter-chip-text { font-size: 12px; color: var(--text-secondary); font-weight: 500; line-height: 1.4; }

/* ── Session list ───────────────────────────────────────────────────────── */
.ai-session-section { display: flex; flex-direction: column; gap: 6px; }
.ai-section-header {
  display: flex; align-items: center; justify-content: space-between; padding: 0 2px;
}
.ai-section-title { font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .06em; }
.ai-text-btn {
  background: none; border: none; cursor: pointer;
  font-size: 11px; color: var(--text-tertiary);
  display: flex; align-items: center; gap: 4px;
  padding: 2px 6px; border-radius: var(--radius-sm); transition: all var(--transition);
}
.ai-text-btn:hover { background: var(--bg-hover); }
.ai-text-btn--danger:hover { color: var(--accent-red); background: rgba(239,68,68,.08); }

.ai-session-list { display: flex; flex-direction: column; gap: 2px; }
.ai-session-item {
  display: flex; align-items: center; padding: 8px 10px;
  border-radius: var(--radius-sm); cursor: pointer;
  border: 1px solid transparent; transition: all var(--transition); gap: 8px;
}
.ai-session-item:hover { background: var(--bg-hover); }
.ai-session-item.active { background: var(--bg-active); border-color: var(--border-subtle); }
.ai-session-item:hover .ai-session-delete-btn { opacity: 1; }
.ai-session-content { flex: 1; min-width: 0; }
.ai-session-title-text {
  font-size: 12.5px; font-weight: 500; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ai-session-meta { font-size: 10.5px; color: var(--text-tertiary); margin-top: 1px; }
.ai-session-delete-btn {
  background: none; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: var(--radius-sm);
  color: var(--text-tertiary); opacity: 0; transition: all var(--transition); flex-shrink: 0;
}
.ai-session-delete-btn:hover { background: rgba(239,68,68,.1); color: var(--accent-red); }
.ai-session-empty { font-size: 12px; color: var(--text-tertiary); text-align: center; padding: 16px 0; }

/* ── Chat view ──────────────────────────────────────────────────────────── */
.ai-chat-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
.ai-messages {
  flex: 1; overflow-y: auto; padding: 14px 12px;
  display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth;
}
.ai-chat-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--text-tertiary); font-size: 12.5px;
}

.ai-msg { display: flex; flex-direction: column; }
.ai-msg--user      { align-items: flex-end; }
.ai-msg--assistant { align-items: flex-start; }

.ai-msg-bubble {
  max-width: 88%; padding: 9px 12px; border-radius: 12px;
  font-size: 13px; line-height: 1.55; word-break: break-word;
}
.ai-msg-bubble--user {
  background: var(--accent); color: #fff; border-bottom-right-radius: 3px;
}
.ai-msg-bubble--assistant {
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  color: var(--text-primary); border-bottom-left-radius: 3px; max-width: 100%; width: 100%;
}
.ai-msg-text { white-space: pre-wrap; }

.ai-msg-markdown { font-size: 13px; line-height: 1.6; }
.ai-msg-markdown :deep(p)    { margin: 0 0 6px; }
.ai-msg-markdown :deep(p:last-child) { margin-bottom: 0; }
.ai-msg-markdown :deep(pre)  { background: var(--bg-input); border-radius: 6px; padding: 10px 12px; overflow-x: auto; margin: 6px 0; }
.ai-msg-markdown :deep(code) { font-family: var(--font-mono); font-size: 12px; background: var(--bg-input); padding: 1px 5px; border-radius: 4px; }
.ai-msg-markdown :deep(pre code) { background: none; padding: 0; }
.ai-msg-markdown :deep(ul), .ai-msg-markdown :deep(ol) { padding-left: 18px; margin: 4px 0; }
.ai-msg-markdown :deep(li) { margin-bottom: 2px; }
.ai-msg-markdown :deep(h1),.ai-msg-markdown :deep(h2),.ai-msg-markdown :deep(h3) { margin: 8px 0 4px; font-size: 13px; }
.ai-msg-markdown :deep(blockquote) { border-left: 3px solid var(--accent); margin: 6px 0; padding: 4px 10px; color: var(--text-secondary); }

.ai-typing { display: flex; gap: 5px; align-items: center; padding: 4px 2px; }
.ai-typing span {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent); opacity: .4;
  animation: bounce-dot 1.2s ease-in-out infinite;
}
.ai-typing span:nth-child(2) { animation-delay: .2s; }
.ai-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce-dot {
    0%,80%,100% { transform: translateY(0); opacity: .4; }
  40%          { transform: translateY(-5px); opacity: 1; }
}

.ai-msg-error {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-top: 8px; padding: 7px 10px;
  background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2);
  border-radius: var(--radius-sm); font-size: 12px; color: var(--accent-red);
}
.ai-retry-btn {
  display: flex; align-items: center; gap: 4px;
  background: none; border: 1px solid currentColor;
  border-radius: var(--radius-sm); font-size: 11px; color: var(--accent-red);
  cursor: pointer; padding: 2px 8px; transition: all var(--transition);
}
.ai-retry-btn:hover { background: rgba(239,68,68,.1); }

/* Action cards */
.ai-actions { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.ai-action-card {
  border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
  overflow: hidden; transition: border-color var(--transition);
}
.ai-action-card.applied  { border-color: rgba(16,185,129,.4); background: rgba(16,185,129,.04); }
.ai-action-card.rejected { border-color: rgba(239,68,68,.3); opacity: .6; }
.ai-action-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 10px; background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle); gap: 8px;
}
.ai-action-type { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--text-secondary); }
.ai-action-type-icon { display: flex; align-items: center; color: var(--accent); }
.ai-action-badge { font-size: 10.5px; font-weight: 700; padding: 1px 8px; border-radius: var(--radius-full); }
.ai-action-badge--applied  { background: rgba(16,185,129,.12); color: #059669; }
.ai-action-badge--rejected { background: rgba(239,68,68,.1); color: var(--accent-red); }
.ai-action-btns { display: flex; gap: 4px; }
.ai-action-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: var(--radius-sm);
  font-size: 11px; font-weight: 600; cursor: pointer; transition: all var(--transition);
}
.ai-action-btn--apply { border: 1px solid rgba(16,185,129,.4); background: rgba(16,185,129,.08); color: #059669; }
.ai-action-btn--apply:hover { background: rgba(16,185,129,.18); }
.ai-action-btn--reject { border: 1px solid var(--border-subtle); background: none; color: var(--text-tertiary); }
.ai-action-btn--reject:hover { background: rgba(239,68,68,.08); color: var(--accent-red); border-color: rgba(239,68,68,.3); }
.ai-action-preview {
  padding: 8px 10px; font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary);
  white-space: pre-wrap; word-break: break-all; max-height: 120px; overflow-y: auto;
  background: var(--bg-card);
}

/* ── Persistent input area ───────────────────────────────────────────────── */
.ai-input-area {
  padding: 8px 10px 10px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-card);
  flex-shrink: 0;
}
.ai-input-row {
  display: flex; align-items: flex-end; gap: 6px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 6px 6px 6px 10px;
  transition: border-color var(--transition);
}
.ai-input-row.focused,
.ai-input-row:focus-within { border-color: var(--accent); }
.ai-input {
  flex: 1; border: none; outline: none; resize: none;
  background: transparent; color: var(--text-primary);
  font-size: 13px; line-height: 1.5; font-family: inherit;
  min-height: 22px; max-height: 140px; overflow-y: auto;
}
.ai-input::placeholder { color: var(--text-tertiary); }
.ai-send-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; flex-shrink: 0;
  border: none; border-radius: var(--radius-sm);
  background: var(--bg-hover); color: var(--text-tertiary);
  cursor: pointer; transition: all var(--transition);
}
.ai-send-btn.active,
.ai-send-btn:not(:disabled):hover { background: var(--accent); color: #fff; }
.ai-send-btn:disabled { opacity: .35; cursor: not-allowed; }
.ai-input-hint {
  font-size: 10px; color: var(--text-tertiary);
  text-align: right; padding-top: 4px; padding-right: 2px;
  opacity: 0.7;
}

/* Shared spinner */
.ai-spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid currentColor; border-top-color: transparent;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style> 
