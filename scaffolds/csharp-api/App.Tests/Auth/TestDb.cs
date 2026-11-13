namespace App.Tests.Auth;

public sealed class FixedTenant(string id) : ITenantProvider
{
    public string TenantId => id;
}

// Identity reads its schema version from the app's options. A context built without them maps version 1, which has
// no passkey table, and EF caches that model for every context of the type built the same way. So every context a
// test builds by hand comes from here.
public static class TestDb
{
    private static readonly IServiceProvider Identity = new ServiceCollection()
        .Configure<IdentityOptions>(o => o.Stores.SchemaVersion = IdentitySchemaVersions.Version3).BuildServiceProvider();

    public static AppDbContext Context(SqliteConnection connection, string tenant) =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).UseApplicationServiceProvider(Identity).Options, new FixedTenant(tenant));
}
