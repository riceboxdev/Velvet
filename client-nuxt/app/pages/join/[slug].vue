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

// Custom question answers
const questionAnswers = ref<Record<string, string>>({})

const waitlistId = computed(() => route.params.slug || 'preview')
const referralCode = computed(() => route.query.ref || null)

// Widget settings from waitlist
const widgetSettings = computed(() => waitlist.value?.settings?.widget || {})
const socialSettings = computed(() => waitlist.value?.settings?.social || {})
const questionsSettings = computed(() => waitlist.value?.settings?.questions || {})

// Design values with defaults
const submitButtonColor = computed(() => widgetSettings.value.submitButtonColor || '#1400ff')
const backgroundColor = computed(() => widgetSettings.value.transparent ? 'transparent' : (widgetSettings.value.backgroundColor || '#f4f4f4'))
const fontColor = computed(() => widgetSettings.value.fontColor || '#000000')
const buttonFontColor = computed(() => widgetSettings.value.buttonFontColor || '#ffffff')
const borderColor = computed(() => widgetSettings.value.borderColor || '#cccccc')
const darkMode = computed(() => widgetSettings.value.darkMode || false)

// Text customizations
const widgetTitle = computed(() => {
  if (widgetSettings.value.title) return widgetSettings.value.title
  return `Sign up for ${waitlist.value?.name || 'the waitlist'}`
})
const successTitle = computed(() => {
  if (widgetSettings.value.successTitle) return widgetSettings.value.successTitle
  return `Successfully signed up for ${waitlist.value?.name || 'the waitlist'}! 🎉`
})
const successDescription = computed(() => widgetSettings.value.successDescription || '')
const signupButtonText = computed(() => widgetSettings.value.signupButtonText || 'Sign Up')
const emailPlaceholder = computed(() => widgetSettings.value.emailPlaceholder || 'example@getwaitlist.com')
const removeLabels = computed(() => widgetSettings.value.removeLabels || false)
const showBranding = computed(() => widgetSettings.value.showBranding !== false)
const logoUrl = computed(() => widgetSettings.value.logoUrl || '')
const bannerImageUrl = computed(() => widgetSettings.value.bannerImageUrl || '')

// Questions
const questionItems = computed(() => questionsSettings.value.items || [])
const hideQuestionsHeader = computed(() => questionsSettings.value.hideHeader || false)

// Social sharing
const enabledPlatforms = computed(() => socialSettings.value.enabledPlatforms || ['twitter', 'whatsapp'])
const sharingMessage = computed(() => socialSettings.value.sharingMessage || "I'm {priority} on {waitlist_name} 🔗 {referral_link}")

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

  // Validate required questions
  for (const q of questionItems.value) {
    if (!q.optional && !questionAnswers.value[q.id]) {
      error.value = `Please answer: ${q.question}`
      return
    }
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
        referral_link: referralCode.value,
        custom_answers: questionAnswers.value
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

function getShareMessage() {
  return sharingMessage.value
    .replace('{priority}', `#${signupData.value?.position || 1}`)
    .replace('{waitlist_name}', waitlist.value?.name || 'the waitlist')
    .replace('{referral_link}', referralLink.value)
}

function shareOnTwitter() {
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareMessage())}`, '_blank')
}

function shareOnWhatsApp() {
  window.open(`https://wa.me/?text=${encodeURIComponent(getShareMessage())}`, '_blank')
}

function shareOnTelegram() {
  window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink.value)}&text=${encodeURIComponent(getShareMessage())}`, '_blank')
}

function shareOnFacebook() {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink.value)}`, '_blank')
}

function shareOnLinkedIn() {
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink.value)}`, '_blank')
}

function shareViaEmail() {
  window.open(`mailto:?subject=${encodeURIComponent(`Join ${waitlist.value?.name || 'the waitlist'}`)}&body=${encodeURIComponent(getShareMessage())}`, '_blank')
}

function shareOnReddit() {
  window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(referralLink.value)}&title=${encodeURIComponent(getShareMessage())}`, '_blank')
}

