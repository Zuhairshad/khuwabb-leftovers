/*
 * <cart-drawer>: bag drawer behaviour (components/Bag.tsx BagDrawer + BagButton effects).
 * Open on 'khuwabb-bag-open'; close on scrim, close button, Escape, empty CTA.
 * Focus trap + restore, inert/aria-hidden when closed (G15), scroll lock on <html>.
 * Re-renders from the Section Rendering HTML delivered in 'khuwabb-bag-change'.
 */
class CartDrawer extends HTMLElement {
  connectedCallback() {
    this.layer = this.querySelector('[data-layer]')
    this.panel = this.querySelector('[data-bag-drawer]')
    if (!this.layer || !this.panel) return
    this.count = parseInt(this.dataset.count, 10) || 0
    this.opener = null
    this.previousOverflow = null
    this.bumpTimer = null

    this.onOpen = () => this.open()
    this.onChange = (e) => this.handleChange(e.detail || {})
    this.onKey = (e) => this.handleKey(e)
    this.onClick = (e) => this.handleClick(e)
    this.onPageShow = (e) => {
      if (e.persisted && window.Khuwabb && window.Khuwabb.cart) window.Khuwabb.cart.refresh().catch(() => {})
    }
    this.onSelect = (e) => {
      if (e.detail && e.detail.sectionId && this.closest('[id$="' + e.detail.sectionId + '"]')) this.open()
    }
    this.onDeselect = (e) => {
      if (e.detail && e.detail.sectionId && this.closest('[id$="' + e.detail.sectionId + '"]')) this.close(false)
    }

    document.addEventListener('khuwabb-bag-open', this.onOpen)
    document.addEventListener('khuwabb-bag-change', this.onChange)
    document.addEventListener('keydown', this.onKey)
    window.addEventListener('pageshow', this.onPageShow)
    document.addEventListener('shopify:section:select', this.onSelect)
    document.addEventListener('shopify:section:deselect', this.onDeselect)
    this.addEventListener('click', this.onClick)
    this.setOpen(false)
  }

  disconnectedCallback() {
    document.removeEventListener('khuwabb-bag-open', this.onOpen)
    document.removeEventListener('khuwabb-bag-change', this.onChange)
    document.removeEventListener('keydown', this.onKey)
    window.removeEventListener('pageshow', this.onPageShow)
    document.removeEventListener('shopify:section:select', this.onSelect)
    document.removeEventListener('shopify:section:deselect', this.onDeselect)
    this.removeEventListener('click', this.onClick)
    clearTimeout(this.bumpTimer)
    this.unlock()
  }

  isOpen() {
    return this.layer.hasAttribute('data-open')
  }

  setOpen(open) {
    this.layer.toggleAttribute('data-open', open)
    this.panel.toggleAttribute('data-open', open)
    this.layer.inert = !open
    this.layer.setAttribute('aria-hidden', String(!open))
  }

  open() {
    if (this.isOpen()) return
    const active = document.activeElement
    this.opener = active && active !== document.body ? active : null
    this.setOpen(true)
    this.lock()
    const close = this.querySelector('[data-close-button]')
    // Next frame so the layer is no longer inert and the slide starts first.
    requestAnimationFrame(() => close && close.focus({ preventScroll: true }))
  }

  close(restore = true) {
    if (!this.isOpen()) return
    this.setOpen(false)
    this.unlock()
    const opener = this.opener
    this.opener = null
    if (!restore) return
    const fallback = document.querySelector('[data-bag-button]')
    const target = opener && document.contains(opener) ? opener : fallback
    if (target) target.focus({ preventScroll: true })
  }

  lock() {
    if (this.previousOverflow !== null) return
    const root = document.documentElement
    this.previousOverflow = root.style.overflow
    root.style.overflow = 'hidden'
  }

  unlock() {
    if (this.previousOverflow === null) return
    document.documentElement.style.overflow = this.previousOverflow
    this.previousOverflow = null
  }

  focusables() {
    return Array.from(
      this.panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null || el === document.activeElement)
  }

