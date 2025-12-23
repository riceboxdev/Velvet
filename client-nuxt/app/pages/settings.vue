<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

const links = computed<NavigationMenuItem[][]>(() => {
  const mainLinks: NavigationMenuItem[] = [{
    label: 'General',
    icon: 'i-lucide-settings-2',
    to: '/settings',
    exact: true
  }, {
    label: 'Branding',
    icon: 'i-lucide-palette',
    to: '/settings/branding'
  }, {
    label: 'Notifications',
    icon: 'i-lucide-bell',
    to: '/settings/notifications'
  }, {
    label: 'API',
    icon: 'i-lucide-code',
    to: '/settings/api'
  }]

  // Add Appearance link for admins
  if (authStore.user?.is_admin) {
    mainLinks.push({
      label: 'Appearance',
      icon: 'i-lucide-sun-moon',
      to: '/settings/appearance'
    })
  }

  return [mainLinks, [{
    label: 'Documentation',
    icon: 'i-lucide-book-open',
    to: 'https://docs.example.com',
    target: '_blank'
  }]]
})
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'lg:py-8' }">
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <!-- NOTE: The `-mx-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full lg:max-w-4xl mx-auto">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
