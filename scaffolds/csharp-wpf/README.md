# csharp-wpf

WPF/MVVM starter for desktop projects. CommunityToolkit.Mvvm, a Services I/O boundary, dark-first design-system tokens in XAML, and xUnit. It's the skeleton proven in Tidsro, generalized.

## Folder structure

- `MyApp/ViewModels/`: behavior. `[ObservableProperty]` + `[RelayCommand]` (CommunityToolkit.Mvvm); never references Views.
- `MyApp/Views/`: UserControls and DataTemplates as the app grows. `MainWindow.xaml.cs` sets the DataContext and nothing else.
- `MyApp/Models/`: state only. No timers, no UI references.
- `MyApp/Services/`: the **only** I/O boundary (file, network, persistence) behind interfaces, handed to ViewModels from the composition root. `IFileService` is the example.
- `MyApp/Resources/tokens.xaml`: colours, spacing, radius, typography, and motion mirroring the web design-system, plus keyboard-only focus visuals and `QuietAction`/`PrimaryAction` button styles.
- `MyApp.Tests/`: xUnit. Targets ViewModels and Models only, never XAML.

## First 5 steps in a new project

1. Copy this folder to wherever the project lives.
2. Rename by find/replace `MyApp` → `<YourName>` across files and folder names (`MyApp.slnx`, `MyApp/`, `MyApp.Tests/`). Check `x:Class` and `RootNamespace` too. Keep the Application class named `App`, and don't name the project literally `App`. A WPF project by that name fails to compile (namespace/class collision in the generated entry point).
3. Run `dotnet restore && dotnet build && dotnet test`.
4. Run `dotnet run --project MyApp`. The window opens dark; the button proves the binding chain.
5. Replace `Status`/`ConfirmWiring` in `MainViewModel` with the project's real state and behavior.

## Working rules

- ViewModels never do I/O. If it touches `File`, `HttpClient`, or a database, it goes behind a `Services/` interface.
- Views bind; they don't compute. Code-behind is for view-only concerns (focus, window placement), never business logic.
- Resize-tolerant layouts: `Grid` with `*` rows/columns and `MinWidth`/`MinHeight`. No fixed pixels for content.
- Dark-first via `tokens.xaml`; state changes never rely on colour alone (see the focus visual and toggle patterns in Tidsro for reference).

## What's deliberately not here

- No DI container. Compose in `App.xaml.cs`; add `Microsoft.Extensions.DependencyInjection` when the project earns it.
- No tray icon, single-instance mutex, or persistence. Tidsro shows how when needed.
