# Adding your project details

Everything about a project lives in **one file: `src/data/projects.json`**. The laptop browser, the phone carousel, the Work page and the case-study page all read from it, so you only edit one place.

Images go in **`public/projects/`**.

## The fields

```jsonc
{
  "slug": "phis",                 // the URL: /work/phis (lowercase, hyphens, no spaces)
  "name": "PhIS 3.0",             // project title
  "category": "Healthcare",       // Enterprise | AI | Healthcare | Personal
  "client": "CMG Group Berhad · NPRA",
  "year": "2024–25",
  "role": "Head Designer",
  "summary": "One sentence shown on cards and under the title.",
  "palette": ["#1f3b3a", "#9fd3c7", "#f5f2ee", "#e7a0a4"],  // legacy, keep as is
  "brand": "#1f7a6e",                                       // hero colour for the case study + cover (white text sits on it)
  "nda": false,                   // true adds a "details generalised" note

  "coverImage": "phis-cover.jpg", // optional: your own cover in public/projects/ (16:10, about 1600×1000)

  "caseStudy": {                  // optional: every part can be left out
    "challenge": [
      "First paragraph about the problem.",
      "Second paragraph."
    ],
    "approach": [
      { "title": "Understand", "body": "What you researched and learned." },
      { "title": "Shape", "body": "Key flows and decisions." },
      { "title": "Refine", "body": "Testing and iteration." }
    ],
    "impact": [
      { "value": "40%", "label": "faster prescription lookup" },
      { "value": "12", "label": "hospitals onboarded" }
    ],
    "gallery": [
      { "src": "phis-dashboard.jpg", "alt": "Pharmacist dashboard", "caption": "Redesigned dashboard" }
    ],
    "outcome": [
      "What shipped and what changed for users."
    ],
    "tools": ["Figma", "FigJam", "Maze"],
    "links": [{ "label": "View on Behance", "href": "https://www.behance.net/ameilsheridan" }]
  }
}
```

(`//` comments are only for explanation. Real JSON can't contain comments.)

## Tips

- **Images:** 16:10 covers keep the open-project animation seamless. JPG or WebP under about 400 KB each is ideal.
- **Confidential work:** set `"nda": true`, blur or redraw sensitive data, and describe outcomes in relative terms ("cut review time by a third").
- **Order:** projects appear in the same order as in the file.
- **New project:** copy an existing entry, give it a new `slug`, and it appears everywhere automatically.
- **Preview locally:** `npm run dev`, then open `http://localhost:3000/work/<slug>`.

## Richer case study sections (optional)

Add any of these inside `caseStudy`; a section only appears when it has content. MedUP in `src/data/projects.json` is the full example.

| Field | Section |
|---|---|
| `heroImage` `{src, alt}` | Device artwork on the brand-colour hero (transparent PNG/WebP) |
| `statement` `{lead, rest?, image?}` | Big two-tone intro line beside a device tile |
| `research` `{label?, aside?, headline, problem, solution, image?}` | Finding headline + problem / solution pair |
| `approach[].tags`, `.duration`, `.image` | Timeline chips, step label, step image |
| `journey` `{title, body[], goals?[], map?[{group, items[]}], logo?}` | Journey text, big goals and a user-flow map |
| `feature` `{title, body[], image}` | Feature spotlight with a device |
| `style` `{intro?, colors[{name, hex}], font?, logo?}` | Visual style: logo, type card, swatches |

`scripts/phone_frames.py <screens dir> public/projects` frames exported screens as phones and cuts a white logo from a splash screen.

More optional MedUP-style sections: `prototype {label, href}`, `journeyMap {title, intro?, note?, stages[{stage, doing, thinking, pain, opportunity, before, after}]}` (before/after = feeling 1–5), `walkthrough[{title, subtitle, body, why, images[], wide?, detail?}]`, `components {intro?, items[{src, alt, label}]}`, `why {title, lead, body?, goals[{who, goal, measure}], note?}`, `stack {title, intro?, items[{tag, name, use}]}`. `scripts/medup_components.py` cleans Figma component exports.
