/* ======================================================================
   src/hooks/useCounter.ts — EXAMPLE HOOK
   Owns state and exposes behavior; the logic itself lives in the service.
   Components call these functions — they never mutate state directly.
   Delete alongside the Counter example.
   ====================================================================== */

import { useState } from "react"
import { decrement, increment } from "../services/counter.ts"

export function useCounter(initial = 0) {
	const [count, setCount] = useState(initial)

	return {
		count,
		increment: () => setCount(increment),
		decrement: () => setCount(decrement),
	}
}
