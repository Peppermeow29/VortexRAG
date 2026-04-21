<template>
  <div v-if="modelValue" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title">{{ folderName }}</h3>
        <button class="btn-icon" @click="$emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <p style="color:var(--text-secondary);font-size:13px">{{ category }} / {{ folderName }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ category: String, folderName: String })
defineEmits(['close'])
</script>

<style scoped>
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(3px)}
.modal-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;padding:24px;width:90%;max-width:520px;box-shadow:0 8px 32px rgba(0,0,0,.18)}
.modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.modal-title{font-size:16px;font-weight:700;margin:0;color:var(--text-primary)}
.btn-icon{background:none;border:none;cursor:pointer;color:var(--text-secondary);display:flex;align-items:center;padding:4px;border-radius:6px;transition:background .15s}
.btn-icon:hover{background:var(--bg-hover)}
</style>
