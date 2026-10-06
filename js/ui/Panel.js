/*
    Panel.js
    Bottom panel with the Problems, Output and Terminal views.
*/

import { escapeHtml } from '../core/util.js';
import { icon, fileIcon } from './icons.js';

export class Panel {
    #view = 'terminal';
    #height = null;

    constructor({ el, bus, workspace }) {
        this.el = el;
        this.bus = bus;
        this.workspace = workspace;
        this.main = el.parentElement;

        this.tabs = el.querySelectorAll('.panel-tab');
        this.badge = el.querySelector('.panel-badge');
        this.problemsEl = el.querySelector('.problems-view');
        this.outputEl = el.querySelector('.output-view');
        this.clearBtn = el.querySelector('.panel-clear');

        this.tabs.forEach(t => t.addEventListener('click', () => this.show(t.dataset.view)));
        el.querySelector('.panel-close').addEventListener('click', () => this.close());
        el.querySelector('.panel-max').addEventListener('click', () => this.toggleMaximize());
        this.clearBtn.addEventListener('click', () => bus.emit('terminal:clear'));

        this.problemsEl.addEventListener('click', e => {
            const row = e.target.closest('[data-problem]');
            if (!row) return;
            const p = this.workspace.problems().find(x => x.id === row.dataset.problem);
            if (p) bus.emit('problem:reveal', { problem: p });
        });

        bus.on('problems:changed', () => this.#renderProblems());
        this.#bindSash();
        this.#renderProblems();
    }

    get isOpen() {
        return this.main.classList.contains('panel-open');
    }

    get view() {
        return this.#view;
    }

    show(view = this.#view) {
        this.#view = view;
        this.main.classList.add('panel-open');
        this.tabs.forEach(t => {
            const on = t.dataset.view === view;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', on);
        });
        this.el.querySelectorAll('.panel-view').forEach(v => { v.hidden = v.dataset.view !== view; });
        this.clearBtn.hidden = view !== 'terminal';
        this.bus.emit('panel:shown', { view });
    }

    close() {
        this.main.classList.remove('panel-open', 'panel-max');
        this.bus.emit('panel:closed');
    }

    toggle(view) {
        if (this.isOpen && this.#view === view) this.close();
        else this.show(view);
    }

    toggleMaximize() {
        const max = this.main.classList.toggle('panel-max');
        const btn = this.el.querySelector('.panel-max');
        btn.innerHTML = icon(max ? 'chevronDown' : 'chevronUp');
        btn.setAttribute('aria-label', max ? 'Restore panel size' : 'Maximize panel');
    }

    /** Appends a line to the Output view. */
    output(text, cls = '') {
        this.outputEl.insertAdjacentHTML('beforeend', `<div class="out-line ${cls}">${escapeHtml(text)}</div>`);
        this.outputEl.scrollTop = this.outputEl.scrollHeight;
    }

    #renderProblems() {
        const list = this.workspace.problems();
        const relevant = list.filter(p => p.severity !== 'info').length;
        this.badge.hidden = !relevant;
        this.badge.textContent = relevant;

        if (!list.length) {
            this.problemsEl.innerHTML = `<p class="problems-empty">${this.workspace.diagnosticsVisible
                ? 'No problems have been detected in the workspace.'
                : 'Build the project to see problems.'}</p>`;
            return;
        }

        const byFile = Map.groupBy ? Map.groupBy(list, p => p.path) : list.reduce((m, p) => m.set(p.path, [...(m.get(p.path) || []), p]), new Map());
        let html = '';
        for (const [path, problems] of byFile) {
            const file = this.workspace.file(path);
            html += `<div class="problems-file">${icon('chevronDown')}${fileIcon(file.lang)}<span>${escapeHtml(file.name)}</span><span class="problems-folder">${escapeHtml(file.folder)}</span><span class="badge-count">${problems.length}</span></div>`;
            html += problems.map(p => `<button type="button" class="problem-row" data-problem="${escapeHtml(p.id)}">`
                + `${icon(p.severity, `sev-${p.severity}`)}<span class="problem-msg">${escapeHtml(p.message)}</span>`
                + `<span class="problem-meta">${escapeHtml(p.code)} [Ln ${p.line + 1}, Col ${this.workspace.column(p) + 1}]</span></button>`).join('');
        }
        this.problemsEl.innerHTML = html;
    }

    #bindSash() {
        const sash = this.el.querySelector('.panel-sash');
        let startY = 0;
        let startH = 0;

        const move = e => {
            const h = Math.min(this.main.clientHeight - 80, Math.max(90, startH + (startY - e.clientY)));
            this.#height = h;
            this.main.style.setProperty('--panel-h', `${h}px`);
        };
        const up = () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.body.classList.remove('resizing');
        };

        sash.addEventListener('pointerdown', e => {
            e.preventDefault();
            startY = e.clientY;
            startH = this.el.getBoundingClientRect().height;
            document.body.classList.add('resizing');
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
        });
    }
}
