using System.Net;
using System.Net.Http.Json;
using App.Core.Dtos;

namespace App.Tests.Integration;

public class NotesApiTests
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

    [Test]
    public async Task Post_then_get_round_trips()
    {
        var response = await _client.PostAsJsonAsync("/api/notes", new { title = "First", body = "hello" });
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Created));
        var created = await response.Content.ReadFromJsonAsync<NoteDto>();
        Assert.That(created, Is.Not.Null);

        var fetched = await _client.GetFromJsonAsync<NoteDto>($"/api/notes/{created.Id}");
        Assert.That(fetched, Is.Not.Null);
        Assert.That(fetched.Title, Is.EqualTo("First"));
        Assert.That(fetched.Body, Is.EqualTo("hello"));
    }

    [Test]
    public async Task Post_without_title_returns_problem_details_400()
    {
        var response = await _client.PostAsJsonAsync("/api/notes", new { body = "no title" });
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That(response.Content.Headers.ContentType?.ToString(), Does.Contain("application/problem+json"));
    }

    [Test]
    public async Task Get_unknown_id_returns_404()
    {
        var response = await _client.GetAsync("/api/notes/9999");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [Test]
    public async Task Put_updates_and_returns_the_note()
    {
        var created = await (await _client.PostAsJsonAsync("/api/notes", new { title = "Old", body = "" }))
            .Content.ReadFromJsonAsync<NoteDto>();
        var response = await _client.PutAsJsonAsync($"/api/notes/{created!.Id}", new { title = "New", body = "b" });
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        var updated = await response.Content.ReadFromJsonAsync<NoteDto>();
        Assert.That(updated!.Title, Is.EqualTo("New"));

        var persisted = await _client.GetFromJsonAsync<NoteDto>($"/api/notes/{created.Id}");
        Assert.That(persisted!.Title, Is.EqualTo("New"));
    }

    [Test]
    public async Task Delete_returns_204_then_get_returns_404()
    {
        var created = await (await _client.PostAsJsonAsync("/api/notes", new { title = "Doomed", body = "" }))
            .Content.ReadFromJsonAsync<NoteDto>();
        var del = await _client.DeleteAsync($"/api/notes/{created!.Id}");
        Assert.That(del.StatusCode, Is.EqualTo(HttpStatusCode.NoContent));
        var get = await _client.GetAsync($"/api/notes/{created.Id}");
        Assert.That(get.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }
}
