/*
 * <product-form>: port of components/product/ProductDetail.tsx state (colour, size, view, added).
 * Reads the product JSON (snippets/product-json.liquid) and string table embedded in the element.
 * Pure state logic lives in window.Khuwabb.productLogic (also used by the throwaway unit test).
 */
;(function () {
  var K = (window.Khuwabb = window.Khuwabb || {})
  var VIEWS = ['front', 'side', 'back']

  var logic = {
    // lib/catalog.ts canOrder: the exact colour + size variant exists and is available.
    canOrder: function (p, colour, size) {
      var v = p.variants[colour + ' / ' + size]
      return !!v && v.available === true
    },
    colourOf: function (p, name) {
      for (var i = 0; i < p.colours.length; i++) if (p.colours[i].name === name) return p.colours[i]
      return p.colours[0] || null
    },
    // Views the colour has photos for, in source order.
    viewsOf: function (colour) {
      return VIEWS.filter(function (v) {
        return colour && colour.views && colour.views[v]
      })
    },
    // src = views[view] ?? front (the source keeps a stale `view` state when a colour lacks it).
    imageFor: function (colour, view) {
      if (!colour || !colour.views) return null
      return colour.views[view] || colour.views.front || null
    },
    // ?colour= : exact, case-sensitive; URLSearchParams decodes both + and %20.
    colourFromSearch: function (p, search) {
      var wanted = new URLSearchParams(search).get('colour')
      if (!wanted) return null
      for (var i = 0; i < p.colours.length; i++) if (p.colours[i].name === wanted) return wanted
      return null
    },
    // ProductDetail.tsx:111 label order.
    state: function (p, colour, size, added) {
      var orderableHere = p.sizes.some(function (s) {
        return logic.canOrder(p, colour, s)
      })
      var ready = !!size && logic.canOrder(p, colour, size)
      var key = !orderableHere
        ? 'sold_out_colour'
        : !size
          ? 'choose_size'
          : ready
            ? added
              ? 'added'
              : 'add_to_bag'
            : 'sold_out_size'
      return { orderableHere: orderableHere, ready: ready, labelKey: key }
    },
    // Keep a preselected size only if that colour + size variant exists (?variant= / ?colour= combos).
    initialSize: function (p, colour, size) {
      return size && p.variants[colour + ' / ' + size] ? size : ''
    },
    // Smallest srcset candidate (the source uses atLeast(src, 150)).
    thumbSrc: function (entry) {
      var first = String(entry.srcset || '').split(',')[0].trim().split(' ')[0]
      return first || entry.src
    }
  }
  K.productLogic = logic

  if (typeof HTMLElement === 'undefined' || typeof customElements === 'undefined') return

  class ProductForm extends HTMLElement {
    connectedCallback() {
      if (this._ready) return
      this._ready = true
      var json = this.querySelector('script[data-product-json]')
      var strings = this.querySelector('script[data-strings]')
      if (!json) return
      this.p = JSON.parse(json.textContent)
      this.t = strings ? JSON.parse(strings.textContent) : {}
      this.root = this.closest('[data-section="product"]')
      this.gallery = this.querySelector('[data-gallery]')
      this.media = this.querySelector('.product__media')
      this.legend = this.querySelector('[data-colour-label]')
      this.addBtn = this.querySelector('[data-add-to-bag]')
      this.addLabel = this.querySelector('[data-add-label]') || this.addBtn
      var nojs = this.querySelector('[data-nojs-label]')
      if (nojs) nojs.remove()
      this.form = this.querySelector('[data-add-form]')
      this.idInput = this.querySelector('[data-variant-id]')
      this.errorEl = this.querySelector('[data-error]')
      this.live = this.querySelector('[data-live]')
      this.announce = false
      this.note = this.querySelector('[data-restock]')
      this.showThumbs = this.getAttribute('data-show-thumbs') !== 'false'

      this.colour = this.getAttribute('data-colour') || (this.p.colours[0] && this.p.colours[0].name) || ''
      this.size = logic.initialSize(this.p, this.colour, this.getAttribute('data-size') || '')
      this.view = 'front'
      this.added = false
      this.busy = false
      // The server already rendered the first colour's photo and thumbs; only re-render them if
      // ?colour= (inline script) picked another colour.
      this.imgKey = this.colour === this.getAttribute('data-server-colour') ? (logic.imageFor(logic.colourOf(this.p, this.colour), this.view) || {}).src : null
      this.thumbKey = this.colour === this.getAttribute('data-server-colour') ? this.viewsKey() : null

      this.addEventListener('click', this.onClick.bind(this))
      if (this.form) this.form.addEventListener('submit', this.onSubmit.bind(this))
      this.render()
      if (this.root) this.root.removeAttribute('data-pending')
    }

    viewsKey() {
      return this.colour + ':' + logic.viewsOf(logic.colourOf(this.p, this.colour)).join(',')
    }

    onClick(e) {
      var t = e.target.closest('button')
      if (!t || !this.contains(t) || t.type === 'submit') return
      if (t.hasAttribute('data-option-colour')) {
        this.colour = t.getAttribute('data-option-colour')
        this.added = false
      } else if (t.hasAttribute('data-option-size')) {
        this.size = t.getAttribute('data-option-size')
        this.added = false
      } else if (t.hasAttribute('data-view')) {
        this.view = t.getAttribute('data-view')
      } else return
      this.setError('')
      this.announce = true
      this.render()
    }

    onSubmit(e) {
      var s = logic.state(this.p, this.colour, this.size, this.added)
      var cart = K.cart
      if (!cart || typeof cart.add !== 'function') {
        if (!s.ready) e.preventDefault()
        return // no cart.js: let the real form post to /cart/add
      }
      e.preventDefault()
      if (!s.ready || this.busy) return
      var v = this.p.variants[this.colour + ' / ' + this.size]
      this.busy = true
      this.setError('')
      cart
        .add([{ id: v.id, quantity: 1 }])
        .then(
          function () {
            this.added = true
          }.bind(this),
          function (err) {
            this.setError((err && err.message) || (K.strings && K.strings.cartError) || '')
          }.bind(this)
        )
        .then(
          function () {
            this.busy = false
            this.announce = true
            this.render()
          }.bind(this)
        )
    }

    // Visually-hidden " - sold out" suffix inside option buttons (buttons stay clickable).
    markSoldOut(b, out) {
      var el = b.querySelector('[data-sold-out-text]')
      if (out && !el) {
        el = document.createElement('span')
        el.className = 'visually-hidden'
        el.setAttribute('data-sold-out-text', '')
        el.textContent = ' \u2013 ' + String(this.t.sold_out || 'Sold out').toLowerCase()
        b.appendChild(el)
      } else if (!out && el) el.remove()
    }

    setError(msg) {
      if (!this.errorEl) return
      this.errorEl.textContent = msg
      this.errorEl.hidden = !msg
    }

    render() {
      var p = this.p
      var colour = logic.colourOf(p, this.colour)
      var s = logic.state(p, this.colour, this.size, this.added)

      if (this.legend) this.legend.textContent = this.colour
      this.querySelectorAll('[data-option-colour]').forEach(
        function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-option-colour') === this.colour))
          this.markSoldOut(b, !logic.state(p, b.getAttribute('data-option-colour'), '', false).orderableHere)
        }.bind(this)
      )
      this.querySelectorAll('[data-option-size]').forEach(
        function (b) {
          var sz = b.getAttribute('data-option-size')
          b.setAttribute('aria-pressed', String(sz === this.size))
          var out = !logic.canOrder(p, this.colour, sz)
          b.toggleAttribute('data-unavailable', out)
          this.markSoldOut(b, out)
        }.bind(this)
      )

      this.renderImage(colour)
      this.renderThumbs(colour)

      if (this.addBtn) {
        var label = this.t[s.labelKey] || ''
        var changed = this.addLabel.textContent !== label
        this.addLabel.textContent = label
        // aria-disabled (not disabled) keeps the button in the tab order; onSubmit ignores clicks.
        this.addBtn.removeAttribute('disabled')
        this.addBtn.setAttribute('aria-disabled', String(!s.ready))
        if (this.live && this.announce && (changed || s.labelKey === 'added')) {
          this.live.textContent = ''
          this.live.textContent = label
        }
        this.addBtn.removeAttribute('data-inactive')
      }
      this.announce = false
      if (this.note) this.note.hidden = s.orderableHere

      // Theme improvement: reflect a full colour + size choice in the URL / no-JS form field.
      var v = this.size ? p.variants[this.colour + ' / ' + this.size] : null
      if (v && this.idInput) this.idInput.value = v.id
      try {
        var url = new URL(window.location.href)
        if (v) url.searchParams.set('variant', v.id)
        else if (url.searchParams.has('variant')) url.searchParams.delete('variant')
        else return
        window.history.replaceState(null, '', url.pathname + url.search + url.hash)
      } catch (e) {}
    }

    renderImage(colour) {
      var entry = logic.imageFor(colour, this.view)
      if (!entry || !this.gallery || entry.src === this.imgKey) {
        this.updateAlt()
        return
      }
      this.imgKey = entry.src
      var old = this.gallery.querySelector('img')
      var img = document.createElement('img')
      img.src = entry.src
      img.srcset = entry.srcset
      img.sizes = (old && old.getAttribute('sizes')) || '(max-width: 809px) 70vw, 440px'
      if (entry.width) img.width = entry.width
      if (entry.height) img.height = entry.height
      img.setAttribute('fetchpriority', 'high')
      img.alt = this.altText()
      // A new node restarts the photo-in animation (React key={src}).
      if (old) old.replaceWith(img)
      else this.gallery.appendChild(img)
    }

    altText() {
      return this.p.title + ' in ' + this.colour + ', ' + this.view + ' view'
    }

    updateAlt() {
      var img = this.gallery && this.gallery.querySelector('img')
      if (img) img.alt = this.altText()
    }

    renderThumbs(colour) {
      if (!this.showThumbs || !this.media) return
      var views = logic.viewsOf(colour)
      var wrap = this.media.querySelector('[data-views]')
      var key = this.viewsKey()
      if (views.length <= 1) {
        if (wrap) wrap.remove()
        this.thumbKey = key
        return
      }
      if (!wrap || key !== this.thumbKey) {
        if (wrap) wrap.remove()
        wrap = document.createElement('div')
        wrap.className = 'product__views'
        wrap.setAttribute('role', 'group')
        wrap.setAttribute('aria-label', this.t.photos || 'Photos')
        wrap.setAttribute('data-views', '')
        views.forEach(
          function (v) {
            var b = document.createElement('button')
            b.type = 'button'
            b.setAttribute('data-view', v)
            b.setAttribute('aria-label', (this.t.view_label || '{view} view').replace('{view}', v))
            if (this.p.tint) b.style.background = this.p.tint
            var im = document.createElement('img')
            im.src = logic.thumbSrc(colour.views[v])
            im.alt = ''
            im.decoding = 'async'
            im.loading = 'lazy'
            b.appendChild(im)
            wrap.appendChild(b)
          }.bind(this)
        )
        this.media.appendChild(wrap)
        this.thumbKey = key
      }
      wrap.querySelectorAll('button').forEach(
        function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === this.view))
        }.bind(this)
      )
    }
  }

  if (!customElements.get('product-form')) customElements.define('product-form', ProductForm)
})()
