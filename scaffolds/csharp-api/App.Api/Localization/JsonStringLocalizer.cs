using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Localization;

namespace App.Api.Localization;

/// <summary>
/// Reads the same flat JSON bundles the web i18n library uses (Locales/&lt;tag&gt;.json,
/// dotted keys, {name} placeholders) and serves them as an IStringLocalizer.
/// Loaded once at startup. Lookup: the request's culture, then its parents, then the
/// fallback bundle, then the key itself. Nothing from a request ever becomes a path:
/// the culture is whatever the localization middleware matched from the supported list.
/// </summary>
public sealed partial class JsonStringLocalizer : IStringLocalizer
{
    private readonly IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> _bundles;
    private readonly string _fallback;

    private JsonStringLocalizer(IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> bundles, string fallback)
    {
        _bundles = bundles;
        _fallback = fallback;
        Languages = [.. bundles.Keys];
    }

    /// <summary>Language tags with a bundle on disk, e.g. ["en", "nb"].</summary>
    public IReadOnlyList<string> Languages { get; }

    public static JsonStringLocalizer Load(string directory, string fallback = "en")
    {
        var bundles = new Dictionary<string, IReadOnlyDictionary<string, string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var file in Directory.EnumerateFiles(directory, "*.json"))
        {
            var tag = Path.GetFileNameWithoutExtension(file);
            if (!LanguageTag().IsMatch(tag))
            {
                continue; // not a bundle (a stray settings file, say); never a hard failure
            }

            var bundle = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(file))
                ?? throw new InvalidOperationException($"Locale bundle {file} is empty.");
            bundles[tag] = bundle;
        }

        if (!bundles.ContainsKey(fallback))
        {
            throw new InvalidOperationException($"Fallback language \"{fallback}\" has no bundle in {directory}.");
        }

        return new JsonStringLocalizer(bundles, fallback);
    }

    public LocalizedString this[string name] => Get(name, CultureInfo.CurrentUICulture);

    /// <summary>
    /// Arguments are (name, value) tuples filling {name} placeholders, the web
    /// library's convention, so one bundle serves both ends.
    /// </summary>
    public LocalizedString this[string name, params object[] arguments]
    {
        get
        {
            var text = Get(name, CultureInfo.CurrentUICulture);
            return new LocalizedString(name, Interpolate(text.Value, arguments), text.ResourceNotFound);
        }
    }

    /// <summary>
    /// Explicit culture, for places where CurrentUICulture may not be the request's
    /// (the exception handler runs outside the localization middleware's scope).
    /// </summary>
    public LocalizedString Get(string name, CultureInfo culture)
    {
        for (var c = culture; !c.Equals(CultureInfo.InvariantCulture); c = c.Parent)
        {
            if (_bundles.TryGetValue(c.Name, out var bundle) && bundle.TryGetValue(name, out var text))
            {
                return new LocalizedString(name, text);
            }
        }

        return _bundles[_fallback].TryGetValue(name, out var fallbackText)
            ? new LocalizedString(name, fallbackText)
            : new LocalizedString(name, name, resourceNotFound: true);
    }

    public IEnumerable<LocalizedString> GetAllStrings(bool includeParentCultures)
    {
        var culture = CultureInfo.CurrentUICulture;
        var keys = _bundles[_fallback].Keys.ToHashSet();
        if (_bundles.TryGetValue(culture.Name, out var own))
        {
            keys.UnionWith(own.Keys);
        }

        return keys.Select(key => Get(key, culture));
    }

    private static string Interpolate(string text, object[] arguments)
    {
        if (arguments.Length == 0)
        {
            return text;
        }

        var vars = new Dictionary<string, string>();
        foreach (var argument in arguments)
        {
            if (argument is not (string key, var value))
            {
                throw new ArgumentException("Pass (name, value) tuples: localizer[\"key\", (\"name\", value)].", nameof(arguments));
            }

            vars[key] = value?.ToString() ?? "";
        }

        return Placeholder().Replace(text, m => vars.TryGetValue(m.Groups[1].Value, out var v) ? v : m.Value);
    }

    [GeneratedRegex(@"^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$")]
    private static partial Regex LanguageTag();

    [GeneratedRegex(@"\{(\w+)\}")]
    private static partial Regex Placeholder();
}
