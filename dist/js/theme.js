(function(){
  function applyTheme(name){
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('theme', name);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const options = document.querySelectorAll('.theme-option');
    const labels = document.querySelectorAll('.theme-dropdown-label');
    const saved = localStorage.getItem('theme') || 'dark';
    applyTheme(saved);

    function setActive(name){
      options.forEach(opt => opt.classList.toggle('active', opt.dataset.themeValue === name));
      labels.forEach(label => { label.textContent = document.querySelector(`.theme-option[data-theme-value="${name}"]`)?.textContent ?? name; });
    }

    setActive(saved);

    options.forEach(option => {
      option.addEventListener('click', () => {
        const name = option.dataset.themeValue;
        applyTheme(name);
        setActive(name);

        const dropdown = option.closest('details.theme-dropdown');
        if (dropdown) dropdown.removeAttribute('open');
      });
    });

    // click-outside closes the desktop dropdown — <details> doesn't do this natively
    document.addEventListener('click', (e) => {
      document.querySelectorAll('details.theme-dropdown[open]').forEach(d => {
        if (!d.contains(e.target)) d.removeAttribute('open');
      });
    });
  });
})();