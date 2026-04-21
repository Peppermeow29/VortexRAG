<template>
  <div class="builder-root full-height flex-col">

    <!-- Top navbar: mirrors original builder-navbar -->
    <nav class="builder-navbar">
      <div class="navbar-inner">
        <!-- Left: Logo + brand -->
        <div class="navbar-left" @click="$router.push('/chat')" style="cursor:pointer">
          <span class="navbar-logo-icon">
            <LogoIcon :size="28" />
          </span>
          <span class="navbar-brand">Vortex<span class="navbar-brand-rag">RAG</span></span>
        </div>

        <!-- Center: current mode badge -->
        <div class="navbar-center">
          <span class="navbar-mode-badge">
            <span class="navbar-mode-dot" :style="{ background: modeDotColor }" />
            {{ t(modeLabel) }}
          </span>
        </div>

        <!-- Right: pipeline name + AI assistant btn -->
        <div class="navbar-right">
          <span
            class="navbar-pipeline-label"
            :class="{ 'has-pipeline': !!pipelineStore.selected, 'is-built': pipelineStore.isReady }"
          >
            <svg v-if="pipelineStore.isReady" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            {{ pipelineStore.selected || t('builder_no_pipeline_selected') }}
          </span>
          <div class="navbar-divider" />
          <button
            class="navbar-ai-btn"
            :class="{ active: uiStore.aiPanelOpen }"
            :title="t('builder_ai_assistant')"
            @click="uiStore.toggleAiPanel()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              <circle cx="7.5" cy="14.5" r="1.5"/>
              <circle cx="16.5" cy="14.5" r="1.5"/>
            </svg>
            <span class="navbar-ai-label">{{ t('builder_ai_assistant') }}</span>
          </button>
          <button class="navbar-icon-btn" :title="uiStore.theme === 'dark' ? 'Light Mode' : 'Dark Mode'" @click="uiStore.toggleTheme()">
            <svg v-if="uiStore.theme === 'dark'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
        </div>
      </div>
    </nav>

    <!-- Main workspace -->
    <div class="builder-body">
      <WorkspaceSidebar />
      <div class="builder-content">
        <PipelinePanel v-show="uiStore.builderMode === 'pipeline'" />
        <ParametersPanel v-show="uiStore.builderMode === 'parameters'" />
        <PromptsPanel v-show="uiStore.builderMode === 'prompts'" />
      </div>
      <AIAssistantPanel />
    </div>

    <!-- Global console -->
    <BuilderConsole />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui.js'
import { usePipelineStore } from '@/stores/pipeline.js'
import { pipelinesApi } from '@/api/pipelines.js'
import WorkspaceSidebar from '@/components/layout/WorkspaceSidebar.vue'
import PipelinePanel from '@/components/builder/PipelinePanel.vue'
import ParametersPanel from '@/components/builder/ParametersPanel.vue'
import PromptsPanel from '@/components/builder/PromptsPanel.vue'
import AIAssistantPanel from '@/components/ai/AIAssistantPanel.vue'
import BuilderConsole from '@/components/builder/BuilderConsole.vue'
import LogoIcon from '@/components/icons/LogoIcon.vue'

const { t } = useI18n()
const uiStore = useUiStore()
const pipelineStore = usePipelineStore()

const MODE_META = {
  pipeline:   { label: 'builder_nav_pipeline',   dot: '#6366f1' },
  parameters: { label: 'builder_nav_params',     dot: '#f59e0b' },
  prompts:    { label: 'builder_nav_prompts',    dot: '#10b981' },
}
const modeLabel = computed(() => MODE_META[uiStore.builderMode]?.label ?? 'builder_nav_pipeline')
const modeDotColor = computed(() => MODE_META[uiStore.builderMode]?.dot ?? '#6366f1')

onMounted(async () => {
  uiStore.appendConsole('UI Ready.')
  try {
    const pipelines = await pipelinesApi.list()
    pipelineStore.list = pipelines
    pipelines.forEach(p => {
      if (p.is_ready) pipelineStore.builtPipelines[p.name] = true
    })
  } catch (e) { console.error('Failed to load pipelines', e) }
})
</script>

<style scoped>
.builder-root { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

/* ── Navbar ────────────────────────────────────────────────────────────────── */
.builder-navbar {
  height: 46px;
  flex-shrink: 0;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: stretch;
  z-index: 50;
}
.navbar-inner {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 16px;
  gap: 0;
}
.navbar-left {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 180px;
  user-select: none;
}
.navbar-logo-icon {
  width: 30px; height: 30px;
  border-radius: 9px;
  background: linear-gradient(140deg, var(--accent) 0%, #5b9cf6 100%);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  box-shadow: 0 2px 8px var(--accent-glow);
  flex-shrink: 0;
  transition: transform var(--spring), box-shadow var(--spring);
}
.navbar-left:hover .navbar-logo-icon {
  transform: scale(1.08) rotate(-3deg);
  box-shadow: 0 5px 16px var(--accent-glow);
}
.navbar-brand {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -.5px;
  color: var(--text-primary);
}
.navbar-brand-rag { color: var(--accent); }

.navbar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.navbar-mode-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: .01em;
}
.navbar-mode-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background .3s;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
  justify-content: flex-end;
}
.navbar-pipeline-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  transition: all var(--transition);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.navbar-pipeline-label.has-pipeline {
  color: var(--text-secondary);
  background: var(--bg-input);
  border-color: var(--border-subtle);
}
.navbar-pipeline-label.is-built {
  color: var(--accent-green);
  background: rgba(16,185,129,.08);
  border-color: rgba(16,185,129,.25);
}
.navbar-divider {
  width: 1px;
  height: 18px;
  background: var(--border-subtle);
  flex-shrink: 0;
}
.navbar-ai-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  background: none;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
  transition: all var(--transition);
}
.navbar-ai-btn:hover {
  background: var(--bg-hover);
  color: var(--accent);
  border-color: var(--accent);
}
.navbar-ai-btn.active {
  background: rgba(99,102,241,.1);
  color: var(--accent);
  border-color: rgba(99,102,241,.35);
}
.navbar-ai-label { font-size: 12.5px; }
.navbar-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border: none; border-radius: var(--radius-sm);
  background: none; cursor: pointer;
  color: var(--text-tertiary);
  transition: all var(--transition);
}
.navbar-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* ── Body ──────────────────────────────────────────────────────────────────── */
.builder-body {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  min-height: 0;
}
.builder-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
</style>
