import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { COLORS, RAW_SUPPLY } from '../game/config';
import { COLOR_HEX, COLOR_LABEL } from '../game/colors';
import type { Color, GameState, Unit } from '../game/types';
import { Brick } from './Brick';

interface Drag {
  color: Color;
  x: number;
  y: number;
}

interface SceneRuntime {
  sync: (g: GameState) => void;
  hitTest: (clientX: number, clientY: number) => Color | null;
  dropTest: (clientX: number, clientY: number) => boolean;
  dispose: () => void;
}

const STATION_LAYOUT = [
  { x: -6.6, z: 0.05, label: 'MATERIAAL', icon: 'SORT' },
  { x: -3.25, z: -0.05, label: 'MAAT', icon: 'SIZE' },
  { x: 0.05, z: 0.06, label: 'SET', icon: 'SET' },
  { x: 3.45, z: -0.08, label: 'BOUW', icon: 'PLAYER' },
  { x: 6.75, z: 0.05, label: 'MARKT', icon: 'CART' },
] as const;

export function FactoryScene() {
  const g = useGame((s) => s.g);
  const place = useGame((s) => s.place);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const stateRef = useRef(g);
  const [drag, setDrag] = useState<Drag | null>(null);

  useEffect(() => {
    stateRef.current = g;
    runtimeRef.current?.sync(g);
  }, [g]);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) =>
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = (e: PointerEvent) => {
      if (runtimeRef.current?.dropTest(e.clientX, e.clientY)) place(drag.color);
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [drag, place]);

  const startDrag = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const color = runtimeRef.current?.hitTest(e.clientX, e.clientY);
    if (!color) return;
    e.preventDefault();
    setDrag({ color, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;

    const runtime = createFactoryRuntime(canvas, shell);
    runtimeRef.current = runtime;
    runtime.sync(stateRef.current);
    return () => {
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, []);

  return (
    <div className="line factory-scene-shell" ref={shellRef}>
      <canvas className="factory-canvas" ref={canvasRef} aria-hidden onPointerDown={startDrag} />
      <PlayerBuildPanel g={g} drag={drag} />
      <FlowStatus mode={g.mode} />
      <BlockLegend />
      <SceneAnchors />
    </div>
  );
}

function PlayerBuildPanel({ g, drag }: { g: GameState; drag: Drag | null }) {
  const holding = g.holding;
  const target = holding?.color ?? null;

  return (
    <div className="scene-player-panel player-station">
      <div className="scene-panel-head">
        <span className="scene-panel-icon">♙</span>
        <span>Bouw</span>
        <strong>JIJ</strong>
      </div>

      {holding && target ? (
        <>
          <div className="scene-build-line">
            <span>Bouw dit huis:</span>
            <span className="scene-swatch" style={{ background: COLOR_HEX[target] }} />
            <strong>{COLOR_LABEL[target]}</strong>
            <span>
              {g.placedBricks}/{g.studsPerHouse}
            </span>
          </div>
          <div className="scene-tray-label">sleep een 3D-steen naar de bouwvakken</div>
        </>
      ) : (
        <div className="scene-waiting">Wachten op materiaal</div>
      )}

      {drag && (
        <div className="drag-ghost scene-drag-ghost" style={{ left: drag.x, top: drag.y }}>
          <Brick color={drag.color} size={40} />
        </div>
      )}
    </div>
  );
}

function FlowStatus({ mode }: { mode: GameState['mode'] }) {
  return (
    <div className="scene-flow-panel">
      <span>Flow status</span>
      <div className={`scene-flow-dots ${mode}`}>
        <i />
        <b />
        <i />
        <b />
        <i />
        <b />
        <i className="final" />
      </div>
    </div>
  );
}

function BlockLegend() {
  const counts = { red: 12, blue: 9, yellow: 8, green: 11 } satisfies Record<Color, number>;
  return (
    <div className="scene-block-panel">
      <span>Blocks</span>
      <div>
        {COLORS.map((c) => (
          <strong key={c}>
            <Brick color={c} size={21} />
            {String(counts[c]).padStart(2, '0')}
          </strong>
        ))}
      </div>
    </div>
  );
}

function SceneAnchors() {
  return (
    <>
      <div className="scene-anchor station scene-anchor-0" />
      <div className="scene-anchor station scene-anchor-1" />
      <div className="scene-anchor station scene-anchor-2" />
      <div className="scene-anchor station player-station scene-anchor-player" />
      <div className="scene-anchor market scene-anchor-market" />
    </>
  );
}

function createFactoryRuntime(canvas: HTMLCanvasElement, shell: HTMLDivElement): SceneRuntime {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x05070a, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x05070a, 12, 28);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0.1, 7.8, 12.4);
  camera.lookAt(0.1, 0, 0);

  const root = new THREE.Group();
  root.position.y = 0.85;
  root.rotation.y = -0.02;
  scene.add(root);

  const dynamic = new THREE.Group();
  root.add(dynamic);

  const beltTexture = makeBeltTexture();
  const beltMats: THREE.MeshBasicMaterial[] = [];
  const movers: THREE.Mesh[] = [];
  const robot = new THREE.Group();
  const trayHitMeshes: THREE.Mesh[] = [];
  const dropHitMeshes: THREE.Mesh[] = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  buildStaticScene(root, beltTexture, beltMats, movers, robot, trayHitMeshes, dropHitMeshes);

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-5, 9, 5);
  key.castShadow = true;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 25;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);
  const rim = new THREE.PointLight(0xd8fe56, 2.6, 10);
  rim.position.set(4.2, 2.6, 1.2);
  scene.add(rim);

  let currentState: GameState | null = null;
  let raf = 0;
  let disposed = false;

  const resize = () => {
    const rect = shell.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(420, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    const compact = width < 1200;
    camera.fov = compact ? 44 : 42;
    camera.position.set(0.1, compact ? 8.9 : 8.3, compact ? 12.2 : 12.0);
    camera.lookAt(0.1, 0.65, 0);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(shell);
  resize();

  const clock = new THREE.Clock();
  const animate = () => {
    if (disposed) return;
    const t = clock.getElapsedTime();
    for (const mat of beltMats) {
      if (mat.map) mat.map.offset.x = -t * 0.55;
    }
    movers.forEach((m, i) => {
      const p = (t * 0.22 + i * 0.24) % 1;
      m.position.x = THREE.MathUtils.lerp(-7.55, 7.45, p);
      m.position.z = 1.22 + Math.sin((p + i) * Math.PI * 2) * 0.04;
      m.rotation.y = t * 0.8 + i;
    });
    robot.rotation.y = Math.sin(t * 1.8) * 0.18;
    robot.children.forEach((child, i) => {
      child.rotation.z += Math.sin(t * 2 + i) * 0.0008;
    });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };
  animate();

  return {
    sync(g) {
      currentState = g;
      rebuildDynamic(dynamic, currentState);
    },
    hitTest(clientX, clientY) {
      const hits = raycast(clientX, clientY, canvas, camera, raycaster, pointer, trayHitMeshes);
      const color = hits[0]?.object.userData.color;
      return isColor(color) ? color : null;
    },
    dropTest(clientX, clientY) {
      return raycast(clientX, clientY, canvas, camera, raycaster, pointer, dropHitMeshes).length > 0;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      disposeObject(scene);
      renderer.dispose();
    },
  };
}

function buildStaticScene(
  root: THREE.Group,
  beltTexture: THREE.CanvasTexture,
  beltMats: THREE.MeshBasicMaterial[],
  movers: THREE.Mesh[],
  robot: THREE.Group,
  trayHitMeshes: THREE.Mesh[],
  dropHitMeshes: THREE.Mesh[]
) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 16),
    new THREE.MeshStandardMaterial({ color: 0x14181b, roughness: 0.82, metalness: 0.08 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  const grid = new THREE.GridHelper(28, 28, 0x33383c, 0x24282d);
  grid.position.y = 0.01;
  root.add(grid);

  createConveyor(root, 0.05, 1.24, 15.9, 0.72, beltTexture, beltMats);

  STATION_LAYOUT.slice(0, 3).forEach((s) => {
    createPlatform(root, s.x, s.z, 2.35, 2.05, false);
    createSign(root, s.x, 0.2, s.label, s.icon);
    createFeeder(root, s.x, 0.95);
  });

  createPlatform(root, STATION_LAYOUT[3].x, STATION_LAYOUT[3].z, 2.85, 2.65, true);
  createSign(root, STATION_LAYOUT[3].x, 0.12, 'BOUW', 'PLAYER');
  createPlayerDeck(root, robot, STATION_LAYOUT[3].x);
  createBuildWorkbench(root, STATION_LAYOUT[3].x, trayHitMeshes, dropHitMeshes);

  createPlatform(root, STATION_LAYOUT[4].x, STATION_LAYOUT[4].z, 2.45, 2.05, false);
  createSign(root, STATION_LAYOUT[4].x, 0.2, 'MARKT', 'CART');
  createMarketStall(root, STATION_LAYOUT[4].x);

  const moverColors = [0xe47b22, 0x2d91df, 0x4ac05f, 0xf0c433];
  moverColors.forEach((color) => {
    const cube = createCubeMesh(color, 0.32);
    cube.position.set(-8.4, 0.55, 1.24);
    root.add(cube);
    movers.push(cube);
  });
}

function raycast(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  raycaster: THREE.Raycaster,
  pointer: THREE.Vector2,
  objects: THREE.Object3D[]
) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(objects, true);
}

