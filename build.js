import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import hljs from 'highlight.js';

/* ============================================================================
   0. PATHS & TEMPLATES
   ============================================================================ */

const rootDir = '.';
const projectsDir = './projects';
const logsDir = './logs';
const aboutDir = './about';
const outDir = './dist';

const logTemplate = fs.readFileSync('./templates/log.html', 'utf-8');
const projectTemplate = fs.readFileSync('./templates/project.html', 'utf-8');
const rootIndexTemplate = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
const logsIndexTemplate = fs.readFileSync(path.join(logsDir, 'index.html'), 'utf-8');
const projectsIndexTemplate = fs.readFileSync(path.join(projectsDir, 'index.html'), 'utf-8');
const aboutIndexTemplate = fs.readFileSync(path.join(aboutDir, 'index.html'), 'utf-8');
const notFoundTemplate = fs.readFileSync(path.join(rootDir, '404.html'), 'utf-8');

// Top-level files/folders copied into dist as-is (no processing).
// NOTE: 'logs' and 'projects' are deliberately excluded — both are built manually below.
const staticEntries = ['index.html', 'css', 'js', 'assets', 'about', 'favicon.ico'];

const seenSlugs = new Set();

// Minimum number of headings (H2 + H3 combined) a log needs before we
// bother generating a TOC. Counting both levels together — rather than
// just H2 — matters because not every log uses H2 as its main structural
// level; some (e.g. a single long walkthrough) organize almost entirely
// with H3s instead. Short logs still just render at full width with no
// sidebar/panel.
const TOC_MIN_HEADINGS = 4;

/* ============================================================================
   1. ICONS (used by project cards/pages)
   ============================================================================ */

