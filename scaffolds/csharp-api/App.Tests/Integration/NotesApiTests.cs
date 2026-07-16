using System.Net;
using System.Net.Http.Json;
using App.Core.Dtos;

namespace App.Tests.Integration;

public class NotesApiTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Post_then_get_round_trips()
    {
        var response = await _client.PostAsJsonAsync("/api/notes", new { title = "First", body = "hello" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<NoteDto>();
        Assert.NotNull(created);

        var fetched = await _client.GetFromJsonAsync<NoteDto>($"/api/notes/{created.Id}");
        Assert.NotNull(fetched);
        Assert.Equal("First", fetched.Title);
        Assert.Equal("hello", fetched.Body);
    }

    [Fact]
    public async Task Post_without_title_returns_problem_details_400()
    {
        var response = await _client.PostAsJsonAsync("/api/notes", new { body = "no title" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("application/problem+json", response.Content.Headers.ContentType?.ToString());
    }

    [Fact]
    public async Task Get_unknown_id_returns_404()
    {
        var response = await _client.GetAsync("/api/notes/9999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Put_updates_and_returns_the_note()
    {
        var created = await (await _client.PostAsJsonAsync("/api/notes", new { title = "Old", body = "" }))
            .Content.ReadFromJsonAsync<NoteDto>();
        var response = await _client.PutAsJsonAsync($"/api/notes/{created!.Id}", new { title = "New", body = "b" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<NoteDto>();
        Assert.Equal("New", updated!.Title);
    }

    [Fact]
    public async Task Delete_returns_204_then_get_returns_404()
    {
        var created = await (await _client.PostAsJsonAsync("/api/notes", new { title = "Doomed", body = "" }))
            .Content.ReadFromJsonAsync<NoteDto>();
        var del = await _client.DeleteAsync($"/api/notes/{created!.Id}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        var get = await _client.GetAsync($"/api/notes/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }
}
