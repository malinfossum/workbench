using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Threading;

namespace MyApp.Tests.Layout;

/// <summary>
/// Lays a window's content out at a given window size without showing it. A
/// window that was never shown does not arrange its content, so the content moves
/// into a host that carries what the window passed down (font, language, data
/// context, names, resources) and is laid out at the client size: the window size
/// minus the frame Windows draws around it on this machine, as the real window would. No
/// screen and no shown window, so it runs the same in a CI session with no desktop.
/// </summary>
public static class LayoutHost
{
    public static FrameworkElement Lay(Window window, Size windowSize)
    {
        ArgumentNullException.ThrowIfNull(window);
        var frame = SystemParameters.WindowNonClientFrameThickness;
        var client = new Size(
            windowSize.Width - frame.Left - frame.Right,
            windowSize.Height - frame.Top - frame.Bottom);

        // A DataContext set after InitializeComponent reaches the window's own
        // bindings (Language among them) through the dispatcher. A shown window
        // runs that queue before it renders; run it here too, so the host copies
        // the bound values and not the defaults.
        window.Dispatcher.Invoke(() => { }, DispatcherPriority.Background);

        var content = (FrameworkElement)window.Content;
        window.Content = null;
        var host = new Border
        {
            Child = content,
            Background = window.Background,
            DataContext = window.DataContext,
            Language = window.Language,
            // Implicit styles in Window.Resources must apply when the content is
            // measured; a ResourceDictionary can have several owners.
            Resources = window.Resources,
        };
        NameScope.SetNameScope(host, NameScope.GetNameScope(window));
        TextElement.SetFontFamily(host, window.FontFamily);
        TextElement.SetFontSize(host, window.FontSize);
        TextElement.SetForeground(host, window.Foreground);

        host.Measure(client);
        host.Arrange(new Rect(client));
        host.UpdateLayout();
        return host;
    }
}
