/*
    Highlighter.js
    Tiny line-based syntax highlighter for the languages used in the
    workspace (C#, JSON and Markdown), plus fold range detection.
*/

import { escapeHtml } from './util.js';

const CS_KEYWORDS = new Set([
    'using', 'namespace', 'class', 'static', 'void', 'public', 'private', 'protected',
    'internal', 'var', 'new', 'string', 'int', 'bool', 'return', 'get', 'set', 'init',
    'this', 'null', 'true', 'false', 'if', 'else', 'foreach', 'in', 'readonly', 'record',
    'struct', 'interface', 'async', 'await',
]);

const CS_CONTROL = new Set(['return', 'if', 'else', 'foreach', 'in', 'await']);

export class Highlighter {
    /**
     * Splits a line into tokens: [{ type, text }]
     * @param {string} text
     * @param {string} lang
     */
    static tokenize(text, lang) {
        switch (lang) {
            case 'csharp': return Highlighter.#csharp(text);
            case 'json': return Highlighter.#json(text);
            case 'markdown': return Highlighter.#markdown(text);
            default: return [{ type: 'text', text }];
        }
    }

    static #scan(text, rules, classify) {
        const tokens = [];
        let pos = 0;

        while (pos < text.length) {
            let matched = false;
            for (const [type, re] of rules) {
                re.lastIndex = pos;
                const m = re.exec(text);
                if (m && m[0].length) {
                    const t = { type, text: m[0], start: pos };
                    tokens.push(classify ? classify(t, text, tokens) : t);
                    pos += m[0].length;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                tokens.push({ type: 'text', text: text[pos], start: pos });
                pos++;
            }
        }
        return tokens;
    }

