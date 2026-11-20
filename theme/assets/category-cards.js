/*
 * <category-cards>: hover/focus opens a card and it stays open (components/home/Flavours.tsx).
 * The first card is server-rendered open; all visuals are CSS ([data-open] + media queries).
 */
class CategoryCards extends HTMLElement {
  connectedCallback() {
    this.cards = Array.from(this.querySelectorAll('[data-card]'));
    if (!this.cards.length) return;
    if (!this.querySelector('[data-card][data-open]')) this.open(this.cards[0]);
    this.addEventListener('mouseenter', (e) => this.onEnter(e), true);
    this.addEventListener('focusin', (e) => this.onFocus(e));
  }

  onEnter(e) {
    const card = e.target instanceof Element ? e.target.closest('[data-card]') : null;
    if (card && card.parentElement === this) this.open(card);
  }

  onFocus(e) {
    const card = e.target instanceof Element ? e.target.closest('[data-card]') : null;
    if (!card) return;
    let visible = true;
    try {
      visible = e.target.matches(':focus-visible');
    } catch (_) {}
    if (visible) this.open(card);
  }

  open(card) {
    for (const c of this.cards) {
      if (c === card) c.setAttribute('data-open', '');
      else c.removeAttribute('data-open');
    }
  }
}

if (!customElements.get('category-cards')) customElements.define('category-cards', CategoryCards);
