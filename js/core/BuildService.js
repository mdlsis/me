/*
    BuildService.js
    Simulates compiling, fixing and running Program.cs.
*/

import { sleep, prefersReducedMotion } from './util.js';
import { emailAddress } from '../data/files.js';

const PROGRAM = 'Program.cs';

export class BuildService {
    #fixing = false;

    constructor({ bus, app }) {
        this.bus = bus;
        this.app = app;
        this.state = 'idle'; // idle | building | ready
    }

    get workspace() {
        return this.app.workspace;
    }

    /** Initial background compile with a progress bar (on page load). */
    async compile() {
        this.state = 'building';
        this.bus.emit('build:progress', { value: 0 });

        let value = 0;
        await new Promise(resolve => {
            const step = () => {
                if (prefersReducedMotion()) value = 100;
                const r = Math.random();
                if (r < 0.88) value += r * 2.2;
                this.bus.emit('build:progress', { value: Math.min(100, Math.round(value)) });
                if (value >= 100) resolve();
                else requestAnimationFrame(step);
            };
            step();
        });

        this.workspace.showDiagnostics();
        this.state = 'ready';
        this.bus.emit('build:done', this.workspace.counts());
        this.app.panel.output(`[build] ContactMe -> ${this.#summary()}`, this.#hasErrors() ? 'out-error' : '');
        return this.workspace.counts();
    }

    #hasErrors() {
        return this.workspace.counts().errors > 0;
    }

    #summary() {
        const { errors, warnings } = this.workspace.counts();
        if (!errors && !warnings) return 'Build succeeded.';
        return `${errors} error(s), ${warnings} warning(s)`;
    }

    #diagnosticLines() {
        return this.workspace.problems()
            .filter(p => p.severity !== 'info')
            .map(p => [
                `${p.path}(${p.line + 1},${this.workspace.column(p) + 1}): ${p.severity} ${p.code}: ${p.message}`,
                p.severity === 'error' ? 't-error' : 't-warning',
            ]);
    }

    /** dotnet build */
    async build(term) {
        if (!this.workspace.diagnosticsVisible) this.workspace.showDiagnostics();
        const { errors, warnings } = this.workspace.counts();

        await term.lines([
            ['  Determining projects to restore...', 't-dim'],
            ['  All projects are up-to-date for restore.', 't-dim'],
        ], 180);
        await sleep(350);

        if (errors || warnings) {
            await term.lines(this.#diagnosticLines(), 120);
        }

        if (errors) {
            await term.lines([
                '',
                ['Build FAILED.', 't-error t-bold'],
                `    ${warnings} Warning(s)`,
                `    ${errors} Error(s)`,
            ], 60);
            term.print(`<span class="t-dim">Tip: run</span> <button type="button" class="term-chip" data-run="fix">fix</button> <span class="t-dim">or press Ctrl+. to apply the quick fixes.</span>`);
            this.app.panel.output(`[build] ContactMe -> Build FAILED. ${this.#summary()}`, 'out-error');
            this.bus.emit('build:failed', this.workspace.counts());
            return false;
        }

        await term.lines([
            ['  ContactMe -> C:\\Projects\\me\\bin\\Debug\\net8.0\\ContactMe.dll', 't-dim'],
            '',
            [`Build succeeded${warnings ? ` with ${warnings} warning(s)` : ''}.`, 't-success t-bold'],
            `    ${warnings} Warning(s)`,
            '    0 Error(s)',
            ['Time Elapsed 00:00:01.42', 't-dim'],
        ], 60);
        this.app.panel.output('[build] ContactMe -> Build succeeded.');
        return true;
    }

    /** dotnet run */
    async run(term) {
        const ok = await this.build(term);
        if (!ok) {
            this.bus.emit('notify', {
                severity: 'error',
                message: 'Build failed. Fix the problems before running the program.',
                actions: [{ label: 'Quick Fix All', command: 'editor.fixAll', primary: true }, { label: 'Show Problems', command: 'view.problems' }],
            });
            return false;
        }

        const p = this.app.profile;
        await sleep(300);
        term.print('');
        await term.lines([
            [`${p.name} · ${p.role}`, 't-accent t-bold'],
            ['─'.repeat(Math.min(44, `${p.name} · ${p.role}`.length + 4)), 't-dim'],
            `Email     ${emailAddress()}`,
            `Web       ${p.website}`,
            `LinkedIn  ${p.linkedin}`,
            `GitHub    ${p.github}`,
            `Projects  ${p.projects.map(x => x.url.replace(/^https?:\/\//, '')).join(' · ')}`,
            '',
            'Press Enter Key to Exit...',
        ], 90);
        term.waitForEnter();

        this.bus.emit('program:ran');
        this.app.panel.output('[run] ContactMe exited normally.');
        return true;
    }

    /** Fixes one problem with a typing animation in the editor. */
    async fix(problem) {
        if (!problem?.fix) return false;
        const editor = this.app.editor;
        editor.open(problem.path);

        const file = this.workspace.file(problem.path);
        const line = file.lines[problem.line];
        const start = line.indexOf(problem.word);
        if (start < 0) return false;

        editor.view.reveal(problem.line);
        this.workspace.removeProblem(problem.id);
        await sleep(250);

        const before = line.slice(0, start);
        const after = line.slice(start + problem.word.length);

        // Delete the old word, then type the new one
        for (let n = problem.word.length; n >= 0; n--) {
            this.workspace.setLine(problem.path, problem.line, before + problem.word.slice(0, n) + after);
            editor.view.setCaret({ line: problem.line, col: start + n });
            await sleep(problem.word.length > 12 ? 18 : 35);
        }
        await sleep(120);
        for (let n = 1; n <= problem.fix.length; n++) {
            this.workspace.setLine(problem.path, problem.line, before + problem.fix.slice(0, n) + after);
            editor.view.setCaret({ line: problem.line, col: start + n });
            await sleep(55 + Math.random() * 40);
        }
        await sleep(200);
        editor.view.setCaret(null);
        editor.view.reveal(problem.line, { flash: true, col: start + problem.fix.length });
        this.bus.emit('problem:fixed', { problem });
        return true;
    }

    async fixAll(term) {
        if (this.#fixing) return 0;
        if (!this.workspace.diagnosticsVisible) this.workspace.showDiagnostics();

        const list = this.workspace.fixable();
        if (!list.length) {
            term?.printText('No problems detected. Run (dotnet run) the application.', 't-success');
            return 0;
        }

        this.#fixing = true;
        this.bus.emit('fix:start');
        term?.printText('Detecting and fixing problems...', 't-dim');

        for (const p of list) {
            await this.fix(p);
            term?.printText(`  ✔ Line ${p.line + 1}: ${p.word} → ${p.fix}`, 't-success');
        }

        term?.printText(`Fixed ${list.length} problem(s). Now run the application: `, '');
        term?.print(`<button type="button" class="term-chip" data-run="dotnet run">dotnet run</button>`);
        this.app.panel.output(`[format] Applied ${list.length} quick fix(es) to ${PROGRAM}.`);

        this.#fixing = false;
        this.bus.emit('fix:done', { count: list.length });
        return list.length;
    }

    reset() {
        this.workspace.reset();
        this.workspace.showDiagnostics();
        this.bus.emit('build:done', this.workspace.counts());
    }
}
