import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works both at the root of a domain and under
// a GitHub Pages project path like /OsrsHelper/.
export default defineConfig({
  base: './',
  plugins: [react()],
});
