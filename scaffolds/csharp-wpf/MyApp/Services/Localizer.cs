using System.Globalization;
using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace MyApp.Services;

/// <summary>
/// Reads the same flat JSON bundles the web i18n library uses (Locales/&lt;tag&gt;.json,
/// dotted keys, {name} placeholders, .one/.other plurals) from embedded resources.
/// Lookup: the current language, then the fallback bundle, then the key itself.
/// The Localizer owns the current language; the composition root mirrors it to
/// CultureInfo and the window's Language property on LanguageChanged.
/// </summary>
public sealed partial class Localizer
{
    private static readonly IReadOnlyDictionary<string, string> DefaultAliases =
        new Dictionary<string, string> { ["no"] = "nb", ["nn"] = "nb" };

    private readonly IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> _bundles;
    private readonly IReadOnlyDictionary<string, string> _aliases;

    public Localizer(
        IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> bundles,
        string fallback = "en",
        IReadOnlyDictionary<string, string>? aliases = null)
    {
        if (!bundles.ContainsKey(fallback))
        {
            throw new ArgumentException($"Fallback language \"{fallback}\" has no bundle.", nameof(bundles));
        }

        _bundles = bundles;
        _aliases = aliases ?? DefaultAliases;
        Fallback = fallback;
        Language = fallback;
        Languages = [.. bundles.Keys];
    }

    /// <summary>Language tags with a bundle, e.g. ["en", "nb"].</summary>
    public IReadOnlyList<string> Languages { get; }

    public string Fallback { get; }

    /// <summary>The current language tag. Change it with SetLanguage.</summary>
    public string Language { get; private set; }

    public CultureInfo Culture => CultureInfo.GetCultureInfo(Language);

    /// <summary>Raised after Language changes; view models re-raise PropertyChanged on it.</summary>
    public event EventHandler? LanguageChanged;

    /// <summary>Loads every Locales/*.json embedded in the app assembly.</summary>
    public static Localizer FromEmbedded(string fallback = "en")
    {
        var assembly = typeof(Localizer).Assembly;
        var bundles = new Dictionary<string, IReadOnlyDictionary<string, string>>();
        foreach (var name in assembly.GetManifestResourceNames())
        {
            if (!name.StartsWith("Locales/", StringComparison.Ordinal) || !name.EndsWith(".json", StringComparison.Ordinal))
            {
                continue;
            }

            using var stream = assembly.GetManifestResourceStream(name)!;
            var bundle = JsonSerializer.Deserialize<Dictionary<string, string>>(stream)
                ?? throw new InvalidOperationException($"Locale bundle {name} is empty.");
            bundles[name["Locales/".Length..^".json".Length]] = bundle;
        }

        return new Localizer(bundles, fallback);
    }

    public void SetLanguage(string tag)
    {
        if (!Languages.Contains(tag))
        {
            throw new ArgumentException($"No bundle for \"{tag}\".", nameof(tag));
        }

        if (tag == Language)
        {
            return;
        }

        Language = tag;
        LanguageChanged?.Invoke(this, EventArgs.Empty);
    }

    /// <summary>
    /// Maps whatever the system offers ("nb-NO", "NN", null) to a bundled language,
    /// or the fallback. Candidates in priority order: the stored choice first, then
    /// the OS language. The region is stripped; an alias applies only when the plain
    /// tag has no bundle of its own.
    /// </summary>
    public string Resolve(params string?[] candidates)
    {
        foreach (var candidate in candidates)
        {
            if (string.IsNullOrWhiteSpace(candidate))
            {
                continue;
            }

            var plain = candidate.Split('-')[0].ToLowerInvariant();
            if (Languages.Contains(plain))
            {
                return plain;
            }

            if (_aliases.TryGetValue(plain, out var alias) && Languages.Contains(alias))
            {
                return alias;
            }
        }

        return Fallback;
    }

    /// <summary>"Norsk bokmål", "English": the autonym from the OS, first letter upper-cased.</summary>
    public string DisplayName(string tag)
    {
        var culture = CultureInfo.GetCultureInfo(tag);
        var name = culture.NativeName;
        return culture.TextInfo.ToUpper(name[0]) + name[1..];
    }

    /// <summary>Missing keys come back as the key itself: visible in the UI, easy to grep.</summary>
    public string T(string key, params (string Name, object Value)[] vars)
    {
        var text = Lookup(key) ?? key;
        return vars.Length == 0 ? text : Placeholder().Replace(text, match =>
        {
            foreach (var (name, value) in vars)
            {
                if (name == match.Groups[1].Value)
                {
                    return value?.ToString() ?? "";
                }
            }

            return match.Value;
        });
    }

    /// <summary>
    /// "&lt;key&gt;.one" for exactly one, "&lt;key&gt;.other" otherwise, falling back to
    /// .other when a bundle has no .one form. The count is always available as {count}.
    /// </summary>
    public string Plural(string key, int count, params (string Name, object Value)[] vars)
    {
        // deferred: one/other only, .NET has no CLDR plural rules: add few/many when a shipped language needs them
        var category = Math.Abs(count) == 1 ? "one" : "other";
        var chosen = Lookup($"{key}.{category}") is not null ? $"{key}.{category}" : $"{key}.other";
        return T(chosen, [("count", count), .. vars]);
    }

    /// <summary>Sorted keys of one bundle, for the key-drift test.</summary>
    public IReadOnlyList<string> Keys(string tag) => [.. _bundles[tag].Keys.Order()];

    private string? Lookup(string key) =>
        _bundles[Language].TryGetValue(key, out var text) ? text
        : _bundles[Fallback].TryGetValue(key, out var fallbackText) ? fallbackText
        : null;

    [GeneratedRegex(@"\{(\w+)\}")]
    private static partial Regex Placeholder();
}
