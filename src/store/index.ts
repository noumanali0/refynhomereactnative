// src/store/index.ts (or wherever your store file lives)

import { Action, configureStore, ThunkAction } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import vendorReducer from './slices/vendorSlice';
import bookingReducer from './slices/bookingSlice';
import reviewReducer from './slices/reviewSlice';
import offersReducer from './slices/offersSlice';

// ⭐ NEW: Import our newly created slice
import requestsReducer from './slices/requestsSlice';
import subscriptionReducer from './slices/subscriptionSlice';
// WebSocket dispatch slice for real-time features
import dispatchReducer from './slices/dispatchSlice';
// Customer service history slice
import serviceHistoryReducer from './slices/serviceHistorySlice';
// Vendor job history slice
import vendorHistoryReducer from './slices/vendorHistorySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vendor: vendorReducer,
    booking: bookingReducer,
    review: reviewReducer,
    offers: offersReducer,

    // ⭐ Add vendor live requests slice
    requests: requestsReducer,

    // ⭐ Add vendor subscription slice
    subscription: subscriptionReducer,

    // ⭐ WebSocket real-time dispatch
    dispatch: dispatchReducer,

    // ⭐ Customer service request history
    serviceHistory: serviceHistoryReducer,

    // ⭐ Vendor job history
    vendorHistory: vendorHistoryReducer,
  },

  // Environment-specific middleware configuration
  middleware: (getDefaultMiddleware) => {
    const baseConfig = {
      serializableCheck: {
        ignoredActions: [
          // ignore non-serializable actions coming from live mock generator
          'requests/startReceiving',
          'requests/stopReceiving',
        ],
        ignoredPaths: [
          // Ignore Set object in state (used for O(1) service category lookups)
          'requests.vendorServiceCategories',
        ],
        // Development: Warn after 128ms, Production: Warn after 512ms
        warnAfter: __DEV__ ? 128 : 512,
      },
      // Development: Enable immutability checks, Production: Disable for performance
      immutabilityCheck: __DEV__
        ? { warnAfter: 128 }
        : false,
    };

    return getDefaultMiddleware(baseConfig);
  },

  // Redux DevTools configuration
  devTools: __DEV__
    ? {
        name: 'RefynHome',
        trace: true,
        traceLimit: 25,
      }
    : false,
});

// ---------------- TYPES ----------------

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
