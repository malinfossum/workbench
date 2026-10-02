using MyApp.Models;
using MyApp.Services;
using MyApp.ViewModels;

namespace MyApp.Tests;

/// <summary>
/// Tests target ViewModels and Models only, never Views/XAML.
/// </summary>
public class MainViewModelTests
{
    private sealed class MemoryPreferences : IPreferencesService
    {
        public Preferences Load() => new();

        public void Save(Preferences preferences)
        {
        }
    }

    private static MainViewModel Make(out Localizer localizer)
    {
        localizer = Localizer.FromEmbedded();
        return new MainViewModel(localizer, new LanguageViewModel(localizer, new MemoryPreferences(), "en-US"));
    }

    [Fact]
    public void ConfirmWiring_updates_status()
    {
        var vm = Make(out _);

        vm.ConfirmWiringCommand.Execute(null);

        Assert.Contains("Command executed", vm.Status);
    }

    [Fact]
    public void Status_raises_change_notification()
    {
        var vm = Make(out _);
        var raised = new List<string?>();
        vm.PropertyChanged += (_, e) => raised.Add(e.PropertyName);

        vm.ConfirmWiringCommand.Execute(null);

        Assert.Contains(nameof(vm.Status), raised);
    }

    [Fact]
    public void Language_change_re_renders_every_string()
    {
        var vm = Make(out var localizer);
        var raised = new List<string?>();
        vm.PropertyChanged += (_, e) => raised.Add(e.PropertyName);
        var before = vm.Status;

        localizer.SetLanguage("nb");

        Assert.Contains(string.Empty, raised); // empty name = every property, WPF re-reads them all
        Assert.NotEqual(before, vm.Status);
    }
}
