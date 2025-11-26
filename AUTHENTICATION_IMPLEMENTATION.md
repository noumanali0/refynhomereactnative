# RefynHome Authentication Implementation Guide

## 🎯 Overview

Complete production-ready authentication system integrating your React Native/Expo frontend with Django backend.

**Status:** ✅ Core Infrastructure Complete (Phase 1-7)
**Remaining:** Auth Slice Updates & Screen Integration (Phase 8-9)

---

## ✅ What's Been Implemented

### Phase 1: Backend API Mapping & Types ✅

**Created Files:**
- ✅ [`src/types/api.ts`](src/types/api.ts) - Complete TypeScript interfaces matching Django backend
  - All request/response types
  - Error response types
  - JWT token types
  - Type guards for response checking

**Updated Files:**
- ✅ [`src/types/index.ts`](src/types/index.ts) - Updated User/Vendor types to match Django models
  - Added `admin` role support
  - Added subscription tiers (free, silver, gold, pro)
  - Added VendorProfile interface
  - Maintained backward compatibility with legacy field names

### Phase 2: Core Infrastructure ✅

**Created Files:**
- ✅ [`src/services/tokenService.ts`](src/services/tokenService.ts) - Complete token management
  - SecureStore integration with hardware-backed encryption
  - Token expiry tracking
  - Session management (save/restore/clear)
  - Web fallback to localStorage
  - Token refresh threshold checking

- ✅ [`src/api/interceptors.ts`](src/api/interceptors.ts) - Advanced request/response handling
  - Automatic token refresh on 401 errors
  - Request queuing during token refresh
  - Retry failed requests after refresh
  - Automatic logout on invalid refresh token

**Updated Files:**
- ✅ [`src/api/client.ts`](src/api/client.ts) - Fixed token injection
  - Fetches token from SecureStore (not `global.authToken`)
  - Async request interceptor
  - Enhanced error handling
  - Helper functions for error parsing

### Phase 3: API Endpoints ✅

**Created Files:**
- ✅ [`src/api/endpoints.ts`](src/api/endpoints.ts) - Complete endpoint definitions
  - All auth endpoints matching Django URLs
  - Service request endpoints
  - Category endpoints
  - Customer/Vendor dashboard endpoints
  - Helper functions (buildUrl, buildPath)
  - Backward compatibility with old endpoint structure

### Phase 4: Auth Service ✅

**Updated Files:**
- ✅ [`src/services/authService.ts`](src/services/authService.ts) - Replaced ALL mocks
  - ✅ `signup()` - POST /api/auth/signup/
  - ✅ `requestOTP()` - POST /api/auth/otp-request/
  - ✅ `verifyOTP()` - POST /api/auth/otp-verify/
  - ✅ `login()` - POST /api/auth/login/
  - ✅ `refreshToken()` - POST /api/auth/refresh/
  - ✅ `getProfile()` - GET /api/auth/me/
  - ✅ `vendorOnboarding()` - POST /api/auth/vendor-onboarding/
  - ✅ `logout()` - Local only (JWT is stateless)
  - ✅ Type conversion: Django API types → Frontend types
  - ✅ Backward compatibility methods

### Phase 5: Validation & Environment ✅

**Created Files:**
- ✅ [`src/utils/validation.ts`](src/utils/validation.ts) - Yup validation schemas
  - Login schema
  - Customer signup schema
  - Vendor signup schema
  - OTP verification schema
  - Vendor onboarding schema
  - Password reset schemas
  - Profile update schemas
  - Phone number formatting/normalization
  - CNIC formatting
  - Field validation helpers

**Updated Files:**
- ✅ [`.env`](.env) - Added backend URL configuration
  - `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api`
  - `EXPO_PUBLIC_SOCKET_URL=ws://localhost:8000`
  - Organized with comments

### Phase 6: Convenience Hooks ✅

**Created Files:**
- ✅ [`src/hooks/useAuth.ts`](src/hooks/useAuth.ts) - Auth convenience hook
  - Easy access to user, isAuthenticated, etc.
  - Role checks (isCustomer, isVendor, isAdmin)
  - Typed user access (customer, vendor)
  - OTP resend status
  - Logout function

---

## 🔄 Backend Authentication Flow

### Customer Flow
```
1. POST /api/auth/signup/
   { phone, password, role: "customer", first_name, last_name, address, city }
   → { status: "otp_required", phone }

2. POST /api/auth/otp-verify/
   { phone, code, purpose: "signup" }
   → { access, refresh, user, status: "onboarding_complete" }

3. ✅ Customer ready to use app
```

### Vendor Flow
```
1. POST /api/auth/signup/
   { phone, password, role: "vendor", first_name, last_name }
   → { status: "otp_required", phone }

2. POST /api/auth/otp-verify/
   { phone, code, purpose: "signup" }
   → { access, refresh, user, status: "onboarding_required" }

3. POST /api/auth/vendor-onboarding/
   { phone, cnic, bio, profile_photo, id_verification_photo, service_categories }
   → { status: "pending_verification", vendor_id }

4. [Admin verifies vendor in backend]

5. Vendor can login
```

