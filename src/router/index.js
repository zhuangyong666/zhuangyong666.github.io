import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/diary',
    name: 'DiaryList',
    component: () => import('../views/DiaryList.vue')
  },
  {
    path: '/diary/new',
    name: 'DiaryNew',
    component: () => import('../views/DiaryEdit.vue')
  },
  {
    path: '/diary/:id',
    name: 'DiaryView',
    component: () => import('../views/DiaryView.vue')
  },
  {
    path: '/diary/:id/edit',
    name: 'DiaryEdit',
    component: () => import('../views/DiaryEdit.vue')
  },
  {
    path: '/ai-diary',
    name: 'AIDiary',
    component: () => import('../views/AIDiary.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
