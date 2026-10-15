// Room-scoped helpers. All plaintext and caches remain in memory and are reset on exit.
export class MessagePresence {
  constructor(listen, removed) {
    this.listen = listen;
    this.removed = removed;
    this.watches = new Map();
    this.active = true;
  }
  watch(key) {
    if (!this.active || this.watches.has(key)) return;
    const entry = { off: null };
    this.watches.set(key, entry);
    entry.off = this.listen(key, exists => {
      if (!this.active || this.watches.get(key) !== entry || exists) return;
      this.forget(key);
      this.removed(key);
    });
    // Also handle a synchronous initial callback in offline tests/local cache.
    if (this.watches.get(key) !== entry) entry.off();
  }
  forget(key) {
    const entry = this.watches.get(key);
    this.watches.delete(key);
    entry?.off?.();
  }
  clear() { for (const key of this.watches.keys()) this.forget(key); }
  close() { this.active = false; this.clear(); }
}

export class NoteFeed {
  constructor({ listen, decode, changed, failed = () => {} }) {
    Object.assign(this, { listen, decode, changed, failed });
    this.cache = new Map();
    this.off = null;
    this.active = false;
    this.revision = 0;
  }
  open() {
    if (this.active) return;
    this.active = true;
    this.off = this.listen(raw => this.receive(raw), error => this.failed(error));
  }
  async receive(raw) {
    const revision = ++this.revision;
    const out = [];
    const next = new Map();
    for (const [key, value] of Object.entries(raw || {})) {
      if (!value?.iv || !value?.c) continue;
      if (!this.active || revision !== this.revision) return;
      const old = this.cache.get(key);
      let note;
      if (old && old.iv === value.iv && old.c === value.c && old.t === value.t) note = old.note;
      else note = await this.decode(key, value);
      if (!this.active || revision !== this.revision) return;
      next.set(key, { iv: value.iv, c: value.c, t: value.t, note });
      out.push(note);
    }
    if (!this.active || revision !== this.revision) return;
    this.cache = next;
    out.sort((a, b) => b.t - a.t);
    this.changed(out);
  }
  close() {
    this.active = false;
    this.revision++;
    this.off?.(); this.off = null;
  }
  reset() { this.close(); this.cache.clear(); }
}

// Keep row placeholders for anchors/quotes/read receipts, release distant bubble DOM/images.
export class BubbleWindow {
  constructor({ root, makeRow, beforeHide, afterShow, observer = globalThis.IntersectionObserver }) {
    Object.assign(this, { makeRow, beforeHide, afterShow });
    this.rows = new Map();
    this.io = observer ? new observer(entries => {
      for (const entry of entries) {
        const item = this.rows.get(entry.target.dataset.k);
        if (!item || item.row !== entry.target) continue;
        if (item.restore) {
          this.afterShow(item.row, item.saved);
          item.saved = null;
          item.restore = false;
        }
        item.near = entry.isIntersecting;
        if (item.near) this.show(item); else this.hide(item);
      }
    }, { root, rootMargin: '1200px 0px' }) : null;
    // A width change invalidates measured heights (rotation, split screen). Re-measure
    // real rows before observing again; keyboard-only height changes need no rebuild.
    this.width = root?.clientWidth;
    if (root && globalThis.ResizeObserver) {
      this.resize = new ResizeObserver(() => {
        if (root.clientWidth === this.width) return;
        this.width = root.clientWidth;
        for (const item of this.rows.values()) {
          this.show(item);
          this.io?.unobserve(item.row);
          this.io?.observe(item.row);
        }
      });
      this.resize.observe(root);
    }
  }
  track(row) {
    if (!this.io) return;
    const previous = this.rows.get(row.dataset.k);
    const saved = previous ? (previous.hidden ? previous.saved : this.beforeHide(previous.row)) : null;
    if (previous) this.io.unobserve(previous.row);
    const item = { row, near: true, hidden: false, saved, restore: !!previous };
    this.rows.set(row.dataset.k, item);
    this.io.observe(row);
    if (this.rows.size === 121) for (const other of this.rows.values()) if (!other.near) this.hide(other);
  }
  hide(item) {
    if (this.rows.size <= 120 || item.hidden || !item.row.isConnected) return;
    const height = item.row.getBoundingClientRect().height;
    if (!height) return;
    item.saved = this.beforeHide(item.row);
    item.row.style.height = `${height}px`;
    item.row.style.boxSizing = 'border-box';
    item.row.replaceChildren();
    item.row.dataset.suspended = 'true';
    item.hidden = true;
  }
  show(item) {
    if (!item.hidden) return;
    const fresh = this.makeRow(item.row.dataset.k);
    if (!fresh) return;
    item.row.replaceChildren(...fresh.childNodes);
    delete item.row.dataset.state;
    delete item.row.dataset.suspended;
    item.row.dataset.resumed = 'true';
    item.row.style.height = '';
    item.row.style.boxSizing = '';
    item.hidden = false;
    this.afterShow(item.row, item.saved);
    item.saved = null;
  }
  reveal(key) { const item = this.rows.get(key); if (item) this.show(item); }
  forget(key) {
    const item = this.rows.get(key);
    if (!item) return;
    this.io?.unobserve(item.row);
    if (!item.hidden) this.beforeHide(item.row);
    this.rows.delete(key);
  }
  clear() { for (const key of this.rows.keys()) this.forget(key); }
  close() { this.clear(); this.io?.disconnect(); this.resize?.disconnect(); }
}
