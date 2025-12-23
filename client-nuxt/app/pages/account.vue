<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const links = computed<NavigationMenuItem[][]>(() => [[{
  label: 'Account',
  icon: 'i-lucide-user',
  to: '/account',
  exact: true
}, {
  label: 'Profile',
  icon: 'i-lucide-user-circle',
  to: '/account/profile'
}, {
  label: 'Security',
  icon: 'i-lucide-shield',
  to: '/account/security'
}, {
  label: 'Billing',
  icon: 'i-lucide-credit-card',
  to: '/account/billing'
}]])
</script>

<template>
  <UDashboardPanel id="account" :ui="{ body: 'lg:py-8' }">
    <template #header>
      <UDashboardNavbar title="Account Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
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
