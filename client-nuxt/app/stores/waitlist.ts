import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

interface Signup {
    id: string
    email: string
    referral_count: number
    status: 'waiting' | 'verified' | 'admitted' | 'offboarded'
    position: number
    created_at: string
}

interface WaitlistStats {
    total_signups: number
    waiting: number
    verified: number
    admitted: number
    offboarded: number
}

interface Waitlist {
    id: string
    name: string
    description?: string
    api_key: string
    settings?: WaitlistSettings
    stats?: WaitlistStats
    created_at: string
}

interface WidgetSettings {
    submitButtonColor: string
    backgroundColor: string
    fontColor: string
    buttonFontColor: string
    borderColor: string
    darkMode: boolean
    transparent: boolean
    title: string
    successTitle: string
    successDescription: string
    signupButtonText: string
    removeLabels: boolean
    emailPlaceholder: string
    showBranding: boolean
    logoUrl: string | null
    bannerImageUrl: string | null
}

interface SocialSettings {
    sharingMessage: string
    enabledPlatforms: string[]
    ogTitle: string
    ogDescription: string
    ogImage: string | null
    socialLinks: {
        twitter: string
        facebook: string
        instagram: string
        linkedin: string
        pinterest: string
    }
    showSocialLinksOnWidget: boolean
}

interface QuestionItem {
    id: string
    question: string
    answers: string
    optional: boolean
}

interface ConnectorsSettings {
    zapier: { enabled: boolean }
    webhook: { url: string }
    slack: { enabled: boolean }
    hubspot: { enabled: boolean }
}

interface QuestionsSettings {
    hideHeader: boolean
    items: QuestionItem[]
}

interface WaitlistSettings {
    // General
    spotsSkippedOnReferral?: number
    hideSignupCount?: boolean
    hideTotalCount?: boolean
    rankByReferrals?: boolean
    closed?: boolean
    enableCaptcha?: boolean
    hideReferralLink?: boolean
    allowSignupDataUpdate?: boolean
    showLeaderboard?: boolean
    leaderboardSize?: number
    // Widget customization
    widget?: WidgetSettings
    social?: SocialSettings
    questions?: QuestionsSettings
    connectors?: ConnectorsSettings
}

