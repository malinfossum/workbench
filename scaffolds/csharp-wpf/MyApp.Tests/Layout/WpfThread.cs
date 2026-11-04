using System.Windows.Threading;

namespace MyApp.Tests.Layout;

/// <summary>
/// One STA thread with a running dispatcher and the app's resources loaded, shared
/// by every layout test. WPF objects belong to the thread that made them, and an
/// Application can exist once per process, so tests post their work here instead
/// of building views on xUnit's pool threads.
/// </summary>
public sealed class WpfThread : IDisposable
{
    private readonly Thread _thread;
    private readonly TaskCompletionSource<Dispatcher> _started = new();

    public WpfThread()
    {
        _thread = new Thread(() =>
        {
            try
            {
                // App.xaml merges tokens.xaml. InitializeComponent loads it without
                // running OnStartup, so no window opens and no settings file is touched.
                new App().InitializeComponent();
                _started.SetResult(Dispatcher.CurrentDispatcher);
            }
            catch (Exception ex)
            {
                _started.SetException(ex);
                return;
            }
            Dispatcher.Run();
        });
        _thread.SetApartmentState(ApartmentState.STA);
        _thread.IsBackground = true;
        _thread.Start();
    }

    private Dispatcher UiDispatcher => _started.Task.GetAwaiter().GetResult();

    public T Invoke<T>(Func<T> work) => UiDispatcher.Invoke(work);

    public void Dispose()
    {
        UiDispatcher.InvokeShutdown();
        _thread.Join();
    }
}
