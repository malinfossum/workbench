using MyApp.Models;

namespace MyApp.Services;

/// <summary>
/// The settings file behind an interface, like every other I/O boundary.
/// </summary>
public interface IPreferencesService
{
    public Preferences Load();

    public void Save(Preferences preferences);
}
