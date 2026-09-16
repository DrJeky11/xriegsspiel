export interface PanelButton { label: string; run: () => void; enabled?: boolean }
export interface TablePanel {
  title: string; lines: string[]; buttons: PanelButton[];
  keyboard?: { value: string; key: (key: string) => void; done: () => void };
}
export interface PanelTarget extends PanelButton { x: number; y: number; width: number; height: number }
/** Shared drawing and hit geometry for both terrain renderers. */
export function panelTargets(panel: TablePanel): PanelTarget[] {
  if (!panel.keyboard) return panel.buttons.slice(0, 7).map((button, i) => ({ ...button, x: 38, y: 480 + i * 94, width: 948, height: 84 }));
  const keyboard = panel.keyboard, targets: PanelTarget[] = [];
  ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM', '0123456789-'].forEach((row, r) => {
    [...row].forEach((key, i) => targets.push({ label: key, run: () => keyboard.key(key), x: 38 + i * 948 / row.length, y: 480 + r * 100, width: 948 / row.length - 8, height: 84 }));
  });
  ['Space', 'Backspace', 'Clear'].forEach((key, i) => targets.push({ label: key, run: () => keyboard.key(key), x: 38 + i * 316, y: 880, width: 308, height: 84 }));
  targets.push({ label: 'Done / show results', run: keyboard.done, x: 38, y: 980, width: 948, height: 84 });
  return targets;
}
export function activatePanel(panel: TablePanel, u: number, v: number) {
  const x = u * 1024, y = (1 - v) * 1280;
  const target = panelTargets(panel).find(t => x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height);
  if (target && target.enabled !== false) { target.run(); return true; }
  return false;
}
export function editSearch(value: string, key: string) {
  return key === 'Clear' ? '' : key === 'Backspace' ? value.slice(0, -1) : (value + (key === 'Space' ? ' ' : key)).slice(0, 80);
}
export function drawPanel(canvas: HTMLCanvasElement, panel: TablePanel) {
  if (canvas.width !== 1024 || canvas.height !== 1280) { canvas.width = 1024; canvas.height = 1280; }
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#142e37'; c.fillRect(0, 0, 1024, 1280);
  c.fillStyle = '#eed5a4'; c.font = 'bold 42px sans-serif'; c.fillText(panel.title, 38, 64, 948);
  c.fillStyle = '#f0ecdf'; c.font = '30px sans-serif';
  panel.lines.slice(0, 8).forEach((line, i) => c.fillText(line, 38, 125 + i * 43, 948));
  for (const target of panelTargets(panel)) {
    c.fillStyle = target.enabled === false ? '#203a43' : '#304d53'; c.fillRect(target.x, target.y, target.width, target.height);
    c.fillStyle = target.enabled === false ? '#809797' : '#f1ead6'; c.font = '32px sans-serif';
    c.fillText(target.label, target.x + 16, target.y + 54, target.width - 32);
  }
  c.fillStyle = '#c1d3cc'; c.font = '24px sans-serif';
  c.fillText('Point & trigger · Left stick: move · Right stick: height / rotate', 38, 1180, 948);
  c.fillText('Each map keeps its own pieces and progress.', 38, 1230, 948);
}