    static #csharp(text) {
        const isNamespaceLine = /^\s*(using|namespace)\b/.test(text);
        const rules = [
            ['ws', /\s+/y],
            ['comment', /\/\/.*/y],
            ['string', /\$?@?"(?:[^"\\]|\\.)*"?/y],
            ['number', /\d+(?:\.\d+)?[fFdDmM]?\b/y],
            ['ident', /[A-Za-z_]\w*/y],
            ['punct', /[{}()[\];,.=<>+\-*/:?!|&]/y],
        ];

        return Highlighter.#scan(text, rules, (t, line, tokens) => {
            if (t.type !== 'ident') return t;

            const word = t.text;
            const after = line.slice(t.start + word.length);
            const prev = [...tokens].reverse().find(x => x.type !== 'ws');

            if (CS_KEYWORDS.has(word)) {
                t.type = CS_CONTROL.has(word) ? 'control' : 'keyword';
            } else if (isNamespaceLine) {
                t.type = after.startsWith('.') ? 'ns' : 'type';
            } else if (prev?.text === 'new') {
                t.type = 'type';
            } else if (/^\s*\(/.test(after)) {
                t.type = 'fn';
            } else if (/^\s*=(?!=)/.test(after) && /^[A-Z]/.test(word)) {
                t.type = 'prop';
            } else if (prev?.text === '.') {
                t.type = 'prop';
            } else if (/^[A-Z]/.test(word)) {
                t.type = 'type';
            } else {
                t.type = 'var';
            }
            return t;
        });
    }

    static #json(text) {
        return Highlighter.#scan(text, [
            ['ws', /\s+/y],
            ['prop', /"(?:[^"\\]|\\.)*"(?=\s*:)/y],
            ['string', /"(?:[^"\\]|\\.)*"?/y],
            ['number', /-?\d+(?:\.\d+)?/y],
            ['keyword', /\b(?:true|false|null)\b/y],
            ['punct', /[{}[\],:]/y],
        ]);
    }

    static #markdown(text) {
        if (/^#{1,6}\s/.test(text)) return [{ type: 'heading', text, start: 0 }];

        const tokens = [];
        let rest = text;
        let offset = 0;

        const quote = /^>\s?/.exec(rest) || /^\s*[-*+]\s/.exec(rest);
        if (quote) {
            tokens.push({ type: quote[0].includes('>') ? 'quote' : 'punct', text: quote[0], start: 0 });
            rest = rest.slice(quote[0].length);
            offset = quote[0].length;
        }

        const inline = Highlighter.#scan(rest, [
            ['code', /`[^`]+`/y],
            ['bold', /\*\*[^*]+\*\*/y],
            ['italic', /\*[^*]+\*/y],
            ['link', /\[[^\]]+\]\([^)]+\)/y],
            ['text', /[^`*[]+/y],
        ]);

        for (const t of inline) {
            t.start += offset;
            if (t.type === 'link') {
                const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t.text);
                const s = t.start;
                tokens.push(
                    { type: 'punct', text: '[', start: s },
                    { type: 'link-text', text: m[1], start: s + 1 },
                    { type: 'punct', text: '](', start: s + 1 + m[1].length },
                    { type: 'link-url', text: m[2], start: s + 3 + m[1].length },
                    { type: 'punct', text: ')', start: s + 3 + m[1].length + m[2].length },
                );
            } else {
                tokens.push(t);
            }
        }

        if (quote && quote[0].includes('>')) {
            tokens.forEach((t, i) => { if (i > 0) t.quoted = true; });
        }
        return tokens;
    }

    /**
     * Renders tokens to HTML, applying decoration ranges (marks) and an
     * optional caret column. Offsets are relative to the token text.
     * mark: { start, end, cls?, href?, open?, problem? }
     */
    static render(tokens, marks = [], caret = -1) {
        const cuts = new Set();
        marks.forEach(m => { cuts.add(m.start); cuts.add(m.end); });
        if (caret >= 0) cuts.add(caret);

        let html = '';
        let total = 0;

        for (const token of tokens) {
            const start = token.start ?? total;
            const end = start + token.text.length;
            const points = [start, ...[...cuts].filter(c => c > start && c < end).sort((a, b) => a - b), end];

            for (let i = 0; i < points.length - 1; i++) {
                const s = points[i];
                const e = points[i + 1];
                if (s === caret) html += '<span class="caret"></span>';
                html += Highlighter.#segment(token, token.text.slice(s - start, e - start), s, e, marks);
            }
            total = end;
        }

        if (caret >= total) html += '<span class="caret"></span>';
        return html;
    }

    static #segment(token, text, start, end, marks) {
        const classes = [`t-${token.type}`];
        if (token.quoted) classes.push('t-quoted');

        let link = null;
        let problem = null;
        for (const m of marks) {
            if (m.start <= start && m.end >= end) {
                if (m.cls) classes.push(m.cls);
                if (m.href || m.open) link = m;
                if (m.problem) problem = m.problem;
            }
        }

        const attrs = problem ? ` data-problem="${escapeHtml(problem)}"` : '';
        const span = `<span class="${classes.join(' ')}"${attrs}>${escapeHtml(text)}</span>`;

        if (!link) return span;
        if (link.open) return `<a href="#" data-open="${escapeHtml(link.open)}" title="Open ${escapeHtml(link.open)}">${span}</a>`;
        return `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener" title="Follow link">${span}</a>`;
    }

    /**
     * Fold ranges for brace based languages: Map<startLine, endLine>
     */
    static folds(lines, lang) {
        const ranges = new Map();
        if (lang !== 'csharp' && lang !== 'json') return ranges;

        const stack = [];
        lines.forEach((line, i) => {
            for (const t of Highlighter.tokenize(line, lang)) {
                if (t.type !== 'punct') continue;
                for (const ch of t.text) {
                    if (ch === '{' || ch === '[') stack.push(i);
                    if (ch === '}' || ch === ']') {
                        const start = stack.pop();
                        if (start !== undefined && start < i && !ranges.has(start)) ranges.set(start, i);
                    }
                }
            }
        });
        return ranges;
    }
}
