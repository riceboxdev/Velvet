<script setup lang="ts">
import { z } from 'zod'
import { useWaitlistStore } from '~/stores/waitlist'
import { useAuthStore } from '~/stores/auth'

const waitlistStore = useWaitlistStore()
const authStore = useAuthStore()
const toast = useToast()
const config = useRuntimeConfig()

const state = reactive({
  connectors: {
    zapier: { enabled: false },
    webhook: { url: '' },
    slack: { enabled: false },
    hubspot: { enabled: false }
  }
})

// Initialize state from store
watchEffect(() => {
  if (waitlistStore.currentWaitlist?.settings?.connectors) {
    // Deep merge or assign to avoid overwriting with defaults if partial
    Object.assign(state.connectors, waitlistStore.currentWaitlist.settings.connectors)
  }
})

const loading = ref(false)
const regeneratingZapierKey = ref(false)

async function saveSettings() {
  loading.value = true
  try {
    const settings = {
      ...waitlistStore.currentWaitlist?.settings,
      connectors: state.connectors
    }
    
    await waitlistStore.updateWaitlistSettings({ settings })
    toast.add({ title: 'Settings saved', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Failed to save settings', color: 'error' })
  } finally {
    loading.value = false
  }
}

function copyZapierKey() {
  const key = waitlistStore.currentWaitlist?.zapier_api_key
  if (!key) {
    // Fallback to regular API key for backwards compatibility
    if (!waitlistStore.currentWaitlist?.api_key) return
    navigator.clipboard.writeText(waitlistStore.currentWaitlist.api_key)
  } else {
    navigator.clipboard.writeText(key)
  }
  toast.add({ title: 'Copied to clipboard', color: 'success' })
}

async function regenerateZapierKey() {
  if (!waitlistStore.currentWaitlist?.id) return
  
  regeneratingZapierKey.value = true
  try {
    const response = await $fetch(`${config.public.apiBase}/waitlists/${waitlistStore.currentWaitlist.id}/regenerate-zapier-key`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await authStore.getIdToken()}`
      }
    })
    
    // Refresh waitlist data
    await waitlistStore.fetchWaitlist(waitlistStore.currentWaitlist.id)
    toast.add({ title: 'Zapier key regenerated', description: 'Remember to update your Zaps with the new key!', color: 'success' })
  } catch (error) {
    toast.add({ title: 'Failed to regenerate key', color: 'error' })
  } finally {
    regeneratingZapierKey.value = false
  }
}

// Mock connection functions
const connectingSlack = ref(false)
const connectingHubspot = ref(false)

async function connectSlack() {
  connectingSlack.value = true
  // Mock delay
  await new Promise(resolve => setTimeout(resolve, 1500))
  connectingSlack.value = false
  state.connectors.slack.enabled = true
  saveSettings()
  toast.add({ title: 'Connected to Slack', color: 'success' })
}

async function connectHubspot() {
  connectingHubspot.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  connectingHubspot.value = false
  state.connectors.hubspot.enabled = true
  saveSettings()
  toast.add({ title: 'Connected to Hubspot', color: 'success' })
}

// Zapier trigger types for display
const zapierTriggers = [
  { name: 'New Signup', description: 'Triggers when a user signs up for your waitlist', icon: 'i-lucide-user-plus' },
  { name: 'New Referrer', description: 'Triggers when a user successfully refers someone', icon: 'i-lucide-share-2' },
  { name: 'Offboard', description: 'Triggers when you offboard a user from the waitlist', icon: 'i-lucide-user-check' }
]
</script>

<template>
  <UDashboardPanel id="connectors">
    <template #header>
      <UDashboardNavbar title="Connectors">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Integrations</h3>
          <p class="text-sm text-dimmed">Manage third-party integrations and automations.</p>
        </template>

        <div class="space-y-8">
          
          <!-- Zapier -->
          <section>
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-[#FF4A00]/10 flex items-center justify-center">
                  <UIcon name="i-logos-zapier" class="w-6 h-6" />
                </div>
                <div>
                  <h4 class="font-medium text-lg">Zapier</h4>
                  <p class="text-sm text-dimmed">Automate workflows with 5,000+ apps</p>
                </div>
              </div>
              <p class="text-xs text-primary bg-primary/10 px-2 py-1 rounded">PRO</p>
            </div>

            <div class="space-y-4 border rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
              <UFormGroup label="Enable Zapier Integration">
                <UToggle 
                  v-model="state.connectors.zapier.enabled" 
                  @change="saveSettings" 
                  :disabled="!authStore.subscription?.features.includes('zapier_integration')"
                />
              </UFormGroup>

              <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="translate-y-1 opacity-0"
                enter-to-class="translate-y-0 opacity-100"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="translate-y-0 opacity-100"
                leave-to-class="translate-y-1 opacity-0"
              >
                <div v-if="state.connectors.zapier.enabled" class="space-y-6 pt-2">
                  <!-- Zapier API Key -->
                  <UFormGroup label="Zapier API Key" help="Use this key to connect with Zapier. Do not share this key.">
                    <div class="flex gap-2">
                      <UInput
                        :model-value="waitlistStore.currentWaitlist?.zapier_api_key || waitlistStore.currentWaitlist?.api_key"
                        readonly
                        class="flex-1 font-mono text-sm"
                        type="password"
                      />
                      <UButton
                        icon="i-lucide-copy"
                        color="neutral"
                        variant="soft"
                        @click="copyZapierKey"
                      />
                      <UButton
                        icon="i-lucide-refresh-cw"
                        color="neutral"
                        variant="soft"
                        :loading="regeneratingZapierKey"
                        @click="regenerateZapierKey"
                        title="Regenerate key"
                      />
                    </div>
                  </UFormGroup>

                  <!-- Available Triggers -->
                  <div>
                    <h5 class="text-sm font-medium mb-3">Available Triggers</h5>
                    <div class="grid gap-3">
                      <div 
                        v-for="trigger in zapierTriggers" 
                        :key="trigger.name"
                        class="flex items-start gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800/50"
                      >
                        <UIcon :name="trigger.icon" class="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <div class="font-medium text-sm">{{ trigger.name }}</div>
                          <p class="text-xs text-dimmed">{{ trigger.description }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Zapier Link -->
                  <UButton
                    variant="outline"
                    color="neutral"
                    block
                    to="https://zapier.com/apps"
                    target="_blank"
                    icon="i-lucide-external-link"
                    trailing
                  >
                    Open Zapier App Directory
                  </UButton>
                </div>
              </Transition>
            </div>
          </section>

          <UDivider />

          <!-- Webhooks -->
          <section>
             <div class="mb-4">
                <h4 class="font-medium text-lg">Webhooks</h4>
                <p class="text-sm text-dimmed">Trigger webhook callbacks on User Signup and Offboarding.</p>
             </div>
             
             <UFormGroup label="Webhook URL">
               <UInput 
                 v-model="state.connectors.webhook.url" 
                 placeholder="https://example.com/webhook"
                 @blur="saveSettings"
               />
             </UFormGroup>
          </section>

          <UDivider />

          <!-- Custom Integrations -->
          <section class="space-y-6">
            <h4 class="font-medium text-lg">Custom</h4>

            <!-- Slack -->
            <div class="flex items-center justify-between">
              <div class="flex items-start gap-3">
                 <UIcon name="i-logos-slack-icon" class="w-8 h-8 shrink-0" />
                 <div>
                   <div class="font-medium">Slack</div>
                   <p class="text-sm text-dimmed">Get a notification in Slack every time a user signs up</p>
                 </div>
              </div>
              <UButton 
                v-if="!state.connectors.slack.enabled"
                color="primary" 
                :loading="connectingSlack"
                @click="connectSlack"
              >
                Connect with Slack
              </UButton>
              <UButton v-else color="neutral" variant="soft" disabled>Connected</UButton>
            </div>

            <!-- Hubspot -->
            <div class="flex items-center justify-between">
                <div class="flex items-start gap-3">
                   <UIcon name="i-logos-hubspot" class="w-8 h-8 shrink-0" />
                   <div>
                     <div class="font-medium">Hubspot</div>
                     <p class="text-sm text-dimmed">Add/Update contact in hubspot every time a user signs up</p>
                   </div>
                </div>
                <UButton 
                  v-if="!state.connectors.hubspot.enabled"
                  color="primary" 
                  :loading="connectingHubspot"
                  @click="connectHubspot"
                >
                  Connect with Hubspot
                </UButton>
                 <UButton v-else color="neutral" variant="soft" disabled>Connected</UButton>
            </div>
          </section>

        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>

