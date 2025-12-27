import { defineStore } from 'pinia'
import { useClerk, useUser, useAuth } from '@clerk/vue'
import { createClient } from '@supabase/supabase-js'

interface SubscriptionLimits {
    max_waitlists: number | null
    max_signups_per_month: number | null
    features: string[]
    plan_name: string
    has_subscription: boolean
}

interface User {
    id: string
    email: string
    name?: string
    photo_url?: string
    bio?: string
    website?: string
    company?: string
    is_admin?: boolean
}

export const useAuthStore = defineStore('auth', () => {
    // Helper to get API base
    const getApiBase = () => {
        const config = useRuntimeConfig()
        return config.public.apiBase as string
    }

    // Helper to get Supabase client
    const getSupabaseClient = () => {
        const config = useRuntimeConfig()
        return createClient(
            config.public.supabaseUrl as string,
            config.public.supabaseAnonKey as string
        )
    }

    // State
    const user = ref<User | null>(null)
    const subscription = ref<SubscriptionLimits | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)
    const initialized = ref(false)

    // Clerk composables - only use on client
    const getClerkAuth = () => {
        if (import.meta.client) {
            return useAuth()
        }
        return null
    }

    const getClerkUser = () => {
        if (import.meta.client) {
            return useUser()
        }
        return null
    }

    // Computed
    const isAuthenticated = computed(() => {
        const clerkAuth = getClerkAuth()
        return clerkAuth?.isSignedIn?.value && !!user.value
    })

    // Get session token for API calls
    async function getSessionToken(): Promise<string | null> {
        const clerkAuth = getClerkAuth()
        if (!clerkAuth?.isSignedIn?.value) return null
        try {
            // @ts-ignore - getToken is a computed ref in @clerk/vue
            return await clerkAuth.getToken.value() || null
        } catch (e) {
            console.error('Failed to get session token:', e)
            return null
        }
    }

    // Auth header computed - returns a promise
    async function getAuthHeader(): Promise<Record<string, string>> {
        const token = await getSessionToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
    }

    // Initialize auth listener
    function initAuth() {
        if (typeof window === 'undefined') return

        const clerkAuth = getClerkAuth()
        const clerkUser = getClerkUser()

        if (!clerkAuth || !clerkUser) return

        // Watch for auth state changes
        watch(() => clerkAuth.isSignedIn?.value, async (isSignedIn) => {
            if (isSignedIn && clerkUser.user?.value) {
                await fetchCurrentUser()
            } else {
                user.value = null
                subscription.value = null
            }
            initialized.value = true
        }, { immediate: true })
    }

    // Fetch current user from API
    async function fetchCurrentUser() {
        const clerkAuth = getClerkAuth()
        const clerkUser = getClerkUser()

        if (!clerkAuth?.isSignedIn?.value || !clerkUser?.user?.value) return null

        loading.value = true
        error.value = null

        try {
            const token = await getSessionToken()
            if (!token) {
                user.value = null
                return null
            }

            const res = await fetch(`${getApiBase()}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.status === 404) {
                // User doc doesn't exist, create it
                const createRes = await fetch(`${getApiBase()}/auth/create-user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: clerkUser.user.value.fullName || '',
                        email: clerkUser.user.value.primaryEmailAddress?.emailAddress || ''
                    })
                })

                if (!createRes.ok) {
                    throw new Error('Failed to create user')
                }

                const createData = await createRes.json()
                user.value = createData.data.user
                return user.value
            }

            if (!res.ok) {
                user.value = null
                return null
            }

            const data = await res.json()
            user.value = data.data.user
            subscription.value = data.data.subscription || null
            return user.value
        } catch (e: any) {
            error.value = e.message
            user.value = null
            return null
        } finally {
            loading.value = false
        }
    }

    // Logout
    async function logout() {
        try {
            const clerk = useClerk()
            if (clerk?.value) {
                await clerk.value.signOut()
            }
        } catch (e) {
            console.error('Logout error:', e)
        }
        user.value = null
        subscription.value = null
    }

    // Update profile
    async function updateProfile(updates: { name?: string; email?: string; bio?: string; website?: string; company?: string; photo_url?: string }) {
        const token = await getSessionToken()
        if (!token) throw new Error('Not authenticated')

        const res = await fetch(`${getApiBase()}/auth/profile`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        })

        if (!res.ok) {
            const data = await res.json()
            throw new Error(data.message || data.error || 'Failed to update profile')
        }

        const data = await res.json()
        user.value = data.data.user
        return user.value
    }

    // Upload profile photo to Supabase Storage
    async function uploadProfilePhoto(file: File) {
        const clerkUser = getClerkUser()
        if (!clerkUser?.user?.value) throw new Error('Not authenticated')

        const supabase = getSupabaseClient()
        const userId = clerkUser.user.value.id

        try {
            console.log('Starting upload...', {
                userId,
                fileName: file.name,
                fileSize: file.size
            })

            const fileExt = file.name.split('.').pop()
            const filePath = `avatars/${userId}/avatar.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) {
                throw uploadError
            }

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            const photoUrl = urlData.publicUrl
            console.log('Got public URL:', photoUrl)

            // Update user profile with new photo URL
            await updateProfile({ photo_url: photoUrl })

            return photoUrl
        } catch (e: any) {
            console.error('Upload error:', e)
            throw new Error('Failed to upload photo: ' + e.message)
        }
    }

    // Initialize on client
    if (import.meta.client) {
        initAuth()
    }

    return {
        // State
        user,
        subscription,
        loading,
        error,
        initialized,

        // Computed
        isAuthenticated,

        // Actions
        logout,
        fetchCurrentUser,
        updateProfile,
        uploadProfilePhoto,
        getSessionToken,
        getAuthHeader,
        initAuth
    }
})
