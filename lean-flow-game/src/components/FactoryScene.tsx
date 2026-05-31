import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { COLORS, RAW_SUPPLY } from '../game/config';
import { COLOR_HEX, COLOR_LABEL } from '../game/colors';
import type { BuiltHouse, Color, GameState, Unit } from '../game/types';
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

interface TransferVisual {
  group: THREE.Group;
  start: THREE.Vector3;
  end: THREE.Vector3;
  createdAt: number;
  duration: number;
  spin: boolean;
}

const STATION_LAYOUT = [
  { x: -6.6, z: 0.05, label: 'MATERIAAL', icon: 'SORT' },
  { x: -3.25, z: -0.05, label: 'MAAT', icon: 'SIZE' },
  { x: 0.05, z: 0.06, label: 'SET', icon: 'SET' },
  { x: 3.45, z: -0.08, label: 'BOUW', icon: 'PLAYER' },
  { x: 6.75, z: 0.05, label: 'MARKT', icon: 'CART' },
] as const;

const PLAYER_STOCK = {
  activeX: -0.72,
  queueX: -0.18,
  z: 0.2,
  y: 0.72,
} as const;

const PLAYER_BUILD = {
  z: 1.24,
  slotY: 0.56,
  cubeY: 0.53,
  houseY: 0.36,
} as const;

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
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
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
    e.currentTarget.style.cursor = 'grabbing';
    setDrag({ color, x: e.clientX, y: e.clientY });
  };

  const updateCursor = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag) return;
    e.currentTarget.style.cursor = runtimeRef.current?.hitTest(e.clientX, e.clientY) ? 'grab' : 'default';
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
      <canvas
        className="factory-canvas"
        ref={canvasRef}
        aria-hidden
        onPointerDown={startDrag}
        onPointerMove={updateCursor}
      />
      <PlayerBuildPanel drag={drag} />
      <FlowStatus mode={g.mode} />
      <BlockLegend />
      <SceneAnchors />
    </div>
  );
}

