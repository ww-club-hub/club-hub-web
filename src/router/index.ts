import { createRouter, createWebHistory } from 'vue-router';
import { auth } from "../firebase";
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import { onAuthStateChanged } from 'firebase/auth';

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
      component: LoginView,
      meta: {
        title: "Login",
        authProhibited: true
      }
    },
    {
      path: '/account',
      name: 'account',
      component: () => import("../views/AccountView.vue"),
      meta: {
        authRequired: true,
        title: "My Account"
      }
    },
    {
      path: '/school/create',
      name: 'create-school',
      component: () => import("../views/CreateSchoolView.vue"),
      meta: {
        authRequired: true,
        title: "Create School",
        // this is part of the onboarding flow
        onboarding: true
      }
    },
    {
      path: '/account/setup',
      name: 'onboard',
      component: () => import("../views/OnboardAccountView.vue"),
      meta: {
        authRequired: true,
        title: "Setup Account",
        // this is part of the onboarding flow
        onboarding: true
      }
    }
  ]
})

router.beforeEach(async to => {
  if (to.meta.authRequired && !auth.currentUser) {
    // redirect to login page
    return { name: "login", query: { next: to.fullPath } };
  } else if (to.meta.authProhibited && auth.currentUser) {
    return { name: "account" };
  }

  // if they are on an auth-only page (that is not part of the onboarding flow), and they have not onboarded, redirect to onboarding
  if (to.meta.authRequired && auth.currentUser && !to.meta.onboarding) {
    return { name: "onboard" };
  }
});

onAuthStateChanged(auth, user => {
  const route = router.currentRoute.value;
  console.log(route, user);
  // apply auth guards when the user signs in/out
  if (route?.meta.authRequired && !user) {
    router.push({ name: "login", query: { next: route.fullPath } });
  } else if (route?.meta.authProhibited && user) {
    // redirect to the next query param or 'account'
    if (route.query.next) {
      return router.push(route.query.next as string);
    } else {
      return router.push({ name: "account" });
    }
  }
});

export default router
