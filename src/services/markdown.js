import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import { load as loadYaml } from 'js-yaml';
import DOMPurify from 'dompurify';

const md = new MarkdownIt({
  html: true,       // raw HTML allowed in notes — everything is sanitized below
  linkify: true,
  typographer: true,
});

md.use(anchor, { level: [1, 2, 3, 4] }));

/* [[Page]] · [[Page#Section]] · [[Page|Label]] → internal anchors */
md.inline.ruler.before('link', 'wikilink', (state, silent) => {
  const src = state.src;
  if (src[state.pos] !== '[' || src[state.pos + 1] !== '[') return false;
  const end = src.indexOf(']]', state.pos + 2);
  if (end < 0) return false;

  const inner = src.slice(state.pos + 2, end).trim();
  if (!inner) return false;

  const pipe = inner.indexOf('|');
  let target = (pipe >= 0 ? inner.slice(0, pipe) : inner).trim();
  let label  = (pipe >= 0 ? inner.slice(pipe + 1) : '').trim();

  const hash = target.indexOf('#');
  let section = '';
  if (hash >= 0) {
    section = target.slice(hash + 1).trim();
    target = target.slice(0, hash).trim();
  }
  if (!target) return false;
  if (!label) label = section ? `${target} § ${section}` : target;

  if (!silent) {
    const token = state.push('html_inline', '', 0);
    const attrs = `class="wikilink" data-wikilink="${md.utils.escapeHtml(target)}"`;
    const anchorAttr = section ? ` data-anchor="${md.utils.escapeHtml(section)}"` : '';
    token.content = `<a ${attrs}${anchorAttr}>${md.utils.escapeHtml(label)}</a>`;
  }
  state.pos = end + 2;
  return true;
});

/* ```mermaid fences become <div data-mermaid> placeholders */
const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.info.trim().split(/\s+/)[0] === 'mermaid') {
    return `<div class="mermaid-source" data-mermaid="1">${md.utils.escapeHtml(token.content)}</div>`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

export function renderMarkdown(body) {
  return DOMPurify.sanitize(md.render(body), { ADD_ATTR: ['target'] });
}

const FRONT = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function parseNote(raw) {
  const text = String(raw || '');
  const match = text.match(FRONT);
  if (!match) return { data: {}, body: text };
  let data = {};
  try {
    const parsed = loadYaml(match[1]);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed;
  } catch { /* malformed YAML → treat as empty frontmatter */ }
  return { data, body: text.slice(match[0].length) };
}

const WIKI = /\[\[([^\[\]\n]+)\]\]/g;

export function extractWikiLinks(body) {
  const stripped = stripCode(String(body || ''));
  const out = [];
  let m;
  WIKI.lastIndex = 0;
  while ((m = WIKI.exec(stripped))) {
    const raw = m[0];
    const inner = m[1];
    const pipe = inner.indexOf('|');
    let target = (pipe >= 0 ? inner.slice(0, pipe) : inner).trim();
    const hash = target.indexOf('#');
    let section = '';
    if (hash >= 0) { section = target.slice(hash + 1).trim(); target = target.slice(0, hash).trim(); }
    if (!target) continue;
    const label = (pipe >= 0 ? inner.slice(pipe + 1).trim() : '') ||
      (section ? `${target} § ${section}` : target);
    out.push({ target, section, label, raw });
  }
  return out;
}

/* drop fenced blocks & inline code so link scanning sees prose only */
function stripCode(text) {
  const kept = [];
  let fence = null; // '`' | '~' | null
  for (const line of text.split('\n')) {
    const opened = /^\s{0,3}(```|~~~)/.exec(line);
    if (fence) {
      if (opened && opened[1][0] === fence) fence = null;
      continue;
    }
    if (opened) { fence = opened[1][0]; continue; }
    kept.push(line);
  }
  return kept.join('\n').replace(/`[^`\n]*`/g, '');
}