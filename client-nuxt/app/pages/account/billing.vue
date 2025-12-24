<script setup lang="ts">
const config = useRuntimeConfig()
const toast = useToast()
const authStore = useAuthStore()

interface Plan {
  id: string
  name: string
  monthlyPrice: number
  annualPrice: number
  annualMonthlyPrice: number
  maxWaitlists: number | null
  maxSignupsPerMonth: number | null
  features: string[]
  isFree: boolean
  isEnterprise: boolean
}

interface Subscription {
  id: string
  planId: string
  billingCycle: string
  status: string
  currentPeriodEnd: string
  stripeSubscriptionId: string | null
}

interface Limits {
  maxWaitlists: number | null
  maxSignupsPerMonth: number | null
  maxTeamMembers: number | null
  planName: string
  hasSubscription: boolean
  features: string[]
}

const API_URL = config.public.apiBase || 'http://localhost:3001'

const loading = ref(true)
const subscription = ref<Subscription | null>(null)
const limits = ref<Limits | null>(null)
const plans = ref<Plan[]>([])
const changingPlan = ref(false)
const selectedPlan = ref<Plan | null>(null)
const showPlanModal = ref(false)
const isAnnual = ref(false)

const billingCycle = computed(() => isAnnual.value ? 'annual' : 'monthly')

// Test mode state
const testMode = ref(true) // Enable test mode by default until Stripe is configured
const testPlanName = ref('')
const settingTestPlan = ref(false)

onMounted(async () => {
  await Promise.all([fetchSubscription(), fetchPlans()])
  loading.value = false
})

async function getAuthToken() {
  // Use Firebase auth store to get fresh ID token
  return await authStore.getIdToken()
}

async function fetchSubscription() {
  try {
    const token = await getAuthToken()
    const response = await fetch(`${API_URL}/subscription/current`, {
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
    const url = `${API_URL}/subscription/plans`
    console.log('[Billing] Fetching plans from:', url)
    const response = await fetch(url)
    console.log('[Billing] Plans response status:', response.status)
    if (response.ok) {
      const data = await response.json()
      console.log('[Billing] Plans fetched:', data?.length, 'plans')
      plans.value = data
    } else {
      console.error('[Billing] Plans fetch failed:', response.status)
    }
  } catch (e) {
    console.error('[Billing] Failed to fetch plans:', e)
  }
}

// Filter to only show paid plans (not free or enterprise)
const paidPlans = computed(() => 
  plans.value.filter(p => !p.isFree && !p.isEnterprise && p.monthlyPrice > 0)
)

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatNumber(num: number | null | undefined) {
  if (num === null || num === undefined) return 'Unlimited'
  if (num >= 1000) return (num / 1000).toFixed(0) + 'k'
  return num.toString()
}

function openPlanModal(plan: Plan) {
  if (plan.isEnterprise) {
    window.location.href = 'mailto:sales@velvet.dev?subject=Enterprise%20Plan%20Inquiry'
    return
  }
  selectedPlan.value = plan
  showPlanModal.value = true
}

async function handleSelectPlan() {
  if (!selectedPlan.value) return
  
  changingPlan.value = true
  
  try {
    const token = await getAuthToken()
    
    // Create Stripe Checkout session
    const response = await fetch(`${API_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        planName: selectedPlan.value.name,
        billingCycle: billingCycle.value
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.details || error.error || 'Failed to create checkout session')
    }

    const { url } = await response.json()
    
    // Redirect to Stripe Checkout
    if (url) {
      window.location.href = url
    }
  } catch (error: any) {
    console.error('Checkout error:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to start checkout',
      color: 'error'
    })
  } finally {
    changingPlan.value = false
    showPlanModal.value = false
  }
}

async function handleManageBilling() {
  try {
    const token = await getAuthToken()
    
    const response = await fetch(`${API_URL}/stripe/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to open billing portal')
    }

    const { url } = await response.json()
    
    if (url) {
      window.location.href = url
    }
  } catch (error: any) {
    console.error('Portal error:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to open billing portal',
      color: 'error'
    })
  }
}

// Check for success/canceled from Stripe redirect
onMounted(() => {
  const route = useRoute()
  if (route.query.success === 'true') {
    toast.add({
      title: 'Success!',
      description: 'Your subscription has been activated.',
      color: 'success'
    })
  } else if (route.query.canceled === 'true') {
    toast.add({
      title: 'Checkout Canceled',
      description: 'Your subscription was not changed.',
      color: 'warning'
    })
  }
})

function getPlanPrice(plan: Plan) {
  if (billingCycle.value === 'annual') {
    return plan.annualMonthlyPrice || Math.round(plan.annualPrice / 12)
  }
  return plan.monthlyPrice
}

function isCurrentPlan(plan: Plan) {
  return limits.value?.planName === plan.name
}

// Test mode functions
async function setTestPlan() {
  if (!testPlanName.value) return
  
  settingTestPlan.value = true
  try {
    const token = await getAuthToken()
    const response = await fetch(`${API_URL}/subscription/test/set-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        planName: testPlanName.value,
        billingCycle: billingCycle.value
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to set plan')
    }

    toast.add({
      title: 'Plan Updated',
      description: data.message,
      color: 'success'
    })

    // Refresh subscription data
    await fetchSubscription()
  } catch (error: any) {
    console.error('Set test plan error:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to set test plan',
      color: 'error'
    })
  } finally {
    settingTestPlan.value = false
  }
}

async function clearTestSubscription() {
  settingTestPlan.value = true
  try {
    const token = await getAuthToken()
    const response = await fetch(`${API_URL}/subscription/test/clear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to clear subscription')
    }

    toast.add({
      title: 'Subscription Cleared',
      description: data.message,
      color: 'success'
    })

    // Refresh subscription data
    await fetchSubscription()
    testPlanName.value = ''
  } catch (error: any) {
    console.error('Clear subscription error:', error)
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to clear subscription',
      color: 'error'
    })
  } finally {
    settingTestPlan.value = false
  }
}

