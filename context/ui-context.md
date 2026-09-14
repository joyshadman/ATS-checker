# UI Context — Pre-Redesign State

## Theme

Light/dark dual theme via CSS custom properties in `app/globals.css`. Default is light. Dark mode uses the `.dark` class on `<html>`, toggled by a `ThemeToggle` component in the dashboard header. The theme system uses Tailwind CSS v4's `@theme inline` directive to map CSS variables to Tailwind utilities.

### Current Color Palette (Light Mode)

| Role            | CSS Variable       | Value    |
|-----------------|---------------------|----------|
| Page background | `--background`      | `#fafbfe` |
| Primary text    | `--foreground`      | `#0f172a` |
| Border          | `--border`          | `#e8ecf1` |
| Muted text      | `--muted`           | `#64748b` |
| Card surface    | `--card`            | `#ffffff` |
| Card hover      | `--card-hover`      | `#f8faff` |
| Surface         | `--surface`         | `#f1f5f9` |
| Primary accent  | `--accent`          | `#6366f1` (indigo) |
| Accent fg       | `--accent-fg`       | `#ffffff` |
| Success         | `--success`         | `#10b981` |
| Warning         | `--warning`         | `#f59e0b` |
| Danger          | `--danger`          | `#f43f5e` |

### Current Color Palette (Dark Mode)

| Role            | CSS Variable       | Value    |
|-----------------|---------------------|----------|
| Page background | `--background`      | `#09090b` |
| Primary text    | `--foreground`      | `#fafafa` |
| Border          | `--border`          | `#27272a` |
| Muted text      | `--muted`           | `#a1a1aa` |
| Card surface    | `--card`            | `#18181b` |
| Card hover      | `--card-hover`      | `#1e1e22` |
| Surface         | `--surface`         | `#141416` |
| Primary accent  | `--accent`          | `#818cf8` (indigo-light) |
| Accent fg       | `--accent-fg`       | `#09090b` |
| Success         | `--success`         | `#34d399` |
| Warning         | `--warning`         | `#fbbf24` |
| Danger          | `--danger`          | `#fb7185` |

## Typography

- **UI Font:** Geist Sans (`--font-geist-sans` via next/font/google Geist)
- **Mono Font:** Geist Mono (`--font-geist-mono` via next/font/google Geist_Mono)
- Font weight hierarchy: 400 (body), 500 (labels), 600 (card titles), 700 (headings, scores)

## Gradients (CSS utility classes in globals.css)

| Class                | Colors                          | Usage                     |
|----------------------|--------------------------------|---------------------------|
| `bg-gradient-primary`| `#6366f1` → `#8b5cf6` (indigo→violet) | Buttons, active nav, logo, stat icons, numbered circles |
| `bg-gradient-accent` | `#06b6d4` → `#0ea5e9` (cyan→sky) | Best-score tiles, cover letter accent dots |
| `bg-gradient-success`| `#10b981` → `#34d399` (emerald) | Score tiles ≥80%, progress bars |
| `bg-gradient-warning`| `#f59e0b` → `#fbbf24` (amber) | Score tiles 40-79%, cover letter icon |
| `bg-gradient-error`  | `#f43f5e` → `#fb7185` (rose) | Score tiles <40%, danger buttons |
| `bg-gradient-card`   | `#6366f106` → `#8b5cf606` | Subtle card background tint |
| `bg-gradient-hero`   | `#6366f1` → `#8b5cf6` → `#06b6d4` | Login hero panel background |
| `bg-gradient-mesh`   | Radial gradients (indigo, violet, cyan) | Page mesh overlay |
| `bg-gradient-glow`   | Radial gradient indigo | Subtle glow effect |

## Hardcoded Colors (Inconsistent — some components use raw zinc/emerald/rose instead of tokens)

Several components have hardcoded dark-theme-only colors that don't adapt to light mode:
- `empty-state.tsx`: `border-zinc-800 bg-zinc-900/50 text-zinc-700/500/600`
- `page-header.tsx`: `text-zinc-100 bg-zinc-800 text-zinc-300 text-zinc-400`
- `card-title.tsx`: `text-zinc-100 bg-zinc-100`
- `resume-selector.tsx`: `text-zinc-300 border-zinc-500/800 bg-zinc-800`
- `job-description-input.tsx`: `text-zinc-300 border-zinc-800 bg-zinc-900/50 text-zinc-200 placeholder-zinc-600`
- `score-circle.tsx`: `text-zinc-800 text-zinc-100 text-zinc-500`
- `score-badge.tsx`: `border-green/amber/red-500/20 bg-green/amber/red-500/10 text-green/amber/red-400`
- `file-upload-form.tsx`: `bg-zinc-100/800/900 border-zinc-400/600/700 text-zinc-100/400/500`
- `input.tsx`: `hover:border-indigo-300 dark:hover:border-indigo-700/60`
- `button.tsx`: `dark:focus-visible:ring-offset-zinc-900`
- `error-banner.tsx`: `border-green/red-500/20 bg-green/red-500/10 text-green/red-400`
- `badge.tsx`: `bg-indigo/emerald/amber/rose/sky-50` with color-specific borders

