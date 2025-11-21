// src/services/types.ts
export type Coordinates = { latitude: number; longitude: number; };

export type LiveRequest = {
    id: string;
    serviceType: string; // e.g. 'plumber' or 'electrician'
    issue: string;
    customerName?: string;
    locationLabel?: string;
    coordinates: Coordinates;
    createdAt: number;
    expiresAt: number;
    visitCharges?: number;
    photos?: string[];
    customer?: CustomerRequestInfo;
};

export type CustomerRequestInfo = {
    id: string;
    name: string;
    phone?: string; // only visible after acceptance
    address: string;
    serviceRequested: string;
    urgencyLevel: 'low' | 'medium' | 'high';
    preferredTime?: string;
    additionalNotes?: string;
};

export type ProposalStatus = 'idle' | 'sending' | 'sent' | 'accepted' | 'rejected' | 'expired';

export type ActiveRequestDetail = {
    requestId: string;
    proposalAmount: number | null;
    proposalStatus: ProposalStatus;
    proposalExpiresAt: number | null;
    customerAccepted: boolean;
    customerPhone: string | null;
    vendorArrived: boolean;
};

export type RouteInfo = {
    distance: number; // in meters
    duration: number; // in seconds
    coordinates: Coordinates[];
};

// Export subscription types
export * from '@/types/subscription';
