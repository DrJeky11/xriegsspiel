import './terrain-menu.css';

export const terrainMenuControls = `
  <div class="terrain-corner-tools" aria-label="Map display">
    <button id="map-labels" type="button" aria-pressed="false" title="Show place labels">Labels off</button>
    <button id="map-menu-toggle" type="button" aria-expanded="false" aria-controls="map-menu"><span aria-hidden="true">☰</span> Menu</button>
  </div>`;

export const terrainMenuHeading = `
  <div class="terrain-menu-heading"><h2>Map menu</h2><button id="map-menu-close" type="button" aria-label="Close map menu">×</button></div>`;

/** Shared, nonmodal map drawer. Opening it never resizes or resets the canvas. */
export function initTerrainMenu(onLabelsChange: (visible: boolean) => void) {
  const layout = document.querySelector<HTMLElement>('.terrain-layout')!;
  const drawer = document.getElementById('map-menu')!;
  const toggle = document.getElementById('map-menu-toggle') as HTMLButtonElement;
  const close = document.getElementById('map-menu-close') as HTMLButtonElement;
  const labels = document.getElementById('map-labels') as HTMLButtonElement;
  let open = false;
  let labelsVisible = false;

  function setOpen(next: boolean) {
    open = next;
    // Move focus out before hiding descendants from keyboard/assistive technology.
    if (!open && drawer.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    drawer.inert = !open;
    drawer.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    layout.classList.toggle('menu-open', open);
    if (open) close.focus({ preventScroll: true });
  }

  toggle.onclick = () => setOpen(!open);
  close.onclick = () => setOpen(false);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open && !document.body.classList.contains('xr-active')) {
      event.preventDefault();
      setOpen(false);
    }
  });
  labels.onclick = () => {
    labelsVisible = !labelsVisible;
    labels.setAttribute('aria-pressed', String(labelsVisible));
    labels.textContent = labelsVisible ? 'Labels on' : 'Labels off';
    labels.title = labelsVisible ? 'Hide place labels' : 'Show place labels';
    onLabelsChange(labelsVisible);
  };
  onLabelsChange(labelsVisible);
  return { get labelsVisible() { return labelsVisible; } };
}
