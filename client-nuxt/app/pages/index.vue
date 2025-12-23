<script setup lang="ts">
import { useWaitlistStore } from '~/stores/waitlist'

const waitlistStore = useWaitlistStore()
const recentSignups = ref<any[]>([])

const { isNotificationsSlideoverOpen } = useDashboard()

onMounted(async () => {
  if (waitlistStore.hasApiKey) {
    await waitlistStore.fetchWaitlist()
    const data = await waitlistStore.fetchSignups({ limit: 5, sortBy: 'created_at', order: 'DESC' })
    recentSignups.value = data?.data || []

    if (waitlistStore.currentWaitlist?.id) {
      await waitlistStore.fetchLeaderboard(waitlistStore.currentWaitlist.id, 5)
    }
  }
})

const stats = computed(() => [
  {
    label: 'Total Signups',
    value: waitlistStore.stats?.total_signups || 0,
    icon: 'i-lucide-users',
    color: 'primary' as const
  },
  {
    label: 'Waiting',
    value: waitlistStore.stats?.waiting || 0,
    icon: 'i-lucide-clock',
    color: 'warning' as const
  },
  {
    label: 'Verified',
    value: waitlistStore.stats?.verified || 0,
    icon: 'i-lucide-check-circle',
    color: 'info' as const
  },
  {
    label: 'Admitted',
    value: waitlistStore.stats?.admitted || 0,
    icon: 'i-lucide-user-check',
    color: 'success' as const
  }
])

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'neutral'> = {
  waiting: 'warning',
  verified: 'info',
  admitted: 'success',
  offboarded: 'neutral'
}
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Dashboard" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip color="error" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <UButton
            icon="i-lucide-external-link"
            to="/widget"
            color="neutral"
            variant="outline"
          >
            View Widget
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        <UCard
          v-for="stat in stats"
          :key="stat.label"
          :ui="{ body: 'p-4' }"
        >
          <div class="flex items-center gap-3 mb-3">
            <div
              :class="[
                'size-10 rounded-lg flex items-center justify-center',
                `bg-${stat.color}/10`
              ]"
            >
              <UIcon :name="stat.icon" :class="`size-5 text-${stat.color}`" />
            </div>
          </div>
          <div class="text-3xl font-bold">
            {{ stat.value.toLocaleString() }}
          </div>
          <div class="text-sm text-dimmed uppercase tracking-wide mt-1">
            {{ stat.label }}
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 pt-0">
        <!-- Recent Signups -->
        <UCard class="lg:col-span-2" :ui="{ body: 'p-0' }">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Recent Signups</h3>
              <UButton
                variant="ghost"
                color="neutral"
                to="/signups"
                trailing-icon="i-lucide-arrow-right"
                size="sm"
              >
                View All
              </UButton>
            </div>
          </template>

          <div v-if="waitlistStore.loading" class="p-8 text-center text-dimmed">
            <UIcon name="i-lucide-loader-2" class="size-6 animate-spin mx-auto mb-2" />
            Loading...
          </div>

          <div v-else-if="recentSignups.length === 0" class="p-8 text-center text-dimmed">
            <UIcon name="i-lucide-users" class="size-8 mx-auto mb-2 opacity-50" />
            <p>No signups yet. Share your widget to get started!</p>
          </div>

          <UTable
            v-else
            :data="recentSignups"
            :columns="[
              { key: 'email', label: 'Email' },
              { key: 'referral_count', label: 'Referrals' },
              { key: 'status', label: 'Status' },
              { key: 'created_at', label: 'Joined' }
            ]"
            :ui="{ td: 'py-3' }"
          >
            <template #referral_count-cell="{ row }">
              <div class="flex items-center gap-1.5">
                <UIcon name="i-lucide-share-2" class="size-3.5 text-dimmed" />
                {{ row.original.referral_count }}
              </div>
            </template>
            <template #status-cell="{ row }">
              <UBadge
                :color="statusColors[row.original.status] || 'neutral'"
                variant="subtle"
              >
                {{ row.original.status }}
              </UBadge>
            </template>
            <template #created_at-cell="{ row }">
              <span class="text-dimmed text-sm">
                {{ formatDate(row.original.created_at) }}
              </span>
            </template>
          </UTable>
        </UCard>

        <!-- Leaderboard -->
        <UCard>
          <template #header>
            <h3 class="font-semibold">Top Referrers</h3>
          </template>

          <div v-if="waitlistStore.leaderboard.length === 0" class="text-center text-dimmed py-8">
            <UIcon name="i-lucide-trophy" class="size-8 mx-auto mb-2 opacity-50" />
            <p>No referrers yet</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(item, index) in waitlistStore.leaderboard"
              :key="item.id"
              class="flex items-center gap-3 p-3 rounded-lg bg-elevated"
            >
              <div
                :class="[
                  'size-8 rounded-full flex items-center justify-center font-bold text-sm',
                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black' :
                  index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-black' :
                  index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                  'bg-muted text-muted-foreground'
                ]"
              >
                {{ index + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate text-sm">{{ item.email }}</div>
                <div class="text-xs text-dimmed">{{ item.referral_count }} referrals</div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
