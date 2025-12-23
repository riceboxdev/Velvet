import { defineStore } from 'pinia'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    type User as FirebaseUser
} from 'firebase/auth'
import { useFirebaseAuth } from '~/plugins/firebase.client'

interface User {
    id: string
    email: string
    name?: string
    is_admin?: boolean
}

export const useAuthStore = defineStore('auth', () => {
    // Helper to get API base
    const getApiBase = () => {
        const config = useRuntimeConfig()
        return config.public.apiBase as string
    }

    // State
    const user = ref<User | null>(null)
    const firebaseUser = ref<FirebaseUser | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)
    const initialized = ref(false)

    // Computed
    const isAuthenticated = computed(() => !!firebaseUser.value && !!user.value)

    // Get ID token for API calls
    async function getIdToken(): Promise<string | null> {
        if (!firebaseUser.value) return null
        try {
            return await firebaseUser.value.getIdToken()
        } catch (e) {
            console.error('Failed to get ID token:', e)
            return null
        }
    }

    // Auth header computed - returns a promise
    async function getAuthHeader(): Promise<Record<string, string>> {
        const token = await getIdToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
    }

    // Initialize auth listener
    function initAuth() {
        if (typeof window === 'undefined') return

        const auth = useFirebaseAuth()
        if (!auth) return

        onAuthStateChanged(auth, async (fbUser) => {
            firebaseUser.value = fbUser

            if (fbUser) {
                // Fetch or create user document
                await fetchCurrentUser()
            } else {
                user.value = null
            }

            initialized.value = true
        })
    }

    // Signup with email and password
    async function signup(email: string, password: string, name = '') {
        loading.value = true
        error.value = null

        try {
            const auth = useFirebaseAuth()
            if (!auth) throw new Error('Firebase not initialized')

            const credential = await createUserWithEmailAndPassword(auth, email, password)
            firebaseUser.value = credential.user

            // Create user document in Firestore via API
            const token = await credential.user.getIdToken()
            const res = await fetch(`${getApiBase()}/auth/create-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || data.error || 'Failed to create user')
            }

            user.value = data.data.user
            return user.value
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // Login with email and password
    async function login(email: string, password: string) {
        loading.value = true
        error.value = null

        try {
            const auth = useFirebaseAuth()
            if (!auth) throw new Error('Firebase not initialized')

            const credential = await signInWithEmailAndPassword(auth, email, password)
            firebaseUser.value = credential.user

            // Fetch user document
            await fetchCurrentUser()

            return user.value
        } catch (e: any) {
            // Map Firebase error codes to user-friendly messages
            let message = e.message
            if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
                message = 'Invalid email or password'
            } else if (e.code === 'auth/too-many-requests') {
                message = 'Too many failed attempts. Please try again later.'
            }
            error.value = message
            throw new Error(message)
        } finally {
            loading.value = false
        }
    }

    // Fetch current user from API
    async function fetchCurrentUser() {
        if (!firebaseUser.value) return null

        loading.value = true
        error.value = null

        try {
            const token = await firebaseUser.value.getIdToken()
            const res = await fetch(`${getApiBase()}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (!res.ok) {
                user.value = null
                return null
            }

            const data = await res.json()
            user.value = data.data.user
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
            const auth = useFirebaseAuth()
            if (auth) {
                await signOut(auth)
            }
        } catch (e) {
            console.error('Logout error:', e)
        }
        firebaseUser.value = null
        user.value = null
    }

    // Update profile
    async function updateProfile(updates: { name?: string; email?: string }) {
        if (!firebaseUser.value) throw new Error('Not authenticated')

        const token = await firebaseUser.value.getIdToken()
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

    // Initialize on client
    if (import.meta.client) {
        // Delay initialization until Firebase plugin is ready
        setTimeout(() => initAuth(), 0)
    }

    return {
        // State
        user,
        firebaseUser,
        loading,
        error,
        initialized,

        // Computed
        isAuthenticated,

        // Actions
        signup,
        login,
        logout,
        fetchCurrentUser,
        updateProfile,
        getIdToken,
        getAuthHeader
    }
})
