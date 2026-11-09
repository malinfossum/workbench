# Component Rules

## Buttons
- Primary: main CTA only
- Secondary: alternative action
- Ghost: low-priority action
- Danger: destructive action

## Icons
- `icon(name)` from `components/icons.js`; never emoji, never a hard-coded colour
- an icon is decorative — the control carries the name (visible label, or `aria-label` on `.icon-btn`)
- 20px inside controls; 48px for empty states, and let the stroke ramp thin it
- one stroke family — no mixing in filled or outline icons from elsewhere, except brand marks from `brand-icons.js` (a mark is drawn the way its owner draws it)

## Icons or text
- an icon where the meaning is universal, short text where it is not: a brand mark linking to that brand, sun, monitor and moon for the theme
- not universal: "Report an error", "About and liability", "Delete your history", a privacy promise; a wrong guess at an icon costs the reader more than the words take
- **A safety, legal or trust link is always text**
- every icon-only control has a hidden name (`.sr-only` text) in every language the app ships, and a tooltip (`.tip`) with the same name for mouse users
- this applies to headers and toolbars too, not only footers

## Cards
- Use cards for grouped content
- Default padding: `--space-5`
- Keep card content inside a `stack`
- Hover changes should stay calm

## Forms
- labels stay visible
- inputs have roomy padding
- help text is optional, not decorative
- one field group = label + control + help text
- file inputs use `.file-input-hidden` + `<label class="btn file-input-label">`; never hide the input with `display: none`
- a file picker reflects the chosen file (name in `.help`, or a preview) — the native filename text is gone with the control

## Navigation
- topbar stays simple by default
- nav links rely on soft active states, not loud accents
- keep link density moderate so items have room to breathe

## Tables
- wrap in `.table-wrap`
- use hover only if it improves scanning
- avoid overly dense rows

## Alerts
- only use for meaningful feedback
- each state should be semantically correct
- do not use alerts to make a page feel more busy
