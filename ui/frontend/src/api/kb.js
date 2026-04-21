import client, { cachedGet, invalidateCache } from './client.js'

const TTL_FILES = 8_000

export const kbApi = {
  getFiles: () => cachedGet('/kb/files', TTL_FILES).then(r => r.data),

  getConfig: () => cachedGet('/kb/config', 30_000).then(r => r.data),

  saveConfig: (cfg) => {
    invalidateCache('/kb/config')
    return client.post('/kb/config', cfg).then(r => r.data)
  },

  upload: (files, onProgress) => {
    invalidateCache('/kb/files')
    const form = new FormData()
    files.forEach(f => form.append('file', f))
    return client.post('/kb/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
    }).then(r => r.data)
  },

  deleteFile: (category, filename) => {
    invalidateCache('/kb/files')
    return client.delete(`/kb/files/${category}/${filename}`).then(r => r.data)
  },

  renameFile: async (category, filename, displayName) => {
    invalidateCache('/kb/files')
    try {
      const res = await client.post(`/kb/files/${category}/${filename}/rename`, { display_name: displayName })
      return res.data
    } catch (e) {
      const status = e?.status
      const details = String(e?.details || e?.message || '').toLowerCase()
      const methodNotAllowed = status === 405 || details.includes('method') && details.includes('not allowed')
      if (!methodNotAllowed) throw e
      const res = await client.put(`/kb/files/${category}/${filename}/rename`, { display_name: displayName })
      return res.data
    }
  },

  clearStaging: () => {
    invalidateCache('/kb/files')
    return client.post('/kb/staging/clear').then(r => r.data)
  },

  runTask: (payload) => {
    invalidateCache('/kb/files')
    return client.post('/kb/run', payload).then(r => r.data)
  },

  getTaskStatus: (taskId) =>
    client.get(`/kb/status/${taskId}`, { timeout: 8000 }).then(r => r.data),

  inspectFolder: (category, name) =>
    client.get('/kb/files/inspect', { params: { category, name } }).then(r => r.data),
}

export async function pollKbTask(taskId, { interval = 2000, maxAttempts = 120 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const status = await kbApi.getTaskStatus(taskId)
      if (status.done || status.progress === 100) {
        return { ...status, done: true }
      }
      await new Promise(resolve => setTimeout(resolve, interval))
    } catch (e) {
      if (e.message?.includes('timeout')) {
        await new Promise(resolve => setTimeout(resolve, interval))
        continue
      }
      throw e
    }
  }
  return { done: false, progress: -1, message: 'Polling timeout' }
}
