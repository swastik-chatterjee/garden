# Contributing

Contributions are welcome. For substantial changes, open an issue or discussion first so the intended behavior can be agreed on before implementation.

## Local setup

Install [Bun](https://bun.sh/), then from the repository root run:

```sh
bun install
bun run dev
```

Use a browser with OPFS support and open the Vite development URL, which uses `localhost` and is a secure context for browser storage APIs.

## Before submitting

Run the production build:

```sh
bun run build
```

There are currently no automated test or lint scripts in `package.json`. If a change affects browser storage, also exercise it in a supported browser and verify that existing pages remain readable.

## Change guidelines

- Keep page content in Markdown and browser storage operations in the OPFS worker.
- Preserve the local-first behavior: page contents should not be sent to a server.
- Keep dependencies focused; document new direct dependencies and their licenses in `THIRD_PARTY.md`.
- Describe user-visible behavior and any manual browser checks in the pull request.
- Do not include real personal notes or other private garden data in examples, screenshots, or tests.

For bug reports, include the browser and version, whether the page is served from `localhost` or HTTPS, and concise steps to reproduce the issue.