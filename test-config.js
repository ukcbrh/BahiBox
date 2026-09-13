import { createServer, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

process.env.DISABLE_HMR = 'true';

createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "spa",
  plugins: [{
    name: 'test-plugin',
    configResolved(config) {
      console.log('configResolved config.server.hmr:', config.server.hmr);
    }
  }]
}).then(vite => {
  console.log('vite.config.server.hmr:', vite.config.server.hmr);
  process.exit(0);
});
