// Fixed scenes for screenshots, driven by the page's query string:
//
//   ?shot=cover&photo=pier&photo2=boulevard&caption=Sunset%20Heist
//   ?shot=editor&photo=boulevard&layout=triple&grade=sunset
//
// `photo`, `photo2`, `photo3` pick the sample for slots A, B, C. `caption`,
// `sub`, `layout`, `size`, `grade`, `style`, `pos` and `captionSize` set the
// cover up. `export=1` also runs the app's real PNG export and records its
// byte count on window.__exportBytes, so a screenshot run can prove the
// export works. window.__shotReady is set once the scene is painted.

const SAMPLE_PARAM = ['photo', 'photo2', 'photo3'];

export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');

  for (let slot = 0; slot < 3; slot++) {
    const name = query.get(SAMPLE_PARAM[slot]);
    if (name) await api.loadSample(slot, name);
  }

  const patch = {};
  const take = (key, field) => {
    const value = query.get(key);
    if (value !== null && value !== '') patch[field] = value;
  };
  take('caption', 'caption');
  take('sub', 'subcaption');
  take('layout', 'layout');
  take('size', 'size');
  take('grade', 'grade');
  take('style', 'captionStyle');
  take('pos', 'captionPos');
  // Poster furniture: roles is a comma-separated list, one role per panel.
  const roles = query.get('roles');
  if (roles !== null && roles !== '') {
    patch.castRoles = roles.split(',').map((r) => r.trim().toUpperCase());
  }
  take('billing', 'billing');
  take('quote', 'quote');
  take('quoteby', 'quoteBy');
  take('seal', 'seal');
  take('sealsub', 'sealSub');
  take('loc', 'location');
  take('tagline', 'tagline');
  take('vol', 'volume');
  const captionSize = query.get('captionSize');
  if (captionSize !== null && captionSize !== '') {
    patch.captionSize = Number(captionSize);
  }
  api.applyPatch(patch);

  if (query.get('export') === '1') {
    const result = await api.exportCover({
      download: query.get('download') !== '0',
    });
    window.__exportBytes = result.bytes;
    window.__exportName = result.name;
    document.title = `export:${result.bytes}:${result.name}`;
  }

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
      if (query.get('export') !== '1') document.title = 'shot-ready';
      resolve();
    }));
  });
}
