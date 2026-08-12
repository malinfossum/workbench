/* ======================================================================
   src/App.tsx — APP SHELL
   Top-level layout and composition. Day-to-day work happens in
   src/components, src/hooks, and src/services.

   Layering (the React analogue of MVC):
   - services/    pure logic and data — no React, no DOM, unit-testable
   - hooks/       state + behavior (useState wrapping service functions)
   - components/  rendering + event wiring — no business logic
   ====================================================================== */

import { Counter } from "./components/Counter.tsx"

export function App() {
	return (
		<div id="app" className="container stack stack-lg">
			<header>
				<h1>Project</h1>
				<p>React + TS starter — replace Counter with your app.</p>
			</header>

			<main id="main" className="card">
				<Counter />
			</main>
		</div>
	)
}
