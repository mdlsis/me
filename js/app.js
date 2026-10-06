/*
    app.js
    M Daniel Lana · https://mdlsis.github.io/me/

    A small VS Code simulation written in vanilla JavaScript (ES modules,
    no frameworks, no build step). Entry point: wires the UI together and
    registers the commands.
*/

import { EventBus } from './core/EventBus.js';
import { Workspace } from './core/Workspace.js';
import { CommandRegistry } from './core/CommandRegistry.js';
import { ThemeManager, THEMES } from './core/ThemeManager.js';
import { BuildService } from './core/BuildService.js';
import { isNarrow, prefersReducedMotion, storage, sleep } from './core/util.js';
import { FILES, PROFILE, emailAddress } from './data/files.js';
import { hydrateIcons } from './ui/icons.js';
import { HoverWidget } from './ui/HoverWidget.js';
import { EditorGroup } from './ui/EditorGroup.js';
import { Panel } from './ui/Panel.js';
import { Terminal } from './ui/Terminal.js';
import { QuickInput } from './ui/QuickInput.js';
import { ContextMenu, MenuBar } from './ui/Menus.js';
import { SideBar } from './ui/SideBar.js';
import { StatusBar } from './ui/StatusBar.js';
import { Notifications } from './ui/Notifications.js';

class App {
    constructor() {
        this.profile = PROFILE;
        this.emailAddress = emailAddress;

        this.bus = new EventBus();
        this.workspace = new Workspace(this.bus, FILES);
        this.commands = new CommandRegistry(this.bus);
        this.theme = new ThemeManager(this.bus);
        this.build = new BuildService({ bus: this.bus, app: this });

        const $ = sel => document.querySelector(sel);

        this.hover = new HoverWidget($('.hover-widget'));
        this.menu = new ContextMenu($('.context-menu'));
        this.notifications = new Notifications({ el: $('.notifications'), bus: this.bus, commands: this.commands });
        this.statusBar = new StatusBar({ el: $('.statusbar'), bus: this.bus, app: this });
        this.editor = new EditorGroup({ root: $('.editor-group'), bus: this.bus, workspace: this.workspace, commands: this.commands, hover: this.hover });
        this.panel = new Panel({ el: $('.panel'), bus: this.bus, workspace: this.workspace });
        this.terminal = new Terminal({ el: $('.terminal-view'), bus: this.bus, app: this });
        this.quickInput = new QuickInput({ el: $('.quick-input'), bus: this.bus, app: this });
        this.sideBar = new SideBar({ activityEl: $('.activitybar'), sidebarEl: $('.sidebar'), backdropEl: $('.sidebar-backdrop'), bus: this.bus, app: this });
        this.menuBar = new MenuBar({ el: $('.menubar'), burger: $('.titlebar-burger'), menu: this.menu, commands: this.commands });

        this.#registerCommands();
        this.#wireEvents();
        hydrateIcons();

        this.editor.view.setWordWrap(storage.get('mdl.wordWrap', true));
        $('.command-center').addEventListener('click', () => this.commands.execute('workbench.action.quickOpen'));
    }

    async start() {
        this.editor.open('Program.cs', { intro: !prefersReducedMotion() });
        if (!isNarrow() && window.innerHeight >= 640) this.panel.show('terminal');
        this.#typeRoles();

        await sleep(500);
        const { errors, warnings } = await this.build.compile();

        this.bus.emit('notify', {
            severity: errors ? 'error' : 'warning',
            message: `Build finished with ${errors} error(s) and ${warnings} warning(s). Fix the code to run the program.`,
            actions: [
                { label: 'Quick Fix All', command: 'editor.fixAll', primary: true },
                { label: 'Show Problems', command: 'view.problems' },
            ],
        });
    }

    async runInTerminal(command) {
        this.panel.show('terminal');
        await this.terminal.type(command);
    }

    #registerCommands() {
        const c = this.commands;
        const open = url => window.open(url, '_blank', 'noopener');

