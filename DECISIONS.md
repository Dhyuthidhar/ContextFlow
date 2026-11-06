# ContextFlow decision log

## [DECISION] — 6 November 2026

**What was decided:** ContextFlow V1 extends the existing Tailwind CSS stack with one semantic-token and reusable-component foundation using a restrained Neobrutalist visual language.

**Reason:** Authentication, employee approval, role selection, document governance, and approval screens need consistent, accessible contracts without introducing a competing component framework or redesigning the inherited dashboard.

**Agreed by:** CTO authorization for PR 2A; implementation subject to CTO review before merge.

**Affects:** Frontend design tokens, shared presentation components, V1 frontend acceptance criteria, and visual regression tests.

**Linked issue/PR:** Proposed work breakdown CF-DS-01 through CF-DS-07; PR 2A.

**Guardrails:** Existing dashboard and business behavior remain unchanged. Authentication, database migrations, RBAC enforcement, and authorization behavior remain PR 2B scope.
