<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/stores/auth'
import { useWaitlistStore } from '~/stores/waitlist'
import { useThemeStore } from '~/stores/theme'

const route = useRoute()
const authStore = useAuthStore()
const waitlistStore = useWaitlistStore()
const themeStore = useThemeStore()

const open = ref(false)

// Initialize stores on mount
onMounted(async () => {
  if (authStore.firebaseUser && !authStore.user) {
    await authStore.fetchCurrentUser()
  }

  if (authStore.isAuthenticated) {
    await waitlistStore.fetchAllWaitlists()
    // Load theme settings for all authenticated users
    await themeStore.fetchTheme()
  }
})

// Watch for auth changes
watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth) {
    await waitlistStore.fetchAllWaitlists()
    // Load theme when user logs in
    await themeStore.fetchTheme()
  } else {
    waitlistStore.reset()
  }
})

const links = computed<NavigationMenuItem[][]>(() => {
  const mainLinks: NavigationMenuItem[] = [{
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Signups',
    icon: 'i-lucide-users',
    to: '/signups',
    badge: waitlistStore.stats?.total_signups?.toString(),
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Analytics',
    icon: 'i-lucide-bar-chart-2',
    to: '/analytics',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Widget',
    icon: 'i-lucide-code',
    to: '/widget',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Settings',
    to: '/settings',
    icon: 'i-lucide-settings',
    defaultOpen: route.path.startsWith('/settings'),
    type: 'trigger',
    children: [{
      label: 'General',
      to: '/settings',
      exact: true,
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'Signup Form',
      to: '/settings/signup-form',
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'Domains',
      to: '/settings/domains',
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'Branding',
      to: '/settings/branding',
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'Notifications',
      to: '/settings/notifications',
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'API',
      to: '/settings/api',
      onSelect: () => {
        open.value = false
      }
    }, ...(authStore.user?.is_admin ? [{
      label: 'Appearance',
      to: '/settings/appearance',
      onSelect: () => {
        open.value = false
      }
    }] : []), {
      label: 'Danger Zone',
      to: '/settings/danger',
      onSelect: () => {
        open.value = false
      }
    }]
  }]

  const footerLinks: NavigationMenuItem[] = [{
    label: 'Help & Support',
    icon: 'i-lucide-info',
    to: 'https://docs.example.com',
    target: '_blank'
  }]

  return [mainLinks, footerLinks]
})

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.value.flat()
}])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2">
          <NuxtLink to="/" class="flex-shrink-0">
            <img 
              src="/velvet-logo.svg" 
              alt="Velvet" 
              class="h-7 w-7 dark:invert"
            />
          </NuxtLink>
          <WaitlistMenu v-if="!collapsed" :collapsed="collapsed" class="flex-1 min-w-0" />
        </div>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
