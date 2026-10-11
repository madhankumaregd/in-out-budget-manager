# 💰 IN & OUT — Budget Manager & Database Observability Platform

A modern, high-performance personal budget management web application and administrative observability platform built with **React 19**, **Firebase (Auth & Firestore)**, and **Tailwind CSS 4**. Features instant offline cached reads, multi-layer security protections, atomic multi-account transfers, and a dedicated **Admin Portal** with real-time database quota and storage telemetry.

---

## ✨ Features Overview

### 👤 1. User Application Experience
* **Authentication & Onboarding:**
  * Email/Password signup and login via Firebase Auth.
  * One-tap Google OAuth sign-in.
  * Mandatory email verification & phone collection onboarding flow.
  * Profile customization with display name and preferred currency (**₹ INR**, **$ USD**, **€ EUR**, **£ GBP**).
* **Financial Dashboard:**
  * Instant financial overview: total balance, 30-day income, and 30-day expense summary cards.
  * Interactive monthly income vs. expense bar charts ([Recharts](https://recharts.org/)).
  * Expense category breakdown donut chart.
  * Quick-action modal triggers for income, expense, and transfer creation.
  * Drill-down modal inspection on summary cards.
* **Multi-Account Management:**
  * Support for Bank, Savings, Credit Card, and Cash accounts.
  * Balance trend line charts and recent transaction logs per account.
  * Insufficient balance protection preventing overdrafts.
  * Zero-balance deletion safety enforcement.
* **Smart Transactions & Split Transfers:**
  * Record income and expenses categorized with custom tags.
  * Single transfers or **multi-account split transfers** with atomic Firestore batch commits.
  * Real-time search and filtering by account, type, and date range.
  * Desktop data tables and mobile-responsive card lists.

---

### 🛡️ 2. Performance & Multi-Layer Security Architecture

* **Multi-Tab Persistent Offline Cache:**
  * Firestore configured with `persistentLocalCache` and `persistentMultipleTabManager`.
  * Repeated page visits load instantly (**~0ms**) from local IndexedDB cache before synchronizing in the background.
* **Elimination of N+1 Query Bottlenecks:**
  * Replaced sequential waterfall queries with parallelized `Promise.all` concurrent execution across subcollections.
* **Route Code-Splitting & Manual Chunk Splitting:**
  * Lazy-loaded route bundles with `React.lazy()` and `Suspense`.
  * Heavy dependencies (`firebase`, `recharts`, `framer-motion`, `lucide-react`, `router`) isolated into separate cached chunks via Vite.
* **Sliding-Window Rate Limiter:**
  * In-memory token bucket capping user mutations to **10 transactions per 60 seconds** to eliminate duplicate clicks and automated bot abuse.
* **Input Sanitization (XSS Prevention):**
  * Automated regex sanitization stripping `<script>`, `<iframe>`, javascript protocols, and HTML tags from all text inputs.
* **Device Fingerprinting & Registration Throttle:**
  * Canvas and browser trait fingerprint hashing.
  * Limits new account creation to **max 3 accounts per device per day** via Firestore tracking.
* **Re-Authentication Guard:**
  * Requires fresh password authentication or Google re-auth within 5 minutes for high-risk operations (such as "Delete All Users").
* **Hardened Cloud Firestore Security Rules:**
  * Schema enforcement at the database layer (strictly positive amounts, validated transaction types, and user document ownership).

---

### ⚡ 3. Dedicated Admin Portal (`/in-out-manager`)

Accessible at `/in-out-manager`, the Admin Control Center provides infrastructure and database telemetry:

* **Database & Infrastructure Observability:**
  * **Zero Financial Noise:** Pure database metrics—no income, expense, or currency figures.
  * **Document Reads Tracking:** Consumed reads vs. daily/weekly/monthly quota, remaining headroom, and percentage consumed.
  * **Document Writes Tracking:** Consumed writes vs. quota limits.
  * **Document Deletes Tracking:** Consumed deletes vs. quota limits.
* **Available vs. Occupied Storage Footprint:**
  * Visual stacked capacity meter representing **Occupied Storage** (e.g. `12.7 KB`, `0.0012%`) against total **Available Storage** (`1,024 MB / 1.00 GB` on the Firebase Spark Free Plan).
  * Interactive Donut chart displaying storage share by collection (`transactions`, `users`, `accounts`, `trash`, `apiKeys`, `rateLimits`, and `indexes`).
  * Detailed breakdown table with document counts, data sizes, and database percentage.
* **Dynamic Time Filters & Automatic Quota Scaling:**
  * **24 Hours (`days`):** 50,000 daily reads quota, 20,000 writes quota.
  * **7 Days (`week`):** 350,000 weekly reads quota, 140,000 writes quota.
  * **30 Days (`month`):** 1,500,000 monthly reads quota, 600,000 writes quota.
  * **Custom Range (`custom`):** Custom Start/End date picker that scales quotas dynamically (`N × 50k reads`, `N × 20k writes`).
* **Operation Timeline:**
  * Interactive Area Stream and Bar Column charts plotting Reads (Purple), Writes (Cyan), and Deletes (Rose) over time.
* **User Management (`/in-out-manager/users`):**
  * Search, sort, inspect subcollections, view balances, and safely delete accounts.
* **Trash Bin & Recovery (`/in-out-manager/trash`):**
  * Centralized trash bin with 30-day auto-expiry, item restoration, and permanent purge.
* **AI & External API Keys (`/in-out-manager/api-keys`):**
  * Secure API key generation with customizable rate limits and scopes for AI assistants and integrations.
* **System Settings & Danger Zone (`/in-out-manager/settings`):**
  * App version tracking, maintenance mode toggle, master password change, and re-authenticated "Delete All Data" action.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) | Component architecture & state management |
| **Build Tool** | [Vite 8](https://vite.dev/) (Rolldown) | Lightning-fast HMR & manual chunk bundling |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) | Modern utility styling & glassmorphic aesthetics |
| **Database & Auth** | [Firebase 12](https://firebase.google.com/) | Firestore with multi-tab persistence & Firebase Auth |
| **Charts & Visuals** | [Recharts 3](https://recharts.org/) | Area, Bar, Line, and Donut telemetry charts |
| **Animations** | [Framer Motion 12](https://www.framer.com/motion/) | Smooth layout transitions & micro-interactions |
| **Icons** | [Lucide React](https://lucide.dev/) | Interface iconography |
| **Routing** | [React Router DOM 7](https://reactrouter.com/) | Route code-splitting with nested admin layouts |
| **Notifications** | [react-hot-toast](https://react-hot-toast.com/) | Non-intrusive action toasts |

---

## 📂 Project Structure

```
in-out-budget-manager/
├── public/                     # Static assets (favicons, icons)
├── src/
│   ├── components/             # Reusable UI components & modals
│   │   ├── AddAccountModal.jsx
│   │   ├── AddTransactionModal.jsx
│   │   ├── ConfirmModal.jsx
│   │   ├── DashboardDetailModal.jsx
│   │   ├── Navigation.jsx
│   │   └── TransferModal.jsx
│   ├── contexts/               # React Context providers
│   │   ├── AuthContext.jsx     # User authentication & registration throttle
│   │   └── AdminContext.jsx    # Admin portal authentication & session management
│   ├── firebase/               # Firebase configuration & backend services
│   │   ├── firebase.js         # Multi-tab persistent cache & App Check initialization
│   │   ├── firestoreService.js # Rate-limited & sanitized user Firestore operations
│   │   └── adminService.js     # Parallelized DB analytics & admin operations
│   ├── pages/                  # Application views
│   │   ├── Accounts.jsx        # Account management & balance trends
│   │   ├── Dashboard.jsx       # Financial charts & quick actions
│   │   ├── Login.jsx           # User authentication form
│   │   ├── Onboarding.jsx      # Mandatory phone & verification setup
│   │   ├── Transactions.jsx    # Transaction history & filtering
│   │   └── admin/              # Dedicated Admin Portal routes
│   │       ├── AdminDashboard.jsx # Database Observability & storage analytics
│   │       ├── AdminUsers.jsx     # User management & account details
│   │       ├── AdminTrash.jsx     # Soft-deleted trash bin & restoration
│   │       ├── AdminApiKeys.jsx   # AI & external API key management
│   │       ├── AdminSettings.jsx  # System settings & Danger Zone
│   │       ├── AdminLayout.jsx    # Admin navigation & responsive sidebar
│   │       └── AdminLogin.jsx     # Admin authentication portal
│   ├── utils/                  # Security & performance utilities
│   │   ├── deviceFingerprint.js # Canvas fingerprinting & registration limiter
│   │   ├── rateLimiter.js       # Sliding-window transaction limiter (10/min)
│   │   ├── reauthGuard.js       # High-impact re-authentication check
│   │   ├── sanitizer.js         # Input sanitization against XSS
│   │   └── telemetryTracker.js  # Client-side DB operation logger
│   ├── App.jsx                 # Route code-splitting & lazy loading
│   └── main.jsx                # Application root
├── firestore.rules             # Hardened Firestore security rules
├── vite.config.js              # Vendor chunk isolation & bundle configuration
├── .gitignore                  # Strict database privacy & key protection
├── .env.example                # Environment variable setup template
└── package.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (version 18 or higher)
* [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
* A [Firebase Project](https://console.firebase.google.com/) with **Authentication** (Email/Password & Google) and **Cloud Firestore** enabled.

### 2. Clone the Repository
```bash
git clone https://github.com/madhankumaregd/in-out-budget-manager.git
cd in-out-budget-manager
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Fill in your Firebase credentials in `.env`:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_CURRENCY_SYMBOL=₹
```

> **Security Note:** `.env` and all secret key files are strictly ignored by `.gitignore` to prevent database credential leaks.

### 5. Deploy Firestore Security Rules
Deploy the hardened rules from `firestore.rules` using the Firebase CLI or copy them directly into the **Firebase Console -> Firestore Database -> Rules**:
```bash
firebase deploy --only firestore:rules
```

### 6. Run the Development Server
```bash
npm run dev
```
* **User Application:** `http://localhost:5173`
* **Admin Portal:** `http://localhost:5173/in-out-manager` (Default admin password: `admin123` or configurable in Admin Settings)

### 7. Build for Production
```bash
npm run build
```
Creates an optimized, chunk-split production bundle in `dist/`.

---

## 🔒 Privacy & Security Assurance

All sensitive credentials, service accounts, and environment files are strictly excluded from version control:
* `.env*` files are ignored via `.gitignore`.
* A clean `.env.example` template is provided for onboarding.
* Firestore rules enforce schema validation, positive amount checks, and authenticated owner writes.
* Device fingerprint throttles and rate limits prevent mass account creation and spam.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
