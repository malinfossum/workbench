import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// CI runs no dotnet for this scaffold (only csharp-api's suite runs in Ward's dotnet job), so this is the guard that sees a
// WPF layout regression on every pull request. dotnet test runs the real audit.
const WPF = join(import.meta.dirname, "..", "scaffolds", "csharp-wpf");
const read = (p) => readFileSync(join(WPF, p), "utf8").replaceAll("\r\n", "\n");

test("ControlHeight is at least 44, the house touch-target floor", () => {
	const tokens = read("MyApp/Resources/tokens.xaml");
	const value = Number(tokens.match(/<sys:Double x:Key="ControlHeight">([\d.]+)<\/sys:Double>/)?.[1]);
	assert.ok(value >= 44, `ControlHeight is ${value}, under 44`);
	assert.doesNotMatch(tokens, /42px control height/, "the header comment still cites the stale 42px");
});

test("MainWindow marks its control row, and the layout audit test exists", () => {
	const xaml = read("MyApp/MainWindow.xaml");
	assert.match(xaml, /layout:Align\.Contract="Row"/);
	assert.doesNotMatch(xaml, /Orientation="Horizontal"/, "a horizontal StackPanel never stretches its children to one height");
	for (const file of [
		"MyApp/Layout/Align.cs",
		"MyApp.Tests/Layout/WpfThread.cs",
		"MyApp.Tests/Layout/WpfGroup.cs",
		"MyApp.Tests/Layout/LayoutHost.cs",
		"MyApp.Tests/Layout/LayoutAudit.cs",
		"MyApp.Tests/MainWindowLayoutTests.cs",
	]) {
		assert.ok(existsSync(join(WPF, file)), `${file} is missing`);
	}
});
