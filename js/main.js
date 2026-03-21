// main.js

// Load article list from content.json and create links
fetch('content.json')
  .then(response => response.json())
  .then(articles => {
    const list = document.getElementById('article-list');
    articles.forEach(article => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#${article.file}" onclick="loadMarkdown('${article.file}')" class="art-link">${article.title}</a>`;
      list.appendChild(li);
    });

     // Load .md from URL hash on initial load
    const initial = window.location.hash.replace('#', '');
    if (initial) {
      loadMarkdown(initial);
    }

  });


// Fetch the markdown file, parse to HTML, sanitize, and insert into md-container div
function loadMarkdown(file) {
  fetch(`content/${file}`)
    .then(response => response.text())
    .then(md => {
        const html = marked.parse(md);
        const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

        const container = document.getElementById('md-container');
        container.innerHTML = safe;

        // Update URL hash (so navigation is shareable)
        window.location.hash = file;

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


    })
    .catch(err => console.error('Markdown render error', err));
};


// Handle browser back/forward buttons
window.addEventListener('hashchange', () => {
  const file = window.location.hash.replace('#', '');
  if (file) {
    loadMarkdown(file);
  }
});
