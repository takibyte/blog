import { initRouter } from './router.js';
import { loadPostList } from './posts.js';

history.scrollRestoration = 'manual';

window.addEventListener('DOMContentLoaded', () => {
  loadPostList();
  initRouter();
});

function applyTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem('theme', name);
}

// Restore on load
const saved = localStorage.getItem('theme') || 'nord';
applyTheme(saved);


const select = document.getElementById('theme-select');
select.value = localStorage.getItem('theme') || 'nord';
select.addEventListener('change', e => applyTheme(e.target.value));