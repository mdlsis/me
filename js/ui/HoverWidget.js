/*
    HoverWidget.js
    Floating hover card (problem details, quick fix action).
*/

export class HoverWidget {
    #hideTimer = null;

    constructor(el) {
        this.el = el;
        this.el.addEventListener('mouseenter', () => clearTimeout(this.#hideTimer));
        this.el.addEventListener('mouseleave', () => this.hideSoon());
        document.addEventListener('keydown', e => { if (e.key === 'Escape') this.hide(); });
        document.addEventListener('pointerdown', e => {
            if (!this.el.contains(e.target) && !e.target.closest('[data-problem]')) this.hide();
        });
    }

    show(anchor, html) {
        clearTimeout(this.#hideTimer);
        this.el.innerHTML = html;
        this.el.hidden = false;

        const r = anchor.getBoundingClientRect();
        const w = this.el.offsetWidth;
        const h = this.el.offsetHeight;
        const margin = 8;

        let left = Math.min(Math.max(margin, r.left), window.innerWidth - w - margin);
        let top = r.top - h - 4;
        if (top < margin) top = r.bottom + 4;

        this.el.style.left = `${left}px`;
        this.el.style.top = `${top}px`;
    }

    hideSoon(ms = 250) {
        clearTimeout(this.#hideTimer);
        this.#hideTimer = setTimeout(() => this.hide(), ms);
    }

    hide() {
        clearTimeout(this.#hideTimer);
        this.el.hidden = true;
    }
}
