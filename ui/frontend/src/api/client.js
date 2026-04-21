import axios from 'axios'

// ─── Pending request deduplication map ───────────────────────────────────────
// Key: `${method}:${url}[?params]`  Value: Promise
const _pending = new Map()

function _pendingKey(config) {
  const params = config.params ? '?' + new URLSearchParams(config.params).toString() : ''
  return `${(config.method || 'get').toUpperCase()}:${config.baseURL ?? ''}${config.url}${params}`
}

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// ─── Response interceptor: unified error normalisation ───────────────────────
client.interceptors.response.use(
  res => res,
  err => {
    if (axios.isCancel(err)) {
      return Promise.reject(err)
    }
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Unknown error'
    const normalized = new Error(msg)
    normalized.status = err.response?.status
    normalized.details = err.response?.data?.details
    normalized.payload = err.response?.data
    return Promise.reject(normalized)
  }
)

// ─── Thin GET wrapper with deduplication ─────────────────────────────────────
/**
 * Deduplicated GET helper.
 * While an identical GET is in-flight, subsequent callers share the same promise.
 * Cache is invalidated as soon as the request settles.
 */
function deduplicatedGet(url, config = {}) {
  const fullConfig = { ...config, method: 'get', url, baseURL: '/api' }
  const key = _pendingKey(fullConfig)

  if (_pending.has(key)) {
    return _pending.get(key)
  }

  const promise = client.get(url, config).finally(() => {
    _pending.delete(key)
  })

  _pending.set(key, promise)
  return promise
}

// ─── Simple TTL in-memory cache for rarely-changing data ─────────────────────
const _cache = new Map()  // key -> { data, expiresAt }

/**
 * Cached GET. Returns cached data if fresh, otherwise fetches and caches.
 * @param {string} url
 * @param {number} ttlMs  Cache TTL in milliseconds (default 10 s)
 * @param {object} config Optional axios config
 */
export async function cachedGet(url, ttlMs = 10_000, config = {}) {
  const key = _pendingKey({ method: 'GET', url, baseURL: '/api', params: config.params })
  const cached = _cache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }
  const res = await deduplicatedGet(url, config)
  _cache.set(key, { data: res, expiresAt: Date.now() + ttlMs })
  return res
}

/**
 * Invalidate all cache entries whose keys start with a given prefix.
 * Call this after mutating operations (POST/PUT/DELETE) on a resource.
 */
export function invalidateCache(urlPrefix) {
  for (const key of _cache.keys()) {
    if (key.includes(urlPrefix)) _cache.delete(key)
  }
}

export { deduplicatedGet as getDedup }
export default client
