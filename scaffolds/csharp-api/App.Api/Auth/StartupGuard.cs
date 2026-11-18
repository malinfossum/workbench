namespace App.Api.Auth;

// Two rules, checked once at startup (spec § 6.3). A real host never runs with a mailer that sends nothing, and a host that
// calls itself Development or Testing must be on localhost, so a mistaken deploy fails here instead of serving the check page.
public static class StartupGuard
{
    private static readonly Type[] DevMailers = [typeof(LogOnlyAuthEmail), typeof(DevFileAuthEmail)];

    public static void Check(IHostEnvironment env, IAuthEmail mailer, string origin)
    {
        var local = env.IsDevelopment() || env.IsEnvironment("Testing");
        if (!local && DevMailers.Contains(mailer.GetType()))
        {
            throw new InvalidOperationException($"No real email provider is registered for {env.EnvironmentName}. Register one as IAuthEmail (README, adoption checklist).");
        }
        if (local && !(Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.IsLoopback))
        {
            throw new InvalidOperationException($"{env.EnvironmentName} needs a localhost Auth:Origin. A deployed host must never run as {env.EnvironmentName}.");
        }
    }
}
