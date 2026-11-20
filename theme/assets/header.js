/*
 * <site-header>: phone menu drawer + bag button wiring.
 * Visuals (entrance, spring, hamburger) are CSS; this toggles state only.
 * Phone drawer: data-open on the pill, aria-expanded + label on the toggle,
 * inert when closed, Escape / link click / resize to desktop closes it.
 */
class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.pill = this.querySelector('[data-pill]')
    this.toggle = this.querySelector('[data-menu-toggle]')
    this.drawer = this.querySelector('.site-header__drawer')
    this.bag = this.querySelector('[data-bag-button]')
    if (!this.pill || !this.toggle || !this.drawer) return

    this.labelOpen = this.dataset.labelOpen || 'Open menu'
    this.labelClose = this.dataset.labelClose || 'Close menu'
    this.desktop = window.matchMedia('(min-width: 810px)')

    this.onToggle = () => this.set(!this.isOpen())
    this.onKey = (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.set(false)
        this.toggle.focus()
      }
    }
    this.onDrawerClick = (e) => {
      if (e.target.closest('a')) this.set(false)
    }
    this.onBag = () => document.dispatchEvent(new CustomEvent('khuwabb-bag-open'))
    this.onMedia = (e) => {
      if (e.matches) this.set(false)
    }

    this.toggle.addEventListener('click', this.onToggle)
    this.drawer.addEventListener('click', this.onDrawerClick)
    document.addEventListener('keydown', this.onKey)
    if (this.bag) this.bag.addEventListener('click', this.onBag)
    this.desktop.addEventListener('change', this.onMedia)

    this.set(false)
  }

  disconnectedCallback() {
    if (!this.toggle) return
    this.toggle.removeEventListener('click', this.onToggle)
    this.drawer.removeEventListener('click', this.onDrawerClick)
    document.removeEventListener('keydown', this.onKey)
    if (this.bag) this.bag.removeEventListener('click', this.onBag)
    this.desktop.removeEventListener('change', this.onMedia)
  }

  isOpen() {
    return this.pill.hasAttribute('data-open')
  }

  set(open) {
    this.pill.toggleAttribute('data-open', open)
    this.toggle.setAttribute('aria-expanded', String(open))
    this.toggle.setAttribute('aria-label', open ? this.labelClose : this.labelOpen)
    this.drawer.inert = !open
  }
}

if (!customElements.get('site-header')) customElements.define('site-header', SiteHeader)
