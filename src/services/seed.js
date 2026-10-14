// First-run content, planted into OPFS when the garden is empty.
// (Backticks for fences are built from plain strings, so template literals stay clean.)

const bt = '```';
const b = (lang, code) => `${bt}${lang}\n${code.trim()}\n${bt}`; // real fence
const t = (lang, code) => `~~~${lang}\n${code.trim()}\n~~~`;     // display-only fence
const L = '&#91;';
const R = '&#93;';
const wik = (s) => `<code>${L}${L}${s}${R}${R}</code>`;

const home = `---
title: Home
tags: [meta, welcome]
---

# Welcome to your garden 🌱

Every page in this wiki is a plain Markdown file stored inside your browser's
**Origin Private File System** (OPFS). No server, no account, nothing syncs —
the garden and this browser tab are the same thing. Curious? Read [[OPFS]].

## Start here

- **Writing** — headings, tables, code and quotes: the [[Markdown cheatsheet]].
- **Diagrams** — flowcharts, sequence and gantt charts straight from a fence:
  [[Mermaid diagrams]].
- **Connecting** — ${wik('wikilinks')} between pages with automatic backlinks:
  [[Backlinks and wikilinks]].
- **Finding** — typo-tolerant full-text search: [[Full-text search]].
- **Zooming out** — the graph button in the toolbar maps every page and link.
  (The page [[Link graph]] doesn't exist yet — that red link is exactly how new
  pages get born. Click it.)

## How it fits together

 ${b('mermaid', `
flowchart LR
  G((gardener)) --> UI[Vue UI]
  UI -->|read / write| FS[(OPFS garden)]
  UI -->|index| SX[Search]
  SX --> FS
`)}

Edit any page with the pencil button — this whole site is just files.
`;

const cheatsheet = `---
title: Markdown cheatsheet
tags: [guide, markdown]
---

# Markdown cheatsheet

Everything below is live — hit the pencil icon to see the source.

## Inline

**bold**, *italic*, ~~strikethrough~~, <code>inline code</code>,
[an ordinary link](https://commonmark.org).

## Lists

1. first
2. second
   - nested bullet
   - another bullet
3. third

> A garden is tended, not published. Notes are drafts until they're links.

## Code

 ${b('js', `
// this app, roughly
const page = await opfs.read('notes/opfs.md');
const html = renderMarkdown(page);
index.add({ title, body });
`)}

## Tables

| You write | You get |
| --- | --- |
| ${wik('OPFS')} | a wikilink to that page |
| <code>tags: [guide]</code> | a searchable tag chip |
| a mermaid fence | a live diagram — see [[Mermaid diagrams]] |

Horizontal rules look like this:

---

Backlinks appear automatically on the pages you link from here:
[[Backlinks and wikilinks]] explains the syntax.
`;

const mermaidPage = `---
title: Mermaid diagrams
tags: [guide, mermaid, diagrams]
---

# Mermaid diagrams

Mark a fenced block with the language <code>mermaid</code> and it renders
client-side when the page is displayed. No images, no server — and the
diagrams follow the app's light/dark theme automatically.

 ${t('markdown', b('mermaid', `
flowchart LR
  Seed --> Budding --> Evergreen
`))}

## Flowchart — what happens when you save

 ${b('mermaid', `
flowchart TD
  E[Editor] -->|Ctrl-S| V[Parse frontmatter]
  V --> W[Worker writes page.md]
  W --> I[Search index updated]
  I --> B[Backlinks recomputed]
`)}

## Sequence — reading a page

 ${b('mermaid', `
sequenceDiagram
  autonumber
  participant UI as Page view
  participant WK as OPFS worker
  participant FS as Files
  UI->>WK: read(notes/opfs.md)
  WK->>FS: sync access handle
  FS-->>WK: bytes
  WK-->>UI: markdown text
  UI->>UI: render + decorate links
`)}

## Gantt — a tending schedule

 ${b('mermaid', `
gantt
  title Tending the garden
  dateFormat YYYY-MM-DD
  section Writing
  Draft seedlings :active, s1, 2025-01-01, 21d
  section Pruning
  Merge and rename :s2, after s1, 14d
  Delete dead notes :s3, after s2, 7d
`)}

If the syntax is off, the error message appears in place of the diagram —
handy while editing. Class, state, pie and mindmap diagrams work the same way.
`;

