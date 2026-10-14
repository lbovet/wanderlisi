#!/usr/bin/env bun
// Static file server for the Wanderlisi frontend.
//
// Uses Bun.serve()'s built-in directory route, so Bun handles content types,
// Last-Modified / ETag, Range requests, directory index.html and
// path-traversal protection (openat2(RESOLVE_IN_ROOT) on Linux).
//
// Serves the app's static content (index.html, style.css, lib/, img/,
// public/, manifest.json, ...) and, when available, the generated track
// data under data/. The admin/API server and track processing are added in
// later steps.
//
// Configuration (environment variables):
//   STATIC_ROOT  document root (default: the directory of this file)
//   PORT         listening port (default: 3000)
//   HOST         listening address (default: 0.0.0.0)

const ROOT = process.env.STATIC_ROOT || import.meta.dir;
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  routes: {
    "/healthz": new Response("ok"),
    // Serve the whole app root as static content.
    "/*": { dir: ROOT },
  },
});

console.log(
  `Wanderlisi static server listening on http://${HOST}:${server.port} (root: ${ROOT})`,
);
