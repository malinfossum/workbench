/* ======================================================================
   src/App.tsx — APP SHELL
   Top-level layout and composition. Day-to-day work happens in
   src/components, src/hooks, and src/services.

   Layering (the React analogue of MVC):
   - services/    pure logic and data — no React, no DOM, unit-testable
   - hooks/       state + behavior (useState wrapping service functions)
   - components/  rendering + event wiring — no business logic
   - locales/     UI strings, one JSON bundle per language; render with t()
   ====================================================================== */

import { Counter } from "./components/Counter.tsx"
import { LanguageSwitcher } from "./components/LanguageSwitcher.tsx"
import { useI18n } from "./hooks/useI18n.ts"

export function App() {
	const { t } = useI18n()

	return (
		<div id="app" className="container stack stack-lg">
			<header className="stack">
				<h1>{t("app.title")}</h1>
				<p>{t("app.tagline")}</p>
				<LanguageSwitcher />
			</header>

			<main id="main" className="card">
				<Counter />
			</main>
		</div>
	)
}