function PlayerBuildPanel({ drag }: { drag: Drag | null }) {
  return (
    <div className="scene-player-panel">
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
  const transfers: TransferVisual[] = [];
  const robot = new THREE.Group();
  const inventoryHitMeshes: THREE.Mesh[] = [];
  const dropHitMeshes: THREE.Mesh[] = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  buildStaticScene(root, beltTexture, beltMats, robot, dropHitMeshes);

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
    updateTransfers(root, transfers, t);
    robot.rotation.y = -0.18 + Math.sin(t * 1.6) * 0.16;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };
  animate();

  return {
    sync(g) {
      if (currentState) enqueueProcessTransfers(root, transfers, currentState, g, clock.getElapsedTime());
      currentState = g;
      inventoryHitMeshes.length = 0;
      rebuildDynamic(dynamic, currentState, inventoryHitMeshes);
    },
    hitTest(clientX, clientY) {
      const hits = raycast(clientX, clientY, canvas, camera, raycaster, pointer, inventoryHitMeshes);
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
  robot: THREE.Group,
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

  STATION_LAYOUT.slice(0, 3).forEach((s, index) => {
    createPlatform(root, s.x, s.z, 2.35, 2.05, false);
    createSign(root, s.x, 0.2, s.label, s.icon);
    createFeeder(root, s.x, 0.95);
    createStationTool(root, s.x, index);
  });

  createPlatform(root, STATION_LAYOUT[3].x, STATION_LAYOUT[3].z, 2.85, 2.65, true);
  createSign(root, STATION_LAYOUT[3].x, 0.12, 'BOUW', 'PLAYER');
  createPlayerDeck(root, robot, STATION_LAYOUT[3].x);
  createBuildWorkbench(root, STATION_LAYOUT[3].x, dropHitMeshes);

  createPlatform(root, STATION_LAYOUT[4].x, STATION_LAYOUT[4].z, 2.45, 2.05, false);
  createSign(root, STATION_LAYOUT[4].x, 0.2, 'MARKT', 'CART');
  createMarketStall(root, STATION_LAYOUT[4].x);
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

function enqueueProcessTransfers(
  root: THREE.Group,
  transfers: TransferVisual[],
  prev: GameState,
  next: GameState,
  now: number
) {
  for (let i = 0; i < 3; i++) {
    const producedDelta = next.stations[i].produced - prev.stations[i].produced;
    for (let n = 0; n < producedDelta; n++) {
      const color = i === 2 ? latestSetColor(next) : null;
      addTransfer(root, transfers, createTransferMesh(i, color), segmentStart(i), segmentEnd(i), now, 1.15);
    }
  }

  const builtDelta = next.built.length - prev.built.length;
  const justBuiltIds = new Set<number>();
  for (let n = 0; n < builtDelta; n++) {
    const house = next.built[next.built.length - 1 - n];
    if (house) {
      justBuiltIds.add(house.id);
      addTransfer(root, transfers, createHouseMesh(house.color, 0.78), segmentStart(3), segmentEnd(3), now, 1.05);
    }
  }

  const prevSoldIds = new Set(prev.built.filter((house) => house.sold).map((house) => house.id));
  for (const house of next.built) {
    if (!house.sold || prevSoldIds.has(house.id)) continue;
    addTransfer(
      root,
      transfers,
      createPickupTruck(house.color),
      marketPickupStart(),
      marketPickupEnd(),
      now + (justBuiltIds.has(house.id) ? 0.95 : 0.15),
      1.35
    );
  }
}

function latestSetColor(g: GameState): Color {
  return (
    g.stations[3].buffer[g.stations[3].buffer.length - 1]?.color ??
    g.holding?.color ??
    g.demandColor ??
    COLORS[0]
  );
}

function segmentStart(index: number) {
  if (index === 3) {
    return new THREE.Vector3(STATION_LAYOUT[3].x + 0.25, PLAYER_BUILD.houseY, PLAYER_BUILD.z);
  }
  const starts = [
    STATION_LAYOUT[0].x + 1.05,
    STATION_LAYOUT[1].x + 1.05,
    STATION_LAYOUT[2].x + 1.05,
    STATION_LAYOUT[3].x + 1.1,
  ];
  return new THREE.Vector3(starts[index], 0.58, 1.24);
}

function segmentEnd(index: number) {
  if (index === 2) {
    return new THREE.Vector3(
      STATION_LAYOUT[3].x + PLAYER_STOCK.activeX,
      PLAYER_STOCK.y,
      PLAYER_STOCK.z
    );
  }
  if (index === 3) return new THREE.Vector3(STATION_LAYOUT[4].x - 1.1, PLAYER_BUILD.houseY, PLAYER_BUILD.z);
  const ends = [
    STATION_LAYOUT[1].x - 1.05,
    STATION_LAYOUT[2].x - 1.05,
    STATION_LAYOUT[3].x - 1.1,
    STATION_LAYOUT[4].x - 1.1,
  ];
  return new THREE.Vector3(ends[index], 0.58, 1.24);
}

function marketPickupStart() {
  return new THREE.Vector3(STATION_LAYOUT[4].x + 0.15, 0.55, 0.52);
}

function marketPickupEnd() {
  return new THREE.Vector3(STATION_LAYOUT[4].x + 2.5, 0.55, -0.42);
}

function addTransfer(
  root: THREE.Group,
  transfers: TransferVisual[],
  group: THREE.Group,
  start: THREE.Vector3,
  end: THREE.Vector3,
  now: number,
  duration: number,
  spin = false
) {
  group.position.copy(start);
  root.add(group);
  transfers.push({ group, start, end, createdAt: now, duration, spin });
}

function updateTransfers(root: THREE.Group, transfers: TransferVisual[], now: number) {
  for (let i = transfers.length - 1; i >= 0; i--) {
    const transfer = transfers[i];
    const rawP = (now - transfer.createdAt) / transfer.duration;
    if (rawP < 0) {
      transfer.group.position.copy(transfer.start);
      continue;
    }
    const p = Math.min(1, rawP);
    transfer.group.position.lerpVectors(transfer.start, transfer.end, easeInOut(p));
    transfer.group.position.y += Math.sin(p * Math.PI) * 0.04;
    if (transfer.spin) transfer.group.rotation.y += 0.025;
    if (p >= 1) {
      root.remove(transfer.group);
      disposeObject(transfer.group);
      transfers.splice(i, 1);
    }
  }
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function createTransferMesh(stationIndex: number, color: Color | null) {
  if (stationIndex === 2 && color) {
    return createSetPack(color, 0.78);
  }

  return stationIndex === 1 ? createSizedPiece(0.95) : createRawPiece(0.95);
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

function createStationTool(root: THREE.Group, x: number, index: number) {
  const group = new THREE.Group();
  group.position.set(x - 0.2, 0.57, -0.18);
  root.add(group);

  if (index === 0) {
    COLORS.forEach((color, i) => {
      const lane = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.035, 0.7),
        new THREE.MeshBasicMaterial({ color: COLOR_HEX[color], transparent: true, opacity: 0.88 })
      );
      lane.position.set((i - 1.5) * 0.2, 0, 0);
      group.add(lane);
    });
    return;
  }

  if (index === 1) {
    const railMat = new THREE.MeshBasicMaterial({ color: 0xf4f8ff, transparent: true, opacity: 0.86 });
    const ruler = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.035, 0.08), railMat);
    group.add(ruler);
    for (let i = 0; i < 6; i++) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, i % 2 === 0 ? 0.22 : 0.15), railMat);
      tick.position.set(-0.42 + i * 0.17, 0.02, 0.1);
      group.add(tick);
    }
    const jawA = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.38), railMat);
    jawA.position.set(-0.24, 0.04, 0.12);
    const jawB = jawA.clone();
    jawB.position.x = 0.3;
    group.add(jawA, jawB);
    return;
  }

  const slotMat = new THREE.MeshBasicMaterial({ color: 0xd8fe56, transparent: true, opacity: 0.84 });
  for (let i = 0; i < 4; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.22), slotMat);
    frame.position.set((col - 0.5) * 0.34, 0, (row - 0.5) * 0.3);
    group.add(frame);
  }
}

