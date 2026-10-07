Storyboard.addScreen({
  id: "settings",
  label: "Settings",
  note: "App preferences — mock toggles.",
  render() {
    return `
      <div class="stack">
        <button class="btn btn-ghost" data-goto="plants" type="button">Back to plants</button>
        <div class="card stack stack-sm">
          <strong id="settings-reminders-label">Reminders</strong>
          <p class="text-muted" id="settings-reminders-desc">Notify me when a plant is thirsty.</p>
          <div role="group" aria-labelledby="settings-reminders-label settings-reminders-desc">
            <button class="btn btn-secondary btn-full" type="button" data-toggle="On|Off" aria-pressed="true">On</button>
          </div>
        </div>
        <div class="card stack stack-sm">
          <strong id="settings-units-label">Units</strong>
          <p class="text-muted" id="settings-units-desc">Water amounts in millilitres or fluid ounces.</p>
          <div role="group" aria-labelledby="settings-units-label settings-units-desc">
            <button class="btn btn-secondary btn-full" type="button" data-toggle="Metric|Imperial" aria-pressed="true">Metric</button>
          </div>
        </div>
      </div>`;
  },
});
