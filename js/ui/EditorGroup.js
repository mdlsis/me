/*
    EditorGroup.js
    Tabs, breadcrumbs, editor actions, Markdown preview and minimap
    around the EditorView.

    Events emitted:
        editor:active  { path }
*/

import { escapeHtml, formatKeys } from '../core/util.js';
import { icon, fileIcon } from './icons.js';
import { EditorView } from './EditorView.js';
import { Minimap } from './Minimap.js';
import { Markdown } from './Markdown.js';

export class EditorGroup {
    #tabs = [];
    #active = null;
    #preview = new Map();

    constructor({ root, bus, workspace, commands, hover }) {
        this.root = root;
        this.bus = bus;
        this.workspace = workspace;
        this.commands = commands;

        this.tabsEl = root.querySelector('.tabs');
        this.actionsEl = root.querySelector('.editor-actions');
        this.crumbsEl = root.querySelector('.breadcrumbs');
        this.previewEl = root.querySelector('.preview');
        this.progressEl = root.querySelector('.editor-progress');
        this.minimapEl = root.querySelector('.minimap');

        this.view = new EditorView({ el: root.querySelector('.editor'), bus, workspace, hover, commands });
        this.minimap = new Minimap(this.minimapEl, this.view.el);
        this.minimapEnabled = true;

        bus.on('editor:rendered', ({ lines, lang }) => this.minimap.setContent(lines, lang));
        bus.on('theme:changed', () => this.minimap.draw());
        bus.on('cursor:changed', () => this.#renderBreadcrumbs());
        bus.on('problems:changed', () => this.#renderTabs());
        bus.on('editor:open', ({ path }) => this.open(path));
        bus.on('file:changed', ({ path }) => {
            if (path === this.#active && this.#preview.get(path)) this.#renderPreview();
        });

        this.#bindEvents();
    }

    get active() {
        return this.#active;
    }

    get tabs() {
        return [...this.#tabs];
    }

    open(path, { preview, intro = false } = {}) {
        const file = this.workspace.findFile(path) || this.workspace.file(path);
        if (!file) return false;

        if (!this.#tabs.includes(file.path)) this.#tabs.push(file.path);
        if (preview !== undefined) this.#preview.set(file.path, preview);
        else if (!this.#preview.has(file.path)) this.#preview.set(file.path, file.lang === 'markdown');

        this.#active = file.path;
        this.view.show(file.path, { intro });
        this.#renderAll();
        this.bus.emit('editor:active', { path: file.path });
        return true;
    }

    close(path = this.#active) {
        const i = this.#tabs.indexOf(path);
        if (i < 0) return;
        this.#tabs.splice(i, 1);

        if (path === this.#active) {
            const next = this.#tabs[Math.min(i, this.#tabs.length - 1)];
            if (next) {
                this.open(next);
                return;
            }
            this.#active = null;
        }
        this.#renderAll();
        this.bus.emit('editor:active', { path: this.#active });
    }

    closeAll() {
        [...this.#tabs].forEach(p => this.close(p));
    }

    togglePreview(path = this.#active) {
        const file = this.workspace.file(path);
        if (!file || file.lang !== 'markdown') return;
        this.#preview.set(path, !this.#preview.get(path));
        this.#renderAll();
    }

    toggleMinimap() {
        this.minimapEnabled = !this.minimapEnabled;
        this.root.classList.toggle('no-minimap', !this.minimapEnabled);
        this.minimap.draw();
    }

    /** Thin progress bar under the tabs (0..100, or null to hide). */
    progress(value) {
        this.progressEl.classList.toggle('active', value !== null);
        this.progressEl.firstElementChild.style.width = `${value ?? 0}%`;
    }

    #renderAll() {
        const empty = !this.#active;
        this.root.classList.toggle('empty', empty);
        const isPreview = !!this.#preview.get(this.#active);
        this.previewEl.hidden = empty || !isPreview;
        this.view.el.hidden = empty || isPreview;
        this.minimapEl.hidden = empty || isPreview;

        if (empty) this.#renderWatermark();
        else this.root.querySelector('.watermark')?.remove();

        if (isPreview) this.#renderPreview();
        this.#renderTabs();
        this.#renderBreadcrumbs();
        this.#renderActions();
    }

    #renderWatermark() {
        if (this.root.querySelector('.watermark')) return;
        const rows = [
            ['workbench.action.showCommands', 'Show All Commands'],
            ['workbench.action.quickOpen', 'Go to File'],
            ['run.start', 'Run Program'],
            ['view.terminal', 'Toggle Terminal'],
        ];
        const html = rows.map(([id, label]) =>
            `<button type="button" class="watermark-row" data-command="${id}"><span>${label}</span><kbd>${formatKeys(this.commands.keys(id))}</kbd></button>`).join('');
        this.root.querySelector('.editor-body').insertAdjacentHTML('beforeend',
            `<div class="watermark"><div class="watermark-logo">&lt;/&gt;</div>${html}</div>`);
    }

    #renderPreview() {
        const file = this.workspace.file(this.#active);
        this.previewEl.innerHTML = `<article class="markdown-body">${Markdown.toHtml(file.lines)}</article>`;
    }

    #renderTabs() {
        this.tabsEl.innerHTML = this.#tabs.map(path => {
            const file = this.workspace.file(path);
            const problems = this.workspace.problems(path).filter(p => p.severity !== 'info');
            const sev = problems.some(p => p.severity === 'error') ? 'error' : problems.length ? 'warning' : '';
            const preview = this.#preview.get(path) ? '<span class="tab-mode">Preview</span>' : '';
            const count = problems.length ? `<span class="tab-count">${problems.length}</span>` : '';
            const active = path === this.#active;
            return `<div class="tab ${active ? 'active' : ''} ${sev ? `tab-${sev}` : ''}" role="tab" aria-selected="${active}" data-path="${escapeHtml(path)}" tabindex="0" title="${escapeHtml(path)}">`
                + `${fileIcon(file.lang)}<span class="tab-label">${escapeHtml(file.name)}</span>${preview}${count}`
                + `<button type="button" class="tab-close" data-close="${escapeHtml(path)}" aria-label="Close ${escapeHtml(file.name)}">${icon('close')}</button></div>`;
        }).join('');

        this.tabsEl.querySelector('.tab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    #renderBreadcrumbs() {
        if (!this.#active) {
            this.crumbsEl.innerHTML = '';
            return;
        }
        const file = this.workspace.file(this.#active);
        const parts = ['me', ...file.path.split('/')];
        let html = parts.map((p, i) => {
            const last = i === parts.length - 1;
            return `<span class="crumb">${last ? fileIcon(file.lang) : ''}${escapeHtml(p)}</span>`;
        }).join(icon('chevronRight', 'crumb-sep'));

        if (!this.#preview.get(this.#active)) {
            const symbols = this.view.symbolsAt(this.view.state?.line ?? 0);
            html += symbols.map(s => `${icon('chevronRight', 'crumb-sep')}<span class="crumb crumb-${s.kind}"><span class="sym sym-${s.kind}"></span>${escapeHtml(s.name)}</span>`).join('');
        }
        this.crumbsEl.innerHTML = html;
    }

    #renderActions() {
        const file = this.#active && this.workspace.file(this.#active);
        let html = '';
        if (file?.lang === 'csharp') {
            html += `<button type="button" class="icon-btn action-run" data-command="run.start" title="Run Without Debugging (${formatKeys('Ctrl+F5')})" aria-label="Run">${icon('play')}</button>`;
        }
        if (file?.lang === 'markdown') {
            const on = this.#preview.get(file.path);
            html += `<button type="button" class="icon-btn" data-command="markdown.togglePreview" title="${on ? 'Show Source' : 'Open Preview'}" aria-label="${on ? 'Show source' : 'Open preview'}" aria-pressed="${on}">${icon('preview')}</button>`;
        }
        if (file) {
            html += `<button type="button" class="icon-btn" data-command="editor.wordWrap" title="Toggle Word Wrap (${formatKeys('Alt+Z')})" aria-label="Toggle word wrap">${icon('wrap')}</button>`;
            html += `<button type="button" class="icon-btn" data-command="editor.close" title="Close Editor" aria-label="Close editor">${icon('close')}</button>`;
        }
        this.actionsEl.innerHTML = html;
    }

    #bindEvents() {
        this.tabsEl.addEventListener('click', e => {
            const close = e.target.closest('[data-close]');
            if (close) {
                e.stopPropagation();
                this.close(close.dataset.close);
                return;
            }
            const tab = e.target.closest('.tab');
            if (tab) this.open(tab.dataset.path);
        });
        this.tabsEl.addEventListener('auxclick', e => {
            const tab = e.target.closest('.tab');
            if (tab && e.button === 1) this.close(tab.dataset.path);
        });
        this.tabsEl.addEventListener('keydown', e => {
            const tab = e.target.closest('.tab');
            if (tab && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                this.open(tab.dataset.path);
            }
        });

        this.root.addEventListener('click', e => {
            const btn = e.target.closest('[data-command]');
            if (btn && this.root.contains(btn)) this.commands.execute(btn.dataset.command);
        });

        this.previewEl.addEventListener('click', e => {
            const open = e.target.closest('[data-open]');
            if (open) {
                e.preventDefault();
                this.open(open.dataset.open);
            }
        });
    }
}
