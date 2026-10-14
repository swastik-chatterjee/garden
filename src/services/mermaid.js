// Mermaid is lazy-loaded on first diagram and re-rendered when the theme flips.

let mermaidPromise = null;
let dark = false;
let seq = 0;

const themeFor = (isDark) => (isDark ? 'dark' : 'default');

function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: themeFor(dark),
        logLevel: 'fatal',
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

export async function applyMermaidTheme(isDark) {
  if (dark === isDark) return;
  dark = isDark;
  const mermaid = await getMermaid();
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: themeFor(dark),
    logLevel: 'fatal',
  });
}

async function renderInto(el, code) {
  const mermaid = await getMermaid();
  const id = `garden-mmd-${++seq}`;
  el.classList.add('mermaid');
  try {
    const { svg } = await mermaid.render(id, code);
    el.innerHTML = svg;
    el.classList.remove('mermaid-error');
  } catch (err) {
    document.getElementById(id)?.remove();
    el.classList.add('mermaid-error');
    el.innerHTML = '<pre></pre>';
    el.firstChild.textContent = describeError(err);
  }
}

function describeError(err) {
  const text = String((err && (err.str || err.message)) || err || 'Unknown diagram error');
  return text.length > 600 ? text.slice(0, 600) + '…' : text;
}

export async function renderMermaidBlocks(root) {
  const blocks = Array.from(root.querySelectorAll('[data-mermaid]'));
  for (const block of blocks) await renderInto(block, block.textContent);
  return blocks.length;
}

export async function renderMermaidText(el, code) {
  return renderInto(el, code);
}