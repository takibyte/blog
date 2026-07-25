import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import hljs from 'highlight.js';

const rootDir = '.';
const projectsDir = './projects';
const postsDir = './posts';
const aboutDir = './about';
const outDir = './dist';

// Read templates
const template = fs.readFileSync('./templates/post.html', 'utf-8');
const rootIndexTemplate = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
const postsIndexTemplate = fs.readFileSync(path.join(postsDir, 'index.html'), 'utf-8');
const aboutIndexTemplate = fs.readFileSync(path.join(aboutDir, 'index.html'), 'utf-8');

const projectTemplate = fs.readFileSync('./templates/project.html', 'utf-8');
const projectsIndexTemplate = fs.readFileSync(path.join(projectsDir, 'index.html'), 'utf-8');

// Top-level files/folders that should be copied into dist as-is (no processing)
const staticEntries = ['index.html', 'css', 'js', 'assets', 'about', 'favicon.ico'];

// Track seen slugs to ensure uniqueness
const seenSlugs = new Set();

// --- helpers ---

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (entry === '.DS_Store') continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}


// --- configure marked to use highlight.js for code blocks ---
marked.use({
  renderer: {
    code(token) {
      const { text, lang } = token;
      // support an optional filename via fence info string: ```python title=pyportscan.py
      const [language, ...rest] = (lang || '').split(' ');
      const titleMatch = rest.join(' ').match(/title=(\S+)/);
      const filename = titleMatch ? titleMatch[1] : language || 'code';

      const highlighted = language && hljs.getLanguage(language)
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;

      return `
<div class="code-block">
  <div class="code-block-head">
    <span>${filename}</span>
    <div class="code-block-dots"><span></span><span></span><span></span></div>
  </div>
  <pre>${highlighted}</pre>
</div>`;
    }
  }
});


// --- custom marked extension for callouts (note/warn) ---
const calloutExtension = {
  name: 'callout',
  level: 'block',
  start(src) {
    return src.match(/^:::\s*(note|warn)/)?.index;
  },
  tokenizer(src) {
    const match = /^:::\s*(note|warn)\n([\s\S]*?)\n:::(\n|$)/.exec(src);
    if (match) {
      return {
        type: 'callout',
        raw: match[0],
        calloutType: match[1],
        text: match[2].trim()
      };
    }
  },
  renderer(token) {
    const isWarn = token.calloutType === 'warn';
    const cls = isWarn ? 'callout warn' : 'callout';
    const label = isWarn ? 'WARN' : 'NOTE';
    return `
<div class="${cls}">
  <span class="icon mono">${label}</span>
  <p>${marked.parseInline(token.text)}</p>
</div>\n`;
  }
};

marked.use({ extensions: [calloutExtension] });

// --- 1. wipe and recreate dist ---

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// --- 2. copy static top-level files/folders straight into dist ---

for (const entry of staticEntries) {
  const src = path.join(rootDir, entry);
  if (fs.existsSync(src)) {
    copyRecursive(src, path.join(outDir, entry));
  }
}

// --- 3. build posts, collecting metadata for the index page as we go ---

const rawPosts = [];

// --- PASS 1: read and parse all posts ---
for (const folder of fs.readdirSync(postsDir)) {
  if (folder === '.DS_Store') continue;

  const postFolder = path.join(postsDir, folder);
  const postPath = path.join(postFolder, 'index.md');
  if (!fs.existsSync(postPath)) continue;

  const raw = fs.readFileSync(postPath, 'utf-8');
  const { data, content } = matter(raw);
  const html = marked.parse(content);

  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);

  const formattedDate = data.date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const shortDate = data.date.toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric'
  });

  const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);

  const slug = data.slug || slugify(data.title ?? folder);
  
  // Check for duplicate slugs
  if (seenSlugs.has(slug)) {
    throw new Error(`Duplicate slug detected: "${slug}" (folder: ${folder})`);
  }
  seenSlugs.add(slug);

  rawPosts.push({
    folder, postFolder, data, html, minutes,
    formattedDate, shortDate, tags, slug
  });
}

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

function renderTags(tags) {
  return tags.map(t => `<span class="tag">${t}</span>`).join('\n    ');
}

function categoryClass(cat) {
  if (cat === 'HOMELAB') return 'cat-homelab';
  if (cat === 'TOOLS') return 'cat-tools';
  if (cat === 'CTF WRITEUPS') return 'cat-ctf';
  if (cat === 'NOTES') return 'cat-notes';
  return '';
}

// --- SORT chronologically (oldest first) ---
rawPosts.sort((a, b) => new Date(a.data.date) - new Date(b.data.date));

// --- PASS 2: assign IDs based on per-year sequential position ---
const postsList = [];
const yearCounters = {}; // tracks the running count per year

