# POD–Flik — 1Cell.AI Lab Inventory System

A full-stack laboratory inventory management and procurement tracking application built on **Next.js 16**, **TypeScript 5**, **Prisma 7**, and **shadcn/ui**. Designed for scientific research environments — tracks reagents, consumables, stock levels, purchase orders, and compliance-grade audit trails.

---

## Architecture Overview

POD–Flik is a unified monolith: both the user interface and the backend API live inside a single Next.js application. There is no separate server process to run.

```
Browser (React 19)
     │
     │  HTTP/JSON  +  JWT Bearer Token
     ▼
Next.js App Router  (/app)
     ├── Page UI          /app/page.tsx           (single-page client shell)
     └── API Routes       /app/api/*              (Next.js Route Handlers)
                               │
                               │  Prisma 7 Client
                               ▼
                        SQLite Database           (dev.db via better-sqlite3)
```

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui (radix-nova style) |
| Animation | Framer Motion 12 |
| Icons | Lucide React |
| Backend API | Next.js Route Handlers (Node.js runtime) |
| Authentication | Stateless JWT (HS256) via `jose` |
| Password hashing | `bcryptjs` (bcrypt, 10 rounds) |
| ORM | Prisma 7 with `@prisma/adapter-better-sqlite3` |
| Database | SQLite (`dev.db`) via `better-sqlite3` |
| Excel I/O | `xlsx` (SheetJS) |

---

## Project Structure

