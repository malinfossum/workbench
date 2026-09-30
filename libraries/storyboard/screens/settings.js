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
          <p class="text-muted">Notify me when a plant is thirsty.</p>
          <div class="cluster cluster-sm" role="group" aria-labelledby="settings-reminders-label">
            <button class="btn btn-secondary" type="button" data-toggle="reminders" aria-pressed="true">On</button>
            <button class="btn btn-secondary" type="button" data-toggle="reminders" aria-pressed="false">Off</button>
          </div>
        </div>
        <div class="card stack stack-sm">
          <strong id="settings-units-label">Units</strong>
          <p class="text-muted">Water amounts in millilitres or fluid ounces.</p>
          <div class="cluster cluster-sm" role="group" aria-labelledby="settings-units-label">
            <button class="btn btn-secondary" type="button" data-toggle="units" aria-pressed="true">Metric</button>
            <button class="btn btn-secondary" type="button" data-toggle="units" aria-pressed="false">Imperial</button>
          </div>
        </div>
      </div>`;
  },
});
