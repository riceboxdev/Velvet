<script setup lang="ts">
import { useWaitlistStore } from '~/stores/waitlist'

const store = useWaitlistStore()
const toast = useToast()

// Customization options
const width = ref(400)
const height = ref(500)
const borderRadius = ref(12)
const previewMode = ref<'desktop' | 'mobile'>('desktop')
const showLivePreview = ref(true)

// Computed preview URL
const previewUrl = computed(() => {
  const waitlistId = store.currentWaitlist?.id || 'preview'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.com'
  return `${origin}/join/${waitlistId}`
})

// Generated embed code
const widgetCode = computed(() => {
  const waitlistId = store.currentWaitlist?.id || 'YOUR_WAITLIST_ID'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
  return `<iframe
  src="${origin}/join/${waitlistId}"
  width="${width.value}"
  height="${height.value}"
  frameborder="0"
  style="border-radius: ${borderRadius.value}px; max-width: 100%;"
></iframe>`
})

// Script embed code
const scriptCode = computed(() => {
  const waitlistId = store.currentWaitlist?.id || 'YOUR_WAITLIST_ID'
  return `<div id="velvet-waitlist" data-waitlist-id="${waitlistId}"></div>
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/widget.js"><\/script>`
})

const activeTab = ref('iframe')

function copyCode() {
  const code = activeTab.value === 'iframe' ? widgetCode.value : scriptCode.value
  navigator.clipboard.writeText(code)
  toast.add({
    title: 'Copied!',
    description: 'Embed code copied to clipboard',
    icon: 'i-lucide-check',
    color: 'success'
  })
}

function copyDirectLink() {
  navigator.clipboard.writeText(previewUrl.value)
  toast.add({
    title: 'Copied!',
    description: 'Direct link copied to clipboard',
    icon: 'i-lucide-check',
    color: 'success'
  })
}

// Preview container width based on mode
const previewContainerStyle = computed(() => ({
  width: previewMode.value === 'mobile' ? '375px' : '100%',
  margin: previewMode.value === 'mobile' ? '0 auto' : undefined,
  transition: 'width 0.3s ease'
}))
</script>

<template>
  <UDashboardPanel id="widget">
    <template #header>
      <UDashboardNavbar title="Widget" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
            :to="previewUrl"
            target="_blank"
          >
            Open Full Page
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col lg:flex-row gap-6 p-4">
        <!-- Left: Customization & Code -->
        <div class="lg:w-1/2 space-y-6">
          <!-- Quick Actions -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">Quick Links</h3>
              </div>
            </template>

            <div class="grid grid-cols-2 gap-3">
              <UButton
                icon="i-lucide-link"
                color="neutral"
                variant="outline"
                block
                @click="copyDirectLink"
              >
                Copy Direct Link
              </UButton>
              <UButton
                icon="i-lucide-external-link"
                color="neutral"
                variant="outline"
                :to="previewUrl"
                target="_blank"
                block
              >
                Open in New Tab
              </UButton>
            </div>

            <div class="mt-4 p-3 bg-elevated rounded-lg">
              <div class="text-xs text-dimmed mb-1">Direct URL</div>
              <code class="text-sm break-all">{{ previewUrl }}</code>
            </div>
          </UCard>

          <!-- Customization -->
          <UCard>
            <template #header>
              <h3 class="font-semibold">Customize</h3>
            </template>

            <div class="space-y-5">
              <UFormField label="Width (px)">
                <div class="flex items-center gap-4">
                  <URange
                    v-model="width"
                    :min="300"
                    :max="600"
                    :step="10"
                    class="flex-1"
                  />
                  <UInput
                    v-model.number="width"
                    type="number"
                    class="w-20"
                  />
                </div>
              </UFormField>

              <UFormField label="Height (px)">
                <div class="flex items-center gap-4">
                  <URange
                    v-model="height"
                    :min="300"
                    :max="700"
                    :step="10"
                    class="flex-1"
                  />
                  <UInput
                    v-model.number="height"
                    type="number"
                    class="w-20"
                  />
                </div>
              </UFormField>

              <UFormField label="Border Radius (px)">
                <div class="flex items-center gap-4">
                  <URange
                    v-model="borderRadius"
                    :min="0"
                    :max="24"
                    :step="2"
                    class="flex-1"
                  />
                  <UInput
                    v-model.number="borderRadius"
                    type="number"
                    class="w-20"
                  />
                </div>
              </UFormField>
            </div>
          </UCard>

          <!-- Embed Code -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">Embed Code</h3>
                <UButton
                  icon="i-lucide-copy"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="copyCode"
                >
                  Copy
                </UButton>
              </div>
            </template>

            <UTabs
              v-model="activeTab"
              :items="[
                { label: 'iframe', value: 'iframe', icon: 'i-lucide-frame' },
                { label: 'Script', value: 'script', icon: 'i-lucide-code' }
              ]"
              class="mb-4"
            />

            <pre class="p-4 bg-elevated rounded-lg text-xs overflow-x-auto font-mono"><code>{{ activeTab === 'iframe' ? widgetCode : scriptCode }}</code></pre>

            <p class="text-xs text-dimmed mt-3">
              {{ activeTab === 'iframe'
                ? 'Paste this code into your HTML where you want the widget to appear.'
                : 'Add this script to your site for a more flexible integration.'
              }}
            </p>
          </UCard>
        </div>

        <!-- Right: Live Preview -->
        <div class="lg:w-1/2">
          <UCard class="h-full">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">Live Preview</h3>
                <div class="flex items-center gap-2">
                  <UButtonGroup>
                    <UButton
                      icon="i-lucide-monitor"
                      :color="previewMode === 'desktop' ? 'primary' : 'neutral'"
                      :variant="previewMode === 'desktop' ? 'solid' : 'ghost'"
                      size="xs"
                      @click="previewMode = 'desktop'"
                    />
                    <UButton
                      icon="i-lucide-smartphone"
                      :color="previewMode === 'mobile' ? 'primary' : 'neutral'"
                      :variant="previewMode === 'mobile' ? 'solid' : 'ghost'"
                      size="xs"
                      @click="previewMode = 'mobile'"
                    />
                  </UButtonGroup>

                  <USwitch v-model="showLivePreview" size="sm" />
                  <span class="text-xs text-dimmed">Live</span>
                </div>
              </div>
            </template>

            <div
              class="bg-[repeating-conic-gradient(#80808015_0%_25%,transparent_0%_50%)] bg-[size:20px_20px] rounded-lg p-4 min-h-[500px] flex items-start justify-center"
            >
              <div :style="previewContainerStyle">
                <iframe
                  v-if="showLivePreview"
                  :src="previewUrl"
                  :width="width"
                  :height="height"
                  frameborder="0"
                  :style="{
                    borderRadius: `${borderRadius}px`,
                    maxWidth: '100%',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)'
                  }"
                  class="bg-white"
                />
                <div
                  v-else
                  class="flex items-center justify-center bg-elevated rounded-lg"
                  :style="{ width: `${width}px`, height: `${height}px`, borderRadius: `${borderRadius}px` }"
                >
                  <div class="text-center text-dimmed">
                    <UIcon name="i-lucide-eye-off" class="size-8 mb-2" />
                    <p class="text-sm">Preview paused</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between text-xs text-dimmed">
              <span>{{ width }} × {{ height }}px</span>
              <span>{{ previewMode === 'mobile' ? 'Mobile' : 'Desktop' }} view</span>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
