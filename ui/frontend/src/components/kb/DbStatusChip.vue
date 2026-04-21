<template>
  <span class="conn-chip" :class="kbStore.dbStatus" @click="$emit('click')">
    <span class="conn-dot" />
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKbStore } from '@/stores/kb.js'
defineEmits(['click'])
const { t } = useI18n()
const kbStore = useKbStore()
const label = computed(() => ({
  connected: t('kb_connected'), connecting: t('kb_connecting'),
  error: t('kb_disconnected'), unknown: t('kb_not_configured')
}[kbStore.dbStatus] ?? t('kb_not_configured')))
</script>
