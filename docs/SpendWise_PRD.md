# SpendWise — Product Requirements Document (PRD)

**Document status:** Initial draft  
**Version:** 1.0  
**Product:** SpendWise  
**Primary platform:** Android  
**Technology direction:** React Native, Expo, TypeScript  
**Initial market assumption:** INR-first / India-focused prototype; validate before public launch

---

## 1. Executive Summary

SpendWise is an Android personal expense management application designed to help users record daily spending, set budgets, compare expenses across time periods, and understand their financial habits. The initial product will focus on dependable transaction management and clear budgeting. Later releases may add advanced analytics, transaction imports, smart insights, notifications, and supported bank-data integrations.

SpendWise should provide useful financial clarity without overwhelming users. It must prioritize accurate calculations, privacy, and a codebase that can evolve without requiring a complete rewrite.

## 2. Product Vision

**“Know where your money goes — and take control of where it goes next.”**

SpendWise will progress from a focused expense tracker into a capable personal expense management platform centered on tracking, budgeting, and analytics. The roadmap is intentionally incremental: future features should build on a reliable foundation rather than delay delivery of the first working version.

## 3. Problem Statement

People may have difficulty answering:
- How much did I spend today, this week, or this month?
- Which categories account for most of my expenses?
- How has my spending changed compared with a previous period?
- How much of my budget remains?
- Am I likely to exceed a spending limit?
- How can I reduce the effort required to maintain accurate expense records?

SpendWise addresses these needs with transaction records, budgets, comparisons, and understandable summaries.

## 4. Goals and Non-Goals

### 4.1 MVP goals
- Make recording and reviewing transactions straightforward.
- Show today's spending and relevant budget information at a glance.
- Support daily and monthly budgets.
- Provide basic spending summaries and comparisons.
- Preserve data across app restarts.
- Establish a modular architecture suitable for future features.

### 4.2 Non-goals for the MVP
- Direct bank-account connections.
- Investment trading, credit scoring, lending, or financial product recommendations.
- An AI chatbot or machine-learning prediction system.
- Multi-user household sharing.
- A complex microservices backend.
- Guaranteed automatic transaction synchronization from every bank.

## 5. Target Users

### Primary users
People who want a simple Android tool to track personal expenses and manage spending limits.

### Secondary users
Users who want more detailed category comparisons and spending reports, and may later want to consolidate supported financial accounts.

### Initial assumptions to validate
- Users are comfortable entering transactions manually at first.
- INR is the default currency for the initial prototype.
- Users value a fast dashboard more than a complex financial overview.
- Budget alerts should be configurable and informative rather than judgmental.

## 6. Product Principles

1. **Clarity:** Users should understand their spending position quickly.
2. **Accuracy:** Financial totals and comparisons must be explainable and consistent.
3. **User control:** Users can edit records, set limits, and control notifications.
4. **Privacy:** Financial data is sensitive and must be protected.
5. **Incremental growth:** Build and test a working product in phases.
6. **Useful insights:** Explain meaningful changes instead of showing charts without context.

## 7. MVP Scope and Functional Requirements

### FR-1: Dashboard
The home screen shall show:
- Total expenses for the current day.
- Daily budget, amount used, and amount remaining when a budget exists.
- Recent transactions.
- A compact category or period summary when data is available.
- Clear empty states for new users.

### FR-2: Transaction management
Users shall be able to create, view, edit, and delete transactions.

A transaction should support:
- Unique identifier.
- Amount.
- Type: expense, income, transfer, or refund as appropriate to the chosen model.
- Category.
- Transaction date/time.
- Merchant/title.
- Payment method or account reference, where available.
- Optional notes.
- Source, such as manual entry or import.
- Creation and update timestamps.

The app shall validate required fields and reject invalid or non-positive amounts where appropriate. Deletion should require confirmation when data could be lost.

### FR-3: Categories
- Provide sensible default expense and income categories.
- Allow categories to be selected during transaction entry.
- Keep expense and income categories distinguishable.
- Plan for user-defined categories in a later iteration if not included in the MVP.

### FR-4: Budgets
- Users can set and edit a daily and monthly spending limit.
- The app displays budget utilization and remaining budget.
- The design should allow weekly and category budgets to be added later.
- Budget calculations must use a clearly defined set of included transaction types.

### FR-5: Thresholds and alerts
- Support configurable thresholds, initially with defaults such as 50%, 80%, and 100%.
- Display an in-app warning when a threshold is crossed.
- Avoid repeatedly alerting for the same threshold crossing unless the budget resets or the user explicitly chooses otherwise.
- Push notifications can be added in a later phase.

### FR-6: Transaction history
- List transactions in date order.
- Filter by date range, category, and transaction type.
- Search transaction titles or merchants.
- Provide useful empty and no-results states.

### FR-7: Basic analytics
- Calculate expense totals for selected periods.
- Show spending by category.
- Compare a period with a prior equivalent period.
- Display both absolute and percentage changes where meaningful.
- Handle a zero-value comparison period without division-by-zero errors.

