<template>
  <!-- Expand button: now handled inline in ChatMainView header -->

  <aside class="chat-sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="sidebar-brand-wrap">
        <span class="sidebar-brand-icon">
          <LogoIcon :size="32" />
        </span>
        <span class="sidebar-brand">Vortex<span class="sidebar-brand-rag">RAG</span></span>
      </div>
      <button class="btn-icon" style="margin-left:auto" @click="$emit('toggle')" :title="t('recent')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>

    <div class="sidebar-actions">
      <button class="sidebar-action-btn" @click="newChat">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        {{ t('new_chat') }}
      </button>
      <button class="sidebar-action-btn" @click="toggleKb()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        {{ t('knowledge_base') }}
      </button>
    </div>

    <div class="session-list-area">
      <div class="session-list-header">
        <span class="sidebar-section-label">{{ t('recent') }}</span>
        <button class="btn-icon" :title="t('chat_delete_all_title')" @click="clearAll">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>
      <div class="overflow-y-auto flex-1" style="padding:0 4px">
        <button
          v-for="s in chatStore.sessions" :key="s.id"
          class="session-item"
          :class="{ active: chatStore.currentSessionId === s.id }"
          @click="onSelectSession(s.id)"
        >
          <span class="session-title">{{ s.title || t('chat_untitled') }}</span>
          <span class="session-del" role="button" tabindex="0" @click.stop="chatStore.deleteSession(s.id)" @keydown.enter.stop="chatStore.deleteSession(s.id)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </span>
        </button>
        <div v-if="!chatStore.sessions.length" class="session-empty">
          {{ t('chat_untitled') }}...
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="sidebar-footer-btn" @click="settingsOpen = !settingsOpen">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        {{ t('settings') }}
      </button>
      <div v-if="settingsOpen" class="settings-menu">
        <button class="settings-menu-item" @click="$router.push('/builder'); settingsOpen=false">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          {{ t('builder') }}
        </button>
        <div class="settings-menu-divider"/>
        <div class="settings-menu-label">{{ t('theme') || 'Theme' }}</div>
        <button class="settings-menu-item theme-toggle-btn" @click="uiStore.toggleTheme()">
          <span v-if="uiStore.theme === 'dark'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            Light Mode
          </span>
          <span v-else>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            Dark Mode
          </span>
        </button>
        <div class="settings-menu-divider"/>
        <div class="settings-menu-label">{{ t('language') }}</div>
        <button class="settings-menu-item" :class="{ active: uiStore.language==='en' }" @click="setLang('en')">English</button>
        <button class="settings-menu-item" :class="{ active: uiStore.language==='zh' }" @click="setLang('zh')">中文</button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/chat.js'
import { useUiStore } from '@/stores/ui.js'
import LogoIcon from '@/components/icons/LogoIcon.vue'

defineProps({ collapsed: Boolean })
defineEmits(['toggle'])

const { t, locale } = useI18n()
const chatStore = useChatStore()
const uiStore = useUiStore()
const toggleKb = inject('toggleKb', () => {})
const closeKb = inject('closeKb', () => {})
const settingsOpen = ref(false)

function newChat() {
  // If current session has no messages, reuse it instead of creating a new one
  const current = chatStore.currentSession
  if (current && current.messages.length === 0) {
    closeKb()
    return
  }
  chatStore.createSession(null)
  closeKb()
}
function onSelectSession(id) {
  chatStore.currentSessionId = id
  closeKb() // close KB view, return to chat
}
function clearAll() { if (confirm(t('chat_delete_all_confirm'))) chatStore.clearAllSessions() }
function setLang(l) { uiStore.setLanguage(l); locale.value = l; settingsOpen.value = false }
</script>

<style scoped>
.sidebar-brand-wrap { display: flex; align-items: center; gap: 9px; }
.sidebar-brand-icon {
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(140deg, var(--accent) 0%, #5b9cf6 100%);
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(123,104,238,.45);
  transition: transform var(--spring), box-shadow var(--spring);
}
.sidebar-brand-wrap:hover .sidebar-brand-icon {
  transform: scale(1.08);
  box-shadow: 0 6px 18px rgba(123,104,238,.55);
}
.sidebar-brand { font-weight: 700; font-size: 16px; letter-spacing: -.4px; color: var(--text-primary); }
.sidebar-brand-rag { color: var(--accent); }

.sidebar-header {
  display: flex; align-items: center; gap: 8px;
  padding: 15px 13px 11px;
  border-bottom: 1px solid var(--border-subtle); flex-shrink: 0;
}

.sidebar-actions {
  padding: 8px 7px;
  display: flex; flex-direction: column; gap: 2px; flex-shrink: 0;
}
.sidebar-action-btn {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 9px 13px;
  background: none; border: none; border-radius: var(--radius-md);
  cursor: pointer; font-size: 14px; color: var(--text-primary);
  transition: all var(--transition); text-align: left;
  font-weight: 450;
}
.sidebar-action-btn:hover {
  background: var(--bg-hover);
  transform: translateX(2px);
}
.sidebar-action-btn:active { transform: scale(.97); }

.session-list-area {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; padding: 0 5px;
}
.session-list-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 7px 3px; flex-shrink: 0;
}
.session-item {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 9px 11px;
  background: none; border: none; border-radius: var(--radius-md);
  cursor: pointer; text-align: left;
  color: var(--text-primary); transition: all .16s ease;
  gap: 6px; font-weight: 440;
}
.session-item:hover { background: var(--bg-hover); transform: translateX(2px); }
.session-item.active {
  background: var(--bg-active);
  box-shadow: inset 0 0 0 1px var(--border-strong);
  font-weight: 550;
}
.session-title {
  flex: 1; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; font-size: 14px;
}
.session-del {
  opacity: 0; background: none; border: none; cursor: pointer;
  color: var(--text-tertiary); padding: 3px 4px;
  border-radius: 6px; transition: opacity .15s, color .15s;
  display: flex; align-items: center; flex-shrink: 0;
}
.session-item:hover .session-del { opacity: 1; }
.session-del:hover { color: var(--accent-red); }
.session-empty { padding: 18px 10px; color: var(--text-tertiary); font-size: 12px; }

.sidebar-footer {
  border-top: 1px solid var(--border-subtle);
  padding: 6px 7px; position: relative; flex-shrink: 0;
}
.sidebar-footer-btn {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 8px 11px;
  background: none; border: none; border-radius: var(--radius-md);
  cursor: pointer; font-size: 13px;
  color: var(--text-secondary); transition: all var(--transition);
}
.sidebar-footer-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

.settings-menu {
  position: absolute; bottom: calc(100% + 6px); left: 7px; right: 7px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-float);
  overflow: hidden; z-index: 100;
  animation: menuPop .18s cubic-bezier(.34,1.56,.64,1);
}
@keyframes menuPop {
  from { opacity: 0; transform: scale(.94) translateY(6px); }
}
.settings-menu-item {
  display: flex; align-items: center; gap: 9px;
  width: 100%; padding: 9px 14px;
  background: none; border: none; font-size: 13px;
  text-align: left; cursor: pointer; color: var(--text-primary);
  transition: background var(--transition);
}
.settings-menu-item:hover { background: var(--bg-hover); }
.settings-menu-item.active { font-weight: 600; color: var(--accent); }
.settings-menu-divider { height: 1px; background: var(--border-subtle); margin: 2px 0; }
.settings-menu-label {
  padding: 5px 14px 2px; font-size: 10px; font-weight: 700;
  color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .07em;
}
.theme-toggle-btn span { display: flex; align-items: center; gap: 8px; }
</style>