### Login Flow
```
POST /api/auth/login/
{ phone, password }
→ { access, refresh, user }

✅ User authenticated
```

### Token Refresh Flow
```
When access token expires (24 hours):

1. API request returns 401
2. Interceptor catches 401
3. POST /api/auth/refresh/ with refresh token
4. Receive new access token
5. Retry original request
6. Success!
```

---

## 📁 New File Structure

```
src/
├── api/
│   ├── client.ts                    ✅ UPDATED (token from SecureStore)
│   ├── endpoints.ts                 ✅ NEW (Django endpoint definitions)
│   └── interceptors.ts              ✅ NEW (token refresh logic)
├── services/
│   ├── authService.ts               ✅ UPDATED (real API calls)
│   └── tokenService.ts              ✅ NEW (SecureStore token management)
├── store/
│   └── slices/
│       └── authSlice.ts             ⚠️ NEEDS UPDATE (next phase)
├── types/
│   ├── index.ts                     ✅ UPDATED (Django-aligned types)
│   └── api.ts                       ✅ NEW (API request/response types)
├── hooks/
│   └── useAuth.ts                   ✅ NEW (convenience hook)
└── utils/
    └── validation.ts                ✅ NEW (Yup schemas)
```

---

## ⚠️ Remaining Work

### Phase 8: Update Auth Slice (CRITICAL)

**File:** `src/store/slices/authSlice.ts`

**Required Updates:**

1. **Update Async Thunks:**
   ```typescript
   // Current: Uses mock authService methods
   // Update to: Use new authService methods with proper typing

   // Add new thunks:
   - signupUser (POST /api/auth/signup/)
   - verifySignupOTP (POST /api/auth/otp-verify/)
   - loginUser (POST /api/auth/login/ - not OTP based!)
   - vendorOnboarding (POST /api/auth/vendor-onboarding/)
   - refreshAccessToken (POST /api/auth/refresh/)
   - fetchUserProfile (GET /api/auth/me/)
   ```

2. **Store Refresh Token:**
   ```typescript
   // Currently only stores access token
   // Update to store both access and refresh tokens

   interface AuthState {
     // ... existing fields
     refreshToken: string | null; // ADD THIS
   }
   ```

3. **Update User Type:**
   ```typescript
   // Change from:
   user: Customer | Vendor | null;

   // To support admin:
   user: Customer | Vendor | Admin | null;
   ```

4. **Handle Backend Error Format:**
   ```typescript
   // Django REST Framework returns:
   { detail: "error message" }
   // or
   { field_name: ["error1", "error2"] }
   ```

5. **Update Session Restoration:**
   ```typescript
   // Load both access and refresh tokens
   const tokens = await tokenService.getTokens();
   ```

### Phase 9: Update Auth Screens

**Files to Update:**

1. **`app/(auth)/signup.tsx`**
   - Use new `authService.signup()` method
   - Handle backend validation errors
   - Navigate to OTP screen on success
   - Separate customer/vendor flows

2. **`app/(auth)/otp-login.tsx`**
   - Use new `authService.verifyOTP()` method
   - Handle `onboarding_complete` vs `onboarding_required` status
   - Store both access and refresh tokens
   - Navigate based on status

3. **`app/(auth)/login.tsx`**
   - Update to phone + password login (NO OTP!)
   - Use `authService.login()` method
   - Handle vendor verification errors (403)

4. **`app/(auth)/vendor-setup.tsx`** (or create vendor-onboarding.tsx)
   - Use `authService.vendorOnboarding()` method
   - Handle image uploads (multipart form data)
   - Service category selection
   - CNIC input
   - Show "pending verification" message

5. **`app/_layout.tsx`**
   - Initialize API interceptors: `initializeApiClient(logoutCallback)`
   - Update session restoration to use tokenService

---

## 🔧 Configuration Required

### 1. Environment Variables

**Development (.env):**
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

**Production (.env.production):**
```bash
EXPO_PUBLIC_API_BASE_URL=https://api.refynhome.com
```

### 2. Backend Server

**Make sure your Django backend is running:**
```bash
cd backend/refynhomedjango
docker-compose up --build
```

**Backend should be accessible at:**
- http://localhost:8000/api

### 3. Initialize API Client

**In `app/_layout.tsx`, add:**
```typescript
import { initializeApiClient } from '@/api/client';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { logoutUser } from '@store/slices/authSlice';

// Inside component:
const dispatch = useAppDispatch();

useEffect(() => {
  // Initialize API interceptors with logout callback
  initializeApiClient(() => {
    dispatch(logoutUser());
  });
}, []);
```

---

## 🧪 Testing Checklist

