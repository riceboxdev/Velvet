<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

onMounted(async () => {
  // Ensure auth is initialized
  if (!authStore.initialized) {
    // Wait for a brief moment for auth to initialize
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  watchEffect(() => {
    if (authStore.user) {
      navigateTo('/dashboard')
    } else {
      navigateTo('/auth')
    }
  })
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-dimmed" />
  </div>
</template>
