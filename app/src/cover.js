// Neon Bay Cover Studio — the cover renderer.
//
// Draws a GTA-style multi-panel poster onto a canvas: the photos fill diagonal
// panels, a Vice City sunset or neon colour grade washes over them, palm
// silhouettes and a striped synthwave sun set the scene, a halftone dot
// texture gives it the comic-book poster print, a dark skyline sits behind
// the title, and bold condensed caption lettering sits across the foot (or
// the top). Everything is plain canvas 2D, no library, no network — the
// photos are images the user loaded on their own machine.
//
// A "state" is:
//   { layout, size, grade, caption, subcaption, captionSize, captionPos,
//     captionStyle, photos: [img|null, img|null, img|null],
//     crops: [{ zoom, panX, panY }, ...] }   // one crop per panel, in order

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Landscape 1920 x 1080' },
};

export const LAYOUTS = [
  { id: 'triple', label: 'Triple panel', hint: 'Hero photo left, two stacked right' },
  { id: 'duo', label: 'Duo split', hint: 'Two photos, one diagonal split' },
  { id: 'quad', label: 'Four grid', hint: 'Four panels, classic poster grid' },
  { id: 'single', label: 'Single photo', hint: 'One photo, full bleed' },
];

export const GRADES = [
  { id: 'sunset', label: 'Vice Sunset', hint: 'Blazing pink-orange dusk, striped sun, palm silhouettes' },
  { id: 'neon', label: 'Neon Nights', hint: 'Cyan and magenta night glow, lit skyline' },
  { id: 'noir', label: 'Noir', hint: 'High-contrast black and white, halftone print' },
];

// Panel shapes as fractions of the cover (x, y from 0..1), with the photo slot
// each panel shows. The slants give the poster its comic-book diagonal cuts.
const PANEL_SHAPES = {
  single: [
    { points: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 0 },
  ],
  duo: [
    { points: [[0, 0], [0.58, 0], [0.4, 1], [0, 1]], slot: 0 },
    { points: [[0.58, 0], [1, 0], [1, 1], [0.4, 1]], slot: 1 },
  ],
  triple: [
    { points: [[0, 0], [0.62, 0], [0.44, 1], [0, 1]], slot: 0 },
    { points: [[0.62, 0], [1, 0], [1, 0.46], [0.53, 0.54]], slot: 1 },
    { points: [[0.53, 0.54], [1, 0.46], [1, 1], [0.44, 1]], slot: 2 },
  ],
  quad: [
    // A slashed cross: both seams run diagonal, so even the grid reads as a
    // comic-book cut instead of a plain four-square.
    { points: [[0, 0], [0.56, 0], [0.44, 0.56], [0, 0.5]], slot: 0 },
    { points: [[0.56, 0], [1, 0], [1, 0.44], [0.44, 0.56]], slot: 1 },
    { points: [[0, 0.5], [0.44, 0.56], [0.56, 1], [0, 1]], slot: 2 },
    { points: [[0.44, 0.56], [1, 0.44], [1, 1], [0.56, 1]], slot: 0 },
  ],
};

const DEFAULT_CROP = { zoom: 1, panX: 0, panY: 0.45 };

/** Builds the panels for a layout at cover size, carrying crops over by index. */
export function buildPanels(layout, w, h, crops = []) {
  const shapes = PANEL_SHAPES[layout] ?? PANEL_SHAPES.triple;
  return shapes.map((shape, i) => {
    const crop = crops[i] ?? DEFAULT_CROP;
    const points = shape.points.map(([fx, fy]) => [fx * w, fy * h]);
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    return {
      points,
      slot: shape.slot,
      zoom: crop.zoom ?? 1,
      panX: crop.panX ?? 0,
      panY: crop.panY ?? 0,
      box: {
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      },
    };
  });
}

const GRADE_FILTER = {
  sunset: 'saturate(1.45) contrast(1.1) brightness(1.03) sepia(0.18)',
  neon: 'saturate(1.75) contrast(1.16) hue-rotate(-10deg) brightness(0.97)',
  noir: 'grayscale(1) contrast(1.25) brightness(1.05)',
};

function tracePath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

