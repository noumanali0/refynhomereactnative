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
  },

  // (optional but recommended for production quality)
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // ignore non-serializable actions coming from live mock generator
          'requests/startReceiving',
          'requests/stopReceiving',
        ],
        ignoredPaths: [
          // Ignore Set object in state (used for O(1) service category lookups)
          'requests.vendorServiceCategories',
          // Ignore API service instance (contains functions/callbacks)
          'requests._apiService',
          'subscription._apiService',
        ],
      },
    }),
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


// import { configureStore } from '@reduxjs/toolkit';
// import authReducer from './slices/authSlice';
// import vendorReducer from './slices/vendorSlice';
// import bookingReducer from './slices/bookingSlice';
// import reviewReducer from './slices/reviewSlice';
// import offersReducer from './slices/offersSlice';
// export const store = configureStore({
//   reducer: {
//     auth: authReducer,
//     vendor: vendorReducer,
//     booking: bookingReducer,
//     review: reviewReducer,
//     offers: offersReducer,
//   },
// });

// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;
