using MyApp.Services;

namespace MyApp.Tests;

/// <summary>
/// The reader against in-memory bundles: lookup, placeholders, plural
/// categories, the per-key fallback, resolution of system tags, and the
/// LanguageChanged event. One test reads the embedded bundles for real.
/// </summary>
public class LocalizerTests
{
    private static Localizer Make() => new(new Dictionary<string, IReadOnlyDictionary<string, string>>
    {
        ["en"] = new Dictionary<string, string>
        {
            ["greeting"] = "Hi {name}",
            ["only.en"] = "English only",
            ["items.one"] = "{count} item",
            ["items.other"] = "{count} items",
            ["days.other"] = "{count} days",
        },
        ["nb"] = new Dictionary<string, string>
        {
            ["greeting"] = "Hei {name}",
            ["items.other"] = "{count} elementer",
        },
    });

    [Fact]
    public void T_reads_the_current_language_and_fills_placeholders()
    {
        var localizer = Make();
        localizer.SetLanguage("nb");

        Assert.Equal("Hei Malin", localizer.T("greeting", ("name", "Malin")));
    }

    [Fact]
    public void T_leaves_unknown_placeholders_in_place()
    {
        Assert.Equal("Hi {name}", Make().T("greeting", ("other", 1)));
    }

    [Fact]
    public void T_falls_back_to_english_per_key_then_to_the_key()
    {
        var localizer = Make();
        localizer.SetLanguage("nb");

        Assert.Equal("English only", localizer.T("only.en"));
        Assert.Equal("nope.key", localizer.T("nope.key"));
    }

    [Theory]
    [InlineData(1, "1 item")]
    [InlineData(0, "0 items")]
    [InlineData(2, "2 items")]
    public void Plural_picks_one_or_other(int count, string expected)
    {
        Assert.Equal(expected, Make().Plural("items", count));
    }

    [Fact]
    public void Plural_falls_back_per_key_to_english_before_falling_back_to_other()
    {
        var localizer = Make();
        localizer.SetLanguage("nb");

        Assert.Equal("1 item", localizer.Plural("items", 1));   // nb has no items.one; en does (same rule as the web library)
        Assert.Equal("1 days", localizer.Plural("days", 1));    // nobody has days.one: .other it is
    }

    [Theory]
    [InlineData("nb-NO", "nb")]
    [InlineData("NN", "nb")]
    [InlineData("no", "nb")]
    [InlineData("en-GB", "en")]
    [InlineData("de-DE", "en")]
    [InlineData(null, "en")]
    public void Resolve_strips_region_applies_aliases_and_falls_back(string? tag, string expected)
    {
        Assert.Equal(expected, Make().Resolve(tag));
    }

    [Fact]
    public void Resolve_takes_candidates_in_priority_order()
    {
        Assert.Equal("nb", Make().Resolve(null, "xx", "nb-NO", "en"));
    }

    [Fact]
    public void SetLanguage_raises_once_and_rejects_unknown_tags()
    {
        var localizer = Make();
        var raised = 0;
        localizer.LanguageChanged += (_, _) => raised++;

        localizer.SetLanguage("nb");
        localizer.SetLanguage("nb");

        Assert.Equal(1, raised);
        Assert.Equal("nb", localizer.Language);
        Assert.Throws<ArgumentException>(() => localizer.SetLanguage("sv"));
    }

    [Fact]
    public void DisplayName_is_the_autonym_with_an_upper_case_first_letter()
    {
        var localizer = Make();

        Assert.Equal("Norsk bokmål", localizer.DisplayName("nb"));
        Assert.Equal("English", localizer.DisplayName("en"));
    }

    [Fact]
    public void Embedded_bundles_load_and_share_one_key_set()
    {
        var localizer = Localizer.FromEmbedded();

        Assert.Contains("en", localizer.Languages);
        Assert.Contains("nb", localizer.Languages);
        foreach (var language in localizer.Languages)
        {
            Assert.Equal(localizer.Keys("en"), localizer.Keys(language));
        }
    }
}