/** Draws one photo into one panel, cover-fit, with the panel's zoom and pan. */
function drawPhotoPanel(ctx, panel, img, grade) {
  const { x, y, w, h } = panel.box;
  ctx.save();
  tracePath(ctx, panel.points);
  ctx.clip();
  if (!img) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#2b0a4e');
    g.addColorStop(0.55, '#ff2e88');
    g.addColorStop(1, '#ff7a1a');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.font = `900 ${Math.round(Math.min(w, h) * 0.09)}px "Arial Black", Impact, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(18, 0, 30, 0.9)';
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.012);
    ctx.strokeText(`PHOTO ${'ABC'[panel.slot]}`, x + w / 2, y + h / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`PHOTO ${'ABC'[panel.slot]}`, x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }
  ctx.filter = GRADE_FILTER[grade] ?? GRADE_FILTER.sunset;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(w / iw, h / ih);
  const scale = base * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const slackX = Math.max(0, (dw - w) / 2);
  const slackY = Math.max(0, (dh - h) / 2);
  const dx = x + (w - dw) / 2 + panel.panX * slackX;
  const dy = y + (h - dh) / 2 + panel.panY * slackY;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** The striped synthwave sun of the Vice City sunset: a glowing disc with
 *  horizontal slits cut through its lower half, drawn on its own layer so
 *  the slits reveal the sky wash instead of punching through the photos. */
function drawStripedSun(ctx, w, h) {
  // Big and loud now — the sun is the poster's icon, not a corner accent.
  // It sits in the extreme top-right, slightly transparent, so a face behind
  // it still shows through, but at this size it reads from across the room.
  const cx = w * 0.93;
  const cy = h * 0.1;
  const r = Math.min(w, h) * 0.15;
  ctx.save();
  ctx.globalAlpha = 0.9;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.9);
  glow.addColorStop(0, 'rgba(255, 247, 214, 0.9)');
  glow.addColorStop(0.3, 'rgba(255, 190, 90, 0.55)');
  glow.addColorStop(0.6, 'rgba(255, 80, 120, 0.28)');
  glow.addColorStop(1, 'rgba(255, 80, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);

  const layer = document.createElement('canvas');
  layer.width = Math.ceil(r * 2);
  layer.height = Math.ceil(r * 2);
  const lc = layer.getContext('2d');
  const disc = lc.createLinearGradient(0, 0, 0, r * 2);
  disc.addColorStop(0, '#fff7d6');
  disc.addColorStop(0.35, '#ffb84d');
  disc.addColorStop(0.7, '#ff5e3a');
  disc.addColorStop(1, '#ff2e88');
  lc.fillStyle = disc;
  lc.beginPath();
  lc.arc(r, r, r, 0, Math.PI * 2);
  lc.fill();
  // Slits through the lower half, widening as they fall — thick and punchy.
  lc.globalCompositeOperation = 'destination-out';
  let y = r * 1.02;
  let thick = Math.max(3, r * 0.045);
  while (y < r * 2) {
    lc.fillRect(0, y, r * 2, thick);
    y += Math.max(7, r * 0.1);
    thick *= 1.45;
  }
  lc.globalCompositeOperation = 'source-over';
  ctx.drawImage(layer, cx - r, cy - r);
  ctx.restore();
}

/** One palm-tree silhouette: a leaning trunk and a fan of drooping fronds. */
function drawPalm(ctx, x, y, s, lean, color) {
  const crownX = x + lean * s;
  const crownY = y - s;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  // Trunk, leaning toward the crown.
  ctx.lineWidth = Math.max(3, s * 0.085);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 0.4, y - s * 0.55, crownX, crownY);
  ctx.stroke();
  // Fronds: six curved blades fanning out from the crown, arching up first
  // and then drooping well below the crown — a palm silhouette, not a spider.
  const fronds = [-2.5, -2.1, -1.7, -1.2, -0.7, -0.25];
  for (const a of fronds) {
    const len = s * (0.42 + 0.12 * Math.cos(a));
    const tipX = crownX + Math.cos(a) * len;
    const tipY = crownY + len * 0.75 + Math.sin(a) * len * 0.25;
    const midX = crownX + Math.cos(a) * len * 0.55;
    const midY = crownY + Math.sin(a) * len * 0.5 - len * 0.25;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX + Math.cos(a) * len * 0.08, midY + len * 0.14, crownX, crownY);
    ctx.fill();
  }
  // Coconuts at the crown.
  ctx.beginPath();
  ctx.arc(crownX - s * 0.03, crownY + s * 0.04, s * 0.035, 0, Math.PI * 2);
  ctx.arc(crownX + s * 0.05, crownY + s * 0.05, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
}

/** A tall, varied city skyline strip hugging the bottom edge, windows lit,
 *  with rooftop antennae and a few landmark towers — the Vice City horizon.
 *  It sits below the caption text, so the title never fights the buildings. */
function drawSkyline(ctx, w, h, color, winColor) {
  const y0 = h * 0.995;
  let x = -w * 0.01;
  let i = 0;
  ctx.fillStyle = color;
  while (x < w * 1.01) {
    const bw = w * (0.045 + ((i * 37) % 10) * 0.006);
    // Landmark towers every fifth building rise well above the rest.
    const tall = i % 5 === 2;
    const bh = h * (0.04 + ((i * 53) % 10) * 0.006) * (tall ? 1.9 : 1);
    ctx.fillRect(x, y0 - bh, bw, bh + h * 0.005);
    if (tall) {
      // A second tier and an antenna with a lit beacon on top.
      const tw = bw * 0.45;
      ctx.fillRect(x + bw * 0.28, y0 - bh - h * 0.022, tw, h * 0.022);
      ctx.fillRect(x + bw * 0.46, y0 - bh - h * 0.05, Math.max(2, w * 0.003), h * 0.03);
      ctx.fillStyle = winColor;
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(x + bw * 0.475, y0 - bh - h * 0.052, Math.max(2, w * 0.0035), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
    } else if (i % 4 === 1) {
      // A plain antenna on every fourth building.
      ctx.fillRect(x + bw * 0.48, y0 - bh - h * 0.018, Math.max(2, w * 0.0025), h * 0.018);
    }
    // Lit windows, denser than before.
    ctx.fillStyle = winColor;
    const cols = Math.max(2, Math.floor(bw / (w * 0.016)));
    const rows = Math.max(2, Math.floor(bh / (h * 0.014)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if ((i * 7 + c * 3 + r * 5) % 3 === 0) {
          ctx.globalAlpha = 0.55 + ((i + c + r) % 3) * 0.15;
          ctx.fillRect(x + bw * 0.12 + c * bw * 0.72 / Math.max(1, cols - 1 || 1), y0 - bh + bh * 0.12 + r * bh * 0.74 / Math.max(1, rows - 1 || 1), Math.max(2, w * 0.0045), Math.max(2, h * 0.006));
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    x += bw + w * 0.004;
    i++;
  }
}

/** Comic-book halftone dots: small in the light, fat in the dark, over the
 *  whole cover at a low alpha so the print texture reads without hiding
 *  the photos. */
function drawHalftone(ctx, w, h, color, alpha) {
  const spacing = Math.max(9, Math.round(w / 96));
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (let row = 0, y = spacing / 2; y < h; y += spacing, row++) {
    // Dots grow hard toward the foot of the poster — the comic print reads
    // loudest where the caption sits, and stays fine over the photos' faces.
    const t = y / h;
    const shade = 0.22 + 1.15 * t * t;
    const r = Math.max(0.8, spacing * 0.16 * shade * 2);
    for (let x = spacing / 2 + (row % 2 ? spacing / 2 : 0); x < w; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** A soft dark vignette so the edges fall away and the middle pops. */
function drawVignette(ctx, w, h, strength) {
  const cx = w / 2;
  const cy = h * 0.45;
  const r = Math.max(w, h) * 0.75;
  const g = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  g.addColorStop(0, 'rgba(8, 0, 16, 0)');
  g.addColorStop(1, `rgba(8, 0, 16, ${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** The colour wash of the chosen grade, laid over the panels. */
function applyGrade(ctx, w, h, grade) {
  if (grade === 'sunset') {
    // Dusk sky washing down from the top: deep purple into hot pink, much
    // stronger than before so the whole poster glows Vice City.
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, 'rgba(43, 10, 78, 0.46)');
    sky.addColorStop(0.45, 'rgba(255, 46, 136, 0.28)');
    sky.addColorStop(1, 'rgba(255, 122, 26, 0.14)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.55);
    drawStripedSun(ctx, w, h);
    // A hot horizon glow band where the sky meets the city.
    const horizon = ctx.createLinearGradient(0, h * 0.42, 0, h * 0.62);
    horizon.addColorStop(0, 'rgba(255, 140, 40, 0)');
    horizon.addColorStop(0.5, 'rgba(255, 110, 40, 0.22)');
    horizon.addColorStop(1, 'rgba(255, 140, 40, 0)');
    ctx.fillStyle = horizon;
    ctx.fillRect(0, h * 0.42, w, h * 0.2);
    const wash = ctx.createLinearGradient(0, h * 0.4, 0, h);
    wash.addColorStop(0, 'rgba(255, 90, 40, 0)');
    wash.addColorStop(0.55, 'rgba(255, 80, 40, 0.4)');
    wash.addColorStop(1, 'rgba(180, 20, 110, 0.66)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    // Palm silhouettes peeking from the bottom corners, nearly upright so
    // their trunks hug the edge instead of slashing across the photo.
    const ps = Math.min(w, h);
    drawPalm(ctx, w * 0.015, h * 0.995, ps * 0.3, 0.15, 'rgba(24, 2, 38, 0.94)');
    drawPalm(ctx, w * 0.985, h * 0.995, ps * 0.24, -0.2, 'rgba(24, 2, 38, 0.94)');
    drawHalftone(ctx, w, h, '#ff2e88', 0.16);
    drawSkyline(ctx, w, h, 'rgba(18, 0, 30, 0.92)', '#ffd166');
    drawVignette(ctx, w, h, 0.46);
  } else if (grade === 'neon') {
    // Dusk first: push daylight photos toward night, then the neon washes.
    const dusk = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    dusk.addColorStop(0, 'rgba(10, 4, 40, 0.38)');
    dusk.addColorStop(1, 'rgba(10, 4, 40, 0)');
    ctx.fillStyle = dusk;
    ctx.fillRect(0, 0, w, h * 0.4);
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    top.addColorStop(0, 'rgba(0, 229, 255, 0.36)');
    top.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h * 0.5);
    const bottom = ctx.createLinearGradient(0, h * 0.5, 0, h);
    bottom.addColorStop(0, 'rgba(255, 0, 170, 0)');
    bottom.addColorStop(1, 'rgba(255, 0, 170, 0.46)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    // Neon glow pooling in the corners.
    const pool = ctx.createRadialGradient(w * 0.85, h * 0.9, 0, w * 0.85, h * 0.9, w * 0.5);
    pool.addColorStop(0, 'rgba(255, 0, 170, 0.38)');
    pool.addColorStop(1, 'rgba(255, 0, 170, 0)');
    ctx.fillStyle = pool;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    const step = Math.max(4, Math.round(h / 220));
    for (let y = 0; y < h; y += step * 2) ctx.fillRect(0, y, w, 1);
    drawPalm(ctx, w * 0.985, h * 0.995, Math.min(w, h) * 0.24, -0.2, 'rgba(10, 0, 26, 0.94)');
    drawHalftone(ctx, w, h, '#00e5ff', 0.16);
    drawSkyline(ctx, w, h, 'rgba(8, 0, 24, 0.94)', '#00e5ff');
    drawVignette(ctx, w, h, 0.54);
  } else {
    const light = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    light.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    light.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h * 0.4);
    drawHalftone(ctx, w, h, '#000000', 0.19);
    drawSkyline(ctx, w, h, 'rgba(10, 10, 12, 0.9)', '#e8e8e8');
    drawVignette(ctx, w, h, 0.55);
  }
}

/** Fits the caption to the cover width, shrinking the font until it fits.
 *  The letter spacing is set before measuring, so the measured width is the
 *  width that will actually be drawn. */
function captionFont(ctx, text, size, maxWidth, tracking) {
  let s = size;
  try {
    ctx.letterSpacing = `${Math.max(0, Math.round(s * 0.01))}px`;
  } catch { /* see drawCaption */ }
  ctx.font = `900 ${Math.round(s)}px "Arial Black", Impact, "Helvetica Neue", Arial, sans-serif`;
  while (s > 18 && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    try {
      ctx.letterSpacing = `${Math.max(0, Math.round(s * 0.01))}px`;
    } catch { /* see drawCaption */ }
    ctx.font = `900 ${Math.round(s)}px "Arial Black", Impact, "Helvetica Neue", Arial, sans-serif`;
  }
  void tracking;
  return s;
}

/** The bold caption lettering, tilted a touch and squeezed tall like poster
 *  type, with its sub-caption above it. */
function drawCaption(ctx, state, w, h) {
  const text = (state.caption || '').trim().toUpperCase();
  const sub = (state.subcaption || '').trim().toUpperCase();
  const atBottom = state.captionPos !== 'top';
  if (!text && !sub) return;

  if (atBottom) {
    const band = ctx.createLinearGradient(0, h * 0.52, 0, h);
    band.addColorStop(0, 'rgba(8, 0, 18, 0)');
    band.addColorStop(0.5, 'rgba(8, 0, 18, 0.6)');
    band.addColorStop(1, 'rgba(8, 0, 18, 0.85)');
    ctx.fillStyle = band;
    ctx.fillRect(0, h * 0.52, w, h * 0.48);
  } else {
    const band = ctx.createLinearGradient(0, 0, 0, h * 0.48);
    band.addColorStop(0, 'rgba(8, 0, 18, 0.85)');
    band.addColorStop(0.5, 'rgba(8, 0, 18, 0.6)');
    band.addColorStop(1, 'rgba(8, 0, 18, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, w, h * 0.48);
  }

  const baseSize = h * 0.115 * (state.captionSize ?? 1);
  const size = text ? captionFont(ctx, text, baseSize, w * 0.88) : 0;
  const baseline = atBottom ? h - h * 0.075 : h * 0.17;
  const subSize = Math.max(14, Math.round(h * 0.032));

  ctx.save();
  ctx.translate(w / 2, baseline);
  ctx.rotate(-0.02);
  // Squeeze the letters a little narrower and stretch them a little taller,
  // the condensed poster-type look. Measuring already happened, so the fit
  // check stays conservative.
  ctx.transform(0.93, 0, 0, 1.05, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  try {
    ctx.letterSpacing = `${Math.max(0, Math.round(size * 0.01))}px`;
  } catch {
    // letterSpacing is not supported everywhere; the caption is fine without it.
  }

  if (sub) {
    ctx.font = `700 ${subSize}px "Arial Black", Impact, Arial, sans-serif`;
    try {
      ctx.letterSpacing = `${Math.max(2, Math.round(subSize * 0.28))}px`;
    } catch { /* see above */ }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = Math.max(2, subSize * 0.14);
    const subY = atBottom ? -size * 0.92 : size * 0.95;
    ctx.strokeText(`★ ${sub} ★`, 0, subY);
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subSize * 0.3;
    ctx.fillText(`★ ${sub} ★`, 0, subY);
    ctx.shadowBlur = 0;
    // A diagonal neon slash above the sub-caption — the poster's speed line,
    // pink melting into orange, fading at both ends.
    const slashY = atBottom ? subY - subSize * 2.1 : subY + subSize * 2.1;
    const slashGrad = ctx.createLinearGradient(-w * 0.35, 0, w * 0.35, 0);
    slashGrad.addColorStop(0, 'rgba(255, 46, 136, 0)');
    slashGrad.addColorStop(0.5, 'rgba(255, 46, 136, 0.95)');
    slashGrad.addColorStop(1, 'rgba(255, 122, 26, 0)');
    ctx.fillStyle = slashGrad;
    ctx.fillRect(-w * 0.35, slashY - Math.max(2, subSize * 0.09), w * 0.7, Math.max(4, subSize * 0.18));
  }

  if (text) {
    ctx.font = `900 ${Math.round(size)}px "Arial Black", Impact, "Helvetica Neue", Arial, sans-serif`;
    // The sub-caption above sets a wide tracking of its own; put the main
    // caption's tracking back before drawing, or the text runs too wide.
    try {
      ctx.letterSpacing = `${Math.max(0, Math.round(size * 0.01))}px`;
    } catch { /* see above */ }
    ctx.lineJoin = 'round';
    if (state.captionStyle === 'outline') {
      ctx.fillStyle = 'rgba(20, 0, 30, 0.62)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, size * 0.09);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = size * 0.14;
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
    } else if (state.captionStyle === 'neon') {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = size * 0.38;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 0, 0);
      ctx.shadowColor = '#ff00a8';
      ctx.shadowBlur = size * 0.22;
      ctx.shadowOffsetY = size * 0.03;
      ctx.fillText(text, 0, 0);
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
      ctx.lineWidth = Math.max(1, size * 0.024);
      ctx.strokeText(text, 0, 0);
    } else if (state.captionStyle === 'vice') {
      // Sunset gradient letters: gold into orange into hot pink, keyed with
      // a thick black outline and a thin white sticker line.
      const grad = ctx.createLinearGradient(0, -size * 0.75, 0, size * 0.25);
      grad.addColorStop(0, '#ffd166');
      grad.addColorStop(0.5, '#ff7a1a');
      grad.addColorStop(1, '#ff2e88');
      ctx.shadowColor = 'rgba(255, 0, 120, 0.6)';
      ctx.shadowBlur = size * 0.2;
      ctx.shadowOffsetY = size * 0.04;
      ctx.strokeStyle = '#16001f';
      ctx.lineWidth = Math.max(3, size * 0.16);
      ctx.strokeText(text, 0, 0);
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
      ctx.fillStyle = grad;
      ctx.fillText(text, 0, 0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = Math.max(1, size * 0.018);
      ctx.strokeText(text, 0, 0);
    } else {
      // Block: a hot-pink echo behind the letters, then a fat black keyline
      // and a white face — the sticker look of a GTA poster title.
      ctx.fillStyle = '#ff2e88';
      ctx.fillText(text, size * 0.022, size * 0.032);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = size * 0.1;
      ctx.shadowOffsetY = size * 0.02;
      ctx.strokeStyle = '#16001f';
      ctx.lineWidth = Math.max(2, size * 0.15);
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 0, 0);
    }
  }
  ctx.restore();
  try {
    ctx.letterSpacing = '0px';
  } catch { /* see above */ }
}

/**
 * Renders the whole cover onto `canvas` at the export size named by the state,
 * and returns the panels it drew (with their boxes, for the editor to use).
 */
export function renderCover(canvas, state) {
  const size = SIZES[state.size] ?? SIZES.square;
  const w = size.w;
  const h = size.h;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);

  const panels = buildPanels(state.layout, w, h, state.crops);
  for (const panel of panels) {
    drawPhotoPanel(ctx, panel, state.photos[panel.slot] ?? null, state.grade);
  }

  // Comic-book gutters: a black keyline under each white gutter, and a black
  // outer keyline under the white frame, so the panels read as cut-outs.
  const gutter = Math.max(4, Math.round(w * 0.006));
  const keyline = Math.max(3, Math.round(w * 0.004));
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#12001e';
  ctx.lineWidth = gutter + keyline;
  for (const panel of panels) {
    tracePath(ctx, panel.points);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = gutter;
  for (const panel of panels) {
    tracePath(ctx, panel.points);
    ctx.stroke();
  }
  const frame = Math.max(6, Math.round(w * 0.008));
  ctx.lineWidth = frame + keyline;
  ctx.strokeStyle = '#12001e';
  ctx.strokeRect((frame + keyline) / 2, (frame + keyline) / 2, w - frame - keyline, h - frame - keyline);
  ctx.lineWidth = frame;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);

  applyGrade(ctx, w, h, state.grade);
  // Neon Nights gets glowing panel seams: the white gutters catch a magenta
  // neon edge, so the cuts themselves light up like a sign at night.
  if (state.grade === 'neon') {
    ctx.save();
    ctx.shadowColor = '#ff00a8';
    ctx.shadowBlur = Math.max(8, w * 0.014);
    ctx.strokeStyle = 'rgba(255, 0, 168, 0.9)';
    ctx.lineWidth = Math.max(2, w * 0.0022);
    ctx.lineJoin = 'round';
    for (const panel of panels) {
      tracePath(ctx, panel.points);
      ctx.stroke();
    }
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = Math.max(6, w * 0.01);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
    ctx.lineWidth = Math.max(1, w * 0.0012);
    for (const panel of panels) {
      tracePath(ctx, panel.points);
      ctx.stroke();
    }
    ctx.restore();
  }
  drawCaption(ctx, state, w, h);
  return panels;
}
