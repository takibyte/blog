export async function loadMarkdown(slug) {
  try {
    // Fetch markdown for the post, and manifest for metadata date

    const [mdResponse, manifestResponse] = await Promise.all([
      fetch(`./${slug}/index.md`),
      fetch('./manifest.json')
    ]);

    const markdown = await mdResponse.text();
    const manifest = await manifestResponse.json();


    // Reading time estimate: assuming 200 words per minute
    const words = markdown.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);


    const html = marked.parse(markdown);
    const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

    const container = document.getElementById('md-container');
    if (!container) return;

    // Injects sanitized HTML and updates the URL hash
    container.innerHTML = safe;
    window.location.hash = slug;

    // Inject date and minutes content into the DOM
    const meta = document.querySelector('#meta');
    meta.textContent = `${manifest[slug].date} · ⏱ ${minutes} min read`;



    setTimeout(() => {
      document.querySelector('#meta').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
