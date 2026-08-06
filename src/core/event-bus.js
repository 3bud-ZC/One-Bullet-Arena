export class EventBus {
  constructor({ allowedTypes = null, historyLimit = 96, onListenerError = null } = {}) {
    this.allowedTypes = allowedTypes ? new Set(allowedTypes) : null;
    this.historyLimit = Math.max(0, Math.floor(Number(historyLimit) || 0));
    this.onListenerError = typeof onListenerError === 'function' ? onListenerError : null;
    this.listeners = new Map();
    this.history = [];
    this.sequence = 0;
  }

  validateType(type) {
    if (typeof type !== 'string' || type.length === 0) throw new TypeError('Event type must be a non-empty string.');
    if (this.allowedTypes && !this.allowedTypes.has(type)) throw new TypeError(`Event type is not allowed: ${type}`);
    return type;
  }

  on(type, listener) {
    this.validateType(type);
    if (typeof listener !== 'function') throw new TypeError('Event listener must be a function.');
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    return () => this.off(type, listener);
  }

  once(type, listener) {
    if (typeof listener !== 'function') throw new TypeError('Event listener must be a function.');
    let unsubscribe = null;
    const wrapped = (event) => {
      unsubscribe?.();
      listener(event);
    };
    unsubscribe = this.on(type, wrapped);
    return unsubscribe;
  }

  off(type, listener) {
    const listeners = this.listeners.get(type);
    if (!listeners) return false;
    const removed = listeners.delete(listener);
    if (listeners.size === 0) this.listeners.delete(type);
    return removed;
  }

  emit(type, payload = {}) {
    this.validateType(type);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new TypeError('Event payload must be an object.');
    }

    const event = Object.freeze({
      type,
      sequence: ++this.sequence,
      payload: Object.freeze({ ...payload }),
    });

    if (this.historyLimit > 0) {
      this.history.push(event);
      if (this.history.length > this.historyLimit) this.history.splice(0, this.history.length - this.historyLimit);
    }

    const listeners = [...(this.listeners.get(type) || [])];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        try {
          this.onListenerError?.(error, event);
        } catch {
          // Diagnostics must never interrupt gameplay.
        }
      }
    }
    return event;
  }

  clearHistory() {
    this.history.length = 0;
  }

  getHistory(limit = this.history.length) {
    const count = Math.max(0, Math.floor(Number(limit) || 0));
    return this.history.slice(Math.max(0, this.history.length - count));
  }

  listenerCount(type = null) {
    if (type !== null) return this.listeners.get(type)?.size || 0;
    let total = 0;
    for (const listeners of this.listeners.values()) total += listeners.size;
    return total;
  }

  destroy() {
    this.listeners.clear();
    this.clearHistory();
  }
}
