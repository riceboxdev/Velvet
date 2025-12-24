<script setup lang="ts">
/**
 * UpgradePrompt - Shows when a user tries to access a feature not in their plan
 * 
 * Usage:
 *   <UpgradePrompt 
 *     v-model="showUpgrade"
 *     feature="remove_branding"
 *     required-plan="Advanced"
 *   />
 */

const props = defineProps<{
  feature?: string
  requiredPlan?: string
  message?: string
}>()

const modelValue = defineModel<boolean>({ default: false })

const FEATURE_LABELS: Record<string, string> = {
  remove_branding: 'Remove "Powered by" Branding',
  zapier_integration: 'Zapier Integration',
  hide_position_count: 'Hide Position & Signup Count',
  block_personal_emails: 'Block Personal Emails',
  allowed_domains: 'Domain Whitelist',
  custom_email_templates: 'Custom Email Templates',
  custom_offboarding_email: 'Custom Offboarding Emails',
  email_blasts: 'Email Blasts',
  custom_domain_emails: 'Custom Email Domain',
  analytics_deep: 'Advanced Analytics',
  multi_user_team: 'Team Management',
  move_user_position: 'Move User Position API'
}

const PLAN_FEATURES: Record<string, string[]> = {
  Advanced: [
    'remove_branding',
    'zapier_integration', 
    'hide_position_count',
    'block_personal_emails',
    'allowed_domains',
    'move_user_position'
  ],
  Pro: [
    'custom_email_templates',
    'custom_offboarding_email',
    'email_blasts',
    'custom_domain_emails',
    'analytics_deep',
    'multi_user_team'
  ]
}

const featureLabel = computed(() => {
  if (props.feature) {
    return FEATURE_LABELS[props.feature] || props.feature.replace(/_/g, ' ')
  }
  return 'this feature'
})

const requiredPlanName = computed(() => {
  if (props.requiredPlan) return props.requiredPlan
  
  // Auto-detect required plan from feature
  if (props.feature) {
    if (PLAN_FEATURES.Pro.includes(props.feature)) return 'Pro'
    if (PLAN_FEATURES.Advanced.includes(props.feature)) return 'Advanced'
  }
  return 'a higher'
})

function handleClose() {
  modelValue.value = false
}

function handleUpgrade() {
  navigateTo('/account/billing')
  modelValue.value = false
}
</script>

<template>
  <UModal v-model:open="modelValue">
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-sparkles" class="size-5 text-primary" />
          </div>
          <div>
            <h3 class="font-semibold">Upgrade Required</h3>
            <p class="text-sm text-dimmed">Unlock more features</p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <p v-if="message" class="text-dimmed">{{ message }}</p>
        <p v-else class="text-dimmed">
          <strong class="text-foreground">{{ featureLabel }}</strong> requires the 
          <strong class="text-primary">{{ requiredPlanName }}</strong> plan or higher.
        </p>

        <div class="bg-elevated rounded-lg p-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-check-circle" class="size-5 text-success mt-0.5" />
            <div>
              <p class="font-medium mb-1">What you'll get with {{ requiredPlanName }}:</p>
              <ul class="text-sm text-dimmed space-y-1">
                <li v-if="requiredPlanName === 'Advanced' || requiredPlanName === 'Pro'">
                  • Remove "Powered by" branding
                </li>
                <li v-if="requiredPlanName === 'Advanced' || requiredPlanName === 'Pro'">
                  • Zapier integration
                </li>
                <li v-if="requiredPlanName === 'Advanced' || requiredPlanName === 'Pro'">
                  • Hide position counts
                </li>
                <li v-if="requiredPlanName === 'Pro'">
                  • Custom email templates
                </li>
                <li v-if="requiredPlanName === 'Pro'">
                  • Advanced analytics
                </li>
                <li v-if="requiredPlanName === 'Pro'">
                  • Team management
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="outline" @click="handleClose">
            Maybe Later
          </UButton>
          <UButton color="primary" @click="handleUpgrade">
            View Plans
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
