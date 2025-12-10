import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface VendorOffer {
    id: string;
    name: string;
    distance: number;
    eta: number;
    price: number;
    phone: number;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    rating: number;
    avatarUrl?: string;
    createdAt: number; // timestamp
    expiryTime: number; // timestamp in ms
}

export interface Coordinate {
    longitude: number;
    latitude: number;
}


interface OffersState {
    offers: VendorOffer[];
    acceptedOffer: VendorOffer | null;
    isReceivingOffers: boolean;
    requestCanceled: boolean;
}

const initialState: OffersState = {
    offers: [],
    acceptedOffer: null,
    isReceivingOffers: false,
    requestCanceled: false,
};

const offersSlice = createSlice({
    name: 'offers',
    initialState,
    reducers: {
        startReceivingOffers: (state) => {
            state.isReceivingOffers = true;
            state.offers = [];
            state.acceptedOffer = null;
            state.requestCanceled = false;
        },

        addOffer: (state, action) => {
            if (!state.isReceivingOffers || state.acceptedOffer) return;
            if (state.offers.length >= 3) return; // limit offers
            state.offers.push(action.payload);
        },


        acceptOffer: (state, action: PayloadAction<VendorOffer>) => {
            state.acceptedOffer = action.payload;
            state.isReceivingOffers = false;
        },

        updateVendorLocation: (
            state,
            action: PayloadAction<{ id: string; coordinates: { latitude: number; longitude: number }; distance: number | string; eta: number }>
        ) => {
            if (state.acceptedOffer && state.acceptedOffer.id === action.payload.id) {
                state.acceptedOffer.coordinates = action.payload.coordinates;
                state.acceptedOffer.distance = Number(action.payload.distance);
                state.acceptedOffer.eta = action.payload.eta
            }
        },

        cancelRequest: (state) => {
            state.requestCanceled = true;
            state.isReceivingOffers = false;
            state.offers = [];
            state.acceptedOffer = null;
        },

        removeOffersByIds: (state, action: PayloadAction<string>) => {
            // const idsToRemove = new Set(action.payload);
            state.offers = state.offers.filter((o) => o.id !== action.payload);
        },

        removeOutOfRangeOffers: (state, action) => {
            const idsToRemove = action.payload;
            state.offers = state.offers.filter(o => !idsToRemove.includes(o.id));
        },


        // fallback to fully reset if needed
        clearAllOffers: (state) => {
            state.offers = [];
        },

        resetOffers: (state) => {
            return initialState;
        },
    },
});

export const {
    startReceivingOffers,
    addOffer,
    acceptOffer,
    updateVendorLocation,
    cancelRequest,
    resetOffers,
    removeOffersByIds,
    clearAllOffers,
    removeOutOfRangeOffers
} = offersSlice.actions;

export default offersSlice.reducer;
