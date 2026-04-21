import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useKbStore = defineStore(
  'kb',
  () => {
    const rawFiles = ref([])
    const corpusFiles = ref([])
    const chunkFiles = ref([])
    const collections = ref([])
    const dbStatus = ref('unknown') // 'unknown'|'connected'|'error'|'connecting'
    const dbConfig = ref(null)

    const chunkConfig = ref({
      chunk_backend: 'token',
      tokenizer_or_token_counter: 'gpt2',
      chunk_size: 500,
      use_title: true
    })

    const indexConfig = ref({
      api_key: '',
      base_url: 'https://api.openai.com/v1',
      model_name: 'text-embedding-3-small'
    })

    function setFiles(data) {
      rawFiles.value = data.raw ?? []
      corpusFiles.value = data.corpus ?? []
      chunkFiles.value = data.chunks ?? []
      collections.value = data.index ?? []
      dbStatus.value = data.db_status ?? 'unknown'
      dbConfig.value = data.db_config ?? null
    }

    return {
      rawFiles, corpusFiles, chunkFiles, collections,
      dbStatus, dbConfig, chunkConfig, indexConfig,
      setFiles
    }
  },
  { persist: { paths: ['chunkConfig', 'indexConfig'] } }
)
