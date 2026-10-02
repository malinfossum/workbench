using System.Globalization;
using App.Api.Localization;

namespace App.Tests.Unit;

// The reader on its own, against fixture bundles in a temp folder: the per-key
// fallback rule, named placeholders, and the key-as-fallback.
public sealed class JsonStringLocalizerTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "app-locales-" + Guid.NewGuid().ToString("N"));
    private readonly JsonStringLocalizer _localizer;

    public JsonStringLocalizerTests()
    {
        Directory.CreateDirectory(_dir);
        File.WriteAllText(Path.Combine(_dir, "en.json"),
            """{ "greeting": "Hi {name}", "only.en": "English only", "items": "{count} items" }""");
        File.WriteAllText(Path.Combine(_dir, "nb.json"),
            """{ "greeting": "Hei {name}", "items": "{count} elementer" }""");
        File.WriteAllText(Path.Combine(_dir, "notes.txt"), "not a bundle");
        _localizer = JsonStringLocalizer.Load(_dir, fallback: "en");
    }

    public void Dispose() => Directory.Delete(_dir, recursive: true);

    [Fact]
    public void Languages_come_from_the_json_files_present()
    {
        Assert.Equal(["en", "nb"], _localizer.Languages.Order());
    }

    [Fact]
    public void Current_culture_bundle_wins()
    {
        Assert.Equal("Hei {name}", _localizer.Get("greeting", CultureInfo.GetCultureInfo("nb")).Value);
    }

    [Fact]
    public void Regional_culture_walks_up_to_its_parent()
    {
        Assert.Equal("Hei {name}", _localizer.Get("greeting", CultureInfo.GetCultureInfo("nb-NO")).Value);
    }

    [Fact]
    public void Missing_key_in_language_falls_back_to_english_per_key()
    {
        var text = _localizer.Get("only.en", CultureInfo.GetCultureInfo("nb"));

        Assert.Equal("English only", text.Value);
        Assert.False(text.ResourceNotFound);
    }

    [Fact]
    public void Missing_key_everywhere_returns_the_key()
    {
        var text = _localizer.Get("nope", CultureInfo.GetCultureInfo("nb"));

        Assert.Equal("nope", text.Value);
        Assert.True(text.ResourceNotFound);
    }

    [Fact]
    public void Indexer_reads_current_ui_culture()
    {
        CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("nb");

        Assert.Equal("Hei {name}", _localizer["greeting"].Value);
    }

    [Fact]
    public void Placeholders_fill_by_name_and_unknown_ones_stay()
    {
        CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("en");

        Assert.Equal("Hi Malin", _localizer["greeting", ("name", "Malin")].Value);
        Assert.Equal("Hi {name}", _localizer["greeting", ("other", "x")].Value);
        Assert.Equal("3 items", _localizer["items", ("count", 3)].Value);
    }

    [Fact]
    public void Missing_fallback_bundle_fails_at_startup()
    {
        Assert.Throws<InvalidOperationException>(() => JsonStringLocalizer.Load(_dir, fallback: "sv"));
    }
}
