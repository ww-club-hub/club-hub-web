import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      component: () => import("../views/LoginView.vue")
    },
    {
      path: '/account',
      name: 'account',
      component: () => import("../views/AccountView.vue")
    },
    {
      path: '/school/create',
      name: 'create-school',
      component: () => import("../views/CreateSchoolView.vue")
    }
  ]
})

export default router
