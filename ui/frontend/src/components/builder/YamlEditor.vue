<template>
  <div class="full-height flex-col" style="overflow:hidden">
    <div class="yaml-editor-wrap flex-1">
      <div class="yaml-gutter" aria-hidden="true">
        <span v-for="n in lineCount" :key="n" style="display:block">{{ n }}</span>
      </div>
      <textarea
        ref="ta"
        class="yaml-textarea"
        :value="value"
        spellcheck="false"
        :placeholder="t('builder_yaml_placeholder')"
        @input="onInput"
        @keydown.tab.prevent="onTab"
      />
    </div>
    <div v-if="error" class="yaml-error-bar">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({ value: { type: String, default: '' } })
const emit = defineEmits(['update:value'])
const { t } = useI18n()
const ta = ref(null)
const error = ref('')
const lineCount = computed(() => props.value.split('\n').length || 1)

function onInput(e) {
  emit('update:value', e.target.value)
}
function onTab(e) {
  const el = e.target
  const s = el.selectionStart, end = el.selectionEnd
  const v = el.value.substring(0, s) + '  ' + el.value.substring(end)
  emit('update:value', v)
  nextTick(() => { el.selectionStart = el.selectionEnd = s + 2 })
}
</script>
