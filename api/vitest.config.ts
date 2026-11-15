import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    coverage: {
      // The bootstrap wires the application and reads the environment; it has
      // no logic worth a unit test, but it is type-checked by `nest build`.
      exclude: ['src/main.ts'],
    },
  },
});
