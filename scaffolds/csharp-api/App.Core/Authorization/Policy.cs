using System.Linq.Expressions;
using App.Core.Models;

namespace App.Core.Authorization;

public enum Role { Member, TenantAdmin }

// Loaded from the database on every request, never from cookie claims. SecondFactorUsed comes from the
// session row: this sign-in used a passkey, or a password plus TOTP or a recovery code.
public sealed record UserContext(string Id, string TenantId, Role Role, bool EmailVerified, bool TwoFactorEnabled, bool SecondFactorUsed);

public static class MfaPolicy
{
    // Above a plain member, the session itself must have used a second factor. A passkey on the account is not enough.
    public static bool NeedsSecondFactor(UserContext u) => u.Role != Role.Member && !u.SecondFactorUsed;
}

public static class NoteActions
{
    public const string Read = "read", Create = "create", Update = "update", Delete = "delete", Archive = "archive", Share = "share";
    public static readonly string[] All = [Read, Create, Update, Delete, Archive, Share];
}

public sealed class NotFoundException() : Exception("Not found");
public sealed class ForbiddenException(string? field) : Exception(field is null ? "Not allowed" : $"Not allowed to change {field}")
{
    public string? Field { get; } = field;
}
public sealed class UnknownFieldException(string field) : Exception($"Unknown field {field}")
{
    public string Field { get; } = field;
}
public sealed class InvalidFieldException(string field) : Exception($"Invalid value for {field}")
{
    public string Field { get; } = field;
}

public sealed record NoteCan(bool Edit, bool Delete);

public static class NotePolicy
{
    // Each rule is written once and runs both in C# and in SQL. Compare ids, enums, bools and dates only:
    // SQL Server collations ignore case and C# does not. PolicyBinder denies an empty id or tenant, and a
    // missing second factor, before any rule runs, so the rules don't repeat those checks.
    private static readonly Expression<Func<UserContext, Note, bool>> ReadRule = (u, b) =>
        b.TenantId == u.TenantId && (b.OwnerId == u.Id || b.Members.Any(m => m.UserId == u.Id) || u.Role == Role.TenantAdmin);
    private static readonly Expression<Func<UserContext, Note, bool>> CreateRule = (u, b) =>
        u.EmailVerified && b.TenantId == u.TenantId && b.OwnerId == u.Id;
    private static readonly Expression<Func<UserContext, Note, bool>> UpdateRule = (u, b) =>
        b.TenantId == u.TenantId && (b.OwnerId == u.Id || b.Members.Any(m => m.UserId == u.Id));
    private static readonly Expression<Func<UserContext, Note, bool>> DeleteRule = (u, b) =>
        b.TenantId == u.TenantId && (b.OwnerId == u.Id || u.Role == Role.TenantAdmin);
    private static readonly Expression<Func<UserContext, Note, bool>> OwnerOnlyRule = (u, b) =>
        b.TenantId == u.TenantId && b.OwnerId == u.Id;

    public static readonly IReadOnlyDictionary<string, Expression<Func<UserContext, Note, bool>>> Rules =
        new Dictionary<string, Expression<Func<UserContext, Note, bool>>>
        {
            [NoteActions.Read] = ReadRule,
            [NoteActions.Create] = CreateRule,
            [NoteActions.Update] = UpdateRule,
            [NoteActions.Delete] = DeleteRule,
            [NoteActions.Archive] = OwnerOnlyRule,
            [NoteActions.Share] = OwnerOnlyRule,
        };

    // Compiled once at startup for single checks on a loaded note.
    private static readonly Dictionary<string, Func<UserContext, Note, bool>> Compiled = Rules.ToDictionary(r => r.Key, r => r.Value.Compile());

    public static bool Can(UserContext? u, string action, Note b) =>
        u is not null && PolicyBinder.Admits(u) && Compiled.TryGetValue(action, out var rule) && rule(u, b);

    public static Expression<Func<Note, bool>> Filter(string action, UserContext u) => PolicyBinder.Bind(Rules[action], u);

    private static readonly HashSet<string> AllFields = ["title", "body", "archived"], TextFields = ["title", "body"], NoFields = [];

    // `archived` follows the Archive rule, so the field rule and the action rule can't drift apart.
    public static IReadOnlySet<string> UpdatableFields(UserContext u, Note b) =>
        !Can(u, NoteActions.Update, b) ? NoFields : Can(u, NoteActions.Archive, b) ? AllFields : TextFields;

    public static NoteCan Flags(UserContext u, Note b) => new(Can(u, NoteActions.Update, b), Can(u, NoteActions.Delete, b));
}

public static class PolicyBinder
{
    // The structural guard every rule gets: an empty id or tenant, or a missing second factor above a
    // member, matches nothing. A new rule can't forget it.
    public static bool Admits(UserContext u) =>
        !string.IsNullOrEmpty(u.Id) && !string.IsNullOrEmpty(u.TenantId) && !MfaPolicy.NeedsSecondFactor(u);

    // Turns (user, T) => bool into T => bool for EF. The user goes in as a member access on a captured
    // object, so EF sends its values as parameters, not as literals baked into the SQL.
    public static Expression<Func<T, bool>> Bind<T>(Expression<Func<UserContext, T, bool>> rule, UserContext user)
    {
        if (!Admits(user)) return _ => false;
        var holder = Expression.Property(Expression.Constant(new Holder(user)), nameof(Holder.User));
        var body = new Swap(rule.Parameters[0], holder).Visit(rule.Body);
        return Expression.Lambda<Func<T, bool>>(body, rule.Parameters[1]);
    }

    private sealed record Holder(UserContext User);

    private sealed class Swap(ParameterExpression from, Expression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) => node == from ? to : base.VisitParameter(node);
    }
}
