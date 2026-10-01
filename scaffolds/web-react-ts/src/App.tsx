/* ======================================================================
   src/App.tsx: APP SHELL
   Top-level layout and composition. Day-to-day work happens in
   src/components, src/hooks, and src/services.

   Layering (the React analogue of MVC):
   - services/    pure logic and data, no React, no DOM, unit-testable
   - hooks/       state + behavior (useState wrapping service functions)
   - components/  rendering + event wiring, no business logic
   - locales/     UI strings, one JSON bundle per language; render with t()
   - config/      the project's options (currencies, region table)
   ====================================================================== */

import { Counter } from "./components/Counter.tsx"
import { Header } from "./components/Header.tsx"
import { useI18n } from "./hooks/useI18n.ts"

// Prices are numbers in data, never strings in a bundle: the active language
// chooses separators and symbol placement, the active currency the symbol.
// A real project stores an amount per currency it sells in.
const EXAMPLE_AMOUNT = 949

export function App() {
	const { t, money } = useI18n()

	return (
		<div id="app" className="container stack stack-lg">
			<Header />

			<main id="main" className="stack stack-lg">
				<div className="stack">
					<h1>{t("app.title")}</h1>
					<p>{t("app.tagline")}</p>
				</div>

				<div className="card">
					<Counter />
				</div>

				<p className="text-muted">{t("price.example", { price: money(EXAMPLE_AMOUNT) })}</p>
			</main>
		</div>
	)
}
