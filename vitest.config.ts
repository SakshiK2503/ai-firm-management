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
    // Dev DB is now hosted (Supabase) rather than the local embedded PGlite process this
    // comment used to describe. Keeping file parallelism off regardless - Supabase's free-tier
    // direct connection (port 5432, used for migrations/tests) has a low shared connection
    // limit, and each Vitest worker file would otherwise open its own pg pool concurrently.
    fileParallelism: false,
    // Real network round-trips to a hosted DB are slower than localhost - tests that make many
    // sequential queries (seeding several rows, walking a reporting chain) can exceed Vitest's
    // 5s default under that latency even though nothing is actually wrong.
    testTimeout: 20000,
  },
});
