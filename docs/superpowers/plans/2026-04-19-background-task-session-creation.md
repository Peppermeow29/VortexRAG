# Background Task Session Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically create chat sessions in the recent list when background tasks complete successfully.

**Architecture:** Frontend-only solution. When BackgroundTasksPanel detects a completed task, it calls a new chatStore method to create a session with the question and answer. Uses localStorage to prevent duplicate creation across page refreshes and multiple tabs.

**Tech Stack:** Vue 3, Pinia, localStorage

---

## File Structure

**Files to Modify:**
- `vue-ui/src/stores/chat.js` - Add `createSessionFromBackground()` method
- `vue-ui/src/components/chat/BackgroundTasksPanel.vue` - Add session creation logic and duplicate prevention

**No new files needed** - This is a pure enhancement to existing components.

---

## Task 1: Add createSessionFromBackground Method to Chat Store

**Files:**
- Modify: `vue-ui/src/stores/chat.js:120-130`

- [ ] **Step 1: Add createSessionFromBackground method to chat store**

Add this method after the `importSession` function (around line 112):

```javascript
function createSessionFromBackground(taskData) {
  if (!taskData || !taskData.question || !taskData.result) {
    console.warn('Invalid task data for session creation', taskData)
    return null
  }

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  
  // Convert backend timestamps (seconds) to frontend timestamps (milliseconds)
  const createdTimestamp = Math.floor((taskData.created_at || Date.now() / 1000) * 1000)
  const completedTimestamp = Math.floor((taskData.completed_at || Date.now() / 1000) * 1000)
  
  const userMsg = {
    id: `u_${createdTimestamp}`,
    role: 'user',
    content: taskData.question,
    timestamp: createdTimestamp
  }
  
  const assistantMsg = {
    id: `a_${completedTimestamp}`,
    role: 'assistant',
    content: taskData.result,
    sources: taskData.sources || [],
    isStreaming: false,
    timestamp: completedTimestamp
  }
  
  const session = {
    id: sessionId,
    title: taskData.question.slice(0, 40),
    messages: [userMsg, assistantMsg],
    pipelineName: taskData.pipeline_name || null,
    createdAt: createdTimestamp,
    updatedAt: completedTimestamp
  }
  
  sessions.value.unshift(session)
  
  // Enforce 50 session limit
  if (sessions.value.length > 50) {
    sessions.value = sessions.value.slice(0, 50)
  }
  
  return session
}
```

- [ ] **Step 2: Export the new method in the return statement**

Find the return statement (around line 121) and add `createSessionFromBackground` to the exported methods:

```javascript
return {
  sessions, currentSessionId, engineStatus, activeEngines, isStreaming,
  selectedCollection, backgroundMode, currentSession, sortedSessions,
  showThinking, showReferences,
  createSession, deleteSession, renameSession, clearAllSessions, clearSessionHistory,
  addMessage, updateMessage, deleteMessage,
  exportSession, importSession,
  createSessionFromBackground,
  setEngineStatus, registerEngine, unregisterEngine, getEngineSessionId,
  setShowThinking, setShowReferences
}
```

- [ ] **Step 3: Verify the changes compile**

Run: `cd vue-ui && npm run dev`
Expected: No compilation errors, dev server starts successfully

- [ ] **Step 4: Commit**

```bash
git add vue-ui/src/stores/chat.js
git commit -m "feat(chat): add createSessionFromBackground method to chat store"
```

---

## Task 2: Add Duplicate Prevention to BackgroundTasksPanel

**Files:**
- Modify: `vue-ui/src/components/chat/BackgroundTasksPanel.vue:57-70`

- [ ] **Step 1: Import chatStore at the top of script setup**

Add this import after the existing imports (around line 60):

```javascript
import { useChatStore } from '@/stores/chat.js'
```

- [ ] **Step 2: Initialize chatStore and processedTasks tracking**

Add these lines after `const { t } = useI18n()` (around line 62):

```javascript
const chatStore = useChatStore()
const processedTasks = ref(new Set())
const PROCESSED_TASKS_KEY = 'ultrarag_processed_bg_tasks'
```

