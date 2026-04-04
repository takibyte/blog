import { loadMarkdown } from './load-md.js';

export async function loadPostList() {
  const list = document.getElementById('post-list');
  if (!list) return;

  try {
    const posts = await fetch('posts/manifest.json').then(r => r.json());

    posts.forEach(post => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#${post.slug}" class="post-link">${post.title}</a>`;

      li.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        loadMarkdown(post.slug);
      });

      list.appendChild(li);
    });

  } catch (err) {
    console.error('Failed to load post list', err);
  }
}
