# 💰 IN & OUT — Personal Budget Manager

A modern, full-featured personal budget management web app built with **React 19**, **Firebase**, and **Tailwind CSS 4**. Track income, expenses, and transfers across multiple accounts with rich visualizations and a polished, animated UI.

---

## ✨ Features

### 🔐 Authentication & Onboarding
- Email/password signup & login with Firebase Auth
- Google OAuth sign-in
- Email verification flow
- Phone number collection during onboarding
- Profile setup with display name and preferred currency
- Password reset via email

### 📊 Dashboard
- **Financial overview** — total balance, 30-day income, and 30-day expense summary cards
- **Monthly bar chart** — income vs. expense breakdown by month (Recharts)
- **Category pie chart** — spending distribution by expense category
- **Accounts summary** — all accounts with balances at a glance
- **Quick actions** — one-tap buttons to add income, expense, or transfer
- **Clickable stat cards** — tap any summary card to drill into detailed transaction modals
- Smooth entrance animations via Framer Motion

### 💳 Multi-Account Management
- Create accounts of various types: **Bank**, **Savings**, **Credit Card**, or **Other**
- Edit account name, balance, and type inline
- Delete accounts (enforces zero-balance rule)
- **Balance trend line chart** per account
- **Recent transactions list** per account
- Dynamic account icons based on type

### 💸 Transactions
- Record **income** and **expense** transactions with category, date, description, and target account
- **Transfer** funds between accounts (single transfer or **multi-account split transfer**)
- **Insufficient balance guard** — prevents overspending on expenses and transfers
- Automatic account balance adjustment on create/delete
- Batch writes via Firestore `writeBatch` for atomic transfers

### 📋 Transaction History
- Full transaction log with **desktop table** and **mobile card** layouts
- **Search** transactions by description
- **Filters** — by type (income / expense / transfer), account, and date range
- Color-coded type badges and amount formatting
- Delete transactions with automatic balance restoration
- Confirmation modal before destructive actions

### 👤 Profile & Settings
- View and edit profile (display name, phone, currency)
- Multi-currency support: **₹ INR**, **$ USD**, **€ EUR**, **£ GBP**
- Logout from the profile dropdown or the accounts page

### 🎨 UI & UX
- Glassmorphism navbar with backdrop blur
- Gradient stat cards and buttons
- Framer Motion page transitions, hover effects, and micro-animations
- Responsive design — mobile-first with adaptive layouts
- Toast notifications for all actions (react-hot-toast)
- Custom confirmation modals for delete operations

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React 19](https://react.dev/) |
| **Bundler** | [Vite 8](https://vite.dev/) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Backend / Auth** | [Firebase 12](https://firebase.google.com/) (Authentication + Firestore) |
| **Charts** | [Recharts 3](https://recharts.org/) (BarChart, PieChart, LineChart) |
| **Animations** | [Framer Motion 12](https://www.framer.com/motion/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Routing** | [React Router DOM 7](https://reactrouter.com/) |
| **Date Utilities** | [date-fns 4](https://date-fns.org/) |
| **Notifications** | [react-hot-toast 2](https://react-hot-toast.com/) |
| **Linting** | ESLint 10 with React Hooks & React Refresh plugins |

---

## 📂 Project Structure

```
in-out-budget-manager/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── components/
│   │   ├── AddAccountModal.jsx      # Modal to create a new account
│   │   ├── AddTransactionModal.jsx   # Modal for income / expense entry
│   │   ├── ConfirmModal.jsx          # Reusable delete confirmation dialog
│   │   ├── DashboardDetailModal.jsx  # Drill-down modal for stat cards
│   │   ├── Navigation.jsx            # Sticky navbar with mobile drawer
│   │   └── TransferModal.jsx         # Single & split transfer modal
│   ├── contexts/
│   │   └── AuthContext.jsx           # Auth state, user profile, currency
│   ├── firebase/
│   │   ├── firebase.js               # Firebase app initialization
│   │   └── firestoreService.js       # All Firestore CRUD operations
│   ├── pages/
│   │   ├── Accounts.jsx              # Profile settings + account management
│   │   ├── Dashboard.jsx             # Main dashboard with charts & stats
│   │   ├── Login.jsx                 # Login / signup / password reset
│   │   ├── Onboarding.jsx            # Post-signup verification & setup
│   │   └── Transactions.jsx          # Transaction history with filters
│   ├── App.jsx                       # Routes, private route guard, toaster
│   ├── index.css                     # Tailwind CSS entry point
│   └── main.jsx                      # React DOM entry point
├── .env                              # Environment variables (not committed)
├── index.html                        # HTML shell
├── vite.config.js                    # Vite + Tailwind CSS plugin config
├── eslint.config.js                  # ESLint configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A [Firebase project](https://console.firebase.google.com/) with **Authentication** (Email/Password + Google) and **Firestore** enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/Madhankumar-E-G-D/in-out-budget-manager.git
cd in-out-budget-manager

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the project root with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Note:** All variables must be prefixed with `VITE_` for Vite to expose them to the client.

### Run Locally

```bash
npm run dev
```

The app will start at `http://localhost:5173` (default Vite port).

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the project |

---

## 🗄️ Firestore Data Model

```
users/{userId}
├── displayName: string
├── email: string
├── phone: string
├── currency: "INR" | "USD" | "EUR" | "GBP"
├── createdAt: timestamp
│
├── accounts/{accountId}
│   ├── name: string
│   ├── type: "bank" | "savings" | "credit_card" | "other"
│   ├── balance: number
│   ├── currency: string
│   └── createdAt: timestamp
│
└── transactions/{transactionId}
    ├── type: "income" | "expense" | "transfer"
    ├── amount: number
    ├── category: string
    ├── fromAccountId: string
    ├── toAccountId: string (transfers only)
    ├── date: timestamp
    ├── description: string
    └── createdAt: timestamp
```

---

## 📄 License

This project is private. See the repository settings for access.
