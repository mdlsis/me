/*
    CommandRegistry.js
    Central list of commands with optional keybindings, like VS Code.
*/

const KEY_CODES = {
    '`': ['Backquote', 'IntlBackslash'],
    '.': ['Period'],
    ',': ['Comma'],
};

export class CommandRegistry {
    #commands = new Map();

    constructor(bus) {
        this.bus = bus;
        document.addEventListener('keydown', e => this.#onKeyDown(e));
    }

    /**
     * @param {{ id: string, title: string, category?: string, keys?: string|string[], icon?: string, run: Function, palette?: boolean }} command
     */
    register(command) {
        this.#commands.set(command.id, { palette: true, ...command });
    }

    get(id) {
        return this.#commands.get(id);
    }

    list() {
        return [...this.#commands.values()].filter(c => c.palette);
    }

    label(id) {
        const c = this.get(id);
        if (!c) return id;
        return c.category ? `${c.category}: ${c.title}` : c.title;
    }

    /** First keybinding, for display. */
    keys(id) {
        const k = this.get(id)?.keys;
        return Array.isArray(k) ? k[0] : k || '';
    }

    execute(id, ...args) {
        const c = this.get(id);
        if (!c) return;
        this.bus.emit('command:executed', { id });
        return c.run(...args);
    }

    #matches(binding, e) {
        const parts = binding.split('+');
        const key = parts.pop();
        const want = {
            ctrl: parts.includes('Ctrl'),
            shift: parts.includes('Shift'),
            alt: parts.includes('Alt'),
        };

        if ((e.ctrlKey || e.metaKey) !== want.ctrl) return false;
        if (e.shiftKey !== want.shift) return false;
        if (e.altKey !== want.alt) return false;

        if (KEY_CODES[key]) return KEY_CODES[key].includes(e.code);
        if (/^F\d+$/.test(key)) return e.key === key;
        if (/^[A-Z]$/.test(key)) return e.code === `Key${key}`;
        if (/^\d$/.test(key)) return e.code === `Digit${key}`;
        return e.key === key;
    }

    #onKeyDown(e) {
        for (const c of this.#commands.values()) {
            if (!c.keys) continue;
            const bindings = Array.isArray(c.keys) ? c.keys : [c.keys];
            if (bindings.some(b => this.#matches(b, e))) {
                e.preventDefault();
                e.stopPropagation();
                this.execute(c.id);
                return;
            }
        }
    }
}
