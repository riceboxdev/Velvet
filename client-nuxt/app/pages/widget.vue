<script setup lang="ts">
import { useWaitlistStore } from '~/stores/waitlist'

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 10)

const store = useWaitlistStore()
const toast = useToast()

// Active tab
const activeTab = ref('design')

// Saving state
const saving = ref(false)
const hasUnsavedChanges = ref(false)

// Preview state
const previewType = ref<'full' | 'mini' | 'docked' | 'hosted'>('full')
const previewMode = ref<'desktop' | 'mobile'>('desktop')

// ============ DESIGN TAB STATE ============
const colorMode = ref<'HEX' | 'OKLCH'>('HEX')
const design = ref({
  submitButtonColor: '#1400ff',
  backgroundColor: '#f4f4f4',
  fontColor: '#000000',
  buttonFontColor: '#ffffff',
  borderColor: '#cccccc',
  darkMode: false,
  transparent: false,
  title: '',
  successTitle: '',
  successDescription: '',
  signupButtonText: 'Sign Up',
  removeLabels: false,
  emailPlaceholder: 'example@getwaitlist.com',
  showBranding: true,
  logoUrl: '',
  bannerImageUrl: ''
})

// ============ SOCIAL TAB STATE ============
const social = ref({
  sharingMessage: "I'm {priority} on {waitlist_name} 🔗 {referral_link}",
  enabledPlatforms: ['twitter', 'whatsapp'] as string[],
  ogTitle: 'Join the waitlist',
  ogDescription: 'Join the waitlist to be the first to know when we launch!',
  ogImage: '',
  socialLinks: {
    twitter: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    pinterest: ''
  },
  showSocialLinksOnWidget: false
})

const socialPlatforms = [
  { id: 'twitter', label: 'Twitter', icon: 'i-lucide-twitter' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'i-lucide-phone' },
  { id: 'telegram', label: 'Telegram', icon: 'i-lucide-send' },
  { id: 'facebook', label: 'Facebook', icon: 'i-lucide-facebook' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'i-lucide-linkedin' },
  { id: 'email', label: 'Email', icon: 'i-lucide-mail' },
  { id: 'reddit', label: 'Reddit', icon: 'i-lucide-message-circle' }
]

// ============ QUESTIONS TAB STATE ============
const questions = ref({
  hideHeader: false,
  items: [] as Array<{ id: string; question: string; answers: string; optional: boolean }>
})

function addQuestion() {
  questions.value.items.push({
    id: generateId(),
    question: '',
    answers: '',
    optional: false
  })
  markChanged()
}

function removeQuestion(id: string) {
  questions.value.items = questions.value.items.filter(q => q.id !== id)
  markChanged()
}

// ============ LIFECYCLE & DATA LOADING ============
onMounted(async () => {
  if (store.hasApiKey) {
    await store.fetchWaitlist()
    loadSettings()
  }
})

function loadSettings() {
  const settings = store.currentWaitlist?.settings || {}
  
  // Load widget design settings
  if (settings.widget) {
    Object.assign(design.value, settings.widget)
  }
  
  // Load social settings
  if (settings.social) {
    social.value.sharingMessage = settings.social.sharingMessage || social.value.sharingMessage
    social.value.enabledPlatforms = settings.social.enabledPlatforms || social.value.enabledPlatforms
    social.value.ogTitle = settings.social.ogTitle || social.value.ogTitle
    social.value.ogDescription = settings.social.ogDescription || social.value.ogDescription
    social.value.ogImage = settings.social.ogImage || ''
    social.value.showSocialLinksOnWidget = settings.social.showSocialLinksOnWidget || false
    if (settings.social.socialLinks) {
      Object.assign(social.value.socialLinks, settings.social.socialLinks)
    }
  }
  
  // Load questions settings
  if (settings.questions) {
    questions.value.hideHeader = settings.questions.hideHeader || false
    questions.value.items = settings.questions.items || []
  }
  
  hasUnsavedChanges.value = false
}

function markChanged() {
  hasUnsavedChanges.value = true
}

