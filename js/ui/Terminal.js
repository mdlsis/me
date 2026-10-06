/*
    Terminal.js
    Interactive fake PowerShell terminal.
*/

import { escapeHtml, linkify, sleep, prefersReducedMotion, isNarrow } from '../core/util.js';
import { THEMES } from '../core/ThemeManager.js';
import { emailAddress } from '../data/files.js';

const PROMPT = 'PS C:\\Projects\\me>';

export class Terminal {
    #history = [];
    #historyAt = 0;
    #busy = false;
    #waitingForEnter = false;
    #commands = {};

    constructor({ el, bus, app }) {
        this.el = el;
        this.bus = bus;
        this.app = app;

        el.innerHTML = `
            <div class="term-scroll">
                <div class="term-output" role="log" aria-live="polite"></div>
                <form class="term-input-row" autocomplete="off">
                    <span class="term-prompt">${escapeHtml(PROMPT)}</span>
                    <input class="term-input" type="text" spellcheck="false" autocapitalize="off" autocorrect="off"
                        aria-label="Terminal input" enterkeyhint="send">
                </form>
            </div>`;

        this.scrollEl = el.querySelector('.term-scroll');
        this.outputEl = el.querySelector('.term-output');
        this.form = el.querySelector('form');
        this.input = el.querySelector('.term-input');
        this.promptEl = el.querySelector('.term-prompt');

        this.#registerCommands();
        this.#bindEvents();
        bus.on('terminal:clear', () => this.clear());
        this.welcome();
    }

    welcome() {
        this.print(`<span class="t-dim">PowerShell 7 · MDL.ContactMe</span>`);
        this.print('Welcome! This terminal is interactive. Type <span class="t-cmd">help</span> or try:');
        this.print(this.#chips(['dotnet run', 'fix', 'contact', 'projects', 'skills']));
        this.print('');
    }

    #chips(commands) {
        return `<span class="term-chips">${commands.map(c =>
            `<button type="button" class="term-chip" data-run="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</span>`;
    }

    focus() {
        // Avoid popping the on-screen keyboard on touch devices
        if (!isNarrow()) this.input.focus({ preventScroll: true });
    }

    print(html = '', cls = '') {
        this.outputEl.insertAdjacentHTML('beforeend', `<div class="term-line ${cls}">${html || '&nbsp;'}</div>`);
        this.#scroll();
    }

    printText(text = '', cls = '') {
        this.print(linkify(text), cls);
    }

    /** Prints lines one by one, like a program writing to stdout. */
    async lines(list, delay = 60) {
        for (const item of list) {
            const [text, cls] = Array.isArray(item) ? item : [item, ''];
            this.printText(text, cls);
            if (delay) await sleep(delay);
        }
    }

    clear() {
        this.outputEl.innerHTML = '';
    }

