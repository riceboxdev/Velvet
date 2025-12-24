<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useWaitlistStore } from '~/stores/waitlist'

// Resolve components for h() render functions
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

interface Signup {
  id: string
  email: string
  referral_code?: string
  referral_count: number
  priority: number
  status: 'waiting' | 'verified' | 'admitted' | 'offboarded'
  position: number
  created_at: any
}

const store = useWaitlistStore()
const toast = useToast()
const currentPage = ref(0)
const pageSize = 25
const selectedStatus = ref('')
const searchQuery = ref('')

const pagination = ref({ total: 0, hasMore: false })

// Ensure waitlists are loaded
onMounted(async () => {
  if (!store.currentWaitlist) {
    await store.fetchAllWaitlists()
  }
  await loadSignups()
})

async function loadSignups() {
  const data = await store.fetchSignups({
    limit: pageSize,
    offset: currentPage.value * pageSize,
    status: selectedStatus.value || undefined,
    sortBy: 'position',
    order: 'ASC'
  })

  if (data?.data) {
    pagination.value = {
      total: data.data.total || 0,
      hasMore: (currentPage.value + 1) * pageSize < (data.data.total || 0)
    }
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

function formatDate(dateInput: any) {
  if (!dateInput) return '-'
  
  let date: Date
  if (dateInput._seconds !== undefined) {
    date = new Date(dateInput._seconds * 1000)
  } else if (dateInput.seconds !== undefined) {
    date = new Date(dateInput.seconds * 1000)
  } else if (typeof dateInput === 'string') {
    date = new Date(dateInput)
  } else if (dateInput instanceof Date) {
    date = dateInput
  } else {
    return '-'
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function copyReferralLink(code: string) {
  const waitlistId = store.currentWaitlist?.id || 'preview'
  const link = `${window.location.origin}/join/${waitlistId}?ref=${code}`
  navigator.clipboard.writeText(link)
  toast.add({
    title: 'Copied!',
    description: 'Referral link copied to clipboard'
  })
}

async function handleOffboard(signup: Signup) {
  if (confirm(`Admit ${signup.email} from the waitlist?`)) {
    try {
      await store.offboardSignup(signup.id)
      toast.add({ title: 'User admitted', color: 'success' })
    } catch (e: any) {
      toast.add({ title: 'Failed to admit', description: e.message, color: 'error' })
    }
  }
}

async function handleDelete(signup: Signup) {
  if (confirm(`Remove ${signup.email} from the waitlist? This cannot be undone.`)) {
    try {
      await store.deleteSignup(signup.id)
      toast.add({ title: 'User removed', color: 'success' })
    } catch (e: any) {
      toast.add({ title: 'Failed to delete', description: e.message, color: 'error' })
    }
  }
}

function getRowActions(signup: Signup) {
  const items = []
  
  if (signup.status !== 'admitted') {
    items.push({
      label: 'Admit user',
      icon: 'i-lucide-user-check',
      onSelect: () => handleOffboard(signup)
    })
  }
  
  items.push({
    label: 'Copy referral link',
    icon: 'i-lucide-copy',
    onSelect: () => copyReferralLink(signup.referral_code || '')
  })
  
  items.push({ type: 'separator' as const })
  
  items.push({
    label: 'Delete',
    icon: 'i-lucide-trash',
    color: 'error' as const,
    onSelect: () => handleDelete(signup)
  })
  
  return items
}

const columns: TableColumn<Signup>[] = [
  {
    accessorKey: 'position',
    header: 'Position',
    cell: ({ row }) => h(UBadge, { color: 'neutral', variant: 'subtle' }, () => `#${row.original.position}`)
  },
  {
    accessorKey: 'email',
    header: 'Email'
  },
  {
    accessorKey: 'referral_code',
    header: 'Referral Code',
    cell: ({ row }) => row.original.referral_code || '-'
  },
  {
    accessorKey: 'referral_count',
    header: 'Referrals',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-1.5' }, [
      h('span', { class: 'i-lucide-share-2 size-3.5 text-muted' }),
      String(row.original.referral_count || 0)
    ])
  },
  {
    accessorKey: 'priority',
    header: 'Priority'
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const colors: Record<string, 'warning' | 'info' | 'success' | 'neutral'> = {
        waiting: 'warning',
        verified: 'info',
        admitted: 'success',
        offboarded: 'neutral'
      }
      return h(UBadge, { 
        color: colors[row.original.status] || 'neutral', 
        variant: 'subtle',
        class: 'capitalize'
      }, () => row.original.status)
    }
  },
  {
    accessorKey: 'created_at',
    header: 'Joined',
    cell: ({ row }) => h('span', { class: 'text-muted text-sm' }, formatDate(row.original.created_at))
  },
  {
    id: 'actions',
    cell: ({ row }) => h('div', { class: 'text-right' }, 
      h(UDropdownMenu, {
        content: { align: 'end' },
        items: getRowActions(row.original)
      }, () => h(UButton, {
        icon: 'i-lucide-ellipsis-vertical',
        color: 'neutral',
        variant: 'ghost'
      }))
    )
  }
]

async function changePage(delta: number) {
  currentPage.value += delta
  await loadSignups()
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
          <USelect
            v-model="selectedStatus"
            :items="statusOptions"
            class="w-36"
            @update:model-value="loadSignups"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-4">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Filter by email..."
        />
      </div>

      <UTable
        :data="filteredSignups"
        :columns="columns"
        :loading="store.loading"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default py-3'
        }"
      />

      <!-- Pagination -->
      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-4">
        <div class="text-sm text-muted">
          Showing {{ currentPage * pageSize + 1 }}-{{ Math.min((currentPage + 1) * pageSize, pagination.total) }}
          of {{ pagination.total }}
        </div>
        <div class="flex items-center gap-1.5">
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
  </UDashboardPanel>
</template>
