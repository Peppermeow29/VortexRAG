<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-box">
      <div class="modal-header">
        <h5>{{ t('kb_database_settings') }}</h5>
        <button class="btn-icon" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body">
        <label class="form-label">{{ t('kb_milvus_uri') }}</label>
        <input v-model="uri" class="form-input" :placeholder="t('kb_milvus_uri_help')" />
        <label class="form-label" style="margin-top:10px">{{ t('kb_token_optional') }}</label>
        <input v-model="token" type="password" class="form-input" />
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">{{ t('kb_cancel') }}</button>
        <button class="btn btn-primary" @click="onSave">{{ t('kb_save_connect') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKbStore } from '@/stores/kb.js'
import { kbApi } from '@/api/kb.js'
const emit = defineEmits(['close', 'saved'])
const { t } = useI18n()
const kbStore = useKbStore()
const uri = ref(kbStore.dbConfig?.milvus?.uri ?? '')
const token = ref(kbStore.dbConfig?.milvus?.token ?? '')
async function onSave() {
  await kbApi.saveConfig({ ...(kbStore.dbConfig ?? {}), milvus: { uri: uri.value, token: token.value } })
  emit('saved'); emit('close')
}
</script>
