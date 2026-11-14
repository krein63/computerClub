'use strict';

$(function () {
  const { el, tariffs, money, estimateVisit } = window.TopGame;
  const rows = document.getElementById('prices-tariff-rows');

  for (const tariff of tariffs) {
    const row = el('tr');
    const name = el('th', 'fw-normal');
    name.scope = 'row';
    const link = el('a', 'fw-semibold', tariff.name);
    link.href = `booking.html?tariff=${encodeURIComponent(tariff.id)}#tariff-selection`;
    const details = tariff.hourly ? 'Почасовой тариф' : `Пакет на ${tariff.duration} ч.`;
    name.append(link, el('span', 'd-block mt-1 small text-body-secondary', details));
    const price = el('td', 'text-end text-nowrap fw-bold', money(tariff.price));
    if (tariff.hourly) price.append(el('span', 'd-block small fw-normal text-body-secondary', 'за час'));
    row.append(name, price);
    rows.append(row);
  }
  document.getElementById('prices-tariff-table').hidden = false;

  const hourlyTariff = tariffs.find(tariff => tariff.id === 'hour');
  const example = hourlyTariff && estimateVisit(tariffs, hourlyTariff.id, 1, 2);
  if (example) {
    document.getElementById('prices-example-formula').textContent = `2 ПК × 1 час × ${money(hourlyTariff.price)}`;
    document.getElementById('prices-example-total').textContent = money(example.amount);
    document.getElementById('prices-example').hidden = false;
  }
});
