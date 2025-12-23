<script setup lang="ts">
const config = useRuntimeConfig()

interface Plan {
  id: string
  name: string
  monthlyPrice: number
  annualPrice: number
  annualMonthlyPrice: number
  maxWaitlists: number | null
  maxSignupsPerMonth: number | null
  features: string[]
}

interface Subscription {
  planId: string
  planName: string
  billingCycle: string
  status: string
  currentPeriodEnd: string
}

interface Limits {
  maxWaitlists: number | null
  maxSignupsPerMonth: number | null
  planName: string
  hasSubscription: boolean
}

const API_URL = config.public.apiUrl || 'http://localhost:3001'

const loading = ref(true)
const subscription = ref<Subscription | null>(null)
const limits = ref<Limits | null>(null)
const plans = ref<Plan[]>([])

onMounted(async () => {
  await Promise.all([fetchSubscription(), fetchPlans()])
  loading.value = false
})

async function fetchSubscription() {
  try {
    const token = localStorage.getItem('velvet_token')
    const response = await fetch(`${API_URL}/api/subscription/current`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (response.ok) {
      const data = await response.json()
      subscription.value = data.subscription
      limits.value = data.limits
    }
  } catch (e) {
    console.error('Failed to fetch subscription:', e)
  }
}

async function fetchPlans() {
  try {
    const response = await fetch(`${API_URL}/api/subscription/plans`)
    if (response.ok) {
      plans.value = await response.json()
    }
  } catch (e) {
    console.error('Failed to fetch plans:', e)
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatNumber(num: number | null) {
  if (!num) return 'Unlimited'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'k'
  return num.toString()
}

function handleUpgrade() {
  navigateTo('/pricing')
}

function handleManageBilling() {
  // TODO: Redirect to Stripe billing portal
  alert('Billing portal coming soon!')
}
</script>

<template>
  <div>
    <UPageCard
      title="Billing"
      description="Manage your subscription and billing information."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
    </div>

    <template v-else>
      <!-- Current Plan -->
      <UPageCard variant="subtle" class="mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <UBadge
                :color="subscription ? 'primary' : 'neutral'"
                variant="subtle"
                size="lg"
              >
                {{ limits?.planName || 'Free' }}
              </UBadge>
              <UBadge
                v-if="subscription?.status === 'active'"
                color="success"
                variant="subtle"
              >
                Active
              </UBadge>
            </div>

            <div v-if="subscription" class="text-sm text-dimmed">
              <span v-if="subscription.billingCycle === 'annual'">
                Billed annually
              </span>
              <span v-else>
                Billed monthly
              </span>
              · Renews {{ formatDate(subscription.currentPeriodEnd) }}
            </div>
            <div v-else class="text-sm text-dimmed">
              Upgrade to unlock more features
            </div>
          </div>

          <div class="flex gap-3">
            <UButton
              v-if="subscription"
              color="neutral"
              variant="outline"
              @click="handleManageBilling"
            >
              Manage Billing
            </UButton>
            <UButton @click="handleUpgrade">
              {{ subscription ? 'Change Plan' : 'Upgrade' }}
            </UButton>
          </div>
        </div>
      </UPageCard>

      <!-- Usage -->
      <UPageCard
        title="Current Usage"
        description="Your resource usage for this billing period."
        variant="naked"
        orientation="horizontal"
        class="mb-4"
      />

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <UCard>
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-list" class="size-6 text-primary" />
            </div>
            <div>
              <div class="text-2xl font-bold">1</div>
              <div class="text-sm text-dimmed">
                of {{ limits?.maxWaitlists ?? '∞' }} waitlists
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-lg bg-success/10 flex items-center justify-center">
              <UIcon name="i-lucide-users" class="size-6 text-success" />
            </div>
            <div>
              <div class="text-2xl font-bold">0</div>
              <div class="text-sm text-dimmed">
                of {{ formatNumber(limits?.maxSignupsPerMonth) }} signups/mo
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-lg bg-info/10 flex items-center justify-center">
              <UIcon name="i-lucide-users-round" class="size-6 text-info" />
            </div>
            <div>
              <div class="text-2xl font-bold">1</div>
              <div class="text-sm text-dimmed">
                team member
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Available Plans -->
      <UPageCard
        title="Available Plans"
        description="Compare and choose the right plan for your needs."
        variant="naked"
        orientation="horizontal"
        class="mb-4"
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard
          v-for="plan in plans"
          :key="plan.id"
          :ui="{
            root: limits?.planName === plan.name ? 'ring-2 ring-primary' : ''
          }"
        >
          <div class="text-center">
            <h3 class="font-semibold mb-1">{{ plan.name }}</h3>
            <div v-if="plan.monthlyPrice > 0" class="text-2xl font-bold">
              ${{ plan.monthlyPrice }}<span class="text-sm text-dimmed font-normal">/mo</span>
            </div>
            <div v-else class="text-2xl font-bold">Custom</div>

            <div class="text-xs text-dimmed mt-2 space-y-1">
              <div>{{ plan.maxWaitlists ?? 'Unlimited' }} waitlists</div>
              <div>{{ formatNumber(plan.maxSignupsPerMonth) }} signups/mo</div>
            </div>

            <UButton
              v-if="limits?.planName !== plan.name"
              size="sm"
              color="neutral"
              variant="outline"
              class="mt-4"
              block
              @click="handleUpgrade"
            >
              {{ plan.monthlyPrice === 0 ? 'Contact Sales' : 'Select' }}
            </UButton>
            <UBadge
              v-else
              color="primary"
              variant="subtle"
              class="mt-4"
            >
              Current Plan
            </UBadge>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
