# Garden

Garden is a local-first Markdown wiki that runs in your browser. Pages are stored in the browser's Origin Private File System (OPFS), with no application server or account.

## Features

- Markdown pages with YAML frontmatter, tags, and `[[wikilinks]]`
- Automatic backlinks and a Mermaid link graph
- Full-text search with prefix and fuzzy matching
- A keyboard-accessible command palette (`Ctrl-K` / `Cmd-K`) and dated daily notes
- JSON backup export and import, with existing pages protected by default
- Mermaid diagrams rendered in the browser
- Separate light and dark themes
- Keyboard navigation, visible focus, skip link, and reduced-motion support

## Requirements

- [Bun](https://bun.sh/) for installing dependencies and running the provided scripts
- A current browser with OPFS support, opened from `localhost` or a secure HTTPS origin

The garden is private to the browser profile and origin where it was created. It is not synced or backed up by this application. Clearing that origin's browser storage can permanently delete its pages.

Use **Export** in the navigation drawer to download a JSON backup. **Import** accepts that backup format; matching pages are skipped by default, or can be explicitly overwritten. Keep backups somewhere safe because browser storage is not a substitute for a backup.

Choose **Today's note** to open or create `daily/YYYY-MM-DD.md` using the local calendar date.

The interface is built with WCAG 2.1 AA accessibility in mind, including keyboard operation and visible focus. A formal independent conformance audit has not been performed.

## Develop

```sh
bun install
bun run dev
```

Vite prints the local URL when the development server starts.

## Build

```sh
bun run build
bun run preview
```

The production bundle is written to `dist/`. The preview command serves that bundle locally.

## Project layout

- `src/worker/opfs.worker.js` handles browser file-system operations.
- `src/services/` contains storage, garden state, Markdown parsing, search, Mermaid rendering, and first-run content.
- `src/views/` and `src/components/` contain the Vue interface.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance and [THIRD_PARTY.md](THIRD_PARTY.md) for direct dependency notices.

## License

Garden is licensed under the GNU Affero General Public License v3.0 only. See [LICENSE.md](LICENSE.md). Third-party dependencies retain their respective licenses, listed in [THIRD_PARTY.md](THIRD_PARTY.md).