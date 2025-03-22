import { createRouter, createWebHistory } from 'vue-router';
import { auth } from "@/firebase";
// statically loaded
import HomeView from '@/views/HomeView.vue';
import LoginView from '@/views/LoginView.vue';
import { getIdTokenResult, onAuthStateChanged } from 'firebase/auth';
import NotFoundView from '@/views/NotFoundView.vue';

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
      component: () => import("@/views/AccountView.vue"),
      meta: {
        authRequired: true,
        title: "My Account"
      }
    },
    {
      path: '/school/create',
      name: 'create-school',
      component: () => import("@/views/CreateSchoolView.vue"),
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
      component: () => import("@/views/OnboardAccountView.vue"),
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
      component: () => import("@/views/SchoolDetailView.vue"),
      meta: {
        authRequired: true,
        title: "School Info"
      }
    },
    {
      path: '/school/admins',
      name: 'school-officers',
      component: () => import("@/views/SchoolOfficersView.vue"),
      meta: {
        authRequired: true,
        title: "School Admins"
      }
    },
    {
      path: '/clubs',
      name: 'club-list',
      component: () => import("@/views/ClubListView.vue"),
      meta: {
        authRequired: true,
        title: "Explore Clubs"
      }
    },
    {
      path: '/clubs/create',
      name: 'club-create',
      component: () => import("@/views/ClubCreateView.vue"),
      meta: {
        authRequired: true,
        title: "Create a Club"
      }
    },
    // public-facing view
    {
      path: '/clubs/:clubId/info',
      name: 'club-detail',
      component: () => import("@/views/ClubDetailView.vue"),
      meta: {
        authRequired: true,
        title: "Club Detail"
      }
    },
    // views for members/officers
    {
      path: '/clubs/:clubId',
      component: () => import("@/views/club/BaseView.vue"),
      children: [
        {
          name: 'club-dashboard',
          path: '',
          component: () => import("@/views/club/DashboardView.vue"),
          meta: {
            authRequired: true,
            title: "Club Dashboard"
          }
        },
        {
          name: 'club-settings',
          path: 'edit',
          component: () => import("@/views/club/SettingsView.vue"),
          meta: {
            authRequired: true,
            title: "Club Settings"
          }
        },
        {
          name: 'club-updates',
          path: 'updates',
          component: () => import("@/views/club/MessagesView.vue"),
          meta: {
            authRequired: true,
            title: "Club Updates"
          }
        },
        {
          name: 'club-meetings',
          path: 'meetings',
          component: () => import("@/views/club/MeetingsView.vue"),
          meta: {
            authRequired: true,
            title: "Club Meetings"
          }
        },
        {
          name: 'club-attendance',
          path: 'attendance-overview',
          component: () => import("@/views/club/AttendanceView.vue"),
          meta: {
            authRequired: true,
            title: "Club Attendance"
          }
        },
        {
          name: 'member-attendance',
          path: 'attendance',
          component: () => import("@/views/club/TakeAttendanceView.vue"),
          meta: {
            authRequired: true,
            title: "Take Attendance"
          }
        },
        {
          name: 'meeting-attendance',
          path: 'meetings/:meetingId/attendance',
          component: () => import("@/views/club/MeetingAttendanceView.vue"),
          meta: {
            authRequired: true,
            title: "Meeting Attendance"
          }
        }
      ]
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import("@/views/DashboardView.vue"),
      meta: {
        authRequired: true,
        title: "Dashboard"
      }
    },
    {
      path: '/privacy',
      component: () => import("@/views/PrivacyView.vue"),
      meta: {
        title: "Privacy Policy",
        // allow access to privacy policy even when onboarding
        onboarding: true
      }
    },
    { path: '/:pathMatch(.*)*', component: NotFoundView },
    {
      path: '/terms',
      component: () => import("@/views/TermsOfServiceView.vue"),
      meta: {
        title: "Terms Of Service",
        // allow access to terms of service even when onboarding
        onboarding: true
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