function isColor(value: unknown): value is Color {
  return typeof value === 'string' && COLORS.includes(value as Color);
}

function createPlatform(root: THREE.Group, x: number, z: number, w: number, d: number, highlight: boolean) {
  const group = new THREE.Group();
  group.position.set(x, 0.22, z);
  root.add(group);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.42, d),
    new THREE.MeshStandardMaterial({
      color: highlight ? 0x0a1008 : 0x07090b,
      roughness: 0.58,
      metalness: 0.25,
    })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  addEdges(body, highlight ? 0xd8fe56 : 0xf4f8ff);
  addTopGrid(group, w, d, highlight ? 0x9ab83b : 0x4b5258);

  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.18, 0.08, 0.08),
    new THREE.MeshStandardMaterial({ color: highlight ? 0xd8fe56 : 0xeef4ff, roughness: 0.35 })
  );
  lip.position.set(0, 0.25, d / 2 + 0.02);
  group.add(lip);
}

function createConveyor(
  root: THREE.Group,
  x: number,
  z: number,
  length: number,
  depth: number,
  texture: THREE.CanvasTexture,
  mats: THREE.MeshBasicMaterial[]
) {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.28, depth),
    new THREE.MeshStandardMaterial({ color: 0x020304, roughness: 0.42, metalness: 0.34 })
  );
  base.position.set(x, 0.18, z);
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);
  addEdges(base, 0xf4f8ff);

  const tex = texture.clone();
  tex.needsUpdate = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(length / 1.1, 1);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 });
  mats.push(mat);

  const top = new THREE.Mesh(new THREE.PlaneGeometry(length - 0.25, depth - 0.18), mat);
  top.rotation.x = -Math.PI / 2;
  top.position.set(x, 0.325, z);
  root.add(top);
}

