using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace App.Tests.Auth;

using static ClientExtensions;

public sealed class TestHostEnvironment(string name, string contentRoot) : IHostEnvironment
{
    public string EnvironmentName { get; set; } = name;
    public string ApplicationName { get; set; } = "App.Tests";
    public string ContentRootPath { get; set; } = contentRoot;
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}

public class DevTests
{
    private const string Origin = "https://app.example.test";
    private AuthApiFactory _app = null!;
    private readonly List<IDisposable> _owned = [];
    private string? _temp;

    [SetUp] public void SetUp() => _app = new AuthApiFactory();

    [TearDown]
    public void TearDown()
    {
        foreach (var d in _owned) d.Dispose();
        _owned.Clear();
        _app.Dispose();
        if (_temp is not null && Directory.Exists(_temp)) Directory.Delete(_temp, true);
    }

    // A factory for another environment, on the same database and with the same test mailer registered last.
    private WebApplicationFactory<Program> In(string env, Action<IServiceCollection>? services = null)
    {
        var factory = _app.WithWebHostBuilder(b =>
        {
            b.UseEnvironment(env);
            if (services is not null) b.ConfigureServices(services);
        });
        _owned.Add(factory);
        return factory;
    }

    private HttpClient ClientIn(WebApplicationFactory<Program> factory)
    {
        var c = AuthApiFactory.ClientOf(factory);
        _owned.Add(c);
        return c;
    }

    private static DevFileAuthEmail FileMailer(IHostEnvironment env) => new(env, TimeProvider.System, NullLogger<DevFileAuthEmail>.Instance);

    [TestCase("Development", typeof(DevFileAuthEmail))]
    [TestCase("Testing", typeof(LogOnlyAuthEmail))]
    [TestCase("Staging", typeof(LogOnlyAuthEmail))]
    [TestCase("Production", typeof(LogOnlyAuthEmail))]
    public void The_file_mailer_is_only_registered_in_Development(string env, Type expected) =>
        Assert.That(AuthMailers.For(new TestHostEnvironment(env, ".")), Is.EqualTo(expected));

    [TestCase("Development", true)]
    [TestCase("Testing", false)]
    [TestCase("Production", false)]
    public void The_app_registers_the_file_mailer_only_in_Development(string env, bool expected)
    {
        var factory = In(env);
        Assert.That(factory.Services.GetServices<IAuthEmail>().Any(m => m is DevFileAuthEmail), Is.EqualTo(expected));
    }

    [Test]
    public async Task The_file_mailer_writes_one_file_per_email_named_by_time_and_kind()
    {
        _temp = Path.Combine(Path.GetTempPath(), $"devmail{Guid.NewGuid():N}");
        Directory.CreateDirectory(_temp);
        var logs = new CapturingLoggerProvider();
        using var loggers = LoggerFactory.Create(b => b.AddProvider(logs));
        var mailer = new DevFileAuthEmail(new TestHostEnvironment("Development", _temp), TimeProvider.System, loggers.CreateLogger<DevFileAuthEmail>());
        const string address = "someone@example.test";
        const string link = "https://localhost/confirm-email#uid=u1&token=secrettoken";

        await mailer.SendAsync(address, "confirm", link);
        await mailer.SendAsync(address, "confirm", link);

        var files = Directory.GetFiles(Path.Combine(_temp, ".dev-mail"));
        Assert.That(files, Has.Length.EqualTo(2));
        foreach (var file in files)
        {
            var name = Path.GetFileName(file);
            Assert.That(name, Does.Not.Contain("@").And.Not.Contain(address));
            Assert.That(name, Does.Match(@"-confirm-[0-9a-f]{6}\.txt$"));
            var text = await File.ReadAllTextAsync(file);
            Assert.That(text, Does.Contain(address).And.Contain(link));
        }
        Assert.That(logs.Lines, Is.Not.Empty);
        foreach (var line in logs.Lines)
        {
            Assert.That(line, Does.Contain("confirm").And.Not.Contain(address).And.Not.Contain("secrettoken"));
        }
    }

