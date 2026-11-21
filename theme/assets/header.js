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
      if (!this.isOpen()) return
      if (e.key === 'Escape') {
        this.set(false)
        this.toggle.focus()
        return
      }
      if (e.key === 'Tab') this.trapTab(e)
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

  // Focus trap group while the drawer is open: the toggle button + the drawer's
  // links. Mirrors cart-drawer.js focusables(), scoped to toggle + drawer.
  focusables() {
    const links = Array.from(this.drawer.querySelectorAll('a[href]')).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    )
    return [this.toggle, ...links]
  }

  trapTab(e) {
    const items = this.focusables()
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    const index = items.indexOf(active)
    if (index === -1) {
      e.preventDefault()
      first.focus()
    } else if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  set(open) {
    this.pill.toggleAttribute('data-open', open)
    this.toggle.setAttribute('aria-expanded', String(open))
    this.toggle.setAttribute('aria-label', open ? this.labelClose : this.labelOpen)
    this.drawer.inert = !open
  }
}

if (!customElements.get('site-header')) customElements.define('site-header', SiteHeader)