```
POD--Flik/
├── app/
│   ├── globals.css          # Tailwind v4 design system + shadcn HSL tokens
│   ├── layout.tsx           # Root HTML shell
│   ├── page.tsx             # SPA entry point — all views, modals, and state
│   └── api/                 # Next.js Route Handlers (backend)
│       ├── audit-logs/      # GET  /api/audit-logs
│       ├── comments/
│       │   └── notifications/   # GET  /api/comments/notifications
│       ├── item-comments/
│       │   └── [id]/            # DELETE /api/item-comments/[id]
│       ├── item-types/
│       │   ├── route.ts         # GET / POST /api/item-types
│       │   └── [id]/
│       │       ├── route.ts     # PUT / DELETE /api/item-types/[id]
│       │       └── comments/
│       │           └── read/    # POST /api/item-types/[id]/comments/read
│       ├── items/
│       │   ├── route.ts         # GET / POST /api/items
│       │   └── [id]/
│       │       ├── route.ts     # PUT / DELETE /api/items/[id]
│       │       ├── comments/
│       │       │   ├── route.ts # GET / POST /api/items/[id]/comments
│       │       │   └── read/    # POST /api/items/[id]/comments/read
│       │       └── transaction/ # POST /api/items/[id]/transaction
│       ├── login/               # POST /api/login  (returns JWT)
│       ├── me/                  # GET  /api/me
│       ├── order-documents/
│       │   └── [id]/
│       │       ├── route.ts     # DELETE /api/order-documents/[id]
│       │       └── download/    # GET  /api/order-documents/[id]/download
│       ├── orders/
│       │   ├── route.ts         # GET / POST /api/orders
│       │   ├── export/          # GET  /api/orders/export  (.xlsx download)
│       │   ├── import/          # POST /api/orders/import  (.xlsx upload)
│       │   └── [id]/
│       │       ├── documents/   # GET / POST /api/orders/[id]/documents
│       │       ├── mark-delivered/
│       │       └── mark-paid/
│       ├── register/            # POST /api/register
│       └── users/
│           ├── route.ts         # GET / POST /api/users
│           └── [id]/            # DELETE /api/users/[id]
│
├── components/
│   ├── ui/                      # shadcn/ui primitives
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── sortable-table.tsx   # SortableHeader + TablePaginator (custom)
│   │   └── table.tsx
│   ├── AddItemForm.tsx          # Slide-over form — create/edit stock items
│   ├── AddOrderForm.tsx         # Slide-over form — create/edit orders
│   ├── AuditLogTable.tsx        # Sortable, paginated audit log view
│   ├── InventoryTable.tsx       # Sortable, paginated item-type aggregation
│   ├── ItemTypeForm.tsx         # Item type creation / edit form
│   ├── OrdersPage.tsx           # Sortable, paginated orders table + documents modal
│   ├── QuantityStepper.tsx      # +/- quantity stepper for transactions
│   ├── Sidebar.tsx              # Animated navigation sidebar
│   ├── StatCard.tsx             # Dashboard KPI card (Lucide icon + Framer Motion)
│   ├── StatusBadge.tsx          # Stock status chip (low / critical / out / high)
│   ├── StockItemsTable.tsx      # Sortable, paginated individual stock items
│   ├── Topbar.tsx               # App header bar with notifications + logout
│   └── UsersPage.tsx            # Sortable, paginated user management
│
├── lib/
│   ├── api.ts                   # Client-side API functions (fetch wrappers + type mappers)
│   ├── auth.ts                  # JWT sign/verify + bcrypt (server-side only)
│   ├── crud.ts                  # Prisma CRUD operations (shared by route handlers)
│   ├── prisma.ts                # PrismaClient singleton with better-sqlite3 adapter
│   ├── table-hooks.ts           # useSortable<K>() + usePagination() React hooks
│   └── utils.ts                 # cn() class merge utility
│
├── types/
│   └── inventory.ts             # All domain TypeScript types and interfaces
│
├── prisma/
│   └── schema.prisma            # Database schema (see Data Model below)
│
├── prisma.config.ts             # Prisma 7 config with dotenv DATABASE_URL resolution
├── components.json              # shadcn/ui configuration (radix-nova style, lucide icons)
├── next.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

---

## Data Model

Seven Prisma models backed by a single SQLite file (`dev.db`):

```
User              — authentication accounts (username, bcrypt hash, role)
  │
  ├── ItemType    — logical reagent / consumable catalog entry
  │     │           (name, category, brand, reorder/critical thresholds)
  │     │
  │     └── Item  — physical stock instance (catalogue #, lot #, qty,
  │           │     storage location, shelf, expiry date, tags)
  │           │
  │           ├── ItemComment      — threaded comments per stock item
  │           ├── ItemCommentRead  — per-user read watermarks
  │           └── AuditLog         — every quantity change or action
  │
  └── Order       — purchase order record (vendor, PO #, pricing, status)
        │
        ├── OrderDocument  — uploaded PDFs / invoices / confirmations
        └── OrderEvent     — lifecycle events (ordered → delivered → paid)
```

---

## API Reference

All routes require a `Authorization: Bearer <token>` header except `/api/login` and `/api/register`.

### Authentication
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/register` | Create account (first user becomes admin) |
| `POST` | `/api/login` | Returns `{ access_token }` JWT (24 h TTL) |
| `GET`  | `/api/me` | Returns current user identity |

### Item Types (Catalog)
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/item-types` | List all item types with aggregated quantities |
| `POST` | `/api/item-types` | Create item type |
| `PUT` | `/api/item-types/[id]` | Update item type |
| `DELETE` | `/api/item-types/[id]` | Delete item type |
| `POST` | `/api/item-types/[id]/comments/read` | Mark comments read |

### Stock Items
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/items` | List all non-archived stock items |
| `POST` | `/api/items` | Create stock item |
| `PUT` | `/api/items/[id]` | Update stock item |
| `DELETE` | `/api/items/[id]` | Archive stock item |
| `POST` | `/api/items/[id]/transaction` | Adjust quantity (`?change_amount=N`) |
| `GET` | `/api/items/[id]/comments` | Get comments for item |
| `POST` | `/api/items/[id]/comments` | Post comment |
| `POST` | `/api/items/[id]/comments/read` | Mark comments read |

### Orders & Documents
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/orders` | List all orders |
| `POST` | `/api/orders` | Create order |
| `POST` | `/api/orders/import` | Import `.xlsx` spreadsheet |
| `GET` | `/api/orders/export` | Export orders to `.xlsx` (`?ids=1,2,3` for selection) |
| `GET` | `/api/orders/[id]/documents` | List order documents |
| `POST` | `/api/orders/[id]/documents` | Upload document (`?document_type=invoice|confirmation|delivery`) |
| `POST` | `/api/orders/[id]/mark-delivered` | Mark order delivered |
| `POST` | `/api/orders/[id]/mark-paid` | Mark order paid |
| `GET` | `/api/order-documents/[id]/download` | Stream document file |
| `DELETE` | `/api/order-documents/[id]` | Delete document |

### Comments, Audit & Users
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/comments/notifications` | Unread comment summary across all items |
| `DELETE` | `/api/item-comments/[id]` | Delete comment (admin only) |
| `GET` | `/api/audit-logs` | Full audit trail |
| `GET` | `/api/users` | List users (admin only) |
| `POST` | `/api/users` | Create user (admin only) |
| `DELETE` | `/api/users/[id]` | Delete user (admin only) |

---

## UI Architecture

The frontend is a **single-page client shell** (`app/page.tsx`) that manages all application state in React and renders one of several views depending on the active sidebar navigation item:

| View | Component | Key Features |
|---|---|---|
| Dashboard | inline in `page.tsx` | Stat cards, comment notification chips, quick transaction panel |
| Inventory | `InventoryTable` | Sortable (name, category, qty, status), paginated 8/page |
| Stock Items | `StockItemsTable` | Sortable (9 columns), paginated 8/page |
| Orders | `OrdersPage` | Sortable (11 columns), paginated, document upload modal |
| Audit Log | `AuditLogTable` | Sortable (4 columns), paginated 8/page |
| Users | `UsersPage` | Sortable (3 columns), paginated, user creation form |

### Shared Table Infrastructure
All tables share two custom abstractions in `lib/table-hooks.ts`:

- **`useSortable<K>()`** — tracks the active sort column key and direction (`asc`/`desc`), toggling on repeated clicks.
- **`usePagination()`** — computes the visible slice (8 rows per page) and exposes `goTo(page)`.

These are consumed by `SortableHeader` and `TablePaginator` from `components/ui/sortable-table.tsx`, which are built on top of shadcn `Button` and Lucide chevron icons.

### Animation Strategy
Framer Motion is used purposefully, not decoratively:

| Element | Animation |
|---|---|
| Sidebar nav items | Staggered entrance on mount |
| Table rows | Staggered `opacity + y` entrance on data change |
| Stat cards | Spring scale on hover, y-lift on hover |
| Toast notifications | Spring entrance / `AnimatePresence` exit |
| Icon buttons | Scale spring on hover / tap |
| Topbar | Smooth `y` entrance on mount |

---

## Running Locally

### Prerequisites
- **Node.js 18+**

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Create `.env` in the project root (already present in repo):
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
```

### 3. Initialize the database
Push the Prisma schema to create `dev.db`:
```bash
npx prisma db push
```

### 4. Start the development server
```bash
npm run dev
```

The app opens at **http://localhost:3000**. The first account registered becomes an **Admin** automatically.

```bash
# Bootstrap an admin account via curl
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "yourpassword"}'
```

### 5. Production build
```bash
npm run build
npm start
```

### 6. API validation (optional)
```bash
npx tsx scripts/test-api.ts
```

---

## Key Dependencies

| Package | Version | Role |
|---|---|---|
| `next` | 16.2.x | Full-stack framework |
| `react` / `react-dom` | 19.2.x | UI runtime |
| `prisma` / `@prisma/client` | ^7.8 | ORM |
| `@prisma/adapter-better-sqlite3` | ^7.8 | SQLite driver adapter |
| `better-sqlite3` | ^12.11 | Native SQLite bindings |
| `jose` | ^6.2 | JWT sign / verify |
| `bcryptjs` | ^3.0 | Password hashing |
| `framer-motion` | ^12.42 | UI animations |
| `lucide-react` | ^1.25 | Icon system |
| `shadcn` | ^4.13 | Component library toolchain |
| `tailwindcss` | ^4 | Utility CSS framework |
| `xlsx` | ^0.18 | Excel import / export |
| `class-variance-authority` | ^0.7 | Component variant logic |

---

## UI/UX MaxPro Design Overhaul

The entire application UI has been upgraded using the **UI/UX MaxPro Clinical-Tech SaaS** design intelligence system.

### Key Visual Upgrades:
- **Unified Color Palette**: The application uses a professional clinical/tech theme with a deep navy-ink sidebar (`#0f1729`), a clean blue-tinted page background (`#f0f4f9`), and primary actions in clinical confidence blue (`#1d4ed8`).
- **Visual Contrast & Typographic Hierarchy**: Consolidates layout to single font stack using `Inter` with proper scale hierarchy. High-contrast labels, darker text on primary table columns, and polished headers.
- **Premium Cards & Stat Widgets**: Hover transitions with translateY lift effects and enhanced multi-layer shadows (`0 1px 4px rgba(15,30,60,0.07), 0 4px 18px rgba(15,30,60,0.05)`). Stat cards feature rounded icon wrapper containers (11px radius) with tone-specific background tints per status (warning/critical/muted/danger).
- **Glassmorphic Login Card**: Implements a three-layer radial mesh gradient backdrop and a glassmorphic login wrapper with frosted blur effects.
- **Clickable Navigating Breadcrumbs**: Replaces static text in topbar breadcrumbs with interactive links that call the `onViewChange` context handler, featuring hover lines and cursor states.
- **Optimized Multi-Column Form Grid**: The "Add Order" form is structured as a responsive, multi-column grid (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) with column spans for select and descriptive inputs, replacing the flat single-column layout.

### Unified Reusable Buttons:
- Custom SVG files in `/public` have been removed in favor of unified **Lucide React** icons.
- The base `Button` component (`components/ui/button.tsx`) was enhanced to support `icon`, `iconClass`, `iconPlacement` ("start" | "end"), and `text` props, ensuring all interactive actions consist of both a matched icon and a text label consistently.