- [ ] **Step 3: Add function to persist processed tasks**

Add this function before the `refresh()` function (around line 72):

```javascript
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
```

- [ ] **Step 4: Load processed tasks from localStorage in onMounted**

Modify the `onMounted` hook (around line 134) to load processed tasks:

```javascript
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
```

- [ ] **Step 5: Verify the changes compile**

Run: `cd vue-ui && npm run dev`
Expected: No compilation errors, dev server starts successfully

- [ ] **Step 6: Commit**

```bash
git add vue-ui/src/components/chat/BackgroundTasksPanel.vue
git commit -m "feat(chat): add duplicate prevention for background task sessions"
```

---

## Task 3: Add Session Creation Logic to refresh Function

**Files:**
- Modify: `vue-ui/src/components/chat/BackgroundTasksPanel.vue:73-101`

- [ ] **Step 1: Replace the refresh function with enhanced version**

Replace the entire `refresh()` function (lines 73-101) with this version:

```javascript
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

- [ ] **Step 2: Verify the changes compile**

Run: `cd vue-ui && npm run dev`
Expected: No compilation errors, dev server starts successfully

- [ ] **Step 3: Commit**

```bash
git add vue-ui/src/components/chat/BackgroundTasksPanel.vue
git commit -m "feat(chat): auto-create sessions when background tasks complete"
```

---

## Task 4: Manual Testing

**Files:**
- Test: `vue-ui/` (running application)

- [ ] **Step 1: Start the development server**

Run: `cd vue-ui && npm run dev`
Expected: Dev server starts on http://localhost:5173

- [ ] **Step 2: Start the backend server**

Run: `cd ui/backend && python app.py` (or however the backend is started)
Expected: Backend starts successfully

- [ ] **Step 3: Test basic background task flow**

1. Open browser to http://localhost:5173
2. Navigate to Chat view
3. Select a RAG pipeline from dropdown
4. Start the engine (click "Start Engine" button)
5. Enable background mode (click the background button in input area)
6. Type a question: "请对这本书做一个介绍！"
7. Send the message
8. Wait for task to complete (watch BackgroundTasksPanel)
9. Check ChatSidebar recent list

Expected: 
- Task appears in BackgroundTasksPanel as "running"
- Task completes and shows green checkmark
- Toast notification appears: "Task done: 请对这本书做一个介绍！"
- **New session appears in ChatSidebar recent list with title "请对这本书做一个介绍！"**
- Clicking the session shows full question and answer

- [ ] **Step 4: Test duplicate prevention on page refresh**

1. With the completed task still visible, refresh the page (F5)
2. Wait for BackgroundTasksPanel to load
3. Check ChatSidebar recent list

Expected:
- Session still appears in recent list (only once, no duplicate)
- BackgroundTasksPanel shows the completed task
- No new toast notification appears

- [ ] **Step 5: Test multiple background tasks**

1. Send another background task: "简述Transformer这个概念！"
2. Wait for completion
3. Check ChatSidebar recent list

Expected:
- Two sessions now in recent list
- Both sessions have correct titles
- Both sessions show full conversation when clicked

- [ ] **Step 6: Test failed task (no session creation)**

1. Stop the engine or use invalid pipeline
2. Send a background task
3. Wait for it to fail
4. Check ChatSidebar recent list

Expected:
- Error toast appears
- No new session created in recent list
- Failed task shows in BackgroundTasksPanel with error icon

- [ ] **Step 7: Test localStorage persistence**

1. Open browser DevTools → Application → Local Storage
2. Find key `ultrarag_processed_bg_tasks`
3. Verify it contains array of task IDs

Expected:
- Key exists with array value like `["bg_1234567890_abcd1234", ...]`
- Array contains IDs of completed tasks

- [ ] **Step 8: Document test results**

Create a test report noting:
- ✅ Sessions created for completed tasks
- ✅ No duplicates on refresh
- ✅ Multiple tasks work correctly
- ✅ Failed tasks don't create sessions
- ✅ localStorage tracking works
- Any issues encountered

---

## Task 5: Edge Case Testing

**Files:**
- Test: `vue-ui/` (running application)

- [ ] **Step 1: Test multiple browser tabs**

1. Open two browser tabs to http://localhost:5173
2. In Tab 1: Send a background task
3. Switch to Tab 2 immediately
4. Wait for task to complete
5. Check recent list in both tabs

Expected:
- Session appears in both tabs (Pinia persistence syncs)
- Only one session created (localStorage prevents duplicate)
- Both tabs show the same session

- [ ] **Step 2: Test localStorage quota handling**

1. Open DevTools → Console
2. Run: `localStorage.setItem('ultrarag_processed_bg_tasks', JSON.stringify(Array(200).fill('test')))`
3. Send a background task
4. Wait for completion

Expected:
- Task completes normally
- Session created successfully
- localStorage trimmed to last 100 entries (check in DevTools)

- [ ] **Step 3: Test task with empty result**

1. Modify backend temporarily to return empty result (or use a pipeline that returns empty)
2. Send background task
3. Wait for completion

Expected:
- No session created (result is empty)
- Toast notification still appears
- No errors in console

- [ ] **Step 4: Test rapid task submission**

1. Send 5 background tasks in quick succession (within 10 seconds)
2. Wait for all to complete
3. Check recent list

Expected:
- 5 sessions created (one per task)
- No duplicates
- All sessions have correct content
- Sessions ordered by completion time (newest first)

- [ ] **Step 5: Document edge case results**

Create a summary noting:
- ✅ Multi-tab handling works
- ✅ localStorage quota handled gracefully
- ✅ Empty results handled correctly
- ✅ Rapid submissions work
- Any issues encountered

---

## Task 6: Final Verification and Cleanup

**Files:**
- Verify: All modified files

- [ ] **Step 1: Review all changes**

Run: `git diff main vue-ui/src/stores/chat.js vue-ui/src/components/chat/BackgroundTasksPanel.vue`

Expected: Only the changes from Tasks 1-3 are present

- [ ] **Step 2: Check for console errors**

1. Open browser DevTools → Console
2. Perform a complete flow (send background task, wait for completion)
3. Check for any errors or warnings

Expected: No errors related to session creation or background tasks

- [ ] **Step 3: Verify Pinia persistence**

1. Send a background task and wait for completion
2. Close browser completely
3. Reopen browser to http://localhost:5173
4. Check recent list

Expected:
- Session persists across browser restart
- Session content intact (question, answer, sources)

- [ ] **Step 4: Clean up test data**

1. In ChatSidebar, delete all test sessions
2. In BackgroundTasksPanel, clear completed tasks
3. In DevTools, clear localStorage key `ultrarag_processed_bg_tasks`

Expected: Clean state for production use

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "test: verify background task session creation feature"
```

