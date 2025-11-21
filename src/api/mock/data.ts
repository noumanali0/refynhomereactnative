// import { UserRole } from '../types/User';

export const mockUsers = {
    customer: {
        id: 'cust_1',
        email: 'customer@demo.com',
        role: "customer",
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        avatar: 'https://i.pravatar.cc/150?img=12',
        createdAt: '2024-01-15T10:00:00Z',
    },
    vendor: {
        id: 'vendor_1',
        email: 'vendor@demo.com',
        role: "vendor",
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567891',
        avatar: 'https://i.pravatar.cc/150?img=5',
        createdAt: '2024-01-10T10:00:00Z',
    },
    admin: {
        id: 'admin_1',
        email: 'admin@demo.com',
        role: "admin",
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567892',
        avatar: 'https://i.pravatar.cc/150?img=8',
        createdAt: '2024-01-01T10:00:00Z',
    },
};

export const mockVendorProfile = {
    id: 'vp_1',
    userId: 'vendor_1',
    businessName: 'Jane Smith Professional Services',
    bio: 'Experienced home service professional with 10+ years of expertise',
    city: 'San Francisco',
    rating: 4.8,
    reviewCount: 127,
    jobsCompleted: 234,
    responseRate: 95,
    isVerified: true,
    isGold: true,
    isOnline: true,
    services: ['AC Repair', 'HVAC Installation', 'Maintenance'],
    portfolio: [
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e',
    ],
    documents: [],
};

export const mockVendorStats = {
    pendingRequests: 5,
    activeJobs: 3,
    responseRate: 95,
    monthJobs: 18,
};

export const mockServiceCategories = [
    { id: '1', name: 'AC Repair', icon: 'wind' },
    { id: '2', name: 'Plumbing', icon: 'wrench' },
    { id: '3', name: 'Cleaning', icon: 'sparkles' },
    { id: '4', name: 'Painting', icon: 'palette' },
    { id: '5', name: 'Electrician', icon: 'zap' },
    { id: '6', name: 'Carpentry', icon: 'hammer' },
];

export const mockRequests = [
    {
        id: 'req_1',
        customerId: 'cust_1',
        serviceType: 'AC Repair',
        title: 'AC not cooling properly',
        description: 'My AC has stopped cooling effectively. Need urgent repair.',
        preferredDate: '2025-11-22T10:00:00Z',
        address: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            country: 'US',
            latitude: 37.7749,
            longitude: -122.4194,
        },
        photos: [],
        estimatedBudget: 200,
        status: 'proposals_received',
        createdAt: '2025-11-20T08:00:00Z',
        updatedAt: '2025-11-20T08:00:00Z',
        proposalCount: 3,
    },
    {
        id: 'req_2',
        customerId: 'cust_1',
        serviceType: 'Plumbing',
        title: 'Kitchen sink leak',
        description: 'Kitchen sink is leaking under the cabinet.',
        preferredDate: '2025-11-21T14:00:00Z',
        address: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            country: 'US',
            latitude: 37.7749,
            longitude: -122.4194,
        },
        photos: [],
        estimatedBudget: 150,
        status: 'awaiting_proposals',
        createdAt: '2025-11-20T09:00:00Z',
        updatedAt: '2025-11-20T09:00:00Z',
        proposalCount: 0,
    },
];

export const mockProposals = [
    {
        id: 'prop_1',
        requestId: 'req_1',
        vendorId: 'vendor_1',
        vendor: mockVendorProfile,
        price: 180,
        estimatedDuration: '2-3 hours',
        message: 'I can help fix your AC. I have 10 years of experience with similar issues.',
        status: 'pending',
        createdAt: '2025-11-20T09:30:00Z',
    },
];

export const mockPlans = {
    customer: [
        {
            id: 'plan_cust_free',
            type: 'customer_free',
            name: 'Free',
            price: 0,
            interval: 'month',
            features: [
                '3 service requests per month',
                'Basic support',
                'Standard response time',
            ],
            limits: { requests: 3 },
        },
        {
            id: 'plan_cust_silver',
            type: 'customer_silver',
            name: 'Silver',
            price: 9.99,
            interval: 'month',
            features: [
                '10 service requests per month',
                'Priority support',
                'Faster response time',
                'Request history',
            ],
            limits: { requests: 10 },
        },
        {
            id: 'plan_cust_gold',
            type: 'customer_gold',
            name: 'Gold',
            price: 19.99,
            interval: 'month',
            features: [
                'Unlimited service requests',
                'Premium support',
                'Instant matching',
                'Advanced analytics',
                'Dedicated account manager',
            ],
            limits: { requests: -1 },
        },
    ],
    vendor: [
        {
            id: 'plan_vendor_free',
            type: 'vendor_free',
            name: 'Free',
            price: 0,
            interval: 'month',
            features: [
                '5 proposals per month',
                'Basic profile',
                'Standard listing',
            ],
            limits: { proposals: 5 },
        },
        {
            id: 'plan_vendor_pro',
            type: 'vendor_pro',
            name: 'Pro',
            price: 29.99,
            interval: 'month',
            features: [
                'Unlimited proposals',
                'Featured profile',
                'Priority in search',
                'Analytics dashboard',
                'Marketing tools',
            ],
            limits: { proposals: -1 },
        },
    ],
};