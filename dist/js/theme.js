(function(){
  function applyTheme(name){
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('theme', name);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const selects = document.querySelectorAll('#theme-select, #theme-select-mobile');
    const saved = localStorage.getItem('theme') || 'dark';
    applyTheme(saved);

    selects.forEach(select => {
      select.value = saved;
      select.addEventListener('change', e => {
        applyTheme(e.target.value);
        e.target.blur();

        selects.forEach(s => { if (s !== e.target) s.value = e.target.value; });
      });
    });
  });
})();