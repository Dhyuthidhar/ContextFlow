# ContextFlow V1 Design System

Status: PR 2A foundation

Reference: bergside `neobrutalism` `SKILL.md` and `DESIGN.md`

Scope: representative primitives for authentication, employee approval, role selection, document governance, permissions, and approvals

## Context and goals

ContextFlow uses a restrained Neobrutalist visual language: strong boundaries, high contrast, warm surfaces, explicit interaction states, and a small number of accents. Clarity and WCAG 2.2 AA take priority over novelty.

PR 2A establishes the foundation only. It does not redesign existing dashboard pages or implement authentication, database authorization, role enforcement, approvals, or document behavior.

## Existing UI audit — CF-DS-01

The updated integration baseline is Next.js 15, React 18, TypeScript, and Tailwind CSS 3. It has no component library and no reusable design-system layer. Tailwind and CSS custom properties are therefore the existing technologies to extend.

Confirmed reusable foundations:

- The root Next.js layout and `next/font` integration.
- Tailwind configuration and utility workflow.
- Existing `Sidebar`, project forms, cards, status labels, filters, and upload controls as migration references.
- Playwright configuration for browser-level verification.

Baseline findings:

- Colors, borders, radii, shadows, and focus states are repeated as page-local utility strings and raw hex values.
- Similar buttons and fields use different interaction states.
- Several fields lack explicit `id`/`htmlFor`, descriptions, and programmatic error relationships.
- Icon-only controls do not consistently have accessible names.
- `outline-none` is common and replacement focus treatment is inconsistent.
- The fixed 240-pixel sidebar and several fixed two-, three-, and five-column grids are not mobile-ready.
- There is no dialog primitive, focus-trap contract, role-selection pattern, component review surface, accessibility suite, or visual baseline.
- Existing end-to-end tests depend on live project data and do not verify keyboard behavior or component accessibility.

PR 2A does not repair these dashboard findings wholesale. New V1 screens must use the foundation below; existing screens migrate only when an approved journey touches them or through a separately approved cleanup PR.

## Design tokens and foundations — CF-DS-02

Tokens are defined in `app/globals.css` and exposed through `tailwind.config.ts`. Components consume semantic tokens, not raw palette values.

### Color

| Role | Primitive | Semantic use |
|---|---:|---|
| Primary | `#FDC800` | Primary action and selected state |
| Secondary | `#432DD7` | Focus and restrained secondary action |
| Success | `#16A34A` | Palette source; darker semantic text on a light surface |
| Warning | `#D97706` | Palette source; darker semantic text on a light surface |
| Danger | `#DC2626` | Palette source; darker semantic text on a light surface |
| Canvas | `#FBFBF9` | Warm application background |
| Ink | `#1C293C` | Text and strong borders |

Do not use a status color as the only indication of state. Pair it with a visible label or icon plus accessible text. Do not place normal-size yellow, orange, green, or red text on the warm canvas unless the semantic token combination has been contrast-verified.

### Typography

- Primary and display: Inter.
- Technical metadata and compact labels: JetBrains Mono.
- Scale: 13, 15, 17, 21, 27, and 35 pixels.
- Body line height: 1.5. Heading line height: 1.2.
- Use weight and scale for hierarchy; do not create hierarchy with accent colors alone.

### Spacing, borders, and motion

- Spacing scale: 4, 8, 12, 16, 24, and 32 pixels.
- Standard border: 2 pixels. Emphasized interactive boundary: 3 pixels.
- Radius: 4 or 8 pixels only.
- Standard offset shadow: 4 by 4 pixels. Compact controls use 2 by 2 pixels.
- Interaction transition: 120ms. Respect `prefers-reduced-motion`.
- Focus-visible ring: canvas separation ring followed by a 3-pixel secondary-color ring.

## Component contracts — CF-DS-03 through CF-DS-05

All components live in `components/ui`. They are presentation contracts and contain no ContextFlow authorization logic.

### Button

- Variants: primary, secondary, danger, quiet.
- States: default, hover, focus-visible, active, disabled, loading.
- A loading button sets `aria-busy` and remains disabled until completion.
- Icon-only usage requires an accessible name.
- Do not use a styled `div` as a button.

### TextField, SelectField, TextAreaField

- Require a stable `id` and visible label.
- Optional description and error are connected with `aria-describedby`.
- Invalid state uses `aria-invalid` and a textual alert.
- Required state is conveyed visually and to assistive technology.
- Disabled fields must explain why in adjacent content when the reason is not obvious.

### Panel and document-card foundation

- Panel provides the shared surface, border, radius, padding, and shadow contract.
- Document cards must expose filename as text, source type, version, status, owner, and timestamp where relevant.
- Do not rely on emoji or file color as the accessible filename or type.

### Badge

- Tones: neutral, accent, success, warning, danger.
- Badge text must name the state. A colored dot alone is prohibited.
- Badges are informational, not interactive controls.

