import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import GoogleSignInPlugin from 'vue3-google-signin'
import { setupCalendar } from 'v-calendar'
import { createPinia } from 'pinia'

const app = createApp(App)

app.use(router)
app.use(GoogleSignInPlugin, {
  clientId: '533987855609-91ki2jja41pephnck8f32288hlipa7kh.apps.googleusercontent.com'
})
app.use(createPinia());
app.use(setupCalendar, {});

app.mount('#app')
