interface Stage { name: string; startMs: number; durationMs: number; status: 'complete' | 'failed' }
/** Local timings only. Navigation-to-code includes transfer, parsing and evaluation, not just bytes. */
export const loading = new class {
  private stages: Stage[] = [{name:'Navigation to application code', startMs:0, durationMs:performance.now(), status:'complete'}];
  private pending = new Set<string>();
  private readyMs: number | null = null;
  private error: string | null = null;
  constructor() { Object.defineProperty(window, '__loading', {get: () => this.snapshot()}); }
  private paint() {
    const element = document.getElementById('load-progress');
    if (element) element.textContent = this.error ? `Loading failed: ${this.error}. Reload to retry.` : `Loading · ${[...this.pending].join(' · ') || 'Preparing map'}…`;
  }
  async measure<T>(name: string, run: () => T | Promise<T>): Promise<T> {
    this.pending.add(name); this.paint();
    // Let the progress label paint before synchronous map/classification work.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const startMs = performance.now();
    try { const result = await run(); this.stages.push({name,startMs,durationMs:performance.now()-startMs,status:'complete'}); return result; }
    catch (error) { this.stages.push({name,startMs,durationMs:performance.now()-startMs,status:'failed'}); this.fail(error); throw error; }
    finally { this.pending.delete(name); this.paint(); }
  }
  fail(error: unknown) { this.error = error instanceof Error ? error.message : String(error); this.paint(); }
  async finish() {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    this.readyMs = performance.now();
    document.getElementById('load-progress')?.remove();
    const details = document.createElement('details'), summary = document.createElement('summary'), copy = document.createElement('p'), button = document.createElement('button');
    summary.textContent = 'Loading measurements';
    copy.textContent = `Ready after ${(this.readyMs/1000).toFixed(2)} s on this device. Stages overlap; their durations should not be added. Cache and device affect each run.`;
    button.textContent = 'Export loading timings';
    button.onclick = () => { const url=URL.createObjectURL(new Blob([JSON.stringify(this.snapshot(),null,2)],{type:'application/json'})); const link=document.createElement('a'); link.href=url;link.download='xriegsspiel-load-timings.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000); };
    const list = document.createElement('ul');
    for (const stage of this.stages) { const item = document.createElement('li'); item.textContent = `${stage.name}: ${stage.durationMs.toFixed(0)} ms (${stage.status})`; list.append(item); }
    details.append(summary,copy,list,button); document.getElementById('terrain-controls')?.append(details);
  }
  private snapshot() {
    return {version:'load-timing/1',userAgent:navigator.userAgent,readyMs:this.readyMs,error:this.error,pending:[...this.pending],stages:structuredClone(this.stages),resources:performance.getEntriesByType('resource').filter(e=>e.name.startsWith(location.origin)).map(e=>{const r=e as PerformanceResourceTiming;return {path:new URL(r.name).pathname,durationMs:r.duration,transferBytes:r.transferSize,encodedBytes:r.encodedBodySize};})};
  }
}();
