/*
    Menus.js
    ContextMenu: floating menu anchored to an element.
    MenuBar: File / Edit / ... menus driven by the command registry.
*/

import { escapeHtml, formatKeys } from '../core/util.js';
import { icon } from './icons.js';

export class ContextMenu {
    #onClose = null;
    #anchor = null;

    constructor(el) {
        this.el = el;
        this.el.setAttribute('role', 'menu');

        this.el.addEventListener('click', e => {
            const row = e.target.closest('[data-index]');
            if (!row) return;
            const item = this.items[Number(row.dataset.index)];
            this.hide();
            item?.run?.();
        });
        this.el.addEventListener('keydown', e => this.#onKey(e));
        document.addEventListener('pointerdown', e => {
            if (!this.el.hidden && !this.el.contains(e.target) && !this.#anchor?.contains(e.target)) this.hide();
        });
        window.addEventListener('resize', () => this.hide());
    }

    get isOpen() {
        return !this.el.hidden;
    }

    get anchor() {
        return this.#anchor;
    }

    /**
     * @param {HTMLElement} anchor
     * @param {Array<{label?: string, keys?: string, icon?: string, run?: Function, separator?: boolean, header?: string}>} items
     */
    show(anchor, items, { onClose, focus = false, placement = 'below' } = {}) {
        this.#onClose?.();
        this.items = items;
        this.#anchor = anchor;
        this.#onClose = onClose;

        this.el.innerHTML = items.map((item, i) => {
            if (item.separator) return '<div class="cm-sep" role="separator"></div>';
            if (item.header) return `<div class="cm-header">${escapeHtml(item.header)}</div>`;
            return `<button type="button" class="cm-item" role="menuitem" data-index="${i}">`
                + `<span class="cm-icon">${item.icon ? icon(item.icon) : ''}</span>`
                + `<span class="cm-label">${escapeHtml(item.label)}</span>`
                + `<kbd class="cm-keys">${escapeHtml(formatKeys(item.keys || ''))}</kbd></button>`;
        }).join('');

        this.el.hidden = false;
        const r = anchor.getBoundingClientRect();
        const w = this.el.offsetWidth;
        const h = this.el.offsetHeight;
        let left = Math.min(r.left, window.innerWidth - w - 6);
        let top = placement === 'below' ? r.bottom + 2 : r.top - h - 2;
        if (top + h > window.innerHeight - 6) top = Math.max(6, r.top - h - 2);
        this.el.style.left = `${Math.max(6, left)}px`;
        this.el.style.top = `${Math.max(6, top)}px`;

        if (focus) this.el.querySelector('.cm-item')?.focus();
    }

    hide() {
        if (this.el.hidden) return;
        this.el.hidden = true;
        const cb = this.#onClose;
        this.#onClose = null;
        this.#anchor = null;
        cb?.();
    }

    #onKey(e) {
        const items = [...this.el.querySelectorAll('.cm-item')];
        const at = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            items[(at + 1) % items.length]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            items[(at - 1 + items.length) % items.length]?.focus();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            const anchor = this.#anchor;
            this.hide();
            anchor?.focus();
        }
    }
}

const MENUS = [
    ['File', ['workbench.action.quickOpen', '-', 'editor.close', 'editor.closeAll']],
    ['Edit', ['contact.copyEmail', '-', 'workbench.action.showCommands']],
    ['Selection', ['editor.gotoLine', 'editor.foldAll', 'editor.unfoldAll']],
    ['View', ['workbench.action.showCommands', 'theme.pick', '-', 'view.explorer', 'view.extensions', 'view.problems', 'view.terminal', '-', 'editor.wordWrap', 'editor.minimap']],
    ['Go', ['workbench.action.quickOpen', 'editor.gotoLine', 'problems.next']],
    ['Run', ['run.start', 'run.build', '-', 'editor.fixAll', 'demo.reset']],
    ['Terminal', ['view.terminal', 'terminal.clear']],
    ['Help', ['help.welcome', 'help.shortcuts', '-', 'contact.email', 'contact.linkedin', 'contact.github', '-', 'help.about']],
];

export class MenuBar {
    #openIndex = -1;

    constructor({ el, burger, menu, commands }) {
        this.el = el;
        this.menu = menu;
        this.commands = commands;

        el.innerHTML = MENUS.map(([name], i) =>
            `<button type="button" class="menubar-item" data-menu="${i}" aria-haspopup="true" aria-expanded="false">${name}</button>`).join('');

        el.addEventListener('click', e => {
            const btn = e.target.closest('[data-menu]');
            if (!btn) return;
            const i = Number(btn.dataset.menu);
            if (this.#openIndex === i) this.menu.hide();
            else this.#open(i, e.detail === 0);
        });
        el.addEventListener('pointerover', e => {
            const btn = e.target.closest('[data-menu]');
            if (btn && this.#openIndex >= 0 && Number(btn.dataset.menu) !== this.#openIndex) this.#open(Number(btn.dataset.menu));
        });
        el.addEventListener('keydown', e => {
            const btn = e.target.closest('[data-menu]');
            if (!btn) return;
            const i = Number(btn.dataset.menu);
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + MENUS.length) % MENUS.length;
                el.children[next].focus();
                if (this.#openIndex >= 0) this.#open(next, true);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.#open(i, true);
            }
        });

        burger.addEventListener('click', () => {
            if (this.menu.isOpen && this.menu.anchor === burger) {
                this.menu.hide();
                return;
            }
            // Compact menu: every command once, grouped by menu
            const seen = new Set();
            const items = [];
            MENUS.forEach(([name, ids]) => {
                const unique = ids.filter(id => id !== '-' && !seen.has(id));
                unique.forEach(id => seen.add(id));
                if (!unique.length) return;
                items.push({ header: name }, ...this.#items(unique));
            });
            this.menu.show(burger, items);
        });
    }

    #items(ids) {
        return ids.map(id => {
            if (id === '-') return { separator: true };
            const c = this.commands.get(id);
            return c && { label: c.menuTitle || c.title, keys: this.commands.keys(id), icon: c.icon, run: () => this.commands.execute(id) };
        }).filter(Boolean);
    }

    #open(i, focus = false) {
        const btn = this.el.children[i];
        this.menu.show(btn, this.#items(MENUS[i][1]), {
            focus,
            onClose: () => this.#setExpanded(-1),
        });
        this.#setExpanded(i);
    }

    #setExpanded(i) {
        this.#openIndex = i;
        [...this.el.children].forEach((b, k) => {
            b.classList.toggle('open', k === i);
            b.setAttribute('aria-expanded', k === i);
        });
    }
}
