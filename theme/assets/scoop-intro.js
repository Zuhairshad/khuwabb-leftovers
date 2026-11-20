// <scoop-intro>: removes the server-rendered overlay when it has finished, and
// clears html[data-intro-playing] (the header and the compare tool rely on it).
class ScoopIntro extends HTMLElement {
  connectedCallback() {
    const root = document.documentElement;
    if (!root.hasAttribute('data-intro-playing')) {
      this.remove();
      return;
    }
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const total = parseFloat(this.dataset.total) || 4.6;
    this.timer = setTimeout(() => this.finish(), (reduced ? 0.8 : total) * 1000 + 80);
  }

  disconnectedCallback() {
    clearTimeout(this.timer);
  }

  finish() {
    document.documentElement.removeAttribute('data-intro-playing');
    this.remove();
  }
}

if (!customElements.get('scoop-intro')) customElements.define('scoop-intro', ScoopIntro);
