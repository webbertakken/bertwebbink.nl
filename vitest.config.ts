import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // @ts-expect-error something is wrong with the types
  plugins: [tsconfigPaths(), react()],

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],

    /**
     * Coverage is intentionally scoped to the *logic* surface of the app
     * \u2014 pure utility modules, parsers, and small stateless components \u2014
     * with a 100% threshold across the board.
     *
     * Excluded paths fall into one of three buckets and are not measured:
     *   1. integration glue (Next.js page routes / route handlers /
     *      middleware / Sanity studio chrome / CLI scripts) where running
     *      "code coverage" doesn't tell you anything useful in isolation;
     *   2. presentational JSX where the only outputs are HTML element
     *      shapes that read better as visual review than as DOM assertions;
     *   3. generated files.
     *
     * Anything new with real logic should land inside the included
     * directories so the 100% gate keeps biting.
     */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'core/**/*.ts',
        'app/components/landing/Placeholder.tsx',
        'app/components/landing/renderEmphasised.tsx',
        'app/components/landing/archiveUtil.ts',
        'app/components/landing/archiveActions.ts',
        'scripts/sanity-backfill/parsers.ts',
        'scripts/sanity-backfill/wp-html.ts',
      ],
      exclude: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