const socialShareButtons = computed(() => {
  const buttons = []
  if (enabledPlatforms.value.includes('twitter')) {
    buttons.push({ label: 'Share on X', icon: 'i-lucide-twitter', action: shareOnTwitter })
  }
  if (enabledPlatforms.value.includes('whatsapp')) {
    buttons.push({ label: 'WhatsApp', icon: 'i-lucide-phone', action: shareOnWhatsApp })
  }
  if (enabledPlatforms.value.includes('telegram')) {
    buttons.push({ label: 'Telegram', icon: 'i-lucide-send', action: shareOnTelegram })
  }
  if (enabledPlatforms.value.includes('facebook')) {
    buttons.push({ label: 'Facebook', icon: 'i-lucide-facebook', action: shareOnFacebook })
  }
  if (enabledPlatforms.value.includes('linkedin')) {
    buttons.push({ label: 'LinkedIn', icon: 'i-lucide-linkedin', action: shareOnLinkedIn })
  }
  if (enabledPlatforms.value.includes('email')) {
    buttons.push({ label: 'Email', icon: 'i-lucide-mail', action: shareViaEmail })
  }
  if (enabledPlatforms.value.includes('reddit')) {
    buttons.push({ label: 'Reddit', icon: 'i-lucide-message-circle', action: shareOnReddit })
  }
  return buttons
})

// Dynamic styles
const cardStyle = computed(() => ({
  backgroundColor: backgroundColor.value,
  color: fontColor.value,
  borderColor: borderColor.value
}))

const inputStyle = computed(() => ({
  borderColor: borderColor.value,
  backgroundColor: darkMode.value ? '#1a1a1a' : '#ffffff',
  color: fontColor.value
}))

const buttonStyle = computed(() => ({
  backgroundColor: submitButtonColor.value,
  color: buttonFontColor.value
}))
</script>