rawPosts.forEach((post, index) => {
  const { data, html, minutes, formattedDate, shortDate, tags, slug, postFolder } = post;

  const year = data.date.getFullYear();
  yearCounters[year] = (yearCounters[year] ?? 0) + 1;

  const id = `TB-${year}-${String(yearCounters[year]).padStart(4, '0')}`;

  const prevPost = rawPosts[index - 1]; // older post
  const nextPost = rawPosts[index + 1]; // newer post
  const postNavHtml = renderPostNav(prevPost, nextPost);

  // Render the post page using the template and write it to the output directory
  const page = template
    .replaceAll('{{title}}', data.title ?? '')
    .replaceAll('{{dek}}', data.dek ?? '')
    .replaceAll('{{author}}', data.author ?? '')
    .replaceAll('{{date}}', formattedDate ?? '')
    .replace('{{category}}', (data.category ?? '').toUpperCase())
    .replaceAll('{{tags}}', renderTags(tags))
    .replaceAll('{{id}}', id)
    .replace('{{cover}}', data.cover ? `<img class="post-media" src="./images/${data.cover}" alt="">` : '')
    .replace('{{minutes}}', minutes)
    .replace('{{content}}', html)
    .replace('{{postNav}}', postNavHtml);

  const postOutDir = path.join(outDir, 'posts', slug);
  fs.mkdirSync(postOutDir, { recursive: true });
  fs.writeFileSync(path.join(postOutDir, 'index.html'), page);

  for (const entry of fs.readdirSync(postFolder)) {
    if (entry === 'index.md' || entry === '.DS_Store') continue;
    copyRecursive(path.join(postFolder, entry), path.join(postOutDir, entry));
  }

  postsList.push({
    title: data.title ?? slug,
    dek: data.dek ?? '',
    date: data.date ?? '',
    displayDate: formattedDate,
    shortDate,
    year,
    category: (data.category ?? '').toUpperCase(),
    categoryClass: categoryClass((data.category ?? '').toUpperCase()),
    id,
    tags,
    cover: data.cover,
    minutes,
    slug
  });
});


// --- build posts/index.html with the generated list, newest first ---

postsList.sort((a, b) => new Date(b.date) - new Date(a.date));

// Render the latest posts for the root index page
function renderLatestPosts(p) {
  return `
    <a href="/posts/${p.slug}/" class="card-link">
      <div class="card">
        <div class="thumb" style="background-image: url('/posts/${p.slug}/images/${p.cover}');background-size: cover; background-position: center;"></div>
        <span class="cat ${p.categoryClass} mono">${p.category}</span>
        <h3>${p.title}</h3>
        <p>${p.dek}</p>
        <div class="card-meta"><span>${p.minutes} min</span><span>${p.shortDate}</span></div>
      </div>
    </a>`;
}


// Build /index.html with the 6 most recent posts, newest first
const latestPosts = postsList.slice(0, 6); // Get the 6 most recent posts for the root index page
const rootPostsHtml = latestPosts
  .map((p) => (renderLatestPosts(p)))
  .join('\n');

// Render the root index page
const rootIndexPage = rootIndexTemplate.replace('{{latestPosts}}', rootPostsHtml);
fs.writeFileSync(path.join(outDir, 'index.html'), rootIndexPage);


// Render the posts index page
function renderPostEntry(p) {
  return `
    <a class="post-row" href="/posts/${p.slug}/"
    data-title="${p.title.toLowerCase()}"
    data-dek="${p.dek.toLowerCase()}"
    data-tags="${p.tags.join(',').toLowerCase()}"
    data-category="${p.category}">
      <div class="post-date">${p.shortDate}<span class="year">${p.year}</span></div>
      <div class="post-main">
        <div class="post-cat ${p.categoryClass}">${p.category}</div>
        <div class="post-title">${p.title}</div>
        <div class="post-excerpt">${p.dek}</div>
      </div>
      <div class="post-meta">
        <span class="read-time">${p.minutes} min</span>
        <span class="post-id">${p.id}</span>
      </div>
    </a>`;
}

// Render the previous/next post navigation for a post page
function renderPostNav(prevPost, nextPost) {
  const prevHtml = prevPost
    ? `<a href="/posts/${prevPost.slug}/">
      <div class="dir">← Previous</div>
      <div class="ptitle">${prevPost.data.title ?? prevPost.slug}</div>
    </a>`
    : `<div></div>`; // keeps the 2-col grid intact when there's no previous post

  const nextHtml = nextPost
    ? `<a class="next" href="/posts/${nextPost.slug}/">
      <div class="dir">Next →</div>
      <div class="ptitle">${nextPost.data.title ?? nextPost.slug}</div>
    </a>`
    : `<div></div>`;

  return `${prevHtml}\n    ${nextHtml}`;
}

