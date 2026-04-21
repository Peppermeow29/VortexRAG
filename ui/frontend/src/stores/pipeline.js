import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePipelineStore = defineStore('pipeline', () => {
  const list = ref([])           // [{name, ...}]
  const builtPipelines = ref({}) // { pipelineName: true } — persisted

  // Builder selected: any pipeline, for editing
  const builderSelected = ref(null)
  // Chat selected: only built pipelines, for chat
  const chatSelected = ref(null)

  // Legacy alias — points to builderSelected for backward compat
  const selected = computed(() => builderSelected.value)

  const yaml = ref('')
  const lastSavedYaml = ref('')
  const parameters = ref({})
  const buildStatus = ref('idle') // 'idle'|'building'|'success'|'failed'
  const isReady = ref(false)
  const simplifiedParams = ref(true)

  const unsavedChanges = computed(() => yaml.value !== lastSavedYaml.value)
  const selectedPipeline = computed(() => list.value.find(p => p.name === builderSelected.value) ?? null)
  // Only pipelines that have been successfully built
  const builtList = computed(() => list.value.filter(p => builtPipelines.value[p.name]))

  function isBuilt(name) { return !!builtPipelines.value[name] }

  // Builder: select any pipeline for editing
  function selectPipeline(name) {
    builderSelected.value = name
    if (!name) {
      yaml.value = ''
      lastSavedYaml.value = ''
      parameters.value = {}
      isReady.value = false
      buildStatus.value = 'idle'
    } else {
      isReady.value = isBuilt(name)
      buildStatus.value = isBuilt(name) ? 'success' : 'idle'
    }
  }

  // Chat: select only built pipelines
  function selectChatPipeline(name) {
    if (!name || isBuilt(name)) chatSelected.value = name
  }

  function setYaml(content) { yaml.value = content }
  function markSaved() { lastSavedYaml.value = yaml.value }
  function setParameters(params) { parameters.value = params }

  function setBuildStatus(status) {
    buildStatus.value = status
    if (status === 'success') {
      isReady.value = true
      if (builderSelected.value) builtPipelines.value[builderSelected.value] = true
      // Auto-sync chatSelected if it was unset
      if (!chatSelected.value && builderSelected.value) {
        chatSelected.value = builderSelected.value
      }
    }
  }

  return {
    list, builtPipelines, builderSelected, chatSelected,
    // legacy alias
    selected,
    yaml, lastSavedYaml, parameters,
    buildStatus, isReady, simplifiedParams,
    unsavedChanges, selectedPipeline, builtList,
    isBuilt, selectPipeline, selectChatPipeline,
    setYaml, markSaved, setParameters, setBuildStatus
  }
}, {
  persist: { paths: ['builtPipelines', 'builderSelected', 'chatSelected', 'simplifiedParams'] }
})
