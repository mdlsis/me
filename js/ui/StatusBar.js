/*
    StatusBar.js
*/

import { icon } from './icons.js';

const LANG_NAMES = { csharp: 'C#', json: 'JSON', markdown: 'Markdown' };

export class StatusBar {
    constructor({ el, bus, app }) {
        this.el = el;
        this.bus = bus;
        this.app = app;

        el.innerHTML = `
            <div class="sb-left">
                <button type="button" class="sb-item sb-remote" data-command="contact.email" title="Contact me">${icon('remote')}<span>mdlsis</span></button>
                <button type="button" class="sb-item sb-branch" title="main (Git branch)">${icon('branch')}<span>main*</span></button>
                <button type="button" class="sb-item sb-sync" data-command="demo.reset" title="Reset demo">${icon('sync')}</button>
                <button type="button" class="sb-item sb-problems" data-command="view.problems" title="Problems">
                    ${icon('error')}<span class="sb-errors">0</span>${icon('warning')}<span class="sb-warnings">0</span>
                </button>
                <span class="sb-item sb-progress" hidden>${icon('sync', 'spin')}<span class="sb-progress-text"></span></span>
            </div>
            <div class="sb-right">
                <button type="button" class="sb-item sb-cursor" data-command="editor.gotoLine" title="Go to Line"></button>
                <span class="sb-item sb-wide sb-indent">Spaces: 4</span>
                <span class="sb-item sb-wide">UTF-8</span>
                <span class="sb-item sb-wide">CRLF</span>
                <button type="button" class="sb-item sb-lang" data-command="workbench.action.quickOpen" title="Select Language Mode"></button>
                <button type="button" class="sb-item sb-theme sb-wide" data-command="theme.pick" title="Color Theme">${icon('color')}</button>
                <button type="button" class="sb-item sb-bell" data-command="notifications.toggle" title="Notifications" aria-label="Notifications">${icon('bell')}</button>
            </div>`;

        this.errorsEl = el.querySelector('.sb-errors');
        this.warningsEl = el.querySelector('.sb-warnings');
        this.progressEl = el.querySelector('.sb-progress');
        this.progressText = el.querySelector('.sb-progress-text');
        this.cursorEl = el.querySelector('.sb-cursor');
        this.langEl = el.querySelector('.sb-lang');
        this.bellEl = el.querySelector('.sb-bell');

        el.addEventListener('click', e => {
            const btn = e.target.closest('[data-command]');
            if (btn) app.commands.execute(btn.dataset.command);
        });

        bus.on('problems:changed', () => this.#counts());
        bus.on('build:progress', ({ value }) => this.progress(`Building ContactMe… ${value}%`));
        bus.on('build:done', () => this.progress(null));
        bus.on('fix:start', () => this.progress('Applying quick fixes…'));
        bus.on('fix:done', () => this.progress(null));
        bus.on('cursor:changed', ({ line, col }) => {
            this.cursorEl.textContent = `Ln ${line + 1}, Col ${col + 1}`;
        });
        bus.on('editor:active', ({ path }) => {
            const file = path && app.workspace.file(path);
            this.langEl.textContent = file ? LANG_NAMES[file.lang] || 'Plain Text' : '';
            this.cursorEl.hidden = !file;
            this.langEl.hidden = !file;
        });
        bus.on('notifications:count', ({ count }) => this.bellEl.classList.toggle('has-unread', count > 0));
    }

    progress(text) {
        this.progressEl.hidden = !text;
        this.progressText.textContent = text || '';
    }

    #counts() {
        const { errors, warnings } = this.app.workspace.counts();
        this.errorsEl.textContent = errors;
        this.warningsEl.textContent = warnings;
        this.el.querySelector('.sb-problems').classList.toggle('has-problems', errors + warnings > 0);
    }
}
