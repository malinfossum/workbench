using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;

namespace MyApp.Tests.Layout;

/// <summary>
/// Lays a window's content out at a given window size without showing it. A
/// window that was never shown does not arrange its content, so the content moves
/// into a host that carries what the window passed down (font, language, data
/// context, names) and is laid out at the client size: the window size minus the
/// frame Windows draws around it on this machine, as the real window would. No
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

        var content = (FrameworkElement)window.Content;
        window.Content = null;
        var host = new Border
        {
            Child = content,
            Background = window.Background,
            DataContext = window.DataContext,
            Language = window.Language,
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
