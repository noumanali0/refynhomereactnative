# RefynHome - Complete Application Documentation

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Application Overview](#2-application-overview)
3. [User Roles](#3-user-roles)
4. [Customer Journey](#4-customer-journey)
5. [Vendor Journey](#5-vendor-journey)
6. [Real-Time Features](#6-real-time-features)
7. [Security & Authentication](#7-security--authentication)
8. [Subscription System](#8-subscription-system)
9. [Feature Summary](#9-feature-summary)

---

## 1. Executive Summary

**RefynHome** is a mobile marketplace application that connects customers with verified home service professionals. The app enables customers to request home repair and maintenance services, receive real-time proposals from nearby vendors, track vendor arrival, and rate completed services.

### Key Value Propositions

| For Customers | For Vendors |
|---------------|-------------|
| Quick service discovery | Access to nearby customers |
| Real-time vendor proposals | Flexible work opportunities |
| Live location tracking | Easy job management |
| Transparent pricing | Rating & review system |
| Verified professionals | Subscription-based growth |

### Supported Service Categories
- AC Repair & Installation
- Refrigerator Repair
- Washing Machine Repair
- Plumbing Services
- Electrical Services
- Kitchen Appliances
- Geyser/Water Heater Repair
- Microwave Repair
- TV Repair
- Other Home Services

---

## 2. Application Overview

### Platform
- **Mobile App**: React Native (iOS & Android)
- **Backend**: Django REST API
- **Real-Time**: WebSocket for live updates

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RefynHome Mobile App                     │
├──────────────────────────┬──────────────────────────────────┤
│     Customer Dashboard   │        Vendor Dashboard          │
├──────────────────────────┴──────────────────────────────────┤
│                    Shared Components                         │
│         (Authentication, Maps, Chat, Notifications)         │
├─────────────────────────────────────────────────────────────┤
│                    Real-Time WebSocket                       │
│        (Live Proposals, Location Tracking, Updates)         │
├─────────────────────────────────────────────────────────────┤
│                     Django REST Backend                      │
│        (User Management, Service Requests, Payments)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. User Roles

### 3.1 Customer
A user who needs home services. Customers can:
- Create service requests
- Receive and compare vendor proposals
- Accept/decline offers
- Track vendor arrival in real-time
- Rate and review completed services
- Save favorite vendors

### 3.2 Vendor (Service Provider)
A verified professional who provides home services. Vendors can:
- Complete verification process (CNIC, photo ID)
- Receive nearby service requests
- Send proposals with pricing
- Manage active jobs
- Track earnings and history
- Build reputation through ratings

### 3.3 Admin (Backend)
System administrator who:
- Verifies vendor documents
- Manages user accounts
- Monitors platform activity
- Handles disputes

---

## 4. Customer Journey

### 4.1 Complete Customer Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Sign Up    │────▶│   Verify     │────▶│    Home      │
│  (Phone+OTP) │     │    OTP       │     │   Screen     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────────────┐
│                    HOME SCREEN                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Welcome, [Name]!                    [Location Icon] │ │
│  │  Current City: Karachi                               │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  ╔═══════════════════════════════════════════════╗  │ │
│  │  ║     REQUEST A SERVICE                         ║  │ │
│  │  ║     Get instant proposals from vendors        ║  │ │
│  │  ║                    [START]                    ║  │ │
│  │  ╚═══════════════════════════════════════════════╝  │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Recent Services                                     │ │
│  │  • AC Repair - Completed ✓                          │ │
│  │  • Plumbing - In Progress...                        │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Service Request Creation

**Step 1: Select Service Category**
- Choose from available categories (AC, Plumbing, Electrical, etc.)

**Step 2: Describe the Problem**
- Enter a title (e.g., "AC not cooling")
- Provide detailed description
- Optionally attach photos

**Step 3: Set Location**
- Use current GPS location, OR
- Search and select address manually

**Step 4: Submit Request**
- Agree to terms & conditions
- Submit and wait for vendor proposals

```
┌─────────────────────────────────────────────────────┐
│            CREATE SERVICE REQUEST                    │
├─────────────────────────────────────────────────────┤
│  Service Category:  [AC Repair          ▼]          │
├─────────────────────────────────────────────────────┤
│  Problem Title:                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ AC not cooling properly                        │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  Description:                                        │
│  ┌───────────────────────────────────────────────┐  │
│  │ The AC turns on but doesn't blow cold air.    │  │
│  │ Making a strange noise when starting.         │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  Location:                                           │
│  📍 Block 5, Clifton, Karachi            [Change]   │
├─────────────────────────────────────────────────────┤
│  📷 Add Photo (Optional)                  [+ Add]   │
├─────────────────────────────────────────────────────┤
│  ☑️ I agree to the terms and conditions             │
├─────────────────────────────────────────────────────┤
│           [    SUBMIT REQUEST    ]                   │
└─────────────────────────────────────────────────────┘
```

### 4.3 Live Proposals Screen

After submitting a request, the customer enters a real-time waiting screen:

```
┌─────────────────────────────────────────────────────┐
│              LIVE OFFERS                             │
│         ⏱️ Expires in: 4:32                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│     ┌─────────────────────────────────────────┐     │
│     │         [MAP VIEW]                       │     │
│     │                                          │     │
│     │    📍 Your Location                      │     │
│     │                                          │     │
│     │         🚗 Vendor 1                      │     │
│     │              🚗 Vendor 2                 │     │
│     │                                          │     │
│     └─────────────────────────────────────────┘     │
│                                                      │
├─────────────────────────────────────────────────────┤
│  PROPOSALS (3)                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ 👤 Ahmed Khan           ⭐ 4.8 (124 reviews)   ││
│  │ ✓ Verified              📍 2.3 km away         ││
│  │ 💰 Rs. 1,500           🕐 ETA: 15 mins         ││
│  │ ▓▓▓▓▓▓▓▓▓▓░░░░░░ 20s remaining                ││
│  │        [DECLINE]            [ACCEPT]           ││
│  └─────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────┐│
│  │ 👤 Hassan Ali           ⭐ 4.5 (89 reviews)    ││
│  │ ✓ Verified              📍 3.1 km away         ││
│  │ 💰 Rs. 1,200           🕐 ETA: 20 mins         ││
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 15s remaining                ││
│  │        [DECLINE]            [ACCEPT]           ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Key Features:**
- **5-minute window** to receive proposals
- **30-second timer** per proposal to accept/decline
- **Real-time updates** via WebSocket
- Each proposal shows:
  - Vendor name & photo
  - Verification status
  - Rating & review count
  - Price quote
  - Estimated arrival time (ETA)
  - Distance from customer

### 4.4 Vendor Tracking (After Acceptance)

Once a proposal is accepted, the customer can track the vendor in real-time:

```
┌─────────────────────────────────────────────────────┐
│              VENDOR EN ROUTE                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│     ┌─────────────────────────────────────────┐     │
│     │         [MAP VIEW]                       │     │
│     │                                          │     │
│     │    🚗 ──────────────▶ 📍                │     │
│     │   Vendor            Your Location        │     │
│     │                                          │     │
│     │   Route: 2.3 km | ETA: 8 mins           │     │
│     └─────────────────────────────────────────┘     │
│                                                      │
├─────────────────────────────────────────────────────┤
│  👤 Ahmed Khan                                       │
│  ⭐ 4.8 | 124 Jobs Completed                        │
│  📞 Call Vendor                                      │
├─────────────────────────────────────────────────────┤
│  Service: AC Repair                                  │
│  Price: Rs. 1,500                                   │
├─────────────────────────────────────────────────────┤
│           [    CANCEL SERVICE    ]                   │
│        (Disabled for first 60 seconds)              │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Live vendor location on map
- Real-time ETA updates
- Route visualization
- Contact vendor option
- Cancel option (disabled for 1 minute after acceptance)

### 4.5 Service Completion & Rating

After the service is completed:

```
┌─────────────────────────────────────────────────────┐
│           SERVICE COMPLETED ✓                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│     👤 Ahmed Khan                                    │
│     AC Repair Service                                │
│     Amount Paid: Rs. 1,500                          │
│                                                      │
├─────────────────────────────────────────────────────┤
│  How was your experience?                            │
│                                                      │
│         ☆  ☆  ☆  ☆  ☆                              │
│        Tap to rate                                   │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ Write a review (optional)                      │  │
│  │                                                │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ♡ Add to Favorites                                 │
│                                                      │
│           [    SUBMIT REVIEW    ]                   │
└─────────────────────────────────────────────────────┘
```

### 4.6 Service History

Customers can view all past services:

```
┌─────────────────────────────────────────────────────┐
│              SERVICE HISTORY                         │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │ Total: 12    Active: 1    Completed: 10         ││
│  └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│  Filter: [All ▼]                                    │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │ 🔧 AC Repair              [COMPLETED ✓]        ││
│  │ Dec 20, 2024                                    ││
│  │ Ahmed Khan | ⭐ 4.8                             ││
│  │ Rs. 1,500                                       ││
│  └─────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────┐│
│  │ 🔌 Electrical             [CANCELLED ✗]        ││
│  │ Dec 18, 2024                                    ││
│  │ Cancelled by: Customer                          ││
│  │ Reason: Found another vendor                    ││
│  └─────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────┐│
│  │ 🚿 Plumbing               [COMPLETED ✓]        ││
│  │ Dec 15, 2024                                    ││
│  │ Hassan Ali | ⭐ 4.5                             ││
│  │ Rs. 800                                         ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## 5. Vendor Journey

### 5.1 Complete Vendor Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Sign Up    │────▶│  Onboarding  │────▶│   Pending    │
│  (as Vendor) │     │    Form      │     │ Verification │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                              Admin Approves ─────┘
                                                  │
                     ┌────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────────────┐
│                  VENDOR DASHBOARD                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Requests │ │ History  │ │Subscribe │ │ Profile  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Vendor Onboarding

New vendors must complete verification:

```
┌─────────────────────────────────────────────────────┐
│            VENDOR ONBOARDING                         │
├─────────────────────────────────────────────────────┤
│  Step 1: Personal Information                        │
│  ┌───────────────────────────────────────────────┐  │
│  │ Full Name: [Ahmad Khan                      ] │  │
│  │ Email:     [ahmad@email.com                 ] │  │
│  │ CNIC:      [42201-1234567-1                 ] │  │
│  │ City:      [Karachi                       ▼] │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  Step 2: Verification Documents                      │
│                                                      │
│  ┌─────────────────┐    ┌─────────────────┐         │
│  │                 │    │                 │         │
│  │  Profile Photo  │    │   CNIC Photo    │         │
│  │    [Upload]     │    │    [Upload]     │         │
│  │                 │    │                 │         │
│  └─────────────────┘    └─────────────────┘         │
├─────────────────────────────────────────────────────┤
│  Step 3: Service Categories (Select at least 1)     │
│                                                      │
│  ☑️ AC Repair          ☐ Refrigerator               │
│  ☑️ Electrical         ☐ Washing Machine            │
│  ☐ Plumbing           ☐ Kitchen Appliances          │
│  ☐ Geyser Repair      ☐ Other                       │
├─────────────────────────────────────────────────────┤
│  Step 4: Professional Details                        │
│  ┌───────────────────────────────────────────────┐  │
│  │ Years of Experience: [5                     ] │  │
│  │ Bio: [Experienced technician with 5 years   ] │  │
│  │      [of expertise in AC and electrical...  ] │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│              [    SUBMIT FOR VERIFICATION    ]       │
└─────────────────────────────────────────────────────┘
```

**After Submission:**
- Status changes to "Pending Verification"
- Admin reviews documents
- Upon approval, vendor gets full dashboard access
- Verification badge appears on profile

### 5.3 Receiving Service Requests

Verified vendors receive nearby requests in real-time:

```
┌─────────────────────────────────────────────────────┐
│              SERVICE REQUESTS                        │
│  📍 Location: On   🔌 Status: Connected             │
├─────────────────────────────────────────────────────┤
│  3 Active Requests Nearby                            │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │ 🔧 AC Repair                   ⏱️ 4:12 left    ││
│  │ "AC not cooling"                                ││
│  │ 👤 Customer Name                                ││
│  │ 📍 2.3 km away                                  ││
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 70% time left                 ││
│  │            [VIEW DETAILS & SEND OFFER]          ││
│  └─────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────┐│
│  │ 🚿 Plumbing                    ⏱️ 2:45 left    ││
│  │ "Pipe leakage in kitchen"                       ││
│  │ 👤 Customer Name                                ││
│  │ 📍 4.1 km away                                  ││
│  │ ▓▓▓▓▓▓░░░░░░░░░░ 45% time left                 ││
│  │            [VIEW DETAILS & SEND OFFER]          ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Key Features:**
- Real-time request notifications via WebSocket
- Location-based matching (within service radius)
- Timer showing request expiry
- Distance from current location
- Category-based filtering

### 5.4 Sending a Proposal

When vendor views a request and wants to send an offer:

```
┌─────────────────────────────────────────────────────┐
│              REQUEST DETAILS                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│     ┌─────────────────────────────────────────┐     │
│     │         [MAP VIEW]                       │     │
│     │                                          │     │
│     │    🚗 You          📍 Customer           │     │
│     │    ────────────────▶                     │     │
│     │         2.3 km | ~12 mins               │     │
│     └─────────────────────────────────────────┘     │
│                                                      │
├─────────────────────────────────────────────────────┤
│  Category: AC Repair                                 │
│  Problem: AC not cooling properly                    │
│  Details: The AC turns on but doesn't blow          │
│           cold air. Making strange noise.           │
├─────────────────────────────────────────────────────┤
│  📍 Block 5, Clifton, Karachi                       │
│  ⏱️ Request expires in: 3:42                        │
├─────────────────────────────────────────────────────┤
│                SEND YOUR OFFER                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ Price (PKR):  [-] [ 1,500 ] [+]              │  │
│  │                                               │  │
│  │ Quick: [300] [500] [800] [1000]              │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ Message (optional):                           │  │
│  │ [I can fix this quickly...                  ] │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│              [    SEND PROPOSAL    ]                │
└─────────────────────────────────────────────────────┘
```

**After Sending:**
- Screen shows "Waiting for customer response"
- 2-minute window for customer to accept
- Cannot navigate away until response received
- Notification when accepted/rejected

### 5.5 Active Job Management

When a proposal is accepted:

```
┌─────────────────────────────────────────────────────┐
│              ACTIVE JOB                              │
│         ✓ Service Accepted                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│     ┌─────────────────────────────────────────┐     │
│     │         [MAP VIEW]                       │     │
│     │                                          │     │
│     │    🚗 ──────────────▶ 📍                │     │
│     │   You              Customer              │     │
│     │                                          │     │
│     │   Navigate: 2.3 km | ETA: 12 mins       │     │
│     └─────────────────────────────────────────┘     │
│                                                      │
├─────────────────────────────────────────────────────┤
│  👤 Customer Name                                    │
│  📞 +92 300 1234567                                 │
│  📍 Block 5, Clifton, Karachi                       │
├─────────────────────────────────────────────────────┤
│  Service: AC Repair                                  │
│  Your Quote: Rs. 1,500                              │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │       [    MARK AS COMPLETE    ]               ││
│  │       (Available when within 100m)              ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│           [    CANCEL JOB    ]                      │
└─────────────────────────────────────────────────────┘
```

**Job Lifecycle:**
1. **En Route** - Vendor traveling to customer
2. **Arrived** - Within 100m of customer location
3. **In Progress** - Service being performed
4. **Completed** - Vendor marks job complete

**Location Sharing:**
- Automatic location updates every 10 seconds
- Customer can track vendor on map
- Continues even if app is backgrounded

**Completion Rules:**
- Must be within 100 meters of service location
- Confirmation required before marking complete
- Automatic retry if connection fails

### 5.6 Vendor Profile

```
┌─────────────────────────────────────────────────────┐
│              MY PROFILE                              │
├─────────────────────────────────────────────────────┤
│                                                      │
│         ┌─────────┐                                 │
│         │  Photo  │  ● Online                       │
│         └─────────┘                                 │
│         Ahmad Khan                                   │
│         ✓ Verified Vendor                           │
│         📍 Karachi                                  │
│                                                      │
├─────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │   ⭐ 4.8   │ │ 📝 124     │ │ ✓ 156     │      │
│  │   Rating   │ │  Reviews   │ │   Jobs    │      │
│  └────────────┘ └────────────┘ └────────────┘      │
├─────────────────────────────────────────────────────┤
│  Rating Distribution                                 │
│  ⭐⭐⭐⭐⭐ ████████████████ 85%                    │
│  ⭐⭐⭐⭐   ████             12%                    │
│  ⭐⭐⭐     ██               2%                     │
│  ⭐⭐       █                1%                     │
│  ⭐                          0%                     │
├─────────────────────────────────────────────────────┤
│  Services Offered                                    │
│  [AC Repair] [Electrical] [Refrigerator]            │
├─────────────────────────────────────────────────────┤
│  Service Radius: 10 km                              │
├─────────────────────────────────────────────────────┤
│  Recent Reviews                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │ ⭐⭐⭐⭐⭐ "Excellent service, very professional"││
│  │ - Customer Name, Dec 20                         ││
│  └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│           [    EDIT PROFILE    ]                    │
└─────────────────────────────────────────────────────┘
```

**Editable Fields:**
- First Name, Last Name
- City
- Bio/Description
- Service Categories (min 1 required)
- Service Radius (1-15 km)
- Profile Photo

**Locked Fields (after verification):**
- Phone Number
- CNIC Number

### 5.7 Vendor History

```
┌─────────────────────────────────────────────────────┐
│              JOB HISTORY                             │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │ Completed: 156  │ This Month: 23  │ Earned: 45K ││
│  └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│  Filter: [All ▼]                                    │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │ 🔧 AC Repair              [COMPLETED ✓]        ││
│  │ Dec 20, 2024                                    ││
│  │ Customer: Ahmed | 📍 Clifton                    ││
│  │ 💰 Rs. 1,500                                    ││
│  │ ⭐⭐⭐⭐⭐ "Great work!"                         ││
│  └─────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────┐│
│  │ 🔌 Electrical             [CANCELLED ✗]        ││
│  │ Dec 18, 2024                                    ││
│  │ Customer: Hassan | 📍 DHA                       ││
│  │ Reason: Customer not available                  ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## 6. Real-Time Features

### 6.1 WebSocket Communication

The app uses WebSocket for instant updates:

| Event | Direction | Description |
|-------|-----------|-------------|
| Service Request | Server → Vendor | New nearby request |
| Proposal | Vendor → Customer | Price/ETA offer |
| Proposal Accepted | Customer → Vendor | Job confirmed |
| Proposal Declined | Customer → Vendor | Offer rejected |
| Location Update | Vendor → Customer | Live position |
| Job Completed | Vendor → Server | Service finished |
| Job Cancelled | Either → Server | Service cancelled |

### 6.2 Location Tracking

**For Customers:**
- GPS location for service address
- Optional: Use current location

**For Vendors:**
- Continuous location tracking when online
- Foreground: Every 30 seconds or 100m movement
- Background: Persistent tracking during active jobs
- Used for:
  - Matching with nearby requests
  - Customer can track vendor arrival
  - Proximity detection for job completion

### 6.3 Push Notifications (Planned)

- New service request nearby
- Proposal accepted/declined
- Vendor arrived
- Service completed
- Rating received

---

## 7. Security & Authentication

### 7.1 Authentication Methods

**Phone + OTP (Primary)**
```
┌─────────────────────────────────────────────────────┐
│              SIGN UP / LOGIN                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📱 Enter Phone Number                               │
│  ┌───────────────────────────────────────────────┐  │
│  │ +92 │ 300 1234567                             │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│           [    SEND OTP    ]                        │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Enter 6-digit OTP                                   │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐                           │
│  │1│ │2│ │3│ │4│ │5│ │6│                           │
│  └─┘ └─┘ └─┘ └─┘ └─┘ └─┘                           │
│                                                      │
│  Resend OTP in 60 seconds                           │
│                                                      │
│           [    VERIFY    ]                          │
└─────────────────────────────────────────────────────┘
```

**Password Login (Alternative)**
- For returning users
- Secure password storage

### 7.2 Token Management

- **Access Token**: Valid for 24 hours
- **Refresh Token**: Valid for 30 days
- **Auto-refresh**: Before expiry
- **Secure Storage**: Hardware-backed encryption

### 7.3 Session Security

- Tokens stored in device secure storage
- Automatic logout on token expiry
- Session restoration on app restart
- Logout clears all local data

### 7.4 Vendor Verification

- CNIC verification by admin
- Photo ID matching
- Document review process
- Verification badge on profile

---

## 8. Subscription System

### 8.1 Available Tiers (Planned)

| Tier | Price | Features |
|------|-------|----------|
| **Free** | Rs. 0 | Basic access, limited requests |
| **Silver** | Rs. 500/mo | Priority requests, analytics |
| **Gold** | Rs. 1,000/mo | Premium badge, 24/7 support |
| **Pro** | Rs. 2,000/mo | All features, top priority |

### 8.2 Tier Benefits

**Free Tier:**
- Receive service requests
- Basic profile
- Standard matching

**Silver Tier:**
- All Free features
- Priority in request queue
- Basic analytics dashboard
- Email support

**Gold Tier:**
- All Silver features
- Premium badge on profile
- Advanced analytics
- Phone support

**Pro Tier:**
- All Gold features
- Top priority matching
- Dedicated account manager
- Featured vendor listing

---

## 9. Feature Summary

### Customer Features

| Feature | Status | Description |
|---------|--------|-------------|
| Phone/OTP Auth | ✅ Live | Secure authentication |
| Create Request | ✅ Live | Service request with location |
| Live Proposals | ✅ Live | Real-time vendor offers |
| Accept/Decline | ✅ Live | Proposal management |
| Vendor Tracking | ✅ Live | Live map tracking |
| Service History | ✅ Live | Past services list |
| Rating & Review | ✅ Live | Rate vendors |
| Favorite Vendors | ✅ Live | Save preferred vendors |
| Profile Management | ✅ Live | Update personal info |

### Vendor Features

| Feature | Status | Description |
|---------|--------|-------------|
| Onboarding | ✅ Live | CNIC, photo verification |
| Receive Requests | ✅ Live | Real-time nearby requests |
| Send Proposals | ✅ Live | Price/ETA offers |
| Active Jobs | ✅ Live | Job management |
| Location Sharing | ✅ Live | Live tracking for customers |
| Job Completion | ✅ Live | Mark service complete |
| Profile Management | ✅ Live | Edit profile, categories |
| Service Radius | ✅ Live | Set coverage area |
| Job History | ✅ Live | Past jobs & earnings |
| Ratings & Reviews | ✅ Live | View customer feedback |
| Subscriptions | 🔄 Planned | Tier-based features |

### Platform Features

| Feature | Status | Description |
|---------|--------|-------------|
| Real-Time Updates | ✅ Live | WebSocket communication |
| Location Services | ✅ Live | GPS tracking |
| Secure Storage | ✅ Live | Encrypted token storage |
| Offline Recovery | ✅ Live | App state restoration |
| Background Location | ✅ Live | Track during active jobs |
| Push Notifications | 🔄 Planned | Real-time alerts |
| In-App Chat | 🔄 Planned | Customer-vendor messaging |
| Payment Integration | 🔄 Planned | Online payments |

---

## Document Information

| Field | Value |
|-------|-------|
| App Name | RefynHome |
| Version | 1.0.0 |
| Platform | iOS & Android |
| Documentation Date | December 2024 |
| Last Updated | December 23, 2024 |

---

*This documentation provides a comprehensive overview of the RefynHome application for client understanding. For technical implementation details, please refer to the codebase or contact the development team.*
