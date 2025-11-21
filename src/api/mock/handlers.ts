import { mockUsers, mockVendorProfile, mockVendorStats, mockRequests, mockProposals, mockPlans, mockServiceCategories } from './data';

/**
 * Mock API handlers that simulate backend responses
 * Replace these with real API calls when connecting to Django REST backend
 */

export class MockAPI {
    private static delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Auth
    static async login(email: string, password: string) {
        await this.delay(500);

        const user = Object.values(mockUsers).find(u => u.email === email);
        if (!user || password !== 'demo123') {
            throw new Error('Invalid credentials');
        }

        return {
            token: `mock_token_${user.id}`,
            user,
        };
    }

    static async register(data: any) {
        await this.delay(500);
        return {
            token: 'mock_token_new',
            user: {
                id: 'new_user',
                ...data,
                createdAt: new Date().toISOString(),
            },
        };
    }

    // Services
    static async getServices() {
        await this.delay(300);
        return mockServiceCategories;
    }

    // Requests
    static async getRequests(params?: { role?: string; status?: string }) {
        await this.delay(400);
        return mockRequests;
    }

    static async getRequestById(id: string) {
        await this.delay(300);
        return mockRequests.find(r => r.id === id);
    }

    static async createRequest(data: any) {
        await this.delay(500);
        return {
            id: `req_${Date.now()}`,
            ...data,
            status: 'awaiting_proposals',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }

    // Proposals
    static async getProposals(requestId: string) {
        await this.delay(400);
        return mockProposals.filter(p => p.requestId === requestId);
    }

    static async createProposal(data: any) {
        await this.delay(500);
        return {
            id: `prop_${Date.now()}`,
            ...data,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };
    }

    static async acceptProposal(proposalId: string) {
        await this.delay(400);
        return {
            id: `booking_${Date.now()}`,
            proposalId,
            status: 'accepted',
            createdAt: new Date().toISOString(),
        };
    }

    // Vendor
    static async getVendorProfile(id: string) {
        await this.delay(300);
        return mockVendorProfile;
    }

    static async getVendorStats(vendorId: string) {
        await this.delay(300);
        return mockVendorStats;
    }

    static async updateVendorAvailability(vendorId: string, isOnline: boolean) {
        await this.delay(200);
        return { ...mockVendorProfile, isOnline };
    }

    // Plans
    static async getPlans(type: 'customer' | 'vendor') {
        await this.delay(300);
        return mockPlans[type];
    }

    static async createSubscription(data: any) {
        await this.delay(800);
        return {
            id: `sub_${Date.now()}`,
            ...data,
            status: 'active',
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
    }
}