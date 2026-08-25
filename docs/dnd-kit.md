# dnd-kit — vetted drag-and-drop library

Recorded 2026-08-25. Reference note, not a vendored library: nothing here is extracted by
`tools/extract.mjs`, and no scaffold depends on dnd-kit. Install it per project, when a project
actually needs to drag something.

Home: <https://dndkit.com> · Source: <https://github.com/clauderic/dnd-kit> · MIT

## Why this one

Drag-and-drop is the feature most likely to quietly break keyboard and screen-reader users, because
the native HTML5 drag events are pointer-only and unusable on touch. dnd-kit does not use the HTML5
drag-and-drop API at all. It listens to pointer and keyboard events through swappable **sensors**, so
the same interaction works with mouse, touch and arrow keys, and it ships a screen-reader
announcement plugin.

It is also framework-agnostic now — the core runs on plain DOM, so it fits `web-vite` and Wend's
`wwwroot`, not only React.

## Which packages — pick a line and do not mix them

Two generations are on npm at once. Their APIs look similar and blog posts mix them freely; the
imports are the tell.

| Line | Packages | Version (checked 2026-08-25) | Use it when |
|---|---|---|---|
| **Current** | `@dnd-kit/dom` | 0.5.0 | Vanilla JS/TS — `web-vite`, Wend's `wwwroot` |
| **Current** | `@dnd-kit/react` | 0.5.0 | React — `web-react-ts`, Varde |
| Legacy | `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` | 6.3.1 / 10.0.0 | React only, and only if 0.x churn is unacceptable |

All MIT.

**Tell them apart by the return shape.** Current React: `const {ref} = useSortable({id, index})`.
Legacy React: `const {attributes, listeners, setNodeRef, transform, transition} = useSortable({id})`
plus `CSS.Transform.toString()` from `@dnd-kit/utilities`. If a snippet has `setNodeRef`, it is the
legacy line — do not paste it next to `@dnd-kit/react` code.

**The current line is 0.x.** Pre-1.0, breaking changes expected. Pin an exact version in
`package.json` (no `^`) and upgrade deliberately. That pre-1.0 status is the reason this is a
reference note and not a `libraries/` module.

## Vanilla JS — `@dnd-kit/dom`

```bash
npm install @dnd-kit/dom
```

One `DragDropManager` coordinates everything. `Draggable` and `Droppable` each take an element, an
`id`, and the manager.

```js
import { DragDropManager, Draggable, Droppable } from "@dnd-kit/dom";

const manager = new DragDropManager();

const card = document.querySelector("[data-card]");
const draggable = new Draggable({ id: "card-1", element: card }, manager);

const column = document.querySelector("[data-column]");
const droppable = new Droppable({ id: "column-done", element: column }, manager);

manager.monitor.addEventListener("dragend", (event) => {
  if (event.canceled) return;
  const { source, target } = event.operation;
  if (target?.id === droppable.id) {
    // move it in the model, then let the view re-render from state
  }
});
```

Sortable lists — a `Sortable` is both draggable and droppable. `index` is required.

```js
import { DragDropManager } from "@dnd-kit/dom";
import { Sortable } from "@dnd-kit/dom/sortable";

const manager = new DragDropManager();

items.forEach((item, index) => {
  new Sortable({ id: item.id, index, element: item.element }, manager);
});
```

### Where this lands in MVC

dnd-kit is a **controller** concern, not a view or model one.

- The **controller** owns the `DragDropManager`, registers sortables after each render, and
  translates `dragend` into a model call.
- The **model** owns the order. Reorder the array in the model and notify; do not treat the DOM
  position dnd-kit produced as the source of truth.
- The **view** re-renders from state as usual and exposes the handle with `data-drag-handle`.

Because a fresh render replaces the nodes, the controller must re-register sortables after every
notify, or destroy and rebuild the manager. Registering once at `init()` silently stops working
after the first re-render.

## React — `@dnd-kit/react`

```bash
npm install @dnd-kit/react
```

