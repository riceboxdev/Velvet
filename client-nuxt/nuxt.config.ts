// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/content',
    '@nuxt/image',
    '@vueuse/nuxt',
    '@pinia/nuxt'
  ],

  content: {
    build: {
      markdown: {
        toc: {
          searchDepth: 1
        }
      }
    }
  },

  runtimeConfig: {
    public: {
      apiBase: '',
      firebaseApiKey: '',
      firebaseAuthDomain: '',
      firebaseProjectId: '',
      firebaseStorageBucket: '',
      firebaseMessagingSenderId: '',
      firebaseAppId: ''
    }
  }
},

  devtools: {
  enabled: true
},

  css: ['~/assets/css/main.css'],

  routeRules: {
  '/api/**': {
    cors: true
  }
},

  compatibilityDate: '2024-07-11',

  //   eslint: {
  //     config: {
  //       stylistic: {
  //         commaDangle: 'never',
  //         braceStyle: '1tbs'
  //       }
  //     }
  //   }
})
