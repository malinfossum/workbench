/* ======================================================================
   src/components/Counter.tsx — EXAMPLE COMPONENT
   Rendering and event wiring only — state comes from the hook, logic from
   the service. Uses design-system classes (btn, cluster). Delete this
   file (plus the hook and service) when you start your real app.
   ====================================================================== */

import { useCounter } from "../hooks/useCounter.ts"
import { useI18n } from "../hooks/useI18n.ts"

export function Counter() {
	const { count, increment, decrement } = useCounter()
	const { t } = useI18n()

	return (
		<div className="stack">
			<p aria-live="polite">
				{t("counter.label")} <strong>{count}</strong>
			</p>
			<div className="cluster">
				<button
					type="button"
					className="btn"
					aria-label={t("counter.decrease")}
					onClick={decrement}
				>
					−
				</button>
				<button
					type="button"
					className="btn btn-primary"
					aria-label={t("counter.increase")}
					onClick={increment}
				>
					+
				</button>
			</div>
		</div>
	)
}
