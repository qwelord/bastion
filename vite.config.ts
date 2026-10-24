import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { securityHeaders } from './config/security.mjs';
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'bastion-security-headers',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: '_headers',
          source:
            '/*\n' +
            Object.entries(securityHeaders())
              .map(([key, value]) => '  ' + key + ': ' + value)
              .join('\n') +
            '\n',
        });
      },
    },
  ],
  server: { host: '127.0.0.1', port: 5173, strictPort: true, headers: securityHeaders(true) },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, headers: securityHeaders() },
});
