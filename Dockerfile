# Wanderlisi static frontend image.
#
# Serves the app's static content with a small Bun HTTP server (serve.js).
# The admin/API server and track processing are included in later steps.
FROM oven/bun:alpine

WORKDIR /app

# Static app content: index.html, style.css, lib/, img/, public/, manifest.json.
COPY . .

ENV PORT=3000 \
    STATIC_ROOT=/app

EXPOSE 3000

# Run as the non-root user provided by the base image.
USER bun

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "serve.js"]
