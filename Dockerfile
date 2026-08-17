# Generic production image. Works with Docker, Podman, Coolify, Nomad,
# Kubernetes, and other OCI-compatible runtimes.
FROM oven/bun:1 AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run typecheck && bun run check && bun run build

FROM oven/bun:1-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --from=build --chown=bun:bun /app/package.json ./package.json
COPY --from=build --chown=bun:bun /app/bun.lock ./bun.lock
RUN bun install --production --frozen-lockfile

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["bun", "dist/index.js"]
