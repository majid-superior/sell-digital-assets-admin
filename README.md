# AssetDrop — Sell Digital Assets Admin Console

A modern, high-performance administrative console and observability dashboard for the **Sell Digital Assets** ecosystem. Engineered with **React 19**, **TypeScript**, **Vite 8**, **Tailwind CSS v4**, and **Sonner**.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)
![Lint](https://img.shields.io/badge/eslint-0%20errors-brightgreen?style=flat-square)
![TypeScript](https://img.shields.io/badge/typescript-6.0-blue?style=flat-square)
![React](https://img.shields.io/badge/react-19.2-61dafb?style=flat-square)
![TailwindCSS](https://img.shields.io/badge/tailwind-v4.3-38bdf8?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Architecture & Core Features

- **Streamlined Administration**: Dedicated single-portal admin dashboard with real-time telemetry, user management, category taxonomy governance, branding controls, and dynamic appearance editing.
- **Zero Mock / Example Data Policy**: All displayed business entities originate exclusively from the live REST API and PostgreSQL database. Unimplemented roadmap features (`Analytics`, `Assets`, `Orders`, `Audit Logs`) strictly render clean `<EmptyState />` placeholder views with zero mock records, zero fake charts, and zero simulated calculations.
- **Universal Loading Pattern (CLS = 0)**:
  - Non-blocking indeterminate `<TopProgressBar />` fixed at the top edge of the viewport.
  - In-memory SWR client caching providing instantaneous (0ms latency) tab switching across all views.
- **Dynamic Appearance & Theming Engine**:
  - Live color palette customizer and preset picker in `Appearance.tsx`.
  - Seamless synchronization with backend theme endpoints (`/api/theme` / `/api/theme/active`) and instant DOM CSS variable injection via `applyThemeToDom()`.
  - Zero-FOUC inline script in `index.html` preventing unstyled theme flashing.
- **Hierarchical Category Taxonomy**:
  - Full taxonomy tree administration in `Categories.tsx` with search, pagination, depth indicators, soft-deletion (`is_active = false`), and restoration.
- **Database-Driven Currency Engine**:
  - Currency options loaded dynamically from the PostgreSQL `currencies` table (`/api/organizations/currencies`).
  - Formatting via `formatCurrencyAmount(amount, symbol)` in `organizationService.ts`.
- **Robust Authentication & Security**:
  - Direct integration with `/api/auth/login` and `/api/auth/refresh`.
  - Real-time schema validation with **Zod**.
  - **"Remember Me"** preference: persistent `localStorage` for returning sessions vs ephemeral `sessionStorage` for single-session logins.
  - Password and profile name updates in `Securities.tsx` via `/api/users/me`.
- **Strict Notification-Only Error Policy**:
  - All errors (network issues, 400/401/403/429/500 responses) surface strictly in **Sonner** toast popups (`toast.error(...)`). Displacing on-page error banners are strictly banned.
- **CORS & Dev Proxy Configuration**: Built-in Vite proxy forwarding `/api` requests to `http://localhost:5000` with `changeOrigin: true`.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Core Framework** | [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) |
| **Language** | [TypeScript 6](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling & Design System** | [Tailwind CSS v4](https://tailwindcss.com/) with CSS Variables (`@theme`) |
| **Validation Engine** | [Zod](https://zod.dev/) |
| **Notifications** | [Sonner](https://sonner.emilkowal.ski/) |
| **Icons** | [Lucide React](https://lucide.dev/) (Tree-shakeable SVGs) |
| **Linting** | [ESLint 9/10](https://eslint.org/) + `typescript-eslint` |

---

## Directory Structure

```text
sell-digital-assets-admin/
├── public/                     # Static assets (favicons, manifest, logo.png)
├── src/
│   ├── assets/                 # Fonts (Plus Jakarta Sans)
│   ├── components/
│   │   └── ui/                 # Reusable UI primitives (Button, Card, Input, Checkbox, Badge, Modal, Spinner, TopProgressBar)
│   ├── config/                 # Environment configuration (env.ts)
│   ├── context/                # Theme and Authentication context contracts
│   ├── hooks/                  # Custom React hooks (useAuth, useTheme)
│   ├── layouts/                # Unified shell layouts (Header, Sidebar, Footer, Layout)
│   ├── lib/
│   │   ├── icons/              # Unified semantic and brand SVG icon library
│   │   └── utils.ts            # Class merging utility (cn)
│   ├── pages/                  # Administrative page views
│   │   ├── Dashboard.tsx       # System overview, telemetry & metrics
│   │   ├── Analytics.tsx       # Analytics empty state
│   │   ├── Users.tsx           # User directory & role governance
│   │   ├── Assets.tsx          # Assets empty state with deep link to Categories
│   │   ├── Categories.tsx      # Taxonomy tree, category CRUD, soft-delete & restore
│   │   ├── Orders.tsx          # Orders empty state
│   │   ├── Branding.tsx        # Legal entity, title, logos, favicon & support contacts
│   │   ├── Appearance.tsx      # Theme palette editor, preset colors & dynamic CSS sync
│   │   ├── Settings.tsx        # Default currency, platform fee %, payout minimum & tax ID
│   │   ├── Securities.tsx      # Admin display name update, password change & token audit
│   │   ├── AuditLogs.tsx       # Audit logs empty state
│   │   └── Login.tsx           # Authentication modal with Remember Me & toast errors
│   ├── provider/               # Context providers (ThemeProvider, AuthProvider)
│   ├── schemas/                # Zod schemas (loginSchema.ts)
│   ├── services/               # HTTP client & API service layer
│   │   ├── apiClient.ts        # Fetch client, token attachment, refresh & TopProgressBar
│   │   ├── authService.ts      # Login, session refresh, token persistence & password update
│   │   ├── categoryService.ts  # Categories CRUD, tree hierarchy, soft-delete & restore
│   │   ├── organizationService.ts # Organization singleton, currency options & formatters
│   │   ├── themeService.ts     # Active theme retrieval, palette update & applyThemeToDom
│   │   └── userService.ts      # User directory pagination, role update, status toggling & create
│   ├── theme/                  # Global design tokens and theme styles
│   ├── types/                  # Domain TypeScript interfaces (auth.ts, organization.ts)
│   ├── App.tsx                 # Root application component & auth router guard
│   └── main.tsx                # Client application bootstrap
├── .env.example                # Environment variables template
├── eslint.config.js            # Flat ESLint configuration
├── package.json                # Project dependencies and npm scripts
├── tsconfig.app.json           # Application TypeScript config
├── vercel.json                 # Vercel deployment & SPA rewrites
└── vite.config.ts              # Vite configuration & dev proxy (Port 5174)
```

---

## Navigation & Page Topology

### Overview
| View | Status | Description |
| :--- | :--- | :--- |
| **Dashboard** | Protected / Live | System telemetry, database status, and platform observability |
| **Analytics** | Protected / EmptyState | Clean empty state view awaiting backend analytics services |

### Platform Management
| View | Status | Description |
| :--- | :--- | :--- |
| **Users** | Protected / Live | User directory, account status toggling, and role management |
| **Assets** | Protected / EmptyState | Clean empty state view with navigation link to Categories |
| **Categories** | Protected / Live | Hierarchical taxonomy tree, search, pagination, CRUD, soft-delete & restore |
| **Orders** | Protected / EmptyState | Clean empty state view awaiting backend order settlement engine |

### Portal Configuration
| View | Status | Description |
| :--- | :--- | :--- |
| **Branding** | Protected / Live | Platform title, legal entity, support emails, phone, and brand logos |
| **Appearance** | Protected / Live | Theme palette editor, preset colors, dynamic CSS variable application |
| **Settings** | Protected / Live | Database currency selection, platform fee %, payout minimum, and tax ID |

### System
| View | Status | Description |
| :--- | :--- | :--- |
| **Securities** | Protected / Live | Admin profile name updates, password changes, token inspection, and role verification |
| **Audit Logs** | Protected / EmptyState | Clean empty state view awaiting centralized audit logging pipeline |
| **Log out** | Protected / Modal | Accessible session termination modal purging credentials and in-memory caches |

---

## Getting Started

### Prerequisites

- **Node.js**: `v20.0.0` or later (tested on Node v22.x)
- **Package Manager**: `npm` (v10+ recommended)
- **Backend API**: Running on `http://localhost:5000` (`sell-digital-assets-api`)

### Installation

```powershell
npm install
```

### Environment Configuration

Create a `.env` file based on `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000
API_BASE_URL=http://localhost:5000
```

### Development Server

Start the local Vite development server (Port `5174`):

```powershell
npm run dev
```

Open [http://localhost:5174](http://localhost:5174) in your browser.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite dev server with instant Hot Module Replacement (HMR). |
| `npm run build` | Runs TypeScript type-checking (`tsc -b`) and produces a minified production bundle in `dist/`. |
| `npm run lint` | Lints all `.ts`, `.tsx`, and `.js` files with ESLint. |
| `npm run preview` | Serves the production build locally to test performance and caching. |

---

## Deployment on Vercel

1. Push your code to GitHub.
2. In [vercel.com](https://vercel.com), import the `sell-digital-assets-admin` repository.
3. Vercel automatically detects the framework presets via `vercel.json`:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set the environment variable:
   - `VITE_API_BASE_URL` = URL of your deployed backend API (e.g. `https://api.yourdomain.com`).
5. Click **Deploy**.

> [!IMPORTANT]
> **Backend CORS Configuration:** Ensure the production Vercel domain (e.g. `https://admin.assetdrop.com`) is included in your backend's `ALLOWED_ORIGINS` environment variable in `sell-digital-assets-api`.

---

## License

This project is licensed under the MIT License.