    #scroll() {
        this.scrollEl.scrollTop = this.scrollEl.scrollHeight;
    }

    /** Types a command into the prompt and runs it (used by buttons). */
    async type(command) {
        if (this.#busy) return;
        this.#busy = true;
        this.input.value = '';
        if (!prefersReducedMotion()) {
            for (const ch of command) {
                this.input.value += ch;
                await sleep(35 + Math.random() * 45);
            }
            await sleep(150);
        }
        this.#busy = false;
        await this.execute(command);
    }

    async execute(line) {
        if (this.#busy) return;
        this.input.value = '';

        if (this.#waitingForEnter) {
            this.#waitingForEnter = false;
            this.print(escapeHtml(line));
            this.printText('Process exited with code 0.', 't-dim');
            this.print('');
            this.#setPrompt(PROMPT);
            return;
        }

        this.print(`<span class="t-prompt">${escapeHtml(PROMPT)}</span> <span class="t-cmd">${escapeHtml(line)}</span>`);
        const trimmed = line.trim();
        if (!trimmed) return;

        this.#history.push(trimmed);
        this.#historyAt = this.#history.length;

        const [name, ...args] = trimmed.split(/\s+/);
        const key = name.toLowerCase();
        const sub = args[0]?.toLowerCase();
        const command = this.#commands[`${key} ${sub}`] || this.#commands[key];

        this.#busy = true;
        this.el.classList.add('busy');
        try {
            if (command) await command.run(this.#commands[`${key} ${sub}`] ? args.slice(1) : args);
            else this.#notFound(name);
        } finally {
            this.#busy = false;
            this.el.classList.remove('busy');
            this.#scroll();
        }
    }

    #notFound(name) {
        this.printText(`${name}: The term '${name}' is not recognized as a name of a cmdlet, function, script file, or executable program.`, 't-error');
        this.print(`Type <span class="t-cmd">help</span> to see the available commands.`);
    }

    #setPrompt(text) {
        this.promptEl.textContent = text;
    }

    /** Waits for the user to press Enter (Console.ReadLine). */
    waitForEnter() {
        this.#waitingForEnter = true;
        this.#setPrompt('');
        this.focus();
    }

    #registerCommands() {
        const app = this.app;
        const profile = app.profile;

        const add = (names, desc, run, hidden = false) => {
            [].concat(names).forEach((n, i) => { this.#commands[n] = { desc, run, hidden: hidden || i > 0, name: n }; });
        };

        add('help', 'Show this help', async () => {
            const visible = Object.values(this.#commands).filter(c => !c.hidden);
            const width = Math.max(...visible.map(c => c.name.length)) + 2;
            this.printText('Available commands:', 't-bold');
            await this.lines(visible.map(c => `  ${c.name.padEnd(width)}${c.desc}`), 15);
            this.printText('Shortcuts: Ctrl+Shift+P command palette · Ctrl+P go to file · Ctrl+. quick fix · Ctrl+F5 run', 't-dim');
        });

        add('whoami', 'Who is behind this page', async () => {
            await this.lines([[`${profile.name}`, 't-accent'], profile.role]);
        });

        add('contact', 'Show my contact information', async () => {
            await this.lines([
                ['Contact', 't-bold'],
                `  Email     ${emailAddress()}`,
                `  Web       ${profile.website}`,
                `  LinkedIn  ${profile.linkedin}`,
                `  GitHub    ${profile.github}`,
            ]);
        });

        add('projects', 'List my projects', async () => {
            this.printText('Projects', 't-bold');
            for (const p of profile.projects) {
                await this.lines([[`  ${p.name}`, 't-accent'], `    ${p.tagline}  (${p.taglineEn})`, `    ${p.summary}`, `    ${p.url}`], 40);
            }
            this.print(`  <span class="t-dim">Open the details:</span> ${this.#chips(profile.projects.map(p => `code ${p.file}`))}`);
        });

        add('skills', 'Show my stack', async () => {
            this.printText('Stack', 't-bold');
            await this.lines(profile.skills.map(s => `  ✔ ${s.name.padEnd(12)}${s.detail}`), 40);
            this.print(`  <span class="t-dim">See also:</span> ${this.#chips(['code skills.json'])}`);
        });

        add(['ls', 'dir', 'gci'], 'List files', async () => {
            const files = app.workspace.files();
            await this.lines(files.map(f => `  ${f.path}`), 20);
        });

        add(['cat', 'type', 'gc'], 'Print a file: cat <file>', async ([name]) => {
            const file = name && app.workspace.findFile(name);
            if (!file) {
                this.printText(`cat: Cannot find path '${name ?? ''}' because it does not exist.`, 't-error');
                return;
            }
            await this.lines(file.lines, 0);
        });

        add(['code', 'open'], 'Open a file in the editor: code <file>', async ([name]) => {
            if (!name) {
                this.printText('Usage: code <file>   e.g. code README.md', 't-dim');
                return;
            }
            if (!app.editor.open(name)) this.printText(`code: file '${name}' not found.`, 't-error');
            else if (isNarrow()) app.panel.close();
        });

        add('dotnet build', 'Build the program', async () => { await app.build.build(this); });
        add('dotnet run', 'Build and run the program', async () => { await app.build.run(this); });
        add(['fix', 'dotnet format'], 'Apply all quick fixes', async () => { await app.build.fixAll(this); });
        add('dotnet', 'dotnet build | run | format', async ([sub]) => {
            this.printText(sub ? `Unknown command: dotnet ${sub}` : 'Usage: dotnet [build | run | format]', sub ? 't-error' : 't-dim');
        }, true);

        add('reset', 'Restore the original bugs and play again', async () => {
            app.build.reset();
            this.printText('Workspace restored. The bugs are back. 🐞', 't-warning');
        });

        add('theme', 'Change the color theme: theme <name>', async ([name]) => {
            if (!name) {
                this.printText(`Themes: ${THEMES.map(t => t.id).join(', ')}  (current: ${app.theme.current})`);
                return;
            }
            const ok = app.theme.apply(name.toLowerCase());
            this.printText(ok ? `Theme set to ${app.theme.label()}.` : `Unknown theme '${name}'.`, ok ? '' : 't-error');
        });

        add(['clear', 'cls'], 'Clear the terminal', async () => this.clear());

        add('history', 'Show command history', async () => {
            await this.lines(this.#history.map((h, i) => `  ${String(i + 1).padStart(3)}  ${h}`), 0);
        });

        add('date', 'Show the current date', async () => this.printText(new Date().toString()));

        add('echo', 'Print text', async args => this.printText(args.join(' ')));

        add('sudo', 'Try it', async () => this.printText('Nice try. This is a portfolio, not a server. 😄', 't-warning'), true);

        add('exit', 'Close the terminal', async () => app.panel.close());
    }

    #complete() {
        const value = this.input.value;
        const parts = value.split(/\s+/);
        let candidates;
        if (parts.length <= 1) {
            candidates = Object.keys(this.#commands).filter(c => c.startsWith(value.toLowerCase()));
        } else {
            const last = parts.pop().toLowerCase();
            candidates = this.app.workspace.files().map(f => f.path).filter(f => f.toLowerCase().startsWith(last)).map(f => [...parts, f].join(' '));
        }
        if (candidates.length === 1) {
            this.input.value = candidates[0] + (parts.length ? '' : ' ');
        } else if (candidates.length > 1) {
            this.print(`<span class="t-dim">${candidates.map(escapeHtml).join('   ')}</span>`);
        }
    }

    #bindEvents() {
        this.form.addEventListener('submit', e => {
            e.preventDefault();
            this.execute(this.input.value);
        });

        this.input.addEventListener('keydown', e => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const dir = e.key === 'ArrowUp' ? -1 : 1;
                this.#historyAt = Math.max(0, Math.min(this.#history.length, this.#historyAt + dir));
                this.input.value = this.#history[this.#historyAt] ?? '';
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.#complete();
            } else if (e.key === 'l' && e.ctrlKey) {
                e.preventDefault();
                this.clear();
            }
        });

        this.el.addEventListener('click', e => {
            const chip = e.target.closest('[data-run]');
            if (chip) {
                this.type(chip.dataset.run);
                return;
            }
            if (!e.target.closest('a') && !window.getSelection().toString()) this.input.focus({ preventScroll: true });
        });
    }
}
