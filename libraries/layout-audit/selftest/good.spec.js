import { layoutSuite } from "../playwright.js";

// The full matrix over the good fixtures: every contract kept at every width,
// both text sizes and the WCAG 1.4.12 spacing cells.
layoutSuite({ paths: ["/libraries/layout-audit/fixtures/good.html"] });
