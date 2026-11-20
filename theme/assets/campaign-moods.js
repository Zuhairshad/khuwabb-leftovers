/*
 * <campaign-moods>  port of components/GelatoCounter.tsx (photo reveal, mood tags, floating look cards)
 * <scroll-words>    port of the Word component in components/home/FreshDaily.tsx (framer-motion useScroll)
 * See docs/parity/campaign-moods.md for the line-by-line map.
 */
(() => {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const PHONE = '(max-width: 809.98px)'; // lib/useMedia.ts PHONE

  class CampaignMoods extends HTMLElement {
    connectedCallback() {
      this.frame = this.querySelector('[data-frame]');
      this.clip = this.querySelector('[data-clip]');
      this.photo = this.querySelector('.campaign-moods__photo');
      this.chips = this.querySelector('[data-chips]');
      this.stack = this.querySelector('[data-stack]');
      this.tags = Array.from(this.querySelectorAll('[data-tag]'));
      this.floats = Array.from(this.querySelectorAll('[data-float]'));
      if (!this.frame || !this.photo) return;

      this.radius = parseFloat(this.dataset.radius);
      if (!Number.isFinite(this.radius)) this.radius = 32;
      this.focusDesktop = parseFloat(this.dataset.focusX);
      if (!Number.isFinite(this.focusDesktop)) this.focusDesktop = 50;
      this.focusPhone = parseFloat(this.dataset.focusXMobile);
      if (!Number.isFinite(this.focusPhone)) this.focusPhone = 62;
      this.cycle = parseFloat(this.dataset.cycle);
      if (!Number.isFinite(this.cycle)) this.cycle = 4;

      // useState defaults
      this.box = { w: 1200, h: 700 };
      this.natural = { w: 1536, h: 864 };
      this.reveal = 0;
      this.eased = 0;
      this.active = 0;
      this.hovering = false;
      this.focusIn = false;
      this.editorPaused = false;
      this.onScreen = false;
      this.narrow = false;
      this.revealed = false;
      this.timer = 0;
      this.raf = 0;
      this.reduced = reducedMotion();
      this.mq = window.matchMedia(PHONE);

      this.cleanups = [];
      const on = (el, type, fn, opts) => {
        el.addEventListener(type, fn, opts);
        this.cleanups.push(() => el.removeEventListener(type, fn, opts));
      };

      // Photo natural size (cover-fit). Cached images may already be complete.
      const sync = () => {
        if (this.photo.naturalWidth) {
          this.natural = { w: this.photo.naturalWidth, h: this.photo.naturalHeight };
          this.layout();
        }
      };
      on(this.photo, 'load', sync);
      if (this.photo.complete) sync();

      // Tag interactions: onMouseEnter (hover on) + select, onFocus select, onClick select.
      this.tags.forEach((tag, i) => {
        on(tag, 'mouseenter', () => {
          this.hovering = true;
          this.select(i);
          this.syncCycle();
        });
        on(tag, 'focus', () => this.select(i));
        on(tag, 'click', () => this.select(i));
      });
      // Floating cards: onMouseEnter keeps the cycle paused.
      this.floats.forEach((f) => {
        on(f, 'mouseenter', () => {
          this.hovering = true;
          this.syncCycle();
        });
      });
      // Keyboard focus inside tags or cards pauses the cycle like hover (improvement).
      on(this, 'focusin', () => {
        this.focusIn = true;
        this.syncCycle();
      });
      on(this, 'focusout', (e) => {
        if (e.relatedTarget && this.contains(e.relatedTarget)) return;
        this.focusIn = false;
        this.syncCycle();
      });

      // Theme editor: selecting a mood block shows that mood and pauses cycling until deselect.
      on(document, 'shopify:block:select', (e) => {
        const i = this.tags.indexOf(e.target);
        if (i < 0) return;
        this.editorPaused = true;
        this.select(i);
        this.syncCycle();
      });
      on(document, 'shopify:block:deselect', () => {
        if (!this.editorPaused) return;
        this.editorPaused = false;
        this.syncCycle();
      });

      // Root onMouseLeave resumes.
      on(this, 'mouseleave', () => {
        this.hovering = false;
        this.syncCycle();
      });

      // Box measurement (ResizeObserver) + phone focus switch.
      this.ro = new ResizeObserver(() => this.measure());
      this.ro.observe(this.frame);
      on(this.mq, 'change', () => this.layout());
      this.measure();

      this.renderReveal(true);

      if (this.reduced) {
        // Reduced motion: reveal = 1 immediately, no loop. (The source never sets onScreen here, so no auto-cycle either.)
        this.reveal = 1;
        this.eased = 1;
        this.renderReveal();
      } else {
        // Improvement: only run the rAF loop while the frame is on screen.
        this.io = new IntersectionObserver((entries) => {
          const e = entries[entries.length - 1];
          this.onScreen = e.isIntersecting;
          if (this.onScreen) this.startLoop();
          else {
            this.stopLoop();
            this.settle();
          }
          this.syncCycle();
        });
        this.io.observe(this.frame);
      }
    }

    disconnectedCallback() {
      this.stopLoop();
      clearInterval(this.timer);
      this.timer = 0;
      if (this.ro) this.ro.disconnect();
      if (this.io) this.io.disconnect();
      (this.cleanups || []).forEach((fn) => fn());
      this.cleanups = [];
    }

    target() {
      const r = this.frame.getBoundingClientRect();
      const vh = window.innerHeight;
      return clamp((vh - r.top) / (vh * 0.85), 0, 1);
    }

    startLoop() {
      if (this.raf) return;
      const loop = () => {
        const t = this.target();
        this.eased += (t - this.eased) * 0.08;
        if (Math.abs(t - this.eased) < 0.001) this.eased = t;
        if (Math.abs(this.reveal - this.eased) > 5e-4) {
          this.reveal = this.eased;
          this.renderReveal();
        }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }

    stopLoop() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
    }

    // Off screen: the source loop would keep easing to the clamped target; jump there instead.
    settle() {
      const t = this.target();
      this.eased = t;
      if (Math.abs(this.reveal - t) > 5e-4) {
        this.reveal = t;
        this.renderReveal();
      }
    }

    measure() {
      this.box = { w: this.frame.clientWidth, h: this.frame.clientHeight };
      this.setNarrow(this.box.w < 700);
      this.layout();
    }

    setNarrow(n) {
      if (n === this.narrow && this.hasAttribute('data-narrow') === n) return;
      this.narrow = n;
      this.toggleAttribute('data-narrow', n);
      if (n) {
        this.tags.forEach((t) => this.chips.appendChild(t));
        this.floats.forEach((f) => this.stack.appendChild(f));
      } else {
        this.tags.forEach((t) => this.frame.appendChild(t));
        this.floats.forEach((f) => this.frame.appendChild(f));
      }
      this.updateActive();
    }

    focusX() {
      return this.mq.matches ? this.focusPhone : this.focusDesktop;
    }

    // Cover-fit the photo inside the frame, anchored horizontally at focusX; place tags and floating cards.
    layout() {
      const { box, natural } = this;
      const scale = Math.max(box.w / natural.w, box.h / natural.h);
      const imgW = natural.w * scale;
      const imgH = natural.h * scale;
      const imgX = (box.w - imgW) * (clamp(this.focusX(), 0, 100) / 100);
      const imgY = (box.h - imgH) / 2;
      this.fit = { imgX, imgY, imgW, imgH };

      const s = this.photo.style;
      s.left = `${imgX}px`;
      s.top = `${imgY}px`;
      s.width = `${imgW}px`;
      s.height = `${imgH}px`;

      const cardWidth = this.narrow ? box.w : Math.min(320, box.w - 32);
      this.floats.forEach((f, i) => {
        const card = f.firstElementChild;
        if (this.narrow) {
          f.style.left = '';
          f.style.bottom = '';
          f.style.transformOrigin = '';
          if (card) card.style.width = '';
          return;
        }
        const pos = this.at(f);
        const left = clamp(pos.x - cardWidth / 2, 16, box.w - cardWidth - 16);
        f.style.left = `${left}px`;
        f.style.bottom = `${box.h - pos.y + 64}px`;
        f.style.transformOrigin = `${pos.x - left}px 100%`;
        if (card) card.style.width = `${cardWidth}px`;
      });

      this.tags.forEach((tag) => {
        if (this.narrow) return;
        const pos = this.at(tag);
        tag.style.left = `${pos.x}px`;
        tag.style.top = `${pos.y}px`;
      });

      this.renderClip();
      this.updateActive();
    }

    at(el) {
      const { imgX, imgY, imgW, imgH } = this.fit;
      const x = parseFloat(el.dataset.x);
      const y = parseFloat(el.dataset.y);
      return {
        x: imgX + (clamp(Number.isFinite(x) ? x : 0, 0, 100) / 100) * imgW,
        y: imgY + (clamp(Number.isFinite(y) ? y : 0, 0, 100) / 100) * imgH,
      };
    }

    renderClip() {
      const { box } = this;
      const p = 1 - (1 - this.reveal) ** 3;
      const side = (1 - p) * (this.narrow ? 0.08 : 0.2) * box.w;
      const inner = box.w - side * 2;
      const round = inner / 2 + (this.radius - inner / 2) * p;
      const clip = `inset(0px ${side.toFixed(1)}px 0px ${side.toFixed(1)}px round ${round.toFixed(1)}px ${round.toFixed(1)}px ${this.radius}px ${this.radius}px)`;
      this.clip.style.clipPath = clip;
      this.clip.style.webkitClipPath = clip;
      this.photo.style.transform = `scale(${(1.08 - 0.08 * p).toFixed(4)})`;
    }

    renderReveal() {
      this.renderClip();
      const revealed = this.reveal > 0.92;
      if (revealed !== this.revealed) {
        this.revealed = revealed;
        this.toggleAttribute('data-revealed', revealed);
        this.updateActive();
        this.syncCycle();
      }
    }

    select(i) {
      this.active = i;
      this.updateActive();
    }

    updateActive() {
      this.tags.forEach((tag, i) => {
        const on = i === this.active;
        tag.toggleAttribute('data-on', on);
        tag.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (this.narrow) {
          tag.style.transform = '';
          tag.style.left = '';
          tag.style.top = '';
        } else {
          const rot = on ? 0 : i % 2 === 0 ? -4 : 3;
          tag.style.transform = `translate(-50%, -100%) translateY(${on ? -8 : 0}px) rotate(${rot}deg)`;
          if (this.fit) {
            const pos = this.at(tag);
            tag.style.left = `${pos.x}px`;
            tag.style.top = `${pos.y}px`;
          }
        }
      });
      this.floats.forEach((f, i) => {
        // Narrow mode always shows the single active card; wide mode waits for the reveal.
        const shown = i === this.active && (this.narrow || this.revealed);
        f.toggleAttribute('data-shown', shown);
        // Inactive cards leave the tab order and accessibility tree (CSS hides them after the fade).
        if (shown) f.removeAttribute('inert');
        else f.setAttribute('inert', '');
      });
    }

    // Auto-cycle while revealed, on screen and not hovered.
    syncCycle() {
      const should = !this.hovering && !this.focusIn && !this.editorPaused && this.revealed && this.onScreen && this.tags.length >= 2;
      if (should && !this.timer) {
        this.timer = setInterval(() => this.select((this.active + 1) % this.tags.length), Math.max(2, this.cycle) * 1000);
      } else if (!should && this.timer) {
        clearInterval(this.timer);
        this.timer = 0;
      }
    }
  }

  // Each word slides in from its side as it rises into view: useScroll offset ["start end", "end end"],
  // x: from -> 0 and opacity .2 -> 1, linear.
  class ScrollWords extends HTMLElement {
    connectedCallback() {
      this.from = parseFloat(this.dataset.from) || 0;
      if (reducedMotion()) {
        // Static end state.
        this.style.transform = '';
        this.style.opacity = '1';
        return;
      }
      this.queued = false;
      this.visible = false;
      this.onScroll = () => {
        if (this.queued) return;
        this.queued = true;
        requestAnimationFrame(() => {
          this.queued = false;
          this.update();
        });
      };
      this.io = new IntersectionObserver((entries) => {
        const e = entries[entries.length - 1];
        const was = this.visible;
        this.visible = e.isIntersecting;
        if (this.visible && !was) {
          window.addEventListener('scroll', this.onScroll, { passive: true });
          window.addEventListener('resize', this.onScroll);
        } else if (!this.visible && was) {
          window.removeEventListener('scroll', this.onScroll);
          window.removeEventListener('resize', this.onScroll);
        }
        this.update(); // clamps to the end state when it has scrolled past
      });
      this.io.observe(this);
      this.update();
    }

    disconnectedCallback() {
      if (this.io) this.io.disconnect();
      if (this.onScroll) {
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('resize', this.onScroll);
      }
    }

    update() {
      const r = this.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = r.height > 0 ? clamp((vh - r.top) / r.height, 0, 1) : 1;
      this.style.transform = `translateX(${this.from * (1 - progress)}px)`;
      this.style.opacity = String(0.2 + 0.8 * progress);
    }
  }

  if (!customElements.get('campaign-moods')) customElements.define('campaign-moods', CampaignMoods);
  if (!customElements.get('scroll-words')) customElements.define('scroll-words', ScrollWords);
})();
