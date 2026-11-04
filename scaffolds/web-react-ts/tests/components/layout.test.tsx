/* Layout primitives: each renders its design system class and passes axe, and a
   ControlRow really keeps a wrapped label's neighbours at its height. */
import { expect, test } from "vitest"
import { render } from "vitest-browser-react"
import { Card, CardGrid, ControlRow, RowList, Switcher } from "../../src/components/layout.tsx"
import { axeComponent } from "./axe.ts"

test("each layout primitive renders its design system class and passes axe", async () => {
	const screen = await render(
		<div>
			<ControlRow data-testid="row">
				<button type="button" className="btn">
					One
				</button>
				<button type="button" className="btn">
					Two
				</button>
			</ControlRow>
			<Switcher data-testid="switcher" threshold="20rem">
				<a className="btn" href="#a">
					A
				</a>
				<a className="btn" href="#b">
					B
				</a>
			</Switcher>
			<RowList data-testid="rows">
				<li>
					<span>Name</span>
					<button type="button" className="btn">
						Call
					</button>
				</li>
			</RowList>
			<CardGrid data-testid="cards" min="12rem">
				<Card data-testid="card" slots={3}>
					<h3>Title</h3>
					<p>Body</p>
					<button type="button" className="btn">
						Act
					</button>
				</Card>
			</CardGrid>
		</div>
	)
	const byId = (id: string) => screen.container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
	expect(byId("row")?.className).toBe("control-row")
	expect(byId("switcher")?.className).toBe("switcher")
	expect(byId("switcher")?.style.getPropertyValue("--switcher-threshold")).toBe("20rem")
	expect(byId("rows")?.tagName).toBe("UL")
	expect(byId("cards")?.style.getPropertyValue("--card-min")).toBe("12rem")
	expect(byId("card")?.tagName).toBe("ARTICLE")
	expect(byId("card")?.style.getPropertyValue("--card-slots")).toBe("3")
	expect(await axeComponent(screen.container)).toEqual([])
})

test("ControlRow keeps a wrapped label's neighbours at its height", async () => {
	const screen = await render(
		<div style={{ inlineSize: "16rem" }}>
			<ControlRow>
				<button type="button" className="btn" style={{ maxInlineSize: "8rem" }}>
					Legevakt: ring 116 117 om natten
				</button>
				<button type="button" className="btn">
					Ring
				</button>
			</ControlRow>
		</div>
	)
	// The long label is capped so it wraps while "Ring" still shares its line;
	// uncapped, flex-wrap would move "Ring" to a line of its own.
	const [a, b] = [...screen.container.querySelectorAll("button")].map((el) =>
		el.getBoundingClientRect()
	)
	expect(a && b).toBeTruthy()
	if (!a || !b) return
	expect(a.height).toBeGreaterThan(44)
	expect(Math.abs(a.height - b.height)).toBeLessThanOrEqual(1)
	expect(Math.abs(a.bottom - b.bottom)).toBeLessThanOrEqual(1)
})
