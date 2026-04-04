// main.js

history.scrollRestoration = 'manual';

// Load .md from URL hash on initial load
window.addEventListener('DOMContentLoaded', () => {

  const initial = window.location.hash.replace('#', '');
  if (initial) {
    loadMarkdown(initial);
  }


  const backBtn = document.querySelector('.back');
  const postList = document.getElementById('post-list');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        // show back button when post-list is not visible
        backBtn.classList.toggle('back-visible', !entry.isIntersecting);
    });
  }, { threshold: 0 });

  observer.observe(postList);

});


// Load article list from manifest.json and create links
fetch('posts/manifest.json')
  .then(response => response.json())
  .then(posts => {
    const list = document.getElementById('post-list');
    if (!list) return;
    
    posts.forEach(post => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#${post.slug}" onclick="loadMarkdown('${post.slug}');" class="post-link">${post.title}</a>`;
      list.appendChild(li);
    });

  });


// Fetch the markdown file, parse to HTML, sanitize, and insert into md-container div
function loadMarkdown(slug) {

  fetch(`posts/${slug}/index.md`)
    .then(response => response.text())
    .then(md => {
        const html = marked.parse(md);
        const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

        const container = document.getElementById('md-container');
        if (!container) return;
        
        container.innerHTML = safe;

        setTimeout(() => {
          container.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 50);

        // Update URL hash (so navigation is shareable)
        window.location.hash = slug;

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



function scroll_to(id) {
    const element = document.querySelector(id);
    if (!element) return;
    
    element.scrollIntoView({
        behavior: 'smooth'
    });
}

