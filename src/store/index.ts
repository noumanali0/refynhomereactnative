import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import vendorReducer from './slices/vendorSlice';
import bookingReducer from './slices/bookingSlice';
import reviewReducer from './slices/reviewSlice';
import offersReducer from './slices/offersSlice';
export const store = configureStore({
  reducer: {
    auth: authReducer,
    vendor: vendorReducer,
    booking: bookingReducer,
    review: reviewReducer,
    offers: offersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
