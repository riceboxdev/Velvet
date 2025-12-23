<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const saving = ref(false)

const form = ref({
  email: '',
  name: ''
})

onMounted(() => {
  if (authStore.user) {
    form.value.email = authStore.user.email || ''
    form.value.name = authStore.user.name || ''
  }
})

async function saveChanges() {
  saving.value = true
  try {
    // TODO: Implement account update API
    await new Promise(resolve => setTimeout(resolve, 1000))
    // Show success toast
  } catch (e: any) {
    console.error('Failed to save:', e)
  } finally {
    saving.value = false
  }
}

async function deleteAccount() {
  if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
    return
  }
  // TODO: Implement account deletion
}
</script>

<template>
  <div>
    <UPageCard
      title="Account"
      description="Manage your account settings and preferences."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Save changes"
        :loading="saving"
        icon="i-lucide-save"
        class="w-fit lg:ms-auto"
        @click="saveChanges"
      />
    </UPageCard>

    <UPageCard variant="subtle" class="mb-6">
      <div class="space-y-6">
        <UFormField label="Email Address" required>
          <UInput
            v-model="form.email"
            type="email"
            placeholder="you@example.com"
            disabled
            class="max-w-md"
          />
          <template #hint>
            <span class="text-dimmed text-xs">Contact support to change your email</span>
          </template>
        </UFormField>

        <UFormField label="Display Name">
          <UInput
            v-model="form.name"
            placeholder="Your name"
            class="max-w-md"
          />
        </UFormField>
      </div>
    </UPageCard>

    <!-- Danger Zone -->
    <UPageCard
      title="Danger Zone"
      description="Irreversible and destructive actions."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    />

    <UCard :ui="{ root: 'ring-error/50' }">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h4 class="font-medium text-error">Delete Account</h4>
          <p class="text-sm text-dimmed">
            Permanently delete your account and all associated data.
          </p>
        </div>
        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-trash-2"
          @click="deleteAccount"
        >
          Delete Account
        </UButton>
      </div>
    </UCard>
  </div>
</template>
