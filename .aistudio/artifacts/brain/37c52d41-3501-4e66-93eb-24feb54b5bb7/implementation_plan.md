# High-Performance On-Demand Lazy Loading & Server Search Architecture

Eliminates massive upfront data transfers during application initialization by decoupling boot time from database volume. Replaces full-table client hydration with on-demand, debounced server search, 20-record paginated default views, and selective child item hydration across invoices, persons, accounting documents, and checks.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed through user preferences:

- **Confirmed: Default View**: When opening invoices, persons, or other data lists, the system will not wait for full database downloads. It immediately displays the **latest 20 records** ordered by date/creation with a clean pagination control.
- **Confirmed: Search Mechanism**: An **instant 300ms debounced server-side search** will execute as the user types, querying indexed fields in real time without lag.
- **Confirmed: System-Wide Scope**: On-demand lazy loading and server pagination will be applied across all heavy lists in the system (invoices, persons, accounting documents, checks, and ledger transactions).

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the application from an "eager full-database fetch" model to a "high-performance streaming/on-demand" architecture. The initial application boot now loads in milliseconds because it only fetches lightweight system configuration, active financial year, and base definitions (roles, warehouses, cashboxes).
- **Target Audience & Workflow**: Accountants, sales managers, warehouse operators, and business owners managing large catalogs with thousands of invoices, contacts, and transactions.
- **Key Value**:
  - Initial load time drops from seconds to under 200ms.
  - Zero browser memory bloat or tab freezing.
  - Sub-50ms search response for persons and invoices directly from PostgreSQL indexes.

---

### 2. User Experience & Visual Design

Following the **SaaS & Enterprise Dashboard Constitution** (`references/3_saas_dashboard.md`):

- **Key User Flows**:
  1. **Application Launch**: Clean, instant startup without the full-screen spinner delay or 4-second timeout threshold. Top navigation and dashboard render immediately.
  2. **Navigating to Invoices or Persons**: The table renders the 20 most recent records instantly with crisp tabular numbers (`tabular-nums font-mono`).
  3. **Live Search**: Typing into the search input triggers an animated, quiet subtle loading indicator within the search field; results update smoothly after 300ms debounce without screen flicker.
  4. **Pagination**: A compact footer control (`صفحه ۱ از ۲۴ · تعداد کل: ۴۸۲ رکورد`) provides Next/Previous buttons and quick page jumps without full-page reloads.
  5. **Modal / Form Lookups**: When creating a new invoice, typing a customer name or barcode searches the server asynchronously and presents matches in a lightweight dropdown without needing the entire contact list in memory.
- **Visual Identity & Design Tokens**:
  - Clean neutral slate background (`#0F172A` in dark mode, `#FFFFFF` in light mode) with 1px hairline dividers (`border-slate-200 dark:border-slate-800`).
  - Strict zero-pill metadata discipline: dates, invoice numbers, and phone numbers are rendered as clean, unboxed typography with typographic separators (`·`).
  - No fake telemetry tickers or arbitrary percentage badges.
  - Responsive empty states with actionable buttons (e.g., "ثبت فاکتور جدید") when searches return zero records.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Selective Relational Hydration**:
  - *Chosen Approach*: When fetching a paginated page of 20 invoices, only fetch and attach `invoice_items` for those exact 20 IDs using `WHERE invoice_id IN (...)` instead of loading all 50,000 invoice items in the entire database.
  - *Why*: In the previous architecture, `getDbData('invoices')` hydrated every candidate item table across the entire business history before returning, causing severe server CPU spikes and network payload bloat.
- **Decision 2: Lightweight Dropdown Search Protocol**:
  - *Chosen Approach*: Autocomplete selectors (person picker, product selector) query a lightweight search endpoint returning only minimal fields (`id`, `name`, `code`, `phone`) limited to 20 results.
  - *Why*: Prevents modal opening delays in high-volume stores with thousands of customers or inventory items.
- **Decision 3: Server-Side Query Execution vs. Client Slicing**:
  - *Chosen Approach*: Push filtering, sorting, and pagination down to PostgreSQL (`LIMIT 20 OFFSET ... WHERE ... ILIKE ...`) with indexed lookups, with a seamless in-memory fallback for local file storage mode.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Client Application                            │
│                                                                        │
│  ┌──────────────────────┐               ┌───────────────────────────┐  │
│  │   Initial Boot       │               │     On-Demand Views       │  │
│  │  - Active Fiscal Year│               │  - Invoices (Page 1 / 20) │  │
│  │  - Store Settings    │               │  - Persons  (Page 1 / 20) │  │
│  │  - Base Roles/Whs    │               │  - Live Debounced Search  │  │
│  └──────────┬───────────┘               └─────────────┬─────────────┘  │
└─────────────┼─────────────────────────────────────────┼────────────────┘
              │ Minimal Config (<10KB)                  │ Paginated Query (?page=1&limit=20&search=)
              ▼                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Node.js / Express Server                        │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  GET /api/data/:key?limit=20&page=1&search=...                   │  │
│  │  - Paged record extraction                                       │  │
│  │  - Targeted child-item hydration for returned IDs only          │  │
│  │  - Fast total count calculation                                  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ SQL with LIMIT, OFFSET, ILIKE
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL Database                              │
│                                                                        │
│   INDEXES:                                                             │
│   - "invoices"("date" DESC, "createdAt" DESC)                          │
│   - "persons"("name", "phone", "code")                                 │
│   - "invoice_items"("invoice_id")                                      │
└────────────────────────────────────────────────────────────────────────┘
```

#### Core Components & Lifecycle

1. **`src/hooks/useAppController.tsx`**:
   - Split `fetchData` into `fetchCoreConfiguration` (eager at boot) and `fetchEntityPage` (lazy on tab switch).
   - Invoices and persons state initialized with paginated envelope `{ items: [], total: 0, page: 1, pageSize: 20, search: '' }`.
   - Remove eager `fetchInvoices()`, `fetchPersons()`, `fetchAccountingDocuments()`, and `fetchChecks()` from the boot promise bundle.

2. **`src/components/invoices/InvoicesList.tsx` & `src/components/persons/PersonsManager.tsx`**:
   - Connect search inputs directly to debounced server query triggers.
   - Maintain active page state and page size selector (`20`, `50`, `100`).
   - Add clean pagination controls at the bottom of tables.

3. **`src/db/kv-store.ts` & `src/routes/data.routes.ts`**:
   - Enhance `GET /api/data/:key` to perform database-level pagination and targeted relational item attachment (`WHERE invoice_id IN (...)`).
   - Support selective projection (summary columns) for lightning-fast listings.

4. **Indexes in `src/db/schema-sync.ts`**:
   - Ensure compound B-Tree indexes exist for sorting columns (`date DESC`, `created_at DESC`) and text search fields.
