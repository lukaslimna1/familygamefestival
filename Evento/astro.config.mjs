import { defineConfig } from 'astro/config';

const registrationBackendOrigin = process.env.REGISTRATION_BACKEND_ORIGIN || 'http://127.0.0.1:4321';

export default defineConfig({
  output: 'static',
  vite: {
    server: {
      proxy: {
        '/api': {
          target: registrationBackendOrigin,
          changeOrigin: true,
          configure(proxy) {
            proxy.on('proxyReq', (proxyRequest) => {
              proxyRequest.setHeader('origin', registrationBackendOrigin);
            });
          }
        }
      }
    }
  }
});
