// load post list : fetches post metadata from content.json and populates the post list in the sidebar

fetch('content.json')
  .then(res => res.json())
  .then(posts => {
    const list = document.getElementById('post-list');
    if (!list) return;

    posts.forEach(post => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#${post.file}" class="post-link">${post.title}</a>`;
      list.appendChild(li);
    });
  });