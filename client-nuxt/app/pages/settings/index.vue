<script setup lang="ts">
import { useWaitlistStore } from '~/stores/waitlist'

const store = useWaitlistStore()
const saving = ref(false)

const form = ref({
  name: '',
  description: '',
  showLeaderboard: true
})

onMounted(async () => {
  if (store.hasApiKey) {
    await store.fetchWaitlist()
    if (store.currentWaitlist) {
      populateForm()
    }
  }
})

function populateForm() {
  const wl = store.currentWaitlist
  const settings = (wl as any)?.settings || {}

  form.value.name = wl?.name || ''
  form.value.description = wl?.description || ''
  form.value.showLeaderboard = settings.showLeaderboard !== false
}

async function saveSettings() {
  saving.value = true
  try {
    await store.updateWaitlistSettings({
      name: form.value.name,
      description: form.value.description,
      settings: {
        showLeaderboard: form.value.showLeaderboard
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
      title="General"
      description="Configure your waitlist basic settings."
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

    <UPageCard variant="subtle">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="space-y-4">
          <UFormField label="Waitlist Name" required>
            <UInput v-model="form.name" placeholder="My Awesome Product" />
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="form.description"
              :rows="3"
              placeholder="Brief description of your waitlist..."
            />
          </UFormField>

          <UCheckbox
            v-model="form.showLeaderboard"
            label="Show public leaderboard"
            description="Allow users to see top referrers on the widget"
          />
        </div>

        <UCard>
          <template #header>
            <h3 class="font-semibold text-sm">Quick Stats</h3>
          </template>

          <div class="space-y-3">
            <div class="flex items-center gap-4 p-3 rounded-lg bg-elevated">
              <UIcon name="i-lucide-users" class="size-5 text-dimmed" />
              <div>
                <div class="text-xl font-bold">{{ store.stats?.total_signups || 0 }}</div>
                <div class="text-xs text-dimmed">Total Signups</div>
              </div>
            </div>
            <div class="flex items-center gap-4 p-3 rounded-lg bg-elevated">
              <UIcon name="i-lucide-user-check" class="size-5 text-dimmed" />
              <div>
                <div class="text-xl font-bold">{{ store.stats?.admitted || 0 }}</div>
                <div class="text-xs text-dimmed">Admitted</div>
              </div>
            </div>
            <div class="flex items-center gap-4 p-3 rounded-lg bg-elevated">
              <UIcon name="i-lucide-share-2" class="size-5 text-dimmed" />
              <div>
                <div class="text-xl font-bold">{{ (store.stats as any)?.total_referrals || 0 }}</div>
                <div class="text-xs text-dimmed">Referrals</div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </UPageCard>
  </div>
</template>
