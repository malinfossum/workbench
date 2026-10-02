# csharp-wpf

WPF/MVVM starter for desktop projects. CommunityToolkit.Mvvm, a Services I/O boundary, dark-first design-system tokens in XAML, and xUnit. It's the skeleton proven in Tidsro, generalized.

## Folder structure

- `MyApp/ViewModels/`: behavior. `[ObservableProperty]` + `[RelayCommand]` (CommunityToolkit.Mvvm); never references Views.
- `MyApp/Views/`: UserControls and DataTemplates as the app grows. `MainWindow.xaml.cs` sets the DataContext and nothing else.
- `MyApp/Models/`: state only. No timers, no UI references.
- `MyApp/Services/`: the **only** I/O boundary (file, network, persistence) behind interfaces, handed to ViewModels from the composition root. `IFileService` is the example; `PreferencesService` keeps the settings file; `Localizer` reads the embedded `Locales/*.json`.
- `MyApp/Locales/`: `en.json` and `nb.json`, flat dotted keys with `{name}` placeholders, embedded in the exe. Same format as the web i18n library.
- `MyApp/Resources/tokens.xaml`: colours, spacing, radius, typography, and motion mirroring the web design-system, plus keyboard-only focus visuals and `QuietAction`/`PrimaryAction` button styles.
- `MyApp.Tests/`: xUnit. Targets ViewModels and Models only, never XAML.

## First 5 steps in a new project

1. Copy this folder to wherever the project lives.
2. Rename by find/replace `MyApp` → `<YourName>` across files and folder names (`MyApp.slnx`, `MyApp/`, `MyApp.Tests/`). Check `x:Class` and `RootNamespace` too. Keep the Application class named `App`, and don't name the project literally `App`. A WPF project by that name fails to compile (namespace/class collision in the generated entry point).
3. Run `dotnet restore && dotnet build && dotnet test`.
4. Run `dotnet run --project MyApp`. The window opens dark; the button proves the binding chain; the language picker switches every string.
5. Replace `Status`/`ConfirmWiring` in `MainViewModel` with the project's real state and behavior. Keep strings in `Locales/`, keys in the ViewModel.

## Working rules

- ViewModels never do I/O. If it touches `File`, `HttpClient`, or a database, it goes behind a `Services/` interface.
- Views bind; they don't compute. Code-behind is for view-only concerns (focus, window placement), never business logic.
- Resize-tolerant layouts: `Grid` with `*` rows/columns and `MinWidth`/`MinHeight`. No fixed pixels for content.
- Dark-first via `tokens.xaml`; state changes never rely on colour alone (see the focus visual and toggle patterns in Tidsro for reference).

## Language

The locale standard (`docs/specs/2026-10-01-locale-standard.md` § 10) on the desktop:

- `Localizer.T("key", ("name", value))` and `Plural("key", count)` read `Locales/<tag>.json`; a missing key falls back to `en`, then to the key itself. `Plural` picks `.one` for exactly one and `.other` otherwise, which covers the shipped languages.
- The user's choice lives in `%LocalAppData%\MyApp\settings.json` under `lang`, next to the reserved `theme` and `currency` keys. No key means System: the OS language, with `no` and `nn` resolving to `nb` and anything unbundled to `en`. Choosing System removes the key; an invalid stored value is removed on first read.
- `LanguageViewModel` owns the choice and the picker rows (System first, then autonyms from the OS). On `Localizer.LanguageChanged` every view model re-raises `PropertyChanged`, `App.xaml.cs` mirrors the culture to `CultureInfo`, and the window's `Language` property follows through a binding, so Narrator and NVDA switch voice the way `<html lang>` does on the web.
- Tests cover `T`, placeholders, plurals, fallback, resolution, the preference rule and the settings file. The key-drift test (`Embedded_bundles_load_and_share_one_key_set`) fails when a language misses a key.

## What's deliberately not here

- No DI container. Compose in `App.xaml.cs`; add `Microsoft.Extensions.DependencyInjection` when the project earns it.
- No tray icon or single-instance mutex. Tidsro shows how when needed. The only persistence is the preferences file above.
