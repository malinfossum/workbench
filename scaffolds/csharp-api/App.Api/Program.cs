using App.Core.Interfaces;
using App.Core.Services;
using App.Data;
using App.Data.Repositories;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<INoteRepository, NoteRepository>();
builder.Services.AddScoped<NoteService>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddPolicy("dev", policy =>
    policy.SetIsOriginAllowed(origin => new Uri(origin).IsLoopback)
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();

app.UseExceptionHandler();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();          // JSON spec at /openapi/v1.json — dev only
    app.UseCors("dev");        // any localhost origin — dev only (spec §4)
}
app.UseHttpsRedirection();
app.MapControllers();

app.Run();

// Top-level statements make Program internal; this line makes it visible to
// WebApplicationFactory<Program> in App.Tests (spec §6). Do not remove.
public partial class Program { }
