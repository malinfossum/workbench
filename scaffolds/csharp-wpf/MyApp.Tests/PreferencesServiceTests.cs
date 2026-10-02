using MyApp.Models;
using MyApp.Services;

namespace MyApp.Tests;

/// <summary>
/// The settings file round-trips the three keys, omits absent ones (absent =
/// System), and survives a missing or broken file.
/// </summary>
public class PreferencesServiceTests
{
    private sealed class MemoryFiles : IFileService
    {
        public Dictionary<string, string> Files { get; } = [];

        public string? ReadText(string path) => Files.GetValueOrDefault(path);

        public void WriteText(string path, string contents) => Files[path] = contents;
    }

    [Fact]
    public void Missing_file_loads_as_all_system()
    {
        var service = new PreferencesService(new MemoryFiles(), "settings.json");

        Assert.Equal(new Preferences(), service.Load());
    }

    [Fact]
    public void Broken_file_loads_as_all_system()
    {
        var files = new MemoryFiles { Files = { ["settings.json"] = "{ not json" } };
        var service = new PreferencesService(files, "settings.json");

        Assert.Equal(new Preferences(), service.Load());
    }

    [Fact]
    public void Save_writes_only_the_keys_that_hold_a_value()
    {
        var files = new MemoryFiles();
        var service = new PreferencesService(files, "settings.json");

        service.Save(new Preferences(Lang: "nb"));

        Assert.Contains("\"lang\": \"nb\"", files.Files["settings.json"]);
        Assert.DoesNotContain("theme", files.Files["settings.json"]);
        Assert.DoesNotContain("currency", files.Files["settings.json"]);
        Assert.Equal(new Preferences(Lang: "nb"), service.Load());
    }
}