---

## Spec Coverage Review

**Spec Requirements → Implementation Mapping:**

1. ✅ **Automatically create chat session when background task completes** → Task 1 (createSessionFromBackground) + Task 3 (refresh logic)
2. ✅ **Preserve full question, answer, and sources** → Task 1 (session structure with messages and sources)
3. ✅ **Avoid duplicate session creation on page refresh** → Task 2 (processedTasks Set + localStorage)
4. ✅ **Maintain frontend-only session management** → Task 1 (uses existing Pinia store, no backend changes)
5. ✅ **Handle edge cases** → Task 5 (multi-tab, localStorage quota, empty results, rapid submission)
6. ✅ **No session for failed tasks** → Task 3 (only creates session if status === 'completed' && result exists)
7. ✅ **Enforce 50 session limit** → Task 1 (existing logic in createSession, reused in createSessionFromBackground)

**All spec requirements covered. No gaps identified.**

---

## Rollback Instructions

If issues arise after deployment:

```bash
# Revert all changes
git revert HEAD~3..HEAD

# Or revert specific commits
git log --oneline -5  # Find commit hashes
git revert <commit-hash-task-3>
git revert <commit-hash-task-2>
git revert <commit-hash-task-1>

# Rebuild and restart
cd vue-ui
npm run build
```

System returns to original behavior: background tasks complete but no session created.
