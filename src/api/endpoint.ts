/**
* API endpoint definitions for Django REST backend integration
 * 
 * BASE_URL: https://your-backend.com/api
 * 
 * Authentication:
 * - POST /auth/login - {email, password} → {token, user}
 * - POST /auth/register - {role, email, password, ...} → {token, user}
 * - POST /auth/logout - {} → {success}
 * 
 * Services:
 * - GET /services - [] → Service[]
 * 
 * Requests:
 * - GET /requests?role={role}&status={status} → Request[]
 * - GET /requests/:id → Request
 * - POST /requests → Request
 * - PATCH /requests/:id → Request
 * 
 * Proposals:
 * - GET /requests/:id/proposals → Proposal[]
 * - POST /requests/:id/proposals → Proposal
 * - POST /proposals/:id/accept → Booking
 * - PATCH /proposals/:id → Proposal
 * 
 * Vendors:
 * - GET /vendors/:id → VendorProfile
 * - GET /vendors/:id/stats → VendorStats
 * - PATCH /vendors/:id → VendorProfile
 * - PATCH /vendors/:id/availability → {isOnline}
 * 
 * Plans & Subscriptions:
 * - GET /plans/customer → Plan[]
 * - GET /plans/vendor → Plan[]
 * - GET /subscriptions/current → Subscription
 * - POST /subscriptions/checkout → {sessionId} (Stripe)
 * - POST /subscriptions/webhook → {success} (Stripe webhook)
 * 
 * Admin:
 * - GET /admin/dashboard → {metrics}
 * - GET /admin/users → User[]
 * - PATCH /admin/users/:id → User
 */

export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
    },
    SERVICES: '/services',
    REQUESTS: '/requests',
    PROPOSALS: '/proposals',
    VENDORS: '/vendors',
    PLANS: '/plans',
    SUBSCRIPTIONS: '/subscriptions',
    ADMIN: '/admin',
};