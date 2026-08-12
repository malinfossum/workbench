/* ======================================================================
   src/components/Counter.tsx — EXAMPLE COMPONENT
   Rendering and event wiring only — state comes from the hook, logic from
   the service. Uses design-system classes (btn, cluster). Delete this
   file (plus the hook and service) when you start your real app.
   ====================================================================== */

import { useCounter } from "../hooks/useCounter.ts"

export function Counter() {
	const { count, increment, decrement } = useCounter()

	return (
		<div className="stack">
			<p aria-live="polite">
				Count: <strong>{count}</strong>
			</p>
			<div className="cluster">
				<button type="button" className="btn" aria-label="Decrease count" onClick={decrement}>
					−
				</button>
				<button
					type="button"
					className="btn btn-primary"
					aria-label="Increase count"
					onClick={increment}
				>
					+
				</button>
			</div>
		</div>
	)
}
