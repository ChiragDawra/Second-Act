import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Each test file boots its own in-process PostgreSQL (PGlite) with the
    // real Supabase migrations applied.
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
