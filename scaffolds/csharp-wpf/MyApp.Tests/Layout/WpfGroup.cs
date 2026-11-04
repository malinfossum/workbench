namespace MyApp.Tests.Layout;

/// <summary>Every test that builds WPF views shares one WpfThread.</summary>
[CollectionDefinition(Name)]
public sealed class WpfGroup : ICollectionFixture<WpfThread>
{
    public const string Name = "WPF";
}
