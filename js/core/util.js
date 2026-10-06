/*
    util.js
    Small shared helpers.
*/

export const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isNarrow = () => window.matchMedia('(max-width: 899px)').matches;

/** Resolves after ms (instantly when the user prefers reduced motion). */
export const sleep = (ms) => new Promise(r => setTimeout(r, prefersReducedMotion() ? 0 : ms));

export function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const LINK_RE = /(https?:\/\/[^\s"'<>)]+)|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

/** Escapes text and turns URLs and emails into links. */
export function linkify(text) {
    let html = '';
    let last = 0;
    for (const m of String(text).matchAll(LINK_RE)) {
        html += escapeHtml(text.slice(last, m.index));
        const href = m[1] ? m[1] : `mailto:${m[2]}`;
        const target = m[1] ? ' target="_blank" rel="noopener"' : '';
        html += `<a href="${escapeHtml(href)}"${target}>${escapeHtml(m[0])}</a>`;
        last = m.index + m[0].length;
    }
    return html + escapeHtml(text.slice(last));
}

/** Finds URL and email ranges inside a line of text. */
export function findLinks(text) {
    const ranges = [];
    for (const m of String(text).matchAll(LINK_RE)) {
        ranges.push({
            start: m.index,
            end: m.index + m[0].length,
            href: m[1] ? m[1] : `mailto:${m[2]}`,
        });
    }
    return ranges;
}

export const storage = {
    get(key, fallback = null) {
        try {
            const v = localStorage.getItem(key);
            return v === null ? fallback : JSON.parse(v);
        } catch (e) {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) { /* storage unavailable */ }
    },
};

/** Formats a keybinding like "Ctrl+Shift+P" for the current platform. */
export function formatKeys(keys) {
    if (!keys) return '';
    if (!isMac) return keys;
    return keys
        .replace(/Ctrl\+/g, '⌘')
        .replace(/Shift\+/g, '⇧')
        .replace(/Alt\+/g, '⌥');
}

/** Simple subsequence fuzzy match. Returns matched indexes or null. */
export function fuzzyMatch(query, text) {
    if (!query) return [];
    const q = query.toLowerCase();
    const t = text.toLowerCase();

    // Prefer a contiguous match
    const at = t.indexOf(q);
    if (at >= 0) return Array.from({ length: q.length }, (_, i) => at + i);

    const idx = [];
    let j = 0;
    for (let i = 0; i < t.length && j < q.length; i++) {
        if (t[i] === q[j]) {
            idx.push(i);
            j++;
        }
    }
    return j === q.length ? idx : null;
}

/** Wraps matched characters in <mark>. */
export function highlightMatches(text, indexes) {
    if (!indexes || !indexes.length) return escapeHtml(text);
    const set = new Set(indexes);
    let html = '';
    for (let i = 0; i < text.length; i++) {
        const ch = escapeHtml(text[i]);
        html += set.has(i) ? `<mark>${ch}</mark>` : ch;
    }
    return html.replace(/<\/mark><mark>/g, '');
}
