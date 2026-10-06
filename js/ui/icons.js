/*
    icons.js
    Small inline SVG icon set (no icon font, no external requests).
    Stroke icons use a 24x24 grid; brand marks are filled.
*/

const STROKE = {
    files: 'M14 3H8a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V7z M14 3v4h4 M7 7H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1',
    search: 'M10.5 4a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13z M15.3 15.3L20 20',
    branch: 'M7 3.5a2 2 0 1 1 0 4a2 2 0 0 1 0-4z M7 16.5a2 2 0 1 1 0 4a2 2 0 0 1 0-4z M17 3.5a2 2 0 1 1 0 4a2 2 0 0 1 0-4z M7 7.5v9 M17 7.5c0 5-10 3-10 9',
    play: 'M7.5 4.5v15l12-7.5z',
    bug: 'M9 7.5a3 3 0 0 1 6 0 M8 9h8v5a4 4 0 0 1-8 0z M12 12v6 M8 12.5H4.5 M19.5 12.5H16 M8 16.5l-3 2 M16 16.5l3 2 M8 9.5L5.5 7 M16 9.5L18.5 7',
    extensions: 'M3.5 10h5.5v5.5H3.5z M9 10h5.5v5.5H9z M3.5 15.5h5.5V21H3.5z M9 15.5h5.5V21H9z M14.5 3.5H20V9h-5.5z',
    account: 'M12 4a4 4 0 1 1 0 8a4 4 0 0 1 0-8z M4.5 20.5c.8-3.8 3.8-5.5 7.5-5.5s6.7 1.7 7.5 5.5',
    gear: 'M12 9a3 3 0 1 1 0 6a3 3 0 0 1 0-6z M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1',
    close: 'M6.5 6.5l11 11 M17.5 6.5l-11 11',
    chevronRight: 'M9.5 6l6 6-6 6',
    chevronDown: 'M6 9.5l6 6 6-6',
    chevronUp: 'M6 14.5l6-6 6 6',
    error: 'M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18z M9 9l6 6 M15 9l-6 6',
    warning: 'M12 3.5l9.5 16.5h-19z M12 10v4.5 M12 17.2v.3',
    info: 'M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18z M12 11v5.5 M12 7.7v.3',
    bell: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0',
    sync: 'M19 8.5A7.5 7.5 0 0 0 5.2 9.5 M5 15.5a7.5 7.5 0 0 0 13.8 1 M19 4v4.5h-4.5 M5 20v-4.5h4.5',
    terminal: 'M3.5 4.5h17v15h-17z M7 9l3 3-3 3 M12 15h5',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    trash: 'M4.5 6.5h15 M9.5 6.5V4h5v2.5 M6.5 6.5l1 13.5h9l1-13.5 M10 10v6.5 M14 10v6.5',
    ellipsis: 'M6 12h.01 M12 12h.01 M18 12h.01',
    split: 'M4 4.5h16v15H4z M12 4.5v15',
    mail: 'M3.5 6h17v12h-17z M3.5 6.5l8.5 7 8.5-7',
    globe: 'M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18z M3 12h18 M12 3c3.2 3.2 3.2 14.8 0 18 M12 3c-3.2 3.2-3.2 14.8 0 18',
    menu: 'M4 7h16 M4 12h16 M4 17h16',
    remote: 'M9 7l-5 5 5 5 M15 7l5 5-5 5',
    copy: 'M8.5 8.5h11v11h-11z M5.5 15.5H4.5v-11h11v1',
    external: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
    preview: 'M4 4.5h16v15H4z M12 4.5v15 M6.5 8.5h3 M6.5 11.5h3 M14.5 8.5h3 M14.5 11.5h3',
    wrap: 'M4 6h16 M4 12h13a3 3 0 0 1 0 6h-4 M15 16l-2 2 2 2 M4 18h5',
    color: 'M12 3a9 9 0 0 0 0 18c1.2 0 1.8-.8 1.8-1.8 0-1.2-1-1.6-1-2.6 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z M7.5 11a1 1 0 1 1 0 .1 M10 7.5a1 1 0 1 1 0 .1 M14.5 7.5a1 1 0 1 1 0 .1',
    folder: 'M3.5 6.5a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z',
    lightbulb: 'M9.5 17.5h5 M10.5 20.5h3 M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z',
    keyboard: 'M3 6.5h18v11H3z M6.5 10h.01 M10 10h.01 M14 10h.01 M17.5 10h.01 M7.5 14h9',
    restart: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3 M4.5 4v4.5H9',
};

const FILLED = {
    github: {
        viewBox: '0 0 16 16',
        d: 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z',
    },
    linkedin: {
        viewBox: '0 0 24 24',
        d: 'M4.5 3h15A1.5 1.5 0 0 1 21 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-15A1.5 1.5 0 0 1 4.5 3zM6.5 9.5V18h2.7V9.5zm1.35-4.2a1.55 1.55 0 1 0 0 3.1 1.55 1.55 0 0 0 0-3.1zM10.9 9.5V18h2.7v-4.4c0-1.2.4-2.2 1.7-2.2 1.2 0 1.4 1 1.4 2.2V18h2.7v-4.9c0-2.5-.6-3.8-3.2-3.8-1.3 0-2.2.7-2.6 1.3V9.5z',
    },
};

/**
 * Returns the SVG markup for an icon.
 * @param {string} name
 * @param {string} [cls]
 */
export function icon(name, cls = '') {
    const klass = `ico ico-${name} ${cls}`.trim();

    if (FILLED[name]) {
        const { viewBox, d } = FILLED[name];
        return `<svg class="${klass} ico-filled" viewBox="${viewBox}" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
    }

    const d = STROKE[name];
    if (!d) return '';
    return `<svg class="${klass}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
}

/** Replaces every [data-icon] placeholder found under root with its SVG. */
export function hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(el => {
        if (el.querySelector('svg')) return;
        el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));
    });
}

/** File type badge used in the explorer, tabs and quick open. */
export function fileIcon(lang) {
    const map = {
        csharp: ['C#', 'fi-cs'],
        json: ['{ }', 'fi-json'],
        markdown: ['M↓', 'fi-md'],
    };
    const [label, cls] = map[lang] || ['•', 'fi-txt'];
    return `<span class="file-icon ${cls}" aria-hidden="true">${label}</span>`;
}
