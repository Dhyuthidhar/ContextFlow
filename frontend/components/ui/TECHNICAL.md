# UI foundation technical contract

## Data schema

This presentation boundary owns no database schema and persists no state. Feature modules pass data and callbacks through typed React props.

## Component contracts

- Components consume semantic Tailwind tokens backed by CSS custom properties.
- Components do not fetch data, access environment variables, or decide permissions.
- `RoleSelector` accepts reviewed role copy and selection state; it does not enforce RBAC.
- `Dialog` renders through a body portal, makes background content inert, traps keyboard focus, closes with Escape, and restores focus.
- `DataTable` requires a caption and column definitions and provides an accessible horizontal-overflow region.

Exact public prop types live with each component and are re-exported through `index.ts`.

## Dependencies

- React 18 and Next.js 14 from the existing application.
- Tailwind CSS 3 and CSS custom properties from the existing styling system.
- Playwright from the existing test toolchain.

No component framework, runtime accessibility library, state library, or styling dependency is added.

## Testing strategy

### Component and keyboard scenarios

- Every representative input and action has an accessible name.
- Native radio Arrow-key behavior changes the selected role and retains focus.
- Dialog opening moves focus inside; Tab and Shift+Tab remain inside; Escape closes; the trigger regains focus.
- Modal background content is inert while the dialog is open.
- Representative button, disabled, and status text/background combinations meet a 4.5:1 contrast threshold.

### Responsive and visual scenarios

- The review surface has no page-level horizontal overflow at 390 CSS pixels.
- Desktop and mobile representative screenshots match committed baselines.
- Role selection has separate desktop and mobile baselines because permission copy and wrapping are business-critical.

### Regression scenarios

- TypeScript passes for the complete frontend.
- Focused ESLint passes for all new and modified PR 2A source and test files.
- The Next.js application compiles and generates routes using non-secret local placeholder configuration.
- PR 1 deterministic backend tests remain green without live services.

## Known limitations

- PR 2A does not migrate inherited dashboard controls to these components.
- Browser verification currently covers Chromium; cross-browser coverage is deferred until CI/browser policy is approved.
- Automated checks cannot prove every WCAG criterion. Manual keyboard, zoom, screen-reader, and responsive review remains required before a production UI release.
- Role descriptions are proposed UI copy and do not grant authority; PR 2B owns the approved capability matrix and enforcement.
