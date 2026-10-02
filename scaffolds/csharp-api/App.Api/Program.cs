using System.Globalization;
using App.Api.Localization;
using App.Core.Interfaces;
using App.Core.Services;
using App.Data;
using App.Data.Repositories;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<INoteRepository, NoteRepository>();
builder.Services.AddScoped<NoteService>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddControllers();

// Localization (locale standard § 10): Locales/<tag>.json, same keys as the web bundles.
// Accept-Language is the only source; "no" and "nn" map to "nb"; the resolved culture
// is always one from the supported list, never the raw header.
var localizer = JsonStringLocalizer.Load(Path.Combine(builder.Environment.ContentRootPath, "Locales"));
builder.Services.AddSingleton(localizer);
builder.Services.AddSingleton<IStringLocalizer>(localizer);
builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    options.SetDefaultCulture("en")
        .AddSupportedCultures([.. localizer.Languages])
        .AddSupportedUICultures([.. localizer.Languages]);
    options.ApplyCurrentCultureToResponseHeaders = true; // Content-Language, the API's <html lang>
    options.RequestCultureProviders =
    [
        new AliasRequestCultureProvider(localizer.Languages, new Dictionary<string, string> { ["no"] = "nb", ["nn"] = "nb" }),
        new AcceptLanguageHeaderRequestCultureProvider(),
    ];
});

// ProblemDetails titles are the first localized strings. The request culture comes
// from the feature, not CurrentUICulture: the exception handler runs outside the
// localization middleware's async scope and would otherwise see the default.
builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
{
    var culture = context.HttpContext.Features.Get<IRequestCultureFeature>()?.RequestCulture.UICulture
        ?? CultureInfo.CurrentUICulture;
    var title = localizer.Get($"problem.{context.ProblemDetails.Status}", culture);
    if (!title.ResourceNotFound)
    {
        context.ProblemDetails.Title = title.Value;
    }
});
builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddPolicy("dev", policy =>
    policy.SetIsOriginAllowed(origin => Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.IsLoopback)
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();

app.UseExceptionHandler();
app.UseRequestLocalization();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();          // JSON spec at /openapi/v1.json — dev only
    app.UseCors("dev");        // any localhost origin — dev only (spec §4)
}
else
{
    // Dev runs plain http on the default profile (use the https profile to opt in);
    // real hosts always redirect.
    app.UseHttpsRedirection();
}
app.MapControllers();

app.Run();

// Top-level statements make Program internal; this line makes it visible to
// WebApplicationFactory<Program> in App.Tests (spec §6). Do not remove.
public partial class Program { }
