<template>
  <div class="chat-bubble-wrap" :class="message.role" :data-message-idx="props.messageIndex">
    <!-- User bubble -->
    <div v-if="message.role === 'user'" class="chat-bubble user">
      {{ messageContent }}
    </div>

    <!-- Assistant bubble -->
    <div v-else class="chat-bubble assistant" ref="assistantBubbleEl">

      <!-- 1. Thinking process — ALWAYS above answer (matches original UI) -->
      <div
        v-if="hasSteps"
        class="process-container"
        :class="{ collapsed: !stepsOpen }"
      >
        <div class="process-header" @click="stepsOpen = !stepsOpen">
          <span>{{ t('chat_show_thinking') }}</span>
          <svg class="process-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
              </div>
        <div class="process-body">
          <div v-for="(step, i) in messageSteps" :key="i" class="process-step">
            <div class="step-title">
              <span v-if="messageStreaming && !step.done" class="step-spinner"/>
              <span>{{ step.name }}</span>
            </div>
            <!-- Non-final streaming tokens (thinking content) -->
            <div v-if="step.tokens" class="step-content-stream">{{ step.tokens }}</div>
            <!-- Output summary from step_end -->
            <div v-if="step.output" class="step-details">{{ step.output }}</div>
          </div>
        </div>
      </div>

      <!-- 2. Streaming dots (only when no content and no steps yet) -->
      <span v-if="messageStreaming && !messageContent && !hasSteps" class="streaming-dots">
        <span /><span /><span />
      </span>

      <!-- 3. Answer content -->
      <div v-if="messageContent" class="msg-content" ref="contentEl" v-html="rendered" />
      <span v-if="messageStreaming && messageContent" class="streaming-cursor" />

        <!-- References -->
      <div v-if="hasRefs && showReferences" class="ref-container">
        <template v-if="decoratedUsedSources.length">
          <div class="ref-header">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            {{ t('chat_cited_references') }} ({{ decoratedUsedSources.length }})
          </div>
          <div class="ref-list ref-list--cards">
            <button
              v-for="(src, i) in decoratedUsedSources"
              :key="src.displayId ?? src.id ?? i"
              class="ref-item"
              :id="`ref-item-${src._ui.showId}`"
              :data-ref-id="src._ui.showId"
              :ref="el => bindRefDom(el, src)"
              @click="onClickReferenceItem(src)"
            >
              <span class="ref-id">[{{ src._ui.showId }}]</span>
              <span class="ref-text">
                <span class="ref-title">{{ src._ui.title }}</span>
                <span v-if="src._ui.preview" class="ref-preview">{{ src._ui.preview }}</span>
              </span>
            </button>
          </div>
        </template>

        <template v-if="decoratedUnusedSources.length">
          <div class="unused-refs-section" :class="{ collapsed: !unusedOpen }">
            <div class="ref-header unused-header" @click="unusedOpen = !unusedOpen">
              <span>{{ t('chat_other_retrieved') }} ({{ decoratedUnusedSources.length }})</span>
              <span class="toggle-icon">▶</span>
            </div>
            <div class="ref-list ref-list--cards unused-list" style="margin-top:6px">
              <button
                v-for="(src, i) in decoratedUnusedSources"
                :key="src.displayId ?? src.id ?? ('u-' + i)"
                class="ref-item ref-item--unused"
                :id="`ref-item-${src._ui.showId}`"
                :data-ref-id="src._ui.showId"
                :ref="el => bindRefDom(el, src)"
                @click="onClickReferenceItem(src)"
              >
                <span class="ref-id">[{{ src._ui.showId }}]</span>
                <span class="ref-text">
                  <span class="ref-title">{{ src._ui.title }}</span>
                  <span v-if="src._ui.preview" class="ref-preview">{{ src._ui.preview }}</span>
                </span>
              </button>
            </div>
            </div>
          </template>
      </div>

      <!-- Copy/download row (shows on hover) -->
      <div v-if="!messageStreaming && messageContent" class="chat-copy-row">
        <button class="chat-copy-btn" :class="{ copied }" @click="copyText">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          {{ copied ? t('common_copied') : t('common_copy') }}
        </button>
        <button class="chat-download-btn" :class="{ downloaded }" :title="t('chat_export_button_title')" @click="exportMessage">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          {{ downloaded ? t('common_copied') : t('chat_export_button_title') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, shallowRef, watchEffect, watch, nextTick, inject, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMarkdown } from '@/composables/useMarkdown.js'
import { exportChatDocx } from '@/api/chat.js'

const { t } = useI18n()
const { render, enhance } = useMarkdown()
const props = defineProps({
  message: Object,
  messageIndex: { type: Number, default: null },
  showReferences: { type: Boolean, default: true }
})
const emit = defineEmits(['view-source'])
const showSource = inject('showSource', null)

const messageContent = computed(() => String(props.message?.content ?? props.message?.text ?? ''))
const messageSteps = computed(() => props.message?.steps ?? props.message?.meta?.steps ?? [])
const messageStreaming = computed(() => Boolean(props.message?.isStreaming))
const messageSources = computed(() => {
  const direct = props.message?.sources
  const legacy = props.message?.meta?.sources
  if (Array.isArray(direct) && direct.length) return direct
  if (Array.isArray(legacy) && legacy.length) return legacy
  return []
})

// Auto-expand process container while streaming, stays open after done
const stepsOpen = ref(false)
watch(
  () => messageStreaming.value,
  (streaming) => { if (streaming) stepsOpen.value = true },
  { immediate: true }
)

const unusedOpen = ref(false)
const copied = ref(false)
const downloaded = ref(false)

// ── Markdown / Markdown download helpers ─────────────────────────────────────
function buildMarkdownTimestamp() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function buildMarkdownFilename(question, ext = 'md') {
  const base = (question || 'chat-export')
    .replace(/\s+/g, '-')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/-+/g, '-')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 80) || 'chat-export'
  return `${base}-${buildMarkdownTimestamp()}.${ext}`
}

