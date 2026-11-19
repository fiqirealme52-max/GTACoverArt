# Neon Bay Cover Studio

A GTA-style cover art maker — an offline web app that turns a photo and a
caption into a multi-panel poster, exported as a PNG to share. Entry for the
[make.fun bounty "Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Any photo:** upload your own photos (they never leave your machine) or try
  the two free samples. Up to three photo slots feed the panels.
- **Four panel layouts:** Triple panel (hero left, two stacked right), Duo split
  (one diagonal cut), Four grid (classic poster grid), and Single photo
  full-bleed. Each panel can be cropped on its own — zoom, pan left–right,
  pan up–down.
- **Three colour grades:** Vice Sunset (warm orange and magenta dusk with a
  glowing sun), Neon Nights (cyan and magenta night glow), and Noir
  (high-contrast black and white).
- **Bold caption lettering:** editable caption and sub-caption, size, top or
  bottom position, and three lettering styles — Block, Outline, and Neon glow.
- **Export PNG:** one click exports the cover at 1080 x 1080, 1080 x 1350, or
  1920 x 1080, ready to post.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Everything is static files under `app/` — no build step, no network requests.
The program `main.ts` (Node 22, standard library only) hands the app in for
the bounty: it copies `app/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored make.fun library.

## Files

- `app/index.html` — the editor page
- `app/style.css` — dark neon editor theme
- `app/src/cover.js` — the cover renderer (layouts, panels, grades, caption)
- `app/src/main.js` — editor wiring, photo loading, PNG export
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover|editor`)
- `app/samples/` — two sample photos, made with an image model for make.fun
- `screenshots/` — the entry's screenshots (first is the cover)
- `shots.json` — the query and window size behind each screenshot
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged

All art is original. No Rockstar Games logo, artwork, or fonts are used
anywhere in this entry.

## License

MIT — see `LICENSE`.