    [TestCase("Production", typeof(LogOnlyAuthEmail), Origin)]
    [TestCase("Production", typeof(DevFileAuthEmail), Origin)]
    [TestCase("Staging", typeof(LogOnlyAuthEmail), Origin)]
    [TestCase("Development", typeof(RecordingAuthEmail), Origin)]
    [TestCase("Testing", typeof(RecordingAuthEmail), "https://staging.example.test")]
    public void The_startup_guard_refuses(string env, Type mailer, string origin)
    {
        var host = new TestHostEnvironment(env, ".");
        IAuthEmail instance = mailer == typeof(LogOnlyAuthEmail) ? new LogOnlyAuthEmail(NullLogger<LogOnlyAuthEmail>.Instance)
            : mailer == typeof(DevFileAuthEmail) ? FileMailer(host)
            : new RecordingAuthEmail();
        Assert.Throws<InvalidOperationException>(() => StartupGuard.Check(host, instance, origin));
    }

    [TestCase("Production", Origin)]
    [TestCase("Development", "http://localhost:5005")]
    [TestCase("Testing", "https://localhost")]
    public void The_startup_guard_allows(string env, string origin)
    {
        var host = new TestHostEnvironment(env, ".");
        IAuthEmail mailer = env == "Production" ? new RecordingAuthEmail() : new LogOnlyAuthEmail(NullLogger<LogOnlyAuthEmail>.Instance);
        Assert.DoesNotThrow(() => StartupGuard.Check(host, mailer, origin));
    }

    [Test]
    public void Production_with_a_dev_mailer_does_not_start()
    {
        var factory = In("Production", s => s.AddSingleton<IAuthEmail, LogOnlyAuthEmail>());
        var thrown = Assert.Catch(() => _ = factory.Services);
        var messages = new List<string>();
        for (var e = thrown; e is not null; e = e.InnerException) messages.Add(e.Message);
        Assert.That(string.Join(" | ", messages), Does.Contain("email provider"));
    }

    [TestCase("Testing")]
    [TestCase("Production")]
    public async Task The_check_page_is_not_served_outside_Development(string env)
    {
        var factory = env == "Testing" ? _app : In(env);
        await _app.SeedUser("check@example.test");
        var anonymous = ClientIn(factory);
        var signedIn = ClientIn(factory);
        Assert.That(SetsSessionCookie(await signedIn.SignIn("check@example.test", AuthApiFactory.TestPhrase)), Is.True);

        foreach (var path in new[] { "/dev/auth-check/", "/dev/auth-check/auth-check.js" })
        {
            var denied = await anonymous.GetAsync(path);
            Assert.That(denied.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized), path);
            var missing = await signedIn.GetAsync(path);
            Assert.That(missing.StatusCode, Is.EqualTo(HttpStatusCode.NotFound), path);
            foreach (var body in new[] { await denied.Content.ReadAsStringAsync(), await missing.Content.ReadAsStringAsync() })
            {
                Assert.That(body, Does.Not.Contain("Auth check").And.Not.Contain("addPasskey"), path);
            }
        }
    }

    [Test]
    public async Task The_check_page_is_served_in_Development()
    {
        var c = ClientIn(In("Development"));
        var page = await c.GetAsync("/dev/auth-check/");
        var script = await c.GetAsync("/dev/auth-check/auth-check.js");
        Assert.That(page.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(script.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(await page.Content.ReadAsStringAsync(), Does.Contain("<title>Auth check</title>"));
        Assert.That(page.Headers.GetValues("Content-Security-Policy").Single(), Is.EqualTo(SecurityHeaders.Csp));
    }

    [Test]
    public async Task Development_sends_no_HSTS_and_Testing_does()
    {
        var dev = await ClientIn(In("Development")).GetAsync("/health");
        var testing = await ClientIn(_app).GetAsync("/health");
        Assert.That(dev.Headers.Contains("Strict-Transport-Security"), Is.False);
        Assert.That(testing.Headers.GetValues("Strict-Transport-Security").Single(), Does.StartWith("max-age="));
    }
}
