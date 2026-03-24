// markdown router: listens to URL hash changes and loads corresponding .md files into the page

function getMarkdownFromHash() {
  return window.location.hash.replace('#', '');
}

async function loadMarkdown(file) {
  if (!file) return;

  try {
    const res = await fetch(`content/${file}`);
    const md = await res.text();

    const html = marked.parse(md);
    const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

    const container = document.getElementById('md-container');
    if (!container) return;

    container.innerHTML = safe;

    // Intercept internal .md links
    container.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.endsWith('.md')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          window.location.hash = href;
        });
      }
    });

  } catch (err) {
    console.error('Markdown load error:', err);
  }
}

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  const file = getMarkdownFromHash();
  if (file) loadMarkdown(file);
});

// Handle navigation (back/forward + clicks)
window.addEventListener('hashchange', () => {
  const file = getMarkdownFromHash();
  if (file) loadMarkdown(file);
});
