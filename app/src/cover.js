// Neon Bay Cover Studio — the cover renderer.
//
// Draws a GTA-style multi-panel poster onto a canvas: the photos fill diagonal
// panels, a sunset or neon colour grade washes over them, and a bold caption
// sits across the foot (or the top). Everything is plain canvas 2D, no library,
// no network — the photos are images the user loaded on their own machine.
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
  { id: 'sunset', label: 'Vice Sunset', hint: 'Warm orange and magenta dusk' },
  { id: 'neon', label: 'Neon Nights', hint: 'Cyan and magenta night glow' },
  { id: 'noir', label: 'Noir', hint: 'High-contrast black and white' },
];

// Panel shapes as fractions of the cover (x, y from 0..1), with the photo slot
// each panel shows. The slants give the poster its comic-book diagonal cuts.
const PANEL_SHAPES = {
  single: [
    { points: [[0, 0], [1, 0], [1, 1], [0, 1]], slot: 0 },
  ],
  duo: [
    { points: [[0, 0], [0.54, 0], [0.44, 1], [0, 1]], slot: 0 },
    { points: [[0.54, 0], [1, 0], [1, 1], [0.44, 1]], slot: 1 },
  ],
  triple: [
    { points: [[0, 0], [0.6, 0], [0.52, 1], [0, 1]], slot: 0 },
    { points: [[0.6, 0], [1, 0], [1, 0.52], [0.558, 0.52]], slot: 1 },
    { points: [[0.558, 0.52], [1, 0.52], [1, 1], [0.52, 1]], slot: 2 },
  ],
  quad: [
    { points: [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]], slot: 0 },
    { points: [[0.5, 0], [1, 0], [1, 0.5], [0.5, 0.5]], slot: 1 },
    { points: [[0, 0.5], [0.5, 0.5], [0.5, 1], [0, 1]], slot: 2 },
    { points: [[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1]], slot: 0 },
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
  sunset: 'saturate(1.3) contrast(1.06) brightness(1.02)',
  neon: 'saturate(1.5) contrast(1.12) hue-rotate(-12deg)',
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
    g.addColorStop(0, '#3d1a5c');
    g.addColorStop(1, '#a4136b');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `900 ${Math.round(Math.min(w, h) * 0.09)}px "Arial Black", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
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

/** The warm sun disc of the sunset grade, glowing over the top of the cover. */
function drawSun(ctx, w, h) {
  const cx = w * 0.68;
  const cy = h * 0.3;
  const r = h * 0.22;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  glow.addColorStop(0, 'rgba(255, 247, 214, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 190, 90, 0.55)');
  glow.addColorStop(1, 'rgba(255, 120, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
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
    drawSun(ctx, w, h);
    const wash = ctx.createLinearGradient(0, h * 0.4, 0, h);
    wash.addColorStop(0, 'rgba(255, 90, 40, 0)');
    wash.addColorStop(0.6, 'rgba(255, 80, 40, 0.3)');
    wash.addColorStop(1, 'rgba(180, 20, 110, 0.5)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    drawVignette(ctx, w, h, 0.42);
  } else if (grade === 'neon') {
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    top.addColorStop(0, 'rgba(0, 229, 255, 0.14)');
    top.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h * 0.5);
    const bottom = ctx.createLinearGradient(0, h * 0.5, 0, h);
    bottom.addColorStop(0, 'rgba(255, 0, 170, 0)');
    bottom.addColorStop(1, 'rgba(255, 0, 170, 0.2)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    const step = Math.max(4, Math.round(h / 220));
    for (let y = 0; y < h; y += step * 2) ctx.fillRect(0, y, w, 1);
    drawVignette(ctx, w, h, 0.5);
  } else {
    const light = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    light.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    light.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h * 0.4);
    drawVignette(ctx, w, h, 0.55);
  }
}

/** Fits the caption to the cover width, shrinking the font until it fits.
 *  The letter spacing is set before measuring, so the measured width is the
 *  width that will actually be drawn. */
function captionFont(ctx, text, size, maxWidth, tracking) {
  let s = size;
  try {
    ctx.letterSpacing = `${Math.max(1, Math.round(s * 0.02))}px`;
  } catch { /* see drawCaption */ }
  ctx.font = `900 ${Math.round(s)}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  while (s > 18 && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    try {
      ctx.letterSpacing = `${Math.max(1, Math.round(s * 0.02))}px`;
    } catch { /* see drawCaption */ }
    ctx.font = `900 ${Math.round(s)}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  }
  void tracking;
  return s;
}

/** The bold caption lettering, tilted a touch, with its sub-caption above it. */
function drawCaption(ctx, state, w, h) {
  const text = (state.caption || '').trim().toUpperCase();
  const sub = (state.subcaption || '').trim().toUpperCase();
  const atBottom = state.captionPos !== 'top';
  if (!text && !sub) return;

  if (atBottom) {
    const band = ctx.createLinearGradient(0, h * 0.52, 0, h);
    band.addColorStop(0, 'rgba(8, 0, 18, 0)');
    band.addColorStop(0.5, 'rgba(8, 0, 18, 0.55)');
    band.addColorStop(1, 'rgba(8, 0, 18, 0.78)');
    ctx.fillStyle = band;
    ctx.fillRect(0, h * 0.52, w, h * 0.48);
  } else {
    const band = ctx.createLinearGradient(0, 0, 0, h * 0.48);
    band.addColorStop(0, 'rgba(8, 0, 18, 0.78)');
    band.addColorStop(0.5, 'rgba(8, 0, 18, 0.55)');
    band.addColorStop(1, 'rgba(8, 0, 18, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, w, h * 0.48);
  }

  const baseSize = h * 0.105 * (state.captionSize ?? 1);
  const size = text ? captionFont(ctx, text, baseSize, w * 0.88) : 0;
  const baseline = atBottom ? h - h * 0.075 : h * 0.17;
  const subSize = Math.max(14, Math.round(h * 0.032));

  ctx.save();
  ctx.translate(w / 2, baseline);
  ctx.rotate(-0.02);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  try {
    ctx.letterSpacing = `${Math.max(1, Math.round(size * 0.02))}px`;
  } catch {
    // letterSpacing is not supported everywhere; the caption is fine without it.
  }

  if (sub) {
    ctx.font = `700 ${subSize}px "Arial Black", Arial, sans-serif`;
    try {
      ctx.letterSpacing = `${Math.max(2, Math.round(subSize * 0.28))}px`;
    } catch { /* see above */ }
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subSize * 0.3;
    const subY = atBottom ? -size * 0.92 : size * 0.95;
    ctx.fillText(`★ ${sub} ★`, 0, subY);
    ctx.shadowBlur = 0;
  }

  if (text) {
    ctx.font = `900 ${Math.round(size)}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    // The sub-caption above sets a wide tracking of its own; put the main
    // caption's tracking back before drawing, or the text runs too wide.
    try {
      ctx.letterSpacing = `${Math.max(1, Math.round(size * 0.02))}px`;
    } catch { /* see above */ }
    ctx.lineJoin = 'round';
    if (state.captionStyle === 'outline') {
      ctx.fillStyle = 'rgba(20, 0, 30, 0.55)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, size * 0.055);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = size * 0.12;
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
    } else if (state.captionStyle === 'neon') {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = size * 0.32;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 0, 0);
      ctx.shadowColor = '#ff00a8';
      ctx.shadowBlur = size * 0.18;
      ctx.shadowOffsetY = size * 0.03;
      ctx.fillText(text, 0, 0);
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
      ctx.lineWidth = Math.max(1, size * 0.015);
      ctx.strokeText(text, 0, 0);
    } else {
      ctx.shadowColor = 'rgba(255, 0, 120, 0.55)';
      ctx.shadowBlur = size * 0.18;
      ctx.shadowOffsetY = size * 0.03;
      ctx.strokeStyle = '#16001f';
      ctx.lineWidth = Math.max(2, size * 0.1);
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

  // White gutters between the panels and a white frame around the whole poster.
  const gutter = Math.max(4, Math.round(w * 0.006));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = gutter;
  ctx.lineJoin = 'round';
  for (const panel of panels) {
    tracePath(ctx, panel.points);
    ctx.stroke();
  }
  const frame = Math.max(6, Math.round(w * 0.008));
  ctx.lineWidth = frame;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);

  applyGrade(ctx, w, h, state.grade);
  drawCaption(ctx, state, w, h);
  return panels;
}