function createFeeder(root: THREE.Group, x: number, z: number) {
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.18, 0.74),
    new THREE.MeshStandardMaterial({ color: 0x050708, roughness: 0.5, metalness: 0.28 })
  );
  tray.position.set(x - 0.18, 0.44, z);
  root.add(tray);
  addEdges(tray, 0xf4f8ff);
}

function createPlayerDeck(root: THREE.Group, robot: THREE.Group, x: number) {
  robot.position.set(x + 0.68, 0.74, -0.72);
  root.add(robot);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.27, 0.18, 20),
    new THREE.MeshStandardMaterial({ color: 0xb7f21f, roughness: 0.35, metalness: 0.2 })
  );
  base.position.y = 0.1;
  robot.add(base);

  const arm1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.82, 0.18),
    new THREE.MeshStandardMaterial({ color: 0xb7f21f, roughness: 0.34, metalness: 0.24 })
  );
  arm1.position.set(0.12, 0.55, 0);
  arm1.rotation.z = -0.52;
  robot.add(arm1);

  const arm2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.62, 0.16),
    new THREE.MeshStandardMaterial({ color: 0xd8fe56, roughness: 0.34, metalness: 0.2 })
  );
  arm2.position.set(0.48, 0.94, 0);
  arm2.rotation.z = 0.72;
  robot.add(arm2);

  const claw = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.09, 0.16),
    new THREE.MeshStandardMaterial({ color: 0xd8fe56, roughness: 0.34, metalness: 0.2 })
  );
  claw.position.set(0.76, 1.08, 0);
  robot.add(claw);

  robot.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