function buildMarkdownContent(text, sources) {
  const lines = [text]
  const cited = citationRemap.value.citedDisplayIds
  const srcs = citationRemap.value.outSources.filter(s => cited.has(Number(s.displayId)))
  if (srcs.length) {
    lines.push('\n\n---\n\n## References')
    srcs.forEach(s => {
      lines.push(`\n### [${s.displayId}] ${s.title ?? ''}`)
      if (s.content) lines.push('\n' + s.content)
    })
  }
  return lines.join('\n') + '\n'
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function exportMessage() {
  const text = messageContent.value
  if (!text) return

  // Find preceding user question from parent session if available
  const question = ''

  // Format picker dialog
  const fmt = await showFormatPicker()
  if (!fmt) return

  if (fmt === 'docx') {
    try {
      const sources = citationRemap.value.outSources
      const blob = await exportChatDocx({ text, question, sources })
      triggerBlobDownload(blob, buildMarkdownFilename(question, 'docx'))
      downloaded.value = true
      setTimeout(() => { downloaded.value = false }, 2000)
    } catch (e) {
      alert(t('chat_export_docx_failed_message').replace('{error}', e?.message ?? String(e)))
    }
    return
  }

  // Markdown download
  const md = buildMarkdownContent(text)
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  triggerBlobDownload(blob, buildMarkdownFilename(question, 'md'))
  downloaded.value = true
  setTimeout(() => { downloaded.value = false }, 2000)
}

// Lightweight inline format-picker dialog (no external dependency)
function showFormatPicker() {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center'
    const card = document.createElement('div')
    card.style.cssText = 'background:#fff;border-radius:16px;padding:28px 28px 22px;width:380px;max-width:92vw;box-shadow:0 16px 48px rgba(0,0,0,.18)'
    card.innerHTML = `
      <h3 style="margin:0 0 6px;font-size:1.15rem;font-weight:700">${t('chat_export_format_title')}</h3>
      <p style="margin:0 0 18px;font-size:.92rem;color:#6b7280">${t('chat_export_format_message')}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <button id="ep-md" style="min-height:68px;border-radius:12px;border:1px solid #e5e7eb;background:#f3f4f6;font-weight:700;font-size:.98rem;cursor:pointer">
          Markdown<br><span style="font-size:.8rem;font-weight:500;color:#6b7280">(.md)</span>
        </button>
        <button id="ep-docx" style="min-height:68px;border-radius:12px;border:1px solid #e5e7eb;background:#f3f4f6;font-weight:700;font-size:.98rem;cursor:pointer">
          Word<br><span style="font-size:.8rem;font-weight:500;color:#6b7280">(.docx)</span>
        </button>
      </div>
      <button id="ep-cancel" style="width:100%;padding:9px;border-radius:10px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;font-weight:600;cursor:pointer">${t('common_cancel')}</button>
    `
    overlay.appendChild(card)
    document.body.appendChild(overlay)
    const cleanup = (val) => { document.body.removeChild(overlay); resolve(val) }
    card.querySelector('#ep-md').onclick = () => cleanup('md')
    card.querySelector('#ep-docx').onclick = () => cleanup('docx')
    card.querySelector('#ep-cancel').onclick = () => cleanup(null)
    overlay.onclick = (e) => { if (e.target === overlay) cleanup(null) }
  })
}

// Only re-render markdown when content changes
const rendered = shallowRef('')
const contentEl = ref(null)
const assistantBubbleEl = ref(null)
let _lastContent = null
function formatCitationHtml(html) {
  if (!html) return ''
  const msgIdx = props.messageIndex ?? ''
  return html.replace(/\[(\d+)\]/g, (_, p1) => `<span class="citation-link" data-citation-id="${p1}" data-message-idx="${msgIdx}">[${p1}]</span>`)
}

const hasSteps    = computed(() => messageSteps.value.length > 0)

