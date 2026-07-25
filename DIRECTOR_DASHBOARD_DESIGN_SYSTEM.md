# My Dream School — Director Dashboard Design System

> **Document type:** Authoritative UI/UX specification for AI coding agents
>
> **Scope:** The complete Director Dashboard and every page rendered inside it
>
> **Priority:** This document is the single source of truth for Director Dashboard design decisions
>
> **Audience:** AI coding agents and developers modifying the project

---

## 1. Mandatory AI Instructions

Before creating, redesigning, or modifying any Director Dashboard page, an AI agent must:

1. Read this entire document.
2. Inspect the existing shared dashboard layout, routing, permissions, and reusable components.
3. Reuse the tokens, dimensions, patterns, and components defined here.
4. Preserve existing business logic, API calls, permissions, and data behavior unless the task explicitly requests functional changes.
5. Avoid isolated page-specific styling when a reusable token or component can solve the same problem.
6. Apply the design incrementally without breaking already working pages.
7. Treat this file as more authoritative than legacy inline styles or inconsistent page-level CSS.

If existing code conflicts with this specification, migrate the existing code toward this specification. Do not copy visual inconsistencies from legacy pages.

When the user gives a command such as:

> “Redesign this Director Dashboard page according to the project design system.”

the AI must use this document automatically and implement the page consistently with the rest of the dashboard.

---

## 2. Product Context

My Dream School is a school-management platform with:

- a React frontend;
- a Node.js and Express backend;
- MongoDB Atlas;
- Vercel frontend deployment;
- Render backend deployment;
- role-based permissions;
- dashboards for directors, administrators, teachers, students, accountants, reception staff, supervisors, HR, and call-center staff.

The Director Dashboard is a high-information administrative workspace. It manages areas such as:

- overview and operational statistics;
- students and classes;
- teachers and staff;
- lesson schedules;
- lesson substitutions;
- attendance and grades;
- payments and financial information;
- reports;
- announcements and notifications;
- permissions;
- inventory;
- AI tools;
- other school-management operations.

The interface must feel like one coherent product rather than a collection of unrelated pages.

---

## 3. Design Goals

The Director Dashboard must be:

- professional;
- calm and trustworthy;
- information-dense without feeling crowded;
- easy to scan;
- consistent across all modules;
- responsive from mobile devices to wide desktop screens;
- accessible;
- predictable;
- maintainable;
- suitable for frequent daily administrative use.

The design must prioritize clarity and operational efficiency over decoration.

### Desired visual character

- clean white surfaces;
- soft neutral page backgrounds;
- deep navy dashboard chrome for the sidebar and top bar;
- restrained blue brand accents;
- clear hierarchy;
- subtle borders;
- light shadows;
- consistent spacing;
- readable tables;
- compact but comfortable controls;
- minimal animation;
- no visual noise.

---

## 4. Non-Goals

The Director Dashboard must not look like:

- a marketing landing page;
- a gaming interface;
- a social-media feed;
- a collection of unrelated templates;
- an emoji-driven interface;
- a neon or glassmorphism showcase;
- an interface with excessive gradients or animations.

Do not sacrifice usability for decorative effects.

---

## 5. Single Source of Truth

All new shared design values should eventually live in a common stylesheet, for example:

```text
frontend/src/styles/director-tokens.css
frontend/src/styles/director-components.css
```

Exact filenames may follow the existing project architecture, but the implementation must provide:

- shared CSS variables;
- reusable component classes;
- predictable variants;
- no duplicated token definitions across pages.

Page-level CSS is allowed only for layout or behavior unique to that page.

---

## 6. Core Design Tokens

Use the following CSS variables as the canonical token set:

