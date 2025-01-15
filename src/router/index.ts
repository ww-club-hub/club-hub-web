import { createRouter, createWebHistory } from 'vue-router';
import { auth } from "../firebase";
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import { getIdTokenResult, onAuthStateChanged } from 'firebase/auth';

// promise that gets fired on the first onAuthStateChanged event
const firebaseAuthReady = new Promise<void>(resolve => {
  onAuthStateChanged(auth, user => {
    resolve();
    
    const route = router.currentRoute.value;
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
});

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
    },
    {
      path: '/school',
      name: 'school-detail',
      component: () => import("../views/SchoolDetailView.vue"),
      meta: {
        authRequired: true,
        title: "School Info"
      }
    },
    {
      path: '/clubs',
      name: 'club-list',
      component: () => import("../views/ClubListView.vue"),
      meta: {
        authRequired: true,
        title: "Explore Clubs"
      }
    },
    {
      path: '/clubs/create',
      name: 'club-create',
      component: () => import("../views/ClubCreateView.vue"),
      meta: {
        authRequired: true,
        title: "Create a Club"
      }
    },
    // public-facing view
    {
      path: '/clubs/:clubId',
      name: 'club-detail',
      component: () => import("../views/ClubListView.vue"),
      meta: {
        authRequired: true,
        title: "Club Detail"
      }
    },
    {
      path: '/clubs/:clubId/edit',
      name: 'club-edit',
      component: () => import("../views/ClubEditView.vue"),
      meta: {
        authRequired: true,
        title: "Club Settings"
      }
    },
    // view for members/officers
    {
      path: '/clubs/:clubId/dashboard',
      name: 'club-dashboard',
      component: () => import("../views/ClubListView.vue"),
      meta: {
        authRequired: true,
        title: "Club Detail"
      }
    },
  ]
})

router.beforeEach(async to => {
  await firebaseAuthReady;
  
  if (to.meta.authRequired && !auth.currentUser) {
    // redirect to login page
    return { name: "login", query: { next: to.fullPath } };
  } else if (to.meta.authProhibited && auth.currentUser) {
    return { name: "account" };
  }

  // if the user has not onboarded, redirect to onboarding
  if (auth.currentUser && !to.meta.onboarding) {
    // check if they need to onboard
    const claims = (await getIdTokenResult(auth.currentUser)).claims;
    if (!(auth.currentUser.emailVerified && claims.school && claims.interests))
      return { name: "onboard" };
  }
});

export default router
