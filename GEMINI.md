# Frontend Engineering Guidelines & Architecture Standards

> **Applies to**: `sell-digital-assets-admin` and all administrative modules.  
> **Scope**: UI rendering, data loading patterns, state management, currency formatting, appearance governance, and error handling.  
> **Target Audience**: AI Agents and Frontend Engineers.

---

## 1. Core Principles

1. **Zero Mock / Example Data Principle (Strict Zero-Mock Policy)**:
   - **Absolute Ban on Mock Data**: Never use fake mock records, dummy user lists, hardcoded companies, fake audit trails, mock transactions, or mock JSON files in business views.
   - **Unimplemented Backend Features = Clean Empty Pages Only**:
     - When a feature, page, or table does NOT yet have a live backend endpoint and database schema (e.g., `Analytics`, `Assets`, `Orders`, `Audit Logs`):
       - Keep the side navigation link active in `Sidebar.tsx` so the navigation topology is established.
       - The target page MUST ONLY render as a clean **Empty Page** using the `<EmptyState />` UI component (with a standard header, icon, and clear message that backend integration will be implemented later).
       - **STRICTLY FORBIDDEN**: Never write mock code, fake KPI cards, simulated graphs, hardcoded arrays (e.g., `const auditEvents = [...]`), or temporary placeholder data to make it look populated.
       - **STRICTLY FORBIDDEN**: Never cross-compute synthetic metrics from unrelated endpoints (e.g., fabricating "revenue", "order volume", or "asset health" from user/category counts) to fake functionality.
   - **Zero Example/Dummy Data in Display Fallbacks**:
     - Never render hardcoded sample emails (e.g., `admin@selldigitalassets.com`, `user@example.com`), dummy phone numbers, fictional addresses, or sample names as display fallbacks in UI cards or tables.
     - If a backend field is null, undefined, or empty, strictly render a neutral dash (`—`) or an empty state.
   - **Live Backend Exclusivity**:
     - All active business data rendered on the screen must originate directly from the live backend REST API (`c:\GH\sell-digital-assets-api`) and PostgreSQL database.
     - Never store business entities in `localStorage` or `sessionStorage` as a pseudo-database. Only authentication tokens and remembered preferences may be persisted in browser storage.

2. **Zero Layout Shift (CLS = 0)**:
   - Pages must never "jump", "expand", or "zoom" when transitioning between loading and loaded states.
   - Never swap a small centered loading box (e.g., `min-h-[360px] flex items-center justify-center`) with a full-width multi-column card.
   - The initial layout structure must already occupy the exact full dimensions and grid structure of the final content.

3. **Strict Notification-Only Error Policy**:
   - Never render inline or on-page error banners, alerts, or error boxes that displace or replace UI elements.
   - All errors (network disconnections, 400/404/500 HTTP responses, validation failures) must strictly appear in **popup toast notifications** via Sonner (`toast.error(...)`).

4. **Human-Understandable Error Messages (Zero Raw HTTP / Zero Cryptic Codes)**:
   - Never surface raw HTTP codes (e.g., `Request failed with status 500`, `status 404`, `status 413`) or raw socket/infrastructure codes (`ECONNREFUSED`, `EAI_AGAIN`, `getaddrinfo`, SQL constraints) directly to administrators.
   - All errors must be translated in `apiClient.ts` or service layers into clear, human-understandable language explaining what went wrong, why it occurred, and actionable next steps.
   - If the backend database or service is unavailable during sign in, display: `"Unable to sign in right now. Please try again later."`
   - Field validation errors (`fieldErrors`) must be formatted into readable descriptions rather than raw JSON structures.

5. **Mandatory Environment Separation & Local Database Rule**:
   - In local development, the admin console connects exclusively to the local API server (`http://localhost:5000`) and local PostgreSQL.
   - Local development and testing are strictly forbidden from connecting to or falling back to live production databases.
   - Production API endpoints are configured exclusively in hosting environments and isolated from local development.

6. **Authentication Resilience & Session Preservation**:
   - Infrastructure, network, and database connection failures must never be reported as invalid administrator credentials.
   - Temporary network disconnections or backend 5xx/503 errors during session verification (`/auth/me`) MUST NOT wipe stored tokens or log the administrator out. Session termination is restricted strictly to definitive 401 Unauthorized token rejection.

---

## 2. Universal Loading Pattern: Top Progress Bar + In-Memory Caching

Top-tier web applications feel instantaneous and stable because they avoid screen-blocking loaders and layout shifts. All pages in this project must follow this exact standard.

### Component A: Global Top Progress Bar
- **Location**: Fixed at the very top edge of the viewport (`fixed top-0 left-0 right-0 z-50 h-[2.5px]`).
- **Behavior**:
  - Automatically activates whenever any API call or background revalidation starts (`topProgressBar.start()`).
  - Displays a high-tech accent gradient bar with indeterminate motion.
  - When all pending requests finish, the bar quickly advances to 100% and smoothly fades out (`topProgressBar.done()`).
  - **Non-blocking**: Users can continue interacting, reading content, or navigating between tabs without UI obstruction.