function createBuildWorkbench(
  root: THREE.Group,
  x: number,
  trayHitMeshes: THREE.Mesh[],
  dropHitMeshes: THREE.Mesh[]
) {
  const group = new THREE.Group();
  group.position.set(x, 0, 0);
  root.add(group);

  const hitMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(2.18, 0.035, 1.15),
    new THREE.MeshStandardMaterial({
      color: 0x081006,
      roughness: 0.55,
      metalness: 0.2,
      transparent: true,
      opacity: 0.58,
    })
  );
  deck.position.set(0, 0.515, 0.48);
  group.add(deck);
  addEdges(deck, 0xd8fe56);
  addSurfaceGrid(group, 2.08, 1.05, 0.545, 0.48, 0x6f8d20);

  for (let i = 0; i < 4; i++) {
    createSlotFrame(group, -0.57 + i * 0.38, 0.78, 0.42);
  }

  const drop = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.18, 0.55), hitMat);
  drop.position.set(0, 0.68, 0.42);
  group.add(drop);
  dropHitMeshes.push(drop);

  COLORS.forEach((color, i) => {
    const cube = createCubeMesh(COLOR_HEX[color], 0.34);
    cube.position.set(-0.72 + i * 0.48, 0.7, 1.03);
    group.add(cube);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), hitMat);
    hit.position.copy(cube.position);
    hit.userData.color = color;
    group.add(hit);
    trayHitMeshes.push(hit);
  });
}

function createSlotFrame(root: THREE.Group, x: number, y: number, z: number) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xf4f8ff,
  });
  const w = 0.36;
  const d = 0.34;
  const t = 0.045;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, t, t), mat);
  top.position.set(x, y, z - d / 2);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, t, t), mat);
  bottom.position.set(x, y, z + d / 2);
  const left = new THREE.Mesh(new THREE.BoxGeometry(t, t, d), mat);
  left.position.set(x - w / 2, y, z);
  const right = new THREE.Mesh(new THREE.BoxGeometry(t, t, d), mat);
  right.position.set(x + w / 2, y, z);
  root.add(top, bottom, left, right);
}

function addSurfaceGrid(group: THREE.Group, w: number, d: number, y: number, zCenter: number, color: number) {
  const lines: THREE.Vector3[] = [];
  for (let x = -w / 2 + 0.22; x < w / 2; x += 0.22) {
    lines.push(new THREE.Vector3(x, y, zCenter - d / 2), new THREE.Vector3(x, y, zCenter + d / 2));
  }
  for (let z = zCenter - d / 2 + 0.22; z < zCenter + d / 2; z += 0.22) {
    lines.push(new THREE.Vector3(-w / 2, y, z), new THREE.Vector3(w / 2, y, z));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(lines);
  group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.72 })));
}

function createMarketStall(root: THREE.Group, x: number) {
  const canopy = new THREE.Group();
  canopy.position.set(x + 0.45, 0.84, 0.68);
  root.add(canopy);
  for (let i = 0; i < 6; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.8),
      new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xd8fe56 : 0xf5f8fb, roughness: 0.55 })
    );
    stripe.position.x = (i - 2.5) * 0.24;
    canopy.add(stripe);
  }
}

function createSign(root: THREE.Group, x: number, z: number, label: string, icon: string) {
  const tex = makeSignTexture(label, icon);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.72), mat);
  sign.position.set(x, 1.45, z - 0.94);
  sign.rotation.x = -0.06;
  root.add(sign);
}

function addTopGrid(group: THREE.Group, w: number, d: number, color: number) {
  const lines: THREE.Vector3[] = [];
  const y = 0.236;
  for (let x = -w / 2 + 0.35; x < w / 2; x += 0.35) {
    lines.push(new THREE.Vector3(x, y, -d / 2 + 0.1), new THREE.Vector3(x, y, d / 2 - 0.1));
  }
  for (let z = -d / 2 + 0.35; z < d / 2; z += 0.35) {
    lines.push(new THREE.Vector3(-w / 2 + 0.1, y, z), new THREE.Vector3(w / 2 - 0.1, y, z));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(lines);
  const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 }));
  group.add(line);
}

