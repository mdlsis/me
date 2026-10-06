/*
    SideBar.js
    Activity bar + side bar views (Explorer and Extensions = my stack).
*/

import { escapeHtml, isNarrow } from '../core/util.js';
import { icon, fileIcon } from './icons.js';

const ACTIVITIES = [
    { id: 'explorer', icon: 'files', label: 'Explorer', keys: 'Ctrl+Shift+E', view: true },
    { id: 'search', icon: 'search', label: 'Search (Go to File)', command: 'workbench.action.quickOpen' },
    { id: 'run', icon: 'play', label: 'Run Program', command: 'run.start', pulse: true },
    { id: 'fix', icon: 'bug', label: 'Fix Problems', command: 'editor.fixAll', pulse: true },
    { id: 'extensions', icon: 'extensions', label: 'Extensions (My Stack)', view: true },
];

export class SideBar {
    #view = 'explorer';
    #folders = new Set(['projects']);

    constructor({ activityEl, sidebarEl, backdropEl, bus, app }) {
        this.activityEl = activityEl;
        this.el = sidebarEl;
        this.backdrop = backdropEl;
        this.bus = bus;
        this.app = app;
        this.workbench = sidebarEl.parentElement;

        this.#renderActivity();
        this.render();

        activityEl.addEventListener('click', e => this.#onActivity(e));
        sidebarEl.addEventListener('click', e => this.#onSidebar(e));
        backdropEl.addEventListener('click', () => this.close());

        bus.on('editor:active', () => this.render());
        bus.on('problems:changed', () => this.render());
        bus.on('fix:done', () => this.#pulse('fix', false));
        bus.on('problems:changed', () => this.#pulse('fix', this.app.workspace.fixable().length > 0));
        bus.on('program:ran', () => this.#pulse('run', false));
        bus.on('demo:reset', () => this.#pulse('run', true));

        if (isNarrow()) this.close();
    }

    get isOpen() {
        return !this.workbench.classList.contains('sidebar-closed');
    }

    open(view = this.#view) {
        this.#view = view;
        this.workbench.classList.remove('sidebar-closed');
        this.render();
        this.#renderActivity();
    }

    close() {
        this.workbench.classList.add('sidebar-closed');
        this.#renderActivity();
    }

    toggle(view = this.#view) {
        if (this.isOpen && this.#view === view) this.close();
        else this.open(view);
    }

    #pulse(id, on) {
        this.activityEl.querySelector(`[data-activity="${id}"]`)?.classList.toggle('pulse', on);
    }

    #renderActivity() {
        const top = ACTIVITIES.map(a => {
            const active = a.view && this.isOpen && this.#view === a.id;
            return `<button type="button" class="activity ${active ? 'active' : ''} ${a.pulse ? 'pulse' : ''}" data-activity="${a.id}" aria-label="${a.label}" title="${a.label}" ${a.view ? `aria-pressed="${active}"` : ''}>${icon(a.icon)}</button>`;
        });
        const pulses = new Set([...this.activityEl.querySelectorAll('.activity.pulse')].map(b => b.dataset.activity));
        const first = !this.activityEl.children.length;

        this.activityEl.innerHTML = `<div class="activity-top">${top.join('')}</div>
            <div class="activity-bottom">
                <button type="button" class="activity" data-activity="account" aria-label="Contact" title="Contact">${icon('account')}</button>
                <button type="button" class="activity" data-activity="settings" aria-label="Settings" title="Settings">${icon('gear')}</button>
            </div>`;

        if (!first) {
            this.activityEl.querySelectorAll('.activity').forEach(b => b.classList.toggle('pulse', pulses.has(b.dataset.activity)));
        }
    }

    render() {
        this.el.innerHTML = this.#view === 'extensions' ? this.#extensionsHtml() : this.#explorerHtml();
    }

    #explorerHtml() {
        const ws = this.app.workspace;
        const active = this.app.editor?.active;
        const files = ws.files();

        const fileRow = (f, depth) => {
            const problems = ws.problems(f.path).filter(p => p.severity !== 'info');
            const sev = problems.some(p => p.severity === 'error') ? 'error' : problems.length ? 'warning' : '';
            return `<button type="button" class="tree-row ${f.path === active ? 'active' : ''} ${sev ? `tree-${sev}` : ''}" role="treeitem" data-file="${escapeHtml(f.path)}" style="--depth:${depth}">`
                + `<span class="tree-twistie"></span>${fileIcon(f.lang)}<span class="tree-label">${escapeHtml(f.name)}</span>`
                + `${problems.length ? `<span class="tree-badge">${problems.length}</span>` : ''}</button>`;
        };

        const folders = [...new Set(files.filter(f => f.folder).map(f => f.folder))].sort();
        let tree = '';
        for (const folder of folders) {
            const open = this.#folders.has(folder);
            tree += `<button type="button" class="tree-row tree-folder" role="treeitem" aria-expanded="${open}" data-folder="${escapeHtml(folder)}" style="--depth:1">`
                + `<span class="tree-twistie">${icon(open ? 'chevronDown' : 'chevronRight')}</span><span class="tree-label">${escapeHtml(folder)}</span></button>`;
            if (open) tree += files.filter(f => f.folder === folder).map(f => fileRow(f, 2)).join('');
        }
        tree += files.filter(f => !f.folder).sort((a, b) => a.name.localeCompare(b.name)).map(f => fileRow(f, 1)).join('');

        const editors = this.app.editor?.tabs ?? [];
        const openEditors = editors.map(p => {
            const f = ws.file(p);
            return `<button type="button" class="tree-row ${p === active ? 'active' : ''}" data-file="${escapeHtml(p)}" style="--depth:1">`
                + `<span class="tree-twistie"></span>${fileIcon(f.lang)}<span class="tree-label">${escapeHtml(f.name)}</span>`
                + `<span class="tree-desc">${escapeHtml(f.folder)}</span></button>`;
        }).join('');

        return `<div class="sidebar-title">Explorer${this.#closeBtn()}</div>
            <div class="sidebar-section">
                <div class="section-header">${icon('chevronDown')}Open Editors</div>
                <div class="tree" role="tree">${openEditors || '<p class="tree-empty">No open editors</p>'}</div>
            </div>
            <div class="sidebar-section grow">
                <div class="section-header">${icon('chevronDown')}Me</div>
                <div class="tree" role="tree" aria-label="Files">
                    ${tree}
                </div>
            </div>
            <div class="sidebar-section">
                <div class="section-header">${icon('chevronDown')}Links</div>
                <div class="tree">
                    ${this.#linkRow('mail', 'Email', `mailto:${this.app.emailAddress()}`)}
                    ${this.#linkRow('globe', 'mdlsis.com.ar', this.app.profile.website)}
                    ${this.#linkRow('linkedin', 'LinkedIn', this.app.profile.linkedin)}
                    ${this.#linkRow('github', 'GitHub', this.app.profile.github)}
                </div>
            </div>`;
    }

    #linkRow(ico, label, href) {
        const ext = href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
        return `<a class="tree-row" href="${escapeHtml(href)}"${ext} style="--depth:1"><span class="tree-twistie"></span>${icon(ico, 'tree-ico')}<span class="tree-label">${escapeHtml(label)}</span></a>`;
    }

    #closeBtn() {
        return `<button type="button" class="icon-btn sidebar-close" data-close-sidebar aria-label="Close side bar">${icon('close')}</button>`;
    }

    #extensionsHtml() {
        const skills = this.app.profile.skills;
        const rows = skills.map(s => `
            <button type="button" class="ext-row" data-file="skills.json">
                <span class="ext-logo" style="--c:${s.color}">${escapeHtml(s.abbr || s.name.slice(0, 2))}</span>
                <span class="ext-info">
                    <span class="ext-name">${escapeHtml(s.name)}</span>
                    <span class="ext-detail">${escapeHtml(s.detail)}</span>
                    <span class="ext-publisher">${icon('check', 'ext-verified')}mdlsis</span>
                </span>
                <span class="ext-installed">Installed</span>
            </button>`).join('');

        const projects = this.app.profile.projects.map(p => `
            <button type="button" class="ext-row" data-file="${escapeHtml(p.file)}">
                <span class="ext-logo ext-logo-project">${escapeHtml(p.name.slice(0, 1))}</span>
                <span class="ext-info">
                    <span class="ext-name">${escapeHtml(p.name)}</span>
                    <span class="ext-detail">${escapeHtml(p.taglineEn)}</span>
                    <span class="ext-publisher">${escapeHtml(p.url.replace(/^https?:\/\//, ''))}</span>
                </span>
            </button>`).join('');

        return `<div class="sidebar-title">Extensions${this.#closeBtn()}</div>
            <div class="sidebar-section grow scroll">
                <div class="section-header">${icon('chevronDown')}Installed <span class="section-count">${skills.length}</span></div>
                ${rows}
                <div class="section-header">${icon('chevronDown')}Built by me <span class="section-count">${this.app.profile.projects.length}</span></div>
                ${projects}
            </div>`;
    }

    #onActivity(e) {
        const btn = e.target.closest('[data-activity]');
        if (!btn) return;
        const id = btn.dataset.activity;
        const a = ACTIVITIES.find(x => x.id === id);

        if (a?.view) {
            this.toggle(id);
            return;
        }
        if (a?.command) {
            if (isNarrow()) this.close();
            this.app.commands.execute(a.command);
            return;
        }
        if (id === 'account') {
            this.app.menu.show(btn, [
                { header: this.app.profile.name },
                { label: 'Send Email', icon: 'mail', run: () => this.app.commands.execute('contact.email') },
                { label: 'Copy Email Address', icon: 'copy', run: () => this.app.commands.execute('contact.copyEmail') },
                { label: 'Website', icon: 'globe', run: () => this.app.commands.execute('contact.website') },
                { label: 'LinkedIn', icon: 'linkedin', run: () => this.app.commands.execute('contact.linkedin') },
                { label: 'GitHub', icon: 'github', run: () => this.app.commands.execute('contact.github') },
            ], { placement: 'above' });
        }
        if (id === 'settings') {
            this.app.menu.show(btn, [
                { label: 'Command Palette…', keys: this.app.commands.keys('workbench.action.showCommands'), run: () => this.app.commands.execute('workbench.action.showCommands') },
                { label: 'Color Theme', icon: 'color', run: () => this.app.commands.execute('theme.pick') },
                { label: 'Keyboard Shortcuts', icon: 'keyboard', run: () => this.app.commands.execute('help.shortcuts') },
                { separator: true },
                { label: 'Reset Demo', icon: 'restart', run: () => this.app.commands.execute('demo.reset') },
            ], { placement: 'above' });
        }
    }

    #onSidebar(e) {
        if (e.target.closest('[data-close-sidebar]')) {
            this.close();
            return;
        }
        const folder = e.target.closest('[data-folder]');
        if (folder) {
            const name = folder.dataset.folder;
            if (this.#folders.has(name)) this.#folders.delete(name);
            else this.#folders.add(name);
            this.render();
            return;
        }
        const file = e.target.closest('[data-file]');
        if (file) {
            this.app.editor.open(file.dataset.file);
            if (isNarrow()) this.close();
        }
    }
}
