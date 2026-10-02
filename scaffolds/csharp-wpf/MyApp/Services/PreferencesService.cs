using System.Text.Json;
using System.Text.Json.Serialization;
using MyApp.Models;

namespace MyApp.Services;

/// <summary>
/// One JSON file (settings.json under LocalApplicationData) holding the user's
/// chosen preferences. A missing or broken file reads as "all System"; the next
/// save overwrites it. Nothing is written until the user picks something.
/// </summary>
public sealed class PreferencesService(IFileService files, string path) : IPreferencesService
{
    private static readonly JsonSerializerOptions Options = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull, // absent key = System
    };

    public Preferences Load()
    {
        var json = files.ReadText(path);
        if (json is null)
        {
            return new Preferences();
        }

        try
        {
            return JsonSerializer.Deserialize<Preferences>(json, Options) ?? new Preferences();
        }
        catch (JsonException)
        {
            return new Preferences();
        }
    }

    public void Save(Preferences preferences) =>
        files.WriteText(path, JsonSerializer.Serialize(preferences, Options));
}
