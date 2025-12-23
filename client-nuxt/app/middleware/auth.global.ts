export default defineNuxtRouteMiddleware(async (to) => {
    const authStore = useAuthStore()

    // Initialize auth state if not already done
    if (!authStore.initialized) {
        authStore.initAuth()

        // Wait for auth to initialize (max 5 seconds)
        const maxWait = 5000
        const checkInterval = 50
        let waited = 0

        while (!authStore.initialized && waited < maxWait) {
            await new Promise(resolve => setTimeout(resolve, checkInterval))
            waited += checkInterval
        }
    }

    // Public routes that don't require authentication
    const publicRoutes = ['/', '/auth', '/pricing', '/auth/action']

    // Check if the current route is public
    const isPublicRoute = publicRoutes.some(route =>
        to.path === route ||
        to.path.startsWith('/auth/') ||
        to.path.startsWith('/join/')
    )

    // If user is not authenticated and tries to access a protected route
    if (!authStore.user && !isPublicRoute) {
        return navigateTo('/auth')
    }

    // If user is authenticated and tries to access auth pages
    if (authStore.user && to.path === '/auth') {
        return navigateTo('/dashboard')
    }
})