function createPlayerDeck(root: THREE.Group, robot: THREE.Group, x: number) {
  robot.position.set(x + 0.62, 0.74, -0.64);
  root.add(robot);

  const lime = new THREE.MeshStandardMaterial({ color: 0xb7f21f, roughness: 0.3, metalness: 0.28 });
  const bright = new THREE.MeshStandardMaterial({ color: 0xd8fe56, roughness: 0.28, metalness: 0.24 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x425006, roughness: 0.34, metalness: 0.45 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.22, 28), lime);
  base.position.y = 0.12;
  robot.add(base);

  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 14), bright);
  shoulder.position.set(0.03, 0.34, 0);
  robot.add(shoulder);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.94, 0.24), lime);
  upper.position.set(0.25, 0.76, 0);
  upper.rotation.z = -0.62;
  robot.add(upper);

  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.19, 22, 12), dark);
  elbow.position.set(0.55, 1.12, 0);
  robot.add(elbow);

  const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.78, 0.2), bright);
  forearm.position.set(0.83, 1.18, 0);
  forearm.rotation.z = 1.18;
  robot.add(forearm);

  const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 10), dark);
  wrist.position.set(1.18, 1.18, 0);
  robot.add(wrist);

  const clawBar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.12), bright);
  clawBar.position.set(1.38, 1.18, 0);
  robot.add(clawBar);

  const clawA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.08), bright);
  clawA.position.set(1.58, 1.1, -0.1);
  clawA.rotation.z = 0.28;
  robot.add(clawA);

  const clawB = clawA.clone();
  clawB.position.z = 0.1;
  clawB.rotation.z = -0.28;
  robot.add(clawB);

  robot.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

function createBuildWorkbench(root: THREE.Group, x: number, dropHitMeshes: THREE.Mesh[]) {
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
    createSlotFrame(group, -0.57 + i * 0.38, PLAYER_BUILD.slotY, PLAYER_BUILD.z);
  }

  const inputRail = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 0.055, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xd8fe56, roughness: 0.35, metalness: 0.2 })
  );
  inputRail.position.set(PLAYER_STOCK.activeX + 0.08, 0.65, PLAYER_STOCK.z);
  group.add(inputRail);

  const bufferRail = inputRail.clone();
  bufferRail.position.set(PLAYER_STOCK.queueX + 0.48, 0.65, PLAYER_STOCK.z);
  bufferRail.material = new THREE.MeshStandardMaterial({
    color: 0x9aa3a8,
    roughness: 0.4,
    metalness: 0.2,
  });
  group.add(bufferRail);

  const drop = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 0.9), hitMat);
  drop.position.set(0, 0.66, PLAYER_BUILD.z);
  group.add(drop);
  dropHitMeshes.push(drop);
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

  const bay = new THREE.Mesh(
    new THREE.BoxGeometry(1.38, 0.035, 0.78),
    new THREE.MeshStandardMaterial({ color: 0x050708, roughness: 0.5, metalness: 0.22 })
  );
  bay.position.set(x + 0.5, 0.49, -0.5);
  root.add(bay);
  addEdges(bay, 0xd8fe56);

  const truck = createDeliveryTruck();
  truck.position.set(x + 0.55, 0.52, -0.5);
  root.add(truck);

  // Magazijn-pallet vóór de markt: hier stapelen ONVERKOCHTE huizen op (overproductie).
  // Verkochte huizen rijden weg met de truck; wat blijft liggen = dode voorraad.
  const pallet = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.06, 0.92),
    new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.7, metalness: 0.1 })
  );
  pallet.position.set(x - 0.18, 0.27, 0.42);
  pallet.receiveShadow = true;
  root.add(pallet);
  addEdges(pallet, 0xff6b6b);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.16, 0.4),
    new THREE.MeshBasicMaterial({ map: makeWarehouseTexture(), transparent: true })
  );
  sign.position.set(x - 0.18, 0.86, -0.02);
  sign.rotation.x = -0.12;
  root.add(sign);
}

function makeWarehouseTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,107,107,0.16)';
  roundedRect(ctx, 6, 6, canvas.width - 12, canvas.height - 12, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,107,107,0.7)';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#ff8f8f';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MAGAZIJN', 192, 58);
  ctx.fillStyle = 'rgba(244,248,255,0.72)';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText('onverkochte voorraad', 192, 96);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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

function rebuildDynamic(dynamic: THREE.Group, g: GameState, inventoryHitMeshes: THREE.Mesh[]) {
  while (dynamic.children.length) {
    const child = dynamic.children.pop();
    if (child) disposeObject(child);
  }

  const rawLeft = Math.max(0, RAW_SUPPLY - g.rawReleased);
  addRawCluster(dynamic, STATION_LAYOUT[0].x - 0.18, 0.06, rawItems(rawLeft), 12, 4);
  addRawCluster(dynamic, STATION_LAYOUT[1].x - 0.1, -0.06, g.stations[1].buffer, 10, 3);
  addSizedCluster(dynamic, STATION_LAYOUT[2].x - 0.08, 0.05, g.stations[2].buffer, 8, 2);
  g.stations.slice(0, 3).forEach((station, index) => {
    if (station.justActed) addStationPulse(dynamic, index);
  });
  addPlayerInventory(dynamic, g, inventoryHitMeshes);
  addBuildCue(dynamic, g);
  addBuildStatus(dynamic, g);

  if (g.holding?.color && g.houseCompleteAtMs != null) {
    const house = createHouseMesh(g.holding.color, 0.82);
    house.position.set(STATION_LAYOUT[3].x + 0.05, PLAYER_BUILD.houseY, PLAYER_BUILD.z);
    dynamic.add(house);
  } else if (g.holding?.color) {
    for (let i = 0; i < g.placedBricks; i++) {
      const cube = createCubeMesh(COLOR_HEX[g.holding.color], 0.34);
      cube.position.set(STATION_LAYOUT[3].x - 0.57 + i * 0.38, PLAYER_BUILD.cubeY, PLAYER_BUILD.z);
      dynamic.add(cube);
    }
  }

  // Onverkochte huizen stapelen op het magazijn-pallet (overproductie zichtbaar).
  const unsold = g.built.filter((h) => !h.sold);
  addHouseCluster(dynamic, STATION_LAYOUT[4].x - 0.18, 0.42, unsold.slice(-9), 9, 3);
  if (unsold.length > 0) addWarehouseCount(dynamic, STATION_LAYOUT[4].x - 0.18, unsold.length);
  addMarketDemand(dynamic, g);
}

function addWarehouseCount(group: THREE.Group, x: number, count: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0e0e';
  ctx.font = '900 72px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(count), 64, 70);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.34),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  badge.position.set(x + 0.66, 1.04, 0.42);
  badge.rotation.x = -0.1;
  group.add(badge);
}