function addEdges(mesh: THREE.Mesh, color: number) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.96 })
  );
  mesh.add(edges);
}

function rebuildDynamic(dynamic: THREE.Group, g: GameState) {
  while (dynamic.children.length) {
    const child = dynamic.children.pop();
    if (child) disposeObject(child);
  }

  const rawLeft = Math.max(0, RAW_SUPPLY - g.rawReleased);
  addBlockCluster(dynamic, STATION_LAYOUT[0].x - 0.18, 0.06, rawItems(rawLeft), 12, 4);
  addBlockCluster(dynamic, STATION_LAYOUT[1].x - 0.1, -0.06, g.stations[1].buffer, 10, 3);
  addBlockCluster(dynamic, STATION_LAYOUT[2].x - 0.08, 0.05, g.stations[2].buffer, 8, 2);
  addBlockCluster(dynamic, STATION_LAYOUT[3].x - 0.3, 0.0, g.stations[3].buffer, 8, 4);

  if (g.holding?.color) {
    for (let i = 0; i < g.placedBricks; i++) {
      const cube = createCubeMesh(COLOR_HEX[g.holding.color], 0.34);
      cube.position.set(STATION_LAYOUT[3].x - 0.57 + i * 0.38, 0.74, 0.42);
      dynamic.add(cube);
    }
  }

  const built = g.built.slice(-5).map((h) => ({ id: h.id, color: h.color, startedAtMs: h.builtAtMs }));
  addBlockCluster(dynamic, STATION_LAYOUT[4].x - 0.2, 0.04, built, 5, 5);

  if (g.demandRevealed && g.demandColor) {
    const demand = createCubeMesh(COLOR_HEX[g.demandColor], 0.28);
    demand.position.set(STATION_LAYOUT[4].x + 0.68, 1.02, -0.55);
    dynamic.add(demand);
  }
}

function rawItems(count: number): Unit[] {
  return Array.from({ length: Math.min(count, 18) }, (_, i) => ({
    id: -i - 1,
    color: null,
    startedAtMs: 0,
  }));
}

function addBlockCluster(
  group: THREE.Group,
  x: number,
  z: number,
  items: Pick<Unit, 'id' | 'color'>[],
  max: number,
  cols: number
) {
  const shown = items.slice(0, max);
  const rows = Math.max(1, Math.ceil(shown.length / cols));
  shown.forEach((item, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const color = item.color ? COLOR_HEX[item.color] : '#6e5f86';
    const cube = createCubeMesh(color, 0.32);
    const xOffset = (col - (cols - 1) / 2) * 0.38;
    const zOffset = (row - (rows - 1) / 2) * 0.36;
    cube.position.set(x + xOffset, 0.74, z + zOffset);
    group.add(cube);
  });
}

function createCubeMesh(color: string | number, size: number) {
  const c = new THREE.Color(color);
  const mats = [
    new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.72), roughness: 0.42, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.9), roughness: 0.42, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: c.clone().lerp(new THREE.Color(0xffffff), 0.22), roughness: 0.42, metalness: 0.08 }),
    new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.58), roughness: 0.42, metalness: 0.1 }),
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.42, metalness: 0.08 }),
    new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.66), roughness: 0.42, metalness: 0.1 }),
  ];
  const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mats);
  cube.castShadow = true;
  cube.receiveShadow = true;
  addEdges(cube, 0x101418);
  return cube;
}

function makeSignTexture(label: string, icon: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.86)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(245,248,255,0.82)';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = icon === 'PLAYER' ? '#d8fe56' : '#f6f8fb';
  ctx.font = '700 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(icon, 256, 118);
  ctx.fillStyle = '#d8fe56';
  ctx.font = '900 38px system-ui, sans-serif';
  ctx.fillText(label, 256, 206);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBeltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#020304';
  ctx.fillRect(0, 0, 256, 80);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  for (let x = -20; x < 280; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x + 20, 40);
    ctx.lineTo(x, 62);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material.dispose();
      }
    }
  });
}
