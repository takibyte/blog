// load article list : fetches article metadata from content.json and populates the article list in the sidebar

fetch('content.json')
  .then(res => res.json())
  .then(articles => {
    const list = document.getElementById('article-list');
    if (!list) return;

    articles.forEach(article => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#${article.file}" class="art-link">${article.title}</a>`;
      list.appendChild(li);
    });
  });