const searchPage = `---
title: Full-text search
tags: [guide, search]
---

# Full-text search

Click the magnifier in the top bar (or press **Ctrl-K**), type, hit Enter.
Every search gets its own URL, so you can bookmark or share a query.

| You type | You get |
| --- | --- |
| gardn | “garden” — fuzzy matching forgives typos |
| gant | gantt content — prefix matching from the first letters |
| opfs | pages about [[OPFS]], title and tag hits ranked first |
| tag:guide | every page carrying the <code>guide</code> tag |

The index is rebuilt live whenever a page is saved or deleted, so results are
never stale. Snippets show the sentence around each match.

Try it now — search for <code>worker</code> and see where this app keeps its
files. Or browse by tag from the drawer on the left.
`;

const opfsPage = `---
title: OPFS
tags: [note, technical]
---

# OPFS — the storage

The **Origin Private File System** is a real, private filesystem inside the
browser. Pages here are ordinary files — <code>Home.md</code>,
<code>guides/search.md</code> — but only this origin (scheme + host + port)
can see them. Nothing leaves the device.

## How this app uses it

- All file I/O runs in a **Web Worker** through sync access handles, so the
  UI never blocks on disk.
- Text is UTF-8 encoded on write and decoded on read; folders are created on
  demand when you save into them.
- The worker protocol is tiny: list, read, write, delete, rename, stats.

 ${b('mermaid', `
flowchart LR
  subgraph Main[Main thread]
    V[Vue app]
    X[Search index]
  end
  subgraph Worker[Worker thread]
    H[Sync access handles]
  end
  V -->|postMessage| H
  H -->|OPFS| F[(garden files)]
  H -->|text + listings| V
  V --> X
`)}

## Good to know

- Current Chrome, Edge, Firefox and Safari all support it (see the README).
- It needs a secure context: <code>https://</code> or <code>localhost</code>.
- “Clear site data” in browser settings erases the garden — the files are
  only as durable as this browser profile.

Related: [[Backlinks and wikilinks]], [[Full-text search]], [[Home]].
`;

const backlinksPage = `---
title: Backlinks and wikilinks
tags: [guide, wiki]
---

# Wikilinks & backlinks

The point of a garden: pages reference each other, and the references are
symmetrical — you get the incoming side for free.

## Syntax

| Form | Renders as |
| --- | --- |
| ${wik('OPFS')} | a link to that page |
| ${wik('OPFS#Good to know')} | a jump straight to that section |
| ${wik('OPFS|the storage note')} | the same link, custom label |

Resolution tries the file name first, then the page title, then the path —
so ${wik('markdown cheatsheet')} and ${wik('guides/Markdown cheatsheet')} both
find the same page.

## What happens next

- The target page lists this one in its **“pages linking here”** card, with
  the sentence that did the linking. Computed on the fly — nothing is stored.
- A red link means the page doesn't exist yet. Click it and you're in the
  editor with the title prefilled. Plant it 🌱

This page links to [[Home]], [[Markdown cheatsheet]], [[Mermaid diagrams]],
[[Full-text search]] and [[OPFS]] — open any of them and look at the bottom
card: this page will be listed there.
`;

const metaphorPage = `---
title: Garden metaphor
tags: [meta, garden]
---

# The garden metaphor

Notes here aren't blog posts; they're plants.

- **Seedling** — a rough note. One idea, little structure, no links yet.
- **Budding** — linked to other pages, revised at least once.
- **Evergreen** — pruned and maintained; worth sending someone to.

 ${b('mermaid', `
stateDiagram-v2
  direction LR
  [*] --> Seedling: planted
  Seedling --> Budding: linked + revised
  Budding --> Evergreen: pruned
  Evergreen --> Budding: new questions
  Evergreen --> [*]: archived
`)}

Evergreens keep changing — a garden is never finished. [[Home]] is where
everything lives; the graph button in the toolbar shows the whole forest.
`;

export const seedFiles = [
  { path: 'Home.md', content: home },
  { path: 'guides/Markdown cheatsheet.md', content: cheatsheet },
  { path: 'guides/Mermaid diagrams.md', content: mermaidPage },
  { path: 'guides/Full-text search.md', content: searchPage },
  { path: 'notes/OPFS.md', content: opfsPage },
  { path: 'notes/Backlinks and wikilinks.md', content: backlinksPage },
  { path: 'notes/Garden metaphor.md', content: metaphorPage },
];