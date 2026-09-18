// Vitest runs everything as if it were server code, so `server-only`'s real implementation
// (which throws to stop client bundles from importing server modules) doesn't apply here -
// this is the same no-op Next.js's own webpack config substitutes on the server side.
export {};
