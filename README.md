# 💰 IN & OUT — Intelligent Budget Manager & Financial Observability Platform

A cross-platform financial management and infrastructure observability ecosystem consisting of a modern **Web Application** ([React 19](https://react.dev/), [Vite 8](https://vite.dev/), [Tailwind CSS 4](https://tailwindcss.com/)), a high-performance **Native Android Application** ([Flutter 3.x](https://flutter.dev/), [Material 3](https://m3.material.io/)), and a secure **REST API** powered by **Google Firebase** (Authentication & Cloud Firestore).

---

## 🎨 Unified Color System & Visual Design

Designed around a curated 3-color primary hierarchy with deep dark mode aesthetics and high contrast:
* **Primary / Accent:** Rich Violet (`#8B5CF6` / `rgb(139, 92, 246)`)
* **Income / Positive Flow:** Emerald Green (`#10B981` / `rgb(16, 185, 129)`)
* **Expense / Alerts:** Crimson Red (`#EF4444` / `rgb(239, 68, 68)`)
* **Base Neutrals:** Pure White, Deep Black (`#000000`), and Obsidian Slate (`#0B0E14` / `#0F172A`)

---

## ✨ Feature Parity (Mobile App & Web Application)

### 👤 1. User Application Experience
* **Authentication & Identity:**
  * Clean **"Sign Out"** branding across all screens.
  * Robust password policy enforcement (minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol).
  * Restricted account lock: Disabled user accounts cannot trigger password reset emails and receive clear in-app restriction notices.
  * One-tap Google OAuth sign-in with automatic profile provisioning.
* **Financial Dashboard:**
  * **Interactive Monthly Summary Graph:** Wide, horizontally prominent bars displaying adaptive short-form value labels (e.g. `₹25k`, `₹1.2M`) directly inside the bars for immediate visual comprehension.
  * **Donut Category Breakdown:** Dynamic category spending distribution with custom percentage callouts.
  * **Metric Detail Drill-Down:** Tap Total Balance, Income, or Expense to view categorized transactions and account balances in theme-adaptive popups.
  * **Admin Shield Identifier:** Visual badge on the dashboard identifying authorized administrators.
* **Smart Accounts & Multi-Account Transfers:**
  * Supports Bank Accounts, Cash Wallets, Savings Accounts, and Credit Cards.
  * **Overdraft Protection:** Prevents transactions from driving account balances below zero.
  * **Multi-Account Split Transfers:** Transfer funds to or from multiple accounts in a single atomic batch operation.
* **Intelligent Notifications Engine:**
  * **Low Balance Security Alerts:** Automatic notification when any bank account drops below ₹1,000.
  * **Daily Financial Summary:** Aggregated daily breakdown of expenses, income, and total activity.
  * Real-time in-app notification sheet and badge counters.
* **Seamless Transactions Management:**
  * Fast month-by-month swipe navigation and grouped custom filters.
  * Instant deletion UX (records move directly to trash without intrusive prompt friction).

---

### 🛡️ 2. Security Hardening & Rate Limiter Architecture

* **Persistent 20-Transaction Rate Limiter with 1-Hour Lockout:**
  * Protects against transaction flooding and bot scripts: If a user adds more than **20 transactions within 30 minutes**, adding transactions is restricted for the **next 1 hour**.
  * Persisted across app restarts (`SharedPreferences` on Mobile) and page refreshes (`localStorage` on Web).
  * Real-time countdown timer feedback: *"Security Restriction: You have added more than 20 transactions within 30 minutes. Adding transactions is restricted for the next 1 hour. Please retry in {mins}m {secs}s."*
* **Transaction Amount Bounds & Decimal Guard:**
  * Hard upper cap at ₹1,00,00,000 (1 Crore) per transaction.
  * Strictly positive numeric validation with automatic 2-decimal-place rounding.
* **Input Sanitization (XSS Prevention):**
  * Automatic regex filtering stripping `<script>`, `<iframe>`, javascript protocols, and HTML injection tags.
* **Theme Switch Explosion Debounce:**
  * 1-second animation lock preventing rapid duplicate taps from generating overlapping corrupted colored rings.
* **Indestructible Root Admin:**
  * `egdmadhankumar@gmail.com` is permanently protected from being disabled, removed, or stripped of admin privileges.

---

### ⚡ 3. Dedicated Admin Portal (`/in-out-manager`)

Accessible to authorized administrators with instant sub-second page navigation and dedicated refresh triggers on every page:
* **Database Telemetry & Observability:**
  * Live tracking of Firestore Reads, Writes, and Deletes against Spark/Blaze quotas.
  * Storage footprint meter: Occupied storage (KB/MB) vs. Available capacity (1.00 GB).
  * Collection-level storage breakdown donuts (`transactions`, `users`, `accounts`, `trash`, `apiKeys`).
* **User Management (`/in-out-manager/users`):**
  * Real-time user directory, balance inspections, and status toggles (Active / Disabled).
  * Direct admin delegation: Add admin access to any Gmail ID directly.
* **Trash Bin & Safe Recovery (`/in-out-manager/trash`):**
  * Schema-validated item restoration: Safely maps transaction types (`income`, `expense`, `transfer`) and restores account balances without permission errors.
  * Irreversible empty trash with confirmation acknowledgment.
* **System Settings & Danger Zone:**
  * Version telemetry, maintenance mode switch, and master admin password security.

---

### 🔌 4. External REST API (`/api/*`)

External websites, scripts, AI agents, and third-party platforms can securely interact with IN & OUT using active API keys generated in the Admin Portal (`iom_...`):

| Endpoint | Method | Required Scope | Description |
|---|---|---|---|
| `/api/verify` | `GET` | Any | Verifies API key status, name, rate limit, and permissions |
| `/api/transactions?userId={id}` | `GET` | `read` / `admin` | Reads latest transactions for a user |
| `/api/transactions` | `POST` | `write` / `admin` | Creates a new transaction and updates account balance |
| `/api/accounts?userId={id}` | `GET` | `read` / `admin` | Retrieves all accounts and current balances |
| `/api/accounts` | `POST` | `write` / `admin` | Creates a new user account |
| `/api/summary?userId={id}` | `GET` | `read` / `admin` | Fetches total balance, recent income, and expenses |

**Example External Request:**
```javascript
// Reading from another website
fetch("https://your-domain/api/transactions?userId=USER_ID", {
  headers: {
    "x-api-key": "iom_YOUR_ACTIVE_API_KEY"
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 📱 Mobile App (Android APK) Build & Optimization

The native Android app is built with extreme optimization for high performance and low storage footprint:
* **AOT Release Compilation:** Fully ahead-of-time compiled native ARM64 machine code.
* **Code Shrinking & R8 Full Mode:** Proguard optimization passes, dead code elimination, and method inlining.
* **Per-ABI Splitting:** Eliminates multi-architecture fat binary bloat, producing a compact target APK (~10-15 MB).
* **Debug Symbol Stripping:** Bytecode obfuscation (`--obfuscate`) with external symbol splitting (`--split-debug-info`).

---

## 🛠️ Tech Stack Summary

| Component | Technology | Purpose |
|---|---|---|
| **Web Frontend** | React 19, Tailwind CSS 4, Framer Motion 12 | Responsive Single Page Application |
| **Web Bundler** | Vite 8 (Rolldown) | High-speed production build & code splitting |
| **Mobile App** | Flutter 3.x, Material 3, Provider | Native 60+ FPS Android & iOS experience |
| **Database & Auth** | Google Firebase (Auth & Cloud Firestore) | Multi-tab persistent local cache & real-time streams |
| **Data Visuals** | Recharts 3 (Web), FL Chart 1.3 (Mobile) | Dynamic financial graphs and telemetry charts |
| **Serverless API** | Vercel Serverless Functions / Node.js ESM | Secure REST API gateway with API Key validation |
