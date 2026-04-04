export async function loadMarkdown(slug) {
  try {
    const md = await fetch(`posts/${slug}/index.md`).then(r => r.text());
    const html = marked.parse(md);
    const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

    const container = document.getElementById('md-container');
    if (!container) return;

    container.innerHTML = safe;
    window.location.hash = slug;

    setTimeout(() => {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    // Intercept internal .md links
    container.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.endsWith('.md')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          loadMarkdown(href);
        });
      }
    });

  } catch (err) {
    console.error('Markdown render error', err);
  }
}
