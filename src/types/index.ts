export type UserRole = 'customer' | 'vendor';

export interface User {
  id: string;
  phoneNumber: string;
  role: UserRole;
  name: string;
  city: string;
  profilePhoto?: string;
}

export interface Customer extends User {
  role: 'customer';
  address: string;
  favoriteVendors: string[];
}

export interface Vendor extends User {
  role: 'vendor';
  cnic: string;
  serviceCategories: ServiceCategory[];
  rating: number;
  totalReviews: number;
  verified: boolean;
  isOnline: boolean;
  idVerificationUrl?: string;
  subscriptionTier?: 'basic' | 'premium';
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
