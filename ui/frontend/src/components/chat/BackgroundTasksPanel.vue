<template>
  <div v-if="visible">
    <!-- FAB button -->
    <button class="bg-fab" @click="panelOpen = !panelOpen">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      <span v-if="runningCount > 0" class="bg-fab-badge">{{ runningCount }}</span>
    </button>

    <!-- Panel -->
    <Transition name="bg-panel">
      <div v-if="panelOpen" class="bg-panel">
        <div class="bg-panel-header">
          <span class="bg-panel-title">{{ t('background') }}</span>
          <div class="bg-panel-actions">
            <button class="bg-panel-btn" @click="clearCompleted" :title="'Clear completed'">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
            <button class="bg-panel-btn" @click="panelOpen = false">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div class="bg-panel-body">
          <div v-if="!tasks.length" class="bg-empty">{{ t('background') }} — no tasks</div>
          <div v-for="task in tasks" :key="task.task_id" class="bg-task-item">
            <div class="bg-task-top">
              <span class="bg-task-status" :class="'bg-status-' + task.status">
                <span v-if="task.status === 'running'" class="bg-spinner" />
                <svg v-else-if="task.status === 'completed'" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </span>
              <span class="bg-task-q">{{ task.question || task.task_id }}</span>
              <button class="bg-task-del" @click="deleteTask(task.task_id)">×</button>
            </div>
            <div v-if="task.result" class="bg-task-result">{{ task.result }}</div>
            <div v-if="task.error" class="bg-task-error">{{ task.error }}</div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Toast notifications -->
    <Teleport to="body">
      <div class="bg-toast-stack">
        <TransitionGroup name="toast">
          <div v-for="toast in toasts" :key="toast.id" class="bg-toast" :class="'bg-toast-' + toast.type">
            <span class="bg-toast-msg">{{ toast.message }}</span>
            <button class="bg-toast-close" @click="removeToast(toast.id)">×</button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { backgroundApi, getUserId } from '@/api/chat.js'
import { useChatStore } from '@/stores/chat.js'

const { t } = useI18n()
const chatStore = useChatStore()
const processedTasks = ref(new Set())
const PROCESSED_TASKS_KEY = 'vortexrag_processed_bg_tasks'

const props = defineProps({ visible: { type: Boolean, default: true } })

const panelOpen = ref(false)
const tasks = ref([])
const toasts = ref([])
const notified = new Set()
let pollTimer = null

const runningCount = computed(() => tasks.value.filter(t => t.status === 'running').length)

function persistProcessedTasks() {
  try {
    const arr = Array.from(processedTasks.value)
    // Keep only last 100 to avoid localStorage bloat
    const trimmed = arr.slice(-100)
    localStorage.setItem(PROCESSED_TASKS_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.warn('Failed to persist processed tasks', e)
  }
}

async function refresh() {
  try {
    const userId = getUserId()
    const data = await backgroundApi.getTasks(userId, 20)
    const serverTasks = Array.isArray(data) ? data : (data?.tasks ?? [])

    // Process newly completed tasks
    for (const task of serverTasks) {
      const isCompleted = task.status === 'completed' || task.status === 'failed'
      const isNew = !notified.has(task.task_id)
      const notProcessed = !processedTasks.value.has(task.task_id)

      if (isCompleted && isNew && notProcessed) {
        // Mark as processed
        processedTasks.value.add(task.task_id)
        persistProcessedTasks()

        // Create session for successful tasks with results
        if (task.status === 'completed' && task.result) {
          try {
            chatStore.createSessionFromBackground(task)
          } catch (e) {
            console.error('Failed to create session from background task', e)
          }
        }

        // Send notification
        notified.add(task.task_id)
        addToast(
          task.status === 'completed' ? 'success' : 'error',
          task.status === 'completed'
            ? `Task done: ${task.question || task.task_id}`
            : `Task failed: ${task.error || task.task_id}`
        )

        // Browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('VortexRAG', {
            body: task.question || 'Background task completed'
          })
        }
      }
    }

    tasks.value = serverTasks

    // Stop polling when no running tasks
    if (runningCount.value === 0) stopPolling()
  } catch (e) {
    console.error('Failed to refresh background tasks', e)
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(refresh, 3000)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function deleteTask(taskId) {
  try { await backgroundApi.deleteTask(taskId, getUserId()); await refresh() } catch {}
}

async function clearCompleted() {
  try { await backgroundApi.clearCompleted(getUserId()); await refresh() } catch {}
}

function addToast(type, message) {
  const id = Date.now() + Math.random()
  toasts.value.push({ id, type, message })
  setTimeout(() => removeToast(id), 5000)
}

function removeToast(id) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

// Expose startPolling so ChatMainView can trigger it after sending to background
defineExpose({ startPolling, refresh })

onMounted(async () => {
  // Load processed tasks from localStorage
  try {
    const stored = localStorage.getItem(PROCESSED_TASKS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      processedTasks.value = new Set(parsed)
    }
  } catch (e) {
    console.warn('Failed to load processed tasks', e)
  }

  // Request browser notification permission after delay
  if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(() => Notification.requestPermission(), 5000)
  }
  await refresh()
  if (runningCount.value > 0) startPolling()
})
onUnmounted(() => stopPolling())
</script>

