import { clerkPlugin } from 'vue-clerk'

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig()

    nuxtApp.vueApp.use(clerkPlugin, {
        publishableKey: config.public.clerkPublishableKey as string
    })
})
