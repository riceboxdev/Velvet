<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const saving = ref(false)

const form = ref({
  name: '',
  bio: '',
  website: '',
  company: ''
})

onMounted(() => {
  if (authStore.user) {
    form.value.name = authStore.user.name || ''
    // TODO: Load profile fields from API
  }
})

async function saveProfile() {
  saving.value = true
  try {
    // TODO: Implement profile update API
    await new Promise(resolve => setTimeout(resolve, 1000))
  } catch (e: any) {
    console.error('Failed to save:', e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <UPageCard
      title="Profile"
      description="Your public profile information."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Save profile"
        :loading="saving"
        icon="i-lucide-save"
        class="w-fit lg:ms-auto"
        @click="saveProfile"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Avatar Section -->
        <div class="flex flex-col items-center gap-4">
          <UAvatar
            :alt="form.name || 'User'"
            :text="(form.name?.[0] || 'U').toUpperCase()"
            size="3xl"
          />
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-upload"
            size="sm"
          >
            Upload Photo
          </UButton>
          <p class="text-xs text-center text-dimmed">
            JPG, PNG or GIF. Max 2MB.
          </p>
        </div>

        <!-- Form Fields -->
        <div class="lg:col-span-2 space-y-5">
          <UFormField label="Display Name">
            <UInput
              v-model="form.name"
              placeholder="Your name"
            />
          </UFormField>

          <UFormField label="Bio">
            <UTextarea
              v-model="form.bio"
              placeholder="Tell us a little about yourself..."
              :rows="3"
            />
          </UFormField>

          <UFormField label="Website">
            <UInput
              v-model="form.website"
              type="url"
              placeholder="https://yourwebsite.com"
              leading-icon="i-lucide-link"
            />
          </UFormField>

          <UFormField label="Company">
            <UInput
              v-model="form.company"
              placeholder="Your company name"
              leading-icon="i-lucide-building-2"
            />
          </UFormField>
        </div>
      </div>
    </UPageCard>
  </div>
</template>
