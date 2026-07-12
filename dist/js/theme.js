window.addEventListener('DOMContentLoaded', () => {

  // Theme handling
  const select = document.getElementById('theme-select');
  
  function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('theme', name);
  }

  // Restore saved theme
  const saved = localStorage.getItem('theme') || 'tokyonight';
  applyTheme(saved);

  // Set the select value and attach listener
  if (select) {
    select.value = saved;
    select.addEventListener('change', e => applyTheme(e.target.value));
  }
});