  handleKey(e) {
    if (!this.isOpen()) return
    if (e.key === 'Escape') {
      this.close()
      return
    }
    if (e.key !== 'Tab') return
    const items = this.focusables()
    if (!items.length) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (!this.panel.contains(active)) {
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

  handleClick(e) {
    const target = e.target
    if (target.closest('[data-checkout]')) {
      const link = target.closest('[data-checkout]')
      if (link.getAttribute('aria-disabled') === 'true' || !link.getAttribute('href')) e.preventDefault()
      return
    }
    if (target.closest('[data-close]')) {
      this.close()
      return
    }
    const control = target.closest('[data-action]')
    if (!control || control.disabled) return
    const line = control.closest('[data-line]')
    if (!line) return
    this.changeLine(line, control.dataset.action)
  }

  changeLine(line, action) {
    const cart = window.Khuwabb && window.Khuwabb.cart
    if (!cart) return
    const key = line.dataset.lineKey
    const quantity = parseInt(line.dataset.quantity, 10) || 0
    const next = action === 'inc' ? quantity + 1 : action === 'dec' ? Math.max(0, quantity - 1) : 0
    const error = line.querySelector('[data-line-error]')
    if (error) error.textContent = ''
    cart
      .change(key, next)
      .then(() => this.restoreFocus(key, action))
      .catch((err) => {
        const current = this.querySelector('[data-line-key="' + CSS.escape(key) + '"] [data-line-error]')
        const strings = (window.Khuwabb && window.Khuwabb.strings) || {}
        if (current) current.textContent = (err && (err.description || err.message)) || strings.cartError || ''
      })
  }

  // After a swap, put focus on the equivalent control (same line + action), else the list/close button.
  restoreFocus(key, action) {
    if (!this.isOpen()) return
    const line = this.querySelector('[data-line-key="' + CSS.escape(key) + '"]')
    let target = null
    if (line) {
      target = line.querySelector('[data-action="' + action + '"]:not([disabled])') || line.querySelector('[data-action="remove"]')
    }
    if (!target) target = this.querySelector('[data-line] [data-action="remove"]') || this.querySelector('[data-close-button]')
    if (target) target.focus({ preventScroll: true })
  }

  handleChange(detail) {
    const html = detail.sections && detail.sections['cart-drawer']
    if (html) {
      this.swap(html)
      this.announce()
    }
    const cart = detail.cart
    if (!cart || typeof cart.item_count !== 'number') return
    const count = cart.item_count
    this.updateHeader(count)
    this.count = count
    this.dataset.count = String(count)
  }

  swap(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const next = doc.querySelector('[data-drawer-inner]')
    const current = this.querySelector('[data-drawer-inner]')
    if (!next || !current) return
    const scroll = current.querySelector('.cart-drawer__list')
    const top = scroll ? scroll.scrollTop : 0
    current.innerHTML = next.innerHTML
    const list = current.querySelector('.cart-drawer__list')
    if (list) list.scrollTop = top
  }

  // Polite live region (outside the swapped markup): "Bag, 2 items · Subtotal Rs.5,000".
  announce() {
    const live = this.querySelector('[data-drawer-live]')
    if (!live) return
    const strings = (window.Khuwabb && window.Khuwabb.strings) || {}
    const count = parseInt(this.querySelector('[data-drawer-count]')?.textContent, 10) || 0
    const subtotal = this.querySelector('.cart-drawer__subtotal')
    let text = this.querySelector('.cart-drawer__empty-text')?.textContent.trim() || ''
    if (count > 0) {
      const template = (count === 1 ? strings.bagButtonOne : strings.bagButton) || ''
      text = template.replace('[count]', String(count))
      if (subtotal) text += ' · ' + Array.from(subtotal.children).map((s) => s.textContent.trim()).join(' ')
    }
    live.textContent = ''
    requestAnimationFrame(() => {
      live.textContent = text
    })
  }

  updateHeader(count) {
    const strings = (window.Khuwabb && window.Khuwabb.strings) || {}
    document.querySelectorAll('[data-bag-count]').forEach((badge) => {
      badge.textContent = String(count)
      if (count > this.count) {
        badge.setAttribute('data-bump', '')
        clearTimeout(this.bumpTimer)
        this.bumpTimer = setTimeout(() => badge.removeAttribute('data-bump'), 600)
      }
    })
    document.querySelectorAll('[data-bag-button]').forEach((button) => {
      const template = count === 1 ? strings.bagButtonOne || strings.bagButton : strings.bagButton
      if (template) button.setAttribute('aria-label', template.replace('[count]', String(count)))
    })
  }
}

if (!customElements.get('cart-drawer')) customElements.define('cart-drawer', CartDrawer)