```jsx
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";

function Card({ id, index, column }) {
  const { ref } = useSortable({ id, index, group: column, type: "item", accept: "item" });
  return <li ref={ref} className="card">{id}</li>;
}

function Board({ columns, onMove }) {
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return;
        const { source } = event.operation;
        onMove(source); // source carries initialIndex, index, initialGroup, group
      }}
    >
      {/* columns render Card lists */}
    </DragDropProvider>
  );
}
```

Per the layering in `scaffolds/web-react-ts`: the reorder logic belongs in a hook
(`useBoard.ts`), the persistence call in `services/`, and the component stays thin.

For a multi-column board, snapshot state in `onDragStart` with `structuredClone` and restore it when
`event.canceled` is true — dnd-kit moves the DOM optimistically, so a cancelled drag needs the
snapshot to put state back.

## Accessibility — do this, not optional

The keyboard sensor and the announcement plugin are what make this library worth using. Skipping
them means shipping a mouse-only feature.

```js
import { DragDropManager, KeyboardSensor, PointerSensor, Accessibility } from "@dnd-kit/dom";

const manager = new DragDropManager({
  sensors: [PointerSensor, KeyboardSensor],
  plugins: (defaults) => [
    ...defaults,
    Accessibility.configure({
      announcements: {
        dragstart: ({ operation: { source } }) =>
          source && `Plukket opp ${source.id}`,
        dragover: ({ operation: { source, target } }) =>
          source && target && `${source.id} over ${target.id}`,
        dragend: ({ operation: { source, target } }, canceled) =>
          !source
            ? undefined
            : canceled
              ? "Flyttingen ble avbrutt"
              : `Slapp ${source.id} på ${target?.id ?? "ingenting"}`,
      },
    }),
  ],
});
```

The same `Accessibility` plugin is imported from `@dnd-kit/dom` in React and passed to
`<DragDropProvider plugins={...}>`.

> **Unverified, 2026-08-25.** In a local probe (both the vendored bundle and the raw unbundled
> package) the plugin never mounted its live region: no `#dnd-kit-announcement` element, no
> `#dnd-kit-description`, and no `aria-roledescription` / `aria-describedby` on the handle. Reading
> the source, `Accessibility` is a default plugin and mounts from an effect over
> `registry.draggables`, so it should have. The probe drove the keyboard with JS-dispatched
> `KeyboardEvent`s because the browser-driver sends keydowns with an empty `code` — untrusted events
> are the likeliest explanation, but that is a hypothesis, not a finding. **Verify announcements on
> real hardware with a real screen reader before trusting this section.** Dragging itself, including
> the keyboard pickup/move/drop path, is verified working — see below.

Checklist for any drag feature:

1. The drag handle is a real `<button>` and reachable by Tab.
2. Space or Enter picks up, arrows move, Escape cancels — the keyboard sensor's defaults.
3. Announcements are written in the app's language (Norwegian for Wend, both for Varde).
4. The handle meets the 44×44 house floor, not just WCAG 2.5.8's 24×24.
5. **Drag is never the only way to do the thing.** Ship a move-to menu or up/down buttons beside it.

## Touch — the constraint you must set

On touch, a draggable with no activation constraint swallows the scroll gesture: the user tries to
scroll the list and drags a card instead. Always constrain activation.

```js
import { PointerSensor, PointerActivationConstraints } from "@dnd-kit/dom";

PointerSensor.configure({
  activationConstraints: [
    // long-press to drag; a 5px twitch during the hold aborts and lets the scroll through
    new PointerActivationConstraints.Delay({ value: 200, tolerance: 5 }),
  ],
  // only the handle starts a drag
  activatorElements: (source) => [source.element?.querySelector("[data-drag-handle]")],
  // let buttons, links and inputs inside a card behave normally
  preventActivation: (event, source) =>
    event.target instanceof Element && event.target.closest("[data-no-drag]") !== null,
});
```

