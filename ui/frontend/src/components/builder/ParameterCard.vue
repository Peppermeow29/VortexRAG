<template>
  <div class="parameter-section" :class="{expanded: open}">
    <div class="parameter-section-header" @click="open=!open">
      <div class="section-header-left">
        <svg class="section-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        <span class="section-title">{{ serverName.toUpperCase() }}</span>
        <span class="section-badge">{{ visibleCount }} {{ t('builder_params_count') }}</span>
      </div>
    </div>
    <div v-show="open" class="parameter-section-content">
      <div class="parameter-grid">
        <div v-for="(val, key) in visible" :key="key" class="parameter-field" :class="{' full-width': isLong(val)}">
          <label class="parameter-label">{{ key }}</label>
          <textarea
            v-if="isLong(val)"
            class="parameter-input parameter-textarea"
            :value="String(val)"
            rows="3"
            @change="onUpdate(key, $event.target.value)"
          />
          <input
            v-else-if="typeof val !== 'boolean'"
            class="parameter-input"
            :type="typeof val === 'number' ? 'number' : 'text'"
            :value="String(val)"
            @change="onUpdate(key, castValue(val, $event.target.value))"
          />
          <label v-else class="parameter-bool-toggle">
            <input type="checkbox" :checked="val" @change="onUpdate(key, $event.target.checked)"/>
            <span class="bool-switch"/>
            <span class="bool-label">{{ val ? 'true' : 'false' }}</span>
          </label>
        </div>
      </div>
      <div v-if="!visibleCount" class="param-empty">No editable parameters</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
const props = defineProps({ serverName: String, params: Object, simplified: Boolean })
const emit = defineEmits(['update'])
const open = ref(true)

// ── flatten: inline walk, no intermediate array allocation ──────────────────
const flatParams = computed(() => {
  const result = {}
  function walk(obj, prefix) {
    for (const k in obj) {
      const v = obj[k]
      const key = prefix ? `${prefix}.${k}` : k
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        walk(v, key)
      } else {
        result[key] = v
      }
    }
  }
  walk(props.params ?? {}, '')
  return result
})

const visible = computed(() => {
  const all = flatParams.value
  if (!props.simplified) return all
  // Simplified: only top-level keys (no dot)
  const out = {}
  for (const k in all) {
    if (!k.includes('.')) out[k] = all[k]
  }
  return out
})

const visibleCount = computed(() => Object.keys(visible.value).length)

function isLong(val) {
  return typeof val === 'string' && (val.length > 80 || val.includes('\n'))
}

function castValue(original, strVal) {
  if (typeof original === 'number') {
    const n = Number(strVal)
    return isNaN(n) ? original : n
  }
  return strVal
}

function setNestedValue(obj, path, val) {
  const parts = path.split('.')
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] === undefined || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {}
    cur = cur[parts[i]]
  }
  cur[parts[parts.length - 1]] = val
}

function onUpdate(flatKey, val) {
  const clone = JSON.parse(JSON.stringify(props.params))
  setNestedValue(clone, flatKey, val)
  emit('update', clone)
}
</script>

<style scoped>
.parameter-section{background:#fff;border:none;border-radius:12px;margin-bottom:20px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04)}
.parameter-section-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;background:transparent;cursor:pointer;user-select:none;transition:background .15s}
.parameter-section-header:hover{background:#f8fafc}
.section-header-left{display:flex;align-items:center;gap:12px}
.section-chevron{color:#64748b;transition:transform .2s}
.parameter-section.expanded .section-chevron{transform:rotate(180deg)}
.section-title{font-size:15px;font-weight:600;color:#111827}
.section-badge{font-size:11px;font-weight:500;background:#e2e8f0;color:#64748b;padding:3px 10px;border-radius:12px}
.parameter-section-content{padding:0 20px 20px;border-top:1px solid rgba(15,23,42,.06)}
.parameter-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;padding-top:16px}
.parameter-field{min-width:0}
.parameter-field.full-width{grid-column:1/-1}
.parameter-label{display:block;font-size:12px;font-weight:500;color:#6b7280;margin-bottom:7px;word-break:break-all;font-family:var(--font-mono)}
.parameter-input{width:100%;padding:9px 13px;border:1px solid transparent;border-radius:8px;font-size:13.5px;font-family:var(--font-mono);background:#f8fafc;color:#111827;outline:none;transition:all .15s;box-sizing:border-box}
.parameter-input:hover{border-color:#e2e8f0;background:#fff}
.parameter-input:focus{border-color:#2563eb;background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.parameter-textarea{resize:vertical;min-height:72px;line-height:1.5}
.parameter-bool-toggle{display:flex;align-items:center;gap:8px;cursor:pointer}
.parameter-bool-toggle input{display:none}
.bool-switch{display:inline-block;width:36px;height:20px;background:#d1d5db;border-radius:10px;position:relative;transition:background .2s;flex-shrink:0}
.bool-switch::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;background:#fff;border-radius:50%;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.parameter-bool-toggle input:checked+.bool-switch{background:#2563eb}
.parameter-bool-toggle input:checked+.bool-switch::after{left:18px}
.bool-label{font-size:13px;color:#475569;font-family:var(--font-mono)}
.param-empty{padding:16px 0;font-size:13px;color:#94a3b8;text-align:center}
</style>
