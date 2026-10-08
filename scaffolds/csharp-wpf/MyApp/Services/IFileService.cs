namespace MyApp.Services;

/// <summary>
/// Services are the only I/O boundary: file, network, and persistence
/// access lives behind interfaces here, handed to ViewModels from the
/// composition root. ViewModels never call File/HttpClient directly —
/// that keeps them unit-testable and keeps all I/O auditable in one
/// folder.
/// </summary>
public interface IFileService
{
    public string? ReadText(string path);

    public void WriteText(string path, string contents);
}
