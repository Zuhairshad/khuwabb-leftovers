/* <marquee-ticker>: port of components/Ticker.tsx.
 *
 * Markup: <marquee-ticker data-speed data-gap data-hover-factor>
 *           <ul data-ticker-track><li data-ticker-set><div data-ticker-measure>items</div></li></ul>
 *         </marquee-ticker>
 * The original <li> is cloned ceil(rootWidth / (setLength + gap)) times (aria-hidden, links tabindex -1).
 */
class MarqueeTicker extends HTMLElement {
  // Defer all setup (measuring, cloning, listeners, rAF) until the ticker is near the viewport.
  connectedCallback() {
    if (this._ready || this._gate) return;
    if (!('IntersectionObserver' in window)) { this.start(); return; }
    this._onGateFocus = (e) => {
      this.stopGate();
      this.start();
      if (this._ready && e.target.matches && e.target.matches(':focus-visible')) {
        this.focusPaused = true;
        this.reveal(e.target);
      }
    };
    this._gate = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) {
        this.stopGate();
        this.start();
      }
    }, { rootMargin: '300px 0px' });
    this._gate.observe(this);
    this.addEventListener('focusin', this._onGateFocus);
  }

  stopGate() {
    if (this._gate) this._gate.disconnect();
    this._gate = null;
    this.removeEventListener('focusin', this._onGateFocus);
  }

  start() {
    if (this._ready) return;
    this.track = this.querySelector('[data-ticker-track]');
    this.set = this.querySelector('[data-ticker-set]');
    this.measureEl = this.querySelector('[data-ticker-measure]');
    if (!this.track || !this.set || !this.measureEl) return;
    this._ready = true;

    this.velocity = parseFloat(this.dataset.speed) || 34;
    this.gap = this.dataset.gap !== undefined ? parseFloat(this.dataset.gap) || 0 : 28;
    const hf = parseFloat(this.dataset.hoverFactor);
    this.hoverFactor = Number.isNaN(hf) ? 0 : hf;

    this.offset = 0;
    this.setLength = 0;
    this.factor = 1;
    this.drag = null;
    this.justDragged = false;
    this.onScreen = true;
    this.focusPaused = false;
    this.last = null;
    this.raf = 0;

    // Improvements over the React source: reduced motion, off-screen / hidden-tab pause, keyboard pause.
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduced = this.motionQuery.matches;
    this._onMotion = (e) => { this.reduced = e.matches; this.last = null; this.syncLoop(); };
    this.motionQuery.addEventListener('change', this._onMotion);

    this._onVisibility = () => { this.last = null; this.syncLoop(); };
    document.addEventListener('visibilitychange', this._onVisibility);

    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        this.onScreen = entry.isIntersecting;
        this.last = null;
        this.syncLoop();
      });
      this.io.observe(this);
    }

    this.ro = new ResizeObserver(() => this.measure());
    this.ro.observe(this.measureEl);
    this.ro.observe(this);
    this.measure();

    this.addEventListener('mouseenter', () => { this.factor = this.hoverFactor; });
    this.addEventListener('mouseleave', () => { this.factor = 1; });

    this.addEventListener('pointerdown', (e) => {
      this.drag = { x: e.clientX, id: e.pointerId, startX: e.clientX, dragging: false };
      this.justDragged = false;
    });
    this.addEventListener('pointermove', (e) => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      if (!d.dragging) {
        if (Math.abs(e.clientX - d.startX) < 6) return;
        d.dragging = true;
        try { this.setPointerCapture(e.pointerId); } catch (_) { /* pointer already gone */ }
      }
      this.offset += e.clientX - d.x;
      d.x = e.clientX;
      this.render();
    });
    this.addEventListener('pointerup', () => {
      this.justDragged = !!(this.drag && this.drag.dragging);
      this.drag = null;
    });
    this.addEventListener('pointercancel', () => { this.drag = null; });
    // After a real drag, swallow the click so it doesn't open a product.
    this.addEventListener('click', (e) => {
      if (this.justDragged) {
        e.preventDefault();
        e.stopPropagation();
        this.justDragged = false;
      }
    }, true);

    // Keyboard focus inside pauses autoplay and brings the focused card into view.
    this.addEventListener('focusin', (e) => {
      if (!e.target.matches || !e.target.matches(':focus-visible')) return;
      this.focusPaused = true;
      this.reveal(e.target);
    });
    this.addEventListener('focusout', (e) => {
      if (!e.relatedTarget || !this.contains(e.relatedTarget)) {
        this.focusPaused = false;
        this.last = null;
      }
    });

    this.render();
    this.syncLoop();
  }

  disconnectedCallback() {
    this.stopGate();
    if (!this._ready) return;
    this._ready = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.ro) this.ro.disconnect();
    if (this.io) this.io.disconnect();
    this.motionQuery.removeEventListener('change', this._onMotion);
    document.removeEventListener('visibilitychange', this._onVisibility);
    // Listeners on this element are re-added by connectedCallback only once; re-attach is not supported.
  }

  measure() {
    const length = this.measureEl.offsetWidth;
    if (!length) return;
    this.setLength = length;
    const copies = Math.max(1, Math.ceil(this.offsetWidth / (length + this.gap)));
    const clones = this.track.querySelectorAll('[data-ticker-clone]');
    if (clones.length !== copies) {
      clones.forEach((c) => c.remove());
      for (let i = 0; i < copies; i++) {
        const li = this.set.cloneNode(true);
        li.removeAttribute('data-ticker-set');
        li.setAttribute('data-ticker-clone', '');
        li.setAttribute('aria-hidden', 'true');
        li.setAttribute('inert', '');
        li.querySelectorAll('[data-ticker-measure]').forEach((m) => m.removeAttribute('data-ticker-measure'));
        li.querySelectorAll('a, button, [tabindex]').forEach((el) => el.setAttribute('tabindex', '-1'));
        this.track.appendChild(li);
      }
    }
    this.render();
  }

  // framer-motion wrap(-setLength - gap, 0, v)
  wrapped() {
    if (!this.setLength) return 0;
    const min = -this.setLength - this.gap;
    const range = -min;
    return ((((this.offset - min) % range) + range) % range) + min;
  }

  render() {
    this.track.style.transform = 'translate3d(' + this.wrapped() + 'px,0,0)';
  }

  reveal(el) {
    const card = el.closest('li') === this.set ? el : null;
    if (!card || !this.setLength) return;
    const rootRect = this.getBoundingClientRect();
    const r = card.getBoundingClientRect();
    if (r.left < rootRect.left) this.offset += rootRect.left - r.left;
    else if (r.right > rootRect.right) this.offset -= r.right - rootRect.right;
    this.render();
  }

  // rAF runs only while on screen, the tab is visible and motion is allowed.
  syncLoop() {
    const should = this._ready && this.onScreen && !document.hidden && !this.reduced;
    if (should && !this.raf) {
      this.last = null;
      this.raf = requestAnimationFrame((t) => this.tick(t));
    } else if (!should && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.last = null;
    }
  }

  tick(now) {
    this.raf = requestAnimationFrame((t) => this.tick(t));
    const active = this.setLength && !this.drag && this.onScreen && !this.reduced
      && !this.focusPaused && !document.hidden;
    if (!active) { this.last = null; return; }
    if (this.last === null) { this.last = now; return; }
    const delta = Math.min(now - this.last, 100);
    this.last = now;
    this.offset -= (delta / 1000) * this.velocity * this.factor;
    this.render();
  }
}

if (!customElements.get('marquee-ticker')) customElements.define('marquee-ticker', MarqueeTicker);
