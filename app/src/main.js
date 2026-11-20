// Neon Bay Cover Studio — wires the editor page.
//
// The page holds one state object (layout, photos, crops, caption, grade, size)
// and re-renders the cover canvas from it on every change. Photos come from the
// user's own files (FileReader object URLs) or the two free samples; nothing is
// uploaded anywhere. A `?shot=` query sets up a fixed scene for a screenshot
// instead of the interactive editor (see ./shots.js).

import {
  DEFAULT_BILLING,
  DEFAULT_CAST_ROLES,
  DEFAULT_LOCATION,
  DEFAULT_QUOTE,
  DEFAULT_QUOTE_BY,
  DEFAULT_SEAL,
  DEFAULT_SEAL_SUB,
  DEFAULT_TAGLINE,
  DEFAULT_VOLUME,
  GRADES,
  LAYOUTS,
  SIZES,
  renderCover,
} from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const previewNote = document.getElementById('previewNote');

const state = {
  layout: 'triple',
  size: 'square',
  grade: 'sunset',
  caption: 'Sunset Heist',
  subcaption: 'Neon Bay',
  captionSize: 1,
  captionPos: 'bottom',
  captionStyle: 'block',
  photos: [null, null, null],
  crops: [],
  // Movie-poster furniture (see cover.js for the defaults).
  castRoles: [...DEFAULT_CAST_ROLES],
  billing: DEFAULT_BILLING,
  quote: DEFAULT_QUOTE,
  quoteBy: DEFAULT_QUOTE_BY,
  seal: DEFAULT_SEAL,
  sealSub: DEFAULT_SEAL_SUB,
  location: DEFAULT_LOCATION,
  tagline: DEFAULT_TAGLINE,
  volume: DEFAULT_VOLUME,
};

// Crops are kept per layout, so switching layouts does not lose a panel's crop.
const cropsByLayout = {};
let activePanel = 0;
let panelCount = 0;

function currentCrops() {
  if (!cropsByLayout[state.layout]) cropsByLayout[state.layout] = [];
  return cropsByLayout[state.layout];
}

function render() {
  state.crops = currentCrops();
  const panels = renderCover(canvas, state);
  if (panels.length !== panelCount) {
    panelCount = panels.length;
    activePanel = Math.min(activePanel, panelCount - 1);
    buildPanelChoices(panels);
  }
  syncCropSliders();
  const size = SIZES[state.size];
  previewNote.textContent = `Live preview — ${size.w} x ${size.h}`;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function setPhoto(slot, img, thumbSrc) {
  state.photos[slot] = img;
  const thumb = document.getElementById(`thumb${slot}`);
  if (thumb) thumb.src = thumbSrc;
  render();
}

async function loadSample(slot, name) {
  const img = await loadImage(`samples/${name}.jpg`);
  setPhoto(slot, img, `samples/${name}.jpg`);
}

/** Builds a row of toggle buttons from a list of {id, label} options. */
function buildChoices(containerId, options, current, onPick) {
  const box = document.getElementById(containerId);
  box.replaceChildren();
  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.textContent = option.label;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(option.id === current));
    button.addEventListener('click', () => onPick(option.id));
    box.appendChild(button);
  }
}

function refreshChoices() {
  buildChoices('layoutChoices', LAYOUTS, state.layout, (id) => {
    state.layout = id;
    document.getElementById('layoutHint').textContent =
      (LAYOUTS.find((l) => l.id === id) ?? {}).hint ?? '';
    render();
    refreshChoices();
  });
  buildChoices('gradeChoices', GRADES, state.grade, (id) => {
    state.grade = id;
    document.getElementById('gradeHint').textContent =
      (GRADES.find((g) => g.id === id) ?? {}).hint ?? '';
    render();
    refreshChoices();
  });
  buildChoices(
    'sizeChoices',
    Object.entries(SIZES).map(([id, s]) => ({ id, label: s.label })),
    state.size,
    (id) => {
      state.size = id;
      render();
      refreshChoices();
    },
  );
  document.getElementById('layoutHint').textContent =
    (LAYOUTS.find((l) => l.id === state.layout) ?? {}).hint ?? '';
  document.getElementById('gradeHint').textContent =
    (GRADES.find((g) => g.id === state.grade) ?? {}).hint ?? '';
}

function buildPanelChoices(panels) {
  const box = document.getElementById('panelChoices');
  box.replaceChildren();
  panels.forEach((panel, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';
    button.textContent = `Panel ${i + 1} · Photo ${'ABC'[panel.slot]}`;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(i === activePanel));
    button.addEventListener('click', () => {
      activePanel = i;
      buildPanelChoices(panels);
      syncCropSliders();
    });
    box.appendChild(button);
  });
}

