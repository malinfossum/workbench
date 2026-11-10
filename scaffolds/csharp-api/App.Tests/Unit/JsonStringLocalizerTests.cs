using System.Globalization;
using App.Api.Localization;

namespace App.Tests.Unit;

// The reader on its own, against fixture bundles in a temp folder: the per-key
// fallback rule, named placeholders, and the key-as-fallback.
public sealed class JsonStringLocalizerTests
{
    private string _dir = null!;
    private JsonStringLocalizer _localizer = null!;

    [SetUp]
    public void SetUp()
    {
        _dir = Path.Combine(Path.GetTempPath(), "app-locales-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_dir);
        File.WriteAllText(Path.Combine(_dir, "en.json"),
            """{ "greeting": "Hi {name}", "only.en": "English only", "items": "{count} items" }""");
        File.WriteAllText(Path.Combine(_dir, "nb.json"),
            """{ "greeting": "Hei {name}", "items": "{count} elementer" }""");
        File.WriteAllText(Path.Combine(_dir, "notes.txt"), "not a bundle");
        _localizer = JsonStringLocalizer.Load(_dir, fallback: "en");
    }

    [TearDown]
    public void TearDown() => Directory.Delete(_dir, recursive: true);

    [Test]
    public void Languages_come_from_the_json_files_present()
    {
        string[] expected = ["en", "nb"];
        Assert.That(_localizer.Languages.Order(), Is.EqualTo(expected));
    }

    [Test]
    public void Current_culture_bundle_wins()
    {
        Assert.That(_localizer.Get("greeting", CultureInfo.GetCultureInfo("nb")).Value, Is.EqualTo("Hei {name}"));
    }

    [Test]
    public void Regional_culture_walks_up_to_its_parent()
    {
        Assert.That(_localizer.Get("greeting", CultureInfo.GetCultureInfo("nb-NO")).Value, Is.EqualTo("Hei {name}"));
    }

    [Test]
    public void Missing_key_in_language_falls_back_to_english_per_key()
    {
        var text = _localizer.Get("only.en", CultureInfo.GetCultureInfo("nb"));

        Assert.That(text.Value, Is.EqualTo("English only"));
        Assert.That(text.ResourceNotFound, Is.False);
    }

    [Test]
    public void Missing_key_everywhere_returns_the_key()
    {
        var text = _localizer.Get("nope", CultureInfo.GetCultureInfo("nb"));

        Assert.That(text.Value, Is.EqualTo("nope"));
        Assert.That(text.ResourceNotFound, Is.True);
    }

    [Test]
    public void Indexer_reads_current_ui_culture()
    {
        CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("nb");

        Assert.That(_localizer["greeting"].Value, Is.EqualTo("Hei {name}"));
    }

    [Test]
    public void Placeholders_fill_by_name_and_unknown_ones_stay()
    {
        CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("en");

        Assert.That(_localizer["greeting", ("name", "Malin")].Value, Is.EqualTo("Hi Malin"));
        Assert.That(_localizer["greeting", ("other", "x")].Value, Is.EqualTo("Hi {name}"));
        Assert.That(_localizer["items", ("count", 3)].Value, Is.EqualTo("3 items"));
    }

    [Test]
    public void Missing_fallback_bundle_fails_at_startup()
    {
        Assert.Throws<InvalidOperationException>(() => JsonStringLocalizer.Load(_dir, fallback: "sv"));
    }
}
