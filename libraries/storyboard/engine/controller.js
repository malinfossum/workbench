// Owns the two DOM-flavored concerns the model must not know about:
// data-goto delegation and hash routing. The URL hash is UNTRUSTED input —
// it is parsed and matched against the registry, never rendered anywhere.

function createStoryboardController(model, view, win, flows) {
  let initial = true;

  function currentHash() {
    return win.location.hash.replace(/^#/, "");
  }

  model.subscribe(() => {
    view.renderScreen(model, { focus: !initial });
    const canonical = formatTarget(model.getCurrent());
    if (currentHash() !== canonical) {
      if (initial) win.location.replace(`#${canonical}`);
      else win.location.hash = canonical;
    }
    const screen = model.getActiveScreen();
    view.announce(`Showing ${screen.label}, ${model.getCurrent().stateId} state`);
    initial = false;
  });

  win.addEventListener("hashchange", () => {
    const next = model.resolve(parseTarget(currentHash()));
    if (!next) {
      win.location.replace(`#${formatTarget(model.getCurrent())}`);
      return;
    }
    model.setActive(next);
  });

  view.bindNav((screenId) => model.setActive({ screenId, stateId: null }));
  view.bindState((stateId) => model.setActive({ screenId: model.getCurrent().screenId, stateId }));
  view.bindFlow((flowId) => {
    const flow = flows.find((f) => f.id === flowId);
    if (flow) model.setActive(parseTarget(flow.start));
  });
  view.bindGoto((raw) => {
    const next = model.resolve(parseTarget(raw));
    if (!next) {
      view.announce(`Unknown screen: ${raw}`);
      console.warn(`storyboard: unknown data-goto "${raw}"`);
      return;
    }
    model.setActive(next);
  });

  view.renderChrome(model, flows);
  const requested = model.resolve(parseTarget(currentHash()));
  model.setActive(requested ?? model.fallback());
}
