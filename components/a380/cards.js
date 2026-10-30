import * as THREE from "three";

/*
 * Floating "app cards" for the runway sequence, drawn on 2D canvases and used as
 * textures. Content is Beyond Sky's own: real video titles and episode art.
 */

const W = 1024;

function cssFont(varName, fallback) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

export function fontStacks() {
  return {
    sans: cssFont("--font-plus-jakarta", "'Plus Jakarta Sans', system-ui, sans-serif"),
    mono: cssFont("--font-space-grotesk", "'Space Grotesk', monospace"),
    display: "'Anton', Impact, 'Arial Narrow', sans-serif",
  };
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function cardBase(h, { radius = 56 } = {}) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = h;
  const ctx = c.getContext("2d");
  rr(ctx, 4, 4, W - 8, h - 8, radius);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#17181d");
  g.addColorStop(1, "#08090b");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.stroke();
  return { c, ctx };
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function pill(ctx, x, y, label, font, { filled = false } = {}) {
  ctx.font = font;
  const w = ctx.measureText(label).width + 76;
  rr(ctx, x, y, w, 84, 42);
  ctx.fillStyle = filled ? "#ffffff" : "rgba(255,255,255,0.08)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.stroke();
  ctx.fillStyle = filled ? "#0b0b0f" : "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 38, y + 44);
  return w;
}

function drawCover(ctx, img, x, y, w, h, r) {
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  if (img) {
    const s = Math.max(w / img.width, h / img.height);
    const iw = img.width * s;
    const ih = img.height * s;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  } else {
    ctx.fillStyle = "#222";
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function playBadge(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.3, cy - r * 0.42);
  ctx.lineTo(cx + r * 0.48, cy);
  ctx.lineTo(cx - r * 0.3, cy + r * 0.42);
  ctx.closePath();
  ctx.fillStyle = "#0b0b0f";
  ctx.fill();
}

function videoCard(img, title, eyebrow, f) {
  const h = 980;
  const { c, ctx } = cardBase(h);
  drawCover(ctx, img, 36, 36, W - 72, 560, 34);
  playBadge(ctx, W / 2, 316, 70);
  ctx.fillStyle = "#8a8f98";
  ctx.font = `500 34px ${f.mono}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(eyebrow.toUpperCase(), 64, 672);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 60px ${f.sans}`;
  wrap(ctx, title, W - 128)
    .slice(0, 3)
    .forEach((l, i) => ctx.fillText(l, 64, 756 + i * 72));
  return c;
}

function podcastCard(f) {
  const h = 720;
  const { c, ctx } = cardBase(h);
  ctx.fillStyle = "#8a8f98";
  ctx.font = `500 34px ${f.mono}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("PODCAST  ·  ON SPOTIFY", 64, 112);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 76px ${f.sans}`;
  ctx.fillText("Aviation, out loud.", 64, 206);

  // waveform
  const bars = 34;
  for (let i = 0; i < bars; i++) {
    const t = i / (bars - 1);
    const amp = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)) * Math.sin(Math.PI * t);
    const bh = 30 + amp * 190;
    rr(ctx, 64 + i * 19, 400 - bh / 2, 10, bh, 5);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  // mic button
  ctx.beginPath();
  ctx.arc(860, 400, 92, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  rr(ctx, 838, 336, 44, 86, 22);
  ctx.fillStyle = "#0b0b0f";
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = "#0b0b0f";
  ctx.beginPath();
  ctx.arc(860, 392, 46, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(860, 438);
  ctx.lineTo(860, 462);
  ctx.stroke();

  const font = `600 36px ${f.mono}`;
  const w1 = pill(ctx, 64, 572, "PLAY", font, { filled: true });
  pill(ctx, 64 + w1 + 22, 572, "ALL EPISODES", font);
  return c;
}

function statCard(f) {
  const h = 640;
  const { c, ctx } = cardBase(h);
  ctx.fillStyle = "#f59e0b";
  ctx.font = `400 300px ${f.display}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("20M", 56, 380);
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 46px ${f.mono}`;
  ctx.fillText("VIEWS IN THE LAST YEAR", 64, 480);
  ctx.fillStyle = "#8a8f98";
  ctx.font = `500 34px ${f.mono}`;
  ctx.fillText("ON YOUTUBE", 64, 560);
  return c;
}

function topicsCard(f) {
  const h = 980;
  const { c, ctx } = cardBase(h);
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 184px ${f.display}`;
  ctx.textBaseline = "alphabetic";
  ["STORIES", "FROM THE", "SKIES"].forEach((l, i) => ctx.fillText(l, 60, 250 + i * 196));
  const font = `600 36px ${f.mono}`;
  let x = 64;
  for (const [i, label] of ["HISTORY", "ENGINEERING", "INDUSTRY"].entries()) {
    x += pill(ctx, x, 812, label, font, { filled: i === 0 }) + 18;
  }
  return c;
}

function specCard(f) {
  const h = 760;
  const { c, ctx } = cardBase(h);
  ctx.fillStyle = "#8a8f98";
  ctx.font = `500 34px ${f.mono}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("ON SCREEN NOW", 64, 112);
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 150px ${f.display}`;
  ctx.fillText("AIRBUS A380", 60, 272);
  const rows = [
    ["WINGSPAN", "79.8 M"],
    ["LENGTH", "72.7 M"],
    ["ENGINES", "4"],
    ["SEATS (MAX)", "853"],
  ];
  rows.forEach(([k, v], i) => {
    const y = 380 + i * 92;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(64, y - 58, W - 128, 2);
    ctx.fillStyle = "#8a8f98";
    ctx.font = `500 38px ${f.mono}`;
    ctx.fillText(k, 64, y);
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 44px ${f.mono}`;
    const vw = ctx.measureText(v).width;
    ctx.fillText(v, W - 64 - vw, y);
  });
  return c;
}

function playKnob() {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  const cx = s / 2;
  // outer ring
  let g = ctx.createRadialGradient(cx - 60, cx - 80, 20, cx, cx, 250);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.55, "#c9ccd3");
  g.addColorStop(1, "#6d717c");
  ctx.beginPath();
  ctx.arc(cx, cx, 244, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // inner face
  g = ctx.createRadialGradient(cx + 40, cx + 50, 10, cx, cx, 190);
  g.addColorStop(0, "#f4f5f7");
  g.addColorStop(1, "#b6bac4");
  ctx.beginPath();
  ctx.arc(cx, cx, 178, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 52, cx - 74);
  ctx.lineTo(cx + 84, cx);
  ctx.lineTo(cx - 52, cx + 74);
  ctx.closePath();
  ctx.fillStyle = "#0b0b0f";
  ctx.fill();
  return c;
}

function toTexture(canvas, renderer) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

function cardMesh(canvas, width, renderer) {
  const h = (width * canvas.height) / canvas.width;
  const mat = new THREE.MeshBasicMaterial({
    map: toTexture(canvas, renderer),
    transparent: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, h), mat);
}

/**
 * Builds all cards. Returns [{ mesh, key }] (positions are set by the scene).
 */
export async function buildCards(renderer) {
  if (document.fonts?.ready) {
    try {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
    } catch {}
  }
  const f = fontStacks();
  const [img777x, imgLargest, imgCargo] = await Promise.all([
    loadImage("/assets/spotify_episodes/rejecting_777x.jpg"),
    loadImage("/assets/spotify_episodes/largest_plane.jpg"),
    loadImage("/assets/spotify_episodes/cargo_alaska.jpg"),
  ]);

  return [
    { key: "largest", mesh: cardMesh(videoCard(imgLargest, "The Rise, Fall and Possible Return of the World’s Largest Plane", "Documentary", f), 19, renderer) },
    { key: "spec", mesh: cardMesh(specCard(f), 19, renderer) },
    { key: "podcast", mesh: cardMesh(podcastCard(f), 19, renderer) },
    { key: "knob", mesh: cardMesh(playKnob(), 8, renderer) },
    { key: "stat", mesh: cardMesh(statCard(f), 18, renderer) },
    { key: "777x", mesh: cardMesh(videoCard(img777x, "Why Airlines Are Rejecting Boeing’s Brand-New 777X", "Documentary", f), 18, renderer) },
    { key: "topics", mesh: cardMesh(topicsCard(f), 17, renderer) },
    { key: "cargo", mesh: cardMesh(videoCard(imgCargo, "Why 80% of Cargo Planes Stop in Alaska", "Documentary", f), 18, renderer) },
  ];
}