```css
:root {
  /* Primary brand palette */
  --director-primary-50: #eff6ff;
  --director-primary-100: #dbeafe;
  --director-primary-200: #bfdbfe;
  --director-primary-300: #93c5fd;
  --director-primary-400: #60a5fa;
  --director-primary-500: #3b82f6;
  --director-primary-600: #2563eb;
  --director-primary-700: #1d4ed8;
  --director-primary-800: #1e40af;
  --director-primary-900: #1e3a8a;

  /* Neutral palette */
  --director-white: #ffffff;
  --director-slate-25: #fcfdff;
  --director-slate-50: #f8fafc;
  --director-slate-100: #f1f5f9;
  --director-slate-200: #e2e8f0;
  --director-slate-300: #cbd5e1;
  --director-slate-400: #94a3b8;
  --director-slate-500: #64748b;
  --director-slate-600: #475569;
  --director-slate-700: #334155;
  --director-slate-800: #1e293b;
  --director-slate-900: #0f172a;

  /* Semantic colors */
  --director-success-bg: #ecfdf5;
  --director-success-soft: #d1fae5;
  --director-success: #16a34a;
  --director-success-dark: #166534;

  --director-warning-bg: #fffbeb;
  --director-warning-soft: #fef3c7;
  --director-warning: #f59e0b;
  --director-warning-dark: #92400e;

  --director-danger-bg: #fef2f2;
  --director-danger-soft: #fee2e2;
  --director-danger: #ef4444;
  --director-danger-dark: #991b1b;

  --director-info-bg: #eff6ff;
  --director-info-soft: #dbeafe;
  --director-info: #3b82f6;
  --director-info-dark: #1e40af;

  /* Layout dimensions */
  --director-sidebar-width: 272px;
  --director-sidebar-collapsed-width: 84px;
  --director-topbar-height: 72px;
  --director-content-max-width: 1440px;
  --director-page-padding-x: 28px;
  --director-page-padding-y: 24px;

  /* Spacing scale */
  --director-space-1: 4px;
  --director-space-2: 8px;
  --director-space-3: 12px;
  --director-space-4: 16px;
  --director-space-5: 20px;
  --director-space-6: 24px;
  --director-space-8: 32px;
  --director-space-10: 40px;
  --director-space-12: 48px;

  /* Border radii */
  --director-radius-sm: 8px;
  --director-radius-md: 12px;
  --director-radius-lg: 16px;
  --director-radius-xl: 20px;
  --director-radius-pill: 999px;

  /* Shadows */
  --director-shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.05);
  --director-shadow-sm: 0 4px 14px rgba(15, 23, 42, 0.06);
  --director-shadow-md: 0 12px 32px rgba(15, 23, 42, 0.09);
  --director-shadow-lg: 0 24px 64px rgba(15, 23, 42, 0.16);

  /* Motion */
  --director-transition-fast: 140ms ease;
  --director-transition-default: 200ms ease;
}
```

### Token rules

- Primary actions use `--director-primary-600`.
- Primary hover states use `--director-primary-700`.
- Subtle branded backgrounds use `--director-primary-50`.
- The default application background uses `--director-slate-50`.
- Cards use white backgrounds.
- Primary text uses `--director-slate-900`.
- Secondary text uses `--director-slate-500`.
- Default borders use `--director-slate-200`.
- Errors use only the danger palette.
- Warnings use only the warning palette.
- Successful states use only the success palette.
- Informational states use only the info palette.
- Do not introduce arbitrary hex values when an existing token is suitable.

---

## 7. Typography

Use the following font stack:

```css
font-family:
  Inter,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

### Typography scale

| Role | Desktop size | Mobile size | Weight | Line height |
|---|---:|---:|---:|---:|
| Page title | 28px | 24px | 750 | 1.2 |
| Section title | 20px | 18px | 700 | 1.3 |
| Card title | 16px | 16px | 700 | 1.35 |
| Body | 14px | 14px | 400 | 1.55 |
| Emphasized body | 14px | 14px | 650 | 1.45 |
| Supporting text | 13px | 12px | 400 | 1.45 |
| Form label | 13px | 13px | 650 | 1.3 |
| Badge | 12px | 12px | 700 | 1 |
| Statistic value | 28px | 24px | 750 | 1.1 |

### Typography rules

- Every page must have exactly one visible `h1`.
- Do not use random emojis inside page titles.
- Headings use `--director-slate-900`.
- Descriptions and metadata use `--director-slate-500`.
- Long explanatory text should not exceed `720px` in width.
- Administrative pages should be left-aligned by default.
- Avoid making every label and value bold.
- Use font weight to create hierarchy, not decoration.

---

## 8. Global Dashboard Shell

The Director Dashboard shell consists of:

1. Sidebar.
2. Top bar.
3. Main content area.
4. Optional overlays such as modals and notifications.

### Desktop shell

```text
┌──────────────────────────────────────────────────────────────┐
│ Sidebar │ Top bar                                            │
│         ├────────────────────────────────────────────────────│
│         │ Main content                                       │
│         │                                                    │
│         │                                                    │
└──────────────────────────────────────────────────────────────┘
```

### Main content container

```css
.director-page {
  width: 100%;
  max-width: var(--director-content-max-width);
  margin: 0 auto;
  padding:
    var(--director-page-padding-y)
    var(--director-page-padding-x);
}
```

The main content area must not become excessively wide on large screens.

---

## 9. Sidebar

### Dimensions

- Expanded width: `272px`.
- Collapsed width: `84px`.
- Menu item height: `44px`.
- Menu item radius: `10px`.
- Gap between menu items: `4px`.
- Sidebar internal horizontal padding: `12px`.

### Sidebar color treatment

- Background: `#111c31`.
- Header and sidebar must use the same deep navy surface so the dashboard shell feels unified.
- Default navigation text: `#aebbd0`.
- Primary sidebar text and product name: `#f8fafc`.
- Muted sidebar text: `#94a3b8`.
- Hover background: `#1b2a43`; hover text: white.
- Active background: `--director-primary-600`; active text: white.
- Sidebar dividers and borders: `#26344c`.
- The dark treatment is reserved for the Director Dashboard shell. Content pages and cards remain neutral and white.

