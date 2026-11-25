/*
 * <receipt-drag> - free 2D drag with momentum (Receipts.tsx: framer `drag` + `dragMomentum`, no
 * bounds). Wraps one receipt; moves itself with the CSS `translate` property (the receipt inside
 * keeps its own rotate/entrance).
 *
 * - Pointer events + pointer capture; drag only starts after a 6px move (clicks/selection stay
 *   normal, nothing is prevented before that).
 * - Momentum = framer/popmotion inertia: power .8, timeConstant 700ms, rest delta .5px, from the
 *   release velocity measured over the last ~100ms.
 * - Keyboard-inert: no tabindex/roles added, no key handling, nothing focusable.
 * - Touch: the element uses touch-action: pan-y (CSS), so vertical swipes still scroll the page;
 *   if the browser takes over a gesture it fires pointercancel and the drag simply ends.
 * - prefers-reduced-motion: drags follow the pointer, no momentum on release.
 */
(function () {
  if (customElements.get('receipt-drag')) return;

  var THRESHOLD = 6;
  var POWER = 0.8;
  var TIME_CONSTANT = 700;
  var REST_DELTA = 0.5;
  var SAMPLE_WINDOW = 100;

  class ReceiptDrag extends HTMLElement {
    constructor() {
      super();
      this._x = 0;
      this._y = 0;
      this._active = false;
      this._dragging = false;
      this._raf = 0;
      this._samples = [];
      this._onDown = this._onDown.bind(this);
      this._onMove = this._onMove.bind(this);
      this._onUp = this._onUp.bind(this);
      this._onDragStart = function (e) {
        e.preventDefault();
      };
    }

    connectedCallback() {
      this.addEventListener('pointerdown', this._onDown);
      this.addEventListener('pointermove', this._onMove);
      this.addEventListener('pointerup', this._onUp);
      this.addEventListener('pointercancel', this._onUp);
      this.addEventListener('dragstart', this._onDragStart);
    }

    disconnectedCallback() {
      this.removeEventListener('pointerdown', this._onDown);
      this.removeEventListener('pointermove', this._onMove);
      this.removeEventListener('pointerup', this._onUp);
      this.removeEventListener('pointercancel', this._onUp);
      this.removeEventListener('dragstart', this._onDragStart);
      this._stopMomentum();
    }

    _apply() {
      this.style.translate = this._x + 'px ' + this._y + 'px';
    }

    _stopMomentum() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
    }

    _onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!e.isPrimary) return;
      this._stopMomentum();
      this._active = true;
      this._dragging = false;
      this._id = e.pointerId;
      this._startX = e.clientX;
      this._startY = e.clientY;
      this._originX = this._x;
      this._originY = this._y;
      this._samples = [{ t: e.timeStamp, x: this._x, y: this._y }];
      try {
        this.setPointerCapture(e.pointerId);
      } catch (err) {
        /* pointer already gone */
      }
    }

    _onMove(e) {
      if (!this._active || e.pointerId !== this._id) return;
      var dx = e.clientX - this._startX;
      var dy = e.clientY - this._startY;
      if (!this._dragging) {
        if (Math.sqrt(dx * dx + dy * dy) < THRESHOLD) return;
        this._dragging = true;
        this.classList.add('is-dragging');
      }
      this._x = this._originX + dx;
      this._y = this._originY + dy;
      this._apply();
      var s = this._samples;
      s.push({ t: e.timeStamp, x: this._x, y: this._y });
      while (s.length > 2 && e.timeStamp - s[0].t > SAMPLE_WINDOW) s.shift();
    }

    _onUp(e) {
      if (!this._active || e.pointerId !== this._id) return;
      this._active = false;
      try {
        this.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* not captured */
      }
      if (!this._dragging) return;
      this._dragging = false;
      this.classList.remove('is-dragging');
      if (e.type === 'pointercancel') return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var s = this._samples;
      var first = s[0];
      var last = s[s.length - 1];
      var dt = last.t - first.t;
      // Stale gesture (paused before release) -> no throw.
      if (dt <= 0 || e.timeStamp - last.t > SAMPLE_WINDOW) return;
      var vx = ((last.x - first.x) / dt) * 1000; // px/s
      var vy = ((last.y - first.y) / dt) * 1000;
      this._momentum(vx * POWER, vy * POWER);
    }

    _momentum(ampX, ampY) {
      var self = this;
      var baseX = this._x;
      var baseY = this._y;
      var t0 = performance.now();
      this._stopMomentum();
      function frame(now) {
        var t = now - t0;
        var decay = Math.exp(-t / TIME_CONSTANT);
        self._x = baseX + ampX * (1 - decay);
        self._y = baseY + ampY * (1 - decay);
        self._apply();
        if (Math.abs(ampX * decay) > REST_DELTA || Math.abs(ampY * decay) > REST_DELTA) {
          self._raf = requestAnimationFrame(frame);
        } else {
          self._x = baseX + ampX;
          self._y = baseY + ampY;
          self._apply();
          self._raf = 0;
        }
      }
      this._raf = requestAnimationFrame(frame);
    }
  }

  customElements.define('receipt-drag', ReceiptDrag);
})();
