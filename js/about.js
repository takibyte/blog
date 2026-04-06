window.addEventListener('DOMContentLoaded', async () => {
  try {
    const markdown = await fetch('posts/this-website/index.md').then(r => r.text());
    const html = marked.parse(markdown);
    const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

    const container = document.getElementById('md-container');
    if (container) container.innerHTML = safe;

  } catch (err) {
    console.error('Failed to load about page', err);
  }
});