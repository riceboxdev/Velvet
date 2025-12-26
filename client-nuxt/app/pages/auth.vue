<script setup lang="ts">
import { SignIn, SignUp, useAuth } from 'vue-clerk'

definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const { isSignedIn } = useAuth()

const isLogin = ref(true)

// Redirect if already signed in
watch(isSignedIn, (signedIn) => {
  if (signedIn) {
    router.push('/')
  }
}, { immediate: true })

function toggleMode() {
  isLogin.value = !isLogin.value
}
</script>

<template>
  <div class="w-full max-w-md mx-4">
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

    <!-- Clerk Sign In / Sign Up Component -->
    <div class="clerk-container">
      <SignIn 
        v-if="isLogin"
        :routing="'hash'"
        :sign-up-url="'/auth'"
        :appearance="{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border-0 bg-transparent',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton: 'border border-default hover:bg-elevated',
            formButtonPrimary: 'bg-primary hover:bg-primary/90',
            footerAction: 'hidden'
          }
        }"
      />
      <SignUp 
        v-else
        :routing="'hash'"
        :sign-in-url="'/auth'"
        :appearance="{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border-0 bg-transparent',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton: 'border border-default hover:bg-elevated',
            formButtonPrimary: 'bg-primary hover:bg-primary/90',
            footerAction: 'hidden'
          }
        }"
      />
    </div>

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
  </div>
</template>

<style scoped>
.clerk-container :deep(.cl-internal-b3fm6y) {
  background: transparent;
}
</style>
