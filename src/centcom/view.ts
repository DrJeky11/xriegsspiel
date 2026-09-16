import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import coastlines from './coastlines.json';
import { project, tileAt } from './terrain.ts';
import type { TerrainMap, Tile, TerrainKind } from './terrain.ts';
import type { Landmark } from './regions.ts';

export const COLORS: Record<TerrainKind, string> = {
  water: '#28556a', 'coastal-water': '#417f88', coast: '#acbba6', land: '#d7c9a3', upland: '#a99574',
};
type PanelAction = { label: string; action: () => void };

export class TerrainView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(43, 1, .01, 30);
  readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  readonly board = new THREE.Group();
  readonly controls: OrbitControls;
  readonly stats = { frames: 0, xrFrames: 0, drawCalls: 0, triangles: 0 };
  private terrain = new THREE.Group();
  private labels = new THREE.Group();
  private coastline = new THREE.LineSegments();
  private mesh: THREE.InstancedMesh | null = null;
  private map: TerrainMap | null = null;
  private unitScale = 1;
  private ray = new THREE.Raycaster();
  private marker = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .004, 6), new THREE.MeshBasicMaterial({ color: '#f4c86d', transparent: true, opacity: .8, depthTest: false }));
  private selected: Tile | null = null;
  private selectedLabel: THREE.Sprite | null = null;
  private canvas = document.createElement('canvas');
  private texture: THREE.CanvasTexture;
  private panel: THREE.Mesh;
  private controllers: THREE.Group[] = [];
  private inputSources = new Map<THREE.Group, XRInputSource>();
  private recenterNeeded = false;
  private lastTime = 0;
  private pointerStart = [0, 0];
  private flat = false;
  private relief = true;
  private panelActions: PanelAction[] = [];
  private resizeObserver: ResizeObserver;
  private northArrow = document.getElementById('north-arrow');
  private northPoint = new THREE.Vector3();
  private centerPoint = new THREE.Vector3();

  constructor(container: HTMLElement, private onSelect: (tile: Tile) => void, private onMode: (active: boolean) => void, private onSwitch: () => void) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor('#122b34');
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    this.renderer.domElement.setAttribute('aria-label', 'CENTCOM hex terrain. Click a tile to inspect it, or use the landmark selector and hex coordinate fields.');
    container.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.controls.minDistance = .15;
    this.controls.maxDistance = 6;
    this.controls.maxPolarAngle = Math.PI / 2.15;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    this.scene.add(this.board, new THREE.HemisphereLight('#fff9ed', '#667b87', 2.7));
    const sun = new THREE.DirectionalLight('#fff2d1', 2.1); sun.position.set(-2, 4, -1); this.scene.add(sun);
    this.board.add(this.terrain, this.labels, this.marker);
    this.marker.visible = false; this.marker.renderOrder = 5;
    this.canvas.width = 800; this.canvas.height = 960;
    this.texture = new THREE.CanvasTexture(this.canvas); this.texture.colorSpace = THREE.SRGBColorSpace;
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(.43, .516), new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide }));
    this.panel.position.set(1.16, .25, 0); this.panel.rotation.x = -Math.PI / 3;
    this.panel.visible = false; this.board.add(this.panel);
    this.renderer.domElement.addEventListener('pointerdown', event => { this.pointerStart = [event.clientX, event.clientY]; });
    this.renderer.domElement.addEventListener('pointerup', event => {
      if (event.button !== 0 || Math.hypot(event.clientX - this.pointerStart[0], event.clientY - this.pointerStart[1]) > 6 || this.renderer.xr.isPresenting) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), this.camera);
      this.pick();
    });
    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      controller.addEventListener('connected', event => this.inputSources.set(controller, event.data));
      controller.addEventListener('disconnected', () => this.inputSources.delete(controller));
      controller.addEventListener('select', () => {
        this.ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.ray.ray.direction.set(0, 0, -1).transformDirection(controller.matrixWorld);
        this.pick();
      });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -4)]), new THREE.LineBasicMaterial({ color: '#f4c86d' }));
      controller.add(line); this.scene.add(controller); this.controllers.push(controller);
    }
    this.renderer.xr.addEventListener('sessionstart', () => { this.panel.visible = true; this.recenterNeeded = true; this.controls.enabled = false; this.onMode(true); });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.panel.visible = false; this.renderer.setClearColor('#122b34', 1); this.controls.enabled = true;
      this.reset(); this.resize(container); this.onMode(false);
    });
    this.resizeObserver = new ResizeObserver(() => this.resize(container));
    this.resizeObserver.observe(container); this.resize(container); this.reset();
    this.renderer.setAnimationLoop((time, frame) => this.animate(time, frame));
  }

  private disposeObject(object: THREE.Object3D) {
    object.traverse(child => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Sprite) {
        if ('geometry' in child) child.geometry.dispose();
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
          if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
          material.dispose();
        }
        if (child instanceof THREE.InstancedMesh) child.dispose();
      }
    });
  }
  load(map: TerrainMap) {
    for (const child of [...this.terrain.children]) { this.disposeObject(child); this.terrain.remove(child); }
    for (const child of [...this.labels.children]) { this.disposeObject(child); this.labels.remove(child); }
    this.selectedLabel = null; this.selected = null; this.marker.visible = false;
    this.map = map; this.unitScale = 1.65 / Math.max(map.widthKm, map.heightKm);
    const radius = map.region.spacingKm / Math.sqrt(3) * this.unitScale;
    this.mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(radius * .975, radius * .975, 1, 6), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), map.tiles.length);
    const transform = new THREE.Object3D(), color = new THREE.Color();
    for (let i = 0; i < map.tiles.length; i++) {
      const tile = map.tiles[i], height = this.height(tile);
      transform.position.set(tile.xKm * this.unitScale, height / 2, -tile.yKm * this.unitScale);
      transform.scale.set(1, height, 1); transform.updateMatrix();
      this.mesh.setMatrixAt(i, transform.matrix);
      color.set(COLORS[tile.terrain]);
      // A subtle deterministic relief tint keeps adjacent uplands legible.
      if (tile.terrain === 'upland') color.multiplyScalar(1 - tile.relief * .13);
      this.mesh.setColorAt(i, color);
    }
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor!.needsUpdate = true;
    this.mesh.computeBoundingSphere(); this.terrain.add(this.mesh);
    const points: THREE.Vector3[] = [];
    const [west, south, east, north] = map.region.bounds;
    for (const ring of coastlines.regions[map.region.id]) for (let i = 1; i < ring.length; i++) {
      // Do not draw clipping edges outside the visible center-bounded tile field.
      const pair = [ring[i - 1], ring[i]];
      if (pair.some(([lon, lat]) => lon < west || lon > east || lat < south || lat > north)) continue;
      for (const p of pair) { const [x, y] = project(p as [number, number], map.region.origin); points.push(new THREE.Vector3(x * this.unitScale, .027, -y * this.unitScale)); }
    }
    this.coastline = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#e6e2bf', transparent: true, opacity: .7, depthTest: false }));
    this.coastline.renderOrder = 2; this.terrain.add(this.coastline);
    for (const landmark of map.region.landmarks) {
      const [x, y] = project(landmark.location, map.region.origin);
      if (landmark.kind === 'region' || landmark.kind === 'water') {
        if (landmark.name === map.region.title) continue;
        const sprite = this.label(landmark.name, landmark.kind === 'water' ? '#c1dce0' : '#3b413a', landmark.kind === 'region');
        sprite.position.set(x * this.unitScale, .11, -y * this.unitScale); this.labels.add(sprite);
      } else {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(.0035, 8, 6), new THREE.MeshBasicMaterial({ color: '#fcdfa1' }));
        dot.position.set(x * this.unitScale, .04, -y * this.unitScale); this.labels.add(dot);
      }
    }
    this.drawPanel();
    if (!this.renderer.xr.isPresenting) this.reset();
  }
  private height(tile: Tile) {
    if (!this.relief) return .009;
    if (tile.terrain === 'water' || tile.terrain === 'coastal-water') return .007;
    return .017 + tile.relief * .04;
  }
  setRelief(enabled: boolean) {
    this.relief = enabled;
    if (!this.map || !this.mesh) return;
    const transform = new THREE.Object3D();
    this.map.tiles.forEach((tile, i) => {
      const height = this.height(tile);
      transform.position.set(tile.xKm * this.unitScale, height / 2, -tile.yKm * this.unitScale);
      transform.scale.set(1, height, 1); transform.updateMatrix(); this.mesh!.setMatrixAt(i, transform.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.computeBoundingSphere();
    if (this.selected) this.marker.position.y = this.height(this.selected) + .005;
  }
  setLabels(enabled: boolean) { this.labels.visible = enabled; }
  setCoastline(enabled: boolean) { this.coastline.visible = enabled; }
  setFlat(flat: boolean) { this.flat = flat; this.reset(); }
  private label(text: string, color: string, bold = false) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${bold ? '600' : 'italic 400'} 68px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = bold ? '#d7c9a3' : '#28556a'; ctx.lineWidth = 7; ctx.strokeText(text, 384, 48);
    ctx.fillStyle = color; ctx.fillText(text, 384, 48);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.scale.set(.42, .0525, 1); sprite.renderOrder = 4; return sprite;
  }
  select(tile: Tile, landmark?: Landmark) {
    if (!this.map) return;
    this.selected = tile;
    const radius = this.map.region.spacingKm / Math.sqrt(3) * this.unitScale;
    this.marker.visible = true; this.marker.scale.set(radius * 1.02, 1, radius * 1.02);
    this.marker.position.set(tile.xKm * this.unitScale, this.height(tile) + .005, -tile.yKm * this.unitScale);
    if (this.selectedLabel) { this.labels.remove(this.selectedLabel); this.disposeObject(this.selectedLabel); this.selectedLabel = null; }
    if (landmark) {
      this.selectedLabel = this.label(landmark.name, '#ffe6a7');
      this.selectedLabel.position.copy(this.marker.position).y += .08; this.labels.add(this.selectedLabel);
    }
    this.drawPanel(landmark?.name);
  }
  focus(landmark: Landmark) {
    if (!this.map) return;
    const tile = tileAt(this.map, landmark.location); if (!tile) return;
    this.onSelect(tile); this.select(tile, landmark);
    if (!this.renderer.xr.isPresenting) {
      this.controls.target.set(tile.xKm * this.unitScale, 0, -tile.yKm * this.unitScale);
      this.camera.position.copy(this.controls.target).add(new THREE.Vector3(0, this.flat ? .9 : .68, this.flat ? .001 : .48)); this.controls.update();
    }
  }
  zoom(factor: number) {
    if (this.renderer.xr.isPresenting) this.board.scale.setScalar(THREE.MathUtils.clamp(this.board.scale.x * factor, .4, 1.8));
    else { this.camera.position.sub(this.controls.target).multiplyScalar(1 / factor).add(this.controls.target); this.controls.update(); }
  }
  reset() {
    if (this.renderer.xr.isPresenting) { this.recenterNeeded = true; return; }
    this.board.position.set(0, 0, 0); this.board.rotation.set(0, 0, 0); this.board.scale.setScalar(1);
    const factor = Math.max(1, 1 / this.camera.aspect);
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, (this.flat ? 2.55 : 2.15) * factor, this.flat ? .001 : 1.25 * factor); this.controls.update();
  }
  async enter(mode: 'immersive-vr' | 'immersive-ar') {
    if (!navigator.xr) throw new Error('WebXR is unavailable in this browser.');
    const session = await navigator.xr.requestSession(mode, { requiredFeatures: ['local-floor'] });
    try { this.renderer.setClearColor('#122b34', mode === 'immersive-ar' ? 0 : 1); await this.renderer.xr.setSession(session); }
    catch (error) { this.renderer.setClearColor('#122b34', 1); await session.end(); throw error; }
  }
  private pick() {
    if (!this.mesh || !this.map) return;
    const hit = this.ray.intersectObjects(this.panel.visible ? [this.mesh, this.panel] : [this.mesh], false)[0];
    if (hit?.object === this.panel && hit.uv) {
      const y = (1 - hit.uv.y) * 960, index = Math.floor((y - 420) / 86);
      if (y >= 420 && y <= 420 + this.panelActions.length * 86 && (y - 420) % 86 < 72) this.panelActions[index]?.action();
    } else if (hit?.instanceId !== undefined) this.onSelect(this.map.tiles[hit.instanceId]);
  }
  private drawPanel(name?: string) {
    if (!this.map) return;
    const ctx = this.canvas.getContext('2d')!;
    ctx.fillStyle = '#152d35'; ctx.fillRect(0, 0, 800, 960);
    ctx.fillStyle = '#f6efdc'; ctx.font = '600 38px system-ui'; ctx.fillText(this.map.region.title, 36, 66);
    ctx.font = '28px system-ui'; ctx.fillStyle = '#b3c9c9'; ctx.fillText(`${this.map.region.spacingKm} km between hex centers`, 36, 110);
    ctx.fillStyle = '#f4cc81'; ctx.font = '32px system-ui'; ctx.fillText(name || (this.selected ? `Hex ${this.selected.q}, ${this.selected.r}` : 'Point at a hex and pull the trigger'), 36, 184, 735);
    ctx.fillStyle = '#f6efdc'; ctx.font = '28px system-ui';
    if (this.selected) {
      ctx.fillText(`${this.selected.terrain} · center: ${this.selected.centerSurface}`, 36, 230);
      ctx.fillText(`${this.selected.center[1].toFixed(3)}° N / ${this.selected.center[0].toFixed(3)}° E`, 36, 275);
    }
    ctx.fillStyle = '#b3c9c9'; ctx.font = '25px system-ui';
    ctx.fillText('Generalized coastline · illustrative relief', 36, 340);
    ctx.fillText('Elevation and depth are not measured.', 36, 378);
    this.panelActions = [
      { label: 'Switch region', action: this.onSwitch },
      { label: 'Larger table', action: () => this.zoom(1.2) },
      { label: 'Smaller table', action: () => this.zoom(1 / 1.2) },
      { label: 'Recenter table', action: () => this.reset() },
      { label: 'Exit immersive view', action: () => { void this.renderer.xr.getSession()?.end(); } },
    ];
    this.panelActions.forEach((button, i) => {
      ctx.fillStyle = '#2b4b53'; ctx.fillRect(30, 420 + i * 86, 740, 72);
      ctx.fillStyle = '#f6efdc'; ctx.font = '30px system-ui'; ctx.fillText(button.label, 52, 466 + i * 86);
    });
    ctx.fillStyle = '#b3c9c9'; ctx.font = '22px system-ui'; ctx.fillText('Left stick: move · Right stick: height / rotate', 36, 915);
    this.texture.needsUpdate = true;
  }
  private resize(container: HTMLElement) {
    if (this.renderer.xr.isPresenting) return;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.camera.aspect = container.clientWidth / Math.max(1, container.clientHeight); this.camera.updateProjectionMatrix();
  }
  private animate(time: number, frame?: XRFrame) {
    const dt = Math.min((time - this.lastTime) / 1000, .05); this.lastTime = time;
    this.stats.frames++;
    if (this.renderer.xr.isPresenting && frame) {
      this.stats.xrFrames++;
      if (this.recenterNeeded) {
        const space = this.renderer.xr.getReferenceSpace(), pose = space && frame.getViewerPose(space);
        if (pose) {
          const { position: p, orientation: q } = pose.transform;
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)); forward.y = 0; forward.normalize();
          this.board.position.set(p.x + forward.x * .95, p.y - .53, p.z + forward.z * .95);
          this.board.rotation.set(0, Math.atan2(-forward.x, -forward.z), 0); this.board.scale.setScalar(.8); this.recenterNeeded = false;
        }
      }
      for (const controller of this.controllers) {
        const source = this.inputSources.get(controller), axes = source?.gamepad?.axes;
        if (axes && axes.length >= 4) {
          const x = Math.abs(axes[2]) > .2 ? axes[2] : 0, y = Math.abs(axes[3]) > .2 ? axes[3] : 0;
          if (source?.handedness === 'left') this.board.position.addScaledVector(new THREE.Vector3(x, 0, y).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.board.rotation.y), dt * .4);
          else { this.board.position.y = THREE.MathUtils.clamp(this.board.position.y - y * dt * .3, .2, 1.5); this.board.rotation.y -= x * dt * .7; }
        }
      }
    } else {
      this.controls.update();
      if (this.northArrow) {
        this.centerPoint.set(0, 0, 0); this.board.localToWorld(this.centerPoint).project(this.camera);
        this.northPoint.set(0, 0, -.5); this.board.localToWorld(this.northPoint).project(this.camera);
        const angle = Math.atan2((this.northPoint.x - this.centerPoint.x) * this.camera.aspect, this.northPoint.y - this.centerPoint.y);
        this.northArrow.style.transform = `rotate(${angle}rad)`;
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.stats.drawCalls = this.renderer.info.render.calls; this.stats.triangles = this.renderer.info.render.triangles;
  }
}