### Sidebar hierarchy

1. Product logo and name.
2. Primary navigation groups.
3. Secondary or utility navigation.
4. User/profile section when applicable.

### Navigation item states

Default:

- transparent background;
- `#aebbd0` text;
- `20px` icon.

Hover:

- `#1b2a43` background;
- white text.

Active:

- `primary-600` background;
- white text;
- semibold label.

Do not combine an active gradient, strong shadow, left border, and background highlight simultaneously. Use one clear active pattern.

### Navigation groups

- Group labels use `11px`, `700`, and `slate-400`.
- Nested menus must have clear indentation.
- Expanded/collapsed animations must use the default transition token.
- The active child route must remain visibly connected to its parent.

---

## 10. Top Bar

- Height: `72px`.
- Background: `#111c31`.
- Bottom border: `1px solid #26344c`.
- Primary text and icons use `#f8fafc`; supporting text uses `#94a3b8`.
- Controls use `#18253b` surfaces with `#2b3a53` borders.
- Hovered controls may use `#243654`; branded active states use the primary blue palette.
- Search, notifications, quick actions, and profile controls must share the same vertical center.
- Icon buttons are `40x40px`.
- Avoid large shadows.
- The top bar may become sticky if it improves long-page navigation.

On mobile:

- show a menu trigger;
- preserve the page context;
- keep essential actions accessible;
- avoid overcrowding.

---

## 11. Standard Page Structure

Every Director Dashboard page should use this order:

1. Page header.
2. Optional statistics.
3. Filter/action bar.
4. Main content.
5. Pagination or secondary actions.

Use `24px` as the default vertical gap between major sections.

Recommended React structure:

```jsx
<main className="director-page">
  <header className="director-page-header">
    <div className="director-page-heading">
      <h1>Page title</h1>
      <p>Short explanation of the page purpose.</p>
    </div>

    <div className="director-page-actions">
      <button className="director-btn director-btn-secondary">
        Secondary action
      </button>
      <button className="director-btn director-btn-primary">
        Primary action
      </button>
    </div>
  </header>

  <section className="director-stats-grid">
    {/* Standard statistic cards */}
  </section>

  <section className="director-filter-bar">
    {/* Search and filters */}
  </section>

  <section className="director-card">
    {/* Main table, form, or content */}
  </section>
</main>
```

Not every page needs every section. Do not render empty structural blocks.

---

## 12. Page Header

The page header must contain:

- a clear page title;
- one short description;
- optional primary and secondary actions.

### Desktop

```text
┌─────────────────────────────────────────────────────────────┐
│ Page title                         [Secondary] [Primary]     │
│ One-line explanation of the page                            │
└─────────────────────────────────────────────────────────────┘
```

### Rules

- Title size: `28px`.
- Description size: `14px`.
- Description top margin: `6px`.
- Action gap: `10px`.
- Avoid oversized hero sections on ordinary management pages.
- Gradients are reserved for the dashboard home or a genuinely important hero section.
- On mobile, actions move below the title and may become full-width.

---

## 13. Cards

### Standard card

```css
.director-card {
  border: 1px solid var(--director-slate-200);
  border-radius: var(--director-radius-lg);
  background: var(--director-white);
  box-shadow: var(--director-shadow-sm);
  padding: 20px;
}
```

