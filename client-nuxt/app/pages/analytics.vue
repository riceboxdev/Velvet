<script setup lang="ts">
import { useWaitlistStore } from '~/stores/waitlist'

const store = useWaitlistStore()

onMounted(async () => {
  if (store.hasApiKey) {
    await store.fetchWaitlist()
  }
})

const stats = computed(() => store.stats || {})

const conversionRate = computed(() => {
  const total = stats.value.total_signups || 0
  const admitted = stats.value.admitted || 0
  if (total === 0) return 0
  return ((admitted / total) * 100).toFixed(1)
})

const referralRate = computed(() => {
  const total = stats.value.total_signups || 0
  const referrals = (stats.value as any).total_referrals || 0
  if (total === 0) return 0
  return ((referrals / total) * 100).toFixed(1)
})

const overviewStats = computed(() => [
  {
    label: 'Total Signups',
    value: stats.value.total_signups || 0,
    icon: 'i-lucide-users'
  },
  {
    label: 'Total Referrals',
    value: (stats.value as any).total_referrals || 0,
    icon: 'i-lucide-share-2'
  },
  {
    label: 'Referral Rate',
    value: `${referralRate.value}%`,
    icon: 'i-lucide-trending-up'
  },
  {
    label: 'Admission Rate',
    value: `${conversionRate.value}%`,
    icon: 'i-lucide-user-check'
  }
])

const statusBars = computed(() => [
  {
    label: 'Waiting',
    value: stats.value.waiting || 0,
    percent: ((stats.value.waiting || 0) / (stats.value.total_signups || 1)) * 100,
    color: 'bg-warning'
  },
  {
    label: 'Verified',
    value: stats.value.verified || 0,
    percent: ((stats.value.verified || 0) / (stats.value.total_signups || 1)) * 100,
    color: 'bg-info'
  },
  {
    label: 'Admitted',
    value: stats.value.admitted || 0,
    percent: ((stats.value.admitted || 0) / (stats.value.total_signups || 1)) * 100,
    color: 'bg-success'
  }
])

const keyMetrics = computed(() => [
  {
    label: 'Avg. Referral Rate',
    value: `${referralRate.value}%`,
    icon: 'i-lucide-trending-up',
    color: 'primary'
  },
  {
    label: 'Users Admitted',
    value: stats.value.admitted || 0,
    icon: 'i-lucide-user-check',
    color: 'success'
  },
  {
    label: 'Viral Referrals',
    value: (stats.value as any).total_referrals || 0,
    icon: 'i-lucide-share-2',
    color: 'warning'
  }
])
</script>

<template>
  <UDashboardPanel id="analytics">
    <template #header>
      <UDashboardNavbar title="Analytics">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Overview Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        <UCard
          v-for="stat in overviewStats"
          :key="stat.label"
          :ui="{ body: 'p-4' }"
        >
          <div class="flex items-center gap-3 mb-3">
            <div class="size-10 rounded-lg flex items-center justify-center bg-primary/10">
              <UIcon :name="stat.icon" class="size-5 text-primary" />
            </div>
          </div>
          <div class="text-3xl font-bold">
            {{ typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value }}
          </div>
          <div class="text-sm text-dimmed uppercase tracking-wide mt-1">
            {{ stat.label }}
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 pt-0">
        <!-- Status Distribution -->
        <UCard class="lg:col-span-2">
          <template #header>
            <h3 class="font-semibold">Signup Status Distribution</h3>
          </template>

          <div class="space-y-5">
            <div v-for="bar in statusBars" :key="bar.label">
              <div class="flex justify-between mb-2 text-sm">
                <span>{{ bar.label }}</span>
                <span>{{ bar.value }}</span>
              </div>
              <UProgress
                :value="bar.percent"
                :color="bar.color.replace('bg-', '') as any"
                size="md"
              />
            </div>
          </div>
        </UCard>

        <!-- Key Metrics -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">Key Metrics</h3>
          </template>

          <div class="space-y-3">
            <div
              v-for="metric in keyMetrics"
              :key="metric.label"
              class="flex items-center gap-4 p-4 rounded-lg bg-elevated"
            >
              <div
                :class="[
                  'size-12 rounded-xl flex items-center justify-center',
                  `bg-${metric.color}/10 text-${metric.color}`
                ]"
              >
                <UIcon :name="metric.icon" class="size-5" />
              </div>
              <div class="flex-1">
                <div class="text-xl font-semibold">
                  {{ typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value }}
                </div>
                <div class="text-sm text-dimmed">{{ metric.label }}</div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
