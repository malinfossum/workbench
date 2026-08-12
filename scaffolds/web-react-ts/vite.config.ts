/* ======================================================================
   vite.config.ts
   The react plugin is required; everything else is optional.
   ====================================================================== */

import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [react()],
	// If you deploy to GitHub Pages under a repo name, set:
	// base: '/your-repo-name/',
})