## Border Radius

| Context           | Scale                      |
|-------------------|----------------------------|
| Buttons (sm)      | `rounded-lg` (8px)         |
| Buttons (md/lg)   | `rounded-xl` (12px)        |
| Cards             | `rounded-2xl` (16px)       |
| Inputs            | `rounded-xl` (12px)        |
| Modals            | `rounded-2xl` (16px)       |
| Badges            | `rounded-full`             |
| Score circles     | `rounded-full` (SVG)       |
| Upload areas      | `rounded-2xl` (16px)       |
| Upload border     | `border-2 border-dashed`   |

## Shadows

| Name              | Value                                            |
|-------------------|--------------------------------------------------|
| `shadow-card`     | `0 1px 3px 0 rgb(0 0 0 / 0.03), 0 1px 2px -1px rgb(0 0 0 / 0.04)` |
| `shadow-card-hover`| `0 8px 25px -5px rgb(0 0 0 / 0.08), 0 4px 10px -4px rgb(0 0 0 / 0.04)` |
| `shadow-float`    | `0 20px 40px -8px rgb(0 0 0 / 0.1), 0 8px 16px -4px rgb(0 0 0 / 0.04)` |
| `shadow-glow`     | `0 0 40px -8px rgb(99 102 241 / 0.2)` (indigo)  |
| `shadow-glow-lg`  | `0 0 80px -12px rgb(99 102 241 / 0.25)` (indigo) |

## Layout

- **Root layout** (`app/layout.tsx`): Full-height body with Geist fonts
- **Dashboard layout** (`app/(dashboard)/layout.tsx`): Flex with left sidebar + main content
  - Sidebar: Fixed 260px width, sticky on desktop, slide-over on mobile
  - Header: Sticky top bar with ThemeToggle
  - Main: Flexible padding area
- **Page max-widths**: `max-w-4xl` (lists) or `max-w-5xl` (dashboards, details)

## Component Library

Custom-built UI components in `components/ui/`:

| Component          | Props                                         | Description                    |
|--------------------|-----------------------------------------------|--------------------------------|
| `Button`           | variant, size, loading                        | Primary/secondary/ghost/danger |
| `Card`             | variant, hover                                | Default/gradient/flat variants |
| `Input`            | label, error                                  | With optional label and error  |
| `Badge`            | variant (primary/success/warning/danger/info) | Status indicator pills          |
| `Dialog`           | open, onClose, title, description             | Modal overlay                  |
| `Toast`            | Context provider + useToast hook              | Bottom-right notification      |
| `Skeleton`         | Card/Line/Block variants                      | Loading placeholders           |
| `Progress`         | value, max, label, showValue, size            | Animated progress bar          |
| `PageHeader`       | icon, title, description                      | Page heading with icon         |
| `EmptyState`       | icon, message, hint                           | Empty content placeholder      |
| `ErrorBanner`      | message, variant, onDismiss                   | Error/success banner           |
| `ActionButton`     | onClick, icon, label, loading, variant        | Button with icon + loading     |
| `ScoreCircle`      | score, label, size                            | SVG circular score display     |
| `ScoreBadge`       | score, label, size                            | Inline score pill              |
| `SanitizedHtml`    | html, className                               | Safe HTML renderer             |
| `ResumeSelector`   | resumes, selectedId, onSelect                 | Resume picker dropdown         |
| `JobDescriptionInput`| value, onChange, placeholder                | Textarea for job description   |
| `FileUploadForm`   | action, redirectPath, accept, label, ...      | Generic drag-and-drop upload   |
| `Sidebar`          | email                                         | Navigation sidebar with links  |
| `ThemeToggle`      | —                                             | Light/dark mode toggle         |

## Icons

All SVG icons are inline (no icon library dependency). Sizes: `h-4 w-4` for inline, `h-5 w-5` for buttons, `h-6 w-6` for headers, `h-[18px] h-[18px]` for sidebar nav.

## Animations

Defined keyframes in globals.css:
- `fade-in`, `slide-up`, `slide-down`, `scale-in` — page transitions
- `shimmer` — loading skeleton
- `pulse-subtle` — subtle breathing
- `progress-fill` — progress bar entrance
- `float` — hero logo bounce
- `spin-slow` — decorative spinner

Utility classes: `animate-fade-in`, `animate-slide-up`, `animate-scale-in`, `animate-shimmer`, `animate-pulse-subtle`, `animate-progress`, `animate-float`, `animate-spin-slow`

Stagger delays: `.stagger-1` through `.stagger-6` (50ms increments).
