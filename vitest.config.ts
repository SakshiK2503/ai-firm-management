import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // Vitest has no client/server split like Next's webpack config, so `server-only`'s real
      // throwing implementation doesn't apply - see vitest.server-only-shim.ts.
      'server-only': new URL('./vitest.server-only-shim.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'prisma/**/*.test.ts'],
    exclude: ['e2e/**'],
    // The local dev DB (PGlite via `prisma dev`) is a single embedded Postgres process that
    // gets flaky ("Connection terminated unexpectedly") under concurrent connections from
    // multiple Vitest worker processes. Run test files sequentially to avoid that.
    fileParallelism: false,
  },
});
