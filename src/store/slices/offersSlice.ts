import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface VendorOffer {
    id: string;
    name: string;
    distance: number;
    eta: number;
    price: number;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    rating: number;
    avatarUrl?: string;
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

        addOffer: (state, action: PayloadAction<VendorOffer>) => {
            if (state.isReceivingOffers && !state.acceptedOffer) {
                state.offers.push(action.payload);
            }
        },

        acceptOffer: (state, action: PayloadAction<VendorOffer>) => {
            state.acceptedOffer = action.payload;
            state.isReceivingOffers = false;
        },

        updateVendorLocation: (
            state,
            action: PayloadAction<{ id: string; coordinates: { latitude: number; longitude: number } }>
        ) => {
            if (state.acceptedOffer && state.acceptedOffer.id === action.payload.id) {
                state.acceptedOffer.coordinates = action.payload.coordinates;
            }
        },

        cancelRequest: (state) => {
            state.requestCanceled = true;
            state.isReceivingOffers = false;
            state.offers = [];
            state.acceptedOffer = null;
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
} = offersSlice.actions;

export default offersSlice.reducer;
