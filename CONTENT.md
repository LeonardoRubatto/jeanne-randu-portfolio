# Editing project content

The site has two kinds of project. Adding one is a different amount of
work depending on which kind.

## Add or edit a secondary/archive project (the small carousel under
"Études & fragments") — fully self-serve

1. Open `csv/archive.csv` on GitHub (or locally) and add a row: `slug`
   (short id, no spaces), `order` (position in the carousel), `title`,
   `type` (category line), `image` (path under `assets/projects/archive/`),
   `alt` (accessible description), `relatedImages` (leave blank for now).
2. Add the image file itself under `assets/projects/archive/`.
3. Commit. If you're editing on GitHub.com, that's it — the "Sync content"
   Action regenerates `data/archive.js` automatically and commits it back.
   If you're editing locally, run `npm run sync` yourself before
   committing.

No HTML or CSS touched, no developer needed. Removing a project is the
same in reverse — delete its row (and, optionally, its image file).

**Limit:** the carousel's visual layout only has room drawn for 6 cards at
once (see `styles.css`, `.depth-card[data-position]`) — a 7th needs one
more CSS rule from a developer before it displays correctly (it won't
break, it just won't get its own coverflow slot).

## Add or edit a primary project (a full section like Cabane, Nike,
Véranda, Cave)

Each of these is a **hand-designed visual composition** — a rotated photo
board, a canvas hover effect, a fanned photo stack, named gallery slots —
not a template. That's deliberate: it's what makes the site's design
distinctive. This is not a one-line change, and Jeanne can't do the whole
thing herself.

**Editing an existing primary project's text/images is self-serve:**
`csv/projects.csv` (title, description, footer tags, hero image) and
`csv/project_media.csv` (each existing photo slot's image/alt/caption) —
same process as above, edit the CSV row, commit, the Action regenerates
`data/projects.js`.

**Adding a brand-new primary project needs a developer, once, for:**
1. Designing and building its bespoke HTML/CSS composition in
   `index.html`/`styles.css`, following the pattern of an existing project
   (pick whichever's structure is closest to what's wanted).
2. Adding its row to `csv/projects.csv` and its photo rows to
   `csv/project_media.csv`, and matching `data-field="slug.field"` /
   `data-media="slug.slot"` markers onto the new markup (see any existing
   panel in `index.html` for the exact pattern — `render.js` fills these
   in from the CSV data at page load).
3. If this is the 5th or 6th primary project, the scroll choreography and
   panel stacking already have headroom (`script.js`'s `revealWindowsFor`/
   `jumpStopsFor`, `styles.css`'s `.project-panel:nth-child(5)`/`(6)`) — a
   7th needs one more `:nth-child(7)` rule and its own hand-tuned reveal
   window (the automatic fallback is serviceable, not tuned).

Once that one-time setup is done, that project's *text* going forward is
just as self-serve as the others via its CSV row.

## How the pipeline works, if you need to touch it

`csv/*.csv` → `scripts/sync-content.mjs` (`npm run sync`) → `data/*.js`
(`window.SITE_PROJECTS`, `window.SITE_ARCHIVE`) → loaded by `index.html` →
`render.js` fills in `[data-render]`, `[data-field]`, `[data-media]`
markers at page load → `script.js` runs the actual interactions
unchanged. Never hand-edit `data/*.js` — it's regenerated and your edit
will be overwritten on the next sync. `.github/workflows/sync-content.yml`
runs the sync automatically on every push touching `csv/**`.