function addPlayerInventory(group: THREE.Group, g: GameState, inventoryHitMeshes: THREE.Mesh[]) {
  const stationX = STATION_LAYOUT[3].x;
  const active = g.holding ?? g.stations[3].buffer[0] ?? null;
  const queued = (g.holding ? g.stations[3].buffer : g.stations[3].buffer.slice(1)).slice(0, 5);

  queued.forEach((item, i) => {
    const color = item.color ?? g.demandColor ?? COLORS[0];
    const pack = createSetPack(color, 0.58);
    const row = Math.floor(i / 3);
    const col = i % 3;
    pack.position.set(stationX + PLAYER_STOCK.queueX + col * 0.34, 0.7, PLAYER_STOCK.z - row * 0.3);
    pack.rotation.y = 0.08;
    group.add(pack);
  });

  if (!active?.color) return;

  const remaining = g.holding ? Math.max(0, g.studsPerHouse - g.placedBricks) : g.studsPerHouse;
  if (remaining > 0) {
    const pack = createSetPack(active.color, 0.9, remaining);
    pack.position.set(stationX + PLAYER_STOCK.activeX, PLAYER_STOCK.y, PLAYER_STOCK.z);
    pack.rotation.y = -0.06;
    group.add(pack);
  }

  if (remaining === 0 || g.houseCompleteAtMs != null) return;

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.92, 1.0),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
  );
  hit.position.set(stationX + PLAYER_STOCK.activeX, 0.78, PLAYER_STOCK.z);
  hit.userData.color = active.color;
  group.add(hit);
  inventoryHitMeshes.push(hit);
}

function addStationPulse(group: THREE.Group, index: number) {
  const station = STATION_LAYOUT[index];
  const pulse = new THREE.Group();
  pulse.position.set(station.x - 0.2, 0.82, -0.18);
  group.add(pulse);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.018, 8, 42),
    new THREE.MeshBasicMaterial({ color: 0xd8fe56, transparent: true, opacity: 0.78 })
  );
  ring.rotation.x = Math.PI / 2;
  pulse.add(ring);

  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.035, 0.035),
    new THREE.MeshBasicMaterial({ color: 0xf4f8ff, transparent: true, opacity: 0.75 })
  );
  beam.rotation.y = index === 1 ? -0.45 : 0.45;
  pulse.add(beam);
}

function addBuildCue(group: THREE.Group, g: GameState) {
  const active = g.holding ?? g.stations[3].buffer[0] ?? null;
  if (!active?.color || g.houseCompleteAtMs != null) return;
  const remaining = g.holding ? Math.max(0, g.studsPerHouse - g.placedBricks) : g.studsPerHouse;
  if (remaining === 0) return;

  const stationX = STATION_LAYOUT[3].x;
  const nextSlotX = stationX - 0.57 + Math.min(g.placedBricks, g.studsPerHouse - 1) * 0.38;
  const source = new THREE.Vector3(stationX + PLAYER_STOCK.activeX, 0.9, PLAYER_STOCK.z);
  const target = new THREE.Vector3(nextSlotX, 0.76, PLAYER_BUILD.z);
  const pulse = 0.55 + Math.sin(g.elapsedMs / 180) * 0.22;
  const mat = new THREE.LineBasicMaterial({
    color: 0xd8fe56,
    transparent: true,
    opacity: pulse,
  });
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      source,
      new THREE.Vector3((source.x + target.x) / 2, 1.0, (source.z + target.z) / 2),
      target,
    ]),
    mat
  );
  group.add(line);

  const targetRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.013, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xd8fe56, transparent: true, opacity: Math.min(1, pulse + 0.16) })
  );
  targetRing.position.copy(target);
  targetRing.rotation.x = Math.PI / 2;
  group.add(targetRing);
}

function addBuildStatus(group: THREE.Group, g: GameState) {
  const active = g.holding ?? g.stations[3].buffer[0] ?? null;
  if (!active?.color) return;
  const texture = makeBuildStatusTexture(active.color, g.holding ? g.placedBricks : 0, g.studsPerHouse);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.48),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
  );
  sign.position.set(STATION_LAYOUT[3].x - 0.34, 1.08, 0.0);
  sign.rotation.x = -0.18;
  group.add(sign);
}

function rawItems(count: number): Unit[] {
  return Array.from({ length: Math.min(count, 18) }, (_, i) => ({
    id: -i - 1,
    color: null,
    startedAtMs: 0,
  }));
}

function addRawCluster(
  group: THREE.Group,
  x: number,
  z: number,
  items: Pick<Unit, 'id' | 'color'>[],
  max: number,
  cols: number
) {
  addUnitCluster(group, x, z, items, max, cols, (i) => {
    const raw = createRawPiece(0.86);
    raw.rotation.y = (i % 3 - 1) * 0.16;
    raw.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.04;
    return raw;
  });
}

