using MyApp.Models;
using MyApp.Services;
using MyApp.ViewModels;

namespace MyApp.Tests;

/// <summary>
/// The preference model from the locale standard § 5: stored key if valid,
/// else the system value; System is the absence of the key; an invalid stored
/// value is removed on first read.
/// </summary>
public class LanguageViewModelTests
{
    private sealed class MemoryPreferences(Preferences initial) : IPreferencesService
    {
        public Preferences Current { get; private set; } = initial;
        public int Saves { get; private set; }

        public Preferences Load() => Current;

        public void Save(Preferences preferences)
        {
            Current = preferences;
            Saves++;
        }
    }

    private static Localizer Make() => new(new Dictionary<string, IReadOnlyDictionary<string, string>>
    {
        ["en"] = new Dictionary<string, string> { ["picker.language"] = "Language", ["picker.system"] = "System ({value})" },
        ["nb"] = new Dictionary<string, string> { ["picker.language"] = "Språk", ["picker.system"] = "System ({value})" },
    });

    [Fact]
    public void No_stored_key_means_system_resolved_from_the_os_tag()
    {
        var store = new MemoryPreferences(new Preferences());
        var vm = new LanguageViewModel(Make(), store, "nb-NO");

        Assert.Equal("nb", vm.Current);
        Assert.Null(vm.Selected.Tag);
        Assert.Equal("System (Norsk bokmål)", vm.Selected.Label);
        Assert.Equal(0, store.Saves);
    }

    [Fact]
    public void Valid_stored_key_wins_over_the_system_value()
    {
        var store = new MemoryPreferences(new Preferences(Lang: "en"));
        var vm = new LanguageViewModel(Make(), store, "nb-NO");

        Assert.Equal("en", vm.Current);
        Assert.Equal("en", vm.Selected.Tag);
    }

    [Fact]
    public void Invalid_stored_key_is_removed_on_first_read()
    {
        var store = new MemoryPreferences(new Preferences(Lang: "no", Theme: "dark"));
        var vm = new LanguageViewModel(Make(), store, "en-US");

        Assert.Equal("en", vm.Current);
        Assert.Null(store.Current.Lang);
        Assert.Equal("dark", store.Current.Theme); // only the bad key goes
        Assert.Equal(1, store.Saves);
    }

    [Fact]
    public void Choosing_a_language_stores_it_and_switches_the_localizer()
    {
        var localizer = Make();
        var store = new MemoryPreferences(new Preferences());
        var vm = new LanguageViewModel(localizer, store, "en-US");

        vm.Selected = vm.Options.Single(o => o.Tag == "nb");

        Assert.Equal("nb", store.Current.Lang);
        Assert.Equal("nb", localizer.Language);
        Assert.Equal("Språk", vm.Title);
        Assert.Equal("nb", vm.Selected.Tag);
    }

    [Fact]
    public void Choosing_system_clears_the_key_and_follows_the_os_again()
    {
        var localizer = Make();
        var store = new MemoryPreferences(new Preferences(Lang: "nb"));
        var vm = new LanguageViewModel(localizer, store, "en-US");

        vm.Selected = vm.Options.Single(o => o.Tag is null);

        Assert.Null(store.Current.Lang);
        Assert.Equal("en", localizer.Language);
        Assert.Null(vm.Selected.Tag);
    }

    [Fact]
    public void Options_list_system_first_then_every_language_by_autonym()
    {
        var vm = new LanguageViewModel(Make(), new MemoryPreferences(new Preferences()), "en-US");

        Assert.Null(vm.Options[0].Tag);
        Assert.Equal(["en", "nb"], vm.Options.Skip(1).Select(o => o.Tag).Order());
        Assert.Equal("Norsk bokmål", vm.Options.Single(o => o.Tag == "nb").Label);
    }

    [Fact]
    public void Language_change_raises_change_notification()
    {
        var localizer = Make();
        var vm = new LanguageViewModel(localizer, new MemoryPreferences(new Preferences()), "en-US");
        var raised = new List<string?>();
        vm.PropertyChanged += (_, e) => raised.Add(e.PropertyName);

        vm.Selected = vm.Options.Single(o => o.Tag == "nb");

        Assert.Contains(nameof(vm.Current), raised);
        Assert.Contains(nameof(vm.Title), raised);
    }
}
