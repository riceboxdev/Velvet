<script setup lang="ts">
import { useWaitlistStore } from '~/stores/waitlist'

const store = useWaitlistStore()
const currentPage = ref(0)
const pageSize = 25
const selectedStatus = ref('')
const sortBy = ref('position')
const sortOrder = ref<'ASC' | 'DESC'>('ASC')
const searchQuery = ref('')

const pagination = ref({ total: 0, hasMore: false })

onMounted(async () => {
  await loadSignups()
})

async function loadSignups() {
  const data = await store.fetchSignups({
    limit: pageSize,
    offset: currentPage.value * pageSize,
    status: selectedStatus.value || undefined,
    sortBy: sortBy.value,
    order: sortOrder.value
  })

  if (data?.pagination) {
    pagination.value = data.pagination
  }
}

const filteredSignups = computed(() => {
  if (!searchQuery.value) return store.signups

  const query = searchQuery.value.toLowerCase()
  return store.signups.filter(s =>
    s.email.toLowerCase().includes(query) ||
    (s as any).referral_code?.toLowerCase().includes(query)
  )
})

async function changePage(delta: number) {
  currentPage.value += delta
  await loadSignups()
}

async function changeSort(field: string) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortBy.value = field
    sortOrder.value = 'ASC'
  }
  currentPage.value = 0
  await loadSignups()
}

async function handleOffboard(signup: any) {
  // eslint-disable-next-line no-alert
  if (confirm(`Admit ${signup.email} from the waitlist?`)) {
    try {
      await store.offboardSignup(signup.id)
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert('Failed to offboard: ' + e.message)
    }
  }
}

async function handleDelete(signup: any) {
  // eslint-disable-next-line no-alert
  if (confirm(`Remove ${signup.email} from the waitlist? This cannot be undone.`)) {
    try {
      await store.deleteSignup(signup.id)
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert('Failed to delete: ' + e.message)
    }
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function copyReferralLink(code: string) {
  const waitlistId = store.currentWaitlist?.id || 'preview'
  const link = `${window.location.origin}/join/${waitlistId}?ref=${code}`
  navigator.clipboard.writeText(link)
}

const statusColors: Record<string, 'warning' | 'info' | 'success' | 'neutral'> = {
  waiting: 'warning',
  verified: 'info',
  admitted: 'success',
  offboarded: 'neutral'
}

const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Waiting', value: 'waiting' },
  { label: 'Verified', value: 'verified' },
  { label: 'Admitted', value: 'admitted' }
]
</script>

<template>
  <UDashboardPanel id="signups">
    <template #header>
      <UDashboardNavbar title="Signups" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <USelectMenu
            v-model="selectedStatus"
            :items="statusOptions"
            value-key="value"
            class="w-36"
            @update:model-value="loadSignups"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search by email or referral code..."
            class="w-80"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UCard :ui="{ body: 'p-0' }">
        <div v-if="store.loading" class="p-16 text-center text-dimmed">
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin mx-auto mb-3" />
          Loading signups...
        </div>

        <div v-else-if="filteredSignups.length === 0" class="p-16 text-center text-dimmed">
          <UIcon name="i-lucide-inbox" class="size-12 mx-auto mb-4 opacity-50" />
          <p>No signups found</p>
        </div>

        <template v-else>
          <UTable
            :data="filteredSignups"
            :columns="[
              { key: 'position', label: 'Position', sortable: true },
              { key: 'email', label: 'Email' },
              { key: 'referral_code', label: 'Referral Code' },
              { key: 'referral_count', label: 'Referrals', sortable: true },
              { key: 'priority', label: 'Priority' },
              { key: 'status', label: 'Status' },
              { key: 'created_at', label: 'Joined', sortable: true },
              { key: 'actions', label: 'Actions' }
            ]"
            :ui="{ td: 'py-3' }"
          >
            <template #position-header>
              <button
                class="flex items-center gap-1 hover:text-foreground"
                @click="changeSort('position')"
              >
                Position
                <UIcon
                  v-if="sortBy === 'position'"
                  :name="sortOrder === 'ASC' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="size-3.5"
                />
              </button>
            </template>
            <template #position-cell="{ row }">
              <UBadge color="neutral" variant="subtle">#{{ row.original.position }}</UBadge>
            </template>

            <template #referral_code-cell="{ row }">
              <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                @click="copyReferralLink(row.original.referral_code)"
              >
                {{ row.original.referral_code }}
                <UIcon name="i-lucide-copy" class="size-3" />
              </UButton>
            </template>

            <template #referral_count-header>
              <button
                class="flex items-center gap-1 hover:text-foreground"
                @click="changeSort('referral_count')"
              >
                Referrals
                <UIcon
                  v-if="sortBy === 'referral_count'"
                  :name="sortOrder === 'ASC' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="size-3.5"
                />
              </button>
            </template>
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

            <template #created_at-header>
              <button
                class="flex items-center gap-1 hover:text-foreground"
                @click="changeSort('created_at')"
              >
                Joined
                <UIcon
                  v-if="sortBy === 'created_at'"
                  :name="sortOrder === 'ASC' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="size-3.5"
                />
              </button>
            </template>
            <template #created_at-cell="{ row }">
              <span class="text-dimmed text-sm">
                {{ formatDate(row.original.created_at) }}
              </span>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex gap-1">
                <UTooltip v-if="row.original.status !== 'admitted'" text="Admit user">
                  <UButton
                    icon="i-lucide-user-check"
                    color="success"
                    variant="ghost"
                    size="xs"
                    @click="handleOffboard(row.original)"
                  />
                </UTooltip>
                <UTooltip text="Delete">
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="xs"
                    @click="handleDelete(row.original)"
                  />
                </UTooltip>
              </div>
            </template>
          </UTable>

          <!-- Pagination -->
          <div class="flex items-center justify-between px-4 py-4 border-t border-default">
            <span class="text-sm text-dimmed">
              Showing {{ currentPage * pageSize + 1 }}-{{ Math.min((currentPage + 1) * pageSize, pagination.total) }}
              of {{ pagination.total }}
            </span>
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-chevron-left"
                :disabled="currentPage === 0"
                @click="changePage(-1)"
              >
                Previous
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                trailing-icon="i-lucide-chevron-right"
                :disabled="!pagination.hasMore"
                @click="changePage(1)"
              >
                Next
              </UButton>
            </div>
          </div>
        </template>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
