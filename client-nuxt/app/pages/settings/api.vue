<script setup lang="ts">
import { useWaitlistStore } from '~/stores/waitlist'

const store = useWaitlistStore()
const copied = ref<string | null>(null)

const apiKey = computed(() => (store.currentWaitlist as any)?.api_key || '')
const waitlistId = computed(() => store.currentWaitlist?.id || '')

const embedCode = computed(() => {
  const baseUrl = window?.location?.origin || 'https://example.com'
  return `<iframe
  src="${baseUrl}/join/${waitlistId.value}"
  width="100%"
  height="600"
  frameborder="0"
  style="border-radius: 12px; max-width: 450px;"
></iframe>`
})

function copyToClipboard(text: string, key: string) {
  navigator.clipboard.writeText(text)
  copied.value = key
  setTimeout(() => copied.value = null, 2000)
}
</script>

<template>
  <div>
    <UPageCard
      title="API"
      description="Access keys and embed code for your waitlist."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="View Documentation"
        color="neutral"
        variant="outline"
        icon="i-lucide-book-open"
        to="https://docs.example.com"
        target="_blank"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="space-y-6">
        <UPageCard variant="subtle">
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-lucide-key" class="size-5" />
            <h3 class="font-semibold text-sm">API Key</h3>
          </div>
          <p class="text-sm text-dimmed mb-4">
            Use this key in the <code class="bg-elevated px-1.5 py-0.5 rounded text-xs">X-API-Key</code> header for authenticated requests.
          </p>
          <div class="flex items-center gap-2 p-3 bg-elevated rounded-lg border border-default">
            <code class="flex-1 text-sm truncate font-mono">{{ apiKey || 'No API key available' }}</code>
            <UButton
              :icon="copied === 'apiKey' ? 'i-lucide-check' : 'i-lucide-copy'"
              :color="copied === 'apiKey' ? 'success' : 'neutral'"
              variant="ghost"
              size="xs"
              :disabled="!apiKey"
              @click="copyToClipboard(apiKey, 'apiKey')"
            />
          </div>
        </UPageCard>

        <UPageCard variant="subtle">
          <div class="flex items-center gap-2 mb-2">
            <UIcon name="i-lucide-hash" class="size-5" />
            <h3 class="font-semibold text-sm">Waitlist ID</h3>
          </div>
          <p class="text-sm text-dimmed mb-4">Use this ID in API requests.</p>
          <div class="flex items-center gap-2 p-3 bg-elevated rounded-lg border border-default">
            <code class="flex-1 text-sm font-mono">{{ waitlistId || 'No waitlist selected' }}</code>
            <UButton
              :icon="copied === 'waitlistId' ? 'i-lucide-check' : 'i-lucide-copy'"
              :color="copied === 'waitlistId' ? 'success' : 'neutral'"
              variant="ghost"
              size="xs"
              :disabled="!waitlistId"
              @click="copyToClipboard(waitlistId, 'waitlistId')"
            />
          </div>
        </UPageCard>
      </div>

      <UPageCard variant="subtle">
        <div class="flex items-center gap-2 mb-2">
          <UIcon name="i-lucide-code" class="size-5" />
          <h3 class="font-semibold text-sm">Embed Code</h3>
        </div>
        <p class="text-sm text-dimmed mb-4">Copy this code to embed the waitlist widget on your website.</p>

        <pre class="bg-elevated p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono border border-default">{{ embedCode }}</pre>

        <div class="flex gap-2 mt-4">
          <UButton
            :icon="copied === 'embedCode' ? 'i-lucide-check' : 'i-lucide-copy'"
            :color="copied === 'embedCode' ? 'success' : 'neutral'"
            variant="outline"
            @click="copyToClipboard(embedCode, 'embedCode')"
          >
            {{ copied === 'embedCode' ? 'Copied!' : 'Copy Embed Code' }}
          </UButton>

          <UButton
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            :to="`/join/${waitlistId}`"
            target="_blank"
          >
            Preview
          </UButton>
        </div>
      </UPageCard>
    </div>
  </div>
</template>
