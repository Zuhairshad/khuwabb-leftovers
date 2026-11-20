/*
 * <customer-addresses>: address edit/new toggles (native <details>), country -> province selects,
 * delete confirmation. Vanilla, no dependencies. Works without JS except province updates.
 * Country <option>s from {{ all_country_option_tags }} carry data-provinces='[["Name","Name"],...]'.
 */
class CustomerAddresses extends HTMLElement {
  connectedCallback() {
    this.confirmText = this.dataset.confirm || '';

    this.querySelectorAll('form.address-form').forEach((form) => this.setupProvinces(form));

    // Reopen panels whose form came back with errors.
    this.querySelectorAll('[data-has-errors]').forEach((marker) => {
      const panel = marker.closest('details');
      if (panel) panel.open = true;
    });

    this.addEventListener('click', (event) => {
      const cancel = event.target.closest('[data-address-cancel]');
      if (!cancel) return;
      const panel = cancel.closest('details');
      if (panel) {
        panel.open = false;
        const summary = panel.querySelector('summary');
        if (summary) summary.focus();
      }
    });

    this.addEventListener('submit', (event) => {
      if (!event.target.matches('[data-address-delete]')) return;
      if (this.confirmText && !window.confirm(this.confirmText)) event.preventDefault();
    });
  }

  setupProvinces(form) {
    const country = form.querySelector('[data-country]');
    const province = form.querySelector('[data-province]');
    const wrap = form.querySelector('[data-province-field]');
    if (!country || !province || !wrap) return;

    const defaultCountry = country.dataset.default;
    if (defaultCountry) {
      const match = Array.from(country.options).find(
        (option) => option.value === defaultCountry || option.textContent === defaultCountry
      );
      if (match) country.value = match.value;
    }

    const update = (selected) => {
      const option = country.options[country.selectedIndex];
      let provinces = [];
      try {
        provinces = JSON.parse((option && option.getAttribute('data-provinces')) || '[]');
      } catch (e) {
        provinces = [];
      }
      province.innerHTML = '';
      if (!provinces.length) {
        wrap.hidden = true;
        province.disabled = true;
        return;
      }
      provinces.forEach(([value, label]) => {
        const item = document.createElement('option');
        item.value = value;
        item.textContent = label;
        if (value === selected) item.selected = true;
        province.appendChild(item);
      });
      province.disabled = false;
      wrap.hidden = false;
    };

    update(province.dataset.default);
    country.addEventListener('change', () => update(''));
  }
}

if (!customElements.get('customer-addresses')) {
  customElements.define('customer-addresses', CustomerAddresses);
}
