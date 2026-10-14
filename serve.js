#!/usr/bin/env bun
// Minimal static file server for the Wanderlisi frontend.
//
// Serves the app's static content (index.html, style.css, lib/, img/,
// public/, manifest.json, ...) and, when available, the generated track
// data under data/. The admin/API server and track processing are added
// in later steps.
//
// Configuration (environment variables):
//   STATIC_ROOT  document root (default: the directory of this file)
//   PORT         listening port (default: 3000)
//   HOST         listening address (default: 0.0.0.0)

import { serve, file } from "bun";
import { resolve, sep, extname, join } from "node:path";
import { statSync } from "node:fs";

const ROOT = resolve(process.env.STATIC_ROOT || import.meta.dir);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".gpx": "application/gpx+xml",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function plain(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", ...headers },
  });
}

// Map a request pathname to an absolute file path inside ROOT, or null.
function resolveRequestPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  // Reject null bytes and anything that escapes the document root.
  if (decoded.includes("\0")) return null;
  const candidate = resolve(ROOT, "." + decoded);
  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) return null;

  let stats;
  try {
    stats = statSync(candidate);
  } catch {
    return null;
  }

  if (stats.isDirectory()) {
    const index = join(candidate, "index.html");
    try {
      if (statSync(index).isFile()) return index;
    } catch {
      /* no index */
    }
    return null;
  }
  return stats.isFile() ? candidate : null;
}

const server = serve({
  port: PORT,
  hostname: HOST,
  fetch(req) {
    const { pathname } = new URL(req.url);

    if (pathname === "/healthz") {
      return plain("ok");
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return plain("Method Not Allowed", 405, { allow: "GET, HEAD" });
    }

    const filePath = resolveRequestPath(pathname);
    if (!filePath) {
      return plain("Not Found", 404);
    }

    const stats = statSync(filePath);
    const headers = {
      "content-type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
      "content-length": String(stats.size),
      "last-modified": stats.mtime.toUTCString(),
    };

    return new Response(req.method === "HEAD" ? null : file(filePath), { headers });
  },
});

console.log(
  `Wanderlisi static server listening on http://${HOST}:${server.port} (root: ${ROOT})`,
);
