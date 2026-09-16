import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import { mkdirSync, createReadStream, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createSession } from './session.ts';
import { createScenarioSession, loadGeographicRules } from './scenario-session.ts';

const production = process.argv.includes('--production');
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';
mkdirSync('data', { recursive: true });
const session = createSession(resolve('data/session.jsonl'));
const geographic = createScenarioSession(loadGeographicRules(), resolve('data/geographic-session.jsonl'));
const subscribers = new Set<ServerResponse>();
const geographicSubscribers = new Set<ServerResponse>();
const vite = production ? null : await (await import('vite')).createServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
const send = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const isGeographic = url.pathname.startsWith('/api/scenario/');
  const activeSession = isGeographic ? geographic : session;
  const activeSubscribers = isGeographic ? geographicSubscribers : subscribers;
  const apiPath = isGeographic ? url.pathname.replace('/scenario/', '/') : url.pathname;
  if (apiPath === '/api/state' && req.method === 'GET') return send(res, 200, activeSession.getState());
  if (apiPath === '/api/events' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(activeSession.getState())}\n\n`);
    activeSubscribers.add(res);
    const timer = setInterval(() => res.write(': heartbeat\n\n'), 15000);
    req.on('close', () => { clearInterval(timer); activeSubscribers.delete(res); });
    return;
  }
  if (apiPath === '/api/command' && req.method === 'POST') {
    // Same-origin, local cooperative prototype. No identity or hidden information yet.
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(res, 403, { error: 'Origin rejected.' });
    try {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > (isGeographic ? 8_000_000 : 8192)) { send(res, 413, { error: 'Request too large.' }); return; } }
      const result = activeSession.submit(JSON.parse(body));
      send(res, result.status, result.body);
      if (result.status === 200 && !result.body.duplicate) activeSubscribers.forEach(s => s.write(`data: ${JSON.stringify(result.body.state)}\n\n`));
    } catch { send(res, 400, { error: 'Invalid request.' }); }
    return;
  }
  if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Not found.' });
  if (vite) return vite.middlewares(req, res);
  const root = resolve('dist');
  let path = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!path.startsWith(root + sep) && path !== root) return send(res, 403, { error: 'Invalid path.' });
  if (!extname(path)) path = resolve(root, 'index.html');
  if (!existsSync(path)) return send(res, 404, { error: 'Not found.' });
  const type = ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' } as Record<string, string>)[extname(path)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  createReadStream(path).pipe(res);
});
server.listen(port, host, () => console.log(`XRiegsspiel ${production ? 'production' : 'development'}: http://${host}:${port}`));
process.on('SIGINT', () => { [...subscribers, ...geographicSubscribers].forEach(s => s.end()); server.close(); void vite?.close(); });
