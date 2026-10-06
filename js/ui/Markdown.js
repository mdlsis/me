/*
    Markdown.js
    Minimal Markdown to HTML for the preview (headings, quotes, lists,
    paragraphs, links, bold, italic and inline code).
*/

import { escapeHtml } from '../core/util.js';

export class Markdown {
    static inline(text) {
        return escapeHtml(text)
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
                if (/^(https?:|mailto:)/.test(url)) {
                    return `<a href="${url}" target="_blank" rel="noopener">${label}</a>`;
                }
                return `<a href="#" data-open="${url}">${label}</a>`;
            })
            .replace(/(^|[\s(])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, '$1<a href="mailto:$2">$2</a>');
    }

    static toHtml(lines) {
        const html = [];
        let list = null;
        let quote = null;
        let para = [];

        const flush = () => {
            if (para.length) html.push(`<p>${Markdown.inline(para.join(' '))}</p>`);
            if (list) html.push(`<ul>${list.map(li => `<li>${Markdown.inline(li)}</li>`).join('')}</ul>`);
            if (quote) html.push(`<blockquote>${quote.map(q => `<p>${Markdown.inline(q)}</p>`).join('')}</blockquote>`);
            para = [];
            list = null;
            quote = null;
        };

        for (const line of lines) {
            let m;
            if (!line.trim()) {
                flush();
            } else if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
                flush();
                html.push(`<h${m[1].length}>${Markdown.inline(m[2])}</h${m[1].length}>`);
            } else if ((m = /^>\s?(.*)$/.exec(line))) {
                if (!quote) flush();
                (quote ||= []).push(m[1]);
            } else if ((m = /^\s*[-*+]\s+(.*)$/.exec(line))) {
                if (!list) flush();
                (list ||= []).push(m[1]);
            } else {
                para.push(line.trim());
            }
        }
        flush();
        return html.join('\n');
    }
}
