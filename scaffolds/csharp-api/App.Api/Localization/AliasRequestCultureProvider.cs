using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace App.Api.Localization;

/// <summary>
/// Runs before the Accept-Language provider and maps tags that have no bundle of
/// their own onto one that does: "no" and "nn" become "nb". A tag that is supported
/// as-is (or whose region-less form is) returns null so the built-in provider does
/// its normal parent-culture match. The header is read, never logged, and never
/// used as anything but a lookup key into the supported list.
/// </summary>
public sealed class AliasRequestCultureProvider(
    IReadOnlyCollection<string> supported,
    IReadOnlyDictionary<string, string> aliases) : RequestCultureProvider
{
    private const int MaxEntriesToTry = 3; // same cap as the built-in provider

    private readonly HashSet<string> _supported = new(supported, StringComparer.OrdinalIgnoreCase);

    public override Task<ProviderCultureResult?> DetermineProviderCultureResult(HttpContext httpContext)
    {
        if (!StringWithQualityHeaderValue.TryParseList(httpContext.Request.Headers.AcceptLanguage, out var entries)
            || entries.Count == 0)
        {
            return NullProviderCultureResult;
        }

        var candidates = entries
            .Where(e => !StringSegment.IsNullOrEmpty(e.Value) && e.Value != "*")
            .OrderByDescending(e => e.Quality ?? 1)
            .Take(MaxEntriesToTry);

        foreach (var entry in candidates)
        {
            var baseTag = entry.Value.ToString().Split('-')[0].ToLowerInvariant();
            if (_supported.Contains(baseTag))
            {
                return NullProviderCultureResult; // the built-in provider handles this one
            }

            if (aliases.TryGetValue(baseTag, out var alias) && _supported.Contains(alias))
            {
                return Task.FromResult<ProviderCultureResult?>(new ProviderCultureResult(alias));
            }
        }

        return NullProviderCultureResult;
    }
}
