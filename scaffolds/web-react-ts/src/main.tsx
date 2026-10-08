/* ======================================================================
   src/main.tsx — VITE ENTRY POINT
   Boots the app. Rarely edited.
   ====================================================================== */

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.tsx"
import { PreferencesProvider } from "./components/PreferencesProvider.tsx"
// Order matters: index.css carries the cascade layers (Tailwind + the
// design system); main.css stays unlayered and last, so project styles win.
import "./styles/index.css"
import "./styles/main.css"

const root = document.getElementById("root")
if (!root) throw new Error("Missing #root element in index.html")

createRoot(root).render(
	<StrictMode>
		<PreferencesProvider>
			<App />
		</PreferencesProvider>
	</StrictMode>
)
