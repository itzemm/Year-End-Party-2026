"use client";

import { ZOOM_SCALES } from "./rules";

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file isn’t a picture we can read"));
    img.src = src;
  });
}

export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn’t read that file"));
    reader.onload = () => loadImage(reader.result).then(resolve, reject);
    reader.readAsDataURL(file);
  });
}

function toJpeg(canvas, quality = 0.82) {
  return canvas.toDataURL("image/jpeg", quality);
}

// Scale a picture down so its longest side is at most `maxSide`.
export function resizeToDataUrl(img, maxSide = 800, quality = 0.82) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return toJpeg(canvas, quality);
}

// Suggest a detailed spot to zoom into (where colours vary most), as fractions 0–1.
export function suggestFocus(img) {
  try {
    const N = 120;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = N;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, N, N);
    const { data } = ctx.getImageData(0, 0, N, N);
    const lum = (x, y) => {
      const i = (y * N + x) * 4;
      return 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
    };
    let best = [];
    const R = 6;
    for (let y = 30; y < 90; y += 4) {
      for (let x = 30; x < 90; x += 4) {
        let sum = 0;
        let sq = 0;
        let n = 0;
        for (let dy = -R; dy <= R; dy += 2) {
          for (let dx = -R; dx <= R; dx += 2) {
            const v = lum(x + dx, y + dy);
            sum += v;
            sq += v * v;
            n++;
          }
        }
        best.push({ x: x / N, y: y / N, v: sq / n - (sum / n) ** 2 });
      }
    }
    best.sort((a, b) => b.v - a.v);
    best = best.slice(0, 8);
    const pick = best[Math.floor(Math.random() * best.length)];
    return { x: pick.x, y: pick.y };
  } catch {
    return { x: 0.5, y: 0.5 };
  }
}

// The crop shown at each zoom level: a square around `focus`, kept inside the picture.
export function cropRect(img, focus, scale) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  if (scale <= 1) return { x: 0, y: 0, w: W, h: H };
  const side = Math.min(W, H) / scale;
  const x = Math.min(Math.max(focus.x * W - side / 2, 0), W - side);
  const y = Math.min(Math.max(focus.y * H - side / 2, 0), H - side);
  return { x, y, w: side, h: side };
}

// Pre-cut every zoom level, so the server can hand out one level at a time.
export function makeZoomLevels(img, focus) {
  return ZOOM_SCALES.map((scale) => {
    const r = cropRect(img, focus, scale);
    // Close-ups are enlarged to 640px (a little soft, like a real zoom); the full
    // picture is only ever shrunk.
    const longest = Math.max(r.w, r.h);
    const k = scale <= 1 ? Math.min(1, 900 / longest) : 640 / longest;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(r.w * k));
    canvas.height = Math.max(1, Math.round(r.h * k));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
    return toJpeg(canvas, 0.8);
  });
}
