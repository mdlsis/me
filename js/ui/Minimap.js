/*
    Minimap.js
    Canvas overview of the active file with a draggable viewport slider.
*/

import { Highlighter } from '../core/Highlighter.js';

const LINE_H = 4;
const CHAR_W = 1.6;

const TOKEN_VARS = {
    comment: '--tok-comment',
    keyword: '--tok-keyword',
    control: '--tok-control',
    type: '--tok-type',
    string: '--tok-string',
    number: '--tok-number',
    fn: '--tok-fn',
    prop: '--tok-prop',
    heading: '--tok-heading',
    quote: '--tok-comment',
    'link-text': '--tok-type',
    'link-url': '--tok-string',
    code: '--tok-string',
};

export class Minimap {
    #lines = [];
    #lang = '';
    #dragging = false;

    constructor(el, scroller) {
        this.el = el;
        this.canvas = el.querySelector('canvas');
        this.slider = el.querySelector('.minimap-slider');
        this.scroller = scroller;

        scroller.addEventListener('scroll', () => this.updateSlider(), { passive: true });
        new ResizeObserver(() => this.draw()).observe(el);

        el.addEventListener('pointerdown', e => {
            this.#dragging = true;
            el.setPointerCapture(e.pointerId);
            this.#scrollTo(e);
        });
        el.addEventListener('pointermove', e => { if (this.#dragging) this.#scrollTo(e); });
        el.addEventListener('pointerup', () => { this.#dragging = false; });
    }

    /** @param {string[]} lines visible lines (folds already applied) */
    setContent(lines, lang) {
        this.#lines = lines;
        this.#lang = lang;
        this.draw();
    }

    #contentHeight() {
        return this.#lines.length * LINE_H;
    }

    draw() {
        const w = this.el.clientWidth;
        const h = this.el.clientHeight;
        if (!w || !h) return;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;

        const ctx = this.canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const style = getComputedStyle(document.documentElement);
        const fallback = style.getPropertyValue('--fg').trim();
        const colors = {};
        for (const [type, v] of Object.entries(TOKEN_VARS)) colors[type] = style.getPropertyValue(v).trim();

        ctx.globalAlpha = 0.65;
        this.#lines.forEach((line, row) => {
            let x = 4;
            for (const t of Highlighter.tokenize(line, this.#lang)) {
                const width = t.text.length * CHAR_W;
                if (t.type !== 'ws' && t.text.trim()) {
                    ctx.fillStyle = colors[t.type] || fallback;
                    ctx.fillRect(x, row * LINE_H + 1, Math.max(1, width), LINE_H - 2);
                }
                x += width;
                if (x > w) break;
            }
        });

        this.updateSlider();
    }

    updateSlider() {
        const { scrollTop, scrollHeight, clientHeight } = this.scroller;
        const content = Math.min(this.#contentHeight(), this.el.clientHeight);

        if (scrollHeight <= clientHeight + 1) {
            this.slider.style.top = '0px';
            this.slider.style.height = `${content}px`;
            return;
        }
        this.slider.style.top = `${(scrollTop / scrollHeight) * content}px`;
        this.slider.style.height = `${Math.max(12, (clientHeight / scrollHeight) * content)}px`;
    }

    #scrollTo(e) {
        const rect = this.el.getBoundingClientRect();
        const content = Math.min(this.#contentHeight(), this.el.clientHeight) || 1;
        const ratio = (e.clientY - rect.top) / content;
        const { scrollHeight, clientHeight } = this.scroller;
        this.scroller.scrollTop = ratio * scrollHeight - clientHeight / 2;
    }
}
