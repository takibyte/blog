import { loadMarkdown } from './load-markdown.js';

export function initRouter() {
  initBackButton();
  handleInitialHash();

  window.addEventListener('hashchange', () => {
    const slug = window.location.hash.replace('#', '');
    if (slug) loadMarkdown(slug);
  });
}

function handleInitialHash() {
  const slug = window.location.hash.replace('#', '');
  if (slug) loadMarkdown(slug);
}

function initBackButton() {
  const backBtn = document.querySelector('.back');
  const postList = document.getElementById('post-list');

  if (!backBtn || !postList) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      backBtn.classList.toggle('back-visible', !entry.isIntersecting);
    });
  }, { threshold: 0 });

  observer.observe(postList);
  backBtn.addEventListener('click', () => scroll_to('.template'));
}

export function scroll_to(selector) {
  const element = document.querySelector(selector);
  if (!element) return;

  element.scrollIntoView({ behavior: 'smooth' });
}
