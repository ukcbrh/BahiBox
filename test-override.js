import { createServer } from 'vite';
process.env.DISABLE_HMR = 'true';
// Simulate vite.config.ts having hmr: false, but createServer having middlewareMode: true
createServer({
  server: { middlewareMode: true },
}).then(vite => {
  console.log('vite.config.server.hmr:', vite.config.server.hmr);
  process.exit(0);
});