function activeCrop() {
  const crops = currentCrops();
  if (!crops[activePanel]) crops[activePanel] = { zoom: 1, panX: 0, panY: 0 };
  return crops[activePanel];
}

function syncCropSliders() {
  const crop = currentCrops()[activePanel] ?? { zoom: 1, panX: 0, panY: 0 };
  document.getElementById('zoom').value = String(crop.zoom);
  document.getElementById('panX').value = String(crop.panX);
  document.getElementById('panY').value = String(crop.panY);
}

function bindCropSlider(id, key) {
  document.getElementById(id).addEventListener('input', (event) => {
    activeCrop()[key] = Number(event.target.value);
    render();
  });
}

// Photo slots: file uploads and sample buttons.
for (let slot = 0; slot < 3; slot++) {
  document.getElementById(`file${slot}`).addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const img = await loadImage(URL.createObjectURL(file));
    setPhoto(slot, img, URL.createObjectURL(file));
    status.textContent = `${file.name} loaded into Photo ${'ABC'[slot]}.`;
  });
}
document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    const slot = Number(button.dataset.sample);
    await loadSample(slot, button.dataset.photo);
    status.textContent = `Sample ${button.dataset.photo} loaded into Photo ${'ABC'[slot]}.`;
  });
});

// Caption controls.
document.getElementById('caption').addEventListener('input', (e) => {
  state.caption = e.target.value;
  render();
});
document.getElementById('subcaption').addEventListener('input', (e) => {
  state.subcaption = e.target.value;
  render();
});
document.getElementById('captionSize').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value);
  render();
});
document.getElementById('captionPos').addEventListener('change', (e) => {
  state.captionPos = e.target.value;
  render();
});
document.getElementById('captionStyle').addEventListener('change', (e) => {
  state.captionStyle = e.target.value;
  render();
});

// Poster furniture controls.
for (let i = 0; i < 4; i++) {
  document.getElementById(`role${i}`).addEventListener('input', (e) => {
    state.castRoles[i] = e.target.value;
    render();
  });
}
const furnitureFields = [
  ['billing', 'billing'],
  ['quote', 'quote'],
  ['quoteBy', 'quoteBy'],
  ['seal', 'seal'],
  ['sealSub', 'sealSub'],
  ['location', 'location'],
  ['tagline', 'tagline'],
  ['volume', 'volume'],
];
for (const [id, field] of furnitureFields) {
  document.getElementById(id).addEventListener('input', (e) => {
    state[field] = e.target.value;
    render();
  });
}

bindCropSlider('zoom', 'zoom');
bindCropSlider('panX', 'panX');
bindCropSlider('panY', 'panY');

/** Renders the cover at its export size and downloads it as a PNG.
 *  With { download: false } it only renders and reports the PNG's byte count
 *  (used by the screenshot scenes to prove the export works). */
export function exportCover(options = {}) {
  const download = options.download !== false;
  return new Promise((resolve) => {
    const offscreen = document.createElement('canvas');
    const panels = renderCover(offscreen, state);
    void panels;
    const size = SIZES[state.size];
    const name = `neon-bay-cover-${size.w}x${size.h}.png`;
    offscreen.toBlob((blob) => {
      if (!blob) {
        status.textContent = 'Export failed — the browser could not make the PNG.';
        resolve({ bytes: 0, name });
        return;
      }
      if (download) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = name;
        link.click();
      }
      status.textContent = `Saved ${name} (${Math.round(blob.size / 1024)} KB).`;
      resolve({ bytes: blob.size, name });
    }, 'image/png');
  });
}

document.getElementById('export').addEventListener('click', () => {
  exportCover();
});

// A fixed scene for screenshots (`?shot=cover` or `?shot=editor`), or the
// interactive editor with the two samples already loaded.
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    state,
    loadSample,
    applyPatch: (patch) => {
      Object.assign(state, patch);
      document.getElementById('caption').value = state.caption;
      document.getElementById('subcaption').value = state.subcaption;
      document.getElementById('captionPos').value = state.captionPos;
      document.getElementById('captionStyle').value = state.captionStyle;
      document.getElementById('captionSize').value = String(state.captionSize);
      for (let i = 0; i < 4; i++) {
        document.getElementById(`role${i}`).value = state.castRoles[i] ?? '';
      }
      for (const [id, field] of furnitureFields) {
        document.getElementById(id).value = state[field] ?? '';
      }
      refreshChoices();
      render();
    },
    exportCover,
    render,
  });
} else {
  refreshChoices();
  render();
  loadSample(0, 'pier').catch(() => {});
  loadSample(1, 'boulevard').catch(() => {});
}
