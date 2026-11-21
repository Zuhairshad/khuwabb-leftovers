/*
 * <hero-reels> and <look-chooser>: vanilla port of components/ScoopReels.tsx (docs/audit.md 5.3).
 * Two horizontal reels (tops, bottoms) of cut-out pieces on a curved track. Rows can be dragged or
 * tapped; Shuffle spins them to a new outfit and steps the flavour backdrop. Everything moves from
 * one rAF loop that writes transforms straight to the DOM. The server-rendered markup and the JSON
 * payload come from sections/hero-reels.liquid. Parity table: docs/parity/hero-reels.md.
 *
 * Line references (ScoopReels.tsx:NN) point at the React source each block was ported from.
 */
;(function () {
  // Kept as a named hook so visual tests can seed the shuffle (mapping G23). Always called at call time.
  window.reelsRandom = window.reelsRandom || Math.random
  var rnd = function () {
    return window.reelsRandom()
  }

  var ROWS = ['tops', 'bottoms'] // the source also has "shoes"; Khuwabb sells none (Hero.tsx:45), so it is dropped
  var SPIN_DIR = { tops: 1, bottoms: -1 } // :36
  var MOBILE = 640 // :37

  // ---- pure maths (:39-107) ------------------------------------------------
  var clamp = function (v, lo, hi) {
    return Math.min(hi, Math.max(lo, v))
  }
  var backOut = function (t, s) {
    if (s === undefined) s = 0.9
    return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2)
  }
  var cubicOut = function (t) {
    return 1 - Math.pow(1 - t, 3)
  }
  // Signed distance on a ring of n slots, in (-n/2, n/2].
  var wrap = function (d, n) {
    var r = ((d % n) + n) % n
    if (r >= n / 2) r -= n
    return r
  }

  function rowLayout(row, width, height, cfg) {
    var mobile = width < MOBILE
    var top = Math.max(height * clamp(cfg.topInset, 0, 0.4), mobile ? cfg.topSpaceMobile : cfg.topSpace)
    var bar = mobile ? 132 : 112
    var look = Math.max(120, height - top - bar) * clamp(cfg.lookScale, 0.5, 1.3)
    var y0 = top + (height - top - bar - look) / 2
    var spacing = clamp(cfg.spacing, 0.6, 1.8)
    // Without a shoe row the two garments grow into the space it leaves.
    var twoRows = !(cfg.shoes && cfg.shoes.length)
    var h, w
    if (row === 'tops') {
      h = look * (twoRows ? 0.44 : 0.42)
      w = Math.min(h * 0.92, width * (mobile ? 0.46 : 0.3))
      return { cy: y0 + h / 2, w: w, h: h, step: w * (mobile ? 1.02 : 1.18) * spacing }
    }
    if (row === 'bottoms') {
      // Two rows: the trousers start below the jacket row with a clear gap (top row ends at 44%, trousers start at 49%).
      h = look * (twoRows ? 0.51 : 0.47)
      w = Math.min(h * 0.7, width * (mobile ? 0.36 : 0.26))
      return { cy: y0 + look * (twoRows ? 0.49 : 0.385) + h / 2, w: w, h: h, step: w * (mobile ? 1.16 : 1.4) * spacing }
    }
    h = look * 0.13
    w = Math.min(h * 2.4, width * (mobile ? 0.44 : 0.2))
    return { cy: y0 + look * 0.855 + h / 2, w: w, h: h, step: w * (mobile ? 0.9 : 1.08) * spacing }
  }

  // Position of one piece on the curved track, `rel` slots from the centre.
  function slot(rel, layout, cfg, velocity) {
    var k = 0.34 * clamp(cfg.curve, 0, 2.5) + 1e-4
    var angle = rel * k
    var radius = layout.step / k
    var onTrack = Math.abs(angle) < 1.45
    var x = radius * Math.sin(clamp(angle, -1.5, 1.5))
    var depth = radius * (Math.cos(clamp(angle, -1.5, 1.5)) - 1)
    var persp = radius * 2.6 + 400
    var d = Math.abs(rel)
    return {
      x: x,
      scale: (persp / (persp - depth)) * (d < 1 ? 1 - 0.3 * d : 0.7 - 0.06 * (d - 1)),
      opacity: onTrack ? clamp(1.25 - d * 0.22, 0, 1) * clamp((1.45 - Math.abs(angle)) / 0.25, 0, 1) : 0,
      blur: clamp(d, 0, 2.5) * cfg.sideBlur + clamp(Math.abs(velocity) * 0.32, 0, 5.5),
      rotate: -angle * 22,
      z: Math.round(100 - d * 10)
    }
  }

  // Where a shuffle lands (:272-277). `nearestOff` = Math.round(row offset), `now` = centre index.
  function shuffleTo(n, dir, now, target, nearestOff, intro) {
    var ahead = dir > 0 ? (((target - now) % n) + n) % n : (((now - target) % n) + n) % n
    var laps = intro ? 0 : Math.max(1, Math.ceil(6 / n)) * n
    return nearestOff + dir * (laps + ahead)
  }

  // Indexes within `reach` slots of `offset` on a ring of n (:145).
  function near(offset, n, reach) {
    if (reach === undefined) reach = 1
    var out = new Set()
    for (var i = 0; i < n; i++) if (Math.abs(wrap(i - offset, n)) <= reach) out.add(i)
    return out
  }

  var K = (window.Khuwabb = window.Khuwabb || {})
  K.heroReels = { clamp: clamp, backOut: backOut, cubicOut: cubicOut, wrap: wrap, rowLayout: rowLayout, slot: slot, shuffleTo: shuffleTo, near: near }

  function formatMoney(cents) {
    if (typeof K.formatMoney === 'function') return K.formatMoney(cents)
    var prefix = typeof K.currencyPrefix === 'string' ? K.currencyPrefix : 'Rs.'
    return prefix + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(cents / 100)
  }

  // ---- <hero-reels> --------------------------------------------------------
  class HeroReels extends HTMLElement {
    connectedCallback() {
      if (this._disposer) return
      this._disposer = this._init()
    }

    disconnectedCallback() {
      if (this._disposer) this._disposer()
      this._disposer = null
    }

    _init() {
      var el = this
      var dataEl = el.querySelector('script[data-hero-reels-data]')
      var data
      try {
        data = JSON.parse(dataEl.textContent)
      } catch (e) {
        return null
      }
      // Rows arrive as { order: [id...], pieces: { id: { name, price, src?, srcset? } } } (each piece once).
      var expand = function (row) {
        var map = (row && row.pieces) || {}
        return ((row && row.order) || []).map(function (id) { return Object.assign({ id: id }, map[id]) })
      }
      var cfg = Object.assign({}, data.config, { tops: expand(data.tops), bottoms: expand(data.bottoms), shoes: [], flavours: data.flavours || [] })
      var pieces = { tops: cfg.tops, bottoms: cfg.bottoms }
      var flavours = cfg.flavours
      var strings = data.strings || {}
      var products = data.products || {}
      var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

      // The page intro (scoop-intro) is timed at introDelay; when it isn't playing (home_only /
      // once_per_session / theme editor) the reels start at once so the hero isn't empty for 3s.
      var introPlaying = document.documentElement.hasAttribute('data-intro-playing')
      var introDelayMs = introPlaying ? Math.max(0, cfg.introDelay) * 1000 : 0

      // ---- DOM handles
      var pieceEls = { tops: [], bottoms: [] }
      ROWS.forEach(function (row) {
        for (var i = 0; i < pieces[row].length; i++) pieceEls[row][i] = el.querySelector('.hero-reels__piece[data-row="' + row + '"][data-idx="' + i + '"]')
      })
      var tagSlots = {}
      var tagParts = {}
      ROWS.forEach(function (row) {
        var slotEl = el.querySelector('[data-tag-row="' + row + '"]')
        tagSlots[row] = slotEl
        if (slotEl) {
          var tag = slotEl.querySelector('.hero-reels__tag')
          tagParts[row] = { tag: tag, name: slotEl.querySelector('.hero-reels__tag-name'), price: slotEl.querySelector('.hero-reels__tag-price') }
        }
      })
      var hitEls = {}
      ROWS.forEach(function (row) {
        hitEls[row] = el.querySelector('.hero-reels__hit[data-row="' + row + '"]')
      })
      var words = Array.prototype.slice.call(el.querySelectorAll('.hero-reels__word'))
      var diceEl = el.querySelector('.hero-reels__dice')
      var totalEl = el.querySelector('.hero-reels__total-value')
      var ctaEl = el.querySelector('[data-add-look]')
      var ctaText = ctaEl && ctaEl.querySelector('[data-cta-text]')
      var shuffleBtn = el.querySelector('[data-shuffle]')

      // ---- state (React useState -> plain variables + ui())
      var size = { w: 1200, h: 800 }
      var current = { tops: 0, bottoms: 0 }
      var settled = { tops: !cfg.intro, bottoms: !cfg.intro }
      var flavourIndex = 0
      var spinning = false
      var chooser = null
      var canShuffle = ROWS.some(function (r) {
        return new Set(pieces[r].map(function (p) { return p.id })).size > 1
      })
      var st = {}
      ROWS.forEach(function (r) {
        st[r] = { off: 0, vel: 0, drag: false, lastX: 0, lastT: 0, moved: 0, tween: null, spring: null, pointerId: undefined, downTarget: null }
      })
      var lastInteraction = 0

      // ---- images: centre and one either side first, the rest of the ring when idle (:141-160, 479-496)
      var loaded = { tops: new Set(), bottoms: new Set() }
      function loadImg(row, i) {
        var node = pieceEls[row][i]
        var p = pieces[row][i]
        var img = node && node.querySelector('img')
        if (!img || !p || img.getAttribute('src')) return
        if (!p.src) return
        if (p.srcset) img.setAttribute('srcset', p.srcset)
        img.setAttribute('src', p.src)
        img.setAttribute('alt', p.name)
        loaded[row].add(i)
      }
      // The server already rendered src for the first set; remember them.
      ROWS.forEach(function (row) {
        pieceEls[row].forEach(function (node, i) {
          var img = node && node.querySelector('img')
          if (img && img.getAttribute('src')) loaded[row].add(i)
        })
      })

      // ---- UI sync (the parts React re-rendered from state)
      function allSettled() {
        return ROWS.every(function (r) {
          return settled[r] || !pieces[r].length
        })
      }
      function lookNow() {
        var out = []
        ROWS.forEach(function (r) {
          var p = pieces[r][current[r]]
          if (p) out.push(p)
        })
        return out
      }
      function ui() {
        // name tags: shown when the row is settled
        ROWS.forEach(function (row) {
          var parts = tagParts[row]
          if (!parts) return
          var p = pieces[row][current[row]]
          var show = !!p && settled[row]
          if (parts.tag.hasAttribute('data-show') !== show) parts.tag.toggleAttribute('data-show', show)
          var name = p ? p.name : ''
          if (parts.name.textContent !== name) parts.name.textContent = name
          var price = p && typeof p.price === 'number' ? formatMoney(p.price) : ''
          if (parts.price.textContent !== price) parts.price.textContent = price
        })
        // total: a set shown as two pieces shares one id and is counted once (:519-521)
        var centred = lookNow()
        var total = centred
          .filter(function (p, i) {
            return centred.findIndex(function (q) { return q.id === p.id }) === i
          })
          .reduce(function (sum, p) { return sum + (p.price || 0) }, 0)
        if (totalEl) {
          var t = formatMoney(total)
          if (totalEl.textContent !== t) totalEl.textContent = t
          totalEl.style.opacity = allSettled() ? '1' : '0.35'
        }
        if (ctaText && ctaEl) {
          var label = lookNow().length ? ctaEl.dataset.ctaLabel : ctaEl.dataset.emptyLabel
          if (ctaText.textContent !== label) ctaText.textContent = label
        }
        if (diceEl) diceEl.toggleAttribute('data-spinning', spinning)
        if (flavours.length) {
          var fl = flavours[flavourIndex % flavours.length] || flavours[0]
          el.style.background = fl.color
          el.style.setProperty('--flavour', fl.color)
          words.forEach(function (w, i) {
            w.toggleAttribute('data-active', i === flavourIndex % flavours.length)
          })
        }
      }

      function applySize() {
        el.toggleAttribute('data-mobile', size.w < MOBILE)
        ROWS.forEach(function (row) {
          var hit = hitEls[row]
          if (!hit) return
          var l = rowLayout(row, size.w, size.h, cfg)
          hit.style.top = l.cy - l.h / 2 + 'px'
          hit.style.height = l.h + 'px'
        })
      }
      var ro = new ResizeObserver(function () {
        measure()
      })
      function measure() {
        var r = el.getBoundingClientRect()
        size = { w: Math.max(1, r.width), h: Math.max(1, r.height) }
        applySize()
      }
      ro.observe(el)
      measure()

      // ---- engine (:192-516)
      var frame = 0
      var disposed = false
      var visible = true

      function tweenTo(row, to, dur, back, delay) {
        var s = st[row]
        s.spring = null
        s.tween = { from: s.off, to: to, t0: performance.now() + (delay || 0), dur: dur, back: back }
      }
      function nearest(row) {
        return Math.round(st[row].off)
      }
      function centreIndex(row) {
        var n = pieces[row].length || 1
        return ((Math.round(st[row].off) % n) + n) % n
      }

      function go(row, by) {
        if (!pieces[row].length) return
        lastInteraction = performance.now()
        tweenTo(row, nearest(row) + by, reduced ? 1 : 650 + Math.abs(by) * 90, false)
        settled[row] = false
        ui()
      }

      function shuffle(intro) {
        ROWS.forEach(function (row, ri) {
          var list = pieces[row]
          var n = list.length
          if (!n) return
          var now = centreIndex(row)
          var options = []
          // Rows repeat pieces and carry several colours of one product: land on a different
          // product ("<handle>#<colour>" ids) when the row has one.
          var product = function (i) {
            return list[i] && list[i].id.split('#')[0]
          }
          var distinct = new Set(list.map(function (_, i) { return product(i) })).size > 1
          for (var i = 0; i < n; i++) if ((i !== now || n === 1) && (!distinct || product(i) !== product(now))) options.push(i)
          // The intro always lands on each row's first piece; later shuffles are random.
          var target = intro ? 0 : options.length ? options[Math.floor(rnd() * options.length)] : now
          var dir = SPIN_DIR[row]
          var to = shuffleTo(n, dir, now, target, nearest(row), intro)
          if (intro) st[row].off = to - dir * (Math.max(8, n) + 3)
          tweenTo(row, to, reduced ? 1 : 1500 + ri * 260, true, reduced ? 0 : ri * 140 + (intro ? introDelayMs : 0))
        })
        if (!intro) {
          lastInteraction = performance.now()
          flavourIndex = (flavourIndex + 1) % Math.max(1, flavours.length)
        }
        spinning = true
        settled = { tops: false, bottoms: false }
        ui()
      }

      var last = performance.now()
      var shownIndex = { tops: -1, bottoms: -1 }
      var shownSettled = { tops: false, bottoms: false }

      function tick(now) {
        frame = 0
        if (disposed) return
        var dt = Math.min(0.05, (now - last) / 1000)
        last = now
        var c = cfg
        var box = el.getBoundingClientRect()
        var width = box.width
        var height = box.height
        var cx = width / 2
        var moving = false
        var nextIndex = Object.assign({}, shownIndex)
        var nextSettled = Object.assign({}, shownSettled)

        ROWS.forEach(function (row) {
          var s = st[row]
          var n = pieces[row].length
          if (!n) return
          var before = s.off
          if (s.tween) {
            var p = (now - s.tween.t0) / s.tween.dur
            if (p >= 0) {
              var t = clamp(p, 0, 1)
              var e = s.tween.back ? backOut(t, 0.7) : cubicOut(t)
              s.off = s.tween.from + (s.tween.to - s.tween.from) * e
              if (p >= 1) {
                s.off = s.tween.to
                s.tween = null
              }
            }
          } else if (s.spring !== null && !s.drag) {
            var a = -90 * (s.off - s.spring) - 17 * s.vel
            s.vel += a * dt
            s.off += s.vel * dt
            if (Math.abs(s.off - s.spring) < 0.001 && Math.abs(s.vel) < 0.01) {
              s.off = s.spring
              s.vel = 0
              s.spring = null
            }
          }
          var velocity = s.drag ? s.vel : (s.off - before) / Math.max(dt, 0.001)
          if (!s.drag && !s.tween && s.spring === null) s.vel = 0
          var busy = s.drag || !!s.tween || s.spring !== null
          moving = moving || busy
          nextIndex[row] = ((Math.round(s.off) % n) + n) % n
          nextSettled[row] = !busy

          var layout = rowLayout(row, width, height, c)
          var els = pieceEls[row]
          for (var i = 0; i < n; i++) {
            var node = els[i]
            if (!node) continue
            var ps = slot(wrap(i - s.off, n), layout, c, velocity)
            if (ps.opacity <= 0.001) {
              if (node.style.visibility !== 'hidden') node.style.visibility = 'hidden'
              continue
            }
            node.style.visibility = 'visible'
            node.style.width = layout.w + 'px'
            node.style.height = layout.h + 'px'
            node.style.transform =
              'translate3d(' + (cx + ps.x - layout.w / 2).toFixed(2) + 'px, ' + (layout.cy - layout.h / 2).toFixed(2) + 'px, 0) perspective(900px) rotateY(' + ps.rotate.toFixed(2) + 'deg) scale(' + ps.scale.toFixed(4) + ')'
            node.style.opacity = ps.opacity.toFixed(3)
            var blur = Math.round(ps.blur * 2) / 2
            var filter = blur > 0.25 ? 'blur(' + blur + 'px)' : 'none'
            if (node.style.filter !== filter) node.style.filter = filter
            node.style.zIndex = String(row === 'tops' ? ps.z + 200 : ps.z)
          }

          var tagEl = tagSlots[row]
          if (tagEl) {
            var mobile = width < MOBILE
            var tw = tagEl.offsetWidth || 160
            var x = Math.min(mobile ? cx + layout.w * 0.3 : cx + layout.w * 0.52 + 14, width - tw - 12)
            var y = layout.cy - layout.h * 0.12
            // Phones hug the right edge. Placed with a transform from the left (not `right:`), so a name
            // changing length never moves the box's origin: no layout shift while the reels spin.
            var tx = mobile ? width - tw - 14 : x
            tagEl.style.transform = 'translate3d(' + tx.toFixed(1) + 'px, ' + y.toFixed(1) + 'px, 0)'
          }
        })

        if (ROWS.some(function (r) { return nextIndex[r] !== shownIndex[r] || nextSettled[r] !== shownSettled[r] })) {
          var allDone = ROWS.every(function (r) { return nextSettled[r] || !pieces[r].length })
          shownIndex = nextIndex
          shownSettled = nextSettled
          current = Object.assign({}, nextIndex)
          settled = Object.assign({}, nextSettled)
          if (allDone) spinning = false
          ui()
        }
        if (!el.hasAttribute('data-ready')) el.setAttribute('data-ready', '')

        var auto = c.autoShuffle || 0
        if (auto > 0 && canShuffle && !moving && visible && !document.hidden && !reduced && now - lastInteraction > auto * 1000) {
          lastInteraction = now
          shuffle(false)
        }
        if (visible && !document.hidden) frame = requestAnimationFrame(tick)
      }

      var onDown = function (e) {
        var target = e.target.closest && e.target.closest('[data-row]')
        if (!target || !el.contains(target)) return
        var row = target.dataset.row
        var s = st[row]
        if (!s || !pieces[row].length) return
        Object.assign(s, { drag: true, tween: null, spring: null, lastX: e.clientX, lastT: performance.now(), vel: 0, moved: 0 })
        s.pointerId = e.pointerId
        s.downTarget = e.target
        lastInteraction = performance.now()
        settled[row] = false
        ui()
        if (!frame) frame = requestAnimationFrame(tick)
      }
      var onMove = function (e) {
        ROWS.forEach(function (row) {
          var s = st[row]
          if (!s.drag || s.pointerId !== e.pointerId) return
          var layout = rowLayout(row, el.clientWidth, el.clientHeight, cfg)
          var dx = e.clientX - s.lastX
          var t = performance.now()
          var dt = Math.max(1, t - s.lastT) / 1000
          s.lastX = e.clientX
          s.lastT = t
          s.moved += Math.abs(dx)
          var delta = -dx / layout.step
          s.off += delta
          s.vel = s.vel * 0.6 + (delta / dt) * 0.4
          if (s.moved > 6) e.preventDefault()
        })
      }
      var onUp = function (e) {
        ROWS.forEach(function (row) {
          var s = st[row]
          if (!s.drag || s.pointerId !== e.pointerId) return
          s.drag = false
          lastInteraction = performance.now()
          if (s.moved < 6) {
            // A tap on a side piece brings it to the centre.
            var hit = s.downTarget && s.downTarget.closest && s.downTarget.closest('[data-idx]')
            var n = pieces[row].length
            if (hit && n) {
              var by = Math.round(wrap(parseInt(hit.dataset.idx || '0', 10) - s.off, n))
              if (by !== 0) {
                go(row, by)
                return
              }
            }
          }
          s.spring = Math.round(s.off + clamp(s.vel, -30, 30) * 0.22)
        })
      }
      el.addEventListener('pointerdown', onDown)
      window.addEventListener('pointermove', onMove, { passive: false })
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)

      var io = new IntersectionObserver(function (entries) {
        visible = entries[0] ? entries[0].isIntersecting : true
        if (visible && !frame) {
          last = performance.now()
          frame = requestAnimationFrame(tick)
        }
      })
      io.observe(el)
      var onVisibility = function () {
        if (!document.hidden && visible && !frame) {
          last = performance.now()
          frame = requestAnimationFrame(tick)
        }
      }
      document.addEventListener('visibilitychange', onVisibility)

      // ---- controls
      var onShuffleClick = function () {
        shuffle(false)
        if (!frame) frame = requestAnimationFrame(tick)
      }
      if (shuffleBtn) shuffleBtn.addEventListener('click', onShuffleClick)

      var closeChooser = function () {
        if (chooser) chooser.remove()
        chooser = null
      }
      // Close (x) returns focus to the CTA, like Escape.
      var closeToCta = function () {
        closeChooser()
        if (ctaEl) ctaEl.focus({ preventScroll: true })
      }
      var onCtaClick = function (e) {
        if (!lookNow().length) return // nothing centred: the link goes to empty_cta_link
        e.preventDefault()
        if (chooser) return
        chooser = document.createElement('look-chooser')
        chooser.setup({ look: lookNow(), products: products, strings: strings, onClose: closeToCta, removeOnly: closeChooser, focusOpener: function () { if (ctaEl) ctaEl.focus({ preventScroll: true }) } })
        el.appendChild(chooser)
        // Keyboard: Escape closes and returns focus to the CTA; on open focus moves to the first
        // select (the colour select, always visible) so keyboard users land on the first control.
        chooser.addEventListener('keydown', function (ev) {
          if (ev.key !== 'Escape') return
          ev.preventDefault()
          closeChooser()
          ctaEl.focus()
        })
        var firstSelect = chooser.querySelector('select')
        if (firstSelect) firstSelect.focus({ preventScroll: true })
      }
      if (ctaEl) ctaEl.addEventListener('click', onCtaClick)

      // Theme editor: selecting a Flavour block shows that backdrop and word (no spin).
      var onBlockSelect = function (ev) {
        var t = ev.target
        var i = words.indexOf(t)
        if (i < 0 || !flavours.length) return
        flavourIndex = i
        ui()
      }
      document.addEventListener('shopify:block:select', onBlockSelect)

      // ---- start (:477-497)
      lastInteraction = performance.now() + introDelayMs
      if (cfg.intro && !reduced && canShuffle) shuffle(true)
      // The intro parks each row at its own start offset: load what's shown there.
      var reach = el.clientWidth < MOBILE ? 1 : 2
      ROWS.forEach(function (r) {
        var n = pieces[r].length
        var want = new Set()
        near(Math.round(st[r].off), n, reach).forEach(function (i) { want.add(i) })
        near(0, n, reach).forEach(function (i) { want.add(i) })
        want.forEach(function (i) { loadImg(r, i) })
      })
      var idle = 0
      var whenIdle = function () {
        var load = function () {
          ROWS.forEach(function (r) {
            for (var i = 0; i < pieces[r].length; i++) loadImg(r, i)
          })
        }
        idle = window.requestIdleCallback ? window.requestIdleCallback(load, { timeout: 2000 }) : window.setTimeout(load, 200)
      }
      if (document.readyState === 'complete') whenIdle()
      else window.addEventListener('load', whenIdle, { once: true })
      ui()
      frame = requestAnimationFrame(tick)

      return function () {
        disposed = true
        cancelAnimationFrame(frame)
        el.removeEventListener('pointerdown', onDown)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        io.disconnect()
        ro.disconnect()
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('load', whenIdle)
        document.removeEventListener('shopify:block:select', onBlockSelect)
        if (shuffleBtn) shuffleBtn.removeEventListener('click', onShuffleClick)
        if (ctaEl) ctaEl.removeEventListener('click', onCtaClick)
        if (window.cancelIdleCallback) window.cancelIdleCallback(idle)
        else clearTimeout(idle)
        closeChooser()
      }
    }
  }

  // ---- <look-chooser> (:656-715) --------------------------------------------
  // Pick colour and size for each piece of the look. Only variants the catalog can sell are offered;
  // if a piece has none, the look can't be added.
  class LookChooser extends HTMLElement {
    setup(opts) {
      var self = this
      var strings = opts.strings || {}
      var onClose = opts.onClose
      var fill = function (tpl, name) {
        return String(tpl || '').replace('[name]', name)
      }

      // Piece ids are "<handle>#<colour>".
      var seen = new Set()
      var items = []
      opts.look.forEach(function (piece) {
        var cut = piece.id.indexOf('#')
        var handle = cut < 0 ? piece.id : piece.id.slice(0, cut)
        var colour = cut < 0 ? '' : piece.id.slice(cut + 1)
        if (seen.has(handle)) return
        seen.add(handle)
        var p = opts.products[handle]
        if (!p) return
        var has = p.colours.some(function (c) { return c.name === colour })
        items.push({ p: p, colour: has ? colour : p.colours[0] ? p.colours[0].name : '', size: '' })
      })

      var variantFor = function (p, colour, size) {
        if (!p.sizes.length) size = 'Default'
        return p.variants[colour + ' / ' + size] || null
      }
      var canOrder = function (p, colour, size) {
        if (!size || typeof p.price !== 'number') return false
        var v = variantFor(p, colour, size)
        return !!v && !!v.id && v.available === true
      }

      this.setAttribute('role', 'dialog')
      this.setAttribute('aria-label', strings.addTheLook || '')
      this.setAttribute('data-look-chooser', '')
      this.className = 'hero-reels__chooser'
      this.addEventListener('pointerdown', function (e) {
        e.stopPropagation()
      })

      var head = document.createElement('div')
      head.className = 'hero-reels__chooser-head'
      var title = document.createElement('span')
      title.textContent = strings.addTheLook || ''
      var close = document.createElement('button')
      close.type = 'button'
      close.setAttribute('aria-label', strings.close || 'Close')
      close.textContent = '×'
      close.addEventListener('click', onClose)
      head.appendChild(title)
      head.appendChild(close)
      this.appendChild(head)

      var rowRefs = items.map(function (it) {
        var p = it.p
        var row = document.createElement('div')
        row.className = 'hero-reels__chooser-row'
        var link = document.createElement('a')
        link.className = 'hero-reels__chooser-name'
        link.appendChild(document.createTextNode(p.title))
        var priceEl = document.createElement('span')
        priceEl.textContent = formatMoney(p.price)
        link.appendChild(priceEl)
        var picks = document.createElement('div')
        picks.className = 'hero-reels__chooser-picks'

        var colourSel = document.createElement('select')
        colourSel.setAttribute('aria-label', fill(strings.colourLabel, p.title))
        p.colours.forEach(function (c) {
          var o = document.createElement('option')
          o.value = c.name
          o.textContent = c.name
          colourSel.appendChild(o)
        })
        colourSel.value = it.colour

        var sizeSel = document.createElement('select')
        sizeSel.setAttribute('aria-label', fill(strings.sizeLabel, p.title))
        var ph = document.createElement('option')
        ph.value = ''
        ph.textContent = strings.size || 'Size'
        sizeSel.appendChild(ph)
        var sizeOpts = p.sizes.map(function (s) {
          var o = document.createElement('option')
          o.value = s
          o.textContent = s
          sizeSel.appendChild(o)
          return o
        })
        // A product without a Size option has nothing to choose: size is implied.
        if (!p.sizes.length) {
          it.size = 'Default'
          sizeSel.hidden = true
        }
        sizeSel.value = it.size

        picks.appendChild(colourSel)
        picks.appendChild(sizeSel)
        row.appendChild(link)
        row.appendChild(picks)
        self.appendChild(row)
        colourSel.addEventListener('change', function () {
          it.colour = colourSel.value
          update()
        })
        sizeSel.addEventListener('change', function () {
          it.size = sizeSel.value
          update()
        })
        return { it: it, link: link, sizeOpts: sizeOpts }
      })

      var add = document.createElement('button')
      add.type = 'button'
      add.className = 'hero-reels__chooser-add'
      add.setAttribute('data-look-add', '')
      this.appendChild(add)
      var error = document.createElement('p')
      error.className = 'hero-reels__chooser-error'
      error.setAttribute('role', 'alert')
      error.hidden = true
      this.appendChild(error)

      var busy = false
      function update() {
        rowRefs.forEach(function (r) {
          var p = r.it.p
          r.link.href = p.url + '?colour=' + encodeURIComponent(r.it.colour)
          r.sizeOpts.forEach(function (o) {
            o.disabled = !canOrder(p, r.it.colour, o.value)
          })
        })
        var ready =
          items.length > 0 &&
          items.every(function (it) {
            return canOrder(it.p, it.colour, it.size)
          })
        var sellable = items.every(function (it) {
          return it.p.colours.some(function (c) {
            return it.p.sizes.some(function (s) {
              return canOrder(it.p, c.name, s)
            }) || (!it.p.sizes.length && canOrder(it.p, c.name, 'Default'))
          })
        })
        add.disabled = !ready || busy
        add.textContent = sellable ? strings.addToBag : strings.soldOut
      }
      update()

      add.addEventListener('click', function () {
        if (add.disabled) return
        busy = true
        error.hidden = true
        update()
        // Focus the CTA first: Khuwabb.cart.add opens the drawer, which records document.activeElement
        // as its opener, so closing the drawer later lands focus on the CTA (the chooser is removed).
        if (opts.focusOpener) opts.focusOpener()
        var lines = items.map(function (it) {
          return { id: variantFor(it.p, it.colour, it.size).id, quantity: 1 }
        })
        // Khuwabb.cart.add also opens the bag drawer.
        K.cart
          .add(lines)
          .then(function () {
            // Remove the chooser without moving focus: the drawer has taken it.
            if (opts.removeOnly) opts.removeOnly()
            else onClose()
          })
          .catch(function (err) {
            busy = false
            error.textContent = (err && err.message) || strings.error || ''
            error.hidden = false
            update()
            add.focus({ preventScroll: true })
          })
      })
    }
  }

  if (!customElements.get('hero-reels')) customElements.define('hero-reels', HeroReels)
  if (!customElements.get('look-chooser')) customElements.define('look-chooser', LookChooser)
})()
