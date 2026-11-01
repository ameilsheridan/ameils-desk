# Ameil's Desk v0.3

An interactive portfolio set at a warm café desk, seen from the visitor's seat. The laptop opens a real browser with tab groups. The phone is picked up by the visitor's own first-person hands and browsed like a carousel. Both routes lead into the same project pages through one continuous image transition.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000 (development)
npm run build && npm start   # production build
```

Useful URL flags:

| Flag | Effect |
|---|---|
| `?quality=high \| balanced \| light \| static` | Force a quality tier (auto-detected otherwise) |
| `?slowmo=8` | Slow down hand gestures, for reviewing or recording |
| `?debug=occluder` | Show the depth-only phone occluder used by the hands layer |

`/lab?pose=hold&left=press` is an unlisted hand-pose lab for tuning grips (noindex).

### Tests

`tests-e2e/` holds the Playwright scripts used for validation. Run them against a running server (`node tests-e2e/<script>.js`):
- `journey.js`, `journey2.js`: full device journeys, including the shared transition and Back restoration
- `kb.js`: keyboard-only journey, plus a check that direct case-study URLs load no WebGL
- `audio.js`: checks that sound stays muted until enabled, and measures the output signal
- `axe.js`: accessibility audit (no violations on `/`, `/work` or `/work/[slug]`)

Screenshots from the last run are in `docs-screenshots/`.

### Regenerate assets (optional)

Assets are committed. They can be rebuilt from scratch:

```bash
pip install bpy==5.2.3 numpy pillow     # Blender as a Python module
npm run assets                          # model GLB, textures, project covers
npx @gltf-transform/cli optimize public/models/desk.glb public/models/desk.glb \
  --compress meshopt --join false --flatten false --instance false --palette false \
  --simplify false --prune false --texture-compress false
```

## Architecture

```
scripts/
  build_assets.py      Blender (bpy) scene: desk, laptop, phone, tumbler, notebook, pen,
                       sticky notes, plant, café room, bistro tables, pendants, sconces → GLB
  gen_textures.py      Procedural tileable textures (walnut, plaster, knit, brushed metal…)
  gen_covers.mjs       Placeholder project cover art (SVG) from each project's brand colour
src/
  data/projects.json   Single project registry (laptop, phone, /work and case studies all read it)
  app/                 Next.js App Router: / (desk), /work, /work/[slug] (static, no WebGL)
  lib/
    store.ts           Interaction state: mode, phase, hover, carousel index, browser state
    audio.ts           Procedural Web Audio engine + sound settings store
    transition.ts      Shared project expansion (capture rect → hero)
    restore.ts         Return context so Back lands on the same device / tab / card
    quality.ts         Quality tiers + reduced motion
  experience/
    Experience.tsx     Canvas, overlays, keyboard, restore, loader
    Scene.tsx          GLB + material library, hit areas, phone motion, contact shadows
    Lighting.tsx       Warm key spot, fill, laptop-screen rect light, practicals, environment
    Effects.tsx        DOF (desk → phone → screen focus), selective bloom, vignette, AgX
    CameraRig.tsx      Seated camera, damped pointer response, blends between poses
    director.ts        Interruptible sequences: reach → grip → lift, press → zoom, put down
    hands/HandRig.ts   Articulated procedural hand (palm, 3-joint fingers, thumb, cuff, sleeve)
    hands/HandController.tsx   11-state hand controller, fingertip targeting, forearm aim
    overlaySync.tsx    Pins DOM screens onto 3D screens with a projective (matrix3d) transform
    ui/PhoneUI.tsx     Phone carousel (real DOM)
    ui/LaptopBrowser.tsx Browser chrome, tab groups, history, bookmarks, pages (real DOM)
