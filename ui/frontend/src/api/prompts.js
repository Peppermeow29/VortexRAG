import client, { cachedGet, invalidateCache } from './client.js'

export const promptsApi = {
  list: () => cachedGet('/prompts', 30_000).then(r => Array.isArray(r) ? r : (r?.data ?? [])),

  get: (filepath) => client.get(`/prompts/${filepath}`).then(r => r.data),

  create: (name, content) =>
    client.post('/prompts', { name, content }).then(r => {
      invalidateCache('/prompts')
      return r.data
    }),

  update: (filepath, content) =>
    client.put(`/prompts/${filepath}`, { content }).then(r => r.data),

  delete: (filepath) =>
    client.delete(`/prompts/${filepath}`).then(r => {
      invalidateCache('/prompts')
      return r.data
    }),

  rename: (filepath, newName) =>
    client.post(`/prompts/${filepath}/rename`, { new_name: newName }).then(r => {
      invalidateCache('/prompts')
      return r.data
    }),
}
