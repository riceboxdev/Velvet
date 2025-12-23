<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const colorMode = useColorMode()
const appConfig = useAppConfig()

// Redirect non-admins
if (!authStore.user?.is_admin) {
  navigateTo('/settings')
}

const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

const selectedPrimary = ref(appConfig.ui.colors.primary)
const selectedNeutral = ref(appConfig.ui.colors.neutral)
const selectedMode = ref(colorMode.preference)

function applyTheme() {
  appConfig.ui.colors.primary = selectedPrimary.value
  appConfig.ui.colors.neutral = selectedNeutral.value
  colorMode.preference = selectedMode.value
}

// Watch and apply changes
watch([selectedPrimary, selectedNeutral, selectedMode], () => {
  applyTheme()
})
</script>

<template>
  <div>
    <UPageCard
      title="Appearance"
      description="Customize the dashboard theme and colors. Changes apply to all users."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UBadge color="warning" variant="subtle" class="lg:ms-auto">
        <UIcon name="i-lucide-shield" class="size-3 mr-1" />
        Admin Only
      </UBadge>
    </UPageCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UPageCard variant="subtle">
        <h3 class="font-semibold text-sm mb-4">Color Scheme</h3>

        <div class="space-y-6">
          <UFormField label="Color Mode">
            <USelectMenu
              v-model="selectedMode"
              :items="[
                { label: 'Light', value: 'light', icon: 'i-lucide-sun' },
                { label: 'Dark', value: 'dark', icon: 'i-lucide-moon' },
                { label: 'System', value: 'system', icon: 'i-lucide-monitor' }
              ]"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Primary Color">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in colors"
                :key="color"
                class="size-8 rounded-lg transition-all ring-2 ring-offset-2 ring-offset-background"
                :class="[
                  selectedPrimary === color ? 'ring-primary scale-110' : 'ring-transparent hover:ring-default'
                ]"
                :style="{
                  backgroundColor: `var(--color-${color}-500)`
                }"
                @click="selectedPrimary = color"
              />
            </div>
          </UFormField>

          <UFormField label="Neutral Color">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in neutrals"
                :key="color"
                class="size-8 rounded-lg transition-all ring-2 ring-offset-2 ring-offset-background"
                :class="[
                  selectedNeutral === color ? 'ring-primary scale-110' : 'ring-transparent hover:ring-default'
                ]"
                :style="{
                  backgroundColor: `var(--color-${color === 'neutral' ? 'gray' : color}-500)`
                }"
                @click="selectedNeutral = color"
              />
            </div>
          </UFormField>
        </div>
      </UPageCard>

      <UPageCard variant="subtle">
        <h3 class="font-semibold text-sm mb-4">Preview</h3>

        <div class="space-y-4">
          <div class="p-4 rounded-lg bg-elevated border border-default">
            <div class="flex items-center gap-3 mb-4">
              <div class="size-10 rounded-full bg-primary flex items-center justify-center">
                <UIcon name="i-lucide-sparkles" class="size-5 text-white" />
              </div>
              <div>
                <div class="font-semibold">Dashboard Theme</div>
                <div class="text-sm text-dimmed">Preview your color choices</div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton>Primary Button</UButton>
              <UButton color="neutral" variant="outline">Neutral</UButton>
              <UButton color="success" variant="soft">Success</UButton>
              <UButton color="error" variant="soft">Error</UButton>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <UBadge color="primary">Primary</UBadge>
            <UBadge color="success">Success</UBadge>
            <UBadge color="warning">Warning</UBadge>
            <UBadge color="error">Error</UBadge>
            <UBadge color="info">Info</UBadge>
            <UBadge color="neutral">Neutral</UBadge>
          </div>

          <UProgress :value="65" color="primary" />
        </div>

        <UAlert
          class="mt-4"
          color="info"
          variant="subtle"
          icon="i-lucide-info"
          title="Theme changes apply instantly to all users viewing the dashboard."
        />
      </UPageCard>
    </div>
  </div>
</template>
