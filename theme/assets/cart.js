/*
 * window.Khuwabb.cart: thin wrapper over the Shopify Cart AJAX API + Section Rendering API.
 * Replaces lib/bag.ts (localStorage). Events keep the source names:
 *   document 'khuwabb-bag-change'  detail: { cart, sections }  after every mutation
 *   document 'khuwabb-bag-open'    after add()
 * Errors reject with { status, message, description } (422 out-of-stock etc.).
 */
;(function () {
  var K = (window.Khuwabb = window.Khuwabb || {})
  var routes = K.routes || {}
  var SECTION = 'cart-drawer'

  function endpoint(base, fallback) {
    var url = base || fallback
    return /\.js(\?|$)/.test(url) ? url : url.replace(/\/$/, '') + '.js'
  }
  var ADD = endpoint(routes.cartAdd, '/cart/add')
  var CHANGE = endpoint(routes.cartChange, '/cart/change')
  var CART = endpoint(routes.cart, '/cart')

  function fail(status, data) {
    var strings = K.strings || {}
    data = data || {}
    return {
      status: status,
      message: data.message || strings.cartError || 'Something went wrong. Please try again.',
      description: data.description || ''
    }
  }

  function request(url, options) {
    return fetch(url, options).then(
      function (res) {
        return res.json().then(
          function (data) {
            if (!res.ok) throw fail(res.status, data)
            return data
          },
          function () {
            throw fail(res.status, null)
          }
        )
      },
      function () {
        throw fail(0, null)
      }
    )
  }

  function post(url, body) {
    return request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    })
  }

  function getCart() {
    return request(CART, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail }))
  }

  // Mutations run one at a time so quick stepper clicks can't race each other.
  var queue = Promise.resolve()
  function enqueue(job) {
    var run = queue.then(job)
    queue = run.catch(function () {})
    return run
  }

  function finish(cart, sections) {
    emit('khuwabb-bag-change', { cart: cart, sections: sections || {} })
    return cart
  }

  var cart = {
    /** items: [{ id: variantId, quantity }] */
    add: function (items) {
      return enqueue(function () {
        return post(ADD, { items: items, sections: SECTION }).then(function (added) {
          return getCart().then(function (c) {
            finish(c, added.sections)
            emit('khuwabb-bag-open')
            return c
          })
        })
      })
    },
    /** key: line item key; quantity 0 removes the line. */
    change: function (key, quantity) {
      return enqueue(function () {
        return post(CHANGE, { id: key, quantity: quantity, sections: SECTION }).then(function (c) {
          var sections = c.sections
          delete c.sections
          return finish(c, sections)
        })
      })
    },
    /** Current cart (no event). */
    get: function () {
      return getCart()
    },
    /** Re-fetch cart + drawer HTML and announce it (e.g. after bfcache restore). */
    refresh: function () {
      return enqueue(function () {
        return Promise.all([
          getCart(),
          request(routes.cart + '?sections=' + SECTION, { headers: { Accept: 'application/json' }, cache: 'no-store' })
        ]).then(function (r) {
          return finish(r[0], r[1])
        })
      })
    }
  }

  K.cart = cart
})()
