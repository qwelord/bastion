import * as T from 'three';

let cache: Record<string, string> | undefined;
const profiles: Record<string, number[][]> = {
  p: [
    [0, 0],
    [0.36, 0],
    [0.4, 0.07],
    [0.4, 0.14],
    [0.31, 0.22],
    [0.28, 0.27],
    [0.24, 0.31],
    [0.17, 0.5],
    [0.14, 0.7],
    [0.21, 0.78],
    [0.21, 0.85],
    [0.13, 0.9],
  ],
  r: [
    [0, 0],
    [0.42, 0],
    [0.45, 0.08],
    [0.44, 0.17],
    [0.35, 0.25],
    [0.31, 0.32],
    [0.28, 0.44],
    [0.25, 1.02],
    [0.32, 1.07],
    [0.36, 1.13],
    [0.36, 1.28],
  ],
  n: [
    [0, 0],
    [0.42, 0],
    [0.44, 0.09],
    [0.41, 0.18],
    [0.32, 0.27],
    [0.31, 0.34],
    [0.27, 0.4],
    [0.25, 0.48],
  ],
  b: [
    [0, 0],
    [0.42, 0],
    [0.45, 0.09],
    [0.42, 0.19],
    [0.33, 0.27],
    [0.29, 0.34],
    [0.25, 0.43],
    [0.17, 0.8],
    [0.15, 1.02],
    [0.27, 1.08],
    [0.27, 1.16],
    [0.17, 1.21],
  ],
  q: [
    [0, 0],
    [0.45, 0],
    [0.47, 0.09],
    [0.44, 0.2],
    [0.35, 0.29],
    [0.31, 0.36],
    [0.28, 0.43],
    [0.18, 0.85],
    [0.17, 1.19],
    [0.29, 1.24],
    [0.29, 1.32],
    [0.2, 1.37],
    [0.27, 1.59],
    [0.31, 1.67],
  ],
  k: [
    [0, 0],
    [0.45, 0],
    [0.48, 0.09],
    [0.45, 0.2],
    [0.35, 0.29],
    [0.31, 0.37],
    [0.27, 0.45],
    [0.18, 0.9],
    [0.17, 1.2],
    [0.3, 1.26],
    [0.3, 1.34],
    [0.2, 1.4],
    [0.24, 1.51],
    [0.18, 1.58],
  ],
};
function makePiece(kind: string, material: T.Material) {
  const group = new T.Group();
  const add = (geometry: T.BufferGeometry, x = 0, y = 0, z = 0, mat = material) => {
    const m = new T.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  add(
    new T.LatheGeometry(
      profiles[kind].map(([r, y]) => new T.Vector2(r, y)),
      64,
    ),
  );
  if (kind === 'p') add(new T.SphereGeometry(0.245, 32, 24), 0, 1.06);
  if (kind === 'r') {
    add(new T.CylinderGeometry(0.36, 0.36, 0.13, 48), 0, 1.29);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const m = add(
        new T.BoxGeometry(0.16, 0.22, 0.18),
        Math.cos(a) * 0.27,
        1.44,
        Math.sin(a) * 0.27,
      );
      m.rotation.y = -a;
    }
  }
  if (kind === 'b') {
    const head = add(new T.SphereGeometry(0.26, 32, 24), 0, 1.43);
    head.scale.set(0.82, 1.25, 0.82);
    add(new T.SphereGeometry(0.075, 24, 16), 0, 1.75);
    const slit = add(
      new T.BoxGeometry(0.025, 0.28, 0.03),
      0.06,
      1.5,
      0.202,
      new T.MeshStandardMaterial({ color: '#5c4835' }),
    );
    slit.rotation.z = -0.38;
  }
  if (kind === 'q') {
    add(new T.CylinderGeometry(0.3, 0.22, 0.12, 48), 0, 1.63);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      add(new T.SphereGeometry(0.065, 16, 12), Math.cos(a) * 0.27, 1.76, Math.sin(a) * 0.27);
    }
    add(new T.SphereGeometry(0.095, 24, 16), 0, 1.81);
  }
  if (kind === 'k') {
    add(new T.SphereGeometry(0.17, 24, 16), 0, 1.61);
    add(new T.BoxGeometry(0.12, 0.43, 0.12), 0, 1.9);
    add(new T.BoxGeometry(0.37, 0.12, 0.12), 0, 1.94);
  }
  if (kind === 'n') {
    const s = new T.Shape();
    s.moveTo(-0.3, 0.43);
    s.bezierCurveTo(-0.32, 0.8, -0.2, 1.18, -0.06, 1.46);
    s.lineTo(-0.08, 1.75);
    s.lineTo(0.06, 1.65);
    s.lineTo(0.15, 1.78);
    s.lineTo(0.21, 1.51);
    s.bezierCurveTo(0.31, 1.43, 0.4, 1.3, 0.42, 1.21);
    s.lineTo(0.55, 1.11);
    s.lineTo(0.5, 0.94);
    s.lineTo(0.27, 0.95);
    s.lineTo(0.12, 1.06);
    s.bezierCurveTo(0.05, 0.87, 0.37, 0.7, 0.31, 0.43);
    s.closePath();
    const m = add(
      new T.ExtrudeGeometry(s, {
        depth: 0.29,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.045,
        bevelThickness: 0.05,
      }),
      0,
      0,
      -0.145,
    );
    m.rotation.y = -0.18;
    add(
      new T.SphereGeometry(0.027, 16, 12),
      0.21,
      1.36,
      0.205,
      new T.MeshStandardMaterial({ color: '#211d19', roughness: 0.3 }),
    );
    for (let i = 0; i < 7; i++) {
      const mane = add(new T.BoxGeometry(0.1, 0.055, 0.34), -0.24 + i * 0.019, 0.72 + i * 0.11);
      mane.rotation.z = -0.3;
    }
  }
  return group;
}
export function pieceImages(): Record<string, string> {
  if (cache) return cache;
  const renderer = new T.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(240, 280);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const scene = new T.Scene();
  scene.add(new T.HemisphereLight(0xfff5df, 0x514b45, 2));
  const key = new T.DirectionalLight(0xfff3db, 4.2);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new T.DirectionalLight(0xffffff, 2.5);
  rim.position.set(3, 3, -3);
  scene.add(rim);
  const floor = new T.Mesh(new T.PlaneGeometry(8, 8), new T.ShadowMaterial({ opacity: 0.24 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.015;
  floor.receiveShadow = true;
  scene.add(floor);
  const camera = new T.OrthographicCamera(-0.9, 0.9, 1.22, -1.22, 0.1, 50);
  camera.position.set(0, 3.25, 8);
  camera.lookAt(0, 1, 0);
  camera.updateProjectionMatrix();
  cache = {};
  for (const side of ['w', 'b'])
    for (const kind of ['p', 'n', 'b', 'r', 'q', 'k']) {
      const material = new T.MeshStandardMaterial({
        color: side === 'w' ? 0xe4cda4 : 0x40352e,
        roughness: 0.32,
        metalness: 0.12,
      });
      const model = makePiece(kind, material);
      scene.add(model);
      renderer.render(scene, camera);
      cache[side + kind] = renderer.domElement.toDataURL('image/png');
      scene.remove(model);
      model.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          if (o.material !== material) o.material.dispose();
        }
      });
      material.dispose();
    }
  floor.geometry.dispose();
  (floor.material as T.Material).dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return cache;
}
