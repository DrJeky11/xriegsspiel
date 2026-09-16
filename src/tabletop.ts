import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MAP, WIDTH, HEIGHT, DEPOT, cellName, routes, isEnded, evaluate } from './game.ts';
import type { Action, State } from './game.ts';

export interface TableModel { state: State; selected: string | null; draft: Action | null; message: string; online: boolean; busy: boolean }
export interface SpatialButton { label: string; enabled: boolean; action: () => void }
export interface TableActions { pick: (cell: number) => void; buttons: () => SpatialButton[]; mode: (active: boolean) => void }
const TILE = .17;
const position = (id: number) => new THREE.Vector3((MAP[id].x - (WIDTH - 1) / 2) * TILE, 0, (MAP[id].z - (HEIGHT - 1) / 2) * TILE);
const colors = { water: '#456367', plain: '#a7ac83', forest: '#758a6b', ridge: '#a5a088', road: '#c3b794' };

export class Tabletop {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, .01, 30);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  board = new THREE.Group();
  controls: OrbitControls;
  ray = new THREE.Raycaster();
  targets: THREE.Object3D[] = [];
  tiles = new Map<number, THREE.Mesh>();
  tokens = new Map<string, THREE.Group>();
  route = new THREE.Group();
  selection = new THREE.Group();
  panelCanvas = document.createElement('canvas');
  panelTexture: THREE.CanvasTexture;
  panel: THREE.Mesh;
  model: TableModel | null = null;
  xrMode: 'immersive-vr' | 'immersive-ar' = 'immersive-vr';
  recenterNeeded = false;
  hovered = -1;
  private controllers: THREE.Group[] = [];
  private sources = new Map<THREE.Group, XRInputSource>();
  private lastTime = 0;
  private pointerStart = { x: 0, y: 0 };
  private motionPaths = new Map<string, THREE.Vector3[]>();
  private buttonRegions: { y: number; button: SpatialButton }[] = [];
  private focus = new THREE.Mesh(new THREE.RingGeometry(.047, .054, 40), new THREE.MeshBasicMaterial({ color: '#f2cb70', side: THREE.DoubleSide, depthTest: false }));
  stats = { frames: 0, lastFrameMs: 0, xrFrames: 0, xrSessionStarts: 0, drawCalls: 0 };

  get tokenPositions() {
    return [...this.tokens].map(([id, token]) => ({ id, x: token.position.x, z: token.position.z }));
  }

  constructor(private container: HTMLElement, private actions: TableActions) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor('#d8dbcd');
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    this.renderer.xr.setFramebufferScaleFactor(1);
    this.renderer.domElement.setAttribute('aria-label', 'Interactive terrain board. Select a team then a highlighted location.');
    this.container.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 1.1;
    this.controls.maxDistance = 4.8;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_PAN };
    this.reset();
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#475046', 2.4));
    const sun = new THREE.DirectionalLight('#fff5d6', 3); sun.position.set(-2, 4, 3); this.scene.add(sun);
    this.scene.add(this.board);
    const base = new THREE.Mesh(new THREE.BoxGeometry(WIDTH * TILE + .06, .065, HEIGHT * TILE + .06), new THREE.MeshStandardMaterial({ color: '#243a36', roughness: .9 }));
    base.position.y = -.04; this.board.add(base);
    const tileGeometry = new THREE.BoxGeometry(TILE - .003, .035, TILE - .003);
    for (const cell of MAP) {
      const mesh = new THREE.Mesh(tileGeometry, new THREE.MeshStandardMaterial({ color: colors[cell.terrain], roughness: 1 }));
      mesh.position.copy(position(cell.id));
      mesh.position.y = cell.terrain === 'water' ? -.019 : 0;
      mesh.userData.cell = cell.id; this.board.add(mesh); this.targets.push(mesh); this.tiles.set(cell.id, mesh);
      if (cell.terrain === 'forest') {
        for (let n = 0; n < 3; n++) {
          const tree = new THREE.Mesh(new THREE.ConeGeometry(.018, .063, 5), new THREE.MeshStandardMaterial({ color: n % 2 ? '#52674b' : '#3e594c' }));
          tree.position.copy(mesh.position).add(new THREE.Vector3((n - 1) * .041, .047, n % 2 ? .029 : -.024)); this.board.add(tree);
        }
      }
      if (cell.terrain === 'ridge') {
        const hill = new THREE.Mesh(new THREE.ConeGeometry(.061, .09, 5), new THREE.MeshStandardMaterial({ color: '#bfb9a2', flatShading: true }));
        hill.position.copy(mesh.position).add(new THREE.Vector3(0, .045, 0)); this.board.add(hill);
      }
      if (cell.terrain === 'road') {
        const road = new THREE.Mesh(new THREE.PlaneGeometry(TILE, .037), new THREE.MeshBasicMaterial({ color: '#e3d8b8' }));
        road.rotation.x = -Math.PI / 2; road.position.copy(mesh.position).y = .019; this.board.add(road);
      }
    }
    for (let x = 0; x < WIDTH; x++) this.label(String.fromCharCode(65 + x), new THREE.Vector3((x - 4) * TILE, -.003, HEIGHT * TILE / 2 + .048), .065, '#243c36');
    for (let z = 0; z < HEIGHT; z++) this.label(String(z + 1), new THREE.Vector3(-WIDTH * TILE / 2 - .046, -.003, (z - 3) * TILE), .065, '#243c36');
    this.markLocation(DEPOT, 'DEPOT', '#304d49');
    this.markLocation(13, 'NORTH RELAY', '#896e39');
    this.markLocation(34, 'EAST HARBOR', '#896e39');
    this.board.add(this.route, this.selection, this.focus);
    this.focus.rotation.x = -Math.PI / 2; this.focus.visible = false;
    this.panelCanvas.width = 1024; this.panelCanvas.height = 1280;
    this.panelTexture = new THREE.CanvasTexture(this.panelCanvas); this.panelTexture.colorSpace = THREE.SRGBColorSpace;
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(.62, .775), new THREE.MeshBasicMaterial({ map: this.panelTexture, side: THREE.DoubleSide }));
    this.panel.position.set(1.02, .36, -.08); this.panel.rotation.y = -.32; this.panel.visible = false;
    this.panel.userData.panel = true; this.board.add(this.panel); this.targets.push(this.panel);
    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: '#efd394' }));
      line.scale.z = 2; controller.add(line); this.scene.add(controller); this.controllers.push(controller);
      controller.addEventListener('connected', event => { this.sources.set(controller, event.data); });
      controller.addEventListener('disconnected', () => this.sources.delete(controller));
      controller.addEventListener('select', () => this.controllerSelect(controller));
    }
    this.renderer.xr.addEventListener('sessionstart', () => {
      this.stats.xrSessionStarts++; this.controls.enabled = false; this.panel.visible = true;
      this.renderer.setClearColor('#142222', this.xrMode === 'immersive-ar' ? 0 : 1);
      this.recenterNeeded = true; this.actions.mode(true);
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.controls.enabled = true; this.panel.visible = false; this.renderer.setClearColor('#d8dbcd', 1); this.reset(); this.resize(); this.actions.mode(false);
    });
    this.renderer.domElement.addEventListener('pointerdown', e => { this.pointerStart = { x: e.clientX, y: e.clientY }; });
    this.renderer.domElement.addEventListener('pointerup', e => {
      if (e.button !== 0 || Math.hypot(e.clientX - this.pointerStart.x, e.clientY - this.pointerStart.y) > 6) return;
      const hit = this.pointerHit(e); if (hit && hit.object.userData.cell !== undefined) this.actions.pick(hit.object.userData.cell);
    });
    this.renderer.domElement.addEventListener('pointermove', e => {
      if (this.renderer.xr.isPresenting) return;
      const hit = this.pointerHit(e); this.hovered = hit?.object.userData.cell ?? -1;
      this.renderer.domElement.style.cursor = this.hovered >= 0 ? 'pointer' : 'default';
    });
    this.renderer.domElement.addEventListener('pointerleave', () => { this.hovered = -1; });
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop((time, frame) => this.animate(time, frame));
  }

  private label(text: string, pos: THREE.Vector3, height = .06, color = '#243c37') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = color; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 48);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * 512 / 96, height), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.copy(pos); this.board.add(mesh); return mesh;
  }
  private markLocation(id: number, title: string, color: string) {
    const p = position(id);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.054, .064, 32), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    ring.position.copy(p).y = .023; ring.rotation.x = -Math.PI / 2; this.board.add(ring);
    const badge = this.badge(`${title} · ${cellName(id)}`, .22, '#f1e5c6', '#3e4833');
    badge.position.copy(p).add(new THREE.Vector3(0, .105, -.065)); this.board.add(badge);
  }
  private badge(text: string, width: number, background: string, color: string) {
    const canvas = document.createElement('canvas'); canvas.width = text.length < 8 ? 256 : 512; canvas.height = 96;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, 96);
    ctx.fillStyle = color; ctx.font = 'bold 46px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, canvas.width / 2, 49, canvas.width - 32);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false })); sprite.scale.set(width, width * 96 / canvas.width, 1); sprite.renderOrder = 4; return sprite;
  }
  private pointerHit(e: PointerEvent) {
    const box = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2((e.clientX - box.left) / box.width * 2 - 1, -(e.clientY - box.top) / box.height * 2 + 1), this.camera);
    return this.ray.intersectObjects(this.targets.filter(t => t.visible), false)[0];
  }
  private controllerHit(controller: THREE.Group) {
    const rotation = new THREE.Matrix4().extractRotation(controller.matrixWorld);
    this.ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.ray.ray.direction.set(0, 0, -1).applyMatrix4(rotation);
    return this.ray.intersectObjects(this.targets.filter(t => t.visible), false)[0];
  }
  private controllerSelect(controller: THREE.Group) {
    const hit = this.controllerHit(controller); if (!hit) return;
    if (hit.object.userData.panel && hit.uv) {
      const y = (1 - hit.uv.y) * 1280;
      const region = this.buttonRegions.find(r => y >= r.y && y <= r.y + 85);
      if (region?.button.enabled) region.button.action();
    } else if (hit.object.userData.cell !== undefined) this.actions.pick(hit.object.userData.cell);
  }
  private clear(group: THREE.Group) {
    for (const child of [...group.children]) { group.remove(child); if (child instanceof THREE.Mesh || child instanceof THREE.Line) { child.geometry.dispose(); if (!Array.isArray(child.material)) child.material.dispose(); } }
  }
  update(model: TableModel) {
    const previous = this.model?.state;
    this.model = model;
    const reach = model.selected && !isEnded(model.state) ? routes(model.state, model.selected) : new Map();
    for (const [id, mesh] of this.tiles) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.set(colors[MAP[id].terrain]);
      if (reach.has(id)) material.color.lerp(new THREE.Color('#e6c783'), .43);
    }
    for (const unit of model.state.units) {
      let token = this.tokens.get(unit.id);
      if (!token) {
        token = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.044, .048, .023, 6), new THREE.MeshStandardMaterial({ color: '#233e39', roughness: .6 }));
        base.position.y = .027; token.add(base);
        const body = new THREE.Mesh(new THREE.BoxGeometry(.045, .021, .064), new THREE.MeshStandardMaterial({ color: '#f0dec0' })); body.position.y = .052; token.add(body);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(.039, .015, .021), new THREE.MeshStandardMaterial({ color: '#80938c' })); cab.position.set(0, .069, .017); token.add(cab);
        token.position.copy(position(unit.cell)); this.tokens.set(unit.id, token); this.board.add(token);
        const label = this.badge(unit.name.toUpperCase(), .115, '#233e39', '#f4efd9'); label.position.set(0, .125, .015); token.add(label);
      }
      const previousUnit = previous?.units.find(u => u.id === unit.id);
      if (previousUnit && previousUnit.cell !== unit.cell) {
        const event = model.state.events.at(-1);
        const isNextMove = model.state.revision === previous!.revision + 1 &&
          event?.action.type === 'move' && event.action.unitId === unit.id;
        const path = isNextMove ? routes(previous!, unit.id).get(unit.cell)?.path : undefined;
        if (path) {
          // Start from the authoritative previous cell, even if an older animation is unfinished.
          token.position.copy(position(path[0]));
          this.motionPaths.set(unit.id, path.slice(1).map(position));
        } else {
          // A reconnect or reset is a snapshot, not evidence of a traversed route.
          token.position.copy(position(unit.cell));
          this.motionPaths.delete(unit.id);
        }
      }
      token.userData.destination = position(unit.cell);
    }
    this.clear(this.selection); this.clear(this.route);
    const selected = model.state.units.find(u => u.id === model.selected);
    if (selected) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(.054, .063, 48), new THREE.MeshBasicMaterial({ color: '#f4cd77', side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.copy(position(selected.cell)).y = .03; this.selection.add(ring);
    }
    if (model.draft?.type === 'move' && model.selected) {
      const route = routes(model.state, model.selected).get(model.draft.to);
      if (route) {
        const points = route.path.map(id => position(id).add(new THREE.Vector3(0, .045, 0)));
        this.route.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#fff4d0', depthTest: false })));
        for (const p of points.slice(1)) {
          const dot = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff1bf', depthTest: false })); dot.position.copy(p); this.route.add(dot);
        }
      }
    }
    this.drawPanel();
  }
  private drawPanel() {
    if (!this.model) return;
    const { state, selected, message, online } = this.model;
    const ctx = this.panelCanvas.getContext('2d')!;
    ctx.fillStyle = '#162b27'; ctx.fillRect(0, 0, 1024, 1280);
    ctx.fillStyle = '#ecd9ae'; ctx.font = 'bold 48px sans-serif'; ctx.fillText('XRIEGSSPIEL', 44, 65);
    ctx.fillStyle = '#a4b8ac'; ctx.font = '30px sans-serif'; ctx.fillText(`ISLAND COORDINATION / ROUND ${Math.min(state.round, 5)} OF 5`, 44, 115);
    ctx.fillStyle = '#f3eedc'; ctx.font = '32px sans-serif';
    ctx.fillText(state.objectives.map(o => `${o.name}: ${o.received}/${o.need}`).join('     '), 44, 170);
    const unit = state.units.find(u => u.id === selected);
    ctx.font = 'bold 44px sans-serif'; ctx.fillText(unit ? `${unit.name} · ${cellName(unit.cell)}` : 'Select a transport', 44, 242);
    ctx.font = '34px sans-serif'; ctx.fillStyle = '#c5d0bd';
    ctx.fillText(unit ? `${unit.ap}/4 move points     Cargo ${unit.cargo}/2     Depot ${state.depot}` : 'Point at a piece, then pull the trigger.', 44, 295);
    ctx.font = '32px sans-serif'; ctx.fillStyle = online ? '#f1dfba' : '#ffb8a2';
    const words = (online ? message : 'Connection lost. Waiting for the local server.').split(' '); let line = '', y = 350;
    for (const word of words) { if (ctx.measureText(line + word).width > 910) { ctx.fillText(line, 44, y); line = ''; y += 39; } line += word + ' '; } ctx.fillText(line, 44, y);
    if (unit) {
      const service = evaluate(state, { type: unit.cell === DEPOT ? 'load' : 'deliver', unitId: unit.id });
      ctx.fillStyle = '#a6baad'; ctx.font = '27px sans-serif'; ctx.fillText(service.reason, 44, 463, 935);
    }
    this.buttonRegions = [];
    this.actions.buttons().slice(0, 7).forEach((button, i) => {
      const top = 495 + i * 99; ctx.fillStyle = button.enabled ? (i === 0 ? '#e7c887' : '#304c42') : '#243b34'; ctx.fillRect(40, top, 944, 85);
      ctx.fillStyle = button.enabled ? (i === 0 ? '#173027' : '#f3ebd8') : '#789085'; ctx.font = 'bold 34px sans-serif'; ctx.fillText(button.label, 65, top + 54);
      this.buttonRegions.push({ y: top, button });
    });
    ctx.fillStyle = '#a6baad'; ctx.font = '25px sans-serif'; ctx.fillText('Left stick: move table · Right stick: height / rotation', 44, 1240);
    this.panelTexture.needsUpdate = true;
  }
  reset() {
    if (this.renderer.xr.isPresenting) { this.recenterNeeded = true; return; }
    this.board.position.set(0, 0, 0); this.board.rotation.set(0, 0, 0); this.board.scale.setScalar(1);
    this.camera.position.set(1.13, 1.83, 1.77); this.controls.target.set(0, 0, 0); this.controls.update();
  }
  scale(factor: number) { this.board.scale.setScalar(THREE.MathUtils.clamp(this.board.scale.x * factor, .5, 1.5)); }
  rotate(amount: number) { this.board.rotation.y += amount; }
  async enter(mode: 'immersive-ar' | 'immersive-vr') {
    if (!navigator.xr) throw new Error('This browser does not support WebXR. Open the prototype in Quest Browser.');
    this.xrMode = mode;
    const session = await navigator.xr.requestSession(mode, { requiredFeatures: ['local-floor'] });
    try { await this.renderer.xr.setSession(session); } catch (error) { await session.end(); throw error; }
  }
  async exit() { await this.renderer.xr.getSession()?.end(); }
  private resize() {
    if (this.renderer.xr.isPresenting) return;
    const width = this.container.clientWidth, height = this.container.clientHeight;
    this.renderer.setSize(width, height); this.camera.aspect = width / height; this.camera.fov = width < height ? 52 : 42; this.camera.updateProjectionMatrix();
  }
  private animate(time: number, frame?: XRFrame) {
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, .05) : 0;
    this.stats.lastFrameMs = this.lastTime ? time - this.lastTime : 0; this.lastTime = time; this.stats.frames++;
    if (this.renderer.xr.isPresenting && frame) {
      this.stats.xrFrames++;
      if (this.recenterNeeded) {
        const space = this.renderer.xr.getReferenceSpace(); const pose = space && frame.getViewerPose(space);
        if (pose) {
          const p = pose.transform.position, q = pose.transform.orientation;
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)); forward.y = 0; forward.normalize();
          this.board.position.set(p.x + forward.x * 1.05, p.y - .55, p.z + forward.z * 1.05);
          this.board.rotation.set(0, Math.atan2(-forward.x, -forward.z), 0); this.board.scale.setScalar(.85); this.recenterNeeded = false;
        }
      }
      this.hovered = -1;
      for (const controller of this.controllers) {
        const source = this.sources.get(controller); if (!source) continue;
        const hit = this.controllerHit(controller); if (hit?.object.userData.cell !== undefined) this.hovered = hit.object.userData.cell;
        const axes = source.gamepad?.axes;
        if (axes && axes.length >= 4) {
          const x = Math.abs(axes[2]) > .2 ? axes[2] : 0, y = Math.abs(axes[3]) > .2 ? axes[3] : 0;
          if (source.handedness === 'left') {
            const v = new THREE.Vector3(x, 0, y).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.board.rotation.y); this.board.position.addScaledVector(v, dt * .4);
          } else { this.board.position.y = THREE.MathUtils.clamp(this.board.position.y - y * dt * .3, .2, 1.5); this.board.rotation.y -= x * dt * .7; }
        }
      }
    } else this.controls.update();
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const [id, token] of this.tokens) {
      const path = this.motionPaths.get(id);
      if (reduceMotion || !path?.length) {
        token.position.copy(token.userData.destination);
        this.motionPaths.delete(id);
        continue;
      }
      let distance = dt * .8;
      while (path.length && distance > 0) {
        const remaining = token.position.distanceTo(path[0]);
        if (remaining <= distance) {
          token.position.copy(path.shift()!);
          distance -= remaining;
        } else {
          token.position.lerp(path[0], distance / remaining);
          distance = 0;
        }
      }
    }
    this.focus.visible = this.hovered >= 0;
    if (this.focus.visible) this.focus.position.copy(position(this.hovered)).y = .026;
    this.renderer.render(this.scene, this.camera); this.stats.drawCalls = this.renderer.info.render.calls;
  }
}