function addSizedCluster(
  group: THREE.Group,
  x: number,
  z: number,
  items: Pick<Unit, 'id' | 'color'>[],
  max: number,
  cols: number
) {
  addUnitCluster(group, x, z, items, max, cols, () => createSizedPiece(0.9));
}

function addUnitCluster(
  group: THREE.Group,
  x: number,
  z: number,
  items: Pick<Unit, 'id' | 'color'>[],
  max: number,
  cols: number,
  createUnit: (index: number) => THREE.Group
) {
  const shown = items.slice(0, max);
  const rows = Math.max(1, Math.ceil(shown.length / cols));
  shown.forEach((_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const unit = createUnit(i);
    const xOffset = (col - (cols - 1) / 2) * 0.38;
    const zOffset = (row - (rows - 1) / 2) * 0.36;
    unit.position.set(x + xOffset, 0.74, z + zOffset);
    group.add(unit);
  });
}

function addHouseCluster(
  group: THREE.Group,
  x: number,
  z: number,
  items: Pick<BuiltHouse, 'id' | 'color' | 'sold'>[],
  max: number,
  cols: number
) {
  const shown = items.slice(0, max);
  const rows = Math.max(1, Math.ceil(shown.length / cols));
  shown.forEach((item, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const house = createHouseMesh(item.color, 0.58);
    const xOffset = (col - (cols - 1) / 2) * 0.42;
    const zOffset = (row - (rows - 1) / 2) * 0.42;
    house.position.set(x + xOffset, 0.74, z + zOffset);
    group.add(house);
  });
}

function addMarketDemand(group: THREE.Group, g: GameState) {
  if (g.phase !== 'playing') return;
  // Push (ronde 1): de klant verklapt zijn kleur NIET. Speler moet zelf
  // ontdekken dat hij blind bouwt ("maar welke kleur wil de klant?"). Pas in
  // pull verschijnt de vraag-bubble. Discovery, niet voorzeggen.
  if (!g.demandRevealed || !g.demandColor) return;

  const bubble = createDemandBubble(g.demandColor);
  bubble.position.set(STATION_LAYOUT[4].x + 0.55, 1.62, -0.58);
  bubble.rotation.x = -0.08;
  group.add(bubble);

  const sample = createHouseMesh(g.demandColor, 0.36);
  sample.position.set(STATION_LAYOUT[4].x + 0.52, 0.92, -0.58);
  group.add(sample);
}

function createRawPiece(scale = 1) {
  const group = new THREE.Group();
  const base = createBoxMesh(0x6d6382, 0.32 * scale, 0.24 * scale, 0.28 * scale);
  base.rotation.y = 0.2;
  group.add(base);

  const chip = createBoxMesh(0x988faa, 0.2 * scale, 0.16 * scale, 0.18 * scale);
  chip.position.set(0.11 * scale, 0.16 * scale, -0.05 * scale);
  chip.rotation.z = -0.18;
  group.add(chip);

  return group;
}

function createSizedPiece(scale = 1) {
  const group = new THREE.Group();
  const block = createCubeMesh(0x9a94aa, 0.29 * scale);
  group.add(block);

  const railMat = new THREE.MeshBasicMaterial({ color: 0xf4f8ff, transparent: true, opacity: 0.88 });
  for (const z of [-0.13, 0.13]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.025 * scale, 0.025 * scale), railMat);
    rail.position.set(0, 0.18 * scale, z * scale);
    group.add(rail);
  }

  return group;
}

function createSetPack(color: Color, scale = 1, count = 4) {
  const group = new THREE.Group();
  const size = 0.25 * scale;
  const spacing = 0.28 * scale;
  const positions = [
    [-spacing / 2, 0, -spacing / 2],
    [spacing / 2, 0, -spacing / 2],
    [-spacing / 2, 0, spacing / 2],
    [spacing / 2, 0, spacing / 2],
  ] as const;

  positions.slice(0, count).forEach(([x, y, z]) => {
    const cube = createCubeMesh(COLOR_HEX[color], size);
    cube.position.set(x, y, z);
    group.add(cube);
  });

  return group;
}

function createPickupTruck(color: Color) {
  const group = createDeliveryTruck();
  const house = createHouseMesh(color, 0.42);
  house.position.set(0.18, 0.32, 0);
  group.add(house);
  return group;
}