function extractSourcesFromStepOutput(outputText = '') {
  const text = String(outputText ?? '')
  if (!text) return []

  // Preferred retriever summary format:
  // Retrieved N documents:
  // 1. Title:
  // <title>
  //
  // Content:
  // <content ...>
  const blocks = text
    .replace(/^\s*Retrieved\s+\d+\s+documents:\s*/i, '')
    .split(/\n(?=\d+\.\s*Title:\s*)/g)
    .map(x => x.trim())
    .filter(Boolean)

  const results = []
  for (const block of blocks) {
    const idMatch = block.match(/^(\d+)\.\s*Title:\s*/i)
    const id = Number(idMatch?.[1])

    const afterTitle = block.replace(/^\d+\.\s*Title:\s*/i, '')
    const contentIdx = afterTitle.search(/\n\s*Content:\s*/i)

    let title = ''
    let content = ''

    if (contentIdx >= 0) {
      title = afterTitle.slice(0, contentIdx).trim()
      content = afterTitle.slice(contentIdx).replace(/^\n\s*Content:\s*/i, '').trim()
    } else {
      const lines = afterTitle.split('\n')
      title = String(lines.shift() ?? '').trim()
      content = lines.join('\n').trim()
    }

    if (!content) continue
    results.push({
      id: Number.isFinite(id) ? id : undefined,
      displayId: Number.isFinite(id) ? id : undefined,
      title: title || (Number.isFinite(id) ? `Reference [${id}]` : 'Reference'),
      content
    })
  }

  // Fallback: current backend summary is usually:
  // Retrieved N documents:
  // 1. <doc preview>
  // 2. <doc preview>
  if (!results.length) {
    const lineMatches = [...text.matchAll(/^\s*(\d+)\.\s+([\s\S]*?)(?=\n\s*\d+\.\s+|$)/gm)]
    for (const match of lineMatches) {
      const id = Number(match?.[1])
      const raw = String(match?.[2] ?? '').trim()
      if (!raw) continue
      const firstLine = raw.split('\n')[0]?.trim() ?? ''
      const title = firstLine.slice(0, 60) || (Number.isFinite(id) ? `Reference [${id}]` : 'Reference')
      results.push({
        id: Number.isFinite(id) ? id : undefined,
        displayId: Number.isFinite(id) ? id : undefined,
        title,
        content: raw
      })
    }
  }

  return results
}

function extractSourcesFromSteps(steps = []) {
  const all = []
  for (const step of steps ?? []) {
    const name = String(step?.name ?? '')
    const output = String(step?.output ?? '')
    if (!output) continue
    if (
      name.includes('retriever')
      || output.includes('Retrieved ')
      || output.includes('Title:')
      || /^\s*\d+\.\s+/m.test(output)
    ) {
      all.push(...extractSourcesFromStepOutput(output))
    }
  }

  const dedup = new Map()
  for (const src of all) {
    const key = `${src?.displayId ?? src?.id}-${src?.title ?? ''}-${src?.content ?? ''}`
    if (!dedup.has(key)) dedup.set(key, src)
  }
  return [...dedup.values()]
}

// Keep original citation ids to stay consistent with model thinking output and source payload.
const citationRemap = computed(() => {
  const text = messageContent.value
  const citedIdsInOrder = [...new Set(Array.from(text.matchAll(/\[(\d+)\]/g), x => Number(x[1])).filter(Number.isFinite))]

  const liveSources = messageSources.value
  const fallbackSources = extractSourcesFromSteps(messageSteps.value)
  const rawSources = (Array.isArray(liveSources) && liveSources.length) ? liveSources : fallbackSources

  // Use original ids when available; only fill missing ids by cited order.
  const usedIds = new Set()
  const pendingCited = [...citedIdsInOrder]

  const outSources = (rawSources ?? []).map((src) => {
    const sid = Number(src?.displayId ?? src?.id)
    if (Number.isFinite(sid)) {
      usedIds.add(sid)
      return { ...src, displayId: sid }
    }

    const fill = pendingCited.find(id => !usedIds.has(id))
    if (Number.isFinite(fill)) {
      usedIds.add(fill)
      return { ...src, displayId: fill }
    }

    return { ...src }
  })

  const citedDisplayIds = new Set(citedIdsInOrder)
  return { remappedText: text, outSources, citedDisplayIds, citedOrder: citedIdsInOrder }
})

watchEffect(() => {
  const c = citationRemap.value.remappedText ?? ''
  if (c !== _lastContent) {
    _lastContent = c
    rendered.value = c ? formatCitationHtml(render(c)) : ''
  }
})

// Apply post-render enhancements (table wrapper/copy + code copy)
watch(
  () => rendered.value,
  async () => {
    await nextTick()
    enhance(contentEl.value, {
      copy: t('common_copy'),
      copied: t('common_copied'),
      copyTable: t('common_copy_table'),
      copiedTable: t('common_copied')
    })
    attachCitationHandlers()
  },
  { immediate: true }
)

const normalizedSources = computed(() => {
  const sorted = [...citationRemap.value.outSources].sort((a, b) => Number(a.displayId) - Number(b.displayId))
  const byDisplayId = new Map()
  const byContent = new Set()

  for (const src of sorted) {
    const displayId = Number(src?.displayId)
    const contentKey = `${src?.title ?? ''}::${src?.content ?? src?.text ?? src?.chunk ?? ''}`.trim()

    if (Number.isFinite(displayId)) {
      if (!byDisplayId.has(displayId)) byDisplayId.set(displayId, src)
      continue
    }

    if (contentKey && byContent.has(contentKey)) continue
    if (contentKey) byContent.add(contentKey)
    const k = byDisplayId.size + 1
    byDisplayId.set(k, { ...src, displayId: k })
  }

  // Original UI expectation: if text contains citations [n], bottom reference list should still render.
  // When backend does not return retriever sources for this answer, generate placeholder refs.
  const citedIds = [...citationRemap.value.citedDisplayIds].sort((a, b) => a - b)
  for (const id of citedIds) {
    if (!byDisplayId.has(id)) {
      byDisplayId.set(id, {
        displayId: id,
        id,
        title: `Reference [${id}]`,
        content: `No retriever source payload was returned for citation [${id}] in this answer. This is usually caused by backend session reset / multiturn fallback without retrieval.`
      })
    }
  }

  const citedOrder = citationRemap.value.citedOrder ?? []
  const orderMap = new Map(citedOrder.map((id, idx) => [Number(id), idx]))

  return [...byDisplayId.values()].sort((a, b) => {
    const aId = Number(a?.displayId)
    const bId = Number(b?.displayId)
    const aOrder = orderMap.has(aId) ? orderMap.get(aId) : Number.POSITIVE_INFINITY
    const bOrder = orderMap.has(bId) ? orderMap.get(bId) : Number.POSITIVE_INFINITY
    if (aOrder !== bOrder) return aOrder - bOrder
    return aId - bId
  })
})

