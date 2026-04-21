import client, { cachedGet, invalidateCache } from './client.js'

const TTL_LIST = 5_000   // pipeline list: 5s TTL
const TTL_YAML = 15_000  // pipeline YAML: 15s TTL
const TTL_PARAMS = 10_000

export const pipelinesApi = {
  // Cached list — invalidated on save/delete/build
  list: () => cachedGet('/pipelines', TTL_LIST).then(r => r.data),

  // Cached YAML fetch — invalidated on saveYaml
  get: (name) => cachedGet(`/pipelines/${name}`, TTL_YAML).then(r => r.data),

  saveYaml: (name, yaml) => {
    invalidateCache(`/pipelines/${name}`)
    invalidateCache('/pipelines')
    return client.put(`/pipelines/${name}/yaml`, yaml, {
      headers: { 'Content-Type': 'text/plain' }
    }).then(r => r.data)
  },

  save: (payload) => {
    invalidateCache('/pipelines')
    return client.post('/pipelines', payload).then(r => r.data)
  },

  delete: (name) => {
    invalidateCache('/pipelines')
    invalidateCache(`/pipelines/${name}`)
    return client.delete(`/pipelines/${name}`).then(r => r.data)
  },

  rename: (name, newName) => {
    invalidateCache('/pipelines')
    invalidateCache(`/pipelines/${name}`)
    return client.post(`/pipelines/${name}/rename`, { new_name: newName }).then(r => r.data)
  },

  parseYaml: (yaml) =>
    client.post('/pipelines/parse', yaml, {
      headers: { 'Content-Type': 'text/plain' }
    }).then(r => r.data),

  getParameters: (name) => cachedGet(`/pipelines/${name}/parameters`, TTL_PARAMS).then(r => r.data),

  saveParameters: (name, params) => {
    invalidateCache(`/pipelines/${name}/parameters`)
    return client.put(`/pipelines/${name}/parameters`, params).then(r => r.data)
  },

  build: (name) => {
    invalidateCache(`/pipelines/${name}`)
    invalidateCache(`/pipelines/${name}/parameters`)
    invalidateCache('/pipelines')
    return client.post(`/pipelines/${name}/build`).then(r => r.data)
  },
}
