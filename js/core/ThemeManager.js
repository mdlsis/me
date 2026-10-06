/*
    ThemeManager.js
    Color themes are defined in CSS ([data-theme]); this class switches them.
*/

import { storage } from './util.js';

export const THEMES = [
    { id: 'mdl-dark', label: 'MDL Dark', description: 'default' },
    { id: 'monokai', label: 'Monokai' },
    { id: 'light', label: 'Light+' },
];

export class ThemeManager {
    constructor(bus) {
        this.bus = bus;
        const saved = storage.get('mdl.theme');
        this.current = THEMES.some(t => t.id === saved) ? saved : 'mdl-dark';
        this.apply(this.current, false);
    }

    apply(id, persist = true) {
        if (!THEMES.some(t => t.id === id)) return false;
        document.documentElement.dataset.theme = id;

        const bar = getComputedStyle(document.documentElement).getPropertyValue('--bg-bar').trim();
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar || '#111317');

        if (persist) {
            this.current = id;
            storage.set('mdl.theme', id);
        }
        this.bus.emit('theme:changed', { id });
        return true;
    }

    label(id = this.current) {
        return THEMES.find(t => t.id === id)?.label ?? id;
    }
}