### Customer Flow Testing
- [ ] Signup with phone, password, address, city
- [ ] Receive and verify OTP
- [ ] Verify tokens are stored in SecureStore
- [ ] Navigate to customer home screen
- [ ] Logout
- [ ] Login with phone and password
- [ ] Session restoration on app restart

### Vendor Flow Testing
- [ ] Signup with phone and password (no address/city)
- [ ] Receive and verify OTP
- [ ] Complete vendor onboarding (CNIC, photos, categories)
- [ ] Verify "pending verification" message
- [ ] Admin verifies vendor (backend)
- [ ] Login successfully
- [ ] Session restoration on app restart

### Token Refresh Testing
- [ ] Wait for access token to expire (or manually invalidate)
- [ ] Make API request
- [ ] Verify automatic token refresh
- [ ] Verify request retry after refresh
- [ ] Verify queued requests during refresh

### Error Handling Testing
- [ ] Invalid phone number
- [ ] Wrong password
- [ ] Expired OTP
- [ ] Network failure
- [ ] Invalid refresh token (should logout)
- [ ] Vendor not verified (403 error on login)
- [ ] Backend validation errors

---

## 📚 Usage Examples

### Using Auth in Components

```typescript
import { useAuth } from '@hooks/useAuth';

export default function ProfileScreen() {
  const { user, isAuthenticated, isCustomer, isVendor, logout } = useAuth();

  if (!isAuthenticated) {
    return <Text>Please login</Text>;
  }

  return (
    <View>
      <Text>Welcome {user?.name}!</Text>
      <Text>Role: {user?.role}</Text>

      {isVendor && (
        <Text>Rating: {user?.vendor_profile?.average_rating}</Text>
      )}

      <Button title="Logout" onPress={logout} />
    </View>
  );
}
```

### Making Authenticated API Calls

```typescript
import { apiClient } from '@/api/client';
import { SERVICE_REQUEST_ENDPOINTS } from '@/api/endpoints';

async function createServiceRequest(data) {
  try {
    const response = await apiClient.post(
      SERVICE_REQUEST_ENDPOINTS.CREATE,
      data
    );
    return response.data;
  } catch (error) {
    console.error('Failed to create request:', error);
    throw error;
  }
}
```

### Form Validation

```typescript
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginSchema } from '@utils/validation';

export default function LoginForm() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    // data.phone and data.password are validated
    await authService.login(data.phone, data.password);
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      {/* Your form fields */}
    </Form>
  );
}
```

---

## 🚀 Quick Start Guide

### 1. Start Backend Server

```bash
cd backend/refynhomedjango
docker-compose up
```

### 2. Verify Backend is Running

Open browser: http://localhost:8000/api/ping/

### 3. Start Expo App

```bash
npx expo start
```

### 4. Test Login Flow

1. Open app in simulator/device
2. Go to signup screen
3. Enter phone number and password
4. Verify OTP (check backend logs for OTP code)
5. Complete onboarding
6. Verify you're logged in

---

## 🔐 Security Features

✅ **Implemented:**
- Hardware-backed token storage (SecureStore)
- Automatic token refresh
- Request queuing during token refresh
- Secure password validation
- HTTPS ready (configure in production)
- JWT token expiry handling

📋 **Recommended Additions:**
- Rate limiting on auth endpoints
- Biometric authentication (Face ID/Touch ID)
- Certificate pinning
- Request signing
- Jailbreak/root detection

---

## 📖 API Documentation Reference

See complete backend API documentation in the analysis report from earlier, including:
- All endpoint URLs
- Request/response formats
- Error codes and messages
- Authentication flow diagrams
- Token configuration

---

## 🐛 Troubleshooting

### "Network Error" or "Connection Refused"

**Problem:** Can't connect to backend
**Solution:**
```bash
# Check backend is running
docker-compose ps

# Check .env file has correct URL
cat .env | grep API_BASE_URL

# For iOS simulator, use:
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api

# For Android emulator, use:
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api

# For physical device, use your computer's IP:
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8000/api
```

### "Token is invalid or expired"

**Problem:** 401 errors on every request
**Solution:**
- Clear app data and re-login
- Check token is being saved to SecureStore
- Verify interceptors are initialized
- Check backend token lifetime settings

### "OTP not received"

**Problem:** No OTP code shown
**Solution:**
- Check backend logs: `docker-compose logs -f web`
- Backend prints OTP to console (SMS is mocked)
- Look for: `SMS to +92... Your OTP is: 123456`

### TypeScript Errors

**Problem:** Type errors in auth code
**Solution:**
```bash
# Restart TypeScript server
npm run tsc --noEmit

# Check for missing imports
# Verify all new files are in tsconfig paths
```

---

## 📞 Support

**Implementation Status:** Phase 1-7 Complete ✅
**Next Steps:** Update Auth Slice & Screens
**Estimated Time:** 2-3 hours for remaining phases

**Questions?** Check the comprehensive backend API documentation created earlier.

---

**Last Updated:** 2025-11-24
**Version:** 1.0
**Author:** Senior React Native Developer
