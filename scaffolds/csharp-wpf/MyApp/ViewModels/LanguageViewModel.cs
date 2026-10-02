using CommunityToolkit.Mvvm.ComponentModel;
using MyApp.Services;

namespace MyApp.ViewModels;

/// <summary>One row in the language picker. A null Tag is the System row.</summary>
public sealed record LanguageOption(string? Tag, string Label)
{
    // UI Automation names a list row by ToString(); without this a screen
    // reader announces the record's debug text instead of the label.
    public override string ToString() => Label;
}

/// <summary>
/// The language picker's state and the preference rule behind it (locale
/// standard § 5): stored key if valid, else the OS language; System is the
/// absence of the key; an invalid stored value is removed on first read.
/// Owns the choice, persists it, and tells the Localizer. The view only binds.
/// </summary>
public sealed class LanguageViewModel : ObservableObject
{
    private readonly Localizer _localizer;
    private readonly IPreferencesService _preferences;
    private readonly string _systemLanguage;
    private string? _storedLanguage;
    private IReadOnlyList<LanguageOption> _options = [];
    private LanguageOption? _selected;

    public LanguageViewModel(Localizer localizer, IPreferencesService preferences, string? systemLanguageTag)
    {
        _localizer = localizer;
        _preferences = preferences;
        _systemLanguage = localizer.Resolve(systemLanguageTag);

        var stored = preferences.Load();
        _storedLanguage = stored.Lang is { } tag && localizer.Languages.Contains(tag) ? tag : null;
        if (_storedLanguage is null && stored.Lang is not null)
        {
            preferences.Save(stored with { Lang = null }); // an old "no", a typo: gone on first read
        }

        localizer.SetLanguage(_storedLanguage ?? _systemLanguage);
        localizer.LanguageChanged += (_, _) => Refresh();
        Refresh();
    }

    /// <summary>The picker's accessible name, in the current language.</summary>
    public string Title => _localizer.T("picker.language");

    /// <summary>The resolved language tag, bound to the window's Language property.</summary>
    public string Current => _localizer.Language;

    /// <summary>System first, then every bundled language by autonym.</summary>
    public IReadOnlyList<LanguageOption> Options
    {
        get => _options;
        private set => SetProperty(ref _options, value);
    }

    public LanguageOption Selected
    {
        get => _selected!;
        set
        {
            // A ComboBox clears its selection while its items are replaced; ignore that.
            if (value is null || value.Tag == _storedLanguage)
            {
                return;
            }

            _storedLanguage = value.Tag;
            _preferences.Save(_preferences.Load() with { Lang = value.Tag });
            var target = value.Tag ?? _systemLanguage;
            if (target == _localizer.Language)
            {
                Refresh(); // same language, so no LanguageChanged: refresh the selection by hand
            }
            else
            {
                _localizer.SetLanguage(target); // LanguageChanged refreshes
            }
        }
    }

    private void Refresh()
    {
        Options =
        [
            new LanguageOption(null, _localizer.T("picker.system", ("value", _localizer.DisplayName(_systemLanguage)))),
            .. _localizer.Languages.Select(tag => new LanguageOption(tag, _localizer.DisplayName(tag))),
        ];
        _selected = Options.First(o => o.Tag == _storedLanguage);
        OnPropertyChanged(nameof(Selected)); // records compare by value, so always raise
        OnPropertyChanged(nameof(Title));
        OnPropertyChanged(nameof(Current));
    }
}
