# Background Task Session Creation Design

**Date:** 2026-04-19  
**Author:** Claude (Opus 4.7)  
**Status:** Draft

## Problem Statement

In vue-ui, when users select a RAG pipeline and send a message with "background mode" enabled, the task runs successfully in the background but does not appear in the recent chat sessions list (ChatSidebar). This creates a poor user experience because:

1. Users cannot find their completed background tasks in the chat history
2. There is no easy way to review the full answer and sources from background tasks
3. The BackgroundTasksPanel only shows a truncated result

## Goals

- Automatically create a chat session in the recent list when a background task completes successfully
- Preserve the full question, answer, and sources in the session
- Avoid duplicate session creation if the user refreshes the page
- Maintain consistency with the existing vue-ui architecture (frontend-only session management)

## Non-Goals

- Modifying backend session management (vue-ui sessions are frontend-only)
- Making BackgroundTasksPanel expandable (out of scope for this fix)
- Syncing sessions across devices (sessions are local to browser)

## Architecture Overview

### Current Flow
```
User sends background task
    ↓
Backend creates independent bg_session_id
    ↓
Task runs in background thread
    ↓
Task completes, stored in BACKGROUND_TASK_MANAGER
    ↓
Frontend polls /api/background-tasks
    ↓
BackgroundTasksPanel shows notification
    ↓
[END] - No session created
```

### Proposed Flow
```
User sends background task
    ↓
Backend creates independent bg_session_id
    ↓
Task runs in background thread
    ↓
Task completes, stored in BACKGROUND_TASK_MANAGER
    ↓
Frontend polls /api/background-tasks
    ↓
BackgroundTasksPanel detects completion
    ↓
chatStore.createSessionFromBackground(taskData)
    ↓
New session appears in ChatSidebar recent list
    ↓
User can click to view full conversation
```

## Data Structures

### Backend Task Data (from API)
```javascript
{
  task_id: "bg_1234567890_abcd1234",
  pipeline_name: "RAG",
  question: "What is the capital of France?",
  status: "completed",  // "running" | "completed" | "failed"
  result: "The capital of France is Paris...",
  sources: [
    {
      id: "doc_1",
      title: "Geography Facts",
      content: "Paris is the capital...",
      score: 0.95
    }
  ],
  error: null,
  created_at: 1713532800.123,
  completed_at: 1713532805.456,
  user_id: "user_1234567890_xyz"
}
```

### Frontend Session Data (in Pinia store)
```javascript
{
  id: "sess_1713532805_abc123",
  title: "What is the capital of France?",  // First 40 chars of question
  messages: [
    {
      id: "u_1713532805456",
      role: "user",
      content: "What is the capital of France?",
      timestamp: 1713532800123
    },
    {
      id: "a_1713532805457",
      role: "assistant",
      content: "The capital of France is Paris...",
      sources: [...],  // From task.sources
      isStreaming: false,
      timestamp: 1713532805456
    }
  ],
  pipelineName: "RAG",
  createdAt: 1713532800123,
  updatedAt: 1713532805456
}
```

## Implementation Details

### 1. Chat Store Modifications

**File:** `vue-ui/src/stores/chat.js`

Add new method to create session from background task:

```javascript
function createSessionFromBackground(taskData) {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  
  const userMsg = {
    id: `u_${taskData.created_at * 1000}`,
    role: 'user',
    content: taskData.question,
    timestamp: taskData.created_at * 1000
  }
  
  const assistantMsg = {
    id: `a_${taskData.completed_at * 1000}`,
    role: 'assistant',
    content: taskData.result || 'No answer generated',
    sources: taskData.sources || [],
    isStreaming: false,
    timestamp: taskData.completed_at * 1000
  }
  
  const session = {
    id: sessionId,
    title: taskData.question.slice(0, 40),
    messages: [userMsg, assistantMsg],
    pipelineName: taskData.pipeline_name,
    createdAt: taskData.created_at * 1000,
    updatedAt: taskData.completed_at * 1000
  }
  
  sessions.value.unshift(session)
  
  // Enforce 50 session limit
  if (sessions.value.length > 50) {
    sessions.value = sessions.value.slice(0, 50)
  }
  
  return session
}
```

