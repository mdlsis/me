/*
    EventBus.js
    Minimal publish/subscribe used to decouple the UI parts.
*/

export class EventBus {
    #handlers = new Map();

    on(event, handler) {
        if (!this.#handlers.has(event)) this.#handlers.set(event, new Set());
        this.#handlers.get(event).add(handler);
        return () => this.off(event, handler);
    }

    off(event, handler) {
        this.#handlers.get(event)?.delete(handler);
    }

    emit(event, payload) {
        this.#handlers.get(event)?.forEach(handler => handler(payload));
    }
}
