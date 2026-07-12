import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const rootDir = '.';
const postsDir = './posts';
const outDir = './dist';
const template = fs.readFileSync('./templates/post.html', 'utf-8');
const postsIndexTemplate = fs.readFileSync(path.join(postsDir, 'index.html'), 'utf-8');

// Top-level files/folders that should be copied into dist as-is (no processing)
const staticEntries = ['index.html', 'css', 'js', 'assets', 'about', 'projects', 'favicon.ico'];

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

const postsList = [];

for (const folder of fs.readdirSync(postsDir)) {
  if (folder === '.DS_Store') continue;

  const postFolder = path.join(postsDir, folder);
  const postPath = path.join(postFolder, 'index.md');
  if (!fs.existsSync(postPath)) continue; // skip index.html and anything without an index.md

  const raw = fs.readFileSync(postPath, 'utf-8');
  const { data, content } = matter(raw);
  const html = marked.parse(content);

  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);

  const page = template
    .replace('{{title}}', data.title ?? '')
    .replace('{{date}}', data.date ?? '')
    .replace('{{minutes}}', minutes)
    .replace('{{content}}', html);

  const slug = data.slug || folder;
  const postOutDir = path.join(outDir, 'posts', slug);
  fs.mkdirSync(postOutDir, { recursive: true });
  fs.writeFileSync(path.join(postOutDir, 'index.html'), page);

  for (const entry of fs.readdirSync(postFolder)) {
    if (entry === 'index.md' || entry === '.DS_Store') continue;
    copyRecursive(path.join(postFolder, entry), path.join(postOutDir, entry));
  }

  postsList.push({ title: data.title ?? slug, date: data.date ?? '', slug });
}

// --- 4. build posts/index.html with the generated list, newest first ---

postsList.sort((a, b) => b.date.localeCompare(a.date));

const postListHtml = postsList
  .map(p => `<li><a href="/posts/${p.slug}/">${p.title}</a> <span class="post-date">${p.date}</span></li>`)
  .join('\n');

const postsIndexPage = postsIndexTemplate.replace('{{postList}}', postListHtml);
fs.mkdirSync(path.join(outDir, 'posts'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'posts', 'index.html'), postsIndexPage);


// --- 5. generate sitemap.xml ---

const siteUrl = 'https://blog.takibyte.com';

const staticUrls = ['/', '/projects/', '/posts/', '/about/'];
const postUrls = postsList.map(p => `/posts/${p.slug}/`);

const allUrls = [...staticUrls, ...postUrls];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url>\n    <loc>${siteUrl}${url}</loc>\n  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml);


console.log('Build complete → ./dist');
