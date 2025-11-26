# 🚀 Quick Reference Guide

## 📋 TL;DR - What You Need to Know

Your authentication infrastructure is **100% complete**. Just update 5 screens and you're done!

---

## ✅ What's Done

| Component | File | What It Does |
|-----------|------|--------------|
| API Types | `src/types/api.ts` | Django API interfaces |
| Token Management | `src/services/tokenService.ts` | SecureStore operations |
| API Client | `src/api/client.ts` | Axios with token injection |
| Auto Refresh | `src/api/interceptors.ts` | 401 error handling |
| Auth Service | `src/services/authService.ts` | Real API calls |
| Redux Slice | `src/store/slices/authSlice.ts` | State management |
| Validation | `src/utils/validation.ts` | Yup schemas |
| Hook | `src/hooks/useAuth.ts` | Easy component access |

---

## 📱 Screens to Update

### 1. **app/_layout.tsx** (2 minutes)
```typescript
import { initializeApiClient } from '@/api/client';
import { logoutUser, restoreSession } from '@store/slices/authSlice';

useEffect(() => {
  initializeApiClient(() => dispatch(logoutUser()));
  dispatch(restoreSession());
}, []);
```

### 2. **app/(auth)/signup.tsx** (15 minutes)
```typescript
import { signupUser } from '@store/slices/authSlice';
import { normalizePhoneNumber } from '@utils/validation';

const handleSignup = async () => {
  await dispatch(signupUser({
    phone: normalizePhoneNumber(phoneNumber),
    password,
    role: 'customer',
    first_name: firstName,
    last_name: lastName,
    address,
    city,
  })).unwrap();

  router.push('/(auth)/otp-login');
};
```

### 3. **app/(auth)/otp-login.tsx** (15 minutes)
```typescript
import { verifyOTP } from '@store/slices/authSlice';

const handleVerify = async () => {
  const result = await dispatch(
    verifyOTP({ phoneNumber, otp })
  ).unwrap();

  if (result.status === 'onboarding_required') {
    router.replace('/(auth)/vendor-onboarding');
  } else {
    router.replace(result.user.role === 'customer'
      ? '/(customer)/(home)'
      : '/(vendor)/(servicerequests)'
    );
  }
};
```

### 4. **app/(auth)/login.tsx** (15 minutes)
**IMPORTANT:** Use password login, NOT OTP!

```typescript
import { loginUser } from '@store/slices/authSlice';

const handleLogin = async () => {
  await dispatch(loginUser({ phone, password })).unwrap();
  router.replace(user.role === 'customer'
    ? '/(customer)/(home)'
    : '/(vendor)/(servicerequests)'
  );
};
```

### 5. **app/(auth)/vendor-onboarding.tsx** (30 minutes)
```typescript
import { vendorOnboarding } from '@store/slices/authSlice';

const handleSubmit = async () => {
  await dispatch(vendorOnboarding({
    phone: phoneNumber,
    cnic,
    bio,
    address,
    city,
    profile_photo_base64: profilePhotoBase64,
    id_verification_photo_base64: idPhotoBase64,
    service_categories: selectedCategoryIds,
  })).unwrap();

  Alert.alert('Success', 'Pending admin verification');
  router.replace('/(auth)/login');
};
```

---

## 🔑 Important Functions

### Phone Normalization
```typescript
import { normalizePhoneNumber } from '@utils/validation';

// Input: "0300 1234567" or "+92 300 1234567"
// Output: "+923001234567"
const normalized = normalizePhoneNumber(phoneNumber);
```

### CNIC Formatting
```typescript
import { formatCNIC } from '@utils/validation';

// Input: "1234512345671"
// Output: "12345-1234567-1"
const formatted = formatCNIC(cnic);
```

### Error Handling
```typescript
import { getErrorMessage } from '@/api/client';

try {
  await dispatch(loginUser({ phone, password })).unwrap();
} catch (error) {
  Alert.alert('Error', getErrorMessage(error));
}
```

### Using Auth Hook
```typescript
import { useAuth } from '@hooks/useAuth';

const { user, isAuthenticated, isCustomer, isVendor, logout } = useAuth();

if (!isAuthenticated) return <LoginScreen />;
return <Text>Welcome {user?.name}!</Text>;
```

---

## 🔧 Environment Setup

### For Localhost (iOS Simulator)
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

### For Android Emulator
```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api
```

### For Physical Device
```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.XXX:8000/api
```
(Replace XXX with your computer's IP address)

---

## 🧪 Testing OTP

OTP codes are printed in backend logs (SMS is mocked):

```bash
docker-compose logs -f web

# Look for:
# SMS to +923001234567: Your OTP is: 123456
```

---

## 🐛 Quick Troubleshooting

| Error | Solution |
|-------|----------|
| "Network Error" | Check .env, ensure backend is running |
| "Token is invalid" | Clear app data and re-login |
| "Vendor not verified" | Admin must verify in backend |
| "OTP not received" | Check backend logs for OTP code |
| TypeScript errors | Run `npm run tsc --noEmit` |

---

## 📊 Backend Endpoints

### Customer Flow
```
POST /api/auth/signup/       → Register
POST /api/auth/otp-verify/   → Verify OTP
POST /api/auth/login/        → Login (password)
GET  /api/auth/me/           → Get profile
```

### Vendor Flow
```
POST /api/auth/signup/              → Register
POST /api/auth/otp-verify/          → Verify OTP
POST /api/auth/vendor-onboarding/   → Complete profile
POST /api/auth/login/               → Login (after admin verification)
```

### Token Management
```
POST /api/auth/refresh/      → Refresh access token (automatic)
```

---

## 🎯 Redux Thunks Available

### New Methods (Use These)
- `signupUser(payload)` - Register new user
- `requestOTP(phone)` - Send OTP
- `verifyOTP({ phone, otp })` - Verify OTP
- `loginUser({ phone, password })` - Login
- `vendorOnboarding(payload)` - Complete vendor profile
- `logoutUser()` - Logout
- `restoreSession()` - Restore on app start
- `fetchUserProfile()` - Refresh user data
- `refreshAccessToken()` - Refresh token (automatic)

### Legacy Methods (Still work)
- `sendLoginOTP(phone)` - Alias for requestOTP
- `sendSignupOTP(payload)` - Redirects to signupUser
- `resendOTP(phone)` - Alias for requestOTP

---

## 📚 Documentation Files

1. **IMPLEMENTATION_COMPLETE.md** - This summary
2. **SCREEN_INTEGRATION_GUIDE.md** - Detailed screen examples
3. **AUTHENTICATION_IMPLEMENTATION.md** - Full technical docs

---

## ⏱️ Time Estimate

- Screen updates: **1-2 hours**
- Testing: **1 hour**
- **Total: 2-3 hours to completion**

---

## ✨ You're Almost Done!

The hard work is complete. Just connect the UI screens and you have a production-ready authentication system! 🎉

**Start Here:**
1. Update `app/_layout.tsx` (2 min)
2. Update `app/(auth)/login.tsx` (15 min)
3. Test login flow
4. Continue with other screens

**Questions?** Check `SCREEN_INTEGRATION_GUIDE.md` for detailed examples!
