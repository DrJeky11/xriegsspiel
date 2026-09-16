import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import { captureContext, handleCapture } from './capture-http.ts';
import type { CaptureContext } from '../src/capture/types.ts';
import { mkdirSync, createReadStream, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createMapSessions } from './map-sessions.ts';
import { loadGeographicRules } from './scenario-session.ts';
import { createOpponentSessions } from './opponent-session.ts';
import { geographicLibrary as library } from '../src/opponent/rules.ts';
import { specification } from '../src/opponent/content.ts';

const production = process.argv.includes('--production');
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';
const dataDirectory = resolve(process.env.DATA_DIR || 'data');
mkdirSync(dataDirectory, { recursive: true });
const sessions = createMapSessions(loadGeographicRules(), dataDirectory);
const opponents = createOpponentSessions(dataDirectory, undefined, sessions.capture);
const subscribers = new Map([...sessions.keys()].map(id => [id, new Map<ServerResponse,CaptureContext>()]));
const vite = production ? null : await (await import('vite')).createServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
const send = (res: ServerResponse, status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const server = createServer(async (req, res) => {
  try {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/scenario.html') {
    res.writeHead(302, { Location: '/pacific.html' }); res.end(); return;
  }
  if (await handleCapture(req,res,url,sessions.capture,mapId=>{const session=sessions.get(mapId);if(session)subscribers.get(mapId)?.forEach((context,response)=>{try{const view=session.getState(context);response.write(`data: ${JSON.stringify(view)}\n\n`);}catch{response.end();}});})) return;
  if (url.pathname.startsWith('/api/opponents/')) {
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(res, 403, { error: 'Origin rejected.' });
    const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
    const id = url.searchParams.get('run') ?? '';
    const side = url.searchParams.get('side') === 'red' ? 'red' : 'blue';
    try {
      if (req.method === 'GET' && url.pathname === '/api/opponents/catalog') return send(res, 200, library.scenarios.map(s => ({ ...s, objectives: specification(s.id).objectives, guidance: specification(s.id).guidance })));
      if (req.method === 'GET' && url.pathname === '/api/opponents/state') return send(res, 200, opponents.get(id, token, side));
      if (req.method === 'GET' && url.pathname === '/api/opponents/learning') return send(res,200,opponents.learning(id,token));
      if (req.method === 'GET' && url.pathname === '/api/opponents/export') return send(res, 200, opponents.export(id, token));
      if (req.method !== 'POST') return send(res, 404, { error: 'Unknown opponent endpoint.' });
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 32000) return send(res, 413, { error: 'Opponent request too large.' }); }
      const input = JSON.parse(body);
      if (url.pathname === '/api/opponents/presented') { opponents.presented(id,token,input.observationId);return send(res,200,{recorded:true}); }
      if (url.pathname === '/api/opponents/note') return send(res,201,{id:opponents.annotate(id,token,input)});
      if (url.pathname === '/api/opponents/create') return send(res, 201, await opponents.create({ ...input, geographic: true }));
      if (url.pathname === '/api/opponents/command') return send(res, 200, await opponents.submit(id, token, input, side));
      return send(res, 404, { error: 'Unknown opponent endpoint.' });
    } catch (error) { return send(res, error&&typeof error==='object'&&'storageFailure' in error?503:400, { error: error instanceof Error ? error.message : 'Invalid opponent request.' }); }
  }
  const mapId = url.searchParams.get('map') || '';
  const activeSession = sessions.get(mapId);
  const activeSubscribers = subscribers.get(mapId);
  const apiPath = url.pathname.replace('/api/maps/', '/api/');
  if (url.pathname.startsWith('/api/')) {
    if (!url.pathname.startsWith('/api/maps/') || !activeSession || !activeSubscribers) return send(res, 404, { error: 'Unknown map or endpoint.' });
  const context=captureContext(req,res,sessions.capture);
  const deliver=(response:ServerResponse,state:ReturnType<typeof activeSession.getState>)=>{if(state.observationId)response.once('finish',()=>{try{sessions.capture.delivered(state.observationId!);}catch{}});};
  if (apiPath === '/api/state' && req.method === 'GET') { const state=activeSession.getState(context);deliver(res,state);return send(res,200,state); }
  if (apiPath === '/api/events' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const initial=activeSession.getState(context);
    res.write(`data: ${JSON.stringify(initial)}\n\n`,()=>{try{if(initial.observationId)sessions.capture.delivered(initial.observationId);}catch{}});
    activeSubscribers.set(res,context);
    const timer = setInterval(() => res.write(': heartbeat\n\n'), 15000);
    req.on('close', () => { clearInterval(timer); activeSubscribers.delete(res); });
    return;
  }
  if (apiPath === '/api/command' && req.method === 'POST') {
    // Trusted cooperative exercise: server-issued pseudonymous seats, shared information.
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(res, 403, { error: 'Origin rejected.' });
    try {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 8_000_000) { send(res, 413, { error: 'Request too large.' }); return; } }
      const result = activeSession.submit(JSON.parse(body),context);
      deliver(res,result.body.state);
      send(res, result.status, result.body);
      if (result.status === 200 && !result.body.duplicate) activeSubscribers.forEach((actor,s) => {
        try { const view=activeSession.getState(actor);s.write(`data: ${JSON.stringify(view)}\n\n`,()=>{try{if(view.observationId)sessions.capture.delivered(view.observationId);}catch{}}); }
        catch { s.end(); activeSubscribers.delete(s); }
      });
    } catch { send(res, 400, { error: 'Invalid request.' }); }
    return;
  }
    return send(res, 404, { error: 'Not found.' });
  }
  if (vite) return vite.middlewares(req, res);
  const root = resolve('dist');
  let path = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!path.startsWith(root + sep) && path !== root) return send(res, 403, { error: 'Invalid path.' });
  if (!extname(path)) path = resolve(root, 'index.html');
  if (!existsSync(path)) return send(res, 404, { error: 'Not found.' });
  const type = ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' } as Record<string, string>)[extname(path)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  createReadStream(path).pipe(res);
  } catch(error) { console.error('Request failed:',error instanceof Error?error.message:'unknown');if(!res.headersSent)send(res,503,{error:'Exercise storage is temporarily unavailable. Retry without changing your command ID.'});else res.end(); }
});
server.listen(port, host, () => console.log(`XRiegsspiel ${production ? 'production' : 'development'}: http://${host}:${(server.address() as {port:number}).port}`));
process.on('SIGINT', () => { [...subscribers.values()].forEach(group => group.forEach((_actor,s) => s.end())); server.close(()=>sessions.capture.close()); void vite?.close(); });