```

### Interaction model

- **Modes:** `desk → toLaptop → laptop`, `desk → toPhone → phone`, then `returning`.
- **Phases:** `reach → grip → lift → hold`, `press → zoom`, `lower → release`.
- Each director sequence carries a token. Starting a new one, for example pressing Esc mid-pickup, interrupts the current one, and the new sequence animates from wherever things are.
- **Hand states:** hidden, entering, hovering, reaching, pointing, grabbing, holding, swiping, tapping, releasing, exiting.
- The **screens are real DOM**, so focus, keyboard, screen readers and text selection behave normally. The DOM is mapped onto the 3D screen corners every frame, so it stays aligned while devices move.

### Keyboard

| Key | Action |
|---|---|
| Tab | Reach the laptop / phone buttons (the hands respond to focus too) |
| Enter | Open the focused device / open the current project |
| ← → | Previous / next project on the phone |
| Esc | Put the phone down / leave the laptop |

### Quality tiers

| Tier | DPR | Shadows | Post-processing | Practical lights |
|---|---|---|---|---|
| high | 1–2 | 2048 | DOF, bloom, vignette, AgX, 4× MSAA | 5 |
| balanced | 1–1.5 | 1024 | DOF, bloom, vignette, AgX, 2× MSAA | 3 |
| light | 1 | 512 | none (AgX on renderer) | 1 |
| static | — | — | Poster image + project links | — |

`PerformanceMonitor` lowers DPR further if frame rate drops.

## Placeholders and known gaps

- **Case study copy:** the sections are structured placeholders, marked in italics. The project names, roles and years come from the registry. Replace them in `src/app/work/[slug]/page.tsx`, or move them into the registry.
- **Project covers:** the abstract SVG art is generated. Replace `public/projects/<slug>.svg` with real, NDA-sanitised images, keeping the 16:10 ratio so the shared transition stays continuous.
- **Hands:** these are procedural articulated hands, not a skinned Blender rig. The poses (reach, open, point, press, grip, hold) are authored as joint angles and blended per frame. The arm uses an aim-based IK toward an off-screen elbow. The desk-to-hold regrip is an interpolation and can clip briefly at the phone's edge mid-lift.
- **Personal pages in the browser:** "Listening inspiration", "Golf" and "Personal interests" are placeholder pages to fill in. The external tabs (YouTube, Behance, Figma, Mobbin, Medium) are bookmark cards that open the real site in a new tab. There are no fake embedded pages.
- **Audio** is synthesised in code: ambience, rain, generative piano and interaction effects. It was not verified on Safari, Edge or physical speakers here.
- **Ambient occlusion:** there is no screen-space AO pass. Grounding comes from contact shadows plus the key-light shadow.
- **Testing** was done in headless Chromium with software WebGL. Interactions, layout and the transitions are validated. Frame-rate numbers from that environment don't reflect real GPUs.

## Deploying

The app is a standard Next.js app and is not deployed anywhere yet. To deploy, use Vercel (`vercel deploy`) or any Node host (`npm run build && npm start`). Every case-study route is prerendered as static HTML.

## Private preview build

`npm run preview:build` makes `dist-preview/`, a relative-path static build of the same components. It uses hash routes (`#work`, `#work-phis`) and bundles the uncompressed model inside the JavaScript. It's meant for hosts that serve only static files from a subfolder, such as a Claude artifact. The Next.js app stays the real site.

## Publishing (GitHub + Vercel)

1. Push this folder to a GitHub repo (e.g. `ameilsheridan/ameils-desk`).
2. In Vercel, import the repo. Framework: Next.js, no extra settings needed.
3. Add the environment variable `NEXT_PUBLIC_SITE_URL` = your final URL (used for the sitemap, robots and social previews).
4. Every push to `main` deploys to production; every other branch gets a preview URL.
5. Optional: add a custom domain in Vercel (Project → Settings → Domains) and turn on Vercel Web Analytics.

Contact details shown on the notebook and /contact live in `src/data/contact.json` (links with an empty `href` are hidden).

## Portfolio assistant

The "Ask about me" assistant answers from `src/data/resume.json`, `src/data/projects.json` and `src/data/contact.json`.
- Without configuration it uses built-in answers (`src/lib/faq.ts`).
- To let Claude write the answers, add `ANTHROPIC_API_KEY` in Vercel (Project → Settings → Environment Variables). Optional: `ASSISTANT_MODEL`.
  Answers are restricted to those data files, with a per-visitor rate limit.