        const commands = [
            // Workbench
            { id: 'workbench.action.showCommands', title: 'Show All Commands', menuTitle: 'Command Palette…', keys: ['Ctrl+Shift+P', 'F1'], run: () => this.quickInput.open('>') },
            { id: 'workbench.action.quickOpen', title: 'Go to File…', keys: 'Ctrl+P', icon: 'search', run: () => this.quickInput.open('') },
            { id: 'editor.gotoLine', title: 'Go to Line…', keys: 'Ctrl+G', run: () => this.quickInput.open(':') },
            { id: 'theme.pick', title: 'Color Theme', category: 'Preferences', icon: 'color', run: () => this.#pickTheme() },

            // View
            { id: 'view.explorer', title: 'Show Explorer', category: 'View', keys: ['Ctrl+Shift+E', 'Ctrl+B'], icon: 'files', run: () => this.sideBar.toggle('explorer') },
            { id: 'view.extensions', title: 'Show Extensions (My Stack)', category: 'View', keys: 'Ctrl+Shift+X', icon: 'extensions', run: () => this.sideBar.toggle('extensions') },
            { id: 'view.problems', title: 'Show Problems', category: 'View', keys: 'Ctrl+Shift+M', icon: 'warning', run: () => this.panel.show('problems') },
            { id: 'view.terminal', title: 'Toggle Terminal', category: 'View', keys: ['Ctrl+`', 'Ctrl+J'], icon: 'terminal', run: () => {
                this.panel.toggle('terminal');
                if (this.panel.isOpen) this.terminal.focus();
            } },
            { id: 'terminal.clear', title: 'Clear', category: 'Terminal', run: () => this.terminal.clear() },

            // Editor
            { id: 'editor.close', title: 'Close Editor', category: 'View', run: () => this.editor.close() },
            { id: 'editor.closeAll', title: 'Close All Editors', category: 'View', run: () => this.editor.closeAll() },
            { id: 'editor.wordWrap', title: 'Toggle Word Wrap', category: 'View', keys: 'Alt+Z', icon: 'wrap', run: () => {
                this.editor.view.setWordWrap(!this.editor.view.wordWrap);
                storage.set('mdl.wordWrap', this.editor.view.wordWrap);
                this.editor.minimap.draw();
            } },
            { id: 'editor.minimap', title: 'Toggle Minimap', category: 'View', run: () => this.editor.toggleMinimap() },
            { id: 'editor.foldAll', title: 'Fold All', run: () => this.editor.view.foldAll() },
            { id: 'editor.unfoldAll', title: 'Unfold All', run: () => this.editor.view.unfoldAll() },
            { id: 'markdown.togglePreview', title: 'Toggle Preview', category: 'Markdown', icon: 'preview', run: () => this.editor.togglePreview() },
            { id: 'problems.next', title: 'Go to Next Problem', keys: 'F8', run: () => this.#nextProblem() },

            // Run
            { id: 'run.start', title: 'Run Without Debugging', category: 'Run', keys: 'Ctrl+F5', icon: 'play', run: () => this.runInTerminal('dotnet run') },
            { id: 'run.build', title: 'Run Build Task', category: 'Tasks', keys: 'Ctrl+Shift+B', run: () => this.runInTerminal('dotnet build') },
            { id: 'editor.fixAll', title: 'Fix All Problems', category: 'Quick Fix', menuTitle: 'Fix All Problems', keys: 'Ctrl+.', icon: 'lightbulb', run: () => this.#fixAll() },
            { id: 'demo.reset', title: 'Reset Demo (bring the bugs back)', category: 'Developer', icon: 'restart', run: () => {
                this.build.reset();
                this.editor.open('Program.cs');
                this.bus.emit('demo:reset');
            } },

            // Contact
            { id: 'contact.email', title: 'Send Email', category: 'Contact', icon: 'mail', run: () => { location.href = `mailto:${emailAddress()}`; } },
            { id: 'contact.copyEmail', title: 'Copy Email Address', category: 'Contact', icon: 'copy', run: () => this.#copyEmail() },
            { id: 'contact.website', title: 'Open Website', category: 'Contact', icon: 'globe', run: () => open(PROFILE.website) },
            { id: 'contact.linkedin', title: 'Open LinkedIn', category: 'Contact', icon: 'linkedin', run: () => open(PROFILE.linkedin) },
            { id: 'contact.github', title: 'Open GitHub', category: 'Contact', icon: 'github', run: () => open(PROFILE.github) },
            ...PROFILE.projects.map(p => ({ id: `project.${p.name}`, title: `Open ${p.name}`, category: 'Projects', icon: 'external', run: () => open(p.url) })),

            // Help
            { id: 'help.welcome', title: 'Welcome (README)', category: 'Help', run: () => this.editor.open('README.md') },
            { id: 'help.shortcuts', title: 'Keyboard Shortcuts', category: 'Help', icon: 'keyboard', run: () => this.runInTerminal('help') },
            { id: 'help.about', title: 'About', category: 'Help', icon: 'info', run: () => this.bus.emit('notify', {
                message: `MDL ContactMe 2.0 · Vanilla HTML, CSS and JavaScript. No frameworks. © 2020-${new Date().getFullYear()} ${PROFILE.name}.`,
                actions: [{ label: 'View Source', run: () => open('https://github.com/mdlsis/me') }],
            }) },

            // Hidden helpers
            { id: 'notifications.toggle', title: 'Toggle Notifications', palette: false, run: () => this.notifications.toggle() },
        ];

        commands.forEach(cmd => c.register(cmd));
    }

    #wireEvents() {
        const bus = this.bus;

        bus.on('quickfix:show', ({ problem, anchor }) => {
            const items = [{ label: `Change '${problem.word}' to '${problem.fix}'`, icon: 'lightbulb', run: () => this.build.fix(problem) }];
            if (this.workspace.fixable().length > 1) {
                items.push({ label: 'Fix all problems in file', keys: 'Ctrl+.', icon: 'check', run: () => this.#fixAll() });
            }
            this.menu.show(anchor, items, { focus: true });
        });

        bus.on('problem:reveal', ({ problem }) => {
            this.editor.open(problem.path);
            this.editor.view.reveal(problem.line, { flash: true, col: this.workspace.column(problem) });
        });

        bus.on('problem:fixed', () => {
            if (!this.workspace.fixable().length && !this.build.fixingAll) this.#notifyFixed();
        });

        bus.on('program:ran', () => {
            bus.emit('notify', {
                severity: 'info',
                message: `Thanks for running my program! Let's talk.`,
                actions: [
                    { label: 'Send Email', command: 'contact.email', primary: true },
                    { label: 'LinkedIn', command: 'contact.linkedin' },
                ],
            });
        });

        // Keep the layout sane when crossing the mobile breakpoint
        window.matchMedia('(max-width: 899px)').addEventListener('change', e => {
            if (e.matches) this.sideBar.close();
            else this.sideBar.open();
        });
    }

    async #fixAll() {
        if (!this.workspace.fixable().length) {
            this.bus.emit('notify', { message: 'No problems to fix. Run the program!', actions: [{ label: 'Run', command: 'run.start', primary: true }], timeout: 5000 });
            return;
        }
        this.notifications.clearAll();
        this.build.fixingAll = true;
        await this.build.fixAll(this.panel.isOpen && this.panel.view === 'terminal' ? this.terminal : null);
        this.build.fixingAll = false;
        this.#notifyFixed();
    }

    #notifyFixed() {
        this.notifications.clearAll();
        this.bus.emit('notify', {
            severity: 'info',
            message: 'All problems fixed. The program is ready to run.',
            actions: [{ label: 'Run Program', command: 'run.start', primary: true }],
        });
    }

    #nextProblem() {
        const list = this.workspace.problems();
        if (!list.length) return;
        const path = this.editor.active;
        const line = this.editor.view.state?.line ?? -1;
        const next = list.find(p => p.path === path && p.line > line) || list[0];
        this.bus.emit('problem:reveal', { problem: next });
    }

    #pickTheme() {
        const original = this.theme.current;
        this.quickInput.pick({
            placeholder: 'Select Color Theme (Up/Down Keys to Preview)',
            activeIndex: THEMES.findIndex(t => t.id === original),
            items: THEMES.map(t => ({ label: t.label, description: t.description, id: t.id, checked: t.id === original })),
            onActive: item => this.theme.apply(item.id, false),
            onAccept: item => this.theme.apply(item.id),
            onCancel: () => this.theme.apply(original, false),
        });
    }

    async #copyEmail() {
        try {
            await navigator.clipboard.writeText(emailAddress());
            this.bus.emit('notify', { message: `Copied ${emailAddress()} to the clipboard.`, timeout: 3000 });
        } catch (e) {
            this.bus.emit('notify', { message: `Email: ${emailAddress()}`, timeout: 5000 });
        }
    }

    /** Hero: types the role, then cycles through the stack. */
    async #typeRoles() {
        const el = document.querySelector('.hero-role-text');
        if (!el || prefersReducedMotion()) return;

        const roles = PROFILE.roles;
        let i = 0;
        await sleep(4000);
        for (;;) {
            const current = roles[i % roles.length];
            const next = roles[(i + 1) % roles.length];
            for (let n = current.length; n >= 0; n--) {
                el.textContent = current.slice(0, n);
                await sleep(30);
            }
            await sleep(250);
            for (let n = 1; n <= next.length; n++) {
                el.textContent = next.slice(0, n);
                await sleep(70);
            }
            i++;
            await sleep(next === roles[0] ? 6000 : 2600);
        }
    }
}

const app = new App();
app.start();
window.mdl = app; // handy for debugging from the console
