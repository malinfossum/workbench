namespace App.Tests.Auth;

public static class TestUsers
{
    // The last flag is how this session signed in: true for a passkey or a second step, false for a password alone.
    public static readonly UserContext Owner = new("u1", "t1", Role.Member, true, false, false);
    public static readonly UserContext Member = new("u2", "t1", Role.Member, true, false, false);
    public static readonly UserContext Stranger = new("u3", "t1", Role.Member, true, false, false); // no memberships at all
    public static readonly UserContext Admin = new("u4", "t1", Role.TenantAdmin, true, true, true);
    public static readonly UserContext AdminNoMfa = new("u4", "t1", Role.TenantAdmin, true, false, false); // the second-factor gate holds
    public static readonly UserContext Foreign = new("u5", "t2", Role.TenantAdmin, true, true, true);
    public static readonly UserContext Nobody = new("", "", Role.Member, false, false, false); // empty id and tenant must never match
    public static readonly UserContext[] All = [Owner, Member, Stranger, Admin, AdminNoMfa, Foreign, Nobody];
}

