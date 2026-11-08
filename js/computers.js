// jQuery 3.7.1 full build is loaded first; ready waits until the page exists.
'use strict';

$(function () {
  const app = window.TopGame;
  const section = $('#computers-section-2').get(0);
  if (!app || !section) return;
  const grid = $(section).find('.row').get(0);
  const equipment = [{
    id: 'main',
    name: 'Main',
    processor: 'Ryzen 9600X',
    graphics: 'RTX 4070',
    memory: 32,
    refresh: 310,
    privacy: false,
    description: 'Общий зал для одиночной игры и матчей с друзьями.',
    article: 'computers-article-1'
  }, {
    id: 'duo',
    name: 'Duo’s',
    processor: 'Ryzen 9600X',
    graphics: 'RTX 4070',
    memory: 32,
    refresh: 380,
    privacy: false,
    description: 'Места рядом для двух игроков.',
    article: 'computers-article-2'
  }, {
    id: 'private',
    name: 'Private',
    processor: 'Ryzen 7800X3D',
    graphics: 'RTX 4070 Super',
    memory: 32,
    refresh: 380,
    privacy: true,
    description: 'Отдельное игровое пространство.',
    article: 'computers-article-3'
  }].map(zone => ({
    ...zone,
    capacity: app.seats.filter(seat => seat.zone === zone.id).length,
    node: $("#" + zone.article).first().parent().get(0)
  }));
  let selected = [];
  const controls = app.el('form', 'row g-3 mb-4');
  $(controls).attr('role', 'search');
  $(controls).attr('aria-label', 'Подбор игрового оборудования');
  function makeControl(id, labelText, kind, choices) {
    const wrapper = app.el('div', 'col-12 col-md-4');
    const label = app.el('label', 'form-label fw-semibold', labelText);
    $(label).attr("for", id);
    const field = app.el(kind, kind === 'select' ? 'form-select' : 'form-control');
    $(field).attr("id", id);
    if (choices) choices.forEach(([value, text]) => {
      const option = app.el('option', '', text);
      $(option).val(value);
      $(field).append(option);
    });
    $(wrapper).append(label, field);
    $(controls).append(wrapper);
    return field;
  }
  const search = makeControl('equipment-search', 'Зона, процессор или видеокарта', 'input');
  $(search).attr("type", 'search');
  const refresh = makeControl('equipment-refresh', 'Минимальная частота монитора', 'select', [['0', 'Любая частота'], ['310', 'От 310 Hz'], ['380', 'От 380 Hz']]);
  const privacy = makeControl('equipment-private', 'Игровое пространство', 'select', [['all', 'Все зоны'], ['shared', 'Общий зал / Duo’s'], ['private', 'Отдельная зона']]);
  const reset = app.el('button', 'btn btn-outline-secondary', 'Сбросить фильтры');
  $(reset).attr("type", 'button');
  $(reset).attr("id", 'equipment-filter-reset');
  const count = app.el('p', 'mb-0');
  $(count).attr("id", 'equipment-result-count');
  $(count).attr('aria-live', 'polite');
  const actions = app.el('div', 'col-12 d-flex flex-wrap align-items-center gap-3');
  $(actions).append(reset, count);
  $(controls).append(actions);
  $(grid).before(controls);
  const comparison = app.el('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
  $(comparison).attr("id", 'equipment-comparison');
  const heading = app.el('h2', 'h2 fw-bold mb-3', 'Сравнить выбранные зоны');
  $(heading).attr("id", 'equipment-comparison-title');
  $(comparison).attr('aria-labelledby', heading.id);
  const comparisonStatus = app.el('p', 'mb-3');
  $(comparisonStatus).attr("id", 'equipment-comparison-status');
  $(comparisonStatus).attr('role', 'status');
  $(comparisonStatus).attr('aria-live', 'polite');
  $(comparisonStatus).prop("tabIndex", -1);
  const comparisonResult = app.el('div', 'row g-3 mb-3');
  $(comparisonResult).attr("id", 'equipment-compare-result');
  const clear = app.el('button', 'btn btn-outline-secondary', 'Очистить сравнение');
  $(clear).attr("type", 'button');
  $(clear).attr("id", 'equipment-compare-clear');
  $(comparison).append(heading, comparisonStatus, comparisonResult, clear);
  $(section).after(comparison);
  function bookingLink(zone) {
    const params = new URLSearchParams({
      zone: zone.id
    });
    if (zone.id === 'duo') params.set('players', '2');
    if (zone.id === 'private') params.set('tariff', 'private');
    return `booking.html?${params.toString()}#gaming-zone-selection`;
  }
  equipment.forEach(zone => {
    const article = $("#" + zone.article).get(0);
    $(article).find('a').first().attr("href", bookingLink(zone));
    const wrapper = app.el('div', 'form-check mt-3');
    const checkbox = app.el('input', 'form-check-input');
    $(checkbox).attr("type", 'checkbox');
    $(checkbox).attr("id", `compare-${zone.id}`);
    const label = app.el('label', 'form-check-label', `Сравнить ${zone.name}`);
    $(label).attr("for", checkbox.id);
    $(wrapper).append(checkbox, label);
    $(article).find('.card-body').first().append(wrapper);
    $(article).find('.card-body').first().append(app.el('p', 'small text-body-secondary mt-3 mb-0', `Мест в зоне: ${zone.capacity}.`));
    $(checkbox).on('change', () => {
      if ($(checkbox).prop("checked")) selected.push(zone.id);else selected = selected.filter(id => id !== zone.id);
      renderComparison();
    });
  });
  function renderEquipment() {
    const query = $(search).val().trim().toLocaleLowerCase('ru');
    const matches = equipment.filter(zone => `${zone.name} ${zone.processor} ${zone.graphics}`.toLocaleLowerCase('ru').includes(query) && zone.refresh >= Number($(refresh).val()) && ($(privacy).val() === 'all' || zone.privacy === ($(privacy).val() === 'private')));
    app.renderList(grid, matches, zone => zone.node, 'Подходящих зон нет. Измените характеристики или сбросьте фильтры.');
    $(count).text(`Найдено зон: ${matches.length} из ${equipment.length}`);
  }
  function renderComparisonCard(zone) {
    const column = app.el('div', 'col-12 col-md-6 col-lg-4');
    const card = app.el('article', 'card h-100');
    const body = app.el('div', 'card-body d-flex flex-column');
    $(body).append(app.el('h3', 'h4 fw-bold mb-3', zone.name));
    const specifications = app.el('dl', 'mb-3');
    [['Процессор', zone.processor], ['Видеокарта', zone.graphics], ['Память', `${zone.memory} GB`], ['Монитор', `ASUS ${zone.refresh} Hz`], ['Формат', zone.description], ['Мест в зоне', String(zone.capacity)]].forEach(([label, value]) => {
      $(specifications).append(app.el('dt', 'fw-semibold', label), app.el('dd', 'mb-2 text-break', value));
    });
    const next = app.el('a', 'btn btn-danger mb-2', 'Выбрать зону');
    $(next).attr("href", bookingLink(zone));
    const remove = app.el('button', 'btn btn-outline-secondary', 'Убрать из сравнения');
    $(remove).attr("type", 'button');
    $(remove).attr("data-remove-zone", zone.id);
    $(remove).on('click', () => {
      selected = selected.filter(id => id !== zone.id);
      renderComparison();
      if ($(clear).prop("disabled")) $(comparisonStatus).trigger("focus");else $(clear).trigger("focus");
    });
    $(body).append(specifications, next, remove);
    $(card).append(body);
    $(column).append(card);
    return column;
  }
  function renderComparison() {
    const choices = equipment.filter(zone => selected.includes(zone.id));
    equipment.forEach(zone => {
      // Nodes remain usable when a filter removes their wrapper from the document.
      $(zone.node).find('article').first().toggleClass('selected', selected.includes(zone.id));
      $(zone.node).find(`#compare-${zone.id}`).first().prop("checked", selected.includes(zone.id));
    });
    app.renderList(comparisonResult, choices, renderComparisonCard, 'Сравнение пусто. Отметьте зоны в карточках выше.');
    $(comparisonStatus).text(choices.length === 0 ? 'Выбрано зон: 0.' : `Выбрано зон: ${choices.length}. Характеристики взяты из исходного описания клуба; наличие мест проверьте при бронировании.`);
    $(clear).prop("disabled", choices.length === 0);
  }
  $(controls).on('submit', event => {
    event.preventDefault();
    renderEquipment();
  });
  $(controls).on('input', 'input', renderEquipment);
  $(controls).on('change', 'select', renderEquipment);
  $(reset).on('click', () => {
    $(controls).trigger("reset");
    renderEquipment();
    $(search).trigger("focus");
  });
  $(clear).on('click', () => {
    selected = [];
    renderComparison();
    $(search).trigger("focus");
  });
  renderEquipment();
  renderComparison();
});

