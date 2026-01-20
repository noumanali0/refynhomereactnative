/**
 * User Types - Aligned with Django Backend
 * Updated to match backend/refynhomedjango/accounts/models.py
 */

export type UserRole = 'customer' | 'vendor' | 'admin';
export type SubscriptionTier = 'free' | 'silver' | 'gold' | 'pro';

/**
 * Vendor Profile Details
 * Matches Django VendorProfile model
 */
export interface VendorProfile {
  id: number;
  verified: boolean;
  cnic: string;
  city: string;
  bio: string;
  profilePhoto: string | null;
  idVerificationPhoto: string | null;
  latitude: string | null;
  longitude: string | null;
  serviceRadiusKm: string;
  locationUpdatedAt: string | null;
  averageRating: number;
  totalReviews: number;
  completedJobs: number;
  // Member since date (when vendor was approved)
  memberSince: string | null;
  // Active service requests count
  activeRequests: number;
  // Rating distribution from API
  rating_distribution?: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
  } | null;
  // Service categories from API
  categories?: Array<{ id: number; name: string; slug: string }>;
  // Legacy fields for backward compatibility
  rating?: number;
  isOnline?: boolean;
}

/**
 * Base User Interface
 * Matches Django User model
 */
export interface User {
  id: number;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  address: string;
  city: string;
  subscriptionTier: SubscriptionTier;
  favoriteVendors: User[];
  vendorProfile: VendorProfile | null;

  // Computed fields
  name?: string; // Computed from firstName + lastName

  // Legacy fields for backward compatibility
  phoneNumber?: string; // Alias for phone
  profilePhoto?: string; // Mapped from vendorProfile.profilePhoto
}

/**
 * Customer Interface
 * Extends User with customer-specific fields
 */
export interface Customer extends User {
  role: 'customer';
  favoriteVendors: User[];
  vendorProfile: null;
}

/**
 * Vendor Interface
 * Extends User with vendor-specific fields
 */
export interface Vendor extends User {
  role: 'vendor';
  vendorProfile: VendorProfile;

  // Legacy computed fields for backward compatibility
  cnic?: string; // Mapped from vendorProfile.cnic
  rating?: number; // Mapped from vendorProfile.averageRating
  totalReviews?: number; // Mapped from vendorProfile.totalReviews
  verified?: boolean; // Mapped from vendorProfile.verified
  isOnline?: boolean; // Not in backend, default to false
  idVerificationUrl?: string; // Mapped from vendorProfile.idVerificationPhoto
  serviceCategories?: ServiceCategory[]; // Loaded separately from backend
}

export type ServiceCategory = {
  id: string;
  label: string;
  icon: string;
}
// | 'AC Repair' 
// | 'Refrigerator Repair' 
// | 'Plumbing' 
// | 'Electrical' 
// | 'Washing Machine' 
// | 'Water Heater'
// | 'Microwave'
// | 'Other';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface Booking {
  id: string;
  customerId: string;
  vendorId: string;
  serviceCategory: ServiceCategory;
  scheduledDate: string;
  scheduledTime: string;
  status: BookingStatus;
  address: string;
  notes?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  vendorId: string;
  rating: number;
  comment: string;
  createdAt: string;
  customerName: string;
  customerPhoto?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AuthState {
  user: Customer | Vendor | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface VendorFilters {
  category?: ServiceCategory;
  verifiedOnly?: boolean;
  minRating?: number;
  searchQuery?: string;
}
