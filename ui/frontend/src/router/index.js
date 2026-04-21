import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/builder' },
  {
    path: '/builder',
    component: () => import('@/views/BuilderView.vue'),
    meta: { title: 'Builder' }
  },
  {
    path: '/chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { title: 'Chat' }
  },
  {
    path: '/kb',
    component: () => import('@/views/KnowledgeBaseView.vue'),
    meta: { title: 'Knowledge Base' }
  },
  {
    path: '/settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: 'Settings' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/builder' }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.afterEach((to) => {
  const title = to.meta?.title
  document.title = title ? `${title} — VortexRAG` : 'VortexRAG'
})