### Card rules

- Use `16px` radius by default.
- Use subtle shadows only.
- Cards should not all look clickable.
- Add hover behavior only when the entire card is interactive.
- Do not mix many radius sizes within one page.
- Avoid nesting multiple bordered cards unless the hierarchy requires it.

### Statistic cards

- Minimum height: `124px`.
- Padding: `20px`.
- Icon container: `44x44px`.
- Icon container radius: `12px`.
- Value: `28px / 750`.
- Label: `13px / 500`.
- Maximum four cards per row on desktop.
- Two cards per row on tablets.
- One card per row on narrow mobile screens.

Do not combine a colored full background and a colored left border on the same statistic card.

---

## 14. Buttons

### Standard sizes

| Size | Height | Horizontal padding | Text |
|---|---:|---:|---:|
| Small | 32px | 12px | 12px / 650 |
| Default | 40px | 16px | 14px / 650 |
| Large | 46px | 20px | 14px / 700 |
| Icon | 36x36px or 40x40px | 0 | 16–18px icon |

### Variants

#### Primary

- `primary-600` background;
- white text;
- `primary-700` hover;
- use for the most important action in a section.

#### Secondary

- white background;
- `slate-300` border;
- `slate-700` text;
- use for neutral secondary actions.

#### Soft

- `primary-50` background;
- `primary-700` text;
- use for low-emphasis branded actions.

#### Danger

- danger background;
- white text;
- use only for confirmed destructive actions.

#### Danger soft

- danger-soft background;
- danger-dark text;
- use for delete icon buttons before confirmation.

#### Ghost

- transparent background;
- no permanent border;
- use for low-emphasis navigation or close actions.

### Button rules

- One visual primary action per action group.
- Cancel buttons are never primary.
- Destructive actions must not compete visually with the primary action.
- Button labels must describe the action clearly.
- Avoid ambiguous labels such as “OK” when “Save schedule” is possible.
- Never use a standalone emoji as a production action button.
- Icon-only buttons require `aria-label` and `title`.
- Loading buttons must be disabled and communicate progress.

---

## 15. Forms

### Standard controls

```css
.director-input,
.director-select,
.director-textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--director-slate-300);
  border-radius: var(--director-radius-sm);
  background: var(--director-white);
  color: var(--director-slate-900);
  font: inherit;
  font-size: 14px;
  padding: 10px 12px;
}

.director-input:focus,
.director-select:focus,
.director-textarea:focus {
  outline: 3px solid rgba(59, 130, 246, 0.14);
  border-color: var(--director-primary-400);
}
```

### Form spacing

- Label-to-control gap: `6px`.
- Form-group gap: `16px`.
- Two-column form gap: `16px`.
- Section gap: `24px`.
- Textarea minimum height: `104px`.

### Form rules

- Every input must have a visible label.
- Placeholders do not replace labels.
- Required fields must be communicated consistently.
- Error text appears below the control in `12px` danger text.
- Disabled controls use a neutral background and muted text; do not rely only on opacity.
- Related fields should be grouped.
- Long forms should be divided into meaningful sections.
- Two-column forms collapse to one column on mobile.
- Preserve entered values when recoverable API errors occur.

---

## 16. Filter and Action Bars

Use a filter bar for:

- search;
- date range;
- class;
- teacher;
- status;
- category;
- reset controls.

### Style

- white background;
- `slate-200` border;
- `12px` radius;
- `12px` padding;
- `10px` gap;
- `40px` control height.

### Rules

- Search width: `240–320px` on desktop.
- Filters wrap cleanly.
- Reset appears only when filters are active.
- Primary page actions usually belong in the page header, not inside the filter bar.
- On mobile, filters become stacked or use a two-column layout where practical.

---

## 17. Tables

Tables are a core Director Dashboard pattern and must remain readable.

### Dimensions

- Header height: `44px`.
- Row minimum height: `52px`.
- Cell padding: `12px 14px`.
- Header text: `12px / 700`.
- Body text: `13–14px`.
- Horizontal border: `slate-100`.
- Hover background: `slate-50`.

### Rules

- Align text left by default.
- Align purely numeric values right when comparison benefits from it.
- Keep the actions column on the right.
- Do not place too many equally prominent action buttons in each row.
- Use icon actions with tooltips for compact secondary actions.
- Use status badges rather than colored full cells.
- Add a sticky header only for long scrollable tables.
- Provide horizontal scrolling for wide tables.
- Do not compress a complex desktop table into unreadable narrow columns.
- On mobile, choose either:
  - a horizontally scrollable table; or
  - a purpose-built card list.