function createDeliveryTruck() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd8fe56, roughness: 0.38, metalness: 0.18 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111417, roughness: 0.5, metalness: 0.2 });
  const cabMat = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.34, metalness: 0.12 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.36), bodyMat);
  body.position.y = 0.18;
  group.add(body);
  addEdges(body, 0x101418);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.32), cabMat);
  cab.position.set(-0.34, 0.28, 0);
  group.add(cab);
  addEdges(cab, 0x101418);

  for (const x of [-0.28, 0.28]) {
    for (const z of [-0.2, 0.2]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.055, 14), darkMat);
      wheel.position.set(x, 0.06, z);
      wheel.rotation.x = Math.PI / 2;
      group.add(wheel);
    }
  }

  group.rotation.y = -0.18;
  return group;
}

function createDemandBubble(color: Color | null) {
  const tex = makeDemandTexture(color);
  const bubble = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.74),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  return bubble;
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
  addStuds(cube, c, size);
  return cube;
}

function createBoxMesh(color: string | number, width: number, height: number, depth: number) {
  const c = new THREE.Color(color);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.46, metalness: 0.08 })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addEdges(mesh, 0x101418);
  return mesh;
}

function addStuds(cube: THREE.Mesh, color: THREE.Color, size: number) {
  const studMat = new THREE.MeshStandardMaterial({
    color: color.clone().lerp(new THREE.Color(0xffffff), 0.18),
    roughness: 0.38,
    metalness: 0.08,
  });
  const radius = size * 0.105;
  const height = size * 0.055;
  const offset = size * 0.18;
  for (const x of [-offset, offset]) {
    for (const z of [-offset, offset]) {
      const stud = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 14), studMat);
      stud.position.set(x, size / 2 + height / 2, z);
      stud.castShadow = true;
      cube.add(stud);
    }
  }
}

function createHouseMesh(color: Color, scale = 1) {
  const group = new THREE.Group();
  const bodyColor = new THREE.Color(COLOR_HEX[color]);
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.42, metalness: 0.08 });
  const roofMat = new THREE.MeshStandardMaterial({
    color: bodyColor.clone().multiplyScalar(0.7),
    roughness: 0.36,
    metalness: 0.12,
  });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf4f8ff, transparent: true, opacity: 0.85 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46 * scale, 0.34 * scale, 0.38 * scale), bodyMat);
  body.position.y = 0.17 * scale;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  addEdges(body, 0x101418);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.36 * scale, 0.28 * scale, 4), roofMat);
  roof.position.y = 0.48 * scale;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.18 * scale, 0.012 * scale), lineMat);
  door.position.set(0, 0.1 * scale, 0.197 * scale);
  group.add(door);

  return group;
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

function makeDemandTexture(color: Color | null) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 330;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(250,252,255,0.96)';
  roundedRect(ctx, 52, 28, 408, 226, 42);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(250, 252);
  ctx.lineTo(286, 252);
  ctx.lineTo(252, 300);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#111417';
  ctx.textAlign = 'center';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.fillText('VRAAG', 256, 76);

  if (color) {
    const houseColor = COLOR_HEX[color];
    ctx.fillStyle = houseColor;
    ctx.fillRect(202, 146, 108, 68);
    ctx.fillStyle = shadeColor(houseColor, -28);
    ctx.beginPath();
    ctx.moveTo(188, 150);
    ctx.lineTo(256, 96);
    ctx.lineTo(324, 150);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(246, 178, 22, 36);
    ctx.fillStyle = '#111417';
    ctx.font = '900 42px system-ui, sans-serif';
    ctx.fillText(COLOR_LABEL[color].toUpperCase(), 256, 126);
  } else {
    ctx.fillStyle = '#111417';
    ctx.font = '900 112px system-ui, sans-serif';
    ctx.fillText('?', 256, 188);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBuildStatusTexture(color: Color, placed: number, total: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 176;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(216,254,86,0.86)';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  ctx.fillStyle = '#d8fe56';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('BOUW', 34, 58);

  ctx.fillStyle = COLOR_HEX[color];
  ctx.fillRect(34, 86, 34, 34);
  ctx.fillStyle = '#f4f8ff';
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.fillText(`${COLOR_LABEL[color]} ${placed}/${total}`, 84, 116);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function shadeColor(hex: string, amount: number) {
  const color = new THREE.Color(hex);
  return `#${[color.r, color.g, color.b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel * 255 + amount)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
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