const ICONS = {
  scanner:  { path: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>', color: 3 },
  wifi:     { path: '<path d="M12 20h.01M8.5 16.5a5 5 0 017 0M5 13a10 10 0 0114 0M2 9.5a15 15 0 0120 0"/>', color: 5 },
  shield:   { path: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/>', color: 5 },
  book:     { path: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/>', color: 2 },
  bolt:     { path: '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>', color: 2 },
  flame:    { path: '<path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>', color: 4 },
  lock:     { path: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>', color: 3 },
  terminal: { path: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>', color: 1 },
  key:      { path: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3M18 5l3 3"/>', color: 2 },
  server:   { path: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>', color: 1 },
  bug:      { path: '<rect x="8" y="6" width="8" height="12" rx="4"/><path d="M12 2v4M8 10H4M8 14H4M16 10h4M16 14h4M9 6L7 4M15 6l2-2M9 18l-2 2M15 18l2 2"/>', color: 4 },
  firewall: { path: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M9 4v6M15 10v6M9 16v4"/>', color: 3 },
  ctf:      { path: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>', color: 2 },
  chip:     { path: '<rect x="6" y="6" width="12" height="12" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>', color: 4 },
  code:     { path: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="14" y1="4" x2="10" y2="20"/>', color: 3 },
  crosshair:{ path: '<circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="1"/>', color: 4 },
  git:      { path: '<path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0022 12c0-5.52-4.48-10-10-10z"/>' }
};

/* ============================================================================
   2. GENERIC HELPERS
   ============================================================================ */

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

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

function categoryClass(cat) {
  if (cat === 'HOMELAB') return 'cat-homelab';
  if (cat === 'TOOLS') return 'cat-tools';
  if (cat === 'CTF WRITEUPS') return 'cat-ctf';
  if (cat === 'NOTES') return 'cat-notes';
  return '';
}

function statusBadgeClass(status) {
  return { active: 'status-active', complete: 'status-complete', paused: 'status-paused' }[status] ?? '';
}

const THEMES = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'tokyonight', label: 'Tokyo night' },
  { value: 'nord', label: 'Nord' },
  { value: 'redteam', label: 'Red team' },
  { value: 'blueteam', label: 'Blue team' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'paper', label: 'Paper' },
];

function renderThemeOptions() {
  return THEMES.map(t => `<button type="button" class="theme-option mono" data-theme-value="${t.value}" role="option">${t.label}</button>`).join('\n        ');
}

// Desktop — a <details> dropdown styled after the mobile TOC's
// summary/panel pattern (chevron toggle, bordered surface menu),
// instead of a native <select>.
function renderThemeSelect() {
  return `
    <details class="theme-dropdown">
      <summary class="theme-dropdown-toggle mono">
        <span class="theme-dropdown-label">Theme</span>
        <svg class="theme-dropdown-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </summary>
      <div class="theme-dropdown-menu" role="listbox">
        ${renderThemeOptions()}
      </div>
    </details>`;
}

// Mobile — same collapsible details/summary pattern as desktop, just
// full-width and left-aligned rather than a floating menu, so it reads
// as part of the stacked nav rather than a separate floating control.
function renderThemeSelectMobile() {
  return `
    <details class="theme-dropdown theme-dropdown-mobile">
      <summary class="theme-dropdown-toggle mono">
        <span class="theme-dropdown-label">Theme</span>
        <svg class="theme-dropdown-chevron" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </summary>
      <div class="theme-dropdown-menu" role="listbox">
        ${renderThemeOptions()}
      </div>
    </details>`;
}

/* ============================================================================
   3. MARKED CONFIG (code blocks + callouts + heading anchors)
   ============================================================================ */

// Reset before parsing each log so heading ids/slugs never leak across posts.
let currentHeadings = [];
let headingSlugCounts = {};

marked.use({
  renderer: {
    code(token) {
      const { text, lang } = token;
      // support an optional filename via fence info string: ```python title=port-scanner.py
      const [language, ...rest] = (lang || '').split(' ');
      const titleMatch = rest.join(' ').match(/title=(\S+)/);
      const filename = titleMatch ? titleMatch[1] : language || 'terminal';

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
    },
    heading(token) {
      const level = token.depth;
      const html = this.parser.parseInline(token.tokens);

      // Only H2/H3 get anchors + collected into the TOC — H1 doesn't occur in
      // log bodies (that's the page title) and H4+ would be too granular.
      if (level !== 2 && level !== 3) {
        return `<h${level}>${html}</h${level}>\n`;
      }

      // Strip leftover inline markdown chars before slugifying so anchors stay clean.
      const plainText = token.text.replace(/[*_`~]/g, '');
      let slug = slugify(plainText);
      const seenCount = headingSlugCounts[slug] || 0;
      headingSlugCounts[slug] = seenCount + 1;
      if (seenCount > 0) slug = `${slug}-${seenCount}`;

      currentHeadings.push({ id: slug, level, text: plainText });
      return `<h${level} id="${slug}">${html}</h${level}>\n`;
    }
  }
});


const calloutExtension = {
  name: 'callout',
  level: 'block',
  start(src) {
    return src.match(/^:::\s*(note|warn)/)?.index;
  },
  tokenizer(src) {
    const match = /^:::\s*(note|warn)\n([\s\S]*?)\n:::(\n|$)/.exec(src);
    if (match) {
      return { type: 'callout', raw: match[0], calloutType: match[1], text: match[2].trim() };
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

/* ============================================================================
   4. RENDER FUNCTIONS — LOGS
   ============================================================================ */

function renderTags(tags) {
  return tags.map(t => `<a href="/logs/?q=${encodeURIComponent(t.toLowerCase())}" class="tag">${t}</a>`).join('\n    ');
}

// Previous/next log navigation (chronological, all logs — independent of any project/series)
function renderLogNav(prevLog, nextLog) {
  const prevHtml = prevLog
    ? `<a href="/logs/${prevLog.slug}/">
      <div class="dir">← Previous</div>
      <div class="ptitle">${prevLog.data.title ?? prevLog.slug}</div>
    </a>`
    : `<div></div>`; // keeps the 2-col grid intact when there's no previous log

  const nextHtml = nextLog
    ? `<a class="next" href="/logs/${nextLog.slug}/">
      <div class="dir">Next →</div>
      <div class="ptitle">${nextLog.data.title ?? nextLog.slug}</div>
    </a>`
    : `<div></div>`;

  return `${prevHtml}\n    ${nextHtml}`;
}

// "Part of: {project} →" badge shown on logs that belong to a project. Empty string if standalone.
function renderSeriesBadge(seriesInfo) {
  if (!seriesInfo) return '';
  const { project, index, total } = seriesInfo;
  return `
    <div class="series-badge">
      <a href="/projects/${project.slug}/">Part of project: ${project.title} →</a>
      <span class="mono">${index + 1} of ${total}</span>
    </div>`;
}

// Table of contents — shared link list markup used by both the desktop
// sidebar and the mobile collapsible panel. H3s are grouped under their
// preceding H2 into a collapsible block (see .toc-group in styles.css),
// so a log with a lot of sub-sections doesn't turn the sidebar into a
// wall of text — only the group around wherever the reader currently is
// stays open (see the parent-heading tracking in log.html's script).
function renderTocLinks(headings) {
  let html = '';
  let inGroup = false;

  headings.forEach((h, i) => {
    if (h.level === 2) {
      if (inGroup) { html += `</div></div></div>`; inGroup = false; } // one more closing div for the wrapper

      const hasChildren = headings[i + 1] && headings[i + 1].level === 3;
      const wrapOpen = hasChildren ? `<div class="toc-group-wrap">` : '';
      html += `
      ${wrapOpen}<div class="toc-h2-row">
        <a href="#${h.id}" class="toc-link toc-level-2" data-target="${h.id}">${h.text}</a>`;
      if (hasChildren) {
        html += `
        <button type="button" class="toc-group-toggle" data-group="${h.id}" aria-expanded="false" aria-label="Toggle subsections">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>`;
      }
      html += `</div>`;

      if (hasChildren) {
        html += `<div class="toc-group" data-group-id="${h.id}"><div class="toc-group-inner">`;
        inGroup = true;
      } else if (!hasChildren) {
        // no wrapper was opened for this H2, nothing more to do
      }
    } else {
      html += `
      <a href="#${h.id}" class="toc-link toc-level-3" data-target="${h.id}">${h.text}</a>`;
    }
  });

  if (inGroup) html += `</div></div></div>`;
  return html;
}

function hasSubheadings(headings) {
  return headings.some((h, i) => h.level === 2 && headings[i + 1] && headings[i + 1].level === 3);
}

function renderTocMobileBlock(headings, title, id) {
  const expandAll = hasSubheadings(headings) ? `<button type="button" class="toc-expand-all mono">expand all</button>` : '';
  return `
    <details class="toc-mobile">
      <summary><span class="toc-summary-label"><span class="toc-summary-prefix">// ${id}</span><span class="toc-current mono">#<span id="toc-current-text"></span></span></span></summary>
      <nav class="toc-nav">
        <a href="#" class="toc-mobile-title toc-top-link">${title} ↑</a>
        ${expandAll}
        ${renderTocLinks(headings)}
      </nav>
    </details>`;
}

function renderTocRightBlock(headings, title, id) {
  const expandAll = hasSubheadings(headings) ? `<button type="button" class="toc-expand-all mono">expand all</button>` : '';
  return `
    <aside class="toc">
      <a href="#" class="toc-label mono toc-top-link toc-title-link">// contents <span class="toc-arrow">↑</span></a>
      ${expandAll}
      <nav class="toc-nav">${renderTocLinks(headings)}
      </nav>
    </aside>`;
}

// Resolves gutter prev/next with a three-step fallback: series-scoped
// neighbor (if this log belongs to a project and isn't at the series
// edge) → site-wide chronological neighbor (also covers standalone logs,
// and is what lets you walk back OUT of a project once you hit either
// end of its series) → nothing left in that direction at all (true
// first/last log site-wide — handled by the caller with an archive link,
// see renderTocCrumbDesktop below).
function resolveCrumbNav(prevLog, nextLog, seriesInfo) {
  let prevItem = null, nextItem = null;

  if (seriesInfo) {
    const { project, index, total } = seriesInfo;
    if (index > 0) prevItem = navItemInfo(project.linkedLogs[index - 1]);
    if (index < total - 1) nextItem = navItemInfo(project.linkedLogs[index + 1]);
  }

  if (!prevItem) prevItem = navItemInfo(prevLog);
  if (!nextItem) nextItem = navItemInfo(nextLog);

  return { prevItem, nextItem };
}

function renderTocCrumbLeftBlock(prevLog, nextLog, seriesInfo, id) {
  const { prevItem, nextItem } = resolveCrumbNav(prevLog, nextLog, seriesInfo);

  const prevHtml = prevItem
    ? `<a href="/logs/${prevItem.slug}/" class="toc-crumb-nav-link">← ${prevItem.title}</a>`
    : `<a href="/logs/" class="toc-crumb-nav-link">← All logs</a>`; // true start of the site — nothing older exists

  const nextHtml = nextItem
    ? `<a href="/logs/${nextItem.slug}/" class="toc-crumb-nav-link next">${nextItem.title} →</a>`
    : `<a href="/logs/" class="toc-crumb-nav-link next">All logs →</a>`; // true end of the site — this is the newest post

  return `
    <aside class="toc-crumb-desktop">
      <a href="#" class="toc-label mono toc-top-link toc-title-link">// ${id}</a>
      <div class="toc-crumb-nav">
        ${prevHtml}
        ${nextHtml}
      </div>
    </aside>`;
}

// Normalizes prev/next log references to {title, slug} regardless of shape —
// rawLogs entries (prevLog/nextLog from section 10) carry frontmatter under
// .data; project.linkedLogs entries (from logsList) already have title/slug
// flattened. Lets the series and site-wide branches below share one path.
function navItemInfo(item) {
  if (!item) return null;
  if (item.data) return { title: item.data.title ?? item.slug, slug: item.slug };
  return { title: item.title ?? item.slug, slug: item.slug };
}


function renderLatestLogs(p) {
  return `
    <a href="/logs/${p.slug}/" class="card-link">
      <div class="card">
        <div class="thumb" style="background-image: url('/logs/${p.slug}/images/${p.cover}');background-size: cover; background-position: center;"></div>
        <span class="cat ${p.categoryClass} mono">${p.category}</span>
        <h3>${p.title}</h3>
        <p>${p.dek}</p>
        <div class="card-meta"><span>${p.shortDate}</span><span>${p.minutes} min</span></div>
      </div>
    </a>`;
}

function renderLogEntry(p) {
  return `
    <a class="log-row" href="/logs/${p.slug}/"
    data-title="${p.title.toLowerCase()}"
    data-dek="${p.dek.toLowerCase()}"
    data-tags="${p.tags.join(',').toLowerCase()}"
    data-category="${p.category}"
    data-id="${p.id.toLowerCase()}">
      <div class="log-date">${p.shortDate}<span class="year">${p.year}</span></div>
      <div class="log-main">
        <div class="log-cat ${p.categoryClass}">${p.category}</div>
        <div class="log-title">${p.title}</div>
        <div class="log-excerpt">${p.dek}</div>
      </div>
      <div class="log-meta">
        <span class="read-time">${p.minutes} min</span>
        <span class="log-id">${p.id}</span>
      </div>
    </a>`;
}

/* ============================================================================
   5. RENDER FUNCTIONS — PROJECTS
   ============================================================================ */

// CTA row (GitHub + devlog link) — tools only
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

// Progress bar + "X of ~Y logs" note — series only
function renderProgress(p) {
  if (p.type !== 'series') return '';
  const pct = Math.round((p.linkedLogs.length / p.estimatedTotal) * 100);
  return `
    <div class="progress-track in-hero"><div class="progress-fill" style="width:${pct}%;"></div></div>
    <div class="section-note no-margin">${p.linkedLogs.length} of an estimated ${p.estimatedTotal} logs</div>`;
}

// Roadmap checklist — only rendered if frontmatter defines one
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

// Linked logs list — heading/note text differs for tool (devlog) vs series
function renderLinkedLogs(p) {
  if (!p.linkedLogs.length) return '';
  const heading = p.type === 'tool' ? '// devlog' : '// logs in this series';
  const note = p.type === 'tool' ? '<p class="section-note">Logs written while building this, in order.</p>' : '';
  const items = p.linkedLogs.map((log, i) => `
    <a class="series-item" href="/logs/${log.slug}/">
      <span class="series-num mono">${String(i + 1).padStart(2, '0')}</span>
      <div>
        <div class="series-title">${log.title}</div>
        <div class="series-excerpt">${log.dek}</div>
      </div>
      <div class="series-meta">${log.shortDate}<br>${log.year}</div>
    </a>`).join('');
  return `
    <section class="section" id="read-the-devlog">
      <div class="eyebrow mono">${heading}</div>
      ${note}
      <div class="series-list">${items}</div>
    </section>`;
}

function renderProjectCard(p) {
  const footer = p.type === 'tool'
    ? `<span class="repo-link">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">${ICONS.git.path}</svg>
        <span class="repo-url">${p.github.replace('https://', '')}</span>
       </span><span class="view-link">View project →</span>`
    : `<span class="count">${p.linkedLogs.length} ${p.linkedLogs.length === 1 ? 'log' : 'logs'}</span><span class="view-link">View project →</span>`;

  let progressBar;
  if (p.type === 'series') {
    const pct = Math.round((p.linkedLogs.length / p.estimatedTotal) * 100);
    progressBar = `<div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>`;
  } else if (p.roadmap && p.roadmap.length) {
    const done = p.roadmap.filter(r => r.done).length;
    const pct = Math.round((done / p.roadmap.length) * 100);
    progressBar = `<div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>`;
  } else {
    progressBar = `<div class="progress-track-placeholder"></div>`; // tool with no roadmap defined — reserve the space anyway for consistent card height
  }

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

function renderFeaturedProject(p) {
  return `
    <a class="project-card compact" href="/projects/${p.slug}/">
      <div class="top-row">
        <div class="project-icon icon-${p.icon.color}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${p.icon.path}</svg>
        </div>
        <span class="badge type-${p.type}">${p.type}</span>
      </div>
      <h3>${p.title}</h3>
      <p>${p.description}</p>
    </a>`;
}

/* ============================================================================
   6. BUILD START — wipe dist, copy static entries
   ============================================================================ */

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const entry of staticEntries) {
  const src = path.join(rootDir, entry);
  if (fs.existsSync(src)) {
    copyRecursive(src, path.join(outDir, entry));
  }
}

/* ============================================================================
   7. PARSE — LOGS (frontmatter + markdown only, no writing yet)
   ============================================================================ */

const rawLogs = [];

for (const folder of fs.readdirSync(logsDir)) {
  if (folder === '.DS_Store') continue;

  const logFolder = path.join(logsDir, folder);
  const logPath = path.join(logFolder, 'index.md');
  if (!fs.existsSync(logPath)) continue;

  const raw = fs.readFileSync(logPath, 'utf-8');
  const { data, content } = matter(raw);

  // Reset heading collection state so ids/counts don't leak between logs.
  currentHeadings = [];
  headingSlugCounts = {};
  const html = marked.parse(content);
  const headings = currentHeadings;

  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);

  const formattedDate = data.date.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
  const shortDate = data.date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);
  const slug = data.slug || slugify(data.title ?? folder);

  if (seenSlugs.has(slug)) {
    throw new Error(`Duplicate slug detected: "${slug}" (folder: ${folder})`);
  }
  seenSlugs.add(slug);

  rawLogs.push({ folder, logFolder, data, html, headings, minutes, formattedDate, shortDate, tags, slug });
}

// Chronological order (oldest first) — this order is what prev/next nav is built from
rawLogs.sort((a, b) => new Date(a.data.date) - new Date(b.data.date));

/* ============================================================================
   8. PARSE — LOGS PASS 2: assign IDs, build logsList (still no writing)
   ============================================================================ */

const logsList = [];
const yearCounters = {};

rawLogs.forEach((log, index) => {
  const { data, formattedDate, shortDate, tags, slug } = log;

  const year = data.date.getFullYear();
  yearCounters[year] = (yearCounters[year] ?? 0) + 1;
  const id = `TB-${year}-${String(yearCounters[year]).padStart(4, '0')}`;

  // stash onto the rawLogs entry itself so pass-3 (write) doesn't need to recompute anything
  log.id = id;
  log.prevLog = rawLogs[index - 1]; // older log
  log.nextLog = rawLogs[index + 1]; // newer log

  logsList.push({
    title: data.title ?? slug,
    dek: data.dek ?? '',
    date: data.date ?? '',
    displayDate: formattedDate,
    shortDate,
    year,
    id: id,
    category: (data.category ?? '').toUpperCase(),
    categoryClass: categoryClass((data.category ?? '').toUpperCase()),
    id, tags, cover: data.cover, minutes: log.minutes, slug
  });
});

// Newest-first for anything display-facing (index pages, homepage)
logsList.sort((a, b) => new Date(b.date) - new Date(a.date));

const logsBySlug = new Map(logsList.map(p => [p.slug, p]));

/* ============================================================================
   9. PARSE — PROJECTS (needs logsBySlug to resolve linked logs)
   ============================================================================ */

const projects = [];

for (const folder of fs.readdirSync(projectsDir)) {
  if (folder === '.DS_Store' || folder === 'index.html') continue;
  const projectFolder = path.join(projectsDir, folder);
  const projectPath = path.join(projectFolder, 'index.md');
  if (!fs.existsSync(projectPath)) continue;

  const raw = fs.readFileSync(projectPath, 'utf-8');
  const { data, content } = matter(raw);

  // Same heading renderer runs here (it's global to `marked`) — reset its
  // state first so a project's own H2/H3s can't leak into whichever log
  // happened to be parsed last in the section-7 loop.
  currentHeadings = [];
  headingSlugCounts = {};
  const bodyHtml = marked.parse(content);
  const slug = data.slug || slugify(data.title ?? folder);

  const icon = ICONS[data.icon];
  if (!icon) throw new Error(`Project "${slug}": unknown icon "${data.icon}"`);

  const linkedLogs = (data.logs || []).map(logEntry => {
    const logSlug = slugify(logEntry);
    const p = logsBySlug.get(logSlug);
    if (!p) throw new Error(`Project "${slug}" references unknown log "${logEntry}" (slugified: "${logSlug}")`);
    return p;
  });

  projects.push({ ...data, slug, bodyHtml, icon, linkedLogs, projectFolder });
}

// Reverse map: which project (if any) does a given log slug belong to, and at what position
const logToProject = new Map();
for (const p of projects) {
  p.linkedLogs.forEach((log, i) => {
    logToProject.set(log.slug, { project: p, index: i, total: p.linkedLogs.length });
  });
}

/* ============================================================================
   10. WRITE — LOG PAGES (now that projects/logToProject exist)
   ============================================================================ */

rawLogs.forEach((log) => {
  const { data, html, headings, minutes, formattedDate, tags, slug, logFolder, id, prevLog, nextLog } = log;

  const seriesInfo = logToProject.get(slug);

  const page = logTemplate
    .replaceAll('{{title}}', data.title ?? '')
    .replaceAll('{{dek}}', data.dek ?? '')
    .replaceAll('{{author}}', data.author ?? '')
    .replaceAll('{{date}}', formattedDate ?? '')
    .replace('{{category}}', (data.category ?? '').toUpperCase())
    .replace('{{categoryClass}}', data.category ?? '')
    .replaceAll('{{tags}}', renderTags(tags))
    .replaceAll('{{id}}', id)
    .replace('{{cover}}', data.cover ? `<img class="log-media" src="./images/${data.cover}" alt="">` : '')
    .replace('{{minutes}}', minutes)
    .replace('{{tocMobile}}', headings.length >= TOC_MIN_HEADINGS ? renderTocMobileBlock(headings, data.title ?? '', id ?? '') : '')
    .replace('{{tocCrumbLeft}}', renderTocCrumbLeftBlock(prevLog, nextLog, seriesInfo, id ?? ''))
    .replace('{{tocRight}}', headings.length >= TOC_MIN_HEADINGS ? renderTocRightBlock(headings, data.title ?? '', id ?? '') : '')
    .replace('{{content}}', html)
    .replace('{{seriesBadge}}', renderSeriesBadge(seriesInfo))
    .replace('{{logNav}}', renderLogNav(prevLog, nextLog))
    .replace('{{themeSelect}}', renderThemeSelect())
    .replace('{{themeSelectMobile}}', renderThemeSelectMobile());

  const logOutDir = path.join(outDir, 'logs', slug);
  fs.mkdirSync(logOutDir, { recursive: true });
  fs.writeFileSync(path.join(logOutDir, 'index.html'), page);

  for (const entry of fs.readdirSync(logFolder)) {
    if (entry === 'index.md' || entry === '.DS_Store') continue;
    copyRecursive(path.join(logFolder, entry), path.join(logOutDir, entry));
  }
});

/* ============================================================================
   11. WRITE — PROJECT PAGES
   ============================================================================ */

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
    .replace('{{linkedLogsSection}}', renderLinkedLogs(p))
    .replace('{{themeSelect}}', renderThemeSelect())
    .replace('{{themeSelectMobile}}', renderThemeSelectMobile());

  const outPath = path.join(outDir, 'projects', p.slug);
  fs.mkdirSync(outPath, { recursive: true });
  fs.writeFileSync(path.join(outPath, 'index.html'), page);

  for (const entry of fs.readdirSync(p.projectFolder)) {
    if (entry === 'index.md' || entry === 'index.html' || entry === '.DS_Store') continue;
    copyRecursive(path.join(p.projectFolder, entry), path.join(outPath, entry));
  }
}

/* ============================================================================
   12. WRITE — INDEX / LISTING PAGES
   ============================================================================ */

// -- logs/index.html --
const logListHtml = logsList.map(renderLogEntry).join('\n');
const logsIndexPage = logsIndexTemplate
  .replace('{{logList}}', logListHtml)
  .replaceAll('{{logCount}}', logsList.length)
  .replace('{{themeSelect}}', renderThemeSelect())
  .replace('{{themeSelectMobile}}', renderThemeSelectMobile());
fs.mkdirSync(path.join(outDir, 'logs'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'logs', 'index.html'), logsIndexPage);

// -- projects/index.html --
const projectListHtml = [...projects]
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  .map(renderProjectCard)
  .join('\n');
const projectsIndexPage = projectsIndexTemplate
  .replace('{{projectList}}', projectListHtml)
  .replace('{{themeSelect}}', renderThemeSelect())
  .replace('{{themeSelectMobile}}', renderThemeSelectMobile());
fs.mkdirSync(path.join(outDir, 'projects'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'projects', 'index.html'), projectsIndexPage);

// -- root index.html (latest logs + featured projects) --
const rootLogsHtml = logsList.slice(0, 6).map(renderLatestLogs).join('\n');

const featuredProjectsHtml = projects
  .filter(p => p.featured)
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  .slice(0, 2) // cap at 2 so it stays a "strip", not another full grid
  .map(renderFeaturedProject)
  .join('\n');

const rootIndexPage = rootIndexTemplate
  .replace('{{latestLogs}}', rootLogsHtml)
  .replace('{{featuredProjects}}', featuredProjectsHtml)
  .replace('{{themeSelect}}', renderThemeSelect())
  .replace('{{themeSelectMobile}}', renderThemeSelectMobile());
fs.writeFileSync(path.join(outDir, 'index.html'), rootIndexPage);

// -- about/index.html --
const aboutIndexPage = aboutIndexTemplate
  .replace('{{logCount}}', logsList.length)
  .replace('{{projectCount}}', projects.length)
  .replace('{{themeSelect}}', renderThemeSelect())
  .replace('{{themeSelectMobile}}', renderThemeSelectMobile());
fs.writeFileSync(path.join(outDir, 'about', 'index.html'), aboutIndexPage);

// -- 404.html --
const notFoundPage = notFoundTemplate
  .replace('{{themeSelect}}', renderThemeSelect())
  .replace('{{themeSelectMobile}}', renderThemeSelectMobile());
fs.writeFileSync(path.join(outDir, '404.html'), notFoundPage);

/* ============================================================================
   13. SITEMAP
   ============================================================================ */

const siteUrl = 'https://lab.takibyte.com';

const staticUrls = ['/', '/projects/', '/logs/', '/about/'];
const logUrls = logsList.map(p => `/logs/${p.slug}/`);
const projectUrls = projects.map(p => `/projects/${p.slug}/`);
const allUrls = [...staticUrls, ...projectUrls, ...logUrls];

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url>\n    <loc>${siteUrl}${url}</loc>\n  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemapXml);

console.log('Build complete → ./dist');

