<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router'
import { watch, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { useChatStore } from '@/stores/chat.js'
import { i18n } from '@/i18n/index.js'
import client from '@/api/client.js'

const uiStore = useUiStore()
const chatStore = useChatStore()

watch(
  () => uiStore.language,
  (lang) => {
    i18n.global.locale.value = lang
    document.documentElement.lang = lang
  },
  { immediate: true }
)

watch(
  () => uiStore.theme,
  (theme) => { document.documentElement.setAttribute('data-theme', theme) },
  { immediate: true }
)

// On startup: verify persisted engine sessions are still alive.
// If the backend restarted, SESSION_MANAGER is wiped — old session_ids are gone.
// We detect this by pinging /api/pipelines/chat/history for each registered engine.
// If any session returns 404/error, we wipe ALL engine registrations and reset status.
onMounted(async () => {
  const engines = { ...chatStore.activeEngines }
  const entries = Object.entries(engines)
  if (!entries.length) return

  let anyStale = false
  for (const [, sid] of entries) {
    try {
      await client.get(`/pipelines/chat/history?session_id=${encodeURIComponent(sid)}`)
    } catch (e) {
      // 404 = session not found, backend likely restarted
      anyStale = true
      break
    }
  }

  if (anyStale) {
    // Wipe all stale engine registrations
    for (const name of Object.keys(engines)) {
      chatStore.unregisterEngine(name)
    }
    chatStore.setEngineStatus('offline')
    console.warn('[VortexRAG] Backend session expired — engine registrations cleared. Please restart the engine.')
  }
})
</script>