### NavItem

- Active navigation exposes `aria-current="page"`.
- It supports keyboard focus and a minimum 44-pixel primary target height.
- Existing dashboard navigation is not migrated in PR 2A.

### DataTable

- Requires a programmatic caption, column headers, and semantic rows/cells.
- Wide tables use a deliberately keyboard-focusable horizontal overflow region.
- A later feature may provide a card alternative on narrow screens when row relationships remain understandable.

### Dialog

- Requires an accessible title and optional description.
- Uses `role="dialog"`, `aria-modal="true"`, initial focus, Tab/Shift+Tab containment, Escape close, and focus restoration.
- Destructive and approval actions must use explicit verbs.
- Clicking the overlay closes the representative dialog; production workflows must preserve unsaved-work warnings where required.

### RoleSelector — CF-DS-04

- Uses native radio inputs grouped by a `fieldset` and `legend`.
- Every role shows its name, purpose, allowed actions, and restrictions.
- Arrow-key selection follows the browser's native radio behavior.
- Selection is indicated by text/control state as well as color.
- Role copy is a product contract for review, not RBAC enforcement. PR 2B owns enforcement.
- Organization roles (Owner, Admin, Member) and project roles (Project Admin, Developer, Reviewer) are presented as separate grants.
- An Admin may propose promotion or demotion of an Admin, but Owner approval is required before it takes effect.
- Protected product-rule approval remains Owner-controlled; any required client sign-off remains separate.
- Exact Project Admin delegation is still a CTO decision and is identified as unresolved rather than presented as implemented authority.

### Authentication preview

- The representative sign-in action is Google Workspace SSO; ContextFlow does not collect a password.
- Workspace identity verification does not itself grant ContextFlow access.
- Pending and disabled account states explain the next action and preserve the distinction between Google identity and ContextFlow authorization.
- This PR implements presentation only. OIDC, sessions, account transitions, and authorization remain later security slices.

## Responsive behavior

- New screens start as a single column and add columns only at documented breakpoints.
- Controls wrap rather than overflow.
- Long labels and filenames wrap or truncate only when the full value remains available through an accessible mechanism.
- The `/design-system` review surface intentionally overlays the inherited fixed dashboard shell so its mobile behavior can be reviewed without redesigning that shell.

## Accessibility requirements — CF-DS-06

Relevant frontend tasks are not done until:

- All functions are operable using keyboard alone with a logical focus order.
- Visible focus is present and not clipped.
- Text and meaningful UI graphics meet WCAG 2.2 AA contrast requirements.
- Primary interactive targets are at least 44 by 44 CSS pixels where practical and never below WCAG 2.2 minimum target-size requirements without an allowed exception.
- Content remains usable at 200% text zoom and narrow mobile widths.
- Labels, descriptions, errors, status messages, tables, and dialogs expose correct semantics.
- Color is never the only carrier of status, selection, permission, or error.
- Reduced-motion preference is honored.
- Focused Playwright checks cover keyboard selection, dialog focus behavior, responsive overflow, and representative screenshots.
- Parent rerenders with a new dialog callback do not reset focused input or rebuild the modal lifecycle.
- Manual review covers keyboard-only navigation, zoom, responsive reflow, and contrast combinations that automated checks cannot fully prove.

## Content and tone

- Use concise, explicit verbs: `Approve change`, `Reject proposal`, `Request access`.
- Explain unavailable actions: `Membership required`, not merely `Disabled`.
- State authority limits next to approval controls.
- Do not describe candidate rules as approved or code-read evidence as test-verified.

## Anti-patterns

- No second component library or parallel token set.
- No raw hex colors, arbitrary spacing, or one-off shadows in new V1 components.
- No clickable `div` or `span` elements.
- No hidden focus outline without an equal or stronger `focus-visible` replacement.
- No role name without allowed actions and restrictions.
- No dashboard-wide restyle hidden inside a feature PR.
- No migration of an existing component without regression coverage for its user journey.

## Migration notes — CF-DS-07

1. Use the review surface to approve tokens and representative states.
2. PR 2B consumes the primitives for authentication, employee approval, and role assignment.
3. Document and decision PRs add only missing domain-specific composites; they do not fork foundational primitives.
4. Existing dashboard pages migrate only when touched by an approved V1 feature or through a separate bounded PR.
5. A token or shared-component contract change requires visual and accessibility regression review.

## Code-review QA checklist

- [ ] Uses semantic tokens and the existing Tailwind system.
- [ ] Has default, hover, focus-visible, active, disabled, loading, and error states where relevant.
- [ ] Has accessible names and programmatic relationships.
- [ ] Works by keyboard and at mobile width.
- [ ] Does not rely on color alone.
- [ ] Preserves existing business behavior.
- [ ] Includes focused browser, visual, and regression evidence.
- [ ] Records limitations and rollback instructions in the PR.
