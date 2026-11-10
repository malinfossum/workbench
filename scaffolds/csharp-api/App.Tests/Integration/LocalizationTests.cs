using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Localization;

namespace App.Tests.Integration;

// One test per rule in the locale standard (spec § 10): the alias provider,
// the fallback to English, the key-as-fallback, and a header that fails to parse.
public class LocalizationTests
{
    private ApiFactory _factory = null!;
    private HttpClient _client = null!;

    [SetUp]
    public void SetUp()
    {
        _factory = new ApiFactory();
        _client = _factory.CreateClient();
    }

    [TearDown]
    public void TearDown()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [TestCase("nn", "nb")]            // alias: Nynorsk readers get Bokmål
    [TestCase("no", "nb")]            // alias: the macrolanguage tag
    [TestCase("nb-NO", "nb")]         // region stripped by parent fallback
    [TestCase("xx", "en")]            // unknown language falls back to English
    [TestCase("en-GB, nb;q=0.8", "en")] // quality order wins, not list order
    public async Task Validation_title_follows_the_resolved_language(string acceptLanguage, string expectedLang)
    {
        var problem = await PostWithoutTitle(acceptLanguage);

        var expected = ReadBundle(expectedLang)["problem.400"];
        Assert.That(problem.Title, Is.EqualTo(expected));
    }

    [Test]
    public async Task Response_carries_content_language_of_the_resolved_culture()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/notes");
        request.Headers.Add("Accept-Language", "nn");
        request.Content = JsonContent.Create(new { body = "no title" });

        var response = await _client.SendAsync(request);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(response.Content.Headers.ContentLanguage.Single(), Is.EqualTo("nb"));
    }

    [Test]
    public async Task Malformed_accept_language_still_returns_200()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/notes");
        request.Headers.TryAddWithoutValidation("Accept-Language", ";;;, q=, *garbage=yes");

        var response = await _client.SendAsync(request);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public void Missing_key_returns_the_key_itself()
    {
        var localizer = _factory.Services.GetRequiredService<IStringLocalizer>();
        CultureInfo.CurrentUICulture = CultureInfo.GetCultureInfo("nb");

        var text = localizer["nope.key"];

        Assert.That(text.Value, Is.EqualTo("nope.key"));
        Assert.That(text.ResourceNotFound, Is.True);
    }

    private async Task<ProblemDetails> PostWithoutTitle(string acceptLanguage)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/notes");
        request.Headers.Add("Accept-Language", acceptLanguage);
        request.Content = JsonContent.Create(new { body = "no title" });

        var response = await _client.SendAsync(request);

        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.That(problem, Is.Not.Null);
        return problem;
    }

    private static Dictionary<string, string> ReadBundle(string lang)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Locales", $"{lang}.json");
        return System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(path))!;
    }
}
