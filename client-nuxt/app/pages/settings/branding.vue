<script setup lang="ts">
import { useWaitlistStore } from '~/stores/waitlist'

const store = useWaitlistStore()
const saving = ref(false)

const branding = ref({
  primaryColor: '#6366f1',
  secondaryColor: '#10b981',
  accentColor: '#f59e0b',
  logoUrl: '',
  widgetTitle: '',
  widgetSubtitle: '',
  buttonText: 'Join Waitlist',
  successTitle: "You're on the list! 🎉"
})

onMounted(async () => {
  if (store.hasApiKey) {
    await store.fetchWaitlist()
    if (store.currentWaitlist) {
      const settings = (store.currentWaitlist as any)?.settings || {}
      if (settings.branding) {
        branding.value = { ...branding.value, ...settings.branding }
      }
    }
  }
})

async function saveSettings() {
  saving.value = true
  try {
    await store.updateWaitlistSettings({
      settings: {
        branding: branding.value
      }
    })
    await store.fetchWaitlist()
  } catch (e: any) {
    // eslint-disable-next-line no-alert
    alert('Failed to save: ' + e.message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <UPageCard
      title="Branding"
      description="Customize the appearance of your waitlist widget."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Save changes"
        :loading="saving"
        icon="i-lucide-save"
        class="w-fit lg:ms-auto"
        @click="saveSettings"
      />
    </UPageCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UPageCard variant="subtle">
        <div class="space-y-4">
          <h3 class="font-semibold text-sm mb-4">Colors</h3>

          <div class="grid grid-cols-3 gap-4">
            <UFormField label="Primary">
              <div class="flex gap-2">
                <input
                  v-model="branding.primaryColor"
                  type="color"
                  class="size-10 border-2 border-default rounded-lg cursor-pointer shrink-0"
                >
                <UInput v-model="branding.primaryColor" class="flex-1" />
              </div>
            </UFormField>

            <UFormField label="Secondary">
              <div class="flex gap-2">
                <input
                  v-model="branding.secondaryColor"
                  type="color"
                  class="size-10 border-2 border-default rounded-lg cursor-pointer shrink-0"
                >
                <UInput v-model="branding.secondaryColor" class="flex-1" />
              </div>
            </UFormField>

            <UFormField label="Accent">
              <div class="flex gap-2">
                <input
                  v-model="branding.accentColor"
                  type="color"
                  class="size-10 border-2 border-default rounded-lg cursor-pointer shrink-0"
                >
                <UInput v-model="branding.accentColor" class="flex-1" />
              </div>
            </UFormField>
          </div>

          <USeparator />

          <h3 class="font-semibold text-sm mb-4">Widget Text</h3>

          <UFormField label="Logo URL">
            <UInput v-model="branding.logoUrl" placeholder="https://example.com/logo.png" />
          </UFormField>

          <UFormField label="Widget Title">
            <UInput v-model="branding.widgetTitle" placeholder="Join the Waitlist" />
          </UFormField>

          <UFormField label="Widget Subtitle">
            <UInput v-model="branding.widgetSubtitle" placeholder="Be the first to know!" />
          </UFormField>

          <UFormField label="Button Text">
            <UInput v-model="branding.buttonText" placeholder="Join Waitlist" />
          </UFormField>

          <UFormField label="Success Title">
            <UInput v-model="branding.successTitle" placeholder="You're on the list! 🎉" />
          </UFormField>
        </div>
      </UPageCard>

      <!-- Live Preview -->
      <UPageCard variant="subtle">
        <h3 class="font-semibold text-sm mb-4">Live Preview</h3>

        <div class="bg-background rounded-xl p-6 border border-default">
          <div class="text-center p-8 bg-elevated rounded-xl border border-default">
            <img
              v-if="branding.logoUrl"
              :src="branding.logoUrl"
              alt="Logo"
              class="max-w-[120px] max-h-[60px] mx-auto mb-4 object-contain"
            >
            <div
              v-else
              class="size-16 rounded-full flex items-center justify-center mx-auto mb-4"
              :style="{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }"
            >
              <UIcon name="i-lucide-sparkles" class="size-8 text-white" />
            </div>
            <h4 class="font-semibold mb-2">{{ branding.widgetTitle || store.currentWaitlist?.name || 'Join the Waitlist' }}</h4>
            <p class="text-sm text-dimmed">{{ branding.widgetSubtitle || 'Be the first to know when we launch!' }}</p>
            <div class="flex gap-2 mt-5">
              <div class="flex-1 px-3 py-2 bg-muted border border-default rounded-lg text-sm text-dimmed text-left">
                Enter your email
              </div>
              <button
                class="px-5 py-2 rounded-lg text-white font-medium text-sm"
                :style="{ background: branding.primaryColor }"
              >
                {{ branding.buttonText || 'Join' }}
              </button>
            </div>
          </div>
        </div>
      </UPageCard>
    </div>
  </div>
</template>
