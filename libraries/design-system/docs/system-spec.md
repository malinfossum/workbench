# Design System Spec

## Goal
A calm, reusable standard for static websites, MVC apps, dashboards, and small games.

## Design language
- true black dark mode with clear but restrained surface separation
- damped accent instead of bright highlight color
- simple geometry, medium rounding, low-noise shadows
- subtle interaction, not playful hover motion
- accessibility and responsiveness by default

## Layer order
1. Tokens
2. Base
3. Primitives
4. Components
5. Compositions
6. Project-specific UI

## Non-negotiable rules
- no raw spacing in components when a spacing token exists
- no project-specific color values inside reusable components
- no sticky header by default
- no large hover lift or pop-out effect
- every control must keep a visible focus state
- touch targets should stay usable on mobile

## Spacing scale
- `--space-1` 4px
- `--space-2` 8px
- `--space-3` 12px
- `--space-4` 16px
- `--space-5` 24px
- `--space-6` 32px
- `--space-7` 48px
- `--space-8` 64px
- `--space-9` 80px

## Radius scale
- `--radius-xs` 0.25rem (4px) — badges, chips
- `--radius-sm` 0.375rem (6px) — buttons, inputs
- `--radius-md` 0.5rem (8px) — cards
- `--radius-lg` 0.75rem (12px) — modals
- `--radius-xl` 1rem (16px) — hero surfaces
- `--radius-pill` 999px

## Typography roles
- hero title → `--text-4xl`
- section title → `--text-2xl`
- card title → `--text-xl`
- body → `--text-md`
- labels/help text → `--text-sm`

## Surface roles
- `--surface-1` page background
- `--surface-2` panels and sections
- `--surface-3` cards
- `--surface-4` interactive components
- `--surface-5` hover/background emphasis

## Accent use
Use accent for:
- primary action background tint
- active nav state
- focus and selection
- progress emphasis

Avoid accent for:
- large page backgrounds
- decorative gradients everywhere
- random card fills

## Motion rules
- default duration: 180ms
- hover feedback should favor border, background, and shadow
- only tiny press scale on buttons
- reduced motion must be supported

## Growth rule
Only add a reusable component or composition when at least two real projects need it.
