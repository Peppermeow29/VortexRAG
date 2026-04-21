<template>
  <div class="full-height flex-row" style="overflow:hidden">
    <!-- Left sidebar -->
    <ChatSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <!-- Center: chat or KB -->
    <div class="flex-1 full-height" style="overflow:hidden;position:relative">
      <ChatMainView v-show="!showKb" />
      <KbMainView v-show="showKb" />
    </div>

    <!-- Right: source detail panel (slides in) -->
    <SourceDetailPanel ref="sourcePanel" />

    <!-- Background tasks FAB -->
    <BackgroundTasksPanel ref="bgTasksPanel" />
  </div>
</template>

<script setup>
import { ref, provide, onMounted } from 'vue'
import { useKbStore } from '@/stores/kb.js'
import { usePipelineStore } from '@/stores/pipeline.js'
import { kbApi } from '@/api/kb.js'
import { pipelinesApi } from '@/api/pipelines.js'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import ChatMainView from '@/components/chat/ChatMainView.vue'
import KbMainView from '@/components/kb/KbMainView.vue'
import SourceDetailPanel from '@/components/chat/SourceDetailPanel.vue'
import BackgroundTasksPanel from '@/components/chat/BackgroundTasksPanel.vue'

const kbStore = useKbStore()
const pipelineStore = usePipelineStore()
const sidebarCollapsed = ref(false)
const showKb = ref(false)
const sourcePanel = ref(null)
const bgTasksPanel = ref(null)

provide('toggleKb', () => { showKb.value = !showKb.value })
provide('closeKb', () => { showKb.value = false })
provide('showSource', (source) => sourcePanel.value?.show(source))
provide('sidebarCollapsed', sidebarCollapsed)
provide('toggleSidebar', () => { sidebarCollapsed.value = !sidebarCollapsed.value })
provide('bgTasksPanel', bgTasksPanel)

onMounted(async () => {
  try { kbStore.setFiles(await kbApi.getFiles()) } catch {}
  // Sync pipeline built status from backend
  try {
    const pipelines = await pipelinesApi.list()
    pipelineStore.list = pipelines
    pipelines.forEach(p => {
      if (p.is_ready) pipelineStore.builtPipelines[p.name] = true
    })
  } catch {}
})
</script>