// Watch for changes
watch(design, () => markChanged(), { deep: true })
watch(social, () => markChanged(), { deep: true })
watch(questions, () => markChanged(), { deep: true })

// ============ SAVE FUNCTIONALITY ============
async function saveSettings() {
  saving.value = true
  try {
    const currentSettings = store.currentWaitlist?.settings || {}
    
    await store.updateWaitlistSettings({
      settings: {
        ...currentSettings,
        widget: { ...design.value },
        social: { ...social.value },
        questions: { ...questions.value }
      }
    })
    
    hasUnsavedChanges.value = false
    toast.add({
      title: 'Settings saved',
      description: 'Your widget customizations have been saved.',
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch (e: any) {
    toast.add({
      title: 'Failed to save',
      description: e.message,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

// ============ COMPUTED VALUES ============
const previewUrl = computed(() => {
  const waitlistId = store.currentWaitlist?.id || 'preview'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.com'
  return `${origin}/join/${waitlistId}`
})

const waitlistName = computed(() => store.currentWaitlist?.name || 'My Waitlist')

const widgetTitle = computed(() => design.value.title || `Sign up for ${waitlistName.value}`)
const successTitle = computed(() => design.value.successTitle || `Successfully signed up for ${waitlistName.value}`)

// Embed code
const embedCode = computed(() => {
  const waitlistId = store.currentWaitlist?.id || 'YOUR_WAITLIST_ID'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
  return `<iframe
  src="${origin}/join/${waitlistId}"
  width="400"
  height="500"
  frameborder="0"
  style="border-radius: 12px; max-width: 100%;"
></iframe>`
})

function copyEmbedCode() {
  navigator.clipboard.writeText(embedCode.value)
  toast.add({
    title: 'Copied!',
    description: 'Embed code copied to clipboard',
    icon: 'i-lucide-check',
    color: 'success'
  })
}

function openHostedPage() {
  window.open(previewUrl.value, '_blank')
}

function togglePlatform(platformId: string) {
  const index = social.value.enabledPlatforms.indexOf(platformId)
  if (index > -1) {
    social.value.enabledPlatforms.splice(index, 1)
  } else {
    social.value.enabledPlatforms.push(platformId)
  }
}

function previewTweet() {
  const message = social.value.sharingMessage
    .replace('{priority}', '#42')
    .replace('{waitlist_name}', waitlistName.value)
    .replace('{referral_link}', previewUrl.value + '?ref=abc123')
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank')
}
</script>

<template>
  <UDashboardPanel id="widget-builder">
    <template #header>
      <UDashboardNavbar title="Widget Builder" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            v-if="hasUnsavedChanges"
            icon="i-lucide-save"
            :loading="saving"
            @click="saveSettings"
          >
            Save Changes
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col lg:flex-row gap-6 p-4 h-full">
        <!-- Left Panel: Customization -->
        <div class="lg:w-1/2 space-y-4 overflow-y-auto">
          <!-- Tab Navigation -->
          <div class="flex border-b border-default">
            <button
              v-for="tab in [
                { id: 'design', label: 'Design' },
                { id: 'social', label: 'Social' },
                { id: 'questions', label: 'Questions' }
              ]"
              :key="tab.id"
              class="px-6 py-3 text-sm font-medium border-b-2 transition-colors"
              :class="[
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-dimmed hover:text-default'
              ]"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- ============ DESIGN TAB ============ -->
          <div v-show="activeTab === 'design'" class="space-y-6">
            <!-- Color Mode Toggle -->
            <div class="flex gap-2">
              <UButton
                :variant="colorMode === 'HEX' ? 'solid' : 'outline'"
                :color="colorMode === 'HEX' ? 'primary' : 'neutral'"
                size="sm"
                @click="colorMode = 'HEX'"
              >
                HEX
              </UButton>
              <UButton
                :variant="colorMode === 'OKLCH' ? 'solid' : 'outline'"
                :color="colorMode === 'OKLCH' ? 'primary' : 'neutral'"
                size="sm"
                @click="colorMode = 'OKLCH'"
              >
                OKLCH
              </UButton>
            </div>

            <!-- Color Pickers -->
            <UFormField label="Submit Button Color">
              <div class="flex items-center gap-3">
                <input
                  v-model="design.submitButtonColor"
                  type="color"
                  class="w-10 h-10 rounded cursor-pointer border border-default"
                >
                <UInput v-model="design.submitButtonColor" class="flex-1" />
              </div>
            </UFormField>

            <UFormField label="Background Color">
              <div class="flex items-center gap-3">
                <input
                  v-model="design.backgroundColor"
                  type="color"
                  class="w-10 h-10 rounded cursor-pointer border border-default"
                >
                <UInput v-model="design.backgroundColor" class="flex-1" />
              </div>
              <UCheckbox
                v-model="design.transparent"
                label="Make transparent"
                class="mt-2"
              />
            </UFormField>

            <UFormField label="Font Color">
              <div class="flex items-center gap-3">
                <input
                  v-model="design.fontColor"
                  type="color"
                  class="w-10 h-10 rounded cursor-pointer border border-default"
                >
                <UInput v-model="design.fontColor" class="flex-1" />
              </div>
            </UFormField>

            <UFormField label="Button Font Color">
              <div class="flex items-center gap-3">
                <input
                  v-model="design.buttonFontColor"
                  type="color"
                  class="w-10 h-10 rounded cursor-pointer border border-default"
                >
                <UInput v-model="design.buttonFontColor" class="flex-1" />
              </div>
            </UFormField>

            <UFormField label="Border Color">
              <div class="flex items-center gap-3">
                <input
                  v-model="design.borderColor"
                  type="color"
                  class="w-10 h-10 rounded cursor-pointer border border-default"
                >
                <UInput v-model="design.borderColor" class="flex-1" />
              </div>
            </UFormField>

            <UCheckbox
              v-model="design.darkMode"
              label="Dark Mode"
              description="Enable dark mode theme for the widget"
            />

            <UDivider />

            <!-- Title Settings -->
            <UFormField label="Title">
              <UInput
                v-model="design.title"
                :placeholder="`Sign up for ${waitlistName}`"
              />
              <p class="text-xs text-dimmed mt-1">Leave empty to use waitlist name</p>
            </UFormField>

            <UFormField label="Success Title">
              <UInput
                v-model="design.successTitle"
                :placeholder="`Successfully signed up for ${waitlistName}`"
              />
            </UFormField>

            <UFormField label="Success Description">
              <UTextarea
                v-model="design.successDescription"
                :rows="2"
                placeholder="Optional description shown after signup"
              />
            </UFormField>

            <UFormField label="Signup Button Text">
              <UInput v-model="design.signupButtonText" placeholder="Sign Up" />
            </UFormField>

            <UDivider />

            <!-- Form Settings -->
            <UCheckbox
              v-model="design.removeLabels"
              label="Remove Labels"
              description="When checked, the widget will not show field labels like 'email' or 'questions'"
            />

            <UFormField label="Email placeholder">
              <UInput v-model="design.emailPlaceholder" placeholder="example@getwaitlist.com" />
            </UFormField>

            <UDivider />

            <!-- Branding -->
            <UCheckbox
              v-model="design.showBranding"
              label="Waitlist Branding"
              description="Show Velvet branding on no-code widgets"
            />

            <UFormField label="Logo">
              <p class="text-xs text-dimmed mb-2">Your logo will only be displayed on the hosted page and not the widget</p>
              <UButton icon="i-lucide-upload" color="primary" size="sm">
                Upload Logo
              </UButton>
            </UFormField>

            <UFormField label="Banner Image">
              <p class="text-xs text-dimmed mb-2">Your banner will only be displayed on the hosted page and not the widget</p>
              <UButton icon="i-lucide-upload" color="primary" size="sm">
                Upload Banner
              </UButton>
            </UFormField>
          </div>

          <!-- ============ SOCIAL TAB ============ -->
          <div v-show="activeTab === 'social'" class="space-y-6">
            <h3 class="text-lg font-semibold">Sharing Options</h3>

            <UFormField label="Social Media Sharing Message">
              <p class="text-xs text-dimmed mb-2">
                Configure a default message for users to share their referral links on social media.
                You can use "{priority}" and "{referral_link}" as variables. Leave blank for default.
              </p>
              <UTextarea
                v-model="social.sharingMessage"
                :rows="3"
                placeholder="I'm {priority} on {waitlist_name} 🔗 {referral_link}"
              />
              <UButton
                variant="link"
                color="primary"
                size="sm"
                class="mt-2"
                @click="previewTweet"
              >
                Preview as Tweet
              </UButton>
            </UFormField>

            <UFormField label="Success Message Social Media">
              <p class="text-xs text-dimmed mb-2">
                Pick which links we show on the post-signup section for users to share their referral links on.
              </p>
              <div class="space-y-2">
                <div
                  v-for="platform in socialPlatforms"
                  :key="platform.id"
                  class="flex items-center"
                >
                  <UCheckbox
                    :model-value="social.enabledPlatforms.includes(platform.id)"
                    :label="platform.label"
                    @update:model-value="togglePlatform(platform.id)"
                  />
                </div>
              </div>
            </UFormField>

            <UDivider />

            <h3 class="text-lg font-semibold">Custom Social Media Cards</h3>

            <UFormField label="OG Title">
              <p class="text-xs text-dimmed mb-2">
                This is the title that will show up when someone shares your waitlist on social media.
              </p>
              <UInput v-model="social.ogTitle" placeholder="Join the waitlist" />
            </UFormField>

            <UFormField label="OG Description">
              <p class="text-xs text-dimmed mb-2">
                This is the description that will show up when someone shares your waitlist on social media.
              </p>
              <UInput
                v-model="social.ogDescription"
                placeholder="Join the waitlist to be the first to know when we launch!"
              />
            </UFormField>

            <UFormField label="OG Image">
              <p class="text-xs text-dimmed mb-2">
                This is the image that will show up when someone shares your waitlist on social media.
              </p>
              <UButton icon="i-lucide-upload" color="primary" size="sm">
                Upload Preview Image
              </UButton>
            </UFormField>

            <UDivider />

            <h3 class="text-lg font-semibold">Social Links</h3>
            <p class="text-sm text-dimmed mb-4">Add links to your social media pages.</p>

            <UFormField label="Twitter Link">
              <div class="flex">
                <span class="px-3 py-2 bg-muted border border-r-0 border-default rounded-l-md text-sm text-dimmed">
                  https://twitter.com/
                </span>
                <UInput
                  v-model="social.socialLinks.twitter"
                  class="flex-1 rounded-l-none"
                  placeholder="username"
                />
              </div>
            </UFormField>

            <UFormField label="Facebook Link">
              <div class="flex">
                <span class="px-3 py-2 bg-muted border border-r-0 border-default rounded-l-md text-sm text-dimmed">
                  https://facebook.com/
                </span>
                <UInput
                  v-model="social.socialLinks.facebook"
                  class="flex-1 rounded-l-none"
                  placeholder="username"
                />
              </div>
            </UFormField>

            <UFormField label="Instagram Link">
              <div class="flex">
                <span class="px-3 py-2 bg-muted border border-r-0 border-default rounded-l-md text-sm text-dimmed">
                  https://instagram.com/
                </span>
                <UInput
                  v-model="social.socialLinks.instagram"
                  class="flex-1 rounded-l-none"
                  placeholder="username"
                />
              </div>
            </UFormField>

            <UFormField label="LinkedIn Link">
              <div class="flex">
                <span class="px-3 py-2 bg-muted border border-r-0 border-default rounded-l-md text-sm text-dimmed">
                  https://linkedin.com/
                </span>
                <UInput
                  v-model="social.socialLinks.linkedin"
                  class="flex-1 rounded-l-none"
                  placeholder="in/username"
                />
              </div>
            </UFormField>

            <UFormField label="Pinterest Link">
              <div class="flex">
                <span class="px-3 py-2 bg-muted border border-r-0 border-default rounded-l-md text-sm text-dimmed">
                  https://pinterest.com/
                </span>
                <UInput
                  v-model="social.socialLinks.pinterest"
                  class="flex-1 rounded-l-none"
                  placeholder="username"
                />
              </div>
            </UFormField>

            <UCheckbox
              v-model="social.showSocialLinksOnWidget"
              label="Show Social Links on Widget"
              description="The social links will always be shown on the hosted page. Checking this box will make them show on the widget as well."
            />
          </div>

          <!-- ============ QUESTIONS TAB ============ -->
          <div v-show="activeTab === 'questions'" class="space-y-6">
            <UAlert
              color="info"
              variant="subtle"
              icon="i-lucide-info"
              title="A blank answer field will accept any text answer. If you set comma-separated answers, then the User will be able to choose from a dropdown menu."
            />

            <UCheckbox
              v-model="questions.hideHeader"
              label="Hide Questions Header"
              description="When checked, the 'Questions' section header will be removed from the form."
            />

            <UDivider />

            <!-- Questions List -->
            <div
              v-for="(item, index) in questions.items"
              :key="item.id"
              class="p-4 border border-default rounded-lg space-y-4"
            >
              <div class="flex items-center justify-between">
                <span class="font-medium">Question {{ index + 1 }}</span>
                <UButton
                  variant="ghost"
                  color="error"
                  size="sm"
                  icon="i-lucide-trash-2"
                  @click="removeQuestion(item.id)"
                >
                  Delete
                </UButton>
              </div>

              <UInput
                v-model="item.question"
                placeholder="What is your favorite animal?"
              />

              <UCheckbox
                v-model="item.optional"
                label="Optional"
              />

              <UFormField :label="`Answer ${index + 1}`">
                <UInput
                  v-model="item.answers"
                  placeholder="Dog, Cat, Duck, None of the above"
                />
                <p class="text-xs text-dimmed mt-1">Leave blank for free text, or use commas for dropdown options</p>
              </UFormField>
            </div>

            <UButton
              icon="i-lucide-plus"
              color="primary"
              @click="addQuestion"
            >
              Add Question
            </UButton>
          </div>
        </div>

        <!-- Right Panel: Preview -->
        <div class="lg:w-1/2 flex flex-col">
          <UCard class="flex-1 flex flex-col">
            <template #header>
              <div class="flex items-center justify-between flex-wrap gap-3">
                <!-- Widget Type Tabs -->
                <div class="flex border border-default rounded-lg overflow-hidden">
                  <button
                    v-for="type in [
                      { id: 'full', label: 'Full Widget' },
                      { id: 'mini', label: 'Mini Widget' },
                      { id: 'docked', label: 'Docked Widget' },
                      { id: 'hosted', label: 'Hosted Page' }
                    ]"
                    :key="type.id"
                    class="px-4 py-2 text-sm font-medium transition-colors"
                    :class="[
                      previewType === type.id
                        ? 'bg-primary text-white'
                        : 'bg-elevated hover:bg-muted text-dimmed'
                    ]"
                    @click="type.id === 'hosted' ? openHostedPage() : (previewType = type.id as any)"
                  >
                    {{ type.label }}
                  </button>
                </div>
              </div>
            </template>

            <!-- Get Embed Code Button -->
            <UButton
              icon="i-lucide-code"
              color="primary"
              block
              class="mb-4"
              @click="copyEmbedCode"
            >
              Get Embed Code
            </UButton>

            <!-- Preview Area -->
            <div
              class="flex-1 bg-[repeating-conic-gradient(#80808015_0%_25%,transparent_0%_50%)] bg-[size:20px_20px] rounded-lg p-4 flex items-start justify-center min-h-[400px]"
            >
              <!-- Widget Preview -->
              <div
                class="rounded-xl shadow-xl overflow-hidden transition-all duration-300"
                :style="{
                  backgroundColor: design.transparent ? 'transparent' : design.backgroundColor,
                  color: design.fontColor,
                  borderColor: design.borderColor,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  maxWidth: previewType === 'mini' ? '300px' : '400px',
                  width: '100%'
                }"
                :class="{ 'dark': design.darkMode }"
              >
                <div class="p-6 text-center">
                  <!-- Title -->
                  <h2 class="text-xl font-semibold mb-4" :style="{ color: design.fontColor }">
                    {{ widgetTitle }}
                  </h2>

                  <!-- Email Input -->
                  <div class="space-y-3">
                    <div v-if="!design.removeLabels" class="text-left text-sm" :style="{ color: design.fontColor }">
                      Email
                    </div>
                    <input
                      type="email"
                      :placeholder="design.emailPlaceholder"
                      class="w-full px-4 py-2 rounded-lg border"
                      :style="{
                        borderColor: design.borderColor,
                        backgroundColor: design.darkMode ? '#1a1a1a' : '#ffffff',
                        color: design.fontColor
                      }"
                    >

                    <!-- Custom Questions Preview -->
                    <template v-if="questions.items.length > 0">
                      <div v-if="!questions.hideHeader" class="text-left text-sm font-medium mt-4" :style="{ color: design.fontColor }">
                        Questions
                      </div>
                      <div
                        v-for="(q, idx) in questions.items.slice(0, 2)"
                        :key="q.id"
                        class="text-left"
                      >
                        <div v-if="!design.removeLabels" class="text-sm mb-1" :style="{ color: design.fontColor }">
                          {{ q.question }} {{ q.optional ? '(optional)' : '' }}
                        </div>
                        <input
                          v-if="!q.answers"
                          type="text"
                          :placeholder="q.question"
                          class="w-full px-4 py-2 rounded-lg border"
                          :style="{
                            borderColor: design.borderColor,
                            backgroundColor: design.darkMode ? '#1a1a1a' : '#ffffff',
                            color: design.fontColor
                          }"
                        >
                        <select
                          v-else
                          class="w-full px-4 py-2 rounded-lg border"
                          :style="{
                            borderColor: design.borderColor,
                            backgroundColor: design.darkMode ? '#1a1a1a' : '#ffffff',
                            color: design.fontColor
                          }"
                        >
                          <option value="">Select an option</option>
                          <option v-for="opt in q.answers.split(',')" :key="opt" :value="opt.trim()">
                            {{ opt.trim() }}
                          </option>
                        </select>
                      </div>
                      <p v-if="questions.items.length > 2" class="text-xs text-dimmed">
                        +{{ questions.items.length - 2 }} more questions
                      </p>
                    </template>

                    <!-- Submit Button -->
                    <button
                      class="w-full py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-90"
                      :style="{
                        backgroundColor: design.submitButtonColor,
                        color: design.buttonFontColor
                      }"
                    >
                      {{ design.signupButtonText }}
                    </button>
                  </div>

                  <!-- Check Status Link -->
                  <p class="text-sm mt-4" :style="{ color: design.fontColor }">
                    Signed up before? <span class="font-semibold cursor-pointer">Check your Status</span>
                  </p>

                  <!-- Branding -->
                  <div v-if="design.showBranding" class="mt-4 pt-4 border-t flex items-center justify-center gap-1 text-xs" :style="{ borderColor: design.borderColor, color: design.fontColor }">
                    <UIcon name="i-lucide-sparkles" class="size-3" />
                    Widget by <span class="font-medium">velvet</span>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Unsaved Changes Bar -->
      <div
        v-if="hasUnsavedChanges"
        class="fixed bottom-0 left-0 right-0 bg-warning/10 border-t border-warning p-4 flex items-center justify-between z-50"
      >
        <div class="flex items-center gap-2 text-warning">
          <UIcon name="i-lucide-alert-triangle" class="size-5" />
          <span class="font-medium">Warning! You have unsaved changes.</span>
        </div>
        <UButton
          :loading="saving"
          @click="saveSettings"
        >
          Save
        </UButton>
      </div>
    </template>
  </UDashboardPanel>
</template>
