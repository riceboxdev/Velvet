export default defineNuxtRouteMiddleware(async (to) => {
    const authStore = useAuthStore()

    // Initialize auth state if not already done
    if (!authStore.initialized) {
        authStore.initAuth()
    }

    // Public routes that don't require authentication
    const publicRoutes = ['/', '/login', '/signup', '/pricing', '/auth/action']

    // Check if the current route is public
    const isPublicRoute = publicRoutes.some(route =>
        to.path === route || to.path.startsWith('/auth/')
    )

    // If user is not authenticated and tries to access a protected route
    if (!authStore.user && !isPublicRoute) {
        return navigateTo('/login')
    }

    // If user is authenticated and tries to access auth pages (login/signup)
    if (authStore.user && (to.path === '/login' || to.path === '/signup')) {
        return navigateTo('/dashboard')
    }
})
