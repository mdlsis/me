/*
    EditorView.js
    Renders a file as editable-looking code: line numbers, folding,
    indent guides, diagnostics (squiggles + inline messages), links,
    current line, and an animated caret used by the quick fixes.

    Events emitted:
        cursor:changed  { path, line, col }
        editor:open     { path }
        quickfix:show   { problem, anchor }
*/

import { Highlighter } from '../core/Highlighter.js';
import { escapeHtml, findLinks, formatKeys, isNarrow } from '../core/util.js';
import { icon } from './icons.js';

const SEVERITY_LABEL = { error: 'Error', warning: 'Warning', info: 'Info' };

export class EditorView {
    #states = new Map();
    #file = null;
    #folds = new Map();
    #caret = null;

    constructor({ el, bus, workspace, hover, commands }) {
        this.el = el;
        this.bus = bus;
        this.workspace = workspace;
        this.hover = hover;
        this.commands = commands;
        this.wordWrap = true;

        this.el.innerHTML = '<div class="lines" role="presentation"></div>';
        this.linesEl = this.el.querySelector('.lines');

        this.#bindEvents();

        bus.on('file:changed', ({ path, line }) => {
            if (path !== this.#file?.path) return;
            if (line === undefined) this.render();
            else this.renderLine(line);
        });
        bus.on('problems:changed', () => { if (this.#file) this.render(); });
    }

    get path() {
        return this.#file?.path;
    }

    get state() {
        return this.#states.get(this.#file?.path);
    }

    #stateFor(file) {
        if (!this.#states.has(file.path)) {
            const folds = Highlighter.folds(file.lines, file.lang);
            const collapsed = new Set();
            for (const [start] of folds) {
                if (file.collapsed.some(prefix => file.lines[start].trim().startsWith(prefix))) collapsed.add(start);
            }
            this.#states.set(file.path, { scrollTop: 0, line: 0, col: 0, collapsed });
        }
        return this.#states.get(file.path);
    }

    /** Opens a file in the view, restoring its scroll and cursor. */
    show(path, { intro = false } = {}) {
        if (this.#file) this.state.scrollTop = this.el.scrollTop;

        this.#file = this.workspace.file(path);
        if (!this.#file) return;
        this.#folds = Highlighter.folds(this.#file.lines, this.#file.lang);
        this.#stateFor(this.#file);

        this.el.classList.toggle('intro', intro);
        this.render();
        this.el.scrollTop = this.state.scrollTop;
        this.#emitCursor();

        if (intro) {
            const total = this.linesEl.children.length;
            setTimeout(() => this.el.classList.remove('intro'), total * 30 + 600);
        }
    }

    setWordWrap(on) {
        this.wordWrap = on;
        this.el.classList.toggle('wrap', on);
    }

    /** Lines that are not hidden by a collapsed fold. */
    visibleLines() {
        if (!this.#file) return [];
        const hidden = this.#hiddenSet();
        return this.#file.lines.map((text, i) => ({ text, i })).filter(l => !hidden.has(l.i));
    }

    #hiddenSet() {
        const hidden = new Set();
        for (const start of this.state.collapsed) {
            const end = this.#folds.get(start);
            if (end === undefined) continue;
            for (let i = start + 1; i < end; i++) hidden.add(i);
        }
        return hidden;
    }

    render() {
        if (!this.#file) return;
        const hidden = this.#hiddenSet();
        let html = '';
        let n = 0;
        this.#file.lines.forEach((_, i) => {
            if (hidden.has(i)) return;
            html += this.#lineHtml(i, n++);
        });
        this.linesEl.innerHTML = html;
        this.el.style.setProperty('--ln-chars', String(this.#file.lines.length).length);
        this.bus.emit('editor:rendered', { path: this.#file.path, lines: this.visibleLines().map(l => l.text), lang: this.#file.lang });
    }

    renderLine(i) {
        const el = this.linesEl.querySelector(`.line[data-line="${i}"]`);
        if (!el) return;
        el.outerHTML = this.#lineHtml(i, Number(el.style.getPropertyValue('--i')) || 0);
    }

    #lineHtml(i, order) {
        const file = this.#file;
        const raw = file.lines[i];
        const indent = raw.length - raw.trimStart().length;
        const text = raw.slice(indent);
        const tokens = Highlighter.tokenize(text, file.lang);
        const problems = this.workspace.problems(file.path).filter(p => p.line === i);

        // Decorations
        const marks = findLinks(text);
        if (file.lang === 'markdown') marks.push(...this.#markdownLinks(tokens));

        for (const p of problems) {
            const at = text.indexOf(p.word);
            if (at >= 0) marks.push({ start: at, end: at + p.word.length, cls: `squiggle squiggle-${p.severity}`, problem: p.id });
        }

        const caret = this.#caret?.line === i ? this.#caret.col - indent : -1;
        const code = Highlighter.render(tokens, marks, caret);

        // Folding
        const foldEnd = this.#folds.get(i);
        const collapsed = this.state.collapsed.has(i);
        const fold = foldEnd !== undefined
            ? `<button type="button" class="fold ${collapsed ? 'is-collapsed' : ''}" data-fold="${i}" aria-label="${collapsed ? 'Expand' : 'Collapse'} region" aria-expanded="${!collapsed}">${icon(collapsed ? 'chevronRight' : 'chevronDown')}</button>`
            : '<span class="fold"></span>';
        const ellipsis = collapsed ? `<button type="button" class="fold-ellipsis" data-fold="${i}" aria-label="Expand region">…</button>` : '';

        // Glyph margin + inline message (like the Error Lens extension)
        const main = problems.find(p => p.severity === 'error') || problems.find(p => p.severity === 'warning') || problems[0];
        const glyph = problems.some(p => p.fix)
            ? `<button type="button" class="glyph lightbulb" data-quickfix="${escapeHtml(problems.find(p => p.fix).id)}" aria-label="Show code actions">${icon('lightbulb')}</button>`
            : '<span class="glyph"></span>';
        const lens = main
            ? `<span class="lens lens-${main.severity}" data-problem="${escapeHtml(main.id)}">${icon(main.severity)}${escapeHtml(main.message)}</span>`
            : '';

        const classes = ['line'];
        if (i === this.state.line) classes.push('active');
        if (main) classes.push(`has-${main.severity}`);

        return `<div class="${classes.join(' ')}" data-line="${i}" style="--i:${order}">`
            + `${glyph}<span class="ln">${i + 1}</span>${fold}`
            + `<span class="code" style="--ind:${indent}ch">${code}${ellipsis}${lens}</span>`
            + '</div>';
    }

    #markdownLinks(tokens) {
        const marks = [];
        tokens.forEach((t, k) => {
            if (t.type !== 'link-text') return;
            const url = tokens[k + 2];
            if (!url || url.type !== 'link-url') return;
            const external = /^(https?:|mailto:)/.test(url.text);
            const target = external ? { href: url.text } : { open: url.text };
            marks.push({ start: t.start, end: t.start + t.text.length, ...target });
            if (!external) marks.push({ start: url.start, end: url.start + url.text.length, ...target });
        });
        return marks;
    }

    toggleFold(line, collapse) {
        const set = this.state.collapsed;
        const next = collapse ?? !set.has(line);
        if (next) set.add(line); else set.delete(line);
        if (next && this.state.line > line && this.state.line < this.#folds.get(line)) this.state.line = line;
        this.render();
    }

    foldAll() {
        for (const [start] of this.#folds) this.state.collapsed.add(start);
        this.state.line = 0;
        this.render();
    }

    unfoldAll() {
        this.state.collapsed.clear();
        this.render();
    }

    /** Scrolls to a line (expanding folds) and optionally flashes it. */
    reveal(line, { flash = false, col = 0 } = {}) {
        for (const start of [...this.state.collapsed]) {
            if (line > start && line < this.#folds.get(start)) this.state.collapsed.delete(start);
        }
        this.state.line = line;
        this.state.col = col;
        this.render();
        this.#emitCursor();

        const el = this.linesEl.querySelector(`.line[data-line="${line}"]`);
        if (!el) return;
        const top = el.offsetTop - this.el.clientHeight / 3;
        this.el.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        if (flash) {
            el.classList.add('flash');
            setTimeout(() => el.classList.remove('flash'), 1200);
        }
    }

    /** Shows (or hides with null) the typing caret used by animations. */
    setCaret(caret) {
        const prev = this.#caret?.line;
        this.#caret = caret;
        if (prev !== undefined && prev !== caret?.line) this.renderLine(prev);
        if (caret) {
            this.state.line = caret.line;
            this.state.col = caret.col;
            this.renderLine(caret.line);
            this.#emitCursor();
        }
    }

    #setCursor(line, col) {
        const prev = this.linesEl.querySelector('.line.active');
        prev?.classList.remove('active');
        this.linesEl.querySelector(`.line[data-line="${line}"]`)?.classList.add('active');
        this.state.line = line;
        this.state.col = col;
        this.#emitCursor();
    }

    #emitCursor() {
        if (!this.#file) return;
        this.bus.emit('cursor:changed', { path: this.#file.path, line: this.state.line, col: this.state.col });
    }

    /** Enclosing symbols (namespace, class, method) for the breadcrumbs. */
    symbolsAt(line) {
        if (!this.#file || this.#file.lang !== 'csharp') return [];
        const symbols = [];
        for (const [start, end] of [...this.#folds].sort((a, b) => a[0] - b[0])) {
            if (line < start || line > end) continue;
            const text = this.#file.lines[start];
            let m;
            if ((m = /namespace\s+([\w.]+)/.exec(text))) symbols.push({ kind: 'namespace', name: m[1] });
            else if ((m = /class\s+(\w+)/.exec(text))) symbols.push({ kind: 'class', name: m[1] });
            else if ((m = /(\w+)\s*\([^)]*\)\s*\{?\s*$/.exec(text))) symbols.push({ kind: 'method', name: m[1] });
        }
        return symbols;
    }

    #columnFromPoint(lineEl, x, y) {
        const code = lineEl.querySelector('.code');
        const indent = parseInt(code.style.getPropertyValue('--ind'), 10) || 0;
        let range = null;
        if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(x, y);
            if (pos) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
            }
        } else if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(x, y);
        }
        if (!range || !code.contains(range.startContainer) || range.startContainer.parentElement?.closest('.lens')) {
            return this.#file.lines[Number(lineEl.dataset.line)].length;
        }
        const before = document.createRange();
        before.setStart(code, 0);
        before.setEnd(range.startContainer, range.startOffset);
        return indent + before.toString().length;
    }

    #problemHover(id) {
        const p = this.workspace.problems().find(x => x.id === id);
        if (!p) return '';
        const fix = p.fix
            ? `<div class="hover-actions"><button type="button" class="hover-action" data-quickfix="${escapeHtml(p.id)}">${icon('lightbulb')} Quick Fix… <kbd>${formatKeys('Ctrl+.')}</kbd></button></div>`
            : '';
        return `<div class="hover-body hover-${p.severity}">${icon(p.severity)}<div><div class="hover-msg">${escapeHtml(p.message)}</div>`
            + `<div class="hover-meta">${SEVERITY_LABEL[p.severity]} · ${escapeHtml(p.code)} · ${escapeHtml(p.path)} [Ln ${p.line + 1}, Col ${this.workspace.column(p) + 1}]</div></div></div>${fix}`;
    }

    #bindEvents() {
        this.el.addEventListener('click', e => {
            const open = e.target.closest('[data-open]');
            if (open) {
                e.preventDefault();
                this.bus.emit('editor:open', { path: open.dataset.open });
                return;
            }
            if (e.target.closest('a')) return;

            const fold = e.target.closest('[data-fold]');
            if (fold) {
                this.toggleFold(Number(fold.dataset.fold));
                return;
            }

            const qf = e.target.closest('[data-quickfix]');
            if (qf) {
                const problem = this.workspace.problems().find(p => p.id === qf.dataset.quickfix);
                if (problem) this.bus.emit('quickfix:show', { problem, anchor: qf });
                return;
            }

            const problemEl = e.target.closest('[data-problem]');
            if (problemEl && isNarrow()) this.hover.show(problemEl, this.#problemHover(problemEl.dataset.problem));

            const lineEl = e.target.closest('.line');
            if (lineEl) this.#setCursor(Number(lineEl.dataset.line), this.#columnFromPoint(lineEl, e.clientX, e.clientY));
        });

        this.el.addEventListener('mouseover', e => {
            const p = e.target.closest('[data-problem]');
            if (p) this.hover.show(p, this.#problemHover(p.dataset.problem));
        });
        this.el.addEventListener('mouseout', e => {
            if (e.target.closest('[data-problem]')) this.hover.hideSoon();
        });

        this.hover.el.addEventListener('click', e => {
            const btn = e.target.closest('[data-quickfix]');
            if (!btn) return;
            const problem = this.workspace.problems().find(p => p.id === btn.dataset.quickfix);
            this.hover.hide();
            if (problem) this.bus.emit('quickfix:show', { problem, anchor: btn });
        });

        // Keyboard navigation inside the editor
        this.el.addEventListener('keydown', e => {
            if (!this.#file || e.ctrlKey || e.metaKey || e.altKey) return;
            const visible = this.visibleLines().map(l => l.i);
            const at = visible.indexOf(this.state.line);
            let next = null;
            if (e.key === 'ArrowDown') next = visible[Math.min(visible.length - 1, at + 1)];
            if (e.key === 'ArrowUp') next = visible[Math.max(0, at - 1)];
            if (e.key === 'Home' && e.ctrlKey) next = visible[0];
            if (next === null || next === undefined) return;
            e.preventDefault();
            this.#setCursor(next, Math.min(this.state.col, this.#file.lines[next].length));
            this.linesEl.querySelector(`.line[data-line="${next}"]`)?.scrollIntoView({ block: 'nearest' });
        });
    }
}
