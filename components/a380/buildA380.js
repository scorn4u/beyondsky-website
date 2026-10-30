import * as THREE from "three";

/*
 * A procedurally built Airbus A380, roughly to real proportions (units = metres):
 * 72.7 m long, 79.8 m span, double-deck oval fuselage, 33.5° wing sweep,
 * four engines, tall swept fin. Every part uses one "wireframe grid" shader:
 * near-black skin with white grid lines, like a 3D model in an editor viewport.
 *
 * The aircraft is built nose-forward along +X, then turned so it flies along -Z.
 */

const LENGTH = 72.7;
const RADIUS = 3.6; // half fuselage width
const HEIGHT_SCALE = 1.17; // A380 fuselage is taller than wide (two full decks)

// grid modes for the shader
const GRID_UV = 0; // use mesh UVs (lathe parts: around × along)
const GRID_XZ = 1; // object space, plan view (wings, stabiliser)
const GRID_XY = 2; // object space, side view (fin)

export function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function createWireMaterial({ mode, density, fogColor }) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uMode: { value: mode },
      uDensity: { value: new THREE.Vector2(density[0], density[1]) },
      uFogColor: { value: new THREE.Vector3(...fogColor) },
      uFogNear: { value: 140 },
      uFogFar: { value: 420 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vLocal;
      varying vec3 vNormalV;
      varying float vDepth;
      void main() {
        vUv = uv;
        vLocal = position;
        vNormalV = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform int uMode;
      uniform vec2 uDensity;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;
      varying vec2 vUv;
      varying vec3 vLocal;
      varying vec3 vNormalV;
      varying float vDepth;

      float gridLine(vec2 coord) {
        vec2 g = abs(fract(coord - 0.5) - 0.5) / max(fwidth(coord), vec2(1e-4));
        float d = min(g.x, g.y);
        return 1.0 - smoothstep(0.35, 1.35, d);
      }

      void main() {
        vec2 c;
        if (uMode == 0) c = vUv * uDensity;
        else if (uMode == 1) c = vLocal.xz * uDensity;
        else c = vLocal.xy * uDensity;

        vec3 n = normalize(vNormalV);
        if (!gl_FrontFacing) n = -n;
        vec3 lightDir = normalize(vec3(0.35, 0.8, 0.5));
        float lambert = max(dot(n, lightDir), 0.0);
        float rim = pow(1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);

        vec3 skin = vec3(0.025) + vec3(0.09) * lambert + vec3(0.05) * rim;
        vec3 line = vec3(mix(0.55, 1.0, lambert * 0.75 + 0.25));
        vec3 color = mix(skin, line, gridLine(c));

        float fogF = smoothstep(uFogNear, uFogFar, vDepth);
        gl_FragColor = vec4(mix(color, uFogColor, fogF), 1.0);
      }
    `,
  });
}

/* ---------- fuselage ---------- */

function fuselageRadius(t) {
  // t: 0 = tail tip, 1 = nose tip
  if (t > 0.88) {
    const s = (t - 0.88) / 0.12;
    return RADIUS * Math.pow(Math.max(1 - Math.pow(s, 2.2), 0), 0.5);
  }
  if (t < 0.3) {
    const x = t / 0.3;
    return RADIUS * (0.12 + 0.88 * Math.pow(Math.sin((Math.PI / 2) * x), 0.8));
  }
  return RADIUS;
}

function fuselageCentreLift(t) {
  // tail cone sweeps upward; nose droops slightly
  let y = 0;
  if (t < 0.3) y += 2.6 * Math.pow(1 - t / 0.3, 1.6);
  if (t > 0.88) y -= 0.7 * Math.pow((t - 0.88) / 0.12, 2);
  return y;
}

function buildFuselage(material) {
  const pts = [];
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(new THREE.Vector2(Math.max(fuselageRadius(t), 0.001), t * LENGTH));
  }
  const geo = new THREE.LatheGeometry(pts, 56);
  geo.rotateZ(-Math.PI / 2); // lathe axis Y -> X, nose toward +X
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const t = x / LENGTH;
    pos.setY(i, pos.getY(i) * HEIGHT_SCALE + fuselageCentreLift(t));
    pos.setX(i, x - LENGTH / 2);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

/* ---------- flat lifting surfaces (wing, stabiliser, fin) ---------- */

function surfaceGeometry(outline, thickness, taper = 0.7) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.35,
    bevelSize: thickness * 0.35,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.translate(0, 0, -thickness / 2);
  // thinner toward the tip (shape +Y is spanwise)
  const span = Math.max(...outline.map((p) => p[1]));
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const s = Math.min(Math.max(pos.getY(i) / span, 0), 1);
    pos.setZ(i, pos.getZ(i) * (1 - taper * s));
  }
  geo.computeVertexNormals();
  return geo;
}

// Wing planform, x = chordwise (forward +), y = spanwise from the fuselage side
const WING_SPAN = 36.3; // 39.9 m semi-span minus 3.6 m fuselage half-width
const WING_SWEEP = Math.tan(THREE.MathUtils.degToRad(33.5));
const WING_OUTLINE = [
  [0, 0],
  [-WING_SPAN * WING_SWEEP, WING_SPAN],
  [-WING_SPAN * WING_SWEEP - 4.0, WING_SPAN],
  [-21.8, 12],
  [-17.7, 0],
];
const WING_ROOT_X = 9.4; // wing root leading edge (from fuselage centre)
const WING_Y = -2.4; // low wing
const DIHEDRAL = THREE.MathUtils.degToRad(5.6);

function buildWings(planeGroup, wingMat, finMat, nacelleMat) {
  const base = surfaceGeometry(WING_OUTLINE, 1.1, 0.72);
  base.rotateX(Math.PI / 2); // shape plane -> horizontal, span along +Z (right wing)
  base.rotateX(-DIHEDRAL);
  base.translate(WING_ROOT_X, WING_Y, RADIUS - 0.3);

  const right = new THREE.Mesh(base, wingMat);
  const leftGeo = base.clone();
  leftGeo.scale(1, 1, -1);
  const left = new THREE.Mesh(leftGeo, wingMat);
  planeGroup.add(right, left);

  // wingtip fences (small vertical plates at each tip)
  const fenceGeo = surfaceGeometry(
    [
      [0, 0],
      [-0.9, 1.5],
      [-2.4, 1.5],
      [-3.0, 0],
      [-2.2, -1.0],
      [-0.8, -1.0],
    ],
    0.2,
    0
  );
  const tipX = WING_ROOT_X - WING_SPAN * WING_SWEEP;
  const tipY = WING_Y + Math.sin(DIHEDRAL) * WING_SPAN;
  const tipZ = RADIUS - 0.3 + WING_SPAN;
  for (const side of [1, -1]) {
    const f = new THREE.Mesh(fenceGeo, finMat);
    f.position.set(tipX, tipY, side * tipZ);
    planeGroup.add(f);
  }

  // engines: two per wing
  const nacelleProfile = [
    [0.02, -1.4], [0.5, -0.6], [0.8, 0.1], [1.05, 0.35], [1.35, 1.6],
    [1.55, 3.6], [1.62, 5.2], [1.58, 6.5], [1.45, 7.0], [1.2, 6.85],
    [0.9, 6.4], [0.35, 6.6], [0.02, 6.9],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const nacelleGeo = new THREE.LatheGeometry(nacelleProfile, 28);
  nacelleGeo.rotateZ(-Math.PI / 2); // intake toward +X

  const pylonGeo = new THREE.BoxGeometry(5.5, 1.6, 0.45);

  for (const z of [15.4, 25.8]) {
    const spanFromRoot = z - (RADIUS - 0.3);
    const leX = WING_ROOT_X - spanFromRoot * WING_SWEEP;
    const wingYHere = WING_Y + Math.sin(DIHEDRAL) * spanFromRoot;
    for (const side of [1, -1]) {
      const n = new THREE.Mesh(nacelleGeo, nacelleMat);
      n.position.set(leX - 1.5, wingYHere - 2.1, side * z);
      const p = new THREE.Mesh(pylonGeo, wingMat);
      p.position.set(leX - 0.6, wingYHere - 0.75, side * z);
      planeGroup.add(n, p);
    }
  }
}

function buildTail(planeGroup, wingMat, finMat) {
  // horizontal stabiliser
  const stabSpan = 14.8;
  const stabSweep = Math.tan(THREE.MathUtils.degToRad(35));
  const stab = surfaceGeometry(
    [
      [0, 0],
      [-stabSpan * stabSweep, stabSpan],
      [-stabSpan * stabSweep - 3.5, stabSpan],
      [-10.5, 0],
    ],
    0.7,
    0.6
  );
  stab.rotateX(Math.PI / 2);
  stab.translate(-23.8, 1.2, 1.2);
  const stabL = stab.clone();
  stabL.scale(1, 1, -1);
  planeGroup.add(new THREE.Mesh(stab, wingMat), new THREE.Mesh(stabL, wingMat));

  // vertical fin (drawn directly in the side plane; thickness along Z)
  const finH = 14.2;
  const finSweep = Math.tan(THREE.MathUtils.degToRad(40));
  const fin = surfaceGeometry(
    [
      [0, 0],
      [-finH * finSweep, finH],
      [-finH * finSweep - 4.6, finH],
      [-13.2, 0],
    ],
    0.8,
    0.55
  );
  fin.translate(-22.4, 2.6, 0);
  planeGroup.add(new THREE.Mesh(fin, finMat));
}

/**
 * Returns an Object3D whose local forward is -Z, up +Y.
 */
export function buildA380(fogColor) {
  const fuselageMat = createWireMaterial({ mode: GRID_UV, density: [30, 64], fogColor });
  const wingMat = createWireMaterial({ mode: GRID_XZ, density: [0.36, 0.36], fogColor });
  const finMat = createWireMaterial({ mode: GRID_XY, density: [0.55, 0.55], fogColor });
  const nacelleMat = createWireMaterial({ mode: GRID_UV, density: [14, 9], fogColor });

  const body = new THREE.Group(); // nose along +X
  body.add(buildFuselage(fuselageMat));
  buildWings(body, wingMat, finMat, nacelleMat);
  buildTail(body, wingMat, finMat);
  body.rotation.y = Math.PI / 2; // +X -> -Z

  const aircraft = new THREE.Group();
  aircraft.add(body);
  aircraft.userData.materials = [fuselageMat, wingMat, finMat, nacelleMat];
  return aircraft;
}
