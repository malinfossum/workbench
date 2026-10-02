using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MyApp.Services;

namespace MyApp.ViewModels;

/// <summary>
/// Every user-facing string goes through the Localizer, so the view model
/// holds keys, not text, and re-renders all of them on a language change.
/// [RelayCommand] generates ConfirmWiringCommand from ConfirmWiring().
/// Replace Status/ConfirmWiring with the project's real state and behavior;
/// this pair only proves the binding chain works.
/// </summary>
public partial class MainViewModel : ObservableObject
{
    private readonly Localizer _localizer;
    private string _statusKey = "status.ready";

    public MainViewModel(Localizer localizer, LanguageViewModel language)
    {
        _localizer = localizer;
        Language = language;
        localizer.LanguageChanged += (_, _) => OnPropertyChanged(string.Empty); // empty name = every property
    }

    public LanguageViewModel Language { get; }

    public string Title => _localizer.T("app.title");

    public string Status => _localizer.T(_statusKey);

    public string ConfirmLabel => _localizer.T("action.confirm");

    [RelayCommand]
    private void ConfirmWiring()
    {
        _statusKey = "status.confirmed";
        OnPropertyChanged(nameof(Status));
    }
}
