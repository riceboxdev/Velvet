<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useWaitlistStore } from '~/stores/waitlist'

defineProps<{
  collapsed?: boolean
}>()

const router = useRouter()
const waitlistStore = useWaitlistStore()
const showCreateModal = ref(false)

const items = computed<DropdownMenuItem[][]>(() => {
  const waitlistItems = waitlistStore.allWaitlists.map(wl => ({
    label: wl.name,
    avatar: {
      text: wl.name.charAt(0).toUpperCase(),
      alt: wl.name
    },
    active: waitlistStore.currentWaitlist?.id === wl.id,
    slot: 'waitlist-item' as const,
    signups: wl.stats?.total_signups || 0,
    onSelect() {
      waitlistStore.switchWaitlist(wl.id)
      router.push('/')
    }
  }))

  return [waitlistItems, [{
    label: 'Create waitlist',
    icon: 'i-lucide-circle-plus',
    onSelect() {
      showCreateModal.value = true
    }
  }]]
})

const currentWaitlistAvatar = computed(() => ({
  text: waitlistStore.currentWaitlist?.name?.charAt(0).toUpperCase() || 'W',
  alt: waitlistStore.currentWaitlist?.name || 'Waitlist'
}))

// Create Waitlist Modal
const newWaitlistName = ref('')
const newWaitlistDesc = ref('')
const creating = ref(false)

async function createNewWaitlist() {
  if (!newWaitlistName.value) return

  creating.value = true
  try {
    await waitlistStore.createWaitlist(newWaitlistName.value, newWaitlistDesc.value)
    showCreateModal.value = false
    newWaitlistName.value = ''
    newWaitlistDesc.value = ''
  } catch (e: any) {
    console.error('Failed to create:', e.message)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :avatar="currentWaitlistAvatar"
      :label="collapsed ? undefined : (waitlistStore.currentWaitlist?.name || 'No Waitlist')"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />

    <template #waitlist-item-trailing="{ item }">
      <UBadge v-if="(item as any).signups" color="neutral" variant="subtle" size="sm">
        {{ (item as any).signups }}
      </UBadge>
      <UIcon v-if="(item as any).active" name="i-lucide-check" class="size-4 text-primary" />
    </template>
  </UDropdownMenu>

  <!-- Create Waitlist Modal -->
  <UModal v-model:open="showCreateModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Create New Waitlist</h3>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="showCreateModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Name" required>
            <UInput
              v-model="newWaitlistName"
              placeholder="My Awesome Product"
              @keyup.enter="createNewWaitlist"
            />
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="newWaitlistDesc"
              :rows="3"
              placeholder="Brief description of your waitlist..."
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex gap-3 justify-end">
            <UButton
              color="neutral"
              variant="outline"
              @click="showCreateModal = false"
            >
              Cancel
            </UButton>
            <UButton
              :loading="creating"
              :disabled="!newWaitlistName"
              @click="createNewWaitlist"
            >
              Create
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
