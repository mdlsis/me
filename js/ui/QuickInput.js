/*
    QuickInput.js
    Command palette / quick open widget.
      ">"  commands
      ":"  go to line
      ""   files
    Also used as a generic picker (color themes, quick fixes).
*/

import { escapeHtml, fuzzyMatch, highlightMatches, formatKeys } from '../core/util.js';
import { icon, fileIcon } from './icons.js';

export class QuickInput {
    #items = [];
    #filtered = [];
    #index = 0;
    #options = null;
    #lastFocus = null;

    constructor({ el, bus, app }) {
        this.el = el;
        this.bus = bus;
        this.app = app;

        el.innerHTML = `
            <div class="qi-backdrop"></div>
            <div class="qi-box" role="dialog" aria-label="Quick input">
                <input class="qi-input" type="text" spellcheck="false" autocomplete="off" role="combobox"
                    aria-expanded="true" aria-controls="qi-list" aria-autocomplete="list">
                <div class="qi-list" id="qi-list" role="listbox"></div>
            </div>`;

        this.input = el.querySelector('.qi-input');
        this.list = el.querySelector('.qi-list');

        this.input.addEventListener('input', () => this.#update());
        this.input.addEventListener('keydown', e => this.#onKey(e));
        el.querySelector('.qi-backdrop').addEventListener('pointerdown', () => this.hide(true));
        this.list.addEventListener('pointermove', e => {
            const row = e.target.closest('[data-index]');
            if (row && Number(row.dataset.index) !== this.#index) this.#select(Number(row.dataset.index), false);
        });
        this.list.addEventListener('click', e => {
            const row = e.target.closest('[data-index]');
            if (row) this.#accept(Number(row.dataset.index));
        });
    }

    get isOpen() {
        return !this.el.hidden;
    }

    /** Opens the palette in the mode given by the prefix. */
    open(value = '') {
        this.#show({ value, dynamic: true });
    }

    /**
     * Generic picker.
     * @param {{ placeholder: string, items: Array, onAccept: Function, onActive?: Function, onCancel?: Function, activeIndex?: number }} options
     */
    pick(options) {
        this.#show({ ...options, dynamic: false, value: '' });
    }

    #show(options) {
        this.#lastFocus = document.activeElement;
        this.#options = options;
        this.el.hidden = false;

        // Drop down from the command center, like VS Code
        const anchor = document.querySelector('.command-center')?.getBoundingClientRect();
        this.el.querySelector('.qi-box').style.top = `${Math.max(8, anchor ? anchor.top : 8)}px`;

        this.input.value = options.value || '';
        this.input.placeholder = options.placeholder || '';
        this.#update(options.activeIndex ?? 0);
        this.input.focus();
        const len = this.input.value.length;
        this.input.setSelectionRange(len, len);
    }

    hide(cancelled = false) {
        if (this.el.hidden) return;
        this.el.hidden = true;
        if (cancelled) this.#options?.onCancel?.();
        this.#options = null;
        this.#lastFocus?.focus?.({ preventScroll: true });
    }

    #modeItems(value) {
        const app = this.app;

        if (value.startsWith('>')) {
            this.input.placeholder = 'Type the name of a command to run.';
            return {
                query: value.slice(1).trim(),
                items: app.commands.list().map(c => ({
                    label: app.commands.label(c.id),
                    keys: app.commands.keys(c.id),
                    run: () => app.commands.execute(c.id),
                })),
            };
        }

        if (value.startsWith(':')) {
            const path = app.editor.active;
            const file = path && app.workspace.file(path);
            const n = parseInt(value.slice(1), 10);
            this.input.placeholder = '';
            if (!file) return { query: '', items: [{ label: 'Open a text editor first to go to a line.', disabled: true }] };
            const total = file.lines.length;
            const valid = n >= 1 && n <= total;
            return {
                query: '',
                items: [{
                    label: valid ? `Go to line ${n}.` : `Current line: ${app.editor.view.state.line + 1}. Type a line number between 1 and ${total} to navigate to.`,
                    disabled: !valid,
                    run: () => app.editor.view.reveal(n - 1, { flash: true }),
                }],
            };
        }

        this.input.placeholder = 'Search files by name (append : to go to line or type > for commands)';
        return {
            query: value.trim(),
            items: app.workspace.files().map(f => ({
                label: f.name,
                description: f.folder,
                icon: fileIcon(f.lang),
                matchOn: f.path,
                run: () => app.editor.open(f.path),
            })),
        };
    }

    #update(activeIndex = 0) {
        const value = this.input.value;
        let query;
        if (this.#options.dynamic) {
            ({ query, items: this.#items } = this.#modeItems(value));
        } else {
            query = value.trim();
            this.#items = this.#options.items;
        }

        this.#filtered = this.#items
            .map(item => ({ item, matches: query ? fuzzyMatch(query, item.label) : [] }))
            .filter(({ item, matches }) => matches !== null || (item.matchOn && fuzzyMatch(query, item.matchOn)));

        if (!this.#filtered.length) {
            this.list.innerHTML = '<div class="qi-empty">No matching results</div>';
            return;
        }

        this.list.innerHTML = this.#filtered.map(({ item, matches }, i) => `
            <div class="qi-row ${item.disabled ? 'disabled' : ''}" role="option" id="qi-opt-${i}" data-index="${i}">
                ${item.icon || ''}
                <span class="qi-label">${highlightMatches(item.label, matches)}</span>
                ${item.description ? `<span class="qi-desc">${escapeHtml(item.description)}</span>` : ''}
                ${item.keys ? `<kbd class="qi-keys">${escapeHtml(formatKeys(item.keys))}</kbd>` : ''}
                ${item.checked ? icon('check', 'qi-check') : ''}
            </div>`).join('');

        this.#select(Math.min(activeIndex, this.#filtered.length - 1));
    }

    #select(i, scroll = true) {
        this.#index = i;
        this.list.querySelectorAll('.qi-row').forEach((row, k) => row.classList.toggle('active', k === i));
        this.input.setAttribute('aria-activedescendant', `qi-opt-${i}`);
        const row = this.list.children[i];
        if (scroll) row?.scrollIntoView({ block: 'nearest' });
        const entry = this.#filtered[i];
        if (entry) this.#options?.onActive?.(entry.item);
    }

    #accept(i) {
        const entry = this.#filtered[i];
        if (!entry || entry.item.disabled) return;
        const options = this.#options;
        this.hide();
        if (options?.onAccept) options.onAccept(entry.item);
        else entry.item.run?.();
    }

    #onKey(e) {
        const n = this.#filtered.length;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (n) this.#select((this.#index + 1) % n);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (n) this.#select((this.#index - 1 + n) % n);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            this.#accept(this.#index);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.hide(true);
        }
    }
}
