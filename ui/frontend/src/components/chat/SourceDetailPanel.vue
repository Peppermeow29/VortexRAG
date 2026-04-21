<template>
  <div class="source-detail-panel" :class="{ open: isOpen }">
    <div class="sdp-header">
      <span class="sdp-title">{{ t('chat_cited_references') }}</span>
      <button class="btn-icon" @click="close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="sdp-body" v-if="source">
      <div class="sdp-meta">
        <span v-if="resolvedDisplayId != null" class="sdp-ref-id">[{{ resolvedDisplayId }}]</span>
        <span v-if="resolvedTitle" class="sdp-source-title">{{ resolvedTitle }}</span>
        <span v-if="source.score != null" class="sdp-score">Score: {{ (source.score * 100).toFixed(1) }}%</span>
      </div>
      <div class="sdp-content" v-html="resolvedHtml"></div>
    </div>
    <div v-else class="sdp-empty">No source selected</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMarkdown } from '@/composables/useMarkdown.js'

const { t } = useI18n()
const { render } = useMarkdown()
const isOpen = ref(false)
const source = ref(null)

const resolvedDisplayId = computed(() => source.value?.displayId ?? source.value?.id ?? null)

const resolved = computed(() => {
  const raw = String(source.value?.content ?? source.value?.text ?? source.value?.chunk ?? '').trim()
  let cleaned = raw
  const bibkey = cleaned.match(/^bibkey:\s*\S+\s+([\s\S]*)/i)
  if (bibkey) cleaned = bibkey[1].trim()

  const titleMatch = cleaned.match(/^Title:\s*(.+?)(?:\n|Content:)/i)
  const contentMatch = cleaned.match(/Content:\s*([\s\S]*)/i)
  const title = (titleMatch?.[1] || source.value?.title || '').trim()

  if (contentMatch) {
    return { title, body: contentMatch[1].trim() }
  }
  return { title, body: cleaned }
})

const resolvedTitle = computed(() => resolved.value.title || (resolvedDisplayId.value != null ? `Reference [${resolvedDisplayId.value}]` : 'Reference'))
const resolvedHtml = computed(() => render(resolved.value.body || 'No content available.'))

function show(src) { source.value = src; isOpen.value = true }
function close() { isOpen.value = false }
defineExpose({ show, close })
</script>

<style scoped>
.source-detail-panel {
  width: 0;
  min-width: 0;
  overflow: hidden;
  background: var(--bg-card);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  transition: width .25s ease, min-width .25s ease;
  flex-shrink: 0;
}
.source-detail-panel.open {
  width: 340px;
  min-width: 340px;
}
.sdp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.sdp-title { font-size: 13px; font-weight: 600; }
.sdp-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.sdp-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.sdp-ref-id { font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: var(--radius-full); }
.sdp-source-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.sdp-score { font-size: 11px; color: var(--accent-green); font-weight: 600; background: #dcfce7; padding: 2px 8px; border-radius: var(--radius-full); }
.sdp-content { font-size: 13px; line-height: 1.7; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); }
.sdp-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); font-size: 13px; }
</style>
