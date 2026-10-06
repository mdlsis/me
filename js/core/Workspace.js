/*
    Workspace.js
    In-memory model of the files and their problems.

    Events:
        file:changed      { path, line }
        problems:changed  { problems }
*/

export class Workspace {
    #files = new Map();
    #problems = [];
    #initial = [];
    #diagnosticsVisible = false;

    constructor(bus, files) {
        this.bus = bus;
        this.#initial = files;
        this.#load();
    }

    #load() {
        this.#files.clear();
        this.#problems = [];

        for (const f of this.#initial) {
            const parts = f.path.split('/');
            this.#files.set(f.path, {
                path: f.path,
                name: parts[parts.length - 1],
                folder: parts.slice(0, -1).join('/'),
                lang: f.lang,
                lines: f.content.replace(/\n$/, '').split('\n'),
                collapsed: f.collapsed || [],
            });

            (f.problems || []).forEach((p, i) => {
                this.#problems.push({ ...p, id: `${f.path}#${i}`, path: f.path, line: p.line - 1 });
            });
        }
    }

    /** Restores the original files and problems. */
    reset() {
        this.#load();
        for (const path of this.#files.keys()) this.bus.emit('file:changed', { path });
        this.bus.emit('problems:changed', { problems: this.problems() });
    }

    files() {
        return [...this.#files.values()];
    }

    file(path) {
        return this.#files.get(path);
    }

    findFile(query) {
        const q = query.toLowerCase().replace(/^\.\//, '');
        return this.files().find(f => f.path.toLowerCase() === q || f.name.toLowerCase() === q);
    }

    text(path) {
        return this.file(path)?.lines.join('\n') ?? '';
    }

    setLine(path, index, text) {
        const f = this.file(path);
        if (!f) return;
        f.lines[index] = text;
        this.bus.emit('file:changed', { path, line: index });
    }

    /** Diagnostics only show up after the first build. */
    get diagnosticsVisible() {
        return this.#diagnosticsVisible;
    }

    showDiagnostics() {
        this.#diagnosticsVisible = true;
        this.bus.emit('problems:changed', { problems: this.problems() });
    }

    problems(path) {
        if (!this.#diagnosticsVisible) return [];
        return this.#problems.filter(p => !path || p.path === path);
    }

    /** Problems that can be fixed (errors and warnings). */
    fixable() {
        return this.problems().filter(p => p.fix);
    }

    removeProblem(id) {
        this.#problems = this.#problems.filter(p => p.id !== id);
        this.bus.emit('problems:changed', { problems: this.problems() });
    }

    counts() {
        const list = this.problems();
        return {
            errors: list.filter(p => p.severity === 'error').length,
            warnings: list.filter(p => p.severity === 'warning').length,
            infos: list.filter(p => p.severity === 'info').length,
        };
    }

    /** Column (0-based) where the problem word starts. */
    column(problem) {
        const line = this.file(problem.path)?.lines[problem.line] ?? '';
        return Math.max(0, line.indexOf(problem.word));
    }
}