### Component B: In-Memory Client Cache (Stale-While-Revalidate)
- **Principle**:
  - Data fetched from the backend (organization configuration, active currencies, user directories, categories tree, dynamic theme tokens) is cached in memory within its corresponding service module (`organizationService`, `userService`, `categoryService`, `themeService`).
- **Tab Switching (0ms Delay)**:
  - When switching tabs (`Dashboard` $\leftrightarrow$ `Users` $\leftrightarrow$ `Categories` $\leftrightarrow$ `Branding` $\leftrightarrow$ `Appearance` $\leftrightarrow$ `Settings` $\leftrightarrow$ `Securities`), the view reads from memory and renders **instantly (0ms latency)**.
  - The view state does **not** reset to a blank loading state.
  - In the background, the service triggers a silent revalidation request to the backend with the top progress bar pulsing subtly.
  - Updated data reconciles seamlessly without unmounting the layout.
- **Cache Invalidation**:
  - Direct mutations (updating organization settings, editing categories, modifying theme palettes, updating user roles) immediately update PostgreSQL and sync the in-memory cache.
  - Session logout (`signOut()`) must flush all in-memory service caches.

---

## 3. Financial, Currency & Taxonomy Standards

1. **Generic Iconography**:
   - Avoid hardcoded currency symbols in general interface icons.
   - Use generic semantic financial icons from `@/lib/icons` (`<Icons.Coins>`, `<Icons.Wallet>`, `<Icons.Currency>`) so the console remains neutral across international deployments.

2. **Database-Driven Currency Engine**:
   - All currency options must load dynamically from the PostgreSQL `currencies` table (`/api/v1/organizations/currencies`).
   - Monetary values must be formatted using the organization's active database currency symbol via `formatCurrencyAmount(amount, symbol)` in `src/services/organizationService.ts`.

3. **Taxonomy & Category Conventions**:
   - All category mutations must respect the backend soft-delete convention (`is_active = false`). Hard SQL deletions are strictly prohibited.
   - Category tree visualization and selection must accurately reflect parent-child relationships and path slugs.

4. **Fast Refresh & Export Hygiene**:
   - Helper functions, formatting utilities, and data caches must reside in their respective service files (`src/services/*.ts`) and **not** be exported from React component page files.

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

## 5. Dynamic Appearance & Theming Standards

- **Theme Palette Customization**:
  - The active palette is edited via `src/pages/Appearance.tsx` and persisted to `/api/v1/theme`.
  - Color updates must be immediately applied to `:root` via `applyThemeToDom()` in `src/services/themeService.ts`.
- **Zero-FOUC Guarantee**:
  - The inline script in `index.html` synchronously evaluates dark mode preference before the first render paint.

---

## 6. Mobile-First Responsive Design, Density & Overflow Standards

1. **Mobile-First Construction**:
   - Layouts must be built from the narrowest mobile viewport (320px) upward and enhanced progressively for tablet, laptop, and ultra-wide displays.
   - Header title typography must scale fluidly (e.g., `text-2xl sm:text-3xl lg:text-4xl font-extrabold`) without breaking words awkwardly.
   - Main page layout containers must use compact mobile padding (e.g., `px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8`) to prevent wasted vertical screen height.

2. **Container Padding & Content Density**:
   - Card headers, bodies, and footers must use `p-4 sm:p-6` (and `p-4 sm:p-6 pt-0`), ensuring 16px of horizontal space is saved on mobile viewports while preserving standard desktop breathing room.
   - Modal action footers must stack vertically on mobile and align horizontally on desktop: `flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:px-6`.
   - Modal bodies must use dynamic viewport units and scroll containment: `max-h-[75dvh] overscroll-contain`.

3. **Strict Zero Horizontal Overflow Policy**:
   - **No Band-Aid Overflow Hiding**: Never use global `overflow-x: hidden` on `body` or root containers to mask overflowing components. Layout geometries must be resolved intrinsically.
   - **Intrinsic Sizing in Flex & Grid**: Flex and grid item children must specify `min-w-0` to avoid being forced wider than their container by long text strings or URLs.
   - **Responsive Tables**: All table containers must provide `overflow-x-auto w-full overscroll-x-contain`. Critical text cells must specify `truncate` or `break-words`.
   - **Filter & Search Toolbars**: Search inputs and dropdown select filters must stack cleanly on mobile: `flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto`.

---

## 7. Verification Checklist for AI Agents

Before declaring any frontend task complete, verify:
1. `npx tsc -b` passes with **0 errors**.
2. `npm run lint` passes with **0 warnings and 0 errors**.
3. Navigating between any tabs is instantaneous, smooth, and free of layout jumps or expanding animations.
4. Top progress bar activates on API calls and cleanly dismisses upon completion.
5. All error handling uses Sonner toast popups only.
6. **Zero Mock / Example Data Audit**: Verify that no page contains mock arrays, hardcoded dummy records, synthetic cross-entity calculations, or fake fallback strings. Unimplemented pages must strictly use `<EmptyState />`.
7. Error toast notifications provide human-understandable explanations without raw HTTP status numbers or unparsed JSON.
8. **Mobile & Viewport Verification**: Verify layout at 320px–375px mobile widths, 768px tablet, and 1280px+ desktop: zero horizontal scrollbars, zero uncontained text, full tap-target accessibility, and no container dimension jumps.