// Build /posts/index.html with the 5 most recent posts, newest first
// const recentPosts = postsList.slice(0, 5);
const recentPosts = postsList;
const postListHtml = recentPosts
  .map((p) => (renderPostEntry(p)))
  .join('\n');

// Render the posts index page
const postsIndexPage = postsIndexTemplate.replace('{{postList}}', postListHtml).replaceAll('{{postCount}}', postsList.length);
fs.mkdirSync(path.join(outDir, 'posts'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'posts', 'index.html'), postsIndexPage);


//---------------------------
// PROJECTS
// --------------------------

// --- ICONS for projects page ---
const ICONS = {
  scanner:  { path: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>', color: 'amber' },
  wifi:     { path: '<path d="M12 20h.01M8.5 16.5a5 5 0 017 0M5 13a10 10 0 0114 0M2 9.5a15 15 0 0120 0"/>', color: 'cyan' },
  shield:   { path: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/>', color: 'red' },
  book:     { path: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/>', color: 'violet' },
  bolt:     { path: '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>', color: 'violet' },
  flame:    { path: '<path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>', color: 'red' },
  lock:     { path: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>', color: 'amber' },
  terminal: { path: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>', color: 'cyan' },
  key:      { path: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3M18 5l3 3"/>', color: 'violet' },
  server:   { path: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>', color: 'cyan' },
  bug:      { path: '<rect x="8" y="6" width="8" height="12" rx="4"/><path d="M12 2v4M8 10H4M8 14H4M16 10h4M16 14h4M9 6L7 4M15 6l2-2M9 18l-2 2M15 18l2 2"/>', color: 'red' },
  firewall: { path: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M9 4v6M15 10v6M9 16v4"/>', color: 'amber' },

  git:      { path: '<path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0022 12c0-5.52-4.48-10-10-10z"/>'},
};

// --- build projects, collecting metadata for the index page as we go ---

// Create a map of posts by slug for easy lookup when linking posts to projects
const postsBySlug = new Map(postsList.map(p => [p.slug, p]));

function statusBadgeClass(status) {
  return { active: 'status-active', complete: 'status-complete', paused: 'status-paused' }[status] ?? '';
}

// Read and parse all projects
const projects = [];

for (const folder of fs.readdirSync(projectsDir)) {
  if (folder === '.DS_Store' || folder === 'index.html') continue;
  const projectFolder = path.join(projectsDir, folder);
  const projectPath = path.join(projectFolder, 'index.md');
  if (!fs.existsSync(projectPath)) continue;

  const raw = fs.readFileSync(projectPath, 'utf-8');
  const { data, content } = matter(raw);
  const bodyHtml = marked.parse(content);
  const slug = data.slug || slugify(data.title ?? folder);



  const icon = ICONS[data.icon];
  if (!icon) throw new Error(`Project "${slug}": unknown icon "${data.icon}"`);

  // Validate linked posts and create an array of linked post objects
  const linkedPosts = (data.posts || []).map(postEntry => {
    const postSlug = slugify(postEntry);
    const p = postsBySlug.get(postSlug);
    if (!p) throw new Error(`Project "${slug}" references unknown post "${postEntry}" (slugified: "${postSlug}")`);
    return p;
  });

  projects.push({ ...data, slug, bodyHtml, icon, linkedPosts, projectFolder });
}


// Render the CTA section for a project (only for tools)
function renderCta(p) {
  if (p.type !== 'tool') return '';
  return `
    <div class="cta-row">
      <a class="btn-primary" href="${p.github}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">${ICONS.git.path}</svg>
        View on GitHub</a>
      <a class="btn-outline" href="#read-the-devlog">Read the devlog ↓</a>
    </div>`;
}

// Render the progress bar for a project (only for series)
function renderProgress(p) {
  if (p.type !== 'series') return '';
  const pct = Math.round((p.linkedPosts.length / p.estimatedTotal) * 100);
  return `
    <div class="progress-track in-hero"><div class="progress-fill" style="width:${pct}%;"></div></div>
    <div class="section-note no-margin">${p.linkedPosts.length} of an estimated ${p.estimatedTotal} posts</div>`;
}

// Render the roadmap section for a project
function renderRoadmap(p) {
  if (!p.roadmap) return '';
  const items = p.roadmap.map(r => `
    <div class="roadmap-item${r.done ? ' done' : ''}">
      <span class="check">${r.done ? '✓' : ''}</span>
      ${r.text}
    </div>`).join('');
  return `
    <section class="section">
      <div class="eyebrow mono">// roadmap</div>
      <div class="roadmap-list">${items}</div>
    </section>`;
}

// Render the linked posts section for a project
function renderLinkedPosts(p) {
  if (!p.linkedPosts.length) return '';
  const heading = p.type === 'tool' ? '// devlog' : '// posts in this series';
  const note = p.type === 'tool' ? '<p class="section-note">Posts written while building this, in order.</p>' : '';
  const items = p.linkedPosts.map((post, i) => `
    <a class="series-item" href="/posts/${post.slug}/">
      <span class="series-num mono">${String(i + 1).padStart(2, '0')}</span>
      <div>
        <div class="series-title">${post.title}</div>
        <div class="series-excerpt">${post.dek}</div>
      </div>
      <div class="series-meta">${post.shortDate}<br>${post.year}</div>
    </a>`).join('');
  return `
    <section class="section" id="read-the-devlog">
      <div class="eyebrow mono">${heading}</div>
      ${note}
      <div class="series-list">${items}</div>
    </section>`;
}


// Render each project page and copy its assets
for (const p of projects) {
  const page = projectTemplate
    .replaceAll('{{title}}', p.title)
    .replaceAll('{{description}}', p.description)
    .replace('{{typeBadge}}', p.type === 'tool' ? 'Tool' : 'Series')
    .replace('{{typeBadgeClass}}', p.type === 'tool' ? 'type-tool' : 'type-series')
    .replace('{{statusLabel}}', p.status[0].toUpperCase() + p.status.slice(1))
    .replace('{{statusClass}}', statusBadgeClass(p.status))
    .replace('{{iconColor}}', p.icon.color)
    .replace('{{iconSvg}}', p.icon.path)
    .replace('{{tags}}', p.tags.map(t => `<span class="project-tag">${t}</span>`).join('\n'))
    .replace('{{heroExtra}}', p.type === 'tool' ? renderCta(p) : renderProgress(p))
    .replace('{{whatItDoesHeading}}', p.type === 'tool' ? '// what it does' : '// why this series')
    .replace('{{body}}', p.bodyHtml)
    .replace('{{roadmapSection}}', renderRoadmap(p))
    .replace('{{linkedPostsSection}}', renderLinkedPosts(p));

  const outPath = path.join(outDir, 'projects', p.slug);
  fs.mkdirSync(outPath, { recursive: true });
  fs.writeFileSync(path.join(outPath, 'index.html'), page);

  for (const entry of fs.readdirSync(p.projectFolder)) {
    if (entry === 'index.md' || entry === 'index.html' || entry === '.DS_Store') continue;
    copyRecursive(path.join(p.projectFolder, entry), path.join(outPath, entry));
  }
}


// Render the projects index page
function renderProjectCard(p) {
  const footer = p.type === 'tool'
    ? `<span class="repo-link">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">${ICONS.git.path}</svg>
        ${p.github.replace('https://', '')}</span><span class="view-link">View project →</span>`
    : `<span class="count">${p.linkedPosts.length} posts</span><span class="view-link">View series →</span>`;

  const progressBar = p.type === 'series'
    ? `<div class="progress-track"><div class="progress-fill" style="width:${Math.round((p.linkedPosts.length / p.estimatedTotal) * 100)}%;"></div></div>`
    : '';

  return `
    <a class="project-card" href="/projects/${p.slug}/" data-status="${p.status}" data-type="${p.type}">
      <div class="top-row">
        <div class="project-icon icon-${p.icon.color}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${p.icon.path}</svg>
        </div>
        <div class="badge-group">
          <span class="badge type-${p.type}">${p.type}</span>
          <span class="badge status-${p.status}">${p.status}</span>
        </div>
      </div>
      <h3>${p.title}</h3>
      <p>${p.description}</p>
      ${progressBar}
      <div class="project-tags">
        ${p.tags.map(t => `<span class="project-tag">${t}</span>`).join('\n        ')}
      </div>
      <div class="project-footer">${footer}</div>
    </a>`;
}

// Sort projects by order (if specified) and render the project cards
const projectListHtml = [...projects]
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  .map(p => renderProjectCard(p))
  .join('\n');

// Render the projects index page
const projectsIndexPage = projectsIndexTemplate.replace('{{projectList}}', projectListHtml);
fs.mkdirSync(path.join(outDir, 'projects'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'projects', 'index.html'), projectsIndexPage);



// Render the about index page
const aboutIndexPage = aboutIndexTemplate.replace('{{postCount}}', postsList.length).replace('{{projectCount}}', projects.length);
fs.writeFileSync(path.join(outDir, 'about', 'index.html'), aboutIndexPage);


// --- 5. generate sitemap.xml ---

const siteUrl = 'https://blog.takibyte.com';

const staticUrls = ['/', '/projects/', '/posts/', '/about/'];
const postUrls = postsList.map(p => `/posts/${p.slug}/`);
const projectUrls = projects.map(p => `/projects/${p.slug}/`);

const allUrls = [...staticUrls, ...postUrls, ...projectUrls];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url>\n    <loc>${siteUrl}${url}</loc>\n  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml);


console.log('Build complete → ./dist');
