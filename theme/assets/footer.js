/*
 * Footer custom elements: <newsletter-form> (components/NewsletterForm.tsx)
 * and <fitting-curtain> (components/FittingCurtain.tsx).
 * Gradients are rendered server-side (snippets/fitting-curtain.liquid); this
 * file only toggles state attributes that section-footer.css reacts to.
 */
(function () {
  if (!customElements.get('newsletter-form')) {
    var IS_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    class NewsletterForm extends HTMLElement {
      connectedCallback() {
        this.input = this.querySelector('input[type="email"]');
        this.form = this.closest('form');
        if (!this.input || !this.form) return;

        this.onSubmit = (event) => {
          var value = this.input.value.trim();
          if (!IS_EMAIL.test(value)) {
            event.preventDefault();
            this.setAttribute('data-state', 'bad');
            return;
          }
          this.input.value = value;
          this.setAttribute('data-state', 'sending');
        };
        this.onInput = () => {
          if (this.getAttribute('data-state') === 'bad') this.setAttribute('data-state', 'idle');
        };
        this.onPageShow = (event) => {
          // Back/forward cache: never leave the button stuck in "sending".
          if (event.persisted && this.getAttribute('data-state') === 'sending') {
            this.setAttribute('data-state', 'idle');
          }
        };

        this.form.addEventListener('submit', this.onSubmit);
        this.input.addEventListener('input', this.onInput);
        window.addEventListener('pageshow', this.onPageShow);
      }

      disconnectedCallback() {
        if (this.form) this.form.removeEventListener('submit', this.onSubmit);
        if (this.input) this.input.removeEventListener('input', this.onInput);
        window.removeEventListener('pageshow', this.onPageShow);
      }
    }

    customElements.define('newsletter-form', NewsletterForm);
  }

  if (!customElements.get('fitting-curtain')) {
    class FittingCurtain extends HTMLElement {
      connectedCallback() {
        var threshold = parseFloat(this.getAttribute('data-threshold'));
        threshold = Math.max(0, Math.min(1, isNaN(threshold) ? 0.3 : threshold));
        var replay = this.hasAttribute('data-replay');

        // Edge: element width < 640 uses the narrow edge.
        var setCompact = () => {
          this.toggleAttribute('data-compact', this.getBoundingClientRect().width < 640);
        };
        setCompact();
        if (typeof ResizeObserver !== 'undefined') {
          this.ro = new ResizeObserver(setCompact);
          this.ro.observe(this);
        }

        // Reduced motion: open immediately.
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          this.setAttribute('data-open', '');
          return;
        }

        if (typeof IntersectionObserver === 'undefined') {
          this.setAttribute('data-open', '');
          return;
        }

        this.io = new IntersectionObserver(
          (entries) => {
            var entry = entries[0];
            if (!entry) return;
            if (entry.isIntersecting) {
              this.setAttribute('data-open', '');
            } else if (replay && entry.boundingClientRect.top > 0) {
              // Close only when it leaves through the bottom (scrolled back up).
              this.removeAttribute('data-open');
            }
          },
          { threshold: threshold }
        );
        this.io.observe(this);
      }

      disconnectedCallback() {
        if (this.ro) this.ro.disconnect();
        if (this.io) this.io.disconnect();
      }
    }

    customElements.define('fitting-curtain', FittingCurtain);
  }
})();
