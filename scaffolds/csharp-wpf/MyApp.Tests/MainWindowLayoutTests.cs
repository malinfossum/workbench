using System.Globalization;
using System.Windows;
using MyApp.Models;
using MyApp.Services;
using MyApp.Tests.Layout;
using MyApp.ViewModels;

namespace MyApp.Tests;

/// <summary>
/// Lays MainWindow out in both locales at its own minimum and default sizes,
/// at 960 x 540 DIP (a 1080p screen at 200 % display scale) and at 1920 x 1080,
/// then checks every Align.Contract element. The only test that touches a View.
/// </summary>
[Collection(WpfGroup.Name)]
public class MainWindowLayoutTests(WpfThread wpf)
{
    public static TheoryData<string, string> Cells()
    {
        var data = new TheoryData<string, string>();
        foreach (var locale in new[] { "en-US", "nb-NO" })
        {
            foreach (var size in new[] { "minimum", "default", "960x540", "1920x1080" })
            {
                data.Add(locale, size);
            }
        }
        return data;
    }

    [Theory]
    [MemberData(nameof(Cells))]
    public void MainWindow_keeps_its_layout_contracts(string locale, string size)
    {
        var report = wpf.Invoke(() =>
        {
            var localizer = Localizer.FromEmbedded();
            var window = new MainWindow
            {
                DataContext = new MainViewModel(localizer, new LanguageViewModel(localizer, new MemoryPreferences(), locale)),
            };
            return LayoutAudit.Check(LayoutHost.Lay(window, SizeOf(window, size)));
        });

        Assert.True(report.Contracts > 0, "no Align.Contract element found: the audit checked nothing");
        Assert.Empty(report.Violations);
    }

    private static Size SizeOf(Window window, string size)
    {
        if (size == "minimum")
        {
            return new Size(window.MinWidth, window.MinHeight);
        }
        if (size == "default")
        {
            return new Size(window.Width, window.Height);
        }
        var parts = size.Split('x');
        return new Size(double.Parse(parts[0], CultureInfo.InvariantCulture), double.Parse(parts[1], CultureInfo.InvariantCulture));
    }

    private sealed class MemoryPreferences : IPreferencesService
    {
        public Preferences Load() => new();

        public void Save(Preferences preferences)
        {
        }
    }
}
