/*
 * Khuwabb.formatMoney(cents) -> "Rs.2,500" (lib/format.ts formatPrice; JS twin of snippets/price.liquid).
 * Input is Shopify's cents. Returns '' for non-numbers. Prefix comes from window.Khuwabb.currencyPrefix
 * (head-config.liquid, settings.currency_prefix), read at call time.
 */
(function () {
  var K = (window.Khuwabb = window.Khuwabb || {});
  var fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  K.formatMoney = function (cents) {
    if (typeof cents !== 'number' || !isFinite(cents)) return '';
    var prefix = typeof K.currencyPrefix === 'string' ? K.currencyPrefix : 'Rs.';
    return prefix + fmt.format(cents / 100);
  };
})();