### Empty table state

Display:

1. simple icon or illustration;
2. clear title;
3. one-line explanation;
4. optional primary action.

Never show a blank card with only “No data”.

---

## 18. Status Badges

### Badge dimensions

- Height: approximately `24px`.
- Padding: `5px 9px`.
- Radius: pill.
- Text: `12px / 700`.

### Semantic mapping

| Meaning | Palette |
|---|---|
| Active, confirmed, completed | Success |
| Pending, expiring, attention | Warning |
| Rejected, failed, overdue | Danger |
| Future, informational | Info |
| Archived, inactive | Slate |

Do not communicate status through color alone. Always include readable text.

---

## 19. Modals

### Standard modal

- Backdrop: `rgba(9, 20, 36, 0.62)`.
- Backdrop blur: `5px`.
- Default width: `560px`.
- Large form width: `720px`.
- Maximum width: `calc(100vw - 32px)`.
- Maximum height: `90vh`.
- Radius: `20px`.
- Shadow: `director-shadow-lg`.
- Header padding: `18px 22px`.
- Body padding: `22px`.
- Footer padding: `16px 22px`.
- Close button: `36x36px`.

### Modal structure

1. Header with title and close action.
2. Scrollable body.
3. Footer with secondary and primary actions.

### Rules

- Header and footer may use subtle borders.
- Avoid opening a modal from inside another modal.
- Prevent accidental backdrop closing when unsaved critical data exists.
- Move keyboard focus into the modal when opened.
- Restore focus when closed.
- On mobile, a modal may become a bottom sheet when appropriate.
- Confirmation dialogs must clearly name the affected item and consequence.

---

## 20. Alerts, Toasts, and Feedback

### Inline alerts

Use for:

- page-level failures;
- warnings;
- form validation summaries;
- important contextual information.

Style:

- padding: `12px 14px`;
- radius: `10px`;
- semantic background and text;
- icon plus title;
- optional supporting message.

### Toasts

- Position: top-right on desktop.
- Width: `320–420px`.
- Auto-dismiss: usually `3–5 seconds`.
- Do not stack duplicate messages repeatedly.
- Include a close action when useful.

### Feedback rules

- Success: describe what changed.
- Error: describe what failed and, when possible, how to recover.
- Avoid technical server messages when a clear user-facing message is available.
- Do not rely on `window.alert` for routine feedback.
- Replace `window.confirm` with the shared confirmation pattern over time.

---

## 21. Loading States

Use the correct loading pattern:

- full-page loader for the first page load;
- section loader for independently loading sections;
- button loader for form submissions;
- skeleton only when the load duration and layout justify it;
- subtle refresh state when existing content remains visible.

Rules:

- Do not clear useful existing data during a background refresh.
- Disable duplicate-submit actions.
- Change button text to a clear progress state such as `Saving...`.
- Avoid multiple unrelated spinners on the same screen.
- Loading state must not shift the entire layout unnecessarily.

---

## 22. Empty States

Every data-driven page must define an intentional empty state.

An empty state should answer:

1. What is missing?
2. Why might it be missing?
3. What can the user do next?

Examples:

- no lesson substitutions for the selected month;
- no schedule for the selected class;
- no teachers matching the filters;
- no reports in the selected period.

Avoid treating an empty result as an error when it is a valid state.

---

## 23. Error States

Error states must distinguish:

- authentication failure;
- permission failure;
- network failure;
- backend/server failure;
- validation failure;
- not found;
- valid empty result.

Where appropriate, provide:

- retry action;
- navigation action;
- concise explanation;
- preserved filters and form values.

Do not display raw stack traces or infrastructure details to ordinary users.

---

## 24. Icons

- Use one consistent icon library across the Director Dashboard.
- Standard sizes: `16px`, `18px`, `20px`, `24px`.
- Sidebar icons: `20px`.
- Page-header icons, when necessary: `24px`.
- Icon-to-text gap: `8px`.
- Use icons to reinforce meaning, not replace all text.
- Avoid emoji icons in navigation, buttons, status labels, and headings.
- Icon-only actions require accessible labels.

Legacy emoji icons should be replaced gradually during page migration.

---

