using System.Text.Json.Serialization;

namespace MyApp.Models;

/// <summary>
/// The three preference keys from the locale standard, same names as the web
/// apps' localStorage keys. Null means System: the key is absent from the file
/// and the OS value is used. The scaffold reads Lang; Theme and Currency are
/// reserved so a project that adds them does not invent new names.
/// </summary>
public sealed record Preferences(
    [property: JsonPropertyName("lang")] string? Lang = null,
    [property: JsonPropertyName("theme")] string? Theme = null,
    [property: JsonPropertyName("currency")] string? Currency = null);