### FR-8: Local persistence
- Save transactions and budgets using an appropriate persistence mechanism.
- Data must remain available after closing and reopening the app.
- Keep persistence behind a service/repository interface to make later backend synchronization possible.
- Explain backup limitations to users if data exists only on the device.

### FR-9: Settings and preferences
The initial or early settings area should provide currency and budget preferences, and allow users to configure threshold behavior as supported by the MVP.

## 8. User Stories and Acceptance Criteria

| ID | User story | Acceptance criteria |
|---|---|---|
| US-01 | As a user, I want to add an expense. | A valid transaction is saved and appears in the dashboard/history with the correct amount and date. |
| US-02 | As a user, I want to edit or delete a transaction. | Changes persist after reopening the app; deletion is confirmed. |
| US-03 | As a user, I want to set a daily budget. | The dashboard shows the budget, spending, and remaining amount correctly. |
| US-04 | As a user, I want to know when I approach my limit. | The configured threshold is detected once per crossing/reset cycle. |
| US-05 | As a user, I want to compare spending periods. | The app shows correct totals and a safe, understandable comparison. |
| US-06 | As a user, I want to filter transaction history. | Filters return only matching records and can be cleared. |
| US-07 | As a user, I want my data to persist. | Saved records remain available after app restart. |
| US-08 | As a user, I want to understand category spending. | Category totals add up consistently to the included expense total. |

## 9. Core Business Rules and Financial Correctness

These rules should be implemented and tested before advanced analytics:

- **Money representation:** Use integer minor units (paise for INR) or a carefully specified decimal library. Avoid ordinary floating-point arithmetic for financial totals.
- **Currency:** The initial prototype defaults to INR. Multi-currency support is a future design decision; do not silently combine currencies.
- **Period boundaries:** Use a consistent user-local time zone and clearly define the start/end of each budget period.
- **Expenses and income:** Report them separately. Do not treat income as negative spending.
- **Transfers:** Transfers between a user's own accounts must not count as expenses.
- **Refunds:** Define whether reports show net spending or gross spending and refunded amounts; use the same rule consistently.
- **Budget inclusion:** Document which transaction types count toward each budget.
- **Comparisons:** Compare equivalent time windows. If the previous period is zero, show a meaningful message rather than an invalid percentage.
- **Imports:** Future import processes must detect duplicates using stable provider identifiers where available and sensible fallback matching otherwise.
- **Corrections:** Analytics should be derived from canonical transaction records or refreshed reliably when records change.

## 10. UX and Screen Requirements

### MVP screens
1. **Dashboard:** today's spending, budget progress, remaining amount, recent transactions.
2. **Add/Edit Transaction:** amount, type, category, date, payment method/account if available, title, notes.
3. **Transaction History:** chronological list, search, filters, transaction details.
4. **Budgets:** create/edit daily and monthly limits, show utilization and thresholds.
5. **Analytics:** period totals, category breakdown, comparison summary.
6. **Settings:** basic preferences and data-related controls.

### UX requirements
- Touch-friendly Android controls and readable typography.
- Consistent currency and date formatting.
- Loading, error, empty, and success states.
- Accessible labels and adequate contrast.
- Clear validation messages.
- Avoid unnecessary screens or steps for common actions.
- Do not rely on color alone to communicate budget status.

## 11. Technical Architecture

### Client
- React Native with Expo.
- TypeScript.
- Expo Router, following the chosen Expo template.
- Reusable UI components and feature-based organization.
- A transaction/budget service layer separated from screen components.
- Local persistence for the first version, behind an abstraction.

### Suggested structure
```text
SpendWise/
├── app/                       # Expo Router screens and layouts
│   ├── _layout.tsx
│   ├── index.tsx              # Dashboard
│   ├── transactions.tsx
│   ├── budgets.tsx
│   └── analytics.tsx
├── src/
│   ├── components/            # Reusable UI components
│   ├── features/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   └── analytics/
│   ├── services/              # Storage/API abstractions
│   ├── types/                 # Shared domain types
│   ├── utils/                 # Money/date/validation helpers
│   └── constants/
├── assets/
├── app.json
├── package.json
└── tsconfig.json
```

This is a target organization, not a requirement to move all generated template files immediately. Preserve the generated Expo configuration and conventions unless there is a clear reason to change them.

### Backend (later phase)
- Node.js with TypeScript; Express or NestJS.
- PostgreSQL.
- Authenticated APIs and strict user-level authorization.
- Database migrations and validated inputs.
- Secure secrets management, backups, monitoring, and audit-relevant logs.

### Architecture approach
Begin with a **modular monolith**, not microservices. Separate transaction, budget, analytics, notification, and integration responsibilities inside the codebase. Split services only when real scale or operational requirements justify it.

## 12. Future Roadmap

