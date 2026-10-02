using System.Globalization;
using System.IO;
using System.Windows;
using MyApp.Services;
using MyApp.ViewModels;

namespace MyApp;

/// <summary>
/// Composition root. Services are constructed here and handed to
/// ViewModels; ViewModels never do I/O themselves (see Services/).
/// </summary>
public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var localizer = Localizer.FromEmbedded();
        var settingsPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MyApp", "settings.json");
        var preferences = new PreferencesService(new FileService(), settingsPath);
        var language = new LanguageViewModel(localizer, preferences, CultureInfo.CurrentUICulture.Name);

        // The Localizer owns the language; CultureInfo follows it so anything that
        // formats by culture agrees with the strings. The window's Language property
        // follows it through a binding, which is what switches Narrator's voice.
        ApplyUiCulture(localizer.Culture);
        localizer.LanguageChanged += (_, _) => ApplyUiCulture(localizer.Culture);

        new MainWindow { DataContext = new MainViewModel(localizer, language) }.Show();
    }

    private static void ApplyUiCulture(CultureInfo culture)
    {
        CultureInfo.CurrentUICulture = culture;
        CultureInfo.DefaultThreadCurrentUICulture = culture;
    }
}
