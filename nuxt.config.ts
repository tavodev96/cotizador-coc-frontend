// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  components: true,
  modules: [
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@nuxtjs/tailwindcss',
    'nuxt-icons',
    'nuxt-auth-sanctum',
    'notivue/nuxt'
  ],
  css: [
    'notivue/notification.css',
    'notivue/animations.css'
  ],
  sanctum: {
    baseUrl: 'http://localhost:8000', // Laravel API
    mode: 'cookie',
    endpoints: {
      login: '/login',
      logout: '/logout',
      user: '/user',
      csrf: '/sanctum/csrf-cookie' // Default Laravel Sanctum CSRF endpoint
    },
    redirect: {
      keepRequestedRoute: true,
      onLogin: '/admin/dashboard',
      onAuthOnly: '/login',
      onLogout: '/',
    },
    redirectIfAuthenticated: true
  },

  runtimeConfig: {
    public: {
      frontendUrl: 'http://localhost:3000',
      apiBase: 'http://localhost:8000/api',
      ImageUrl: 'http://localhost:3000',
    }
  },
})