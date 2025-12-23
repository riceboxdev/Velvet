<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const route = useRoute()
const config = useRuntimeConfig()
const API_BASE = config.public.apiBase

const email = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const signupData = ref<any>(null)
const waitlist = ref<any>(null)
const copied = ref(false)

const waitlistId = computed(() => route.params.slug || 'preview')
const referralCode = computed(() => route.query.ref || null)

// Branding from waitlist settings
const branding = computed(() => waitlist.value?.settings?.branding || {})
const primaryColor = computed(() => branding.value.primaryColor || '#6366f1')
const secondaryColor = computed(() => branding.value.secondaryColor || '#10b981')

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE}/waitlist/${waitlistId.value}`)
    if (res.ok) {
      const data = await res.json()
      waitlist.value = data.data
    }
  } catch (e) {
    console.error('Failed to load waitlist:', e)
  }
})

async function handleSubmit() {
  if (!email.value) {
    error.value = 'Please enter your email'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const res = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        waitlist_id: waitlistId.value,
        referral_link: referralCode.value
      })
    })

    const data = await res.json()

    if (!res.ok) {
      if (res.status === 409 && data.data) {
        signupData.value = data.data
        success.value = true
      } else {
        throw new Error(data.message || 'Failed to join waitlist')
      }
    } else {
      signupData.value = data.data
      success.value = true
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const referralLink = computed(() => {
  if (!signupData.value?.referral_code) return ''
  return `${window?.location?.origin || ''}/join/${waitlistId.value}?ref=${signupData.value.referral_code}`
})

function copyReferralLink() {
  navigator.clipboard.writeText(referralLink.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

function shareOnTwitter() {
  const text = `I just joined ${waitlist.value?.name || 'the waitlist'}! Join me: ${referralLink.value}`
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
}

// Widget customization from branding settings
const widgetTitle = computed(() =>
  branding.value.widgetTitle || waitlist.value?.name || 'Join the Waitlist'
)
const widgetSubtitle = computed(() =>
  branding.value.widgetSubtitle || waitlist.value?.description || 'Be the first to know when we launch!'
)
const buttonText = computed(() => branding.value.buttonText || 'Join')
const successTitle = computed(() => branding.value.successTitle || "You're on the list! 🎉")
const logoUrl = computed(() => branding.value.logoUrl || '')
</script>

<template>
  <UCard class="w-full max-w-md mx-4 text-center" :ui="{ body: 'p-8 sm:p-10' }">
    <!-- Success State -->
    <template v-if="success && signupData">
      <div
        class="size-20 rounded-full flex items-center justify-center mx-auto mb-6"
        :style="{ background: `linear-gradient(135deg, ${secondaryColor}, ${secondaryColor}99)` }"
      >
        <UIcon name="i-lucide-check" class="size-10 text-white" />
      </div>

      <h2 class="text-2xl font-semibold mb-2">{{ successTitle }}</h2>
      <p class="text-dimmed mb-6">
        Thanks for joining {{ waitlist?.name || 'the waitlist' }}
      </p>

      <div class="bg-success/10 border border-success/30 rounded-xl p-6">
        <div class="flex justify-center gap-10">
          <div class="text-center">
            <div class="text-3xl font-bold" :style="{ color: primaryColor }">
              #{{ signupData.position }}
            </div>
            <div class="text-xs text-dimmed uppercase tracking-wide mt-1">Your Position</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold" :style="{ color: primaryColor }">
              {{ signupData.referral_count || 0 }}
            </div>
            <div class="text-xs text-dimmed uppercase tracking-wide mt-1">Referrals</div>
          </div>
        </div>
      </div>

      <div class="bg-muted rounded-lg p-4 mt-6">
        <p class="text-sm text-dimmed mb-3 flex items-center justify-center gap-1">
          <UIcon name="i-lucide-gift" class="size-4" />
          Share to move up the list!
        </p>
        <div class="flex gap-2">
          <UInput
            :model-value="referralLink"
            readonly
            class="flex-1"
          />
          <UButton
            :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            :style="{ background: primaryColor }"
            @click="copyReferralLink"
          />
        </div>
      </div>

      <div class="flex justify-center gap-3 mt-6">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-twitter"
          @click="shareOnTwitter"
        >
          Share on X
        </UButton>
      </div>
    </template>

    <!-- Signup Form -->
    <template v-else>
      <!-- Logo -->
      <img
        v-if="logoUrl"
        :src="logoUrl"
        alt="Logo"
        class="max-w-[120px] max-h-[60px] mx-auto mb-5 object-contain"
      >

      <!-- Default icon if no logo -->
      <div
        v-else
        class="size-20 rounded-full flex items-center justify-center mx-auto mb-6"
        :style="{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }"
      >
        <UIcon name="i-lucide-sparkles" class="size-10 text-white" />
      </div>

      <h2 class="text-2xl font-semibold mb-2">{{ widgetTitle }}</h2>
      <p class="text-dimmed mb-8">{{ widgetSubtitle }}</p>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="flex gap-3">
          <UInput
            v-model="email"
            type="email"
            placeholder="Enter your email"
            :disabled="loading"
            class="flex-1"
          />
          <UButton
            type="submit"
            :loading="loading"
            :disabled="loading"
            :style="{ background: primaryColor }"
          >
            {{ buttonText }}
          </UButton>
        </div>
      </form>

      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        class="mt-4"
        :title="error"
      />

      <p v-if="referralCode" class="text-xs text-dimmed mt-4 flex items-center justify-center gap-1">
        <UIcon name="i-lucide-user-plus" class="size-3.5" />
        Referred by a friend
      </p>

      <div v-if="waitlist?.total_signups" class="mt-6 pt-5 border-t border-default">
        <div class="text-sm text-dimmed flex items-center justify-center gap-1">
          <UIcon name="i-lucide-users" class="size-4" />
          {{ waitlist.total_signups.toLocaleString() }} people already on the list
        </div>
      </div>
    </template>
  </UCard>
</template>
