using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Media;
using MyApp.Layout;

namespace MyApp.Tests.Layout;

public sealed record AuditReport(int Contracts, IReadOnlyList<string> Violations);

/// <summary>
/// The WPF half of workbench libraries/layout-audit. Walks the visual tree for
/// Align.Contract elements and checks each with a 1 DIP tolerance. Row: per
/// visual line of a panel's children, one ActualHeight and one bottom edge
/// (via TranslatePoint), and every control at least 44 DIP tall.
/// </summary>
public static class LayoutAudit
{
    public const double Tolerance = 1.0;
    public const double ControlFloor = 44.0;

    public static AuditReport Check(FrameworkElement root)
    {
        ArgumentNullException.ThrowIfNull(root);
        var violations = new List<string>();
        var contracts = 0;
        foreach (var element in Descendants(root))
        {
            if (Align.GetContract(element) != AlignContract.Row || !IsShown(element, root))
            {
                continue;
            }
            contracts++;
            if (element is Panel panel)
            {
                CheckRow(panel, violations);
            }
            else
            {
                violations.Add(Say($"Row: {NameOf(element)} is not a Panel; the contract measures a panel's children"));
            }
        }
        return new AuditReport(contracts, violations);
    }

    private static void CheckRow(Panel panel, List<string> violations)
    {
        var boxes = panel.Children.OfType<FrameworkElement>()
            .Where(child => child.Visibility == Visibility.Visible && child.ActualHeight > 0)
            .Select(child => (Element: child, Top: child.TranslatePoint(new Point(0, 0), panel).Y))
            .OrderBy(box => box.Top)
            .ToList();

        foreach (var line in Lines(boxes))
        {
            foreach (var (element, _) in line.Where(box => IsControl(box.Element) && box.Element.ActualHeight < ControlFloor - Tolerance))
            {
                violations.Add(Say($"Row {NameOf(panel)}: {NameOf(element)} is {element.ActualHeight:0.#} DIP tall, under {ControlFloor} DIP"));
            }
            if (line.Count < 2)
            {
                continue;
            }
            var heights = line.Select(box => box.Element.ActualHeight).ToList();
            var bottoms = line.Select(box => box.Top + box.Element.ActualHeight).ToList();
            if (heights.Max() - heights.Min() > Tolerance || bottoms.Max() - bottoms.Min() > Tolerance)
            {
                violations.Add(Say($"Row {NameOf(panel)}: {heights.Max():0.#} vs {heights.Min():0.#} DIP tall, bottoms {bottoms.Max() - bottoms.Min():0.#} DIP apart"));
            }
        }
    }

    // Children whose vertical extents overlap share a visual line. Input is sorted by Top.
    private static List<List<(FrameworkElement Element, double Top)>> Lines(List<(FrameworkElement Element, double Top)> boxes)
    {
        var lines = new List<List<(FrameworkElement Element, double Top)>>();
        var lineBottom = double.NegativeInfinity;
        foreach (var box in boxes)
        {
            if (lines.Count == 0 || box.Top >= lineBottom - Tolerance)
            {
                lines.Add([]);
                lineBottom = double.NegativeInfinity;
            }
            lines[^1].Add(box);
            lineBottom = Math.Max(lineBottom, box.Top + box.Element.ActualHeight);
        }
        return lines;
    }

    private static bool IsControl(FrameworkElement element) =>
        element is ButtonBase or TextBoxBase or ComboBox or PasswordBox;

    private static bool IsShown(FrameworkElement element, FrameworkElement root)
    {
        for (DependencyObject? node = element; node is not null && node != root; node = VisualTreeHelper.GetParent(node))
        {
            if (node is UIElement { Visibility: not Visibility.Visible })
            {
                return false;
            }
        }
        return root.Visibility == Visibility.Visible;
    }

    private static IEnumerable<FrameworkElement> Descendants(DependencyObject parent)
    {
        for (var i = 0; i < VisualTreeHelper.GetChildrenCount(parent); i++)
        {
            var child = VisualTreeHelper.GetChild(parent, i);
            if (child is FrameworkElement element)
            {
                yield return element;
            }
            foreach (var nested in Descendants(child))
            {
                yield return nested;
            }
        }
    }

    private static string NameOf(FrameworkElement element) =>
        string.IsNullOrEmpty(element.Name) ? element.GetType().Name : $"{element.GetType().Name} \"{element.Name}\"";

    private static string Say(FormattableString message) => message.ToString(CultureInfo.InvariantCulture);
}
