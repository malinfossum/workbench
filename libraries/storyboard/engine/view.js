function createStoryboardView(root) {
  const nav = root.querySelector("#sb-nav");
  const flowsNav = root.querySelector("#sb-flows");
  const head = root.querySelector("#sb-screen-head");
  const viewport = root.querySelector("#sb-viewport");
  const status = document.querySelector("#status");

  return {
    renderChrome(model, flows) {
      nav.innerHTML = model
        .getScreens()
        .map(
          (s) =>
            `<button class="sb-nav-item" data-action="nav" data-id="${escapeHtml(s.id)}" type="button">${escapeHtml(s.label)}</button>`,
        )
        .join("");
      flowsNav.innerHTML = flows
        .map(
          (f) =>
            `<button class="sb-nav-item" data-action="flow" data-id="${escapeHtml(f.id)}" type="button">${escapeHtml(f.label)}</button>`,
        )
        .join("");
    },

    renderScreen(model, { focus }) {
      const screen = model.getActiveScreen();
      const { stateId } = model.getCurrent();
      const pills = screen.states
        .map(
          (state) =>
            `<button class="sb-state-pill" data-action="state" data-id="${escapeHtml(state)}" type="button">${escapeHtml(state)}</button>`,
        )
        .join("");
      head.innerHTML = `
        <h1 class="sb-screen-title" tabindex="-1">${escapeHtml(screen.label)}</h1>
        ${screen.note ? `<p class="text-muted sb-screen-note">${escapeHtml(screen.note)}</p>` : ""}
        <div class="cluster cluster-sm sb-states" role="group" aria-label="States">${pills}</div>`;
      try {
        viewport.innerHTML = screen.render(stateId);
      } catch (err) {
        viewport.innerHTML = `
          <div class="alert alert-danger">
            <strong>Screen "${escapeHtml(screen.id)}" failed to render.</strong>
            <p>${escapeHtml(err.message)}</p>
          </div>`;
      }
      this.markActive(model);
      // Focus the heading, not the viewport: a focused container makes NVDA read
      // its whole content at once; a heading is announced alone, then the user
      // moves through the screen one element at a time.
      if (focus) head.querySelector(".sb-screen-title").focus();
    },

    markActive(model) {
      const { screenId, stateId } = model.getCurrent();
      nav.querySelectorAll("[data-action='nav']").forEach((el) => {
        el.setAttribute("aria-current", el.dataset.id === screenId ? "true" : "false");
      });
      head.querySelectorAll("[data-action='state']").forEach((el) => {
        el.setAttribute("aria-current", el.dataset.id === stateId ? "true" : "false");
      });
    },

    renderEmpty() {
      viewport.innerHTML = `
        <div class="empty-state stack stack-sm">
          <strong>No screens registered yet.</strong>
          <p class="text-muted">Add a file to <code>screens/</code> and list it in <code>index.html</code>.</p>
        </div>`;
    },

    announce(text) {
      status.textContent = "";
      setTimeout(() => {
        status.textContent = text;
      }, 0);
    },

    bindNav(handler) {
      nav.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='nav']");
        if (btn) handler(btn.dataset.id);
      });
    },
    bindState(handler) {
      head.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='state']");
        if (btn) handler(btn.dataset.id);
      });
    },
    bindFlow(handler) {
      flowsNav.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='flow']");
        if (btn) handler(btn.dataset.id);
      });
    },
    bindGoto(handler) {
      viewport.addEventListener("click", (e) => {
        const el = e.target.closest("[data-goto]");
        if (!el) return;
        e.preventDefault();
        handler(el.dataset.goto);
      });
    },
    // Mock toggles: one button per setting shows the current value and lists
    // both values as data-toggle="On|Off" (first = pressed). A press flips the
    // text and aria-pressed, then reports the setting name and new value so
    // the controller can write the status line. No model state — a storyboard
    // mock has no settings to persist.
    bindToggle(handler) {
      viewport.addEventListener("click", (e) => {
        const el = e.target.closest("[data-toggle]");
        if (!el) return;
        const [on, off] = el.dataset.toggle.split("|");
        const pressed = el.getAttribute("aria-pressed") !== "true";
        el.setAttribute("aria-pressed", String(pressed));
        el.textContent = pressed ? on : off;
        const group = el.closest("[aria-labelledby]");
        const label = group && document.getElementById(group.getAttribute("aria-labelledby"));
        handler({ setting: label ? label.textContent.trim() : "", value: el.textContent.toLowerCase() });
      });
    },
  };
}
