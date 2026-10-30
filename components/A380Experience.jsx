"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildA380, hexToRgb } from "@/components/a380/buildA380";
import { buildCards, fontStacks } from "@/components/a380/cards";
import { buildBlockLetters } from "@/components/a380/blockLetters";
import SterlingGateKineticNav from "@/components/SterlingGateKineticNav";
import AboutIntro from "@/components/AboutIntro";
import JoinTeam from "@/components/JoinTeam";
import SiteFooter from "@/components/SiteFooter";

/*
 * Scroll-driven 3D intro. A wireframe Airbus A380 sweeps past, drops onto a
 * floating runway past Beyond Sky cards, climbs away, and the scene ends on
 * "BEYOND SKY" built from thousands of cubes. The homepage sections then
 * scroll up over it.
 */

const BG = "#000000";
const SCROLL_SCREENS = 7; // page height in viewport heights
const LETTERS_POS = new THREE.Vector3(0, 38, -650);
const FINAL_CAM_DIST = 94;

// Scroll keyframes. p = scroll progress (0–1). Rotations in degrees.
// plane: [x, y, z], rot: [pitch, yaw, roll], cam/target: [x, y, z], dutch = camera roll
const KEYS = [
  {
    p: 0.0, plane: [10, 58, -10], rot: [-6, 0, -20], cam: [-92, 46, -12], target: [10, 56, -40], dutch: 0,
    // phones: plane sits in the lower half, under the headline
    portrait: { cam: [14, 36, -92], target: [10, 76, -14] },
  },
  { p: 0.16, plane: [2, 36, -110], rot: [-9, 0, -8], cam: [-78, 34, -122], target: [2, 32, -118], dutch: -3 },
  { p: 0.32, plane: [0, 14, -215], rot: [-4, 0, 2], cam: [-60, 17, -176], target: [14, 11, -242], dutch: -9 },
  { p: 0.5, plane: [0, 9, -320], rot: [0, 0, 3], cam: [-54, 14, -280], target: [16, 10, -346], dutch: -11 },
  { p: 0.64, plane: [0, 11, -420], rot: [3, 0, -2], cam: [-42, 15, -378], target: [12, 14, -446], dutch: -8 },
  { p: 0.76, plane: [0, 40, -560], rot: [16, 0, -6], cam: [-8, 24, -470], target: [0, 38, -600], dutch: -2 },
  { p: 0.88, plane: [0, 150, -820], rot: [22, 0, 0], cam: [0, 38, -552], target: [0, 38, -650], dutch: 0 },
  { p: 1.0, plane: [0, 260, -1000], rot: [22, 0, 0], cam: [0, 38, -650 + FINAL_CAM_DIST], target: [0, 38, -650], dutch: 0 },
];

// Cards: position, and the scroll moment they face the camera.
const CARD_LAYOUT = {
  knob: { pos: [-18, 24, -232], faceAt: 0.36, tilt: 8 },
  largest: { pos: [10, 26, -262], faceAt: 0.4, tilt: -5 },
  spec: { pos: [42, 22, -248], faceAt: 0.42, tilt: 4 },
  podcast: { pos: [-8, 25, -338], faceAt: 0.5, tilt: -6 },
  stat: { pos: [40, 20, -320], faceAt: 0.52, tilt: 7 },
  "777x": { pos: [8, 27, -378], faceAt: 0.58, tilt: -4 },
  topics: { pos: [44, 21, -404], faceAt: 0.62, tilt: 5 },
  cargo: { pos: [-4, 26, -448], faceAt: 0.66, tilt: -6 },
};

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function makeCurves(portrait) {
  const toV = (a) => new THREE.Vector3(...a);
  const pick = (k, field) => (portrait && k.portrait?.[field]) || k[field];
  return {
    plane: new THREE.CatmullRomCurve3(KEYS.map((k) => toV(k.plane)), false, "centripetal"),
    cam: new THREE.CatmullRomCurve3(KEYS.map((k) => toV(pick(k, "cam"))), false, "centripetal"),
    target: new THREE.CatmullRomCurve3(KEYS.map((k) => toV(pick(k, "target"))), false, "centripetal"),
  };
}

// Map scroll progress to curve parameter (by keyframe index) + per-key scalar lerp.
function sampleKeys(p) {
  let i = KEYS.length - 2;
  for (let k = 0; k < KEYS.length - 1; k++) {
    if (p <= KEYS[k + 1].p) {
      i = k;
      break;
    }
  }
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const u = clamp01((p - a.p) / (b.p - a.p));
  const e = u * u * (3 - 2 * u);
  const lerp = (x, y) => x + (y - x) * e;
  return {
    t: (i + u) / (KEYS.length - 1),
    rot: a.rot.map((v, j) => lerp(v, b.rot[j])),
    dutch: lerp(a.dutch, b.dutch),
  };
}

function runwayTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#16171c";
  ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = "#e9ecf2";
  ctx.fillRect(10, 0, 5, 512);
  ctx.fillRect(241, 0, 5, 512);
  ctx.fillRect(123, 0, 10, 220);
  return c;
}

function thresholdTexture(font) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 640;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#16171c";
  ctx.fillRect(0, 0, 512, 640);
  ctx.fillStyle = "#e9ecf2";
  ctx.fillRect(20, 0, 10, 640);
  ctx.fillRect(482, 0, 10, 640);
  // piano keys
  for (let i = 0; i < 8; i++) {
    const x = 44 + i * 54 + (i >= 4 ? 30 : 0);
    ctx.fillRect(x, 470, 22, 150);
  }
  // runway number, readable on approach
  ctx.font = `400 210px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("27", 256, 300);
  ctx.fillRect(40, 440, 432, 8);
  return c;
}

function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.9)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return c;
}

export default function A380Experience() {
  const stageRef = useRef(null);
  const headlineRef = useRef(null);
  const hintRef = useRef(null);
  const barRef = useRef(null);
  const finaleRef = useRef(null);
  const spacerRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(new THREE.Color(BG));
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color(BG), 140, 420);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 2500);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.7);
    sun.position.set(-0.6, 1, 1.2);
    scene.add(sun);

    const fog = hexToRgb(BG);
    const plane = buildA380(fog);
    scene.add(plane);

    // runway
    const runwayLen = 820;
    const rTex = new THREE.CanvasTexture(runwayTexture());
    rTex.colorSpace = THREE.SRGBColorSpace;
    rTex.wrapT = THREE.RepeatWrapping;
    rTex.repeat.set(1, runwayLen / 120);
    rTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const runway = new THREE.Mesh(
      new THREE.PlaneGeometry(60, runwayLen),
      new THREE.MeshBasicMaterial({ map: rTex, toneMapped: false })
    );
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(0, 0, -210 - runwayLen / 2);
    scene.add(runway);

    const fonts = fontStacks();
    const displayReady = Promise.race([
      document.fonts?.load ? document.fonts.load(`400 100px ${fonts.display}`).catch(() => {}) : Promise.resolve(),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    const thTex = new THREE.CanvasTexture(thresholdTexture(fonts.display));
    displayReady.then(() => {
      if (disposed) return;
      thTex.image = thresholdTexture(fonts.display);
      thTex.needsUpdate = true;
    });
    thTex.colorSpace = THREE.SRGBColorSpace;
    thTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const threshold = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 75),
      new THREE.MeshBasicMaterial({ map: thTex, toneMapped: false })
    );
    threshold.rotation.x = -Math.PI / 2;
    threshold.position.set(0, 0, -172.5);
    scene.add(threshold);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowTexture()), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    let curves = makeCurves(window.innerWidth / window.innerHeight < 0.8);

    // cards (async: fonts + images)
    const cards = [];
    let disposed = false;
    displayReady.then(() => buildCards(renderer)).then((built) => {
      if (disposed) return;
      for (const { key, mesh } of built) {
        const cfg = CARD_LAYOUT[key];
        if (!cfg) continue;
        mesh.position.set(...cfg.pos);
        const k = sampleKeys(cfg.faceAt);
        mesh.lookAt(curves.cam.getPoint(k.t));
        mesh.rotateZ(THREE.MathUtils.degToRad(cfg.tilt));
        mesh.userData.baseY = cfg.pos[1];
        mesh.userData.phase = Math.random() * Math.PI * 2;
        scene.add(mesh);
        cards.push(mesh);
      }
    });

    // block letters, rebuilt if the screen flips between wide and tall
    let letters = null;
    let lettersPortrait = null;
    const buildLetters = (portrait) => {
      if (letters && lettersPortrait === portrait) return;
      if (letters) {
        scene.remove(letters.mesh);
        letters.mesh.geometry.dispose();
        letters.mesh.material.dispose();
      }
      letters = buildBlockLetters({
        text: portrait ? "BEYOND\nSKY" : "BEYOND SKY",
        font: fonts.display,
        columns: portrait ? 64 : 140,
        worldWidth: 100,
      });
      lettersPortrait = portrait;
      letters.mesh.position.copy(LETTERS_POS);
      scene.add(letters.mesh);
    };

    const fitLetters = () => {
      if (!letters) return;
      const visH = 2 * FINAL_CAM_DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const visW = visH * camera.aspect;
      const s = Math.min((visW * 0.84) / letters.width, (visH * 0.5) / letters.height);
      letters.mesh.scale.setScalar(s);
      // sit slightly above centre to leave room for the buttons
      letters.mesh.position.y = LETTERS_POS.y + visH * 0.06;
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.fov = camera.aspect < 0.8 ? 52 : 38;
      curves = makeCurves(camera.aspect < 0.8);
      camera.updateProjectionMatrix();
      const ready = () => {
        buildLetters(camera.aspect < 0.9);
        fitLetters();
      };
      displayReady.then(() => !disposed && ready());
    };
    resize();
    window.addEventListener("resize", resize);

    // scroll
    let target = 0;
    let shown = 0;
    const onScroll = () => {
      const spacer = spacerRef.current;
      const max = spacer ? spacer.offsetHeight - window.innerHeight : 0;
      target = max > 0 ? clamp01(window.scrollY / max) : 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const clock = new THREE.Clock();
    const camPos = new THREE.Vector3();
    const camTarget = new THREE.Vector3();
    const planePos = new THREE.Vector3();
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const time = clock.getElapsedTime();
      shown += (target - shown) * 0.075;
      if (Math.abs(target - shown) < 1e-5) shown = target;
      const p = shown;
      const k = sampleKeys(p);

      curves.plane.getPoint(k.t, planePos);
      planePos.y += Math.sin(time * 1.1) * 0.35;
      plane.position.copy(planePos);
      plane.rotation.set(
        THREE.MathUtils.degToRad(k.rot[0]),
        THREE.MathUtils.degToRad(k.rot[1]),
        THREE.MathUtils.degToRad(k.rot[2] + Math.sin(time * 0.8) * 1.4),
        "YXZ"
      );

      curves.cam.getPoint(k.t, camPos);
      curves.target.getPoint(k.t, camTarget);
      camera.position.copy(camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(camTarget);
      camera.rotateZ(THREE.MathUtils.degToRad(k.dutch));

      shadow.position.set(planePos.x, 0.05, planePos.z);
      shadow.material.opacity =
        planePos.z < -150 && planePos.z > -1030 ? 0.6 * clamp01(1 - (planePos.y - 6) / 30) : 0;
      shadow.visible = shadow.material.opacity > 0.01;

      for (const c of cards) {
        c.position.y = c.userData.baseY + Math.sin(time * 0.7 + c.userData.phase) * 0.5;
      }

      if (letters) letters.assemble(smooth(0.76, 0.95, p));

      // overlay UI
      const head = headlineRef.current;
      if (head) {
        const o = 1 - smooth(0.02, 0.13, p);
        head.style.opacity = String(o);
        head.style.transform = `translateY(${-40 * (1 - o)}px)`;
        head.style.visibility = o < 0.01 ? "hidden" : "visible";
      }
      if (hintRef.current) hintRef.current.style.opacity = String(1 - smooth(0.005, 0.05, p));
      if (barRef.current) barRef.current.style.transform = `scaleY(${p})`;
      const fin = finaleRef.current;
      if (fin) {
        const o = smooth(0.92, 0.985, p);
        fin.style.opacity = String(o);
        fin.style.transform = `translateY(${16 * (1 - o)}px)`;
        fin.style.pointerEvents = o > 0.5 ? "auto" : "none";
      }

      renderer.render(scene, camera);
    };
    frame();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach((m) => {
          m.map?.dispose();
          m.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const restart = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="a380-page">
      <SterlingGateKineticNav />
      {/* Anton is only used on this page, so it is loaded here rather than site-wide */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Anton&display=swap"
        precedence="default"
      />
      <div className="a380-stage" ref={stageRef} aria-hidden="true" />

      <div className="a380-ui">
        <div className="a380-headline" ref={headlineRef}>
          <h1 className="a380-title">
            <span>Stories from</span>
            <span>the skies</span>
          </h1>
        </div>

        <div className="a380-corner a380-corner--bl" ref={hintRef}>
          ↓ Scroll to explore
        </div>

        <div className="a380-corner a380-corner--br">
          <button type="button" className="a380-restart" onClick={restart}>
            ↺ Restart
          </button>
        </div>

        <div className="a380-progress" aria-hidden="true">
          <div className="a380-progress__bar" ref={barRef} />
        </div>

        <div className="a380-finale" ref={finaleRef}>
          <a
            className="a380-cta"
            href="https://www.youtube.com/@BeyondSky-m5e"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Watch on YouTube</span>
            <span aria-hidden="true">↗</span>
          </a>
          <span className="a380-continue">↓ Keep scrolling</span>
        </div>
      </div>

      <div
        className="a380-scroll"
        ref={spacerRef}
        style={{ height: `${SCROLL_SCREENS * 100}vh` }}
      />

      {/* the regular homepage continues after the flight */}
      <div className="a380-after">
        <AboutIntro />
        <JoinTeam />
        <SiteFooter />
      </div>
    </div>
  );
}
