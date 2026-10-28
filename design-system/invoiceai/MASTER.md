# InvoiceAI — Design System (Master)

Source of truth for every screen. Generated with UI/UX Pro Max
(`"fintech invoicing SaaS freelancers professional" --design-system --density 6`)
and adapted to keep the existing indigo brand.

## Direction

- **Product:** B2B SaaS for freelancers. Trustworthy, calm, precise — money is involved.
- **Theme:** light by default (follows system), first-class dark mode. Toggle in the app shell.
- **Style:** clean flat surfaces with 1px borders and soft shadows inside the app.
  Glass (backdrop blur) only on the landing-page nav and hero cards — never on data surfaces.
- **Icons:** lucide-react only, 16px in controls / 20px in navigation. No emoji as icons.

## Color tokens (HSL, defined in `app/globals.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--primary` | indigo 600 `#4F46E5` | indigo 500 `#6366F1` | primary actions, links, focus ring |
| `--background` | slate 50 `#F8FAFC` | `#0B0E14` | page |
| `--card` | white | `#12161F` | surfaces |
| `--foreground` | slate 800 `#1E293B` | slate 50 | body text |
| `--muted-foreground` | slate 600 `#475569` | slate 400 | secondary text (≥ 4.5:1 on card) |
| `--border` | slate 200 | `#222837` | dividers, inputs |
| `--success` / `--warning` / `--destructive` | emerald / amber / red | lighter steps | status, alerts |

Invoice status colors are semantic and always paired with a text label (never color alone):
Draft = slate, Sent = blue, Viewed = violet, Paid = emerald, Overdue = red, Void = slate (strikethrough).

Never use raw hex in components — use the Tailwind token classes (`bg-card`, `text-muted-foreground`, …).

## Typography

- **Headings:** Plus Jakarta Sans 600/700, tight tracking (`tracking-tight`).
- **Body / UI:** Inter 400/500, 14px in dense app UI, 16px on marketing pages, line-height 1.5.
- **Numbers:** `tabular-nums` on every amount, total and table column.
- **Mono:** JetBrains Mono for invoice numbers and tokens.

Scale: 12 (caption) · 14 (body/UI) · 16 (lead) · 20 · 24 (page title) · 30 · 48/60 (hero).

## Spacing & layout

- 4px base. Density "standard": cards `p-5`/`p-6`, sections `gap-6`, page padding `px-4 sm:px-6 lg:px-8`.
- App shell: 248px sidebar ≥ 1024px; below that a top bar + slide-in drawer.
- Content max width 1200px. Tables become stacked cards below 768px.
- Breakpoints verified: 375 · 768 · 1024 · 1440. No horizontal page scroll.

## Components (`components/ui`)

Button (primary / secondary / outline / ghost / destructive; sm / md / lg / icon),
Input, Textarea, Select, Label + FieldError, Card, Badge, StatusBadge, Skeleton,
EmptyState, PageHeader, Spinner, ThemeToggle, ConfirmDialog, Toast.

## Interaction

- Touch targets ≥ 40px (44px on mobile primary actions); `cursor-pointer` on everything clickable.
- Transitions 150–200ms ease-out on color/opacity/transform only; respect `prefers-reduced-motion`.
- Every async action shows a pending state and disables its trigger; success/failure toasts.
- Visible focus ring (`ring-2 ring-ring ring-offset-2`) on every interactive element.
- Forms: visible labels, inline errors under the field, helper text where formats matter.
- Loading: skeletons that match final layout (no layout shift). Empty states explain the next step.

## Anti-patterns

- Dark-only UI, gray-on-gray low-contrast text, placeholder-as-label.
- Emoji icons, hover-only affordances, color-only status.
- Excessive animation, glass on data tables.
