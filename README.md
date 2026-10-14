# Wanderlisi — Simple admin editor

This small scaffold adds a simple login and editor to modify `tracks/notes.md`.

Quick start:

1. Install dependencies

```powershell
npm install
```

2. Start the server

```powershell
npm start
```

3. Open http://localhost:3000/login.html

Default credentials: admin / password (local use only — change before exposing to network)

Notes:
- The server will create `tracks/notes.md` if it doesn't exist.
- This is intentionally minimal and not hardened for production.
# Wanderlisi

The little Wander Lisi helps us to keep track of our past and next hikes.

She reads GPX tracks from the `tracks/` folder and display them on the map. As easy as this!

## Static server

The frontend can be served with a small [Bun](https://bun.sh) HTTP server:

```sh
bun run serve
```

It serves the app root on http://localhost:3000 . `PORT`, `HOST` and
`STATIC_ROOT` can be overridden through environment variables.

## Docker

Build the static frontend image and run it (mounting the generated track data):

```sh
docker build -t wanderlisi .
docker run --rm -p 3000:3000 -v "$PWD/data:/app/data" wanderlisi
```

The app is then available at http://localhost:3000 . The `data/` directory is
not baked into the image; it is expected to be mounted at runtime.

> The admin/API server and the track-processing pipeline are not part of this
> image yet and will be added in later steps.
