(function bootStoryboard() {
  const root = document.querySelector(".storyboard");
  const view = createStoryboardView(root);
  if (Storyboard.screens.length === 0) {
    view.renderEmpty();
    return;
  }
  const model = createStoryboardModel(Storyboard.screens);
  createStoryboardController(model, view, window, Storyboard.flows);
})();
