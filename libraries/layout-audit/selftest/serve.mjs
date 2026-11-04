/* Serves the workbench root read-only on 127.0.0.1:4400 so the fixtures load the
   real design system over HTTP (Chromium refuses fonts from file://). Test-only. */
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const TYPES = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".woff2": "font/woff2",
	".svg": "image/svg+xml",
};

createServer((request, response) => {
	let path;
	try {
		path = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
	} catch {
		response.writeHead(400).end();
		return;
	}
	const file = normalize(join(ROOT, path));
	if (!file.startsWith(ROOT + sep)) {
		response.writeHead(403).end();
		return;
	}
	let isFile = false;
	try {
		isFile = statSync(file).isFile();
	} catch {}
	if (!isFile) {
		response.writeHead(404).end();
		return;
	}
	response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
	createReadStream(file).pipe(response);
}).listen(4400, "127.0.0.1");
