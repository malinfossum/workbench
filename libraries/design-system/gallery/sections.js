// Each section is { id, label, render() } returning the panel HTML.
// Built entirely from existing design-system classes (see components/ + primitives/).

const SWATCHES = [
  "--surface-2",
  "--surface-3",
  "--surface-4",
  "--surface-5",
  "--accent",
  "--accent-strong",
  "--secondary",
  "--success",
  "--warning",
  "--danger",
  "--info",
];
const RADII = ["--radius-xs", "--radius-sm", "--radius-md", "--radius-lg", "--radius-xl"];
const SPACES = ["--space-2", "--space-3", "--space-4", "--space-5", "--space-6", "--space-7"];

// Panel header: eyebrow kicker + big title + optional description.
function panelHeader(kicker, title, desc) {
  return `
    <header class="panel-head stack stack-sm">
      <span class="eyebrow">${kicker}</span>
      <h2 class="panel-title">${title}</h2>
      ${desc ? `<p class="text-muted">${desc}</p>` : ""}
    </header>`;
}

// One documented specimen: title + note + class chips + a live preview stage.
function specimen({ title, note, classes, demo }) {
  const chips = (classes || []).map((c) => `<code class="spec-class">${c}</code>`).join("");
  return `
    <section class="specimen stack">
      <div class="specimen-head stack stack-sm">
        <h3>${title}</h3>
        ${note ? `<p class="text-muted">${note}</p>` : ""}
        ${chips ? `<div class="cluster cluster-sm">${chips}</div>` : ""}
      </div>
      <div class="stage">${demo}</div>
    </section>`;
}

