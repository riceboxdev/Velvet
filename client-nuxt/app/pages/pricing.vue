<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

interface Plan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  annualMonthlyPrice: number
  maxWaitlists: number | null
  maxSignupsPerMonth: number | null
  maxTeamMembers: number | null
  features: string[]
  isPopular: boolean
  isEnterprise: boolean
  isFree: boolean
}

const router = useRouter()
const config = useRuntimeConfig()

const plans = ref<Plan[]>([])
const loading = ref(true)
const isAnnual = ref(false)

const API_URL = config.public.apiUrl || 'http://localhost:3001'

onMounted(async () => {
  try {
    const response = await fetch(`${API_URL}/api/subscription/plans`)
    if (response.ok) {
      plans.value = await response.json()
    }
  } catch (error) {
    console.error('Error fetching plans:', error)
  } finally {
    loading.value = false
  }
})

// Separate paid plans from free tier
const paidPlans = computed(() => plans.value.filter(p => !p.isFree && !p.isEnterprise))
const freePlan = computed(() => plans.value.find(p => p.isFree))
const enterprisePlan = computed(() => plans.value.find(p => p.isEnterprise))

// Feature labels
const FEATURE_LABELS: Record<string, string> = {
  custom_branding: 'Custom branding',
  api_access: 'API access',
  webhooks: 'Webhooks',
  csv_export: 'CSV export',
  email_support: 'Email support',
  remove_branding: 'Remove "Powered by" branding',
  zapier_integration: 'Zapier integration',
  priority_queue: 'Priority queue management',
  custom_email_templates: 'Custom email templates',
  advanced_analytics: 'Advanced analytics',
  custom_domain_emails: 'Custom domain emails',
  priority_support: 'Priority support',
  sso: 'Single Sign-On (SSO)',
  custom_sla: 'Custom SLA',
  dedicated_support: 'Dedicated support manager',
  custom_features: 'Custom feature development',
  analytics_basic: 'Basic Analytics',
  analytics_deep: 'Deep Analytics',
  hide_position_count: 'Hide position & signup count',
  block_personal_emails: 'Block personal emails',
  allowed_domains: 'Allowed domains whitelist',
  custom_offboarding_email: 'Custom offboarding emails',
  email_blasts: 'Email blasts',
  multi_user_team: 'Team management'
}

const KEY_FEATURES = [
  'custom_branding',
  'api_access',
  'webhooks',
  'analytics_basic',
  'remove_branding',
  'zapier_integration',
  'hide_position_count',
  'block_personal_emails',
  'allowed_domains',
  'custom_email_templates',
  'custom_offboarding_email',
  'custom_domain_emails',
  'email_blasts',
  'multi_user_team',
  'sso'
]

function getDisplayFeatures(plan: Plan) {
  return KEY_FEATURES.map(key => ({
    key,
    label: FEATURE_LABELS[key] || key,
    included: plan.features?.includes(key) || false
  }))
}

function getSavings(plan: Plan) {
  const monthlyTotal = plan.monthlyPrice * 12
  return Math.round(monthlyTotal - plan.annualPrice)
}

function formatNumber(num: number | null) {
  if (!num) return 'Unlimited'
  if (num >= 1000) return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'k'
  return num.toString()
}

function handleSelect(plan: Plan) {
  if (plan.isEnterprise) {
    window.location.href = 'mailto:sales@velvet.dev'
  } else {
    router.push({ path: '/auth', query: { plan: plan.id, billing: isAnnual.value ? 'annual' : 'monthly' } })
  }
}

// Comparison table
const comparisonRows = computed(() => [
  {
    label: 'Waitlists',
    getValue: (plan: Plan) => plan.maxWaitlists ?? 'Unlimited'
  },
  {
    label: 'Signups/month',
    getValue: (plan: Plan) => plan.maxSignupsPerMonth ? formatNumber(plan.maxSignupsPerMonth) : 'Unlimited'
  },
  {
    label: 'Team members',
    getValue: (plan: Plan) => plan.maxTeamMembers ?? 'Unlimited'
  },
  {
    label: 'Custom branding',
    getValue: (plan: Plan) => plan.features?.includes('custom_branding')
  },
  {
    label: 'API access',
    getValue: (plan: Plan) => plan.features?.includes('api_access')
  },
  {
    label: 'Webhooks',
    getValue: (plan: Plan) => plan.features?.includes('webhooks')
  },
  {
    label: 'Remove branding',
    getValue: (plan: Plan) => plan.features?.includes('remove_branding')
  },
  {
    label: 'Custom emails',
    getValue: (plan: Plan) => plan.features?.includes('custom_email_templates')
  },
  {
    label: 'Advanced analytics',
    getValue: (plan: Plan) => plan.features?.includes('advanced_analytics')
  },
  {
    label: 'Priority support',
    getValue: (plan: Plan) => plan.features?.includes('priority_support')
  },
  {
    label: 'SSO',
    getValue: (plan: Plan) => plan.features?.includes('sso')
  }
])

