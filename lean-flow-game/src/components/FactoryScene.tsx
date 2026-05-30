import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { COLORS, RAW_SUPPLY } from '../game/config';
import { COLOR_HEX, COLOR_LABEL } from '../game/colors';
import type { BuiltHouse, Color, GameState, Unit } from '../game/types';
import { Brick } from './Brick';
import { HouseStagesSvg } from './icons';

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
  const inventoryCount = (holding ? 1 : 0) + g.stations[3].buffer.length;
  const remainingParts = holding ? Math.max(0, g.studsPerHouse - g.placedBricks) : 0;

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
            <SceneBuildBlueprint color={target} stage={g.placedBricks} />
            <div className="scene-build-copy">
              <div className="scene-build-title">
                <span>Bouw dit huis:</span>
                <span className="scene-swatch" style={{ background: COLOR_HEX[target] }} />
                <strong>{COLOR_LABEL[target]}</strong>
                <span>
                  {g.placedBricks}/{g.studsPerHouse}
                </span>
              </div>
              <div className="scene-build-hint">
                {remainingParts > 0
                  ? `${remainingParts} onderdeel${remainingParts === 1 ? '' : 'en'} over in deze set`
                  : 'huis klaar, naar de markt'}
              </div>
            </div>
          </div>
          <div className="scene-tray-label">sets bij bouwstation: {inventoryCount}</div>
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

function SceneBuildBlueprint({ color, stage }: { color: Color; stage: number }) {
  return (
    <div className="scene-blueprint-art house-stages-wrap" style={{ color: COLOR_HEX[color] }}>
      <HouseStagesSvg className="house-ghost" />
      <HouseStagesSvg key={stage} className={`house-built s${stage}`} />
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

  STATION_LAYOUT.slice(0, 3).forEach((s) => {
    createPlatform(root, s.x, s.z, 2.35, 2.05, false);
    createSign(root, s.x, 0.2, s.label, s.icon);
    createFeeder(root, s.x, 0.95);
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
  for (let n = 0; n < builtDelta; n++) {
    const house = next.built[next.built.length - 1 - n];
    if (house) {
      addTransfer(root, transfers, createHouseMesh(house.color, 0.78), segmentStart(3), segmentEnd(3), now, 1.05);
      if (house.sold) {
        addTransfer(
          root,
          transfers,
          createPickupTruck(house.color),
          marketPickupStart(),
          marketPickupEnd(),
          now + 0.95,
          1.35
        );
      }
    }
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
  const starts = [
    STATION_LAYOUT[0].x + 1.05,
    STATION_LAYOUT[1].x + 1.05,
    STATION_LAYOUT[2].x + 1.05,
    STATION_LAYOUT[3].x + 1.1,
  ];
  return new THREE.Vector3(starts[index], 0.58, 1.24);
}

function segmentEnd(index: number) {
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
    createSlotFrame(group, -0.57 + i * 0.38, 0.78, 0.42);
  }

  const inputRail = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 0.055, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xd8fe56, roughness: 0.35, metalness: 0.2 })
  );
  inputRail.position.set(-0.52, 0.65, 1.08);
  group.add(inputRail);

  const bufferRail = inputRail.clone();
  bufferRail.position.set(0.58, 0.65, 1.08);
  bufferRail.material = new THREE.MeshStandardMaterial({
    color: 0x9aa3a8,
    roughness: 0.4,
    metalness: 0.2,
  });
  group.add(bufferRail);

  const drop = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.18, 0.55), hitMat);
  drop.position.set(0, 0.68, 0.42);
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
  addPlayerInventory(dynamic, g, inventoryHitMeshes);
  addBuildCue(dynamic, g);

  if (g.holding?.color && g.houseCompleteAtMs != null) {
    const house = createHouseMesh(g.holding.color, 0.82);
    house.position.set(STATION_LAYOUT[3].x - 0.12, 0.75, 0.42);
    dynamic.add(house);
  } else if (g.holding?.color) {
    for (let i = 0; i < g.placedBricks; i++) {
      const cube = createCubeMesh(COLOR_HEX[g.holding.color], 0.34);
      cube.position.set(STATION_LAYOUT[3].x - 0.57 + i * 0.38, 0.74, 0.42);
      dynamic.add(cube);
    }
  }

  addHouseCluster(dynamic, STATION_LAYOUT[4].x - 0.18, 0.12, g.built.filter((h) => !h.sold).slice(-6), 6, 3);
  addMarketDemand(dynamic, g);
}

function addPlayerInventory(group: THREE.Group, g: GameState, inventoryHitMeshes: THREE.Mesh[]) {
  const stationX = STATION_LAYOUT[3].x;
  const active = g.holding;
  const queued = g.stations[3].buffer.slice(0, 5);

  queued.forEach((item, i) => {
    const color = item.color ?? g.demandColor ?? COLORS[0];
    const pack = createSetPack(color, 0.58);
    const row = Math.floor(i / 3);
    const col = i % 3;
    pack.position.set(stationX + 0.26 + col * 0.34, 0.7, 1.0 - row * 0.3);
    pack.rotation.y = 0.08;
    group.add(pack);
  });

  if (!active?.color) return;

  const remaining = Math.max(0, g.studsPerHouse - g.placedBricks);
  if (remaining > 0) {
    const pack = createSetPack(active.color, 0.9, remaining);
    pack.position.set(stationX - 0.58, 0.72, 1.02);
    pack.rotation.y = -0.06;
    group.add(pack);
  }

  if (remaining === 0 || g.houseCompleteAtMs != null) return;

  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.72, 0.74),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
  );
  hit.position.set(stationX - 0.58, 0.78, 1.02);
  hit.userData.color = active.color;
  group.add(hit);
  inventoryHitMeshes.push(hit);
}

function addBuildCue(group: THREE.Group, g: GameState) {
  if (!g.holding?.color || g.houseCompleteAtMs != null) return;
  const remaining = Math.max(0, g.studsPerHouse - g.placedBricks);
  if (remaining === 0) return;

  const stationX = STATION_LAYOUT[3].x;
  const nextSlotX = stationX - 0.57 + Math.min(g.placedBricks, g.studsPerHouse - 1) * 0.38;
  const source = new THREE.Vector3(stationX - 0.58, 0.9, 0.86);
  const target = new THREE.Vector3(nextSlotX, 0.9, 0.42);
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

function createSetPack(color: Color, scale = 1) {
  const group = new THREE.Group();
  const size = 0.25 * scale;
  const spacing = 0.28 * scale;
  const positions = [
    [-spacing / 2, 0, -spacing / 2],
    [spacing / 2, 0, -spacing / 2],
    [-spacing / 2, 0, spacing / 2],
    [spacing / 2, 0, spacing / 2],
  ] as const;

  positions.forEach(([x, y, z]) => {
    const cube = createCubeMesh(COLOR_HEX[color], size);
    cube.position.set(x, y, z);
    group.add(cube);
  });

  return group;
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
