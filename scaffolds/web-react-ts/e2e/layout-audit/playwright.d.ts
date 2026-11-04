import type { Page } from "@playwright/test"

export const CONTRACTS: Contract[]

export function validateKnown(known: KnownViolation[]): void

export function unreachableKnown(known: KnownViolation[], paths: LayoutPath[], locales: string[]): KnownViolation[]

export type Contract =
	| "control-row"
	| "switcher"
	| "row-list"
	| "card-grid"
	| "label"
	| "control-floor"
	| "clipped-text"
	| "no-sideways-scroll"
	| "data-align"

export interface KnownViolation {
	contract: Contract
	selector: string
	reason: string
	paths?: string[]
	widths?: number[]
	textSizes?: number[]
	locales?: string[]
	spacing?: boolean
}

export type LayoutPath = string | { path: string; expectPrimitives: 0 }

export interface Cell {
	path: string
	expectPrimitives?: 0
	width: number
	textSize: number
	spacing: boolean
}

export interface Violation {
	contract: Contract
	selector: string
	message: string
	known: boolean
}

export interface Report {
	primitives: number
	violations: Violation[]
	stale: KnownViolation[]
}

export function settle(page: Page, path: string): Promise<number>

export function checkLayout(
	page: Page,
	cell: Cell,
	options?: { locale?: string; known?: KnownViolation[]; checkLang?: boolean },
): Promise<{ report: Report; errors: string[] }>

export function layoutSuite(options: {
	paths: LayoutPath[]
	locales?: string[]
	known?: KnownViolation[]
	checkLang?: boolean
}): void
