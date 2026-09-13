import { createServer } from 'vite';
process.env.DISABLE_HMR = 'true';
createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "spa",
}).then(async vite => {
  const result = await vite.transformRequest('/src/main.tsx');
  console.log('Includes RefreshReg:', result.code.includes('window.$RefreshReg$'));
  process.exit(0);
});