<template>
  <div
    class="w-full max-w-md mx-4 rounded-xl shadow-xl border"
    :style="cardStyle"
    :class="{ 'dark': darkMode }"
  >
    <!-- Banner Image -->
    <img
      v-if="bannerImageUrl"
      :src="bannerImageUrl"
      alt="Banner"
      class="w-full h-32 object-cover rounded-t-xl"
    >

    <div class="p-8 sm:p-10 text-center">
      <!-- Success State -->
      <template v-if="success && signupData">
        <div
          class="size-20 rounded-full flex items-center justify-center mx-auto mb-6"
          :style="{ backgroundColor: submitButtonColor }"
        >
          <UIcon name="i-lucide-check" class="size-10 text-white" />
        </div>

        <h2 class="text-2xl font-semibold mb-2">{{ successTitle }}</h2>
        <p v-if="successDescription" class="mb-4" :style="{ color: fontColor }">
          {{ successDescription }}
        </p>
        <p class="opacity-70 mb-6">
          Thanks for joining {{ waitlist?.name || 'the waitlist' }}
        </p>

        <div class="bg-success/10 border border-success/30 rounded-xl p-6">
          <div class="flex justify-center gap-10">
            <div class="text-center">
              <div class="text-3xl font-bold" :style="{ color: submitButtonColor }">
                #{{ signupData.position }}
              </div>
              <div class="text-xs opacity-70 uppercase tracking-wide mt-1">Your Position</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold" :style="{ color: submitButtonColor }">
                {{ signupData.referral_count || 0 }}
              </div>
              <div class="text-xs opacity-70 uppercase tracking-wide mt-1">Referrals</div>
            </div>
          </div>
        </div>

        <div class="bg-muted/20 rounded-lg p-4 mt-6">
          <p class="text-sm opacity-70 mb-3 flex items-center justify-center gap-1">
            <UIcon name="i-lucide-gift" class="size-4" />
            Share to move up the list!
          </p>
          <div class="flex gap-2">
            <input
              :value="referralLink"
              readonly
              class="flex-1 px-4 py-2 rounded-lg border text-sm"
              :style="inputStyle"
            >
            <button
              class="px-4 py-2 rounded-lg font-medium"
              :style="buttonStyle"
              @click="copyReferralLink"
            >
              <UIcon :name="copied ? 'i-lucide-check' : 'i-lucide-copy'" class="size-4" />
            </button>
          </div>
        </div>

        <!-- Social Share Buttons -->
        <div v-if="socialShareButtons.length > 0" class="flex flex-wrap justify-center gap-2 mt-6">
          <button
            v-for="btn in socialShareButtons"
            :key="btn.label"
            class="px-4 py-2 rounded-lg border flex items-center gap-2 text-sm hover:bg-muted/20 transition-colors"
            :style="{ borderColor: borderColor }"
            @click="btn.action"
          >
            <UIcon :name="btn.icon" class="size-4" />
            {{ btn.label }}
          </button>
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
          :style="{ backgroundColor: submitButtonColor }"
        >
          <UIcon name="i-lucide-sparkles" class="size-10 text-white" />
        </div>

        <h2 class="text-2xl font-semibold mb-2">{{ widgetTitle }}</h2>
        <p v-if="waitlist?.description" class="opacity-70 mb-8">{{ waitlist.description }}</p>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <!-- Email Field -->
          <div class="text-left">
            <label v-if="!removeLabels" class="block text-sm font-medium mb-1">Email</label>
            <input
              v-model="email"
              type="email"
              :placeholder="emailPlaceholder"
              :disabled="loading"
              class="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50"
              :style="inputStyle"
            >
          </div>

          <!-- Custom Questions -->
          <template v-if="questionItems.length > 0">
            <div v-if="!hideQuestionsHeader" class="text-left text-sm font-medium pt-2">
              Questions
            </div>
            <div
              v-for="q in questionItems"
              :key="q.id"
              class="text-left"
            >
              <label v-if="!removeLabels" class="block text-sm font-medium mb-1">
                {{ q.question }}
                <span v-if="q.optional" class="opacity-50">(optional)</span>
              </label>

              <!-- Text input for free text -->
              <input
                v-if="!q.answers"
                v-model="questionAnswers[q.id]"
                type="text"
                :placeholder="removeLabels ? q.question : ''"
                :disabled="loading"
                class="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50"
                :style="inputStyle"
              >

              <!-- Dropdown for predefined answers -->
              <select
                v-else
                v-model="questionAnswers[q.id]"
                :disabled="loading"
                class="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-opacity-50"
                :style="inputStyle"
              >
                <option value="">Select an option</option>
                <option v-for="opt in q.answers.split(',')" :key="opt" :value="opt.trim()">
                  {{ opt.trim() }}
                </option>
              </select>
            </div>
          </template>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            :style="buttonStyle"
          >
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
              Joining...
            </span>
            <span v-else>{{ signupButtonText }}</span>
          </button>
        </form>

        <!-- Error -->
        <div
          v-if="error"
          class="mt-4 p-3 rounded-lg bg-error/10 border border-error/30 text-error text-sm"
        >
          {{ error }}
        </div>

        <p v-if="referralCode" class="text-xs opacity-70 mt-4 flex items-center justify-center gap-1">
          <UIcon name="i-lucide-user-plus" class="size-3.5" />
          Referred by a friend
        </p>

        <!-- Signup count -->
        <div v-if="waitlist?.total_signups" class="mt-6 pt-5 border-t" :style="{ borderColor: borderColor }">
          <div class="text-sm opacity-70 flex items-center justify-center gap-1">
            <UIcon name="i-lucide-users" class="size-4" />
            {{ waitlist.total_signups.toLocaleString() }} people already on the list
          </div>
        </div>

        <!-- Branding -->
        <div
          v-if="showBranding"
          class="mt-4 pt-4 border-t flex items-center justify-center gap-1 text-xs opacity-50"
          :style="{ borderColor: borderColor }"
        >
          <UIcon name="i-lucide-sparkles" class="size-3" />
          Widget by <span class="font-medium">velvet</span>
        </div>
      </template>
    </div>
  </div>
</template>
