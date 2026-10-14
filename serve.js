#!/usr/bin/env bun
// Static file server for the Wanderlisi frontend.
//
// Uses Bun.serve()'s built-in directory route, so Bun handles content types,
// Last-Modified / ETag, Range requests, directory index.html and
// path-traversal protection (openat2(RESOLVE_IN_ROOT) on Linux).
//
// Serves the app's static content (index.html, style.css, lib/, img/,
// public/, manifest.json, ...) and the generated track data under data/,
// which is mounted at runtime. The admin/API server and track processing are
// added in later steps.
//
// Configuration (environment variables):
//   STATIC_ROOT  document root (default: the directory of this file)
//   PORT         listening port (default: 3000)
//   HOST         listening address (default: 0.0.0.0)

import { readdirSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

const ROOT = process.env.STATIC_ROOT || import.meta.dir;
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const DATA_DIR = join(ROOT, "data");
const TRACKS_DIR = join(DATA_DIR, "tracks");
const PLANS_DIR = join(DATA_DIR, "plans");

// The old application exposed every data directory as JSON through an
// `index.php` that echoed the result of PHP's `scandir()`. The frontend relies
// on that to enumerate things while Bun's static `{ dir }` route only knows
// about `index.html`:
//   - `lib/track.js` imports `../data/tracks/` as JSON to list the tracks,
//   - `lib/gallery.js` fetches `data/tracks/<folder>/` to list the images,
//   - `lib/plan.js` fetches `data/plans` to list the plans.
// Reproduce the listing here, keeping the same shape as `scandir()`.
function directoryListing(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  return Response.json(entries.filter((name) => name !== "." && name !== "..").sort());
}

// Resolve `name` below `base`, refusing anything that escapes it.
function resolveUnder(base, name) {
  const target = resolve(base, name);
  const rel = relative(base, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)) ? target : null;
}

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  routes: {
    "/healthz": new Response("ok"),
    // Directory listings the frontend expects (formerly served by index.php).
    "/data/tracks/": () => directoryListing(TRACKS_DIR),
    "/data/tracks/:folder/": (req) => {
      const dir = resolveUnder(TRACKS_DIR, req.params.folder);
      return dir ? directoryListing(dir) : new Response("Bad request", { status: 400 });
    },
    "/data/plans/": () => directoryListing(PLANS_DIR),
    // Serve the whole app root as static content.
    "/*": { dir: ROOT },
  },
});

console.log(
  `Wanderlisi static server listening on http://${HOST}:${server.port} (root: ${ROOT})`,
);