export const useWaitlistStore = defineStore('waitlist', () => {
    // Helper to get API base - called inside functions to ensure proper context
    const getApiBase = () => {
        const config = useRuntimeConfig()
        return config.public.apiBase as string
    }

    // State
    const allWaitlists = ref<Waitlist[]>([])
    const currentWaitlist = ref<Waitlist | null>(null)
    const signups = ref<Signup[]>([])
    const stats = ref<WaitlistStats | null>(null)
    const leaderboard = ref<Signup[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Computed
    const totalSignups = computed(() => stats.value?.total_signups || 0)
    const hasWaitlists = computed(() => allWaitlists.value.length > 0)
    const hasApiKey = computed(() => !!currentWaitlist.value?.id)

    // Helper to get auth headers (async - uses Firebase ID token)
    async function getAuthHeaders(): Promise<Record<string, string>> {
        const authStore = useAuthStore()
        const token = await authStore.getIdToken()
        return {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
        }
    }

    // Actions
    async function fetchAllWaitlists() {
        loading.value = true
        error.value = null

        try {
            const headers = await getAuthHeaders()
            const res = await fetch(`${getApiBase()}/waitlists`, { headers })

            if (!res.ok) {
                throw new Error('Failed to fetch waitlists')
            }

            const data = await res.json()
            allWaitlists.value = data.data?.waitlists || []

            // Set current waitlist to first one if not set
            if (!currentWaitlist.value && allWaitlists.value.length > 0) {
                currentWaitlist.value = allWaitlists.value[0] ?? null
                stats.value = allWaitlists.value[0]?.stats || null
            }

            return allWaitlists.value
        } catch (e: any) {
            error.value = e.message
            console.error('Fetch waitlists error:', e)
            return []
        } finally {
            loading.value = false
        }
    }

    async function fetchWaitlist(id?: string) {
        const waitlistId = id || currentWaitlist.value?.id
        if (!waitlistId) return null

        loading.value = true
        error.value = null

        try {
            const headers = await getAuthHeaders()
            const res = await fetch(`${getApiBase()}/waitlists/${waitlistId}`, { headers })

            if (!res.ok) {
                throw new Error('Failed to fetch waitlist')
            }

            const data = await res.json()
            currentWaitlist.value = data.data?.waitlist
            stats.value = data.data?.waitlist?.stats

            return data.data?.waitlist
        } catch (e: any) {
            error.value = e.message
            console.error('Fetch waitlist error:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    async function switchWaitlist(waitlistId: string) {
        const waitlist = allWaitlists.value.find(w => w.id === waitlistId)
        if (waitlist) {
            currentWaitlist.value = waitlist
            stats.value = waitlist.stats || null
            return true
        }
        return false
    }

    async function createWaitlist(name: string, description = '') {
        loading.value = true
        error.value = null

        try {
            const headers = await getAuthHeaders()
            const res = await fetch(`${getApiBase()}/waitlists`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name, description })
            })

            if (!res.ok) {
                throw new Error('Failed to create waitlist')
            }

            const data = await res.json()

            // Refresh waitlists and switch to new one
            await fetchAllWaitlists()
            currentWaitlist.value = data.data?.waitlist
            stats.value = data.data?.waitlist?.stats || {}

            return data.data?.waitlist
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    async function updateWaitlistSettings(updates: Record<string, any>) {
        console.log('[Store] updateWaitlistSettings called', { waitlistId: currentWaitlist.value?.id, updates })
        if (!currentWaitlist.value?.id) {
            console.error('[Store] No current waitlist ID!')
            return null
        }

        try {
            const headers = await getAuthHeaders()
            console.log('[Store] Making PUT request to:', `${getApiBase()}/waitlists/${currentWaitlist.value.id}`)
            const res = await fetch(`${getApiBase()}/waitlists/${currentWaitlist.value.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updates)
            })

            console.log('[Store] Response status:', res.status)
            if (!res.ok) throw new Error('Failed to update waitlist')

            const data = await res.json()
            currentWaitlist.value = data.data?.waitlist

            return data.data?.waitlist
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    async function deleteWaitlist(id: string) {
        try {
            const headers = await getAuthHeaders()
            const res = await fetch(`${getApiBase()}/waitlists/${id}`, {
                method: 'DELETE',
                headers
            })

            if (!res.ok) throw new Error('Failed to delete waitlist')

            // Refresh and clear current if deleted
            await fetchAllWaitlists()
            if (currentWaitlist.value?.id === id) {
                currentWaitlist.value = allWaitlists.value[0] || null
                stats.value = currentWaitlist.value?.stats || null
            }

            return true
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    interface FetchSignupsOptions {
        limit?: number
        offset?: number
        sortBy?: string
        order?: 'ASC' | 'DESC'
        status?: string
    }

    async function fetchSignups(options: FetchSignupsOptions = {}) {
        if (!currentWaitlist.value?.id) return null

        loading.value = true
        error.value = null

        const params = new URLSearchParams({
            limit: String(options.limit || 50),
            offset: String(options.offset || 0),
            sortBy: options.sortBy || 'position',
            order: options.order || 'ASC'
        })

        if (options.status) params.append('status', options.status)

        try {
            const headers = await getAuthHeaders()
            const res = await fetch(
                `${getApiBase()}/signups/${currentWaitlist.value.id}?${params}`,
                { headers }
            )

            if (!res.ok) throw new Error('Failed to fetch signups')

            const data = await res.json()
            signups.value = data.data?.signups || []
            return data
        } catch (e: any) {
            error.value = e.message
            console.error('Fetch signups error:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    async function fetchLeaderboard(waitlistId: string, limit = 10) {
        loading.value = true

        try {
            // This is a public endpoint
            const res = await fetch(`${getApiBase()}/waitlist/${waitlistId}/leaderboard?limit=${limit}`)

            if (!res.ok) throw new Error('Failed to fetch leaderboard')

            const data = await res.json()
            leaderboard.value = data.data
            return data.data
        } catch (e: any) {
            error.value = e.message
            console.error('Fetch leaderboard error:', e)
            return []
        } finally {
            loading.value = false
        }
    }

    async function offboardSignup(signupId: string) {
        if (!currentWaitlist.value?.id) return null

        try {
            const headers = await getAuthHeaders()
            const res = await fetch(
                `${getApiBase()}/signups/${signupId}/offboard`,
                {
                    method: 'PUT',
                    headers
                }
            )

            if (!res.ok) throw new Error('Failed to offboard signup')

            const data = await res.json()

            // Update local state
            const index = signups.value.findIndex(s => s.id === signupId)
            if (index > -1) {
                signups.value[index] = data.data?.signup
            }

            return data.data?.signup
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    async function deleteSignup(signupId: string) {
        if (!currentWaitlist.value?.id) return null

        try {
            const headers = await getAuthHeaders()
            const res = await fetch(
                `${getApiBase()}/signups/${signupId}`,
                {
                    method: 'DELETE',
                    headers
                }
            )

            if (!res.ok) throw new Error('Failed to delete signup')

            // Remove from local state
            signups.value = signups.value.filter(s => s.id !== signupId)

            return true
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    function clearError() {
        error.value = null
    }

    function reset() {
        allWaitlists.value = []
        currentWaitlist.value = null
        signups.value = []
        stats.value = null
        leaderboard.value = []
        error.value = null
    }

    return {
        // State
        allWaitlists,
        currentWaitlist,
        signups,
        stats,
        leaderboard,
        loading,
        error,

        // Computed
        totalSignups,
        hasWaitlists,
        hasApiKey,

        // Actions
        sendTestEmail: async () => {
            if (!currentWaitlist.value?.id) return null
            const headers = await getAuthHeaders()
            const res = await fetch(`${getApiBase()}/waitlists/${currentWaitlist.value.id}/test-email`, {
                method: 'POST',
                headers
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to send test email')
            }
            return await res.json()
        },
        fetchAllWaitlists,
        fetchWaitlist,
        switchWaitlist,
        createWaitlist,
        updateWaitlistSettings,
        deleteWaitlist,
        fetchSignups,
        fetchLeaderboard,
        offboardSignup,
        deleteSignup,
        clearError,
        reset
    }
})
