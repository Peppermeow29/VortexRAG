import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useChatStore = defineStore(
  'chat',
  () => {
    const sessions = ref([])
    const currentSessionId = ref(null)
    const engineStatus = ref('offline')
    const activeEngines = ref({})
    const isStreaming = ref(false)
    const selectedCollection = ref('')
    const backgroundMode = ref(false)
    const showThinking = ref(false)
    const showReferences = ref(true)

    const currentSession = computed(() =>
      sessions.value.find(s => s.id === currentSessionId.value) ?? null
    )

    const sortedSessions = computed(() =>
      [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
    )

    function createSession(pipelineName = null) {
      const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const session = {
        id,
        title: 'Untitled Chat',
        messages: [],
        pipelineName,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      sessions.value.unshift(session)
      currentSessionId.value = id
      if (sessions.value.length > 50) sessions.value = sessions.value.slice(0, 50)
      return session
    }

    function deleteSession(id) {
      const idx = sessions.value.findIndex(s => s.id === id)
      if (idx !== -1) sessions.value.splice(idx, 1)
      if (currentSessionId.value === id) {
        currentSessionId.value = sessions.value[0]?.id ?? null
      }
    }

    function renameSession(id, newTitle) {
      const session = sessions.value.find(s => s.id === id)
      if (session && newTitle.trim()) {
        session.title = newTitle.trim()
        session.updatedAt = Date.now()
      }
    }

    function clearAllSessions() {
      sessions.value = []
      currentSessionId.value = null
    }

    function clearSessionHistory(id) {
      const session = sessions.value.find(s => s.id === id)
      if (session) {
        session.messages = []
        session.updatedAt = Date.now()
      }
    }

    function addMessage(sessionId, msg) {
      const session = sessions.value.find(s => s.id === sessionId)
      if (!session) return
      session.messages.push(msg)
      session.updatedAt = Date.now()
      if (session.title === 'Untitled Chat' && msg.role === 'user') {
        session.title = msg.content.slice(0, 40)
      }
    }

    function updateMessage(sessionId, msgId, patch) {
      const session = sessions.value.find(s => s.id === sessionId)
      if (!session) return
      const msg = session.messages.find(m => m.id === msgId)
      if (msg) Object.assign(msg, patch)
    }

    function deleteMessage(sessionId, msgId) {
      const session = sessions.value.find(s => s.id === sessionId)
      if (!session) return
      const idx = session.messages.findIndex(m => m.id === msgId)
      if (idx !== -1) session.messages.splice(idx, 1)
    }

    function exportSession(id) {
      const session = sessions.value.find(s => s.id === id)
      if (!session) return null
      return JSON.stringify(session, null, 2)
    }

    function importSession(jsonStr) {
      try {
        const session = JSON.parse(jsonStr)
        session.id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        session.createdAt = Date.now()
        session.updatedAt = Date.now()
        sessions.value.unshift(session)
        currentSessionId.value = session.id
        return session
      } catch (e) {
        throw new Error('Invalid session data')
      }
    }

    function createSessionFromBackground(taskData) {
      if (!taskData || !taskData.question || !taskData.result) {
        console.warn('Invalid task data for session creation', taskData)
        return null
      }

      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

      // Convert backend timestamps (seconds) to frontend timestamps (milliseconds)
      const createdTimestamp = Math.floor((taskData.created_at ?? Date.now() / 1000) * 1000)
      const completedTimestamp = Math.floor((taskData.completed_at ?? Date.now() / 1000) * 1000)

      const userMsg = {
        id: `u_${createdTimestamp}`,
        role: 'user',
        content: taskData.question,
        timestamp: createdTimestamp
      }

      const assistantMsg = {
        id: `a_${completedTimestamp}`,
        role: 'assistant',
        content: taskData.result,
        sources: taskData.sources || [],
        isStreaming: false,
        timestamp: completedTimestamp
      }

      const session = {
        id: sessionId,
        title: taskData.question.slice(0, 40),
        messages: [userMsg, assistantMsg],
        pipelineName: taskData.pipeline_name || null,
        createdAt: createdTimestamp,
        updatedAt: completedTimestamp
      }

      sessions.value.unshift(session)

      // Enforce 50 session limit
      if (sessions.value.length > 50) {
        sessions.value.splice(50)
      }

      return session
    }

    function setEngineStatus(status) { engineStatus.value = status }
    function registerEngine(pipelineName, sessionId) { activeEngines.value[pipelineName] = sessionId }
    function unregisterEngine(pipelineName) { delete activeEngines.value[pipelineName] }
    function getEngineSessionId(pipelineName) { return activeEngines.value[pipelineName] ?? null }
    function setShowThinking(value) { showThinking.value = value }
    function setShowReferences(value) { showReferences.value = value }

    return {
      sessions, currentSessionId, engineStatus, activeEngines, isStreaming,
      selectedCollection, backgroundMode, currentSession, sortedSessions,
      showThinking, showReferences,
      createSession, deleteSession, renameSession, clearAllSessions, clearSessionHistory,
      addMessage, updateMessage, deleteMessage,
      exportSession, importSession,
      createSessionFromBackground,
      setEngineStatus, registerEngine, unregisterEngine, getEngineSessionId,
      setShowThinking, setShowReferences
    }
  },
  {
    persist: {
      paths: ['sessions', 'currentSessionId', 'activeEngines', 'selectedCollection']
    }
  }
)