// Get available plans for test dropdown
const testPlanOptions = computed(() => {
  return plans.value
    .filter(p => !p.isEnterprise)
    .map(p => ({
      label: p.name,
      value: p.name
    }))
})
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
      <!-- Test Mode Panel -->
      <UCard v-if="testMode" class="mb-6 border-warning/50 bg-warning/5">
        <div class="flex items-start gap-4">
          <div class="size-10 rounded-lg bg-warning/20 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-flask-conical" class="size-5 text-warning" />
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="font-semibold">Test Mode</h3>
              <UBadge color="warning" variant="subtle">Sandbox</UBadge>
            </div>
            <p class="text-sm text-dimmed mb-4">
              Switch between plans instantly to test feature access. No payment required.
            </p>
            
            <div class="flex flex-wrap items-end gap-3">
              <div class="w-48">
                <label class="text-xs text-dimmed block mb-1">Select Plan</label>
                <USelect 
                  v-model="testPlanName" 
                  :options="testPlanOptions"
                  placeholder="Choose plan..."
                  size="sm"
                />
              </div>
              
              <UButton 
                color="primary"
                size="sm"
                :loading="settingTestPlan"
                :disabled="!testPlanName"
                @click="setTestPlan"
              >
                Set Plan
              </UButton>
              
              <UButton 
                v-if="subscription"
                color="error"
                variant="outline"
                size="sm"
                :loading="settingTestPlan"
                @click="clearTestSubscription"
              >
                Clear (Revert to Free)
              </UButton>
            </div>
            
            <div v-if="limits?.features?.length" class="mt-4 pt-4 border-t border-warning/20">
              <p class="text-xs text-dimmed mb-2">Current Features ({{ limits.planName }}):</p>
              <div class="flex flex-wrap gap-1">
                <UBadge 
                  v-for="feature in limits.features.slice(0, 8)" 
                  :key="feature"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                >
                  {{ feature.replace(/_/g, ' ') }}
                </UBadge>
                <UBadge 
                  v-if="limits.features.length > 8"
                  color="neutral"
                  variant="outline"
                  size="xs"
                >
                  +{{ limits.features.length - 8 }} more
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </UCard>

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
              <UBadge
                v-else-if="subscription?.status === 'past_due'"
                color="error"
                variant="subtle"
              >
                Past Due
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
              v-if="subscription?.stripeSubscriptionId"
              color="neutral"
              variant="outline"
              @click="handleManageBilling"
            >
              Manage Billing
            </UButton>
            <UButton to="/pricing">
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
                of {{ limits?.maxTeamMembers ?? '∞' }} team members
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

      <!-- Billing Cycle Toggle -->
      <div class="flex items-center justify-center gap-4 mb-6">
        <span :class="['text-sm font-medium', !isAnnual ? 'text-primary' : 'text-dimmed']">
          Monthly
        </span>
        <USwitch v-model="isAnnual" />
        <span :class="['text-sm font-medium', isAnnual ? 'text-primary' : 'text-dimmed']">
          Annual
        </span>
        <UBadge v-if="isAnnual" color="success" variant="subtle">Save 33%</UBadge>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="plan in paidPlans"
          :key="plan.id"
          :ui="{
            root: isCurrentPlan(plan) ? 'ring-2 ring-primary' : ''
          }"
        >
          <div class="text-center">
            <h3 class="font-semibold mb-1">{{ plan.name }}</h3>
            <div class="text-2xl font-bold">
              ${{ getPlanPrice(plan) }}<span class="text-sm text-dimmed font-normal">/mo</span>
            </div>

            <div class="text-xs text-dimmed mt-2 space-y-1">
              <div>{{ plan.maxWaitlists ?? 'Unlimited' }} waitlists</div>
              <div>{{ formatNumber(plan.maxSignupsPerMonth) }} signups/mo</div>
            </div>

            <UButton
              v-if="!isCurrentPlan(plan)"
              size="sm"
              color="primary"
              class="mt-4"
              block
              @click="openPlanModal(plan)"
            >
              Select
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

    <!-- Plan Selection Modal -->
    <UModal v-model:open="showPlanModal">
      <template #content>
        <div v-if="selectedPlan" class="p-6 bg-[var(--ui-bg)] text-[var(--ui-text)]">
          <h3 class="font-semibold text-lg mb-4">Upgrade to {{ selectedPlan.name }}</h3>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-[var(--ui-text-muted)]">Plan</span>
              <span class="font-semibold">{{ selectedPlan.name }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[var(--ui-text-muted)]">Billing</span>
              <span class="font-semibold capitalize">{{ billingCycle }}</span>
            </div>
            <div class="flex items-center justify-between border-t border-[var(--ui-border)] pt-4">
              <span class="font-semibold">Total</span>
              <div class="text-right">
                <div class="text-2xl font-bold">
                  ${{ billingCycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice }}
                </div>
                <div class="text-xs text-[var(--ui-text-muted)]">
                  {{ billingCycle === 'annual' ? 'per year' : 'per month' }}
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--ui-border)]">
            <UButton color="neutral" variant="outline" @click="showPlanModal = false">
              Cancel
            </UButton>
            <UButton 
              color="primary" 
              :loading="changingPlan"
              @click="handleSelectPlan"
            >
              Continue to Checkout
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