### Phase 1 — Working MVP
- Expo setup and navigation.
- Dashboard and transaction CRUD.
- Categories and local persistence.
- Daily/monthly budgets.
- Basic history and budget progress.

### Phase 2 — Analytics
- Period comparisons.
- Category charts.
- Weekly/monthly summaries.
- Better filters and CSV export.

### Phase 3 — Automation
- CSV and bank-statement import.
- Categorization rules.
- Recurring transaction detection.
- Improved notifications and summaries.

### Phase 4 — Spending intelligence
- Spending forecasts.
- Unusual-spending detection.
- Explainable recommendations based on actual transaction history.
- Optional AI-generated summaries, with calculations kept deterministic and auditable.

### Phase 5 — Connected accounts
- Evaluate an eligible bank-data provider and applicable consent/regulatory requirements.
- Add secure account connection and transaction synchronization.
- Handle sync status, duplicates, transfers, refunds, and provider errors.
- Add authentication and cloud sync as required.

Phases may be reordered based on feedback, feasibility, and learning. Bank integration is not a prerequisite for a useful MVP.

## 13. Security, Privacy, and Compliance

- Never ask users to enter bank passwords, card PINs, or OTPs directly into SpendWise.
- Protect local data appropriately and avoid logging sensitive transaction details unnecessarily.
- For a future backend, require authentication and enforce authorization on every user-owned record.
- Use encrypted transport and secure secret/token storage.
- Minimize the amount of sensitive data collected.
- Provide clear consent, revocation, and deletion processes for future integrations.
- Use an appropriate bank-data provider and obtain legal/regulatory guidance before any public financial-data integration.
- Do not claim bank connectivity or security certification unless it has actually been implemented and verified.

## 14. Non-Functional Requirements

- **Reliability:** Core transaction and budget calculations should be deterministic and tested.
- **Performance:** Common screens and transaction entry should remain responsive with a growing transaction history.
- **Maintainability:** Use typed domain models and keep business logic out of UI components.
- **Testability:** Calculation logic should be testable without rendering the app.
- **Accessibility:** Controls should be labeled, readable, and easy to use.
- **Resilience:** Show useful errors for failed storage, imports, or future network operations.
- **Data integrity:** Edits, deletions, and imports should not silently corrupt totals.
- **Portability:** Keep business rules independent of the UI so another client could be added later if needed.

## 15. Testing Strategy

Prioritize unit tests for:
- Money arithmetic and formatting.
- Daily/monthly date boundaries.
- Budget remaining amounts and threshold crossings.
- Period-to-period comparisons, including zero previous spending.
- Refund and transfer treatment.
- Category totals.
- Persistence and transaction edits/deletions.
- Import deduplication when imports are introduced.

Also perform Android device testing for navigation, forms, keyboard behavior, small screens, app restarts, and error/empty states.

## 16. Success Metrics

Initial product metrics to evaluate:
- Users can add and retrieve a transaction without errors.
- Dashboard totals match the underlying transactions.
- Budget calculations pass defined test cases.
- Users can identify remaining budget quickly.
- Transaction data persists across app restarts.
- Comparison reports reconcile with transaction records.
- No cross-user data access is possible once accounts/backend exist.

Do not set arbitrary growth targets until there is real user feedback and usage data.

## 17. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Scope grows too quickly | Keep MVP scope fixed and track future features separately. |
| Incorrect financial totals | Define transaction semantics and test calculation functions. |
| Local data loss | Explain backup limits; add secure backup/sync in a later phase. |
| Bank integration complexity | Prototype with manual entries and CSV imports first. |
| Duplicate imported transactions | Use stable identifiers and deduplication rules. |
| Premature architectural complexity | Start with a modular monolith and simple interfaces. |
| Misleading predictions | Show assumptions and confidence/limitations; avoid presenting estimates as facts. |

## 18. Open Decisions

These decisions should be confirmed as development proceeds:
- Is the app single-user/local-only initially, or is login and cloud sync required in the first release?
- Should the first release support only INR?
- Which local persistence solution best fits the selected Expo SDK and requirements?
- Which charts and UI design system should be used?
- Should weekly budgets be part of the MVP or Phase 2?
- What privacy, backup, and data-export behavior is required for the initial release?
- Which provider and legal route would be appropriate for future bank data access?

## 19. MVP Definition of Done

The MVP is ready for initial user testing when:
- It runs on a physical Android device.
- Users can create, view, edit, and delete transactions.
- Data persists across app restarts.
- Daily and monthly budget calculations are correct.
- The dashboard reflects changes to transaction records.
- Basic history and category summaries work.
- Core calculation tests pass.
- Empty, invalid-input, and failure states are handled.
- No real bank integration is falsely represented as available.
- Setup and testing instructions are documented.

---

**Product decision:** SpendWise starts as a reliable Android expense tracker with budgeting and basic analytics. Advanced insights and bank integration are planned extensions, not MVP dependencies.
