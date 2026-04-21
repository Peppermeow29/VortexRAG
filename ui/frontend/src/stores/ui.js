import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore(
  'ui',
  () => {
    const language = ref('zh')
    const theme = ref('light') // 'dark' | 'light'
    const builderMode = ref('pipeline') // 'pipeline' | 'parameters' | 'prompts'
    const sidebarCollapsed = ref(false)
    const aiPanelOpen = ref(false)
    const consoleOpen = ref(false)
    const consoleLogs = ref([])
    const activePromptFile = ref('')  // tracks currently open prompt file for AI context
    const activePromptContent = ref('') // tracks current prompt file content for AI context
    const promptApplyTrigger = ref(null) // { filepath, content } — set by AIAssistantPanel to push content into PromptsPanel
    
    // AI 设置持久化
    const aiSettings = ref({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o'
    })
    
    // saveAiSettings / loadAiSettings are kept as no-ops for API compatibility.
    // Actual persistence is handled by pinia-plugin-persistedstate (key: 'ui', path: 'aiSettings').
    function loadAiSettings() {}
    function saveAiSettings() {}

    function appendConsole(msg) {
      const ts = new Date().toLocaleTimeString()
      consoleLogs.value.push(`[${ts}] ${msg}`)
      if (consoleLogs.value.length > 500) consoleLogs.value.shift()
    }
    function clearConsole() { consoleLogs.value = [] }

    function setLanguage(lang) { language.value = lang }
    function setTheme(t) { theme.value = t }
    function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark' }
    function setBuilderMode(mode) { builderMode.value = mode }
    function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }
    function toggleAiPanel() { aiPanelOpen.value = !aiPanelOpen.value }
    function toggleConsole() { consoleOpen.value = !consoleOpen.value }

    return {
      language, theme, builderMode, sidebarCollapsed, aiPanelOpen, consoleOpen, consoleLogs,
      activePromptFile, activePromptContent, promptApplyTrigger, aiSettings,
      setLanguage, setTheme, toggleTheme, setBuilderMode, toggleSidebar, toggleAiPanel, toggleConsole,
      appendConsole, clearConsole, saveAiSettings, loadAiSettings
    }
  },
  { persist: { paths: ['language', 'theme', 'sidebarCollapsed', 'aiSettings'] } }
)