const GALLERY_SECTIONS = [
  {
    id: "foundations",
    label: "Foundations",
    render() {
      const swatches = SWATCHES.map(
        (v) => `
          <div class="stack stack-sm">
            <div class="swatch" style="background: var(${v})"></div>
            <code class="spec-class">${v.replace("--", "")}</code>
          </div>`,
      ).join("");
      const radii = RADII.map(
        (v) => `
          <div class="stack stack-sm">
            <div class="swatch" style="border-radius: var(${v}); background: var(--surface-4)"></div>
            <code class="spec-class">${v.replace("--radius-", "")}</code>
          </div>`,
      ).join("");
      const spaces = SPACES.map(
        (v) => `
          <div class="cluster cluster-sm">
            <div style="width: var(${v}); height: 1rem; background: var(--accent); border-radius: 2px"></div>
            <code class="spec-class">${v.replace("--", "")}</code>
          </div>`,
      ).join("");
      return (
        panelHeader(
          "Design tokens",
          "Foundations",
          "The shared values everything else is built from — change one, it cascades.",
        ) +
        specimen({
          title: "Color",
          note: "Semantic surface and accent tokens. Each derives from a single RGB channel.",
          demo: `<div class="grid grid-auto">${swatches}</div>`,
        }) +
        specimen({
          title: "Typography",
          note: "The type scale, smallest to largest.",
          demo: `<div class="stack"><h1>Heading 1</h1><h2>Heading 2</h2><h3>Heading 3</h3><p>Body text — the default size and color.</p><p class="text-muted">Muted helper / label text.</p></div>`,
        }) +
        specimen({
          title: "Radius",
          demo: `<div class="grid grid-auto">${radii}</div>`,
        }) +
        specimen({
          title: "Spacing",
          note: "The spacing scale, used for every gap and padding value.",
          demo: `<div class="stack stack-sm">${spaces}</div>`,
        })
      );
    },
  },
  {
    id: "primitives",
    label: "Layout primitives",
    render() {
      return (
        panelHeader(
          "Layout",
          "Layout primitives",
          "Composable structure — reach for these before writing custom layout CSS.",
        ) +
        specimen({
          title: "Stack",
          note: "Vertical rhythm with a consistent gap.",
          classes: [".stack"],
          demo: `
            <div class="stack">
              <div class="card"><div class="cluster-between"><span>Push notifications</span><span class="badge badge-success">On</span></div></div>
              <div class="card"><div class="cluster-between"><span>Two-factor auth</span><span class="badge badge-success">On</span></div></div>
              <div class="card"><div class="cluster-between"><span>Marketing emails</span><span class="badge">Off</span></div></div>
            </div>`,
        }) +
        specimen({
          title: "Cluster",
          note: "Inline items that wrap — tags, filters, button rows.",
          classes: [".cluster"],
          demo: `
            <div class="cluster">
              <span class="badge badge-accent">All</span>
              <span class="badge">Open</span>
              <span class="badge">In review</span>
              <span class="badge">Merged</span>
              <span class="badge">Closed</span>
            </div>`,
        }) +
        specimen({
          title: "Grid",
          note: "Auto-fitting responsive columns.",
          classes: [".grid", ".grid-auto"],
          demo: `
            <div class="grid grid-auto">
              <article class="card stack"><h3>Ignite</h3><p class="text-muted">Habit tracker</p></article>
              <article class="card stack"><h3>Kenaz</h3><p class="text-muted">Wellbeing check-ins</p></article>
              <article class="card stack"><h3>Tidsro</h3><p class="text-muted">Focus timer</p></article>
            </div>`,
        }) +
        specimen({
          title: "Split",
          note: "Two columns that stack on small screens.",
          classes: [".split"],
          demo: `
            <div class="split">
              <div class="card stack"><h3>Article</h3><p class="text-muted">Main content column.</p></div>
              <div class="card stack"><h3>Aside</h3><p class="text-muted">Secondary column.</p></div>
            </div>`,
        }) +
        specimen({
          title: "Center",
          note: "Centers content within a min-height area.",
          classes: [".center"],
          demo: `
            <div class="center" style="min-height: 9rem">
              <div class="stack" style="text-align: center">
                <p class="text-muted">No projects yet</p>
                <button class="btn btn-primary" type="button">New project</button>
              </div>
            </div>`,
        })
      );
    },
  },
  {
    id: "buttons",
    label: "Buttons",
    render() {
      return (
        panelHeader("Component", "Buttons", "Actions. Use one primary button per view.") +
        specimen({
          title: "Variants",
          classes: [".btn", ".btn-primary", ".btn-secondary", ".btn-ghost", ".btn-danger"],
          demo: `
            <div class="cluster">
              <button class="btn btn-primary" type="button">Save changes</button>
              <button class="btn btn-secondary" type="button">Preview</button>
              <button class="btn btn-ghost" type="button">Cancel</button>
              <button class="btn btn-danger" type="button">Delete</button>
              <button class="btn" type="button" disabled>Saving…</button>
            </div>`,
        }) +
        specimen({
          title: "Full width",
          note: "Spans its container — good for forms and mobile CTAs.",
          classes: [".btn-full"],
          demo: `<button class="btn btn-primary btn-full" type="button">Continue</button>`,
        })
      );
    },
  },
  {
    id: "icons",
    label: "Icons",
    render() {
      // `icon` and `ICON_NAMES` are put on window by app.js (a module) before any
      // panel renders — this file stays a classic script like the rest of the gallery.
      const set = ICON_NAMES.map(
        (name) => `
          <div class="stack stack-sm icon-cell">
            <div class="icon-tile">${icon(name)}</div>
            <code class="spec-class">${name}</code>
          </div>`,
      ).join("");
      const ramp = [16, 20, 24, 32, 48]
        .map(
          (size) => `
          <div class="stack stack-sm icon-cell">
            <div class="icon-tile">${icon("disc", { size })}</div>
            <code class="spec-class">${size}px</code>
          </div>`,
        )
        .join("");
      return (
        panelHeader(
          "Component",
          "Icons",
          "Inline SVG from components/icons.js — stroke: currentColor, decorative, one stroke family.",
        ) +
        specimen({
          title: "The set",
          note: "Every icon inherits the colour of the control it sits in and follows the theme.",
          classes: ["icon(name)", ".icon"],
          demo: `<div class="icon-grid">${set}</div>`,
        }) +
        specimen({
          title: "Size ramp",
          note: "The stroke thins from 1.75 to 1.25 at 40px and up, so a large icon keeps the weight of a small one.",
          classes: ["icon(name, { size })", "icon(name, { size, strokeWidth })"],
          demo: `<div class="icon-grid">${ramp}</div>`,
        }) +
        specimen({
          title: "In controls",
          note: "Visible text names the action; an icon-only button carries an aria-label.",
          classes: [".btn", ".icon-btn"],
          demo: `
            <div class="cluster">
              <button class="btn btn-primary" type="button">${icon("plus")} Add record</button>
              <button class="btn btn-secondary" type="button">${icon("search")} Search</button>
              <button class="btn btn-ghost" type="button">${icon("calendar")} Pick a date</button>
              <button class="btn icon-btn" type="button" aria-label="Close">${icon("close")}</button>
              <button class="btn icon-btn" type="button" aria-label="Toggle theme">${icon("moon")}</button>
            </div>`,
        })
      );
    },
  },
  {
    id: "inputs",
    label: "Inputs",
    render() {
      return (
        panelHeader("Component", "Inputs", "Labelled form controls with visible help text.") +
        specimen({
          title: "Fields",
          classes: [".field", ".label", ".input", ".help"],
          demo: `
            <div class="grid grid-auto">
              <label class="field"><span class="label">Email</span><input class="input" type="email" placeholder="you@example.com" /><span class="help">We never share it.</span></label>
              <label class="field"><span class="label">Message</span><textarea class="textarea" rows="3" placeholder="Write something…"></textarea></label>
              <label class="field"><span class="label">Role</span><select class="select"><option>Student</option><option>Developer</option></select></label>
              <label class="field"><span class="label">API key</span><input class="input" value="sk-•••••••" disabled /><span class="help">Read-only once issued.</span></label>
            </div>`,
        })
      );
    },
  },
  {
    id: "badges",
    label: "Badges",
    render() {
      return (
        panelHeader("Component", "Badges", "Compact status and category labels.") +
        specimen({
          title: "Statuses",
          classes: [".badge", ".badge-accent", ".badge-success", ".badge-warning", ".badge-danger"],
          demo: `
            <div class="cluster">
              <span class="badge badge-accent">New</span>
              <span class="badge badge-success">Active</span>
              <span class="badge badge-warning">Pending</span>
              <span class="badge badge-danger">Failed</span>
              <span class="badge">Neutral</span>
            </div>`,
        })
      );
    },
  },
  {
    id: "cards",
    label: "Cards & surfaces",
    render() {
      return (
        panelHeader("Component", "Cards & surfaces", "Containers for grouped content.") +
        specimen({
          title: "Variants",
          classes: [".card", ".card-hover", ".surface"],
          demo: `
            <div class="grid grid-auto">
              <article class="card stack"><h3>Project</h3><p class="text-muted">A base surface for grouped content.</p><span class="badge badge-accent">New</span></article>
              <article class="card card-hover stack"><h3>Interactive</h3><p class="text-muted">Lifts on hover — use for clickable cards.</p></article>
              <div class="surface stack" style="padding: var(--space-5)"><h3>Surface</h3><p class="text-muted">A subtle panel — bring your own padding.</p></div>
            </div>`,
        })
      );
    },
  },
  {
    id: "feedback",
    label: "Feedback",
    render() {
      return (
        panelHeader("Component", "Feedback", "Tell the user what happened.") +
        specimen({
          title: "Alerts",
          note: "Inline, persistent messages tied to a region.",
          classes: [".alert", ".alert-info", ".alert-success", ".alert-warning", ".alert-danger"],
          demo: `
            <div class="stack">
              <div class="alert alert-info"><strong class="text-strong">Update available</strong><p>A new version is ready to install.</p></div>
              <div class="alert alert-success"><strong class="text-strong">Saved</strong><p>Your changes were saved.</p></div>
              <div class="alert alert-warning"><strong class="text-strong">Heads up</strong><p>Your trial ends in 3 days.</p></div>
              <div class="alert alert-danger"><strong class="text-strong">Payment failed</strong><p>Update your card to continue.</p></div>
            </div>`,
        }) +
        specimen({
          title: "Progress",
          classes: [".progress"],
          demo: `<div class="stack stack-sm"><div class="cluster-between"><span class="text-muted">Uploading…</span><span class="text-muted">60%</span></div><div class="progress"><span style="width: 60%"></span></div></div>`,
        }) +
        specimen({
          title: "Toast",
          note: "Transient, auto-dismissing. role=status + aria-live announce it to screen readers.",
          classes: [".toast", ".toast-success", ".toast-danger"],
          demo: `
            <div class="stack">
              <div class="toast toast-success" role="status" aria-live="polite">Project created.</div>
              <div class="toast toast-danger" role="status" aria-live="polite">Couldn't connect — retrying.</div>
            </div>`,
        })
      );
    },
  },
  {
    id: "navigation",
    label: "Navigation",
    render() {
      return (
        panelHeader("Component", "Navigation", "Move between areas of the app.") +
        specimen({
          title: "Top bar",
          classes: [".topbar", ".nav-list", ".nav-link"],
          demo: `
            <nav class="topbar">
              <div class="cluster-between">
                <span class="brand">Ignite</span>
                <ul class="nav-list">
                  <li><a class="nav-link" href="#" aria-current="page">Home</a></li>
                  <li><a class="nav-link" href="#">Projects</a></li>
                  <li><a class="nav-link" href="#">About</a></li>
                </ul>
              </div>
            </nav>`,
        }) +
        specimen({
          title: "Tabs",
          note: "Click to switch panels. role=tablist + aria-selected drive the active state.",
          classes: [".tabs", ".tab", ".tab-panel"],
          demo: `
            <div class="tabs">
              <div class="tab-list" role="tablist">
                <button class="tab" role="tab" aria-selected="true" type="button">Overview</button>
                <button class="tab" role="tab" aria-selected="false" type="button">Activity</button>
                <button class="tab" role="tab" aria-selected="false" type="button">Settings</button>
              </div>
              <div class="tab-panel" role="tabpanel">Overview — a summary of the project.</div>
              <div class="tab-panel" role="tabpanel" hidden>Activity — recent events.</div>
              <div class="tab-panel" role="tabpanel" hidden>Settings — configuration.</div>
            </div>`,
        })
      );
    },
  },
  {
    id: "overlays",
    label: "Overlays",
    render() {
      return (
        panelHeader("Component", "Overlays", "Surfaces that sit above the page. Shown inline here.") +
        specimen({
          title: "Modal",
          classes: [".modal"],
          demo: `
            <div class="modal stack">
              <h3>Delete project?</h3>
              <p class="text-muted">This permanently removes "Ignite" and its data. This can't be undone.</p>
              <div class="cluster">
                <button class="btn btn-danger" type="button">Delete</button>
                <button class="btn btn-ghost" type="button">Cancel</button>
              </div>
            </div>`,
        })
      );
    },
  },
  {
    id: "data",
    label: "Data",
    render() {
      return (
        panelHeader("Component", "Data", "Numbers and tabular content.") +
        specimen({
          title: "Stats",
          classes: [".stat", ".stat-value", ".stat-label"],
          demo: `
            <div class="grid grid-auto">
              <article class="card stat"><strong class="stat-value">1,204</strong><span class="stat-label">Active users</span></article>
              <article class="card stat"><strong class="stat-value">8,392</strong><span class="stat-label">Sessions</span></article>
              <article class="card stat"><strong class="stat-value">99.9%</strong><span class="stat-label">Uptime</span></article>
            </div>`,
        }) +
        specimen({
          title: "Table",
          classes: [".table", ".table-wrap"],
          demo: `
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Project</th><th>Status</th><th>Updated</th></tr></thead>
                <tbody>
                  <tr><td>Ignite</td><td><span class="badge badge-success">Active</span></td><td>2 min ago</td></tr>
                  <tr><td>Kenaz</td><td><span class="badge badge-warning">Paused</span></td><td>Yesterday</td></tr>
                  <tr><td>Tidsro</td><td><span class="badge">Archived</span></td><td>Mar 4</td></tr>
                </tbody>
              </table>
            </div>`,
        })
      );
    },
  },
  {
    id: "loading",
    label: "Loading",
    render() {
      return (
        panelHeader("Component", "Loading", "Placeholders while content fetches. Static under reduced-motion.") +
        specimen({
          title: "Skeleton",
          classes: [".skeleton", ".skeleton-text", ".skeleton-circle", ".skeleton-card"],
          demo: `
            <div class="grid grid-auto">
              <div class="skeleton skeleton-card"></div>
              <article class="card stack">
                <div class="cluster cluster-sm">
                  <div class="skeleton skeleton-circle"></div>
                  <div class="skeleton skeleton-text" style="width: 8rem"></div>
                </div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text" style="width: 60%"></div>
              </article>
            </div>`,
        })
      );
    },
  },
];

// Sidebar entries that are plain links (open a separate page), not panels.
const GALLERY_LINKS = [{ label: "Sandbox ↗", href: "../sandbox/index.html" }];
