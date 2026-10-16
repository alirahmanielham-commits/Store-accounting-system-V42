# Mobile Optimization & Mobile Restricted Navigation Implementation Plan

Refine and optimize the application's mobile experience so that when opened on mobile screens, only the 5 mobile-ready modules are displayed via an enhanced, beautiful floating bottom navigation bar and sub-action sheet, with a friendly guide page for desktop-only features.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were confirmed in Phase 1 clarification:

- **Confirmed Decision 1 (Permitted Mobile Pages)**: Access in mobile view is strictly tailored to the 5 mobile-optimized modules:
  1. **دریافت و پرداخت** (Receipts & Payments - Cash/Bank/POS/Keyboard entry)
  2. **ثبت و مدیریت چک** (Checks - Receive, Pay, Checks Portfolio & Dashboard)
  3. **فاکتورها و کالا** (Invoices & Products - Sales, Purchase, Products/Services list)
  4. **اشخاص و حساب** (Persons & Accounts - Persons list, Ledger Card, Profile)
  5. **بدهکاران و بستانکاران** (Debtors & Creditors - Debtors report, Receivables showcase)
- **Confirmed Decision 2 (Mobile Menu Visual Design)**: Modern floating bottom navigation bar with prominent category icons, high-contrast active states, upper quick-action bar for rapid switching between sub-items, and smooth bottom sheet for category exploration.
- **Confirmed Decision 3 (Desktop Page Restriction Behavior)**: When attempting to access desktop-only features (e.g. accounting double-entry vouchers, year closing, complex inventory stocktakes, or system settings) on mobile screens, render a beautiful, helpful guide screen (`MobileRestrictedAccess`) with instant shortcuts back to the 5 permitted mobile modules.

---

## 1. Overview & Core Concept

- **What It Does**: Automatically detects mobile viewports ($\le 768\text{px}$) and renders a sleek, thumb-friendly touch interface. Non-mobile-optimized views gracefully redirect to the `MobileRestrictedAccess` component, keeping mobile users focused on quick field operations (issuing receipts, recording checks, sales invoices, looking up debtors, or searching customer ledger cards).
- **Target Audience / Persona**: Sales representatives, store clerks, accountants on mobile devices, and business owners doing quick field entries and debt checks on the go.
- **Key Value**: Eliminates horizontal scroll clutter, broken wide tables, and tiny desktop buttons on mobile devices while providing a 100% operational mobile workflow for core daily tasks.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Mobile App Launch / Navigation**: User opens the app on a smartphone. A clean floating bottom navigation bar displays the 5 key module buttons (`دریافت/پرداخت`, `ثبت چک`, `فاکتور و کالا`, `شخص و حساب`, `بدهکار/بستانکار`).
  2. **Sub-Item Quick Switcher**: Above the main bottom bar, a horizontal sub-action pill bar lets the user switch between views in the active module with 1 tap (e.g. switching between "ثبت دریافت" and "ثبت پرداخت").
  3. **Expanded Bottom Sheet**: Tapping "بیشتر" or tapping an active bottom tab opens a smooth backdrop-blurred bottom sheet showing all available sub-tasks with descriptions, badges, and quick module switchers.
  4. **Desktop Feature Redirection**: If a deep link or internal action triggers a desktop-only tab (e.g., `chart_of_accounts`), `App.tsx` displays `MobileRestrictedAccess`, explaining why the feature is desktop-optimized and providing 1-tap shortcuts back to the 5 allowed mobile hubs.

- **Visual Identity & Theme**:
  - **Color Palette**: High-contrast, domain-native Persian slate canvas with vivid module accent gradients (Teal for Receipts, Sky Blue for Checks, Emerald for Invoices, Indigo/Purple for Persons, Rose for Debts).
  - **Typography**: IRANYekanX / Vazirmatn Persian fonts with tabular numerals (`tabular-nums`) for currency values and dates.
  - **Ergonomics**: Touch hitboxes $\ge 44\text{px}$, aggregate sticky elements $\le 15\%$ of viewport height, zero two-line button text wrapping (`whitespace-nowrap shrink-0`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Strict Mobile Tab Whitelist vs. Desktop Layout Collapse**
  - *Chosen Approach*: Enforce `MOBILE_ALLOWED_TABS` set in `MobileRestrictedMenu.tsx` and render `MobileRestrictedAccess` for unlisted tabs on mobile viewports.
  - *Why*: Unoptimized complex desktop data grids (e.g. multi-column financial journal entries, ledger trees) distort viewports on mobile screens, leading to data entry errors and poor UX.
- **Decision 2: Floating Bottom Navigation + Sub-Actions Bar**
  - *Chosen Approach*: Two-tier bottom bar anchored to the bottom thumb zone with smooth Framer Motion transitions.
  - *Why*: Leaves maximum screen area for input forms and lists while keeping all sub-pages accessible within 1–2 thumb taps.

---

## 4. Technical Architecture & Component Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                          Mobile Viewport                        │
│                   (window.innerWidth <= 768px)                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       [ Allowed Mobile Tab ]            [ Restricted Desktop Tab ]
                 │                               │
                 ▼                               ▼
     Render Mobile Form / View        Render MobileRestrictedAccess
    (Receipts, Checks, Invoices,      (Friendly guide & quick shortcuts)
      Persons, Debtors Report)
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                                 ▼
                     MobileRestrictedMenu
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
  Upper Quick-Action Bar                       Fixed Bottom Bar
  (Fast sub-item switching)                  (5 Core Module Tabs)
         │                                               │
         └───────────────────────┬───────────────────────┘
                                 ▼
                       Expanded Bottom Sheet
                    (Full list of sub-actions)
```

- **Core Files & Changes**:
  - `src/components/MobileRestrictedMenu.tsx`: Enhance categories, clean up sub-item lists, optimize touch target sizes ($\ge 44\text{px}$), refine Persian typography, ensure single-line text formatting, and adjust sticky heights.
  - `src/components/mobile/MobileRestrictedAccess.tsx`: Polish layout, update shortcut cards to align perfectly with `MOBILE_ALLOWED_TABS`, and ensure clear visual feedback.
  - `src/App.tsx` & Layouts: Ensure `MOBILE_ALLOWED_TABS` check correctly filters active tab when in mobile viewport, showing `MobileRestrictedAccess` for restricted tabs while hiding heavy desktop sidebars on mobile screens.

---

## 5. Implementation Roadmap

1. **Phase 1: Update Mobile Allowed Tabs & Permission Checks**
   - Ensure `MOBILE_ALLOWED_TABS` contains all relevant mobile sub-items (including `keyboard_receipt`, `create_receive_receipt`, `create_pay_receipt`, `list_receive_receipt`, `list_pay_receipt`, `receive_check_form`, `received_checks_page`, `paid_checks_page`, `check_panel`, `create_sale`, `create_purchase`, `products`, `list_sale`, `list_purchase`, `persons`, `person_ledger`, `person_profile`, `debts_credits`, `debtors_showcase`).

2. **Phase 2: Polish Mobile Navigation & Bottom Sheet Components**
   - Fine-tune `MobileRestrictedMenu.tsx` styling, Framer Motion animations, touch target hitboxes, font sizes, and contrast.
   - Prevent layout shift and maintain sticky height caps within ergonomic thumb zones.

3. **Phase 3: Refine MobileRestrictedAccess Component**
   - Ensure the warning/guide component looks exceptional, with clear IRANYekanX typography, smooth gradient icons, and direct CTA buttons to allowed mobile routes.

4. **Phase 4: Verification & Compilation**
   - Test build with `compile_applet` and verify zero syntax/type errors.
