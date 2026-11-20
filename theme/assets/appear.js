/*
 * Scroll-in effect (components/Appear.tsx): toggles [data-shown] on [data-appear] elements when
 * at least `amount` of them is in view, and removes it on leave (replays both ways, like framer
 * whileInView with animate="hidden"). Visual states live in base.css.
 *   rise -> .3, lift -> .2, override with data-appear-amount="0.5".
 * prefers-reduced-motion: every element is shown immediately and nothing is observed.
 */
(function () {
  var AMOUNTS = { rise: 0.3, lift: 0.2 };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = new WeakSet();
  var observers = {};

  function amountOf(el) {
    var custom = parseFloat(el.getAttribute('data-appear-amount'));
    if (!isNaN(custom)) return Math.min(Math.max(custom, 0), 1);
    var preset = AMOUNTS[el.getAttribute('data-appear')];
    return preset === undefined ? 0.2 : preset;
  }

  function observerFor(amount) {
    var key = String(amount);
    if (!observers[key]) {
      observers[key] = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var inView = entry.isIntersecting && entry.intersectionRatio >= amount - 0.001;
            if (inView) entry.target.setAttribute('data-shown', '');
            else entry.target.removeAttribute('data-shown');
          });
        },
        { threshold: amount }
      );
    }
    return observers[key];
  }

  function register(el) {
    if (seen.has(el)) return;
    seen.add(el);
    if (reduce || !('IntersectionObserver' in window)) {
      el.setAttribute('data-shown', '');
      return;
    }
    observerFor(amountOf(el)).observe(el);
  }

  function scan(root) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1 && root.hasAttribute('data-appear')) register(root);
    var list = root.querySelectorAll('[data-appear]');
    for (var i = 0; i < list.length; i++) register(list[i]);
  }

  function init() {
    scan(document);
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        for (var i = 0; i < r.addedNodes.length; i++) scan(r.addedNodes[i]);
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('shopify:section:load', function (e) {
    scan(e.target);
  });
})();
