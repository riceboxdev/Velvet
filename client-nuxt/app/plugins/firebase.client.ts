import { initializeApp, getApps } from 'firebase/app'
import { getAuth, onAuthStateChanged, type Auth } from 'firebase/auth'

let auth: Auth

export default defineNuxtPlugin(async (nuxtApp) => {
    const config = useRuntimeConfig()

    // Firebase configuration from runtime config
    const firebaseConfig = {
        apiKey: config.public.firebaseApiKey,
        authDomain: config.public.firebaseAuthDomain,
        projectId: config.public.firebaseProjectId,
        storageBucket: config.public.firebaseStorageBucket,
        messagingSenderId: config.public.firebaseMessagingSenderId,
        appId: config.public.firebaseAppId
    }

    // Initialize Firebase
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    auth = getAuth(app)

    // Make auth available throughout the app
    nuxtApp.provide('auth', auth)

    // Wait for initial auth state
    await new Promise<void>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, () => {
            unsubscribe()
            resolve()
        })
    })
})

export const useFirebaseAuth = () => auth
