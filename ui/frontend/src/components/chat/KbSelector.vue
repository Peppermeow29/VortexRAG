<template>
  <div class="kb-selector">
    <button type="button" class="kb-trigger" @click="open = !open">
      <IconKb :size="13" />
      <span>{{ label }}</span>
      <button v-if="chatStore.selectedCollection" type="button" style="background:none;border:none;cursor:pointer;color:var(--text-tertiary);padding:0 2px" @click.stop="chatStore.selectedCollection = ''">×</button>
    </button>
    <div v-if="open" class="kb-dropdown">
      <div class="kb-opt" :class="{ selected: !chatStore.selectedCollection }" @click="pick('')">{{ t('no_knowledge_base') }}</div>
      <div v-for="c in kbStore.collections" :key="c.name" class="kb-opt" :class="{ selected: chatStore.selectedCollection === c.name }" @click="pick(c.name)">
        {{ c.display_name || c.name }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/chat.js'
import { useKbStore } from '@/stores/kb.js'
import IconKb from '@/components/icons/IconKb.vue'
const { t } = useI18n()
const chatStore = useChatStore()
const kbStore = useKbStore()
const open = ref(false)
const label = computed(() => {
  if (!chatStore.selectedCollection) return t('knowledge_base')
  const c = kbStore.collections.find(c => c.name === chatStore.selectedCollection)
  return c?.display_name || c?.name || chatStore.selectedCollection
})
function pick(name) { chatStore.selectedCollection = name; open.value = false }
function onOut(e) { if (!e.target.closest('.kb-selector')) open.value = false }
onMounted(() => document.addEventListener('click', onOut))
onUnmounted(() => document.removeEventListener('click', onOut))
</script>
