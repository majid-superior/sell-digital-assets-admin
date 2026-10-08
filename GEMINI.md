# Frontend Engineering Guidelines & Architecture Standards

> **Applies to**: `sell-digital-assets-admin` and all administrative modules.
> **Scope**: UI rendering, data loading patterns, state management, currency formatting, and error handling.
> **Target Audience**: AI Agents and Frontend Engineers.

---

## 1. Core Principles

1. **Zero Mock Data Principle**:
   - Never use fake mock records, dummy user lists, hardcoded companies, or mock JSON files in business views.
   - All application state must originate directly from the live backend REST API (`c:\GH\sell-digital-assets-api`) and PostgreSQL database.
   - Never store business entities in `localStorage` or `sessionStorage` as a pseudo-database. Only authentication tokens may be persisted in browser storage.

2. **Zero Layout Shift (CLS = 0)**:
   - Pages must never "jump", "expand", or "zoom" when transitioning between loading and loaded states.
   - Never swap a small centered loading box (e.g., `min-h-[360px] flex items-center justify-center`) with a full-width multi-column card.
   - The initial layout structure must already occupy the exact full dimensions and grid structure of the final content.

3. **Strict Notification-Only Error Policy**:
   - Never render inline or on-page error banners, alerts, or error boxes that displace or replace UI elements.
   - All errors (network disconnections, 400/404/500 HTTP responses, validation failures) must strictly appear in **popup toast notifications** via Sonner (`toast.error(...)`).

---

## 2. Universal Loading Pattern: Top Progress Bar + In-Memory Caching

Top-tier web applications (e.g., Linear, GitHub, Stripe Dashboard) feel instantaneous and stable because they avoid screen-blocking loaders and layout shifts. All pages in this project must follow this exact standard.

### Component A: Global Top Progress Bar
- **Location**: Fixed at the very top edge of the viewport (`fixed top-0 left-0 right-0 z-50 h-[2.5px]`).
- **Behavior**:
  - Automatically activates whenever any API call or background revalidation starts.
  - Displays a high-tech accent gradient bar with indeterminate motion.
  - When all pending requests finish, the bar quickly advances to 100% and smoothly fades out (`opacity-0 transition-opacity duration-300`).
  - **Non-blocking**: Users can continue interacting, reading content, or navigating between tabs without UI obstruction.

### Component B: In-Memory Client Cache (Stale-While-Revalidate)
- **Principle**:
  - Data fetched from the backend (company configuration, user directories, metrics, currency lists) is stored in an in-memory client cache within the corresponding service module.
- **Tab Switching (0ms Delay)**:
  - When the user switches tabs (e.g., `Dashboard` $\leftrightarrow$ `Company` $\leftrightarrow$ `Users` $\leftrightarrow$ `Setting`), the page immediately reads from the in-memory cache and renders **instantly (0ms latency)**.
  - The page state does **not** reset to a blank loading state.
  - In the background, the service triggers a silent revalidation request to the backend. The top progress bar pulses subtly during this check.
  - If updated data is returned, the local state and in-memory cache are updated seamlessly without unmounting the layout.
- **Cache Invalidation**:
  - Direct mutations (e.g., updating company details, editing user roles, deactivating accounts) immediately update both the backend database and the in-memory cache.
  - Session logout (`signOut()`) must flush all in-memory caches.

---

## 3. Financial & Currency Presentation Standards

1. **Generic Iconography**:
   - Avoid hardcoded currency symbols (e.g. Dollar signs `$`) in general interface icons.
   - Use generic semantic financial icons from `@/lib/icons` (`<Icons.Coins>`, `<Icons.Wallet>`, `<Icons.Currency>`) so the console remains neutral across international deployments.

2. **Database-Driven Currency Engine**:
   - All currency options must load dynamically from the PostgreSQL `currencies` table (`/api/company/currencies`).
   - Monetary values must be formatted using the company's active database currency symbol (e.g., `₨ 25,000.00` for PKR, `$ 25,000.00` for USD, `€ 25,000.00` for EUR) via `formatCurrencyAmount(amount, symbol)` in service modules.

3. **Fast Refresh & Export Hygiene**:
   - Helper functions, formatting utilities, and data caches must reside in their respective service files (`src/services/*.ts`) and **not** be exported from React component page files. This guarantees full React Fast Refresh (HMR) without full page reload warnings.

---

## 4. Container Geometry & CSS Transitions

- **No Dimension Transitions on Containers**:
  - Base containers such as `Card` (`src/components/ui/Card.tsx`) must **never** use `transition-all`.
  - Animating container dimensions (`width`, `height`, `padding`) causes the browser to animate layout growth, producing an artificial "zoom-in" effect when content arrives.
  - Base container styling must use targeted transitions:
    ```tsx
    // Correct:
    className="rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface shadow-xs transition-colors duration-150"

    // Forbidden:
    className="... transition-all"
    ```

---

## 5. First-Time Loading Layouts (Geometric Skeleton vs. Content Swap)

On the very first visit to a page before data is cached:
- Render the **full card and grid geometry immediately** from millisecond 0.
- Fill text nodes with subtle neutral geometric pulse bars (`animate-pulse bg-surface-container-high rounded`) matching the exact line heights.
- **Forbidden**: Do not put fake strings (e.g., "John Doe", "Acme Inc.") into skeleton bars.
- As soon as the backend responds, the pulse bars are replaced by real data without any shift in card size or container position.

---

## 6. Verification Checklist for AI Agents

Before declaring any frontend task complete, verify:
1. `npx tsc -b` passes with **0 errors**.
2. `npm run lint` passes with **0 warnings and 0 errors**.
3. Navigating between any tabs is instantaneous, smooth, and free of layout jumps or expanding animations.
4. Top progress bar activates on API calls and cleanly dismisses upon completion.
5. All error handling uses Sonner toast popups only.