const usedSources = computed(() => {
  const cited = citationRemap.value.citedDisplayIds
  return normalizedSources.value.filter(s => cited.has(Number(s.displayId)))
})

const unusedSources = computed(() => {
  const cited = citationRemap.value.citedDisplayIds
  return normalizedSources.value.filter(s => !cited.has(Number(s.displayId)))
})

const hasRefs = computed(() => usedSources.value.length > 0 || unusedSources.value.length > 0)

function extractTitleAndPreview(src, fallbackId) {
  const rawContent = String(src?.content ?? src?.text ?? src?.chunk ?? '').trim()
  const rawTitle = String(src?.title ?? '').trim()

  let content = rawContent
  const bibkey = content.match(/^bibkey:\s*\S+\s+([\s\S]*)/i)
  if (bibkey) content = bibkey[1].trim()

  let title = rawTitle
  let preview = ''

  const titleMatch = content.match(/^Title:\s*(.+?)(?:\n|Content:)/i)
  const contentMatch = content.match(/Content:\s*([\s\S]*)/i)

  if (titleMatch) title = titleMatch[1].trim()
  if (!title) title = `Reference ${fallbackId}`

  if (contentMatch) {
    preview = contentMatch[1].trim().replace(/\s+/g, ' ')
  } else {
    preview = content.replace(/\s+/g, ' ')
  }

  if (preview.startsWith(title)) {
    preview = preview.slice(title.length).replace(/^[:：\-\s]+/, '')
  }

  preview = preview.slice(0, 160)
  return { title, preview }
}

const decoratedUsedSources = computed(() =>
  usedSources.value.map((src, i) => {
    const showId = Number(src?.displayId) || i + 1
    const meta = extractTitleAndPreview(src, showId)
    return { ...src, _ui: { showId, ...meta } }
  })
)

const decoratedUnusedSources = computed(() =>
  unusedSources.value.map((src, i) => {
    const showId = Number(src?.displayId) || i + 1
    const meta = extractTitleAndPreview(src, showId)
    return { ...src, _ui: { showId, ...meta } }
  })
)

function bindRefDom(el, src) {
  if (!el) return
  el._sourceData = src
}

function openSource(src) {
  if (showSource) showSource(src)
  emit('view-source', src)
}

function onClickReferenceItem(src) {
  highlightReferenceItem(Number(src?.displayId))
  openSource(src)
}

function onClickCitation(refId) {
  if (!Number.isFinite(refId)) return

  const src = usedSources.value.find(s => Number(s.displayId) === refId)
    || normalizedSources.value.find(s => Number(s.displayId) === refId)
    || null

  if (src) {
    highlightReferenceItem(refId)
    openSource(src)
    return
  }

  scrollToReference(refId)
}

