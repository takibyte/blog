import { loadMarkdown } from './load-markdown.js';

export async function loadPostList() {
  const list = document.getElementById('post-list');
  if (!list) return;

  try {
    const manifest = await fetch('posts/manifest.json').then(r => r.json());

    Object.entries(manifest).forEach(([slug, post]) => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#${slug}" class="post-link">${post.title}</a>`;

      li.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        loadMarkdown(slug);
      });

      list.appendChild(li);
    });

  } catch (err) {
    console.error('Failed to load post list', err);
  }
}
