/* ======================================================================
   src/App.tsx: APP SHELL
   Top-level layout and composition. Day-to-day work happens in
   src/components, src/hooks, and src/services.

   Layering (the React analogue of MVC):
   - services/    pure logic and data, no React, no DOM, unit-testable
   - hooks/       state + behavior (useState wrapping service functions)
   - components/  rendering + event wiring, no business logic
   - components/ui/  shadcn components (generated, house-edited; README)
   - locales/     UI strings, one JSON bundle per language; render with t()
   - config/      the project's options (currencies, region table)

   The page has one status region, rendered here from load. Examples
   (and your features) write their audible result to it through
   setStatus: "Sorted by name", "Currency: EUR". Keep it; a screen reader
   hears each line once, and nothing else on the page is live except the
   Counter's own paragraph.
   ====================================================================== */

import { useState } from "react"
import { Counter } from "./components/Counter.tsx"
import { CurrencyCombobox } from "./components/CurrencyCombobox.tsx"
import { ExampleMenu } from "./components/ExampleMenu.tsx"
import { Header } from "./components/Header.tsx"
import { useI18n } from "./hooks/useI18n.ts"

// Prices are numbers in data, never strings in a bundle: the active language
// chooses separators and symbol placement, the active currency the symbol.
// A real project stores an amount per currency it sells in.
const EXAMPLE_AMOUNT = 949

export function App() {
	const { t, money } = useI18n()
	const [status, setStatus] = useState("")

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

				<div className="card stack">
					<h2>{t("examples.title")}</h2>
					<ExampleMenu onStatus={setStatus} />
					<CurrencyCombobox onStatus={setStatus} />
				</div>

				<p className="text-muted">{t("price.example", { price: money(EXAMPLE_AMOUNT) })}</p>
				<p role="status" className="text-muted">
					{status}
				</p>
			</main>
		</div>
	)
}
