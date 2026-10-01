/* ======================================================================
   src/components/Icon.tsx: DESIGN-SYSTEM ICON
   Renders one icon from design-system/components/icons.js, which ships
   its SVG as a template string (no sprite, no network request). The
   wrapper is display: contents (src/styles/main.css), so the SVG sits in
   the flex box of the control around it as if it were a direct child.
   ====================================================================== */

import { icon } from "../../design-system/components/icons.js"

export function Icon({ name, size }: { name: string; size?: number }) {
	// dangerouslySetInnerHTML is acceptable here and only here: the string
	// is the design system's own static markup for a fixed icon name, never
	// user input, never a translated string. Everything else in the app
	// renders through JSX, which escapes.
	return (
		<span
			className="icon-wrap"
			aria-hidden="true"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: the DS icon template only, see the comment above
			dangerouslySetInnerHTML={{ __html: icon(name, { size }) }}
		/>
	)
}
