# Component Rules

Every component has the same five-line block, so a review can check it line by line:

- **Do / Don't:** how to use it and the misuse I keep seeing.
- **WCAG:** the success criteria it must pass, by number.
- **States:** every state that needs a look, and a contrast check, before it ships.
- **Ratio:** the contrast it needs. Text 4.5:1 (1.4.3), large text and UI parts such as borders, rings and icons 3:1 (1.4.11). A disabled control is exempt, but it still reads as disabled.

Token hygiene (no raw colors, logical properties, `:focus-visible` rings) is checked by `node tools/check-tokens.mjs`.

## Buttons
- **Do:** primary for the one main action on a view; secondary for an alternative; ghost for low-priority actions; danger for destructive ones. A label starts with a verb.
- **Don't:** use a button to go to another page (that's a link), or put two primaries side by side.
- **WCAG:** 1.4.3, 1.4.11, 2.4.7 Focus Visible, 2.5.8 Target Size (house bar 44 px via `--control-height`), 4.1.2 Name, Role, Value.
- **States:** rest, hover, active, `:focus-visible`, pressed (`aria-pressed`), disabled, forced colors.
- **Ratio:** label 4.5:1 on its fill in every state; a ghost or secondary edge 3:1 against the page.

## Icons
- **Do:** `icon(name)` from `components/icons.js`. 20 px inside controls; 48 px for empty states, and let the stroke ramp thin it. The control carries the name (visible label, or `aria-label` on `.icon-btn`): the icon is decorative.
- **Don't:** use emoji or a hard-coded color, or mix in filled or outline icons from elsewhere, except brand marks from `brand-icons.js` (a mark is drawn the way its owner draws it).
- **WCAG:** 1.1.1 Non-text Content, 1.4.11.
- **States:** inherits the control's states; forced colors.
- **Ratio:** 3:1 for an icon that carries meaning; none for a decorative one.

## Icons or text
- **Do:** an icon where the meaning is universal (a brand mark linking to that brand; sun, monitor and moon for the theme), short text where it is not. Every icon-only control has a hidden name (`.sr-only` text) in every language the app ships, and a tooltip (`.tip`) with the same name for mouse users. This holds in headers and toolbars too, not only footers.
- **Don't:** guess at an icon for "Report an error", "About and liability", "Delete your history" or a privacy promise. A wrong guess costs the reader more than the words take. **A safety, legal or trust link is always text.**
- **WCAG:** 1.1.1, 2.4.4 Link Purpose, 2.5.3 Label in Name, 1.4.13 Content on Hover or Focus.
- **States:** rest, hover with tooltip, `:focus-visible` with tooltip, Escape hides the tooltip.
- **Ratio:** icon 3:1; tooltip text 4.5:1 on the tooltip surface.

## Cards
- **Do:** group related content. Default padding `--space-5`; content inside a `stack`; `.card-grid` for a row of cards.
- **Don't:** make the whole card clickable with no link inside it, or use loud hover changes (keep hover calm).
- **WCAG:** 1.3.1 Info and Relationships (a card title is a heading), 1.4.11 when the card edge is the only boundary.
- **States:** rest, hover (`.card-hover`), focus inside, empty.
- **Ratio:** text 4.5:1 on `--card-bg`; an edge that carries meaning 3:1.

## Forms
- **Do:** one field group = label + control + help text, labels always visible, roomy padding. Help text is optional, not decorative. File inputs use `.file-input-hidden` + `<label class="btn file-input-label">`, and the picker reflects the chosen file (name in `.help`, or a preview): the native filename text is gone with the control. `autocomplete` on known fields.
- **Don't:** use a placeholder as the label, or hide a file input with `display: none` (it leaves the tab order).
- **WCAG:** 1.3.1, 1.3.5 Identify Input Purpose, 3.3.1 Error Identification, 3.3.2 Labels or Instructions, 2.5.8.
- **States:** empty, filled, hover, `:focus-visible`, invalid with its message, disabled, read-only.
- **Ratio:** text and label 4.5:1; the input border 3:1 against the page; an error message 4.5:1.

## Navigation
- **Do:** keep the topbar simple and the link count moderate, so items have room. Mark the current page with `aria-current="page"`.
- **Don't:** lean on a loud accent for the active link; it uses a soft active state.
- **WCAG:** 2.4.1 Bypass Blocks (skip link), 2.4.7, 2.4.11 Focus Not Obscured, 1.4.11.
- **States:** rest, hover, current page, `:focus-visible`.
- **Ratio:** link text 4.5:1; a current-page marker that isn't text 3:1.

## Tabs
- **Do:** `role="tablist"` with `role="tab"` children and `aria-selected`; page links in a router use the nav pattern with `aria-current` instead.
- **Don't:** let the tab strip push the page wider than 320 px. Known gap: the shipped `.tab-list` is a row that doesn't wrap, so it overflows at 320 px with 200 % text until the scroll-or-wrap decision lands. Keep tab labels short until then.
- **WCAG:** 2.1.1 Keyboard, 4.1.2, 1.4.11.
- **States:** rest, hover, selected, `:focus-visible`.
- **Ratio:** label 4.5:1; the selected underline 3:1 against the page.

## Tables
- **Do:** wrap in `.table-wrap` (it scrolls on a narrow screen), real `<th>` with `scope`.
- **Don't:** pack the rows dense, or add a row hover that doesn't help scanning.
- **WCAG:** 1.3.1, 1.4.10 Reflow (the wrapper scrolls, the page doesn't).
- **States:** rest, row hover if used, empty table, loading.
- **Ratio:** cell text 4.5:1; row lines are decorative.

## Alerts
- **Do:** use for meaningful feedback only, with the semantics that match it (`role="status"` for news, `role="alert"` for errors).
- **Don't:** use alerts to make a page look busy, or rely on color alone to tell info from danger.
- **WCAG:** 1.4.1 Use of Color, 4.1.3 Status Messages, 1.4.3.
- **States:** info, success, warning, danger; forced colors.
- **Ratio:** text 4.5:1 on the alert's tinted surface; the edge or icon 3:1.
