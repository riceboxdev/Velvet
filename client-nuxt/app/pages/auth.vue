<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const authStore = useAuthStore()

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const name = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''

  if (!email.value || !password.value) {
    error.value = 'Please fill in all required fields'
    return
  }

  if (!isLogin.value && password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  loading.value = true

  try {
    if (isLogin.value) {
      await authStore.login(email.value, password.value)
    } else {
      await authStore.signup(email.value, password.value, name.value)
    }

    router.push('/')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function toggleMode() {
  isLogin.value = !isLogin.value
  error.value = ''
}
</script>

<template>
  <UCard class="w-full max-w-md mx-4" :ui="{ body: 'p-8 sm:p-10' }">
    <!-- Header -->
    <div class="text-center mb-8">
      <img 
        src="/velvet-logo.svg" 
        alt="Velvet" 
        class="h-14 w-14 mx-auto mb-5 dark:invert"
      />
      <h1 class="text-2xl font-semibold mb-2">
        {{ isLogin ? 'Welcome back' : 'Create account' }}
      </h1>
      <p class="text-dimmed">
        {{ isLogin ? 'Sign in to access your waitlists' : 'Start managing your waitlists' }}
      </p>
    </div>

    <!-- Form -->
    <form class="space-y-5" @submit.prevent="handleSubmit">
      <UFormField v-if="!isLogin" label="Name">
        <UInput
          v-model="name"
          type="text"
          placeholder="Your name (optional)"
        />
      </UFormField>

      <UFormField label="Email" required>
        <UInput
          v-model="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </UFormField>

      <UFormField label="Password" required :hint="!isLogin ? 'At least 8 characters' : undefined">
        <UInput
          v-model="password"
          type="password"
          placeholder="••••••••"
          required
        />
      </UFormField>

      <!-- Error -->
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :title="error"
      />

      <UButton
        type="submit"
        size="lg"
        block
        :loading="loading"
        :disabled="loading"
      >
        {{ isLogin ? 'Sign In' : 'Create Account' }}
      </UButton>
    </form>

    <!-- Footer -->
    <div class="text-center mt-6 pt-6 border-t border-default text-sm text-dimmed">
      {{ isLogin ? "Don't have an account?" : 'Already have an account?' }}
      <UButton
        variant="link"
        size="sm"
        class="ml-1"
        @click="toggleMode"
      >
        {{ isLogin ? 'Sign up' : 'Sign in' }}
      </UButton>
    </div>
  </UCard>
</template>
