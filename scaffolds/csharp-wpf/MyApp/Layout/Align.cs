using System.Windows;

namespace MyApp.Layout;

/// <summary>
/// Layout contracts a test can check, the WPF twin of the web data-align marker.
/// Row: the panel's children on one visual line share one height and one bottom
/// edge. A Grid with Auto columns and stretched children keeps it by construction;
/// a horizontal StackPanel does not.
/// </summary>
public enum AlignContract
{
    None,
    Row,
}

public static class Align
{
    public static readonly DependencyProperty ContractProperty = DependencyProperty.RegisterAttached(
        "Contract", typeof(AlignContract), typeof(Align), new PropertyMetadata(AlignContract.None));

    public static AlignContract GetContract(DependencyObject element)
    {
        ArgumentNullException.ThrowIfNull(element);
        return (AlignContract)element.GetValue(ContractProperty);
    }

    public static void SetContract(DependencyObject element, AlignContract value)
    {
        ArgumentNullException.ThrowIfNull(element);
        element.SetValue(ContractProperty, value);
    }
}
