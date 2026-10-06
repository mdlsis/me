/*
    Notifications.js
    VS Code style toasts in the bottom right corner.
*/

import { escapeHtml } from '../core/util.js';
import { icon } from './icons.js';

export class Notifications {
    #history = [];
    #id = 0;

    constructor({ el, bus, commands }) {
        this.el = el;
        this.bus = bus;
        this.commands = commands;

        bus.on('notify', n => this.show(n));

        el.addEventListener('click', e => {
            const toast = e.target.closest('.toast');
            if (!toast) return;
            const action = e.target.closest('[data-action]');
            if (e.target.closest('.toast-close') || action) this.dismiss(toast);
            if (action) {
                const n = this.#history.find(x => x.id === Number(toast.dataset.id));
                const a = n?.actions?.[Number(action.dataset.action)];
                if (a?.command) commands.execute(a.command);
                a?.run?.();
            }
        });
    }

    /**
     * @param {{ severity?: 'info'|'warning'|'error', message: string, actions?: Array<{label: string, command?: string, run?: Function, primary?: boolean}>, timeout?: number }} n
     */
    show(n) {
        const id = ++this.#id;
        const entry = { id, severity: 'info', ...n };
        this.#history.push(entry);

        // Keep at most 3 toasts on screen
        const toasts = this.el.querySelectorAll('.toast');
        if (toasts.length >= 3) this.dismiss(toasts[0]);

        const actions = (entry.actions || []).map((a, i) =>
            `<button type="button" class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'}" data-action="${i}">${escapeHtml(a.label)}</button>`).join('');

        this.el.insertAdjacentHTML('beforeend', `
            <div class="toast toast-${entry.severity}" data-id="${id}" role="status">
                <div class="toast-main">
                    ${icon(entry.severity, `sev-${entry.severity}`)}
                    <div class="toast-msg">${escapeHtml(entry.message)}</div>
                    <button type="button" class="icon-btn toast-close" aria-label="Clear notification">${icon('close')}</button>
                </div>
                ${actions ? `<div class="toast-actions">${actions}</div>` : ''}
            </div>`);

        if (entry.timeout) {
            const el = this.el.querySelector(`.toast[data-id="${id}"]`);
            setTimeout(() => this.dismiss(el), entry.timeout);
        }
        this.#count();
        return id;
    }

    dismiss(toast) {
        if (!toast?.isConnected) return;
        toast.classList.add('leaving');
        setTimeout(() => {
            toast.remove();
            this.#count();
        }, 200);
    }

    clearAll() {
        this.el.querySelectorAll('.toast').forEach(t => this.dismiss(t));
    }

    /** Toggles the last notification back on screen (status bar bell). */
    toggle() {
        const open = this.el.querySelectorAll('.toast');
        if (open.length) {
            this.clearAll();
            return;
        }
        const last = this.#history[this.#history.length - 1];
        if (last) this.show({ ...last, timeout: 0 });
        else this.show({ message: 'No new notifications.', timeout: 2500 });
    }

    #count() {
        this.bus.emit('notifications:count', { count: this.el.querySelectorAll('.toast:not(.leaving)').length });
    }
}
