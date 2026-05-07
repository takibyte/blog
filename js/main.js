import { initRouter } from './router.js';
import { loadPostList } from './posts.js';

history.scrollRestoration = 'manual';

window.addEventListener('DOMContentLoaded', () => {
  loadPostList();
  initRouter();
});
