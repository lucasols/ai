import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts', 'src/fileProcessing.ts', 'src/schemaBuilder.ts'],
  outDir: 'dist',
  clean: true,
  format: ['esm', 'cjs'],
});
