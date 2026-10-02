using MyApp.Models;

namespace MyApp.Services;

/// <summary>
/// The settings file behind an interface, like every other I/O boundary.
/// </summary>
public interface IPreferencesService
{
    Preferences Load();

    void Save(Preferences preferences);
}
