import { defineConfig, type Plugin, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createGateway } from './mock/gateway';

// Мок шлюзу підключається лише до локального dev/preview-сервера.
// У продакшн-збірку він не потрапляє: фронтенд — статичні файли в S3/CloudFront.
function mockGateway(): Plugin {
  const gw = createGateway();
  const middleware: Connect.NextHandleFunction = async (req: IncomingMessage, res: ServerResponse, next) => {
    if (!req.url?.startsWith('/api/')) return next();
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const body = chunks.length && req.method !== 'GET' && req.method !== 'HEAD' ? Buffer.concat(chunks) : undefined;
    const out = await gw.handle(new Request(`http://localhost${req.url}`, { method: req.method, headers, body }));
    res.statusCode = out.status;
    out.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await out.arrayBuffer()));
  };
  return {
    name: 'woof-mock-gateway',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

export default defineConfig({
  plugins: [react(), mockGateway()],
  build: {
    // Маніфест потрібен тесту I5: з нього видно, що статичне замикання
    // точки входу не містить коду фінансів, промптів і моніторингу.
    manifest: true,
  },
});
