import * as THREE from "three";

/*
 * "BEYOND SKY" built from thousands of small cubes (one InstancedMesh).
 * Text is rasterised on a canvas and every filled pixel becomes a cube.
 * Cubes are white at the top and dither into dark grey toward the bottom.
 * assemble(a) flies them in from a scattered cloud: a = 0 scattered, 1 formed.
 */

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function buildBlockLetters({ text, font, columns, worldWidth }) {
  // rasterise
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d", { willReadFrequently: true });
  const fontPx = 100;
  const lines = text.split("\n");
  const lineH = fontPx * 1.08;
  ctx.font = `400 ${fontPx}px ${font}`;
  const measured = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width)));
  c.width = measured + 8;
  c.height = Math.ceil(lineH * lines.length + fontPx * 0.25);
  ctx.font = `400 ${fontPx}px ${font}`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  lines.forEach((l, i) => ctx.fillText(l, c.width / 2, fontPx * 0.125 + lineH * (i + 0.5)));

  const step = c.width / columns;
  const rows = Math.floor(c.height / step);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;

  const cells = [];
  let minRow = Infinity;
  let maxRow = -Infinity;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < columns; col++) {
      const px = Math.floor((col + 0.5) * step);
      const py = Math.floor((r + 0.5) * step);
      if (data[(py * c.width + px) * 4 + 3] > 120) {
        cells.push([col, r]);
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
      }
    }
  }

  const cell = worldWidth / columns;
  const size = cell * 0.86;
  const geo = new THREE.BoxGeometry(size, size, size * 1.6);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.08, fog: false });
  const mesh = new THREE.InstancedMesh(geo, mat, cells.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const targets = [];
  const starts = [];
  const delays = [];
  const spins = [];
  const color = new THREE.Color();
  const height = (maxRow - minRow + 1) * cell;

  cells.forEach(([col, r], i) => {
    const x = (col - columns / 2 + 0.5) * cell;
    const y = height / 2 - (r - minRow + 0.5) * cell;
    const h = hash(i);
    // 0 = top of its line, 1 = bottom (each line gets its own fade)
    const lineRows = (maxRow - minRow + 1) / lines.length;
    const t = ((r - minRow) % lineRows) / Math.max(lineRows - 1, 1);
    targets.push(new THREE.Vector3(x, y, (hash(i + 7) - 0.5) * cell * 0.5));

    // dither: more dark (and a few missing) cubes toward the bottom
    const darkChance = THREE.MathUtils.smoothstep(t, 0.18, 0.95) * 0.95;
    if (h < darkChance) color.setRGB(0.16, 0.16, 0.19);
    else color.setRGB(0.93, 0.94, 0.97);
    mesh.setColorAt(i, color);

    const ang = hash(i + 3) * Math.PI * 2;
    const rad = 30 + hash(i + 5) * 90;
    starts.push(
      new THREE.Vector3(
        x + Math.cos(ang) * rad,
        y + Math.sin(ang) * rad * 0.6 + 25,
        60 + hash(i + 11) * 120
      )
    );
    delays.push((col / columns) * 0.55 + hash(i + 13) * 0.25);
    spins.push(hash(i + 17) * 6 - 3);
  });
  mesh.instanceColor.needsUpdate = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  let lastA = -1;

  function assemble(a) {
    if (Math.abs(a - lastA) < 1e-4) return;
    lastA = a;
    for (let i = 0; i < targets.length; i++) {
      const local = THREE.MathUtils.clamp((a * 1.8 - delays[i]) / 1.0, 0, 1);
      const k = 1 - Math.pow(1 - local, 3); // ease-out
      p.lerpVectors(starts[i], targets[i], k);
      const sp = (1 - k) * spins[i];
      e.set(sp, sp * 0.7, sp * 0.4);
      q.setFromEuler(e);
      const sc = k;
      s.set(sc, sc, sc);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  assemble(0);
  return { mesh, assemble, width: worldWidth, height, count: cells.length };
}
