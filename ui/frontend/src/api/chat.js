import client from './client.js'

// ─── Persistent user ID (isolates background tasks per browser) ───────────────
const USER_ID_KEY = 'vortexrag_user_id'
export function getUserId() {
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11)
    localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

export const chatApi = {
  startEngine: (name, sessionId) =>
    client.post(`/pipelines/${name}/demo/start`, { session_id: sessionId }).then(r => r.data),
  stopEngine: (sessionId) =>
    client.post('/pipelines/demo/stop', { session_id: sessionId }).then(r => r.data),
  stopGeneration: (sessionId) =>
    client.post('/pipelines/chat/stop', { session_id: sessionId }).then(r => r.data),
  clearHistory: (sessionId) =>
    client.post('/pipelines/chat/clear-history', { session_id: sessionId }).then(r => r.data),
  getHistory: (sessionId) =>
    client.get(`/pipelines/chat/history?session_id=${encodeURIComponent(sessionId)}`).then(r => r.data),
}

// ─── Background task API ──────────────────────────────────────────────────────
export const backgroundApi = {
  sendToBackground: (pipelineName, payload) =>
    client.post(`/pipelines/${pipelineName}/chat/background`, payload).then(r => r.data),

  getTasks: (userId, limit = 20) =>
    client.get(`/background-tasks?limit=${limit}&user_id=${encodeURIComponent(userId)}`).then(r => r.data),

  getTask: (taskId, userId) =>
    client.get(`/background-tasks/${taskId}?user_id=${encodeURIComponent(userId)}`).then(r => r.data),

  deleteTask: (taskId, userId) =>
    client.delete(`/background-tasks/${taskId}?user_id=${encodeURIComponent(userId)}`).then(r => r.data),

  clearCompleted: (userId) =>
    client.post('/background-tasks/clear-completed', { user_id: userId }).then(r => r.data),
}

/**
 * Export a chat message as DOCX via the backend API.
 * @param {{ text: string, question: string, sources: any[] }} payload
 * @returns {Promise<Blob>}
 */
export async function exportChatDocx(payload) {
  const res = await fetch('/api/chat/export/docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`
    try {
      const errJson = await res.clone().json()
      errMsg = errJson.error || errJson.message || errMsg
    } catch {}
    throw new Error(errMsg)
  }
  return res.blob()
}

/**
 * SSE streaming chat. Returns AbortController.
 * @param {string} pipelineName
 * @param {{ question, session_id, conversation_history?, dynamic_params? }} payload
 * @param {{ onToken, onSources, onStepStart, onStepEnd, onFinal, onError }} handlers
 */
export function streamChat(pipelineName, payload, handlers) {
  const controller = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(`/api/pipelines/${pipelineName}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      if (!res.ok || !res.body) {
        // Try to parse error message from response body
        let errMsg = `HTTP ${res.status}`
        try {
          const errJson = await res.clone().json()
          errMsg = errJson.error || errJson.message || errMsg
        } catch {}
        handlers.onError?.(errMsg)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const jsonStr = trimmed.slice(5).trim()
          if (!jsonStr) continue
          try {
            const evt = JSON.parse(jsonStr)
            switch (evt.type) {
              case 'token':
                // Only forward final tokens (is_final: true) as answer content.
                // Non-final tokens are step-level thinking tokens shown in process UI.
                if (evt.is_final === false) { handlers.onThinkToken?.(evt.content ?? '') } else { handlers.onToken?.(evt.content ?? '') }
                break
              case 'sources': handlers.onSources?.(evt.data ?? []); break
              case 'step_start': handlers.onStepStart?.(evt.name ?? '', evt.depth ?? 0); break
              case 'step_end': handlers.onStepEnd?.(evt.name ?? '', evt.output ?? ''); break
              case 'final': handlers.onFinal?.(evt.data ?? {}); break
              case 'error': handlers.onError?.(evt.message ?? 'Unknown error'); break
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
      handlers.onError?.(err?.message ?? String(err))
    }
  })()

  return controller
}