const faqs = [
  {
    question: 'Can I change plans later?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.'
  },
  {
    question: 'What happens if I exceed my limits?',
    answer: 'We\'ll notify you when you\'re approaching your limits. You can upgrade your plan at any time.'
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes, all plans come with a 14-day free trial. No credit card required to get started.'
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. Cancel anytime and your subscription will remain active until the end of your billing period.'
  }
]
</script>

<template>
  <div class="w-full max-w-6xl mx-4 py-12">
    <!-- Hero -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
      <p class="text-dimmed text-lg mb-8">Start building your waitlist today. Scale as you grow.</p>

      <!-- Billing Toggle -->
      <div class="flex items-center justify-center gap-4">
        <span :class="['text-sm font-medium', !isAnnual ? 'text-[var(--color-primary)]' : 'text-dimmed']">
          Monthly
        </span>
        <USwitch v-model="isAnnual" />
        <span :class="['text-sm font-medium', isAnnual ? 'text-[var(--color-primary)]' : 'text-dimmed']">
          Annual
        </span>
        <UBadge v-if="isAnnual" color="success" variant="subtle">Save 33%</UBadge>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
    </div>

    <!-- Pricing Cards (Paid Plans) -->
    <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
      <UCard
        v-for="plan in paidPlans"
        :key="plan.id"
        :ui="{
          root: plan.isPopular ? 'ring-2 ring-primary relative' : '',
          body: 'p-6'
        }"
      >
        <!-- Popular Badge -->
        <UBadge
          v-if="plan.isPopular"
          color="primary"
          class="absolute -top-3 left-1/2 -translate-x-1/2"
        >
          Most Popular
        </UBadge>

        <!-- Header -->
        <div class="mb-6">
          <h3 class="text-xl font-bold mb-1">{{ plan.name }}</h3>
          <p class="text-dimmed text-sm">{{ plan.description }}</p>
        </div>

        <!-- Price -->
        <div class="mb-6">
          <template v-if="!plan.isEnterprise">
            <div class="flex items-baseline gap-1">
              <span class="text-4xl font-bold">
                ${{ isAnnual ? plan.annualMonthlyPrice : plan.monthlyPrice }}
              </span>
              <span class="text-dimmed">/mo</span>
            </div>
            <UBadge
              v-if="isAnnual && getSavings(plan) > 0"
              color="success"
              variant="subtle"
              class="mt-2"
            >
              Save ${{ getSavings(plan) }}/year
            </UBadge>
            <p class="text-xs text-dimmed mt-2">
              {{ isAnnual ? `Billed annually ($${plan.annualPrice})` : 'Billed monthly' }}
            </p>
          </template>
          <template v-else>
            <span class="text-3xl font-bold">Custom</span>
          </template>
        </div>

        <!-- Limits -->
        <div class="mb-6 space-y-2 border-t border-default pt-4">
          <div class="flex justify-between text-sm">
            <span class="text-dimmed">Waitlists</span>
            <span class="font-medium">{{ plan.maxWaitlists ?? 'Unlimited' }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-dimmed">Signups/mo</span>
            <span class="font-medium">{{ formatNumber(plan.maxSignupsPerMonth) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-dimmed">Team</span>
            <span class="font-medium">{{ plan.maxTeamMembers ?? 'Unlimited' }}</span>
          </div>
        </div>

        <!-- Features -->
        <div class="mb-6 space-y-2 flex-1">
          <div
            v-for="feature in getDisplayFeatures(plan)"
            :key="feature.key"
            class="flex items-center gap-2 text-sm"
          >
            <UIcon
              :name="feature.included ? 'i-lucide-check' : 'i-lucide-x'"
              :class="feature.included ? 'text-success' : 'text-dimmed opacity-40'"
              class="size-4 shrink-0"
            />
            <span :class="feature.included ? '' : 'text-dimmed opacity-40'">
              {{ feature.label }}
            </span>
          </div>
        </div>

        <!-- CTA -->
        <UButton
          block
          :color="plan.isPopular ? 'primary' : 'neutral'"
          :variant="plan.isEnterprise ? 'outline' : 'solid'"
          size="lg"
          @click="handleSelect(plan)"
        >
          {{ plan.isEnterprise ? 'Contact Sales' : 'Get Started' }}
        </UButton>
      </UCard>
    </div>

    <!-- Free Tier -->
    <div v-if="freePlan && !loading" class="mb-8">
      <UCard :ui="{ body: 'p-6' }">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-xl font-bold">{{ freePlan.name }}</h3>
              <UBadge color="neutral" variant="subtle">Forever Free</UBadge>
            </div>
            <p class="text-dimmed mb-4">{{ freePlan.description }}</p>
            <div class="flex flex-wrap gap-4 text-sm">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="text-success" />
                <span>{{ freePlan.maxWaitlists }} waitlist</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="text-success" />
                <span>{{ formatNumber(freePlan.maxSignupsPerMonth) }} signups/month</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="text-success" />
                <span>Custom branding</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="text-success" />
                <span>CSV export</span>
              </div>
            </div>
          </div>
          <div class="text-center md:text-right">
            <div class="text-3xl font-bold mb-2">$0</div>
            <UButton color="neutral" variant="outline" size="lg" @click="handleSelect(freePlan)">
              Start Free
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Enterprise -->
    <div v-if="enterprisePlan && !loading" class="mb-16">
      <UCard :ui="{ body: 'p-6' }" class="bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex-1 text-white">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-xl font-bold">{{ enterprisePlan.name }}</h3>
              <UBadge color="primary" variant="solid">Custom</UBadge>
            </div>
            <p class="text-zinc-300 mb-4">{{ enterprisePlan.description }}</p>
            <div class="flex flex-wrap gap-4 text-sm text-zinc-300">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="text-primary" />
                <span>Unlimited everything</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="text-primary" />
                <span>SSO / SAML</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="text-primary" />
                <span>Dedicated support</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-check" class="text-primary" />
                <span>Custom SLA</span>
              </div>
            </div>
          </div>
          <div class="text-center md:text-right">
            <div class="text-2xl font-bold text-white mb-2">Custom Pricing</div>
            <UButton color="primary" size="lg" @click="handleSelect(enterprisePlan)">
              Contact Sales
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Comparison Table -->
    <UCard v-if="plans.length" class="mb-16" :ui="{ body: 'p-0' }">
      <template #header>
        <h2 class="text-xl font-bold">Compare plans</h2>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-default">
              <th class="px-6 py-4 text-left text-sm font-semibold">Feature</th>
              <th
                v-for="plan in plans"
                :key="plan.id"
                class="px-6 py-4 text-center text-sm font-semibold"
              >
                {{ plan.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in comparisonRows"
              :key="row.label"
              class="border-b border-default last:border-0 hover:bg-elevated/50"
            >
              <td class="px-6 py-4 text-sm">{{ row.label }}</td>
              <td
                v-for="plan in plans"
                :key="plan.id"
                class="px-6 py-4 text-center text-sm"
              >
                <template v-if="typeof row.getValue(plan) === 'boolean'">
                  <UIcon
                    :name="row.getValue(plan) ? 'i-lucide-check' : 'i-lucide-x'"
                    :class="row.getValue(plan) ? 'text-success' : 'text-dimmed opacity-30'"
                    class="size-5"
                  />
                </template>
                <template v-else>
                  {{ row.getValue(plan) }}
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- FAQ -->
    <div class="mb-16">
      <h2 class="text-xl font-bold text-center mb-8">Frequently asked questions</h2>
      <div class="grid gap-4 max-w-3xl mx-auto">
        <UCard v-for="(faq, i) in faqs" :key="i">
          <h3 class="font-semibold mb-2">{{ faq.question }}</h3>
          <p class="text-dimmed text-sm">{{ faq.answer }}</p>
        </UCard>
      </div>
    </div>

    <!-- CTA -->
    <UCard class="text-center" :ui="{ body: 'py-10' }">
      <h2 class="text-2xl font-bold mb-3">Ready to get started?</h2>
      <p class="text-dimmed mb-6">Join thousands using Velvet to manage their waitlists.</p>
      <UButton size="lg" to="/auth">Start your free trial</UButton>
    </UCard>
  </div>
</template>
