// Reads configuration in a way that survives bundling on every runtime.
// Vite's webworker-target SSR build (used by the Cloudflare Workers adapter)
// rewrites literal `process.env` accesses to `{}`, so config must be read
// through globalThis. On Node and Bun, globalThis.process is the real process;
// on Workers with nodejs_compat it exposes vars and secrets.
type ProcessWithEnv = { env?: Record<string, string | undefined> }

export function readEnv(key: string): string | undefined {
  const proc = (globalThis as { process?: ProcessWithEnv }).process
  return proc?.env?.[key]
}
