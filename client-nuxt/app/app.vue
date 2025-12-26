<script setup lang="ts">
import { ClerkLoaded, ClerkLoading } from 'vue-clerk'

const colorMode = useColorMode()
const config = useRuntimeConfig()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/velvet-logo.svg' },
    { rel: 'alternate icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Velvet'
const description = 'Velvet - A beautiful waitlist management platform. Create and manage waitlists with powerful analytics, referral tracking, and customizable widgets.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})

// Clerk publishable key
const clerkPublishableKey = config.public.clerkPublishableKey as string
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <!-- Clerk Provider wraps the entire app -->
    <ClientOnly>
      <ClerkLoading>
        <div class="min-h-screen flex items-center justify-center">
          <div class="animate-pulse text-muted">Loading...</div>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </ClerkLoaded>
      
      <template #fallback>
        <div class="min-h-screen flex items-center justify-center">
          <div class="animate-pulse text-muted">Loading...</div>
        </div>
      </template>
    </ClientOnly>
  </UApp>
</template>
