<template>
  <aside class="workspace-sidebar">
    <nav class="workspace-nav">
      <div class="workspace-nav-top">
        <button
          v-for="item in navItems" :key="item.mode"
          class="workspace-nav-btn"
          :class="{ active: uiStore.builderMode === item.mode }"
          :title="t(item.labelKey)"
          @click="switchMode(item.mode)"
        >
          <component :is="item.icon" :size="20" />
          <span class="nav-label">{{ t(item.labelKey) }}</span>
        </button>
      </div>

      <div class="workspace-nav-spacer" />

      <div class="workspace-nav-bottom">
        <button
          class="workspace-nav-btn"
          :title="t('chat_nav_label') || 'Chat'"
          @click="$router.push('/chat')"
        >
          <IconChat :size="20" />
          <span class="nav-label">Chat</span>
        </button>

        <!-- Settings button -->
        <button
          ref="settingsBtn"
          class="workspace-nav-btn"
          :class="{ active: settingsOpen }"
          :title="t('settings')"
          @click.stop="toggleSettings"
        >
          <IconSettings :size="20" />
          <span class="nav-label">{{ t('settings') }}</span>
        </button>
      </div>
    </nav>

    <!-- Teleport dropdown to body to avoid overflow:hidden clipping -->
    <Teleport to="body">
      <Transition name="settings-pop">
        <div
          v-if="settingsOpen"
          class="settings-dropdown"
          :style="dropdownStyle"
          @click.stop
        >
          <div class="settings-section-label">{{ t('theme') || 'Theme' }}</div>
          <button class="settings-item" @click="uiStore.toggleTheme(); settingsOpen = false">
            <svg v-if="uiStore.theme === 'dark'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            {{ uiStore.theme === 'dark' ? 'Light Mode' : 'Dark Mode' }}
          </button>

          <div class="settings-divider" />
          <div class="settings-section-label">{{ t('language') }}</div>
          <button class="settings-item" :class="{ active: uiStore.language === 'zh' }" @click="setLang('zh')">中文</button>
          <button class="settings-item" :class="{ active: uiStore.language === 'en' }" @click="setLang('en')">English</button>

          <div class="settings-divider" />
          <button class="settings-item" @click="$router.push('/chat'); settingsOpen = false">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {{ t('chat_nav_label') || 'Chat' }}
          </button>
        </div>
      </Transition>
    </Teleport>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import IconPipeline from '@/components/icons/IconPipeline.vue'
import IconSettings from '@/components/icons/IconSettings.vue'
import IconPrompts from '@/components/icons/IconPrompts.vue'
import IconChat from '@/components/icons/IconChat.vue'
import IconParams from '@/components/icons/IconParams.vue'

const { t, locale } = useI18n()
const uiStore = useUiStore()
const router = useRouter()
const settingsOpen = ref(false)
const settingsBtn = ref(null)
const btnRect = ref({ top: 0, left: 0, width: 0, height: 0 })

const navItems = [
  { mode: 'pipeline',   labelKey: 'builder_nav_pipeline', icon: IconPipeline },
  { mode: 'parameters', labelKey: 'builder_nav_params',   icon: IconParams   },
  { mode: 'prompts',    labelKey: 'builder_nav_prompts',  icon: IconPrompts  },
]

const modeLogKey = {
  pipeline:   'builder_switched_to_pipeline',
  parameters: 'builder_switched_to_parameters',
  prompts:    'builder_switched_to_prompts',
}

// Position dropdown to the right of the button
const dropdownStyle = computed(() => ({
  position: 'fixed',
  left: (btnRect.value.left + btnRect.value.width + 8) + 'px',
  bottom: (window.innerHeight - btnRect.value.bottom + 4) + 'px',
  width: '190px',
  zIndex: 9999,
}))

function switchMode(mode) {
  uiStore.setBuilderMode(mode)
  uiStore.appendConsole(t(modeLogKey[mode]))
}

function toggleSettings() {
  if (!settingsOpen.value) {
    // Capture button position before opening
    const rect = settingsBtn.value?.getBoundingClientRect()
    if (rect) btnRect.value = rect
  }
  settingsOpen.value = !settingsOpen.value
}

function setLang(lang) {
  uiStore.setLanguage(lang)
  locale.value = lang
  settingsOpen.value = false
}

function onOutsideClick(e) {
  if (settingsBtn.value && settingsBtn.value.contains(e.target)) return
  settingsOpen.value = false
}

onMounted(() => document.addEventListener('mousedown', onOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', onOutsideClick))
</script>

<style scoped>
.workspace-sidebar {
  width: var(--workspace-width);
  flex-shrink: 0;
  background: var(--bg-card);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.workspace-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 8px 0;
}
.workspace-nav-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
}
.workspace-nav-spacer { flex: 1; }
.workspace-nav-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  padding-bottom: 4px;
}
.workspace-nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 52px;
  padding: 8px 4px;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all var(--transition);
  margin: 0 4px;
  position: relative;
}
.workspace-nav-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.workspace-nav-btn.active {
  background: rgba(99,102,241,.1);
  color: var(--accent);
}
.workspace-nav-btn.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 20%;
  bottom: 20%;
  width: 2.5px;
  border-radius: 0 2px 2px 0;
  background: var(--accent);
}
.nav-label {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: .02em;
  line-height: 1;
  text-transform: uppercase;
  opacity: .85;
}
.workspace-nav-btn.active .nav-label { opacity: 1; }
</style>
<style>
/* Global styles for teleported dropdown — cannot be scoped */
.settings-dropdown {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.16);
  overflow: hidden;
  padding: 4px 0;
}
.settings-section-label {
  padding: 6px 14px 2px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: .07em;
}
.settings-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 14px;
  background: none;
  border: none;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  color: var(--text-primary);
  transition: background .12s;
}
.settings-item:hover { background: var(--bg-hover); }
.settings-item.active { font-weight: 600; color: var(--accent); }
.settings-divider { height: 1px; background: var(--border-subtle); margin: 4px 0; }
.settings-pop-enter-active { transition: opacity .15s, transform .15s cubic-bezier(.34,1.56,.64,1); }
.settings-pop-leave-active { transition: opacity .1s ease; }
.settings-pop-enter-from, .settings-pop-leave-to { opacity: 0; transform: scale(.95) translateX(-4px); }
</style>

