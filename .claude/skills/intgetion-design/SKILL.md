---
name: intgetion-design
description: >-
  Visual design of INTGETION JOB LIST: pages, layout, components, tokens,
  type, motion and empty states. Use together with the Vercel frontend skill
  react-best-practices whenever the task touches UI, a page, a component,
  Tailwind, messages, the header, a form, accessibility, a11y, WCAG, or the
  words дизайн, вёрстка, внешний вид, страница, компонент, доступность.
  This skill owns how it looks and the WCAG 2.2 AA bar. The frontend skill
  owns render cost.
---

# Design — INTGETION JOB LIST

Read this skill and the Vercel skill `react-best-practices` in the same turn, before editing UI. They are a pair.

| Question                                                | Read                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| How should it look, and which component already exists? | This skill, then `docs/DESIGN.md` for the section you need |
| Will this render, hook, or bundle choice stay cheap?    | `react-best-practices`                                     |
| What does this Next.js version allow?                   | `node_modules/next/dist/docs/`                             |

`AGENTS.md` and `docs/tz/` win if a skill disagrees. On look, `docs/DESIGN.md` wins over `react-best-practices`. On render cost, `react-best-practices` wins unless the cheaper choice breaks a rule below. Do not copy either skill into the repo.

Decisions for the look: D140–D149, D155–D159. Read only the numbers the change cites.

## Look

The interface is a flight-control desk for job search: dark by default, one accent, thin lines, square corners, type instead of decoration. Do not copy SpaceX marks, typefaces, photos or names.

- Tokens only, from `src/app/globals.css`: `bg-bg`, `bg-surface`, `text-fg`, `text-fg-muted`, `border-line`. No hex, no `text-gray-*`, no `bg-black`, no `text-white` in pages and components.
- No inline `style`. CSP drops it. Widths and gaps are Tailwind classes.
- No shadows. Radius stays 0 except avatars and round indicators. Status color is a thin line, a glyph or a 6 px dot, not a filled panel.
- One primary button on a screen. Secondary actions are outline or text.
- Numbers, dates, money and time zones use `font-mono`. Labels are nouns in the message files; CSS uppercases them. Buttons are verbs.
- Motion is 150–250 ms and stops under `prefers-reduced-motion`.

## Reuse

- Build pages from `src/components/ui/`. A new visual pattern is a reason to extend a file there, not a second button.
- A client component imports the kit by file (`@/components/ui/button`). The barrel `@/components/ui` pulls the whole kit into the client bundle (D41a). Server components may use the barrel.
- Named imports from `lucide-react`. No MUI, Chakra or a generated component kit.
- Copy lives in `src/messages/*.json` for every routed locale. The messages test is the list. `companyMarketing` stays English and only in `en.json` (D404).

## Accessibility (WCAG 2.2 AA, D421)

Every new or changed interactive element passes these. Accessibility is not traded for the look.

- Keyboard: Tab reaches it, Enter or Space activates it, Esc closes an overlay and focus returns to the trigger. Dialogs and MobileNav trap focus.
- Focus is visible: the global `:focus-visible` outline in `src/app/globals.css` (2 px `--accent`). No `outline-none` without an equal replacement.
- Name, role, state: an icon-only button has `aria-label` from `messages`; menus and toggles set `aria-expanded` or `aria-pressed`; a field error is `role="alert"` linked by `aria-describedby`; loading is `aria-busy`.
- Contrast in both themes: 4.5:1 for text, 3:1 for borders that carry meaning, icons and the focus ring. Measure from the token values in `globals.css`; never state a ratio you did not compute. A new token pair goes into the report with its ratio.
- Target size: at least 24×24 px (2.5.8). Our standard stays 44×44 for icon buttons and 44 px high fields (`docs/DESIGN.md`).
- Not by color alone: a status dot or line comes with a glyph or text.
- Focus not obscured (2.4.11): the header is sticky, 64 px. Anchor targets get `scroll-mt-24`, as in `src/components/legal/legal-document.tsx`.
- Sign-in (3.3.8): no puzzles or copy-from-memory steps; email and password inputs keep `autocomplete` so password managers work.

For a page-level audit use the installed `design:accessibility-review` and report each finding with its WCAG number, severity and fix.

## Check

After a visible change, open the page in the browser and use it: the main action, the empty and error states, and the other pages that share the component. Desktop and a narrow width when the layout changed. Tab through the changed part once. `react-best-practices` is the pass over hooks and render cost on the same diff.
