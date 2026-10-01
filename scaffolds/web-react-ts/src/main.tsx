/* ======================================================================
   src/main.tsx — VITE ENTRY POINT
   Boots the app. Rarely edited.
   ====================================================================== */

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.tsx"
import { PreferencesProvider } from "./components/PreferencesProvider.tsx"
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
