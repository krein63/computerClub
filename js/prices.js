'use strict';

(() => {
  const { tariffs } = window.TopGameData;
  const { estimateVisit, tariffSchedule } = window.TopGameLogic;
  const format = new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 2 });
  const hourlyTariff = tariffs.find(tariff => tariff.id === 'hour');
  const rows = document.getElementById('prices-tariff-rows');
  const rateNote = document.getElementById('prices-base-rate');
  const money = amount => `${format.format(amount)} ₸`;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  for (const tariff of tariffs) {
    const row = document.createElement('tr');
    const name = element('th', 'fw-normal', '');
    name.scope = 'row';
    const link = element('a', 'fw-semibold link-light', tariff.name);
    link.href = `booking.html?tariff=${encodeURIComponent(tariff.id)}#tariff-selection`;
    const schedule = tariffSchedule(tariff);
    const zones = tariff.id === 'private' ? 'PRIVATE' : 'MAIN и DUO';
    const details = schedule ? `${zones} · ${schedule} по Астане` : zones;
    name.append(link, element('span', 'd-block mt-1 small text-body-secondary', details));
    const price = element('td', 'text-end text-nowrap fw-bold', money(tariff.price));
    if (tariff.hourly) {
      price.append(element('span', 'd-block small fw-normal text-body-secondary', 'за час'));
    } else {
      const saving = hourlyTariff.price * tariff.duration - tariff.price;
      price.append(element('span', 'd-block small fw-normal text-body-secondary', `${money(tariff.price / tariff.duration)}/ч`));
      if (saving > 0) price.append(element('span', 'd-block small fw-normal text-success-emphasis', `Экономия ${money(saving)}`));
    }
    row.append(name, price);
    rows.append(row);
  }
  document.getElementById('prices-tariff-table').hidden = false;
  rateNote.textContent = `Экономия рассчитана по обычному тарифу ${money(hourlyTariff.price)}/ч.`;

  const example = estimateVisit(tariffs, hourlyTariff.id, 1, 2);
  document.getElementById('prices-example-formula').textContent = `2 ПК × 1 час × ${money(hourlyTariff.price)}`;
  document.getElementById('prices-example-total').textContent = money(example.amount);
  document.getElementById('prices-example').hidden = false;
})();
