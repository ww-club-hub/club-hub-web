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
  clientId: '77266016451-85o6ev9atgjpdnmh33ame5f5sfsr4up2.apps.googleusercontent.com'
})
app.use(createPinia());
app.use(setupCalendar, {});

app.mount('#app')
