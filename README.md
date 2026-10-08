# AssetDrop - Sell Digital Assets Admin Console

A modern, high-performance administrative console and observability dashboard for the **Sell Digital Assets** ecosystem. Engineered with **React 19**, **TypeScript**, **Vite 8**, **Tailwind CSS v4**, and **Sonner**.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)
![Lint](https://img.shields.io/badge/eslint-0%20errors-brightgreen?style=flat-square)
![TypeScript](https://img.shields.io/badge/typescript-6.0-blue?style=flat-square)
![React](https://img.shields.io/badge/react-19.2-61dafb?style=flat-square)
![TailwindCSS](https://img.shields.io/badge/tailwind-v4.3-38bdf8?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Architecture & Core Features

- **Streamlined Administration**: Dedicated single-portal admin dashboard with focused management for platform metrics, company identity, and account credentials.
- **Robust Authentication & Session Management**:
  - Direct integration with `${API_BASE_URL}/api/auth/login`.
  - Real-time schema validation with **Zod**.
  - **"Remember Me"** preference: persistent `localStorage` for returning sessions vs ephemeral `sessionStorage` for single-session logins.
  - Granular error sanitization handling `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, and `429 Rate Limited` states.
- **Global Sonner Toast Notifications**: Design-system synced toast feedback with automatic light/dark palette reactivity, rich color status indicators, and dismissal controls.
- **Zero-FOUC Theme Engine**: Synchronous initial paint theme evaluation preventing flash of unstyled theme; toggleable via header and login screen controls.
- **Material 3 Design Tokens with Tailwind CSS v4**: Built with variable **Plus Jakarta Sans** typography and semantic surface/container color tokens.
- **Tree-Shakeable SVG Iconography**: Zero-runtime font overhead powered by `lucide-react`.
- **CORS & Dev Proxy Configuration**: Built-in Vite proxy forwarding `/api` requests to `http://localhost:5000` with `changeOrigin: true`.

---

## Tech Stack

| Layer                       | Technology                                                                |
| --------------------------- | ------------------------------------------------------------------------- |
| **Core Framework**          | [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)              |
| **Language**                | [TypeScript 6](https://www.typescriptlang.org/) (Strict Mode)             |
| **Styling & Design System** | [Tailwind CSS v4](https://tailwindcss.com/) with CSS Variables (`@theme`) |
| **Validation Engine**       | [Zod](https://zod.dev/)                                                   |
| **Notifications**           | [Sonner](https://sonner.emilkowal.ski/)                                   |
| **Icons**                   | [Lucide React](https://lucide.dev/) (Tree-shakeable SVGs)                 |
| **Linting**                 | [ESLint 10](https://eslint.org/) + `typescript-eslint`                    |

---

## Directory Structure

```text
sell-digital-assets-admin/
├── public/                     # Static assets (favicons, manifest)
├── src/
│   ├── assets/                 # Fonts (Plus Jakarta Sans) and brand graphics
│   ├── components/             # Reusable UI primitives (Button, Card, Input, Checkbox, Badge, Modal, Spinner)
│   ├── config/                 # Environment configuration (env.ts)
│   ├── context/                # Theme and Authentication context contracts
│   ├── hooks/                  # Custom React hooks (useAuth, useTheme)
│   ├── layouts/                # Unified shell layouts (Header, Sidebar, Footer, Layout)
│   ├── lib/
│   │   ├── icons/              # Unified semantic and brand SVG icon library
│   │   └── utils.ts            # Class merging utility (cn)
│   ├── pages/                  # Page views
│   │   ├── Dashboard.tsx       # System overview & metrics
│   │   ├── Organizations.tsx   # Platform branding & organization metadata
│   │   ├── Categories.tsx      # Taxonomy & category management
│   │   ├── Users.tsx           # User directory & governance
│   │   ├── Settings.tsx        # Account information, name update, & password change
│   │   └── Login.tsx           # Authentication modal with Remember Me & toast errors
│   ├── provider/               # Context providers (ThemeProvider, AuthProvider)
│   ├── schemas/                # Zod schemas (loginSchema.ts)
│   ├── services/               # HTTP client & API service layer (organizationService.ts, userService.ts, etc.)
│   ├── theme/                  # Global design tokens and theme styles
│   ├── types/                  # Domain TypeScript interfaces (auth.ts)
│   ├── App.tsx                 # Root application component & auth router guard
│   └── main.tsx                # Client application bootstrap
├── .env.example                # Environment variables template
├── eslint.config.js            # Flat ESLint configuration
├── package.json                # Project dependencies and npm scripts
├── tsconfig.app.json           # Application TypeScript config
└── vite.config.ts              # Vite configuration & dev proxy
```

---

## Navigation & Page Topology

### Overview
| View              | Access    | Description                                                                              |
| :---------------- | :-------- | :--------------------------------------------------------------------------------------- |
| **Dashboard**     | Protected | Telemetry overview, system health, and high-level platform observability                 |
| **Analytics**     | Protected | Marketplace conversion rates, audience distribution, and financial threshold analytics  |

### Platform Management
| View              | Access    | Description                                                                              |
| :---------------- | :-------- | :--------------------------------------------------------------------------------------- |
| **Users**         | Protected | User directory, account status toggling, and role management                             |
| **Assets**        | Protected | Digital assets catalog, taxonomy topology, and product channel distribution              |
| **Categories**    | Protected | Taxonomy tree and category catalog administration                                        |
| **Orders**        | Protected | Marketplace order settlements, commission rates, and payout gateway controls             |

### Portal Configuration
| View              | Access    | Description                                                                              |
| :---------------- | :-------- | :--------------------------------------------------------------------------------------- |
| **Branding & Appearance** | Protected | Platform branding, legal entity, currencies, and singleton configuration          |
| **Platform Settings**     | Protected | Administrator profile information, password management, and account settings      |

### System
| View              | Access    | Description                                                                              |
| :---------------- | :-------- | :--------------------------------------------------------------------------------------- |
| **Securities**    | Protected | Session governance, authorization roles, token storage verification, and access controls  |
| **Audit Logs**    | Protected | Real-time session event stream, operator history, and governance logging                |
| **Log out**       | Protected | Accessible modal session termination clearing tokens and client caches                    |

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

Create a `.env` file in the project root based on `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000
API_BASE_URL=http://localhost:5000
```

### Development Server

Start the local Vite development server (defaults to port `5174`):

```powershell
npm run dev
```

Open [http://localhost:5174](http://localhost:5174) in your browser.

---

## Available Scripts

| Command           | Description                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev`     | Starts the Vite dev server with instant Hot Module Replacement (HMR).                          |
| `npm run build`   | Runs TypeScript type-checking (`tsc -b`) and produces a minified production bundle in `dist/`. |
| `npm run lint`    | Lints all `.ts`, `.tsx`, and `.js` files with ESLint.                                          |
| `npm run preview` | Serves the production build locally to test performance and caching.                           |

---

## Verification & Quality Standards

- **Zero TypeScript Errors**: Enforced with strict mode and `tsc -b`.
- **Zero ESLint Warnings**: Verified across all source files.
- **Fast Build Times**: Production bundle generated in ~2 seconds.

---

## Deployment on Vercel

### Option 1: Vercel Web Dashboard (Recommended)

1. Push your code to GitHub / GitLab / Bitbucket.
2. Log in to [vercel.com](https://vercel.com) and click **"Add New..."** > **"Project"**.
3. Import your repository (`sell-digital-assets-admin`).
4. Vercel automatically detects the framework presets via `vercel.json`:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = URL of your deployed backend API (e.g. `https://api.yourdomain.com`).
6. Click **Deploy**.

### Option 2: Vercel CLI

```powershell
# 1. Deploy preview
npx vercel

# 2. Deploy to production
npx vercel --prod
```

> [!IMPORTANT]
> **Backend CORS Configuration:** Ensure the production Vercel domain (e.g. `https://sell-digital-assets-admin.vercel.app`) is included in your backend's `ALLOWED_ORIGINS` environment variable in `sell-digital-assets-api`.

---

## License

This project is licensed under the MIT License.
