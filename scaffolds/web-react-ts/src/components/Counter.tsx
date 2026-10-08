/* ======================================================================
   src/components/Counter.tsx — EXAMPLE COMPONENT
   Rendering and event wiring only — state comes from the hook, logic from
   the service. Uses design-system classes (btn, cluster); the reset goes
   through a shadcn Dialog (ResetDialog) so the two systems sit side by
   side once. Delete this file (plus the hook, the service and ResetDialog)
   when you start your real app.
   ====================================================================== */

import { useCounter } from "../hooks/useCounter.ts"
import { useI18n } from "../hooks/useI18n.ts"
import { ResetDialog } from "./ResetDialog.tsx"

export function Counter() {
	const { count, increment, decrement, reset } = useCounter()
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
				<ResetDialog onConfirm={reset} />
			</div>
		</div>
	)
}