## 25. Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 639px) {}

/* Tablet */
@media (min-width: 640px) and (max-width: 1023px) {}

/* Desktop */
@media (min-width: 1024px) {}

/* Wide desktop */
@media (min-width: 1440px) {}
```

### Mobile rules

- Page horizontal padding: `14px`.
- Page vertical padding: `16px`.
- Multi-column grids collapse appropriately.
- Header actions move below the title.
- Primary actions may become full-width.
- Forms use one column.
- Modal width fits the viewport.
- Touch targets remain at least `40px`.
- Avoid page-level horizontal overflow.
- Tables scroll or become cards.
- Filters stack without becoming cramped.

### Tablet rules

- Two-column statistic grids are preferred.
- Sidebar may collapse.
- Page actions may wrap.
- Complex forms may stay two-column only when space remains comfortable.

### Wide desktop rules

- Respect `1440px` content maximum.
- Do not stretch paragraphs, forms, and tables unnecessarily.
- Use available width to improve grouping, not to create excessive empty space.

---

## 26. Accessibility Requirements

The Director Dashboard must satisfy these baseline requirements:

- body-text contrast of at least `4.5:1`;
- large-text contrast of at least `3:1`;
- visible keyboard focus;
- visible labels for form controls;
- `aria-label` for icon-only buttons;
- minimum interactive target of `40x40px`;
- meaningful button and link text;
- status communicated by text as well as color;
- logical heading order;
- keyboard-operable dialogs;
- modal focus management;
- no essential information conveyed only through hover.

Accessibility is part of the component definition, not an optional later enhancement.

---

## 27. Motion

Motion must be subtle and functional.

Allowed:

- `140–200ms` hover transitions;
- menu expand/collapse;
- modal fade and small scale transition;
- toast entrance/exit;
- restrained loading animation.

Avoid:

- bouncing controls;
- looping decorative animations;
- large parallax effects;
- slow transitions;
- animation on every card;
- movement that delays administrative work.

Respect `prefers-reduced-motion`.

---

## 28. Data Density

The dashboard must support high information density without visual overload.

Use:

- clear grouping;
- consistent row heights;
- restrained metadata;
- progressive disclosure;
- filters;
- expandable details;
- tabs only when categories are genuinely distinct.

Avoid:

- enormous cards for small values;
- excessive whitespace inside data tables;
- showing all actions permanently when a compact menu is clearer;
- repeating the same label in every nested block;
- multiple competing navigation systems.

---

## 29. Permissions and Role-Aware UI

The Director Dashboard uses role-based permissions.

AI agents must:

- preserve existing permission checks;
- use existing permission utilities and components;
- hide or disable actions consistently;
- never rely only on frontend restrictions for security;
- ensure backend authorization remains authoritative;
- avoid displaying controls that can never succeed for the current user.

Permission-related redesign must not silently change business authorization.

---

## 30. API and Business Logic Safety

When performing design work:

- do not rename API endpoints without an explicit functional requirement;
- do not change request or response shapes for styling convenience;
- do not remove loading, error, or permission handling;
- do not replace business data with mocked data;
- do not change date/time logic;
- do not alter salary, payment, grade, attendance, or schedule calculations;
- do not remove confirmation from destructive operations.

UI refactoring and business-logic refactoring should be separated whenever possible.

---

## 31. State and Interaction Conventions

Each page should account for:

- initial loading;
- successful data display;
- empty results;
- API error;
- permission denial;
- active filters;
- submission in progress;
- submission success;
- validation error;
- destructive confirmation;
- mobile layout.

Interactive elements must have:

- default;
- hover;
- focus;
- active;
- disabled;
- loading states where relevant.

---

## 32. Recommended Shared Components

Gradually converge on reusable components such as:

```text
DirectorPage
DirectorPageHeader
DirectorPageActions
DirectorCard
DirectorStatCard
DirectorButton
DirectorIconButton
DirectorInput
DirectorSelect
DirectorTextarea
DirectorFilterBar
DirectorTable
DirectorBadge
DirectorAlert
DirectorToast
DirectorModal
DirectorConfirmDialog
DirectorEmptyState
DirectorErrorState
DirectorLoader
DirectorPagination
```

Do not create all components preemptively. Extract a component when a stable pattern is used in multiple places or when reuse is clearly imminent.

---

## 33. CSS Architecture

Preferred order of responsibility:

1. Global tokens.
2. Shared Director Dashboard primitives.
3. Shared layout components.
4. Feature-level styles.
5. Minimal one-off local overrides.

Avoid:

- large inline style objects;
- duplicated button definitions;
- duplicated color constants;
- page-specific redefinitions of shared components;
- `!important` as a routine solution;
- broad selectors that leak into other dashboards.

Director styles must be scoped sufficiently to avoid changing student or teacher dashboards unintentionally.

---

## 34. Naming Conventions

Use clear, semantic names.

Good:

```css
.director-page-header
.director-filter-bar
.director-table-actions
.director-status-badge
.schedule-period-row
.substitution-summary-card
```

Avoid:

```css
.box2
.blue-div
.new-style
.temp-card
.left-thing
```

Component and class names should communicate purpose rather than appearance alone.

---

## 35. Page-Specific Guidance

### 35.1 Director Home

- Use a restrained overview layout.
- Prioritize operational statistics and urgent actions.
- Limit top-level statistic cards to the most important values.
- Separate alerts from routine metrics.
- Use charts only when they clarify trends.
- Do not turn the home page into a dense list of every available feature.

### 35.2 Schedule Management

- Class selection must remain prominent.
- Schedule status must use standard badges.
- Active schedules must be clearly editable when permission allows.
- Period rows need consistent time, subject, and teacher alignment.
- Conflict messages must be visible near the affected period.
- Date ranges and schedule status must not be visually ambiguous.
- Long weekly schedules need a readable desktop layout and usable mobile fallback.

### 35.3 Lesson Substitutions

- Clearly separate monthly summary from individual records.
- Show original teacher and substitute teacher with strong directional clarity.
- Date, class, subject, and lesson time must be quickly scannable.
- Pending, confirmed, and rejected states use standard badges.
- New substitution flow should use a structured modal or page form.
- Existing substitutions must be disabled in lesson selection.
- Error messages should distinguish missing schedule, duplicate substitution, and permission failure.

### 35.4 Students and Teachers

- Keep search and filters visible.
- Use consistent profile image sizes.
- Keep row actions compact.
- Separate account status from academic or employment information.
- Use a detail page or modal rather than overloading table rows.

### 35.5 Finance

- Numeric alignment must be consistent.
- Currency formatting must be consistent.
- Income, expense, debt, and balance colors must remain semantic.
- Do not use color alone to indicate positive or negative financial state.
- Destructive financial actions require explicit confirmation.

### 35.6 Reports

- Date scope must be visible.
- Summary metrics appear before detailed data.
- Export actions belong in the page action area.
- Charts require labels, legends, and accessible summaries.
- Empty periods are valid empty states, not server errors.

### 35.7 Permissions

- Group permissions by module.
- Clearly distinguish enabled, inherited, and unavailable states.
- Warn before broad permission changes.
- Avoid presenting hundreds of permissions as one unstructured list.

---

## 36. Anti-Patterns

The following patterns are prohibited or must be removed during migration:

- arbitrary colors on every page;
- random font sizes;
- many unrelated border radii;
- excessive inline styling;
- emoji as production navigation or action icons;
- strong gradients on ordinary management pages;
- neon shadows;
- large decorative empty space;
- inconsistent button heights;
- primary-colored cancel buttons;
- destructive actions without confirmation;
- modal inside modal;
- routine `window.alert` and `window.confirm`;
- disabled controls indicated only by low opacity;
- tables compressed until unreadable;
- desktop layout simply shrunk on mobile;
- duplicate CSS definitions for the same component;
- raw server error output shown directly to users;
- permission controls that do not match backend authorization;
- design changes that accidentally alter business logic.

---

## 37. Incremental Migration Plan

Migrate the Director Dashboard in this order:

1. Create shared tokens.
2. Create essential shared primitives.
3. Normalize the sidebar.
4. Normalize the top bar.
5. Redesign Director Home.
6. Redesign Schedule Management.
7. Redesign Lesson Substitutions.
8. Redesign student and teacher management.
9. Redesign finance pages.
10. Redesign attendance, journals, and reports.
11. Redesign permissions and settings.
12. Migrate remaining minor modules.
13. Remove unused legacy CSS.

### Per-page migration process

For every page:

1. Inspect existing behavior and permission checks.
2. Identify reusable patterns.
3. Replace arbitrary values with tokens.
4. Normalize page header.
5. Normalize cards and spacing.
6. Normalize forms, filters, and buttons.
7. Normalize tables and badges.
8. Implement loading, empty, error, and success states.
9. Implement mobile and tablet behavior.
10. Check keyboard and accessibility behavior.
11. Remove obsolete local CSS only after confirming it is unused.

Do not redesign the entire application in one uncontrolled rewrite.

---

## 38. AI Implementation Workflow

When an AI agent receives a Director Dashboard design task, it should follow this workflow:

### Step 1 — Understand

- Read this document.
- Inspect the target page and related shared layout.
- Identify business logic and API dependencies.
- Identify permission checks.

### Step 2 — Plan internally

- Decide which shared tokens and components apply.
- Identify page-specific needs.
- Avoid creating duplicate abstractions.

### Step 3 — Implement

- Preserve behavior.
- Use shared design rules.
- Add responsive behavior.
- Add all relevant states.
- Keep changes scoped.

### Step 4 — Review

- Compare dimensions against this specification.
- Search for remaining arbitrary values.
- Check for accidental business-logic changes.
- Check permission behavior.
- Check mobile overflow.
- Check accessible names and focus states.

### Step 5 — Report

Explain:

- what was standardized;
- what reusable elements were introduced;
- what legacy inconsistencies remain;
- which page should be migrated next.

---

## 39. Definition of Done

A Director Dashboard page is considered design-system compliant when:

- it uses shared colors and spacing;
- it has one clear page title;
- page actions follow hierarchy rules;
- card radius and shadows are consistent;
- buttons follow the standard size system;
- inputs are at least `42px` high;
- tables follow standard dimensions;
- statuses use semantic badges;
- loading state exists;
- empty state exists;
- error state exists;
- mobile layout is usable;
- no unintended horizontal page overflow exists;
- icon-only actions have accessible labels;
- permission checks remain intact;
- business logic remains intact;
- random emojis are absent;
- repeated inline styles are removed or minimized;
- the page visually belongs to the same product as other migrated pages.

---

## 40. Review Checklist

### Visual consistency

- [ ] Colors come from shared tokens.
- [ ] Spacing follows the defined scale.
- [ ] Typography follows the defined hierarchy.
- [ ] Cards use the standard radius.
- [ ] Shadows are restrained.
- [ ] Buttons use standard heights and variants.
- [ ] Inputs use standard height and focus style.
- [ ] Status badges use semantic colors.
- [ ] Icons come from the chosen icon system.

### Layout

- [ ] One visible `h1`.
- [ ] Page header is consistent.
- [ ] Major sections use `24px` vertical spacing.
- [ ] Content respects the maximum width.
- [ ] Mobile layout does not overflow.
- [ ] Wide tables have a deliberate responsive strategy.

### States

- [ ] Initial loading exists.
- [ ] Refresh state is handled.
- [ ] Empty state is intentional.
- [ ] Error state is understandable.
- [ ] Success feedback is clear.
- [ ] Disabled state is clear.
- [ ] Submission loading prevents duplicates.

### Accessibility

- [ ] Keyboard focus is visible.
- [ ] Inputs have labels.
- [ ] Icon buttons have accessible names.
- [ ] Touch targets are at least `40x40px`.
- [ ] Status does not depend on color alone.
- [ ] Modal focus is managed.
- [ ] Text contrast is sufficient.

### Safety

- [ ] Existing API behavior is preserved.
- [ ] Permission checks are preserved.
- [ ] Backend authorization remains authoritative.
- [ ] Destructive actions require confirmation.
- [ ] No sensitive data is exposed.
- [ ] No unrelated dashboard is affected.

---

## 41. Compact Command for Future AI Agents

The user may give a short instruction such as:

> **“Read `DIRECTOR_DASHBOARD_DESIGN_SYSTEM.md` and redesign the selected Director Dashboard page to fully comply with it. Preserve all business logic, API behavior, and permissions. Implement desktop, tablet, mobile, loading, empty, error, disabled, and success states. Reuse shared tokens and components, remove inconsistent inline styling, and do not modify unrelated pages.”**

This command is sufficient only if the AI reads this entire document before making changes.

---

## 42. Final Authority Rule

Whenever a new Director Dashboard design decision is needed:

1. Update this specification first.
2. Add or update the relevant shared token or component.
3. Apply it to the target page.
4. Migrate other pages gradually.

This process prevents the dashboard from becoming visually fragmented again.
