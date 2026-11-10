using System.Globalization;
using App.Api.Localization;
using App.Core.Services;
using App.Data.Repositories;
using Microsoft.AspNetCore.Localization;
using Microsoft.Extensions.Localization;

var builder = WebApplication.CreateBuilder(args);
var s = builder.Services;
var config = builder.Configuration;
var origin = config["Auth:Origin"] ?? throw new InvalidOperationException("Auth:Origin is not set");
var passkeyDomain = config["Auth:PasskeyDomain"] ?? throw new InvalidOperationException("Auth:PasskeyDomain is not set"); // null would mean "trust the Host header"

s.AddDbContext<AppDbContext>((sp, o) => o.UseSqlite(sp.GetRequiredService<IConfiguration>().GetConnectionString("Default") ?? "Data Source=app.db"));
s.AddHttpContextAccessor();
s.AddSingleton(TimeProvider.System);
s.AddScoped<CurrentUser>();
s.AddScoped<ICurrentUser>(sp => sp.GetRequiredService<CurrentUser>());
s.AddScoped<ITenantProvider, CurrentTenant>();
s.AddScoped<INoteRepository, NoteRepository>();
s.AddScoped<NoteService>();
s.AddScoped<AccountService>();
s.AddScoped<SessionService>();
s.AddScoped<AuthEventLog>();
s.AddSingleton<SignInThrottle>();
s.AddSingleton<AuthMailer>();
s.AddSingleton(new AuthLinks(origin));
s.AddSingleton<IAuthEmail, LogOnlyAuthEmail>();
s.AddSingleton<EfTicketStore>();
s.AddSingleton<SessionCleanup>();
s.AddHostedService(sp => sp.GetRequiredService<SessionCleanup>());
s.AddHttpClient<IBreachedPasswords, PwnedPasswordsRange>(c =>
{
    c.Timeout = TimeSpan.FromSeconds(3); // a slow range API must not hold sign-up
    c.DefaultRequestHeaders.Add("Add-Padding", "true");
});
// Keys survive a restart, so cookies and links do too. On a host without a persistent disk, use the host's key store.
s.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(config["Auth:KeysPath"] ?? "keys"));

s.AddIdentityCore<AppUser>(o =>
{
    o.Stores.SchemaVersion = IdentitySchemaVersions.Version3; // maps the passkey table
    o.Lockout.AllowedForNewUsers = false; // a lockout any stranger can trigger; the throttle slows guessing instead
    o.SignIn.RequireConfirmedEmail = true; // no sign-in before the address is proven (authn.md, Recovery and email)
    o.Tokens.EmailConfirmationTokenProvider = EmailConfirmationTokenProvider.ProviderName;
    o.Password.RequiredLength = 15; // NIST 800-63B minimum when the password is the only factor
    o.Password.RequireDigit = o.Password.RequireLowercase = o.Password.RequireUppercase = o.Password.RequireNonAlphanumeric = false;
    o.Password.RequiredUniqueChars = 1;
    o.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddUserStore<HashedRecoveryCodeStore>() // replaces the store AddEntityFrameworkStores registered
.AddSignInManager()
.AddDefaultTokenProviders()
.AddTokenProvider<EmailConfirmationTokenProvider>(EmailConfirmationTokenProvider.ProviderName)
.AddPasswordValidator<BreachedPasswordValidator>();

s.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();
s.ConfigureAll<CookieAuthenticationOptions>(o => // every Identity cookie, the two-factor one too
{
    o.Cookie.HttpOnly = true;
    o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    o.Cookie.SameSite = SameSiteMode.Strict; // Lax only when the project turns on SSO
});
s.AddOptions<CookieAuthenticationOptions>(IdentityConstants.ApplicationScheme).Configure<EfTicketStore>((o, store) =>
{
    o.SessionStore = store;
    o.ExpireTimeSpan = EfTicketStore.Idle;
    o.SlidingExpiration = true;
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
});

s.Configure<IdentityPasskeyOptions>(o =>
{
    o.ServerDomain = passkeyDomain;
    o.UserVerificationRequirement = "required";
    o.ResidentKeyRequirement = "required";
    o.ValidateOrigin = ctx => ValueTask.FromResult(!ctx.CrossOrigin && string.Equals(ctx.Origin, origin, StringComparison.Ordinal)); // exact, never a prefix
});

s.Configure<DataProtectionTokenProviderOptions>(o => o.TokenLifespan = TimeSpan.FromMinutes(15)); // reset links

// The real client IP comes from the proxies named here and nowhere else. Check per deploy that the limiter key equals the real client IP.
s.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    foreach (var cidr in config.GetSection("Auth:TrustedProxies").Get<string[]>() ?? []) o.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(cidr));
});

// One IPv6 client can hold a whole /64, so it counts as one address.
static string ClientKey(HttpContext http) => http.Connection.RemoteIpAddress switch
{
    null => "unknown",
    { IsIPv4MappedToIPv6: true } ip => ip.MapToIPv4().ToString(),
    { AddressFamily: AddressFamily.InterNetworkV6 } ip => new System.Net.IPNetwork(new IPAddress(ip.GetAddressBytes()[..8].Concat(new byte[8]).ToArray()), 64).ToString(),
    var ip => ip.ToString(),
};

s.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests; // the default is 503
    o.AddPolicy("auth", http => RateLimitPartition.GetSlidingWindowLimiter(ClientKey(http),
        _ => new SlidingWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1), SegmentsPerWindow = 6, QueueLimit = 0 }));
    o.OnRejected = async (ctx, ct) =>
    {
        var after = ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var wait) ? wait : TimeSpan.FromSeconds(10);
        ctx.HttpContext.Response.Headers.RetryAfter = Math.Max(1, (int)Math.Ceiling(after.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
        await ctx.HttpContext.Response.WriteAsJsonAsync(new { error = "auth.error.tooManyAttempts" }, ct);
    };
});

s.AddControllers();

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
s.AddAuthorization(o => o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
s.AddExceptionHandler<AuthExceptionHandler>();
s.AddOpenApi();
s.AddCors(options => options.AddPolicy("dev", policy =>
    policy.SetIsOriginAllowed(o => Uri.TryCreate(o, UriKind.Absolute, out var uri) && uri.IsLoopback)
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();
var hsts = !app.Environment.IsDevelopment();

app.UseForwardedHeaders(); // first: the limiter, the session rows and the logs need the real client IP
app.Use(async (ctx, next) =>
{
    ctx.Response.OnStarting(() => { SecurityHeaders.Apply(ctx.Response.Headers, hsts); return Task.CompletedTask; }); // survives the exception handler
    await next();
});
app.UseExceptionHandler();
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection(); // dev runs plain http on the default profile; real hosts always redirect
}
app.UseRequestLocalization();
app.UseMiddleware<CrossSiteGuard>(origin); // before the session lookup: a cross-site form never reaches it
app.UseStaticFiles();
app.UseRouting(); // before authentication: the ticket store reads the endpoint's StartsSession marker
if (app.Environment.IsDevelopment())
{
    app.UseCors("dev"); // any localhost origin, no credentials, Development only
}
app.UseAuthentication();
app.UseMiddleware<UserContextMiddleware>();
app.UseMiddleware<SecondFactorGate>();
app.UseRateLimiter();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous(); // JSON spec at /openapi/v1.json, dev only
}
AuthEndpoints.Map(app);
AppEndpoints.Map(app);
app.MapControllers();

app.Run();

// Top-level statements make Program internal; this line makes it visible to
// WebApplicationFactory<Program> in App.Tests. Do not remove.
public partial class Program { }
