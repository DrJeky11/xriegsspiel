import { ensureOpponentTerrain } from '../server/opponent-terrain.ts';
ensureOpponentTerrain();
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { baseline } from '../src/opponent/policy.ts';
import type { RunView } from '../server/opponent-session.ts';
import type { Side } from '../src/opponent/types.ts';

async function start(directory: string) {
  const child = spawn(process.execPath, ['server/main.ts', '--production'], { env: { ...process.env, PORT: '0', DATA_DIR: directory }, stdio: ['ignore', 'pipe', 'pipe'] });
  const url = await new Promise<string>((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Opponent test service did not start: ' + output)); }, 15000);
    child.stdout.on('data', chunk => { output += chunk; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]); } });
    child.stderr.on('data', chunk => { output += chunk; });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Opponent test service exited (${code}): ${output}`)); });
  });
  return { url, async stop() { if (child.exitCode !== null || child.signalCode) return; await new Promise<void>(resolve => { child.once('exit', () => resolve()); child.kill('SIGKILL'); }); } };
}

test('real HTTP and worker matches complete all scenarios in both roles, survive restart and preserve map assemblies', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'xr-opponent-http-')); let service = await start(directory);
  try {
    const request = async (path: string, token = '', body?: unknown) => {
      const response = await fetch(service.url + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body === undefined ? undefined : JSON.stringify(body) });
      const data = await response.json(); assert.ok(response.ok, data.error); return data;
    };
    const mapIds = ['palawan-spratlys/overview', 'palawan-spratlys/focus', 'taiwan-senkaku/overview', 'taiwan-senkaku/focus', 'hormuz', 'bab-al-mandeb'];
    const originalMaps = await Promise.all(mapIds.map(id => request('/api/maps/state?map=' + id)));
    const catalog = await request('/api/opponents/catalog'); assert.equal(catalog.length, 8);
    const completed: { id: string; token: string; state: RunView }[] = [];
    for (const scenario of catalog) for (const humanSide of ['blue', 'red'] as Side[]) {
      const created = await request('/api/opponents/create', '', { scenarioId: scenario.id, humanSide, difficulty: 'standard', seed: 19, ...(scenario.id === 'SPR-H01' ? { variant: 'short-window/1' } : {}) });
      let state = created.state as RunView; assert.ok(state.observation.geography); assert.equal(state.observation.scenario.version,'2.0.0');
      const path = `?run=${state.id}&side=${humanSide}`, token = created.playerToken;
      assert.equal((await fetch(service.url + '/api/opponents/state' + path)).ok, false);
      assert.equal((await fetch(service.url + '/api/opponents/export' + path, { headers: { Authorization: `Bearer ${token}` } })).ok, false);
      while (state.phase !== 'complete') {
        const operation = state.phase === 'review' ? { type: 'next' } : { type: 'orders', side: humanSide, orders: baseline(state.observation, 'deadline', state.observation.round) };
        const command = { id: crypto.randomUUID(), revision: state.revision, operation };
        const response = await request('/api/opponents/command' + path, token, command); state = response.state;
        const retry = await request('/api/opponents/command' + path, token, command);
        assert.equal(retry.duplicate, true); assert.equal(retry.state.revision, state.revision);
      }
      assert.equal(state.audit.length, 0, 'real workers must complete without fallback in this fixture');
      assert.equal(state.review.length, scenario.rounds); assert.notEqual(state.result!.outcome, 'incomplete');
      const exported = await request('/api/opponents/export' + path, token);
      assert.deepEqual(exported.result, state.result);
      assert.ok(!JSON.stringify(exported).includes(token));
      completed.push({ id: state.id, token, state });
    }
    await service.stop(); service = await start(directory);
    for (const run of completed) assert.deepEqual(await request('/api/opponents/state?run=' + run.id, run.token), run.state);
    for (const [index, id] of mapIds.entries()) {
      const current = await request('/api/maps/state?map=' + id);
      assert.deepEqual(current.exercise, originalMaps[index].exercise); assert.equal(current.revision, originalMaps[index].revision);
    }
    const rejected = await fetch(service.url + '/api/opponents/create', { method: 'POST', headers: { Origin: 'http://unrelated.example', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(rejected.status, 403);
  } finally { await service.stop(); rmSync(directory, { recursive: true, force: true }); }
});
