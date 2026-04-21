/**
 * pipelineParser.js
 * YAML ↔ Node Tree bidirectional parser/serializer for VortexRAG pipelines.
 *
 * Node Tree types:
 *   StepNode:   { kind:'step', id, server, tool, input?, output? }
 *   LoopNode:   { kind:'loop', id, times, steps:[] }
 *   BranchNode: { kind:'branch', id, router:[], branches:{key:[]} }
 */

import jsyaml from 'js-yaml'

let _idCounter = 0
function uid(prefix = 'n') { return `${prefix}_${++_idCounter}_${Math.random().toString(36).slice(2,6)}` }

// ─── YAML → Node Tree ────────────────────────────────────────────────────────

/**
 * Parse a single pipeline step (element of the pipeline array).
 * Steps can be:
 *   - string: "server.tool"
 *   - object with one key:
 *       "server.tool": { input:{...}, output:{...} }
 *       loop: { times:N, steps:[...] }
 *       branch: { router:[...], branches:{...} }
 */
export function parseStep(raw) {
  if (typeof raw === 'string') {
    return parseStepString(raw)
  }
  if (typeof raw === 'object' && raw !== null) {
    const keys = Object.keys(raw)
    if (keys.length === 1) {
      const key = keys[0]
      if (key === 'loop') return parseLoop(raw.loop)
      if (key === 'branch') return parseBranch(raw.branch)
      // server.tool: { input, output }
      return parseStepString(key, raw[key])
    }
  }
  // Unknown — treat as raw text step
  return { kind: 'step', id: uid('s'), server: '?', tool: String(raw), input: {}, output: {} }
}

function parseStepString(dotStr, opts = {}) {
  const [server = '', tool = ''] = dotStr.split('.', 2)
  return {
    kind: 'step',
    id: uid('s'),
    server: server.trim(),
    tool: tool.trim(),
    input: opts?.input ?? {},
    output: opts?.output ?? {},
  }
}

function parseLoop(raw) {
  return {
    kind: 'loop',
    id: uid('l'),
    times: Number(raw?.times ?? 1),
    steps: (raw?.steps ?? []).map(parseStep),
  }
}

function parseBranch(raw) {
  const router = (raw?.router ?? []).map(parseStep)
  const branches = {}
  for (const [k, v] of Object.entries(raw?.branches ?? {})) {
    branches[k] = (v ?? []).map(parseStep)
  }
  return { kind: 'branch', id: uid('b'), router, branches }
}

/**
 * Parse full pipeline YAML string into { servers, steps }.
 * Returns null on parse error.
 */
export function parseYaml(yamlStr) {
  if (!yamlStr || !yamlStr.trim()) return { servers: {}, steps: [] }
  try {
    const doc = jsyaml.load(yamlStr)
    if (!doc || typeof doc !== 'object') return { servers: {}, steps: [] }
    const servers = doc.servers ?? {}
    const steps = (doc.pipeline ?? []).map(parseStep)
    return { servers, steps }
  } catch (e) {
    return null // parse error
  }
}

// ─── Node Tree → YAML ────────────────────────────────────────────────────────

function serializeStep(node) {
  const dotStr = `${node.server}.${node.tool}`
  const hasInput = node.input && Object.keys(node.input).length > 0
  const hasOutput = node.output && Object.keys(node.output).length > 0
  if (!hasInput && !hasOutput) return dotStr
  const opts = {}
  if (hasInput) opts.input = node.input
  if (hasOutput) opts.output = node.output
  return { [dotStr]: opts }
}

function serializeLoop(node) {
  return {
    loop: {
      times: node.times,
      steps: node.steps.map(serializeNode),
    }
  }
}

function serializeBranch(node) {
  const branches = {}
  for (const [k, v] of Object.entries(node.branches)) {
    branches[k] = v.map(serializeNode)
  }
  return {
    branch: {
      router: node.router.map(serializeNode),
      branches,
    }
  }
}

function serializeNode(node) {
  if (node.kind === 'step') return serializeStep(node)
  if (node.kind === 'loop') return serializeLoop(node)
  if (node.kind === 'branch') return serializeBranch(node)
  return String(node)
}

/**
 * Serialize { servers, steps } back to YAML string.
 */
export function serializeYaml(servers, steps) {
  const doc = {}
  if (servers && Object.keys(servers).length) doc.servers = servers
  doc.pipeline = steps.map(serializeNode)
  return jsyaml.dump(doc, { indent: 2, lineWidth: -1, noRefs: true })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a new empty StepNode */
export function makeStep(server = '', tool = '') {
  return { kind: 'step', id: uid('s'), server, tool, input: {}, output: {} }
}

/** Create a new LoopNode */
export function makeLoop() {
  return { kind: 'loop', id: uid('l'), times: 3, steps: [makeStep()] }
}

/** Create a new BranchNode */
export function makeBranch() {
  return {
    kind: 'branch', id: uid('b'),
    router: [makeStep()],
    branches: { 'branch_a': [], 'branch_b': [] }
  }
}

/** Infer server kind from name for color coding */
const KIND_MAP = {
  retriev: 'retriever', generat: 'generator', llm: 'generator',
  rerank: 'reranker', prompt: 'prompt', router: 'router',
  corpus: 'corpus', chunk: 'corpus', bench: 'benchmark',
  embed: 'embedder', eval: 'evaluator', custom: 'custom',
  sayhello: 'demo', hello: 'demo'
}
export function inferKind(name = '') {
  const low = name.toLowerCase()
  for (const [k, v] of Object.entries(KIND_MAP)) {
    if (low.includes(k)) return v
  }
  return 'server'
}

export const KIND_COLORS = {
  retriever:  '#4f8ef7',
  generator:  '#a78bfa',
  reranker:   '#f7b84b',
  prompt:     '#3ecf8e',
  router:     '#f26565',
  corpus:     '#fb923c',
  embedder:   '#22d3ee',
  benchmark:  '#f472b6',
  evaluator:  '#e879f9',
  custom:     '#94a3b8',
  demo:       '#7c6af7',
  server:     '#64748b',
}
