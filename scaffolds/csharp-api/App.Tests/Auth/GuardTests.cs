namespace App.Tests.Auth;

public class GuardTests
{
    // Paths are relative to the scaffold root (the folder holding App.slnx), with forward slashes.
    private static readonly (string Name, Regex Pattern, string[] AllowedIn)[] Rules =
    [
        ("role check", new Regex(@"IsInRole\(|\b[iI]sAdmin\b|\.Role\s*([!=]=|[<>]|switch\b)|\bcase\s+Role\.|\bis\s+(not\s+)?Role\.|\bRole:\s*(not\s+)?Role\.|Authorize\(Roles"), new[] { "App.Core/Authorization/" }),
        ("database access", new Regex(@"DbSet<|\b_?db\.(Notes|UserSessions|AuthEvents|Users|Set<)"), new[] { "App.Data/", "App.Api/Auth/" }),
        ("database context", new Regex(@"\bAppDbContext\b"), new[] { "App.Data/", "App.Api/Auth/", "App.Api/Program.cs" }), // whatever the variable is called
        ("bare IgnoreQueryFilters", new Regex(@"IgnoreQueryFilters\(\s*\)"), Array.Empty<string>()),
        ("named IgnoreQueryFilters", new Regex(@"IgnoreQueryFilters\(\s*[^\s)]"), new[] { "App.Data/Jobs/" }), // background jobs, as their system user
    ];

    // The endpoint files sit inside App.Api/Auth/ but stay out of the database, as the recipe's Http/ folder does.
    private static readonly string[] NeverAllowed = ["App.Api/Auth/Http/"];

    private static bool Allowed(string path, string[] allowedIn) =>
        allowedIn.Any(dir => path.StartsWith(dir, StringComparison.Ordinal))
        && !NeverAllowed.Any(dir => path.StartsWith(dir, StringComparison.Ordinal));

    public static List<string> FindViolations(IEnumerable<(string Path, string Text)> files) =>
        files.SelectMany(f => Rules
            .Where(r => r.Pattern.IsMatch(f.Text) && !Allowed(f.Path, r.AllowedIn))
            .Select(r => $"{f.Path}: {r.Name}")).ToList();

    // Per line, in App.Data/Repositories/: a line that touches the notes or their member rows applies the filter it was
    // passed, or adds or removes a row.
    private static readonly Regex NotesAccess = new(@"\.Notes\b|Set<Note(Member)?>"), ThroughFilter = new(@"\.Where\(filter\)|\.Add\(|\.Remove\(");

    public static List<string> FindUnfilteredLines(IEnumerable<(string Path, string Text)> files) =>
        files.Where(f => f.Path.StartsWith("App.Data/Repositories/", StringComparison.Ordinal))
            .SelectMany(f => f.Text.Split('\n').Select((line, i) => (f.Path, Line: line, No: i + 1)))
            .Where(x => NotesAccess.IsMatch(x.Line) && !ThroughFilter.IsMatch(x.Line))
            .Select(x => $"{x.Path}:{x.No}: notes without the filter").ToList();

    // Per line, in App.Core/Services/: a repository read (on any receiver) builds its filter from NotePolicy.Filter.
    private static readonly Regex RepositoryRead = new(@"\.(ListAsync|FindAsync)\("), FromPolicy = new(@"NotePolicy\.Filter\(");

    public static List<string> FindUnboundReads(IEnumerable<(string Path, string Text)> files) =>
        files.Where(f => f.Path.StartsWith("App.Core/Services/", StringComparison.Ordinal))
            .SelectMany(f => f.Text.Split('\n').Select((line, i) => (f.Path, Line: line, No: i + 1)))
            .Where(x => RepositoryRead.IsMatch(x.Line) && !FromPolicy.IsMatch(x.Line))
            .Select(x => $"{x.Path}:{x.No}: read without NotePolicy.Filter").ToList();

    private static readonly string[] Projects = ["App.Core", "App.Data", "App.Api"]; // never App.Tests: it holds the negative fixtures

    private static IEnumerable<(string, string)> SourceFiles() =>
        Projects.SelectMany(project =>
            Directory.EnumerateFiles(Path.Combine(Source.Root, project), "*.cs", SearchOption.AllDirectories)
                .Select(p => Path.GetRelativePath(Source.Root, p).Replace('\\', '/'))
                .Where(p => !p.Contains("/bin/") && !p.Contains("/obj/"))
                .Select(p => (p, File.ReadAllText(Path.Combine(Source.Root, p)))));

    [Test]
    public void Finds_no_role_check_or_database_access_outside_the_allowed_folders() =>
        Assert.That(FindViolations(SourceFiles()), Is.Empty);

    [Test]
    public void Turns_red_on_the_broken_fixture() =>
        Assert.That(FindViolations([("App.Api/Auth/Http/Endpoints.cs", "if (user.IsInRole(\"admin\")) db.Notes.IgnoreQueryFilters();")]), Has.Count.EqualTo(3));

    [TestCase("if (me.Role != Role.Member) return;")]
    [TestCase("if (me.Role is Role.TenantAdmin) return;")]
    [TestCase("if (me is { Role: Role.TenantAdmin }) return;")]
    [TestCase("var label = me.Role switch { Role.TenantAdmin => \"admin\", _ => \"member\" };")]
    [TestCase("case Role.TenantAdmin: return;")]
    [TestCase("if (me.Role >= Role.TenantAdmin) return;")]
    [TestCase("public sealed class Reports(AppDbContext context);")]
    [TestCase("var all = notes.IgnoreQueryFilters([\"Tenant\"]);")]
    public void Turns_red_on_each_shape_of_role_check_and_database_access(string line) =>
        Assert.That(FindViolations([("App.Api/Controllers/Reports.cs", line)]), Has.Count.EqualTo(1));

    [Test]
    public void Allows_a_named_IgnoreQueryFilters_in_a_job() =>
        Assert.That(FindViolations([("App.Data/Jobs/Digest.cs", "var all = db.Notes.IgnoreQueryFilters([\"Tenant\"]);")]), Is.Empty);

    [Test]
    public void Every_note_query_in_a_repository_applies_its_filter() =>
        Assert.That(FindUnfilteredLines(SourceFiles()), Is.Empty);

    [TestCase("var all = await db.Notes.ToListAsync();")]
    [TestCase("var all = await context.Notes.ToListAsync();")]
    [TestCase("var all = await _context.Set<Note>().ToListAsync();")]
    [TestCase("var all = await _context.Set<NoteMember>().ToListAsync();")]
    public void Turns_red_on_an_unfiltered_note_query(string line) =>
        Assert.That(FindUnfilteredLines([("App.Data/Repositories/Reports.cs", line)]), Has.Count.EqualTo(1));

    [Test]
    public void Every_service_read_builds_its_filter_from_the_policy() =>
        Assert.That(FindUnboundReads(SourceFiles()), Is.Empty);

    [TestCase("var all = await repository.ListAsync(n => true);")]
    [TestCase("return await repository.FindAsync(_ => true, id);")]
    [TestCase("var all = await _notes.ListAsync(n => true);")]
    public void Turns_red_on_a_service_read_without_the_policy(string line) =>
        Assert.That(FindUnboundReads([("App.Core/Services/Reports.cs", line)]), Has.Count.EqualTo(1));
}