function highlightReferenceItem(refId) {
  const bubble = assistantBubbleEl.value
  if (!bubble || !Number.isFinite(refId)) return
  const all = bubble.querySelectorAll('.ref-item')
  all.forEach(el => el.classList.remove('active-highlight'))
  const target = bubble.querySelector(`.ref-item[data-ref-id="${refId}"]`)
  if (target) {
    target.classList.add('active-highlight')
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

function scrollToReference(refId) {
  if (!Number.isFinite(refId)) return

  let target = null
  if (props.messageIndex != null) {
    const bubble = document.querySelector(`[data-message-idx="${props.messageIndex}"]`)
    if (bubble) target = bubble.querySelector(`.ref-item[data-ref-id="${refId}"]`)
  }

  if (!target) {
    const allRefs = document.querySelectorAll(`[id='ref-item-${refId}']`)
    target = allRefs[allRefs.length - 1] || null
  }

  if (target) {
    document.querySelectorAll('.ref-item').forEach(el => el.classList.remove('active-highlight'))
    target.classList.add('active-highlight')

    const unusedSection = target.closest('.unused-refs-section')
    if (unusedSection?.classList.contains('collapsed')) {
      unusedSection.classList.remove('collapsed')
      unusedOpen.value = true
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

    const src = target._sourceData
      || usedSources.value.find(s => Number(s.displayId) === refId)
      || normalizedSources.value.find(s => Number(s.displayId) === refId)
      || normalizedSources.value[refId - 1]

    if (src) {
      openSource(src)
      return
    }
  }

  openSource({
    displayId: refId,
    title: `Reference [${refId}]`,
    content: `No retriever source payload was returned for citation [${refId}]. This usually means the model generated citation markers in text, but backend did not emit matching sources.`
  })
}

let citationClickHandler = null
function attachCitationHandlers() {
  const root = contentEl.value
  if (!root) return

  if (citationClickHandler) {
    root.removeEventListener('click', citationClickHandler)
  }

  citationClickHandler = (e) => {
    const target = e.target instanceof Element ? e.target : e.target?.parentElement
    const el = target?.closest?.('.citation-link[data-citation-id]')
    if (!el) return
    e.preventDefault()
    e.stopPropagation()
    const id = Number(el.getAttribute('data-citation-id'))
    if (!Number.isFinite(id)) return
    onClickCitation(id)
  }

  root.addEventListener('click', citationClickHandler)
}

function copyText() {
  navigator.clipboard?.writeText(messageContent.value).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

onUnmounted(() => {
  if (contentEl.value && citationClickHandler) {
    contentEl.value.removeEventListener('click', citationClickHandler)
  }
})
</script>

<style scoped>
/* ── Bubble wrap ─────────────────────────────────────────────────────────── */
.chat-bubble-wrap {
  display: flex;
  flex-direction: column;
  width: 100%;
  contain: layout style;
}

/* ── User bubble ─────────────────────────────────────────────────────────── */
.chat-bubble.user {
  align-self: flex-end;
  max-width: 80%;
  background: #f3f4f6;
  color: #0d0d0d;
  padding: .75rem 1.25rem;
  border-radius: 20px 20px 4px 20px;
  font-size: .96rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* dark theme override */
:root.dark .chat-bubble.user,
[data-theme=dark] .chat-bubble.user {
  background: var(--bg-surface);
  color: var(--text-primary);
}

/* ── Assistant bubble ────────────────────────────────────────────────────── */
.chat-bubble.assistant {
  align-self: stretch;
  width: 100%;
  max-width: 100%;
  padding: 0;
  position: relative;
}

/* ── Message content (markdown) ──────────────────────────────────────────── */
.msg-content {
  font-size: .95rem;
  line-height: 1.7;
  color: var(--text-primary);
  text-align: justify;
  text-align-last: left;
  word-break: break-word;
}
.msg-content :deep(> :first-child) { margin-top: 0; }
.msg-content :deep(> :last-child)  { margin-bottom: 0; }
.msg-content :deep(p)              { margin: 0 0 .85rem; }
.msg-content :deep(p:last-child)   { margin-bottom: 0; }
.msg-content :deep(h1) { font-size: 1.4rem; margin: 1rem 0 .5rem; font-weight: 600; }
.msg-content :deep(h2) { font-size: 1.25rem; margin: 1rem 0 .5rem; font-weight: 600; }
.msg-content :deep(h3) { font-size: 1.15rem; margin: 1rem 0 .5rem; font-weight: 600; }
.msg-content :deep(h4) { font-size: 1.05rem; margin: 1rem 0 .5rem; font-weight: 600; }
.msg-content :deep(ul),
.msg-content :deep(ol) { margin: 0 0 1rem 1.25rem; padding-left: .25rem; }
.msg-content :deep(li) { margin: .2rem 0; }
.msg-content :deep(blockquote) {
  border-left: 3px solid var(--border-strong);
  padding-left: 10px;
  color: var(--text-secondary);
  margin: 6px 0;
}
.msg-content :deep(hr) { border: none; border-top: 1px solid var(--border-subtle); margin: 12px 0; }

/* Clickable inline citations, aligned with original UI behavior */
.msg-content :deep(.citation-link) {
  color: #2563eb;
  cursor: pointer;
  font-weight: 600;
  padding: 0 2px;
  border-radius: 4px;
  transition: background .15s ease, color .15s ease;
}
.msg-content :deep(.citation-link:hover) {
  background: rgba(37, 99, 235, .12);
  color: #1d4ed8;
}
:root.dark .msg-content :deep(.citation-link),
[data-theme=dark] .msg-content :deep(.citation-link) {
  color: #60a5fa;
}

/* Inline code */
/* Inline code */
.msg-content :deep(code) {
  font-family: var(--font-mono);
  font-size: .85rem;
  background: rgba(175, 184, 193, 0.2);
  border: 1px solid rgba(175, 184, 193, 0.3);
  border-radius: 6px;
  padding: .15rem .4rem;
  color: var(--text-primary);
}

:root.dark .msg-content :deep(code),
[data-theme=dark] .msg-content :deep(code) {
  background: rgba(110, 118, 129, 0.2);
  border-color: rgba(110, 118, 129, 0.3);
}

/* Code blocks */
.msg-content :deep(pre) {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
  margin: 12px 0;
  font-size: .82rem;
  line-height: 1.6;
  contain: content;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease;
}

.msg-content :deep(pre:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:root.dark .msg-content :deep(pre),
[data-theme=dark] .msg-content :deep(pre) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

:root.dark .msg-content :deep(pre:hover),
[data-theme=dark] .msg-content :deep(pre:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.msg-content :deep(pre code) {
  display: block;
  padding: 16px 18px;
  background: none;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: inherit;
  color: var(--text-primary);
  line-height: 1.6;
}

/* Smooth scrollbar for code blocks */
.msg-content :deep(pre code::-webkit-scrollbar) {
  height: 8px;
}

.msg-content :deep(pre code::-webkit-scrollbar-track) {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.msg-content :deep(pre code::-webkit-scrollbar-thumb) {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.msg-content :deep(pre code::-webkit-scrollbar-thumb:hover) {
  background: rgba(0, 0, 0, 0.3);
}

:root.dark .msg-content :deep(pre code::-webkit-scrollbar-track),
[data-theme=dark] .msg-content :deep(pre code::-webkit-scrollbar-track) {
  background: rgba(255, 255, 255, 0.05);
}

:root.dark .msg-content :deep(pre code::-webkit-scrollbar-thumb),
[data-theme=dark] .msg-content :deep(pre code::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.2);
}

:root.dark .msg-content :deep(pre code::-webkit-scrollbar-thumb:hover),
[data-theme=dark] .msg-content :deep(pre code::-webkit-scrollbar-thumb:hover) {
  background: rgba(255, 255, 255, 0.3);
}

/* Syntax highlighting - Light theme */
.msg-content :deep(pre code .hljs-comment),
.msg-content :deep(pre code .hljs-quote) { color: #6a737d; font-style: italic; }
.msg-content :deep(pre code .hljs-keyword),
.msg-content :deep(pre code .hljs-selector-tag),
.msg-content :deep(pre code .hljs-subst) { color: #d73a49; font-weight: 600; }
.msg-content :deep(pre code .hljs-number),
.msg-content :deep(pre code .hljs-literal),
.msg-content :deep(pre code .hljs-variable),
.msg-content :deep(pre code .hljs-template-variable),
.msg-content :deep(pre code .hljs-tag .hljs-attr) { color: #005cc5; }
.msg-content :deep(pre code .hljs-string),
.msg-content :deep(pre code .hljs-doctag) { color: #032f62; }
.msg-content :deep(pre code .hljs-title),
.msg-content :deep(pre code .hljs-section),
.msg-content :deep(pre code .hljs-selector-id) { color: #6f42c1; font-weight: 600; }
.msg-content :deep(pre code .hljs-type),
.msg-content :deep(pre code .hljs-class .hljs-title) { color: #22863a; font-weight: 600; }
.msg-content :deep(pre code .hljs-tag),
.msg-content :deep(pre code .hljs-name),
.msg-content :deep(pre code .hljs-attribute) { color: #22863a; }
.msg-content :deep(pre code .hljs-regexp),
.msg-content :deep(pre code .hljs-link) { color: #032f62; }
.msg-content :deep(pre code .hljs-symbol),
.msg-content :deep(pre code .hljs-bullet) { color: #e36209; }
.msg-content :deep(pre code .hljs-built_in),
.msg-content :deep(pre code .hljs-builtin-name) { color: #005cc5; }
.msg-content :deep(pre code .hljs-meta) { color: #6a737d; }

/* Syntax highlighting - Dark theme */
:root.dark .msg-content :deep(pre code .hljs-comment),
:root.dark .msg-content :deep(pre code .hljs-quote),
[data-theme=dark] .msg-content :deep(pre code .hljs-comment),
[data-theme=dark] .msg-content :deep(pre code .hljs-quote) { color: #8b949e; }
:root.dark .msg-content :deep(pre code .hljs-keyword),
:root.dark .msg-content :deep(pre code .hljs-selector-tag),
:root.dark .msg-content :deep(pre code .hljs-subst),
[data-theme=dark] .msg-content :deep(pre code .hljs-keyword),
[data-theme=dark] .msg-content :deep(pre code .hljs-selector-tag),
[data-theme=dark] .msg-content :deep(pre code .hljs-subst) { color: #ff7b72; }
:root.dark .msg-content :deep(pre code .hljs-number),
:root.dark .msg-content :deep(pre code .hljs-literal),
:root.dark .msg-content :deep(pre code .hljs-variable),
:root.dark .msg-content :deep(pre code .hljs-template-variable),
:root.dark .msg-content :deep(pre code .hljs-tag .hljs-attr),
[data-theme=dark] .msg-content :deep(pre code .hljs-number),
[data-theme=dark] .msg-content :deep(pre code .hljs-literal),
[data-theme=dark] .msg-content :deep(pre code .hljs-variable),
[data-theme=dark] .msg-content :deep(pre code .hljs-template-variable),
[data-theme=dark] .msg-content :deep(pre code .hljs-tag .hljs-attr) { color: #79c0ff; }
:root.dark .msg-content :deep(pre code .hljs-string),
:root.dark .msg-content :deep(pre code .hljs-doctag),
[data-theme=dark] .msg-content :deep(pre code .hljs-string),
[data-theme=dark] .msg-content :deep(pre code .hljs-doctag) { color: #a5d6ff; }
:root.dark .msg-content :deep(pre code .hljs-title),
:root.dark .msg-content :deep(pre code .hljs-section),
:root.dark .msg-content :deep(pre code .hljs-selector-id),
[data-theme=dark] .msg-content :deep(pre code .hljs-title),
[data-theme=dark] .msg-content :deep(pre code .hljs-section),
[data-theme=dark] .msg-content :deep(pre code .hljs-selector-id) { color: #d2a8ff; }
:root.dark .msg-content :deep(pre code .hljs-type),
:root.dark .msg-content :deep(pre code .hljs-class .hljs-title),
[data-theme=dark] .msg-content :deep(pre code .hljs-type),
[data-theme=dark] .msg-content :deep(pre code .hljs-class .hljs-title) { color: #7ee787; }
:root.dark .msg-content :deep(pre code .hljs-tag),
:root.dark .msg-content :deep(pre code .hljs-name),
:root.dark .msg-content :deep(pre code .hljs-attribute),
[data-theme=dark] .msg-content :deep(pre code .hljs-tag),
[data-theme=dark] .msg-content :deep(pre code .hljs-name),
[data-theme=dark] .msg-content :deep(pre code .hljs-attribute) { color: #7ee787; }
:root.dark .msg-content :deep(pre code .hljs-regexp),
:root.dark .msg-content :deep(pre code .hljs-link),
[data-theme=dark] .msg-content :deep(pre code .hljs-regexp),
[data-theme=dark] .msg-content :deep(pre code .hljs-link) { color: #a5d6ff; }
:root.dark .msg-content :deep(pre code .hljs-symbol),
:root.dark .msg-content :deep(pre code .hljs-bullet),
[data-theme=dark] .msg-content :deep(pre code .hljs-symbol),
[data-theme=dark] .msg-content :deep(pre code .hljs-bullet) { color: #ffa657; }
:root.dark .msg-content :deep(pre code .hljs-built_in),
:root.dark .msg-content :deep(pre code .hljs-builtin-name),
[data-theme=dark] .msg-content :deep(pre code .hljs-built_in),
[data-theme=dark] .msg-content :deep(pre code .hljs-builtin-name) { color: #79c0ff; }
:root.dark .msg-content :deep(pre code .hljs-meta),
[data-theme=dark] .msg-content :deep(pre code .hljs-meta) { color: #8b949e; }

/* Code block wrapper with header */
.msg-content :deep(.code-block-wrapper) {
  position: relative;
  margin: 0 0 1rem;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  background: var(--bg-card);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease;
}

.msg-content :deep(.code-block-wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:root.dark .msg-content :deep(.code-block-wrapper),
[data-theme=dark] .msg-content :deep(.code-block-wrapper) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

:root.dark .msg-content :deep(.code-block-wrapper:hover),
[data-theme=dark] .msg-content :deep(.code-block-wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Code block header with language label and copy button */
.msg-content :deep(.code-block-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid var(--border-subtle);
}

:root.dark .msg-content :deep(.code-block-header),
[data-theme=dark] .msg-content :deep(.code-block-header) {
  background: rgba(255, 255, 255, 0.03);
}

/* Language label */
.msg-content :deep(.code-block-lang) {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: var(--font-mono);
}

/* Copy button */
.msg-content :deep(.code-block-copy) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.msg-content :deep(.code-block-copy:hover) {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.msg-content :deep(.code-block-copy.copied) {
  color: #16a34a;
  border-color: #16a34a;
}

:root.dark .msg-content :deep(.code-block-copy.copied),
[data-theme=dark] .msg-content :deep(.code-block-copy.copied) {
  color: #22c55e;
  border-color: #22c55e;
}

/* Remove wrapper's pre styling since it's now inside wrapper */
.msg-content :deep(.code-block-wrapper pre) {
  margin: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

/* Table wrapper + copy (align original UI) */
.msg-content :deep(.table-block-wrapper) {
  position: relative;
  margin: 0 0 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  background: var(--bg-card);
}
.msg-content :deep(.table-scroll) { overflow-x: auto; }
.msg-content :deep(.table-block-wrapper table) {
  width: 100%;
  border-collapse: collapse;
  font-size: .92rem;
  color: var(--text-primary);
  background: transparent;
}
.msg-content :deep(.table-block-wrapper thead th) {
  background: var(--bg-hover);
  font-weight: 600;
  text-align: left;
}
.msg-content :deep(.table-block-wrapper th),
.msg-content :deep(.table-block-wrapper td) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
  white-space: nowrap;
}
.msg-content :deep(.table-block-wrapper tr:last-child td) { border-bottom: none; }
.msg-content :deep(.table-block-wrapper tbody tr:hover) { background: var(--bg-hover); }
.msg-content :deep(.table-copy-btn) {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--border-subtle);
  background: rgba(255,255,255,.92);
  color: #64748b;
  font-size: .75rem;
  border-radius: 8px;
  cursor: pointer;
  opacity: 0;
  transition: opacity .2s, background .2s, color .2s;
}
.msg-content :deep(.table-block-wrapper:hover .table-copy-btn) { opacity: 1; }
.msg-content :deep(.table-copy-btn:hover) { background: rgba(0,0,0,.06); color: #334155; }
.msg-content :deep(.table-copy-btn.copied) { color: #16a34a; opacity: 1; }

/* ── Streaming indicators ────────────────────────────────────────────────── */
.streaming-dots {
  display: inline-flex; gap: 5px; align-items: center; padding: 4px 2px;
}
.streaming-dots span {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--text-tertiary); opacity: .4;
  animation: bounce-dot 1.2s ease-in-out infinite;
}
.streaming-dots span:nth-child(2) { animation-delay: .2s; }
.streaming-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes bounce-dot {
  0%, 80%, 100% { transform: translateY(0); opacity: .4; }
  40% { transform: translateY(-5px); opacity: 1; }
}
.streaming-cursor {
  display: inline-block;
  width: 2px; height: 1em;
  background: currentColor;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink .8s step-end infinite;
}
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

/* ── Thinking steps — glassmorphism (matches original UI) ───────────────── */
.process-container {
  margin: 10px 0;
  border-radius: 18px;
  background: rgba(255,255,255,.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: none;
  font-size: .84rem;
  overflow: hidden;
  box-shadow:
    0 4px 16px rgba(15,23,42,.04),
    0 8px 32px rgba(15,23,42,.06),
    inset 0 1px 0 rgba(255,255,255,.6);
  transition: box-shadow .3s ease;
}
:root.dark .process-container,
[data-theme=dark] .process-container {
  background: rgba(30,30,40,.72);
  box-shadow:
    0 4px 16px rgba(0,0,0,.18),
    0 8px 32px rgba(0,0,0,.22),
    inset 0 1px 0 rgba(255,255,255,.06);
}
.process-container:hover {
  box-shadow:
    0 6px 20px rgba(15,23,42,.06),
    0 12px 40px rgba(15,23,42,.08),
    inset 0 1px 0 rgba(255,255,255,.7);
}
.process-header {
  padding: .9rem 1.25rem;
  background: linear-gradient(135deg,rgba(248,250,252,.85) 0%,rgba(241,245,249,.75) 100%);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #0f172a;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .65rem;
  user-select: none;
  font-size: .88rem;
  transition: background .2s ease;
}
:root.dark .process-header,
[data-theme=dark] .process-header {
  background: linear-gradient(135deg,rgba(30,32,42,.9) 0%,rgba(24,24,32,.8) 100%);
  color: var(--text-primary);
}
.process-header:hover {
  background: linear-gradient(135deg,rgba(241,245,249,.9) 0%,rgba(226,232,240,.8) 100%);
}
.process-header::before {
  content: '';
  width: 10px; height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);
  margin-right: .6rem; flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(37,99,235,.12),0 2px 8px rgba(37,99,235,.25);
  transition: box-shadow .2s ease;
}
.process-container:not(.collapsed) .process-header::before {
  box-shadow: 0 0 0 5px rgba(37,99,235,.15),0 2px 12px rgba(37,99,235,.35);
}
.process-header span:first-child { flex: 1; }
.process-chevron {
  flex-shrink: 0; opacity: .5;
  transition: transform .35s cubic-bezier(.4,0,.2,1), opacity .2s ease;
}
.process-header:hover .process-chevron { opacity: .8; }
.process-container:not(.collapsed) .process-chevron { transform: rotate(180deg); opacity: .7; }
.process-body {
  padding: 1rem 1.25rem;
  display: flex; flex-direction: column; gap: .8rem;
  border-top: 1px solid rgba(226,232,240,.5);
  max-height: 360px; overflow-y: auto;
  background: rgba(255,255,255,.65);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.process-container.collapsed .process-body {
  display: none;
}
:root.dark .process-body,
[data-theme=dark] .process-body {
  background: rgba(20,20,28,.65);
  border-top-color: rgba(255,255,255,.06);
}
.process-step {
  padding-left: .75rem;
  border-left: 2px solid rgba(226,232,240,.7);
  transition: border-color .2s ease;
}
.process-step:hover { border-left-color: rgba(59,130,246,.4); }
.step-title {
  font-weight: 600; color: #111827;
  font-size: .88rem; margin-bottom: .25rem;
  display: flex; align-items: center; gap: 6px;
}
:root.dark .step-title,[data-theme=dark] .step-title { color: var(--text-primary); }
.step-details {
  margin-top: .4rem; font-size: .78rem; color: #475569;
  white-space: pre-wrap;
  background: rgba(248,250,252,.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: .6rem .85rem; border-radius: 10px;
  box-shadow: inset 0 1px 2px rgba(148,163,184,.1),0 1px 3px rgba(15,23,42,.04);
  font-family: var(--font-mono);
}
:root.dark .step-details,[data-theme=dark] .step-details {
  background: rgba(30,32,42,.75); color: var(--text-secondary);
}
.step-spinner {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid #2563eb; border-top-color: transparent;
  border-radius: 50%; animation: spin .9s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Streaming thinking tokens inside step */
.step-content-stream {
  display: block;
  font-size: .82rem;
  color: #374151;
  line-height: 1.5;
  margin-top: 4px;
  padding-left: 1.2rem;
  border-left: 2px solid rgba(226,232,240,.6);
  margin-left: 5px;
  white-space: pre-wrap;
  font-family: var(--font-mono);
  word-break: break-all;
}
:root.dark .step-content-stream,
[data-theme=dark] .step-content-stream { color: var(--text-secondary); }

/* ── References ──────────────────────────────────────────────────────────── */
.ref-container {
  margin-top: 12px;
  border-top: 1px solid var(--border-subtle);
  padding-top: 10px;
  contain: content;
}
.ref-header {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600;
  color: var(--text-secondary); margin-bottom: 6px;
}
.ref-list { display: flex; flex-wrap: wrap; gap: 5px; }
.ref-list--cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ref-item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--bg-input);
  color: var(--text-primary);
  padding: 7px 10px;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition);
}
.ref-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}
.ref-item.active-highlight {
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96,165,250,.22);
  background: rgba(59,130,246,.08);
}
.ref-item--unused {
  opacity: .9;
}
.ref-id {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  line-height: 1.4;
  min-width: 28px;
}
.ref-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ref-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ref-preview {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.unused-refs-section { margin-top: 8px; }
.unused-header {
  cursor: pointer;
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.toggle-icon {
  font-size: 11px;
  color: var(--text-tertiary);
  transition: transform .15s ease;
}
.unused-refs-section.collapsed .toggle-icon { transform: rotate(0deg); }
.unused-refs-section:not(.collapsed) .toggle-icon { transform: rotate(90deg); }
.unused-list { display: flex; }
.unused-refs-section.collapsed .unused-list { display: none; }

/* ── Copy row ────────────────────────────────────────────────────────────── */
.chat-copy-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity var(--transition);
}
.chat-bubble-wrap:hover .chat-copy-row { opacity: 1; }

.chat-copy-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 3px 10px;
  background: none;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  font-size: 11px; font-weight: 500;
  color: var(--text-secondary); cursor: pointer;
  transition: all var(--transition);
}
.chat-copy-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-strong); }
.chat-copy-btn.copied { color: var(--accent-green, #16a34a); }

/* Download / export button */
.chat-download-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 8px;
  font-size: 11px; font-weight: 500;
  background: transparent; border: 1px solid var(--border-subtle);
  color: var(--text-secondary); cursor: pointer; transition: all .15s;
}
.chat-download-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-strong); }
.chat-download-btn.downloaded { color: var(--accent-green, #16a34a); }
.chat-copy-btn.copied { color: var(--accent-green); border-color: var(--accent-green); }
</style>
