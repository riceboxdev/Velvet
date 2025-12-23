<script setup lang="ts">
const changingPassword = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const sessions = ref([
  {
    id: '1',
    device: 'Chrome on MacOS',
    location: 'San Francisco, CA',
    lastActive: 'Active now',
    current: true
  },
  {
    id: '2',
    device: 'Safari on iPhone',
    location: 'San Francisco, CA',
    lastActive: '2 hours ago',
    current: false
  }
])

async function changePassword() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    alert('Passwords do not match')
    return
  }

  if (passwordForm.value.newPassword.length < 8) {
    alert('Password must be at least 8 characters')
    return
  }

  changingPassword.value = true
  try {
    // TODO: Implement password change API
    await new Promise(resolve => setTimeout(resolve, 1000))
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e: any) {
    console.error('Failed to change password:', e)
  } finally {
    changingPassword.value = false
  }
}

function revokeSession(sessionId: string) {
  if (!confirm('Are you sure you want to revoke this session?')) return
  sessions.value = sessions.value.filter(s => s.id !== sessionId)
}

function revokeAllSessions() {
  if (!confirm('Are you sure you want to sign out of all other sessions?')) return
  sessions.value = sessions.value.filter(s => s.current)
}
</script>

<template>
  <div>
    <!-- Change Password -->
    <UPageCard
      title="Change Password"
      description="Update your password to keep your account secure."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    />

    <UPageCard variant="subtle" class="mb-8">
      <form class="max-w-md space-y-5" @submit.prevent="changePassword">
        <UFormField label="Current Password" required>
          <UInput
            v-model="passwordForm.currentPassword"
            :type="showCurrentPassword ? 'text' : 'password'"
            placeholder="••••••••"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                :icon="showCurrentPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                @click="showCurrentPassword = !showCurrentPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField label="New Password" required hint="At least 8 characters">
          <UInput
            v-model="passwordForm.newPassword"
            :type="showNewPassword ? 'text' : 'password'"
            placeholder="••••••••"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                :icon="showNewPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                @click="showNewPassword = !showNewPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField label="Confirm New Password" required>
          <UInput
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="••••••••"
          />
        </UFormField>

        <UButton
          type="submit"
          :loading="changingPassword"
          icon="i-lucide-lock"
        >
          Update Password
        </UButton>
      </form>
    </UPageCard>

    <!-- Active Sessions -->
    <UPageCard
      title="Active Sessions"
      description="Manage your active sessions across devices."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-log-out"
        class="w-fit lg:ms-auto"
        @click="revokeAllSessions"
      >
        Sign out all
      </UButton>
    </UPageCard>

    <UPageCard variant="subtle">
      <div class="space-y-4">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="flex items-center justify-between gap-4 p-4 rounded-lg bg-elevated"
        >
          <div class="flex items-center gap-4">
            <div class="size-10 rounded-lg bg-muted flex items-center justify-center">
              <UIcon
                :name="session.device.includes('iPhone') ? 'i-lucide-smartphone' : 'i-lucide-monitor'"
                class="size-5 text-dimmed"
              />
            </div>
            <div>
              <div class="font-medium flex items-center gap-2">
                {{ session.device }}
                <UBadge v-if="session.current" color="success" variant="subtle" size="xs">
                  Current
                </UBadge>
              </div>
              <div class="text-sm text-dimmed">
                {{ session.location }} · {{ session.lastActive }}
              </div>
            </div>
          </div>

          <UButton
            v-if="!session.current"
            color="error"
            variant="ghost"
            icon="i-lucide-x"
            size="sm"
            @click="revokeSession(session.id)"
          />
        </div>
      </div>
    </UPageCard>

    <!-- Two-Factor Authentication (Future) -->
    <UPageCard
      title="Two-Factor Authentication"
      description="Add an extra layer of security to your account."
      variant="naked"
      orientation="horizontal"
      class="mt-8 mb-4"
    />

    <UCard>
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="size-12 rounded-lg bg-muted flex items-center justify-center">
            <UIcon name="i-lucide-shield-check" class="size-6 text-dimmed" />
          </div>
          <div>
            <div class="font-medium">Two-factor authentication</div>
            <div class="text-sm text-dimmed">
              Protect your account with an authenticator app
            </div>
          </div>
        </div>
        <UBadge color="warning" variant="subtle">Coming Soon</UBadge>
      </div>
    </UCard>
  </div>
</template>
