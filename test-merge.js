import { createServer } from 'vite';
process.env.DISABLE_HMR = 'true';
createServer({
  server: { middlewareMode: true },
  appType: "spa",
}).then(vite => {
  console.log('vite.config.server.hmr:', vite.config.server.hmr);
  process.exit(0);
});