### 2. BackgroundTasksPanel Modifications

**File:** `vue-ui/src/components/chat/BackgroundTasksPanel.vue`

Add duplicate prevention and session creation logic:

```javascript
// Add to script setup
const processedTasks = ref(new Set())
const PROCESSED_TASKS_KEY = 'ultrarag_processed_bg_tasks'

// Load processed tasks from localStorage on mount
onMounted(() => {
  try {
    const stored = localStorage.getItem(PROCESSED_TASKS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      processedTasks.value = new Set(parsed)
    }
  } catch (e) {
    console.warn('Failed to load processed tasks', e)
  }
  
  // ... existing mount logic
})

// Persist processed tasks to localStorage
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

// Modify refresh function
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
        
        // Create session for successful tasks
        if (task.status === 'completed' && task.result) {
          chatStore.createSessionFromBackground(task)
        }
        
        // Send notification
        notified.add(task.task_id)
        addToast(
          task.status === 'completed' ? 'success' : 'error',
          task.status === 'completed'
            ? `Task done: ${task.question || task.task_id}`
            : `Task failed: ${task.error || task.task_id}`
        )
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('UltraRAG', { 
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
```

### 3. Import chatStore in BackgroundTasksPanel

Add import at top of script:

```javascript
import { useChatStore } from '@/stores/chat.js'

const chatStore = useChatStore()
```

## Edge Cases and Error Handling

### 1. Task with no result
- If `task.result` is empty/null, do not create session
- Only show notification in BackgroundTasksPanel

### 2. Failed tasks
- Do not create session for failed tasks
- Show error notification only

### 3. Page refresh during task execution
- `processedTasks` persisted to localStorage survives refresh
- Task will be detected as completed on next poll
- Session created normally

### 4. Multiple browser tabs
- Each tab has independent polling
- `processedTasks` in localStorage prevents duplicate creation
- First tab to detect completion creates the session
- Other tabs see it already processed

### 5. Task deleted before completion
- If user deletes task from BackgroundTasksPanel, it won't be in next poll
- No session created (expected behavior)

### 6. localStorage quota exceeded
- Wrap localStorage operations in try-catch
- If persist fails, log warning but continue
- Worst case: duplicate session on refresh (acceptable)

### 7. Session limit (50 sessions)
- Existing logic in `createSession` enforces limit
- Oldest sessions automatically removed

## Testing Plan

### Manual Testing
1. Send background task with RAG pipeline
2. Wait for completion
3. Verify session appears in ChatSidebar recent list
4. Click session, verify full question/answer/sources displayed
5. Refresh page, verify no duplicate session created
6. Send another background task, verify second session created
7. Delete task before completion, verify no session created
8. Send task that fails, verify no session created (only error notification)

### Edge Case Testing
1. Open two tabs, send background task in tab 1
2. Switch to tab 2, verify session appears (no duplicate)
3. Clear localStorage, send task, verify session still created
4. Send 5 background tasks rapidly, verify 5 sessions created (no duplicates)

## Rollback Plan

If issues arise:
1. Revert changes to `chat.js` (remove `createSessionFromBackground`)
2. Revert changes to `BackgroundTasksPanel.vue` (remove session creation logic)
3. System returns to original behavior (tasks complete but no session created)

No backend changes required, so rollback is frontend-only.

## Future Enhancements (Out of Scope)

1. Make BackgroundTasksPanel expandable/fullscreen
2. Add "View in Chat" button in BackgroundTasksPanel to jump to created session
3. Sync sessions across devices (requires backend session storage)
4. Add option to disable auto-session-creation in settings
5. Show "Created from background task" badge in ChatSidebar

## References

- Original ui-frontend implementation: `ui/frontend/main.js`
- Backend task manager: `ui/backend/pipeline_manager.py` (lines 696-876)
- Backend API endpoints: `ui/backend/app.py` (lines 778-890)
- Vue-ui chat store: `vue-ui/src/stores/chat.js`
- Background tasks panel: `vue-ui/src/components/chat/BackgroundTasksPanel.vue`