<style scoped>
/* FAB */
.bg-fab{
  position:fixed;bottom:80px;right:20px;
  width:44px;height:44px;border-radius:50%;
  background:var(--text-primary);color:#fff;
  border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 16px rgba(0,0,0,.18);
  z-index:500;transition:transform .15s,box-shadow .15s;
  position:fixed;
}
.bg-fab:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,.25)}
.bg-fab-badge{
  position:absolute;top:-4px;right:-4px;
  width:18px;height:18px;border-radius:50%;
  background:var(--accent-red);color:#fff;
  font-size:10px;font-weight:700;
  display:flex;align-items:center;justify-content:center;
  border:2px solid #fff;
}

/* Panel */
.bg-panel{
  position:fixed;bottom:134px;right:20px;
  width:320px;max-height:400px;
  background:var(--bg-card);border:1px solid var(--border-subtle);
  border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.16);
  z-index:499;display:flex;flex-direction:column;overflow:hidden;
}
.bg-panel-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 14px;border-bottom:1px solid var(--border-subtle);
  background:var(--bg-surface);flex-shrink:0;
}
.bg-panel-title{font-size:13px;font-weight:700;color:var(--text-primary)}
.bg-panel-actions{display:flex;gap:4px}
.bg-panel-btn{
  width:24px;height:24px;display:flex;align-items:center;justify-content:center;
  background:none;border:none;cursor:pointer;
  color:var(--text-tertiary);border-radius:4px;transition:background .12s;
}
.bg-panel-btn:hover{background:var(--bg-hover);color:var(--text-primary)}
.bg-panel-body{flex:1;overflow-y:auto;padding:8px}
.bg-empty{padding:20px;text-align:center;font-size:12px;color:var(--text-tertiary)}

/* Task items */
.bg-task-item{
  padding:8px 10px;border-radius:8px;
  border:1px solid var(--border-subtle);
  margin-bottom:6px;background:var(--bg-base);
}
.bg-task-top{display:flex;align-items:center;gap:6px}
.bg-task-status{width:16px;height:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.bg-status-running{color:var(--accent-yellow)}
.bg-status-completed{color:var(--accent-green)}
.bg-status-failed{color:var(--accent-red)}
.bg-spinner{
  width:10px;height:10px;border-radius:50%;
  border:2px solid currentColor;border-top-color:transparent;
  animation:spin .7s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}
.bg-task-q{flex:1;font-size:12px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bg-task-del{background:none;border:none;cursor:pointer;color:var(--text-tertiary);font-size:16px;line-height:1;padding:0 2px;transition:color .12s}
.bg-task-del:hover{color:var(--accent-red)}
.bg-task-result{font-size:11px;color:var(--text-secondary);margin-top:4px;max-height:60px;overflow:hidden;text-overflow:ellipsis}
.bg-task-error{font-size:11px;color:var(--accent-red);margin-top:4px}

/* Panel transition */
.bg-panel-enter-active{transition:opacity .15s,transform .15s cubic-bezier(.34,1.56,.64,1)}
.bg-panel-leave-active{transition:opacity .1s ease}
.bg-panel-enter-from,.bg-panel-leave-to{opacity:0;transform:scale(.95) translateY(8px)}
</style>

<style>
/* Toast stack — global since teleported */
.bg-toast-stack{position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.bg-toast{
  display:flex;align-items:center;gap:8px;
  padding:10px 14px;border-radius:8px;
  font-size:13px;font-weight:500;
  box-shadow:0 4px 16px rgba(0,0,0,.14);
  pointer-events:all;min-width:220px;max-width:320px;
  border:1px solid var(--border-subtle);
  background:var(--bg-card);
}
.bg-toast-success{border-left:3px solid var(--accent-green)}
.bg-toast-error{border-left:3px solid var(--accent-red)}
.bg-toast-info{border-left:3px solid var(--accent)}
.bg-toast-msg{flex:1;color:var(--text-primary)}
.bg-toast-close{background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-tertiary);line-height:1;padding:0}
.bg-toast-close:hover{color:var(--text-primary)}
/* Toast transitions */
.toast-enter-active{transition:opacity .2s,transform .2s cubic-bezier(.34,1.56,.64,1)}
.toast-leave-active{transition:opacity .15s ease,transform .15s ease}
.toast-enter-from,.toast-leave-to{opacity:0;transform:translateX(20px)}
</style>
.toast-leave-active{transition:opacity .15s ease,transform .15s 