`PointerActivationConstraints.Distance({value: 8})` is the alternative — drag starts after 8px of
movement. Delay suits vertical lists on touch; Distance suits desktop-first grids.

## No build step (Wend) — vendor a bundle

Wend's frontend is hand-authored vanilla JS served from `wwwroot`, with no `package.json` and no
bundler, so it cannot `npm install @dnd-kit/dom`. Two routes exist. **Take the bundle.**

**Rejected: import maps.** `@dnd-kit/dom` imports bare specifiers, and every package in the
transitive graph has to be mapped by hand — `@dnd-kit/abstract`, `@dnd-kit/state`,
`@dnd-kit/geometry`, `@dnd-kit/collision`, `@dnd-kit/dom/utilities`, plus `@preact/signals-core`,
which is a dependency of a dependency and does not appear anywhere in dnd-kit's own docs. Tested
2026-08-25: the map failed at runtime on the first unmapped specifier, and every dnd-kit upgrade can
add another. It also ships ~30 separate module requests instead of one file.

**Chosen: pre-bundle once, commit the output.** Same shape as the vendored `design-system/` — a
build artifact that lives in the repo, produced by a script, never hand-edited.

Build it in a scratch directory, outside Wend:

```bash
npm install @dnd-kit/dom@0.5.0 esbuild
```

`entry.js` — name every export the app uses, so the surface is explicit and reviewable:

```js
export {
  DragDropManager, Draggable, Droppable,
  PointerSensor, KeyboardSensor, Accessibility, PointerActivationConstraints,
} from "@dnd-kit/dom";
export { Sortable } from "@dnd-kit/dom/sortable";
```

```bash
npx esbuild entry.js --bundle --format=esm --minify --legal-comments=inline --outfile=dnd-kit.min.js
```

Copy the result to `wwwroot/vendor/dnd-kit/dnd-kit.min.js` and import it by relative path:

```js
import { DragDropManager, Sortable } from "./vendor/dnd-kit/dnd-kit.min.js";
```

**Verified 2026-08-25** against a static server with no build step:

- Output is **103 KB minified, 35 KB gzipped**, one file, zero remaining bare imports
- All eight named exports resolve
- Keyboard pickup → `ArrowDown` → drop reordered the list and fired `dragend` with the correct
  `initialIndex` / `index`; `Escape` cancelled with `event.canceled === true`
- The bundle behaved **identically to the raw unbundled package** on the same probe, including the
  accessibility caveat above — so bundling is faithful and is not the cause of that gap

Rules that come with this:

- `--legal-comments=inline` keeps the MIT notices in the artifact. Do not drop it.
- Pin the exact version in the build command and record it next to the artifact. A 0.x upgrade is a
  deliberate act: rebuild, re-verify, commit.
- Wend's Biome config must exclude `wwwroot/vendor/` the way it already excludes `design-system/`,
  or the format hook will rewrite the bundle and register as a local edit.
- The build belongs in a script beside `sync-design-system.ps1`, not in a README step someone
  re-derives by hand.

## Gotchas

- **Mixing the two lines.** `setNodeRef` next to `@dnd-kit/react` is the signature of a pasted legacy
  snippet. Check the imports before trusting any example found online.
- **Registering sortables once.** In vanilla MVC, re-register after every render. In React the hook
  handles it.
- **`index` is required on `Sortable` / `useSortable`.** Omitting it produces a list that drags but
  never reorders correctly.
- **Cancelled drags.** Always check `event.canceled` in `dragend` before mutating state, and keep a
  pre-drag snapshot for multi-list boards.
- **No activation constraint on touch** breaks scrolling. See above.
- **`@dnd-kit/dom` is ESM from npm**, so a no-build-step project cannot install it directly. Solved
  by vendoring a pre-built bundle — see the section above. Do not reach for an import map.

## Status

Not adopted into any scaffold or library. Evaluate again after the first real drag feature ships; if
the same wrapper code appears in two projects, that is the signal to promote it to `libraries/`.
