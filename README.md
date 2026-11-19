# Neon Bay Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/fiqirealme52-max/GTACoverArt/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/fiqirealme52-max/GTACoverArt/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A GTA-style cover art maker — an offline web app that turns a photo and a
caption into a multi-panel poster, exported as a PNG to share. Entry for the
[make.fun bounty "Make GTA 6 Cover Art"](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Any photo:** upload your own photos (they never leave your machine) or try
  the four free samples. Up to three photo slots feed the panels.
- **Four panel layouts:** Triple panel (hero left, two stacked right), Duo split
  (one diagonal cut), Four grid (classic poster grid), and Single photo
  full-bleed. Each panel can be cropped on its own — zoom, pan left–right,
  pan up–down.
- **Three colour grades:** Vice Sunset (blazing pink-orange dusk with a
  striped synthwave sun, palm silhouettes, and a lit skyline), Neon Nights
  (cyan and magenta night glow), and Noir (high-contrast black and white).
  Every cover also gets a comic-book halftone dot texture and black-keyline
  gutters, so the panels read as cut-outs from a poster.
- **Bold caption lettering:** editable caption and sub-caption, size, top or
  bottom position, and four lettering styles — Block, Outline, Neon glow, and
  Vice (sunset gradient letters) — all squeezed tall like poster type.
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
- `app/samples/` — four sample photos: two made with an image model for
  make.fun, plus Sunset Skyline and Neon Street, original illustrations
  drawn for this entry
- `screenshots/` — the entry's screenshots (first is the cover)
- `shots.json` — the query and window size behind each screenshot
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged

All art is original. No Rockstar Games logo, artwork, or fonts are used
anywhere in this entry.

## License

MIT — see `LICENSE`.

New to make.fun? Sign up with my link: https://make.fun/r/vfa7ye18 (referral code `vfa7ye18`).

Cover dibuat dengan Neon Bay Cover Studio — 4 layout panel, 3 grade warna, ekspor PNG siap posting.

Dibangun offline — foto tidak pernah keluar dari mesin.

Tampilan barunya benar-benar Vice City — matahari senja bergaris, siluet pohon palem, skyline berpendar, dan tekstur halftone di setiap cover.
