import client from './client.js'

export const aiApi = {
  // Test AI connection with given config
  test: (cfg) => client.post('/ai/test', cfg).then(r => r.data),

  // Non-streaming AI chat (fallback)
  chat: (messages, cfg) => client.post('/ai/chat', { messages, ...cfg }).then(r => r.data),
}

/**
 * Streaming AI assistant chat via SSE
 * @param {{ messages, provider, baseUrl, apiKey, model }} payload
 * @param {{ onToken, onDone, onError }} handlers
 * @returns AbortController
 */
export function streamAiChat(payload, handlers) {
  const controller = new AbortController()
  ;(async () => {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        // Non-streaming fallback
        const data = await res.json().catch(() => ({}))
        handlers.onToken?.(data.content ?? data.response ?? '')
        handlers.onDone?.()
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let doneCalled = false
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
          if (!jsonStr || jsonStr === '[DONE]') continue
          try {
            const evt = JSON.parse(jsonStr)
            if (evt.type === 'token') handlers.onToken?.(evt.content ?? '')
            else if (evt.type === 'final' || evt.done) {
              doneCalled = true
              handlers.onDone?.(evt.actions ?? [])
            } else if (evt.content) {
              // fallback: plain content field without type
              handlers.onToken?.(evt.content)
            }
          } catch {
            // plain text token
            handlers.onToken?.(jsonStr)
          }
        }
      }
      // Only fire onDone if a 'final' event has not already done so
      if (!doneCalled) {
        handlers.onDone?.()
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
      handlers.onError?.(err?.message ?? String(err))
    }
  })()
  return controller
}
