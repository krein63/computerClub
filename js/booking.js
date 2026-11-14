// jQuery 3.7.1 full build is loaded first; ready waits until the page exists.
'use strict';

$(function () {
  const form = $('#booking-form').get(0);
  if (!form) return;
  const {
    el,
    money,
    reference,
    today,
    localDateTime,
    store,
    renderList,
    setError,
    clearErrors,
    validateContacts,
    notify,
    estimateVisit,
    tariffs,
    seats
  } = window.TopGame;
  const fields = {
    name: $('#customer-name').get(0),
    phone: $('#customer-phone').get(0),
    date: $('#booking-date').get(0),
    time: $('#booking-time').get(0),
    tariff: $('#booking-tariff').get(0),
    agreement: $('#booking-agreement').get(0)
  };
  const zoneNames = {
    main: 'MAIN',
    duo: 'DUO',
    private: 'PRIVATE'
  };
  let selectedSeats = []; // Номера выбранных компьютеров.
  const seatButtons = {}; // Кнопки карты по номеру ПК.
  const result = $('#booking-saved').get(0);
  const success = $('#booking-success').get(0);
  const resultStatus = $('#booking-result-status').get(0);
  const errors = $('#booking-errors').get(0);
  let reservations = [];
  let lastAccepted = null;
  let attempted = false;
  let storageAvailable = true;
  // Keep required/type/min/max in the HTML. Custom validation collects ALL errors at once.
  // Without JavaScript, browser validation remains the first line of defence.
  $(form).prop("noValidate", true);
  // The parent exists now; the seat buttons are created below. A direct binding here
  // would find no buttons, and would miss buttons created later. Events bubble to the parent.
  $('#booking-form').on('click', '[data-seat-id]', function () {
    const $button = $(this);
    const seat = seats.find(item => item.id === Number($button.attr('data-seat-id')));
    if (seat && !$button.prop('disabled')) toggleSeat(seat);
  });
  $(fields.date).attr("min", today());
  const durationWrapper = el('div', 'col-12 col-sm-6');
  const durationLabel = el('label', 'form-label', 'Длительность, ч.');
  $(durationLabel).attr("for", 'booking-duration');
  const duration = el('input', 'form-control');
  $(duration).attr("id", 'booking-duration');
  $(duration).attr("name", 'booking-duration');
  $(duration).attr("type", 'number');
  $(duration).attr("min", '1');
  $(duration).attr("max", '12');
  $(duration).attr("step", '1');
  $(duration).val('1');
  $(duration).prop("required", true);
  $(duration).attr('aria-describedby', 'booking-duration-note');
  $(durationWrapper).append(durationLabel, duration);
  const durationNote = el('p', 'booking-muted small mt-2 mb-0');
  durationNote.id = 'booking-duration-note';
  $(durationWrapper).append(durationNote);
  $('#booking-visit-fields').append(durationWrapper);
  const tariffInfo = $('#booking-tariff-info');
  const emptyTariff = el('option', '', 'Выберите тариф');
  $(emptyTariff).val('');
  $(fields.tariff).empty().append(emptyTariff);
  for (const tariff of tariffs) {
    const option = el('option', '', `${tariff.name} — ${money(tariff.price)}${tariff.hourly ? '/час' : ''}`);
    $(option).val(tariff.id);
    $(fields.tariff).append(option);
  }
  const map = el('fieldset', 'booking-group booking-map');
  $(map).attr("id", 'seat-map');
  $(map).prop("tabIndex", -1);
  const mapLegend = el('legend', 'booking-heading', 'Выберите места');
  const mapExplanation = el('p', 'booking-muted small mb-3', 'Нажмите на нужные компьютеры. Каждое место — один игрок.');
  const legend = el('div', 'd-flex flex-wrap gap-2 mb-3');
  $(legend).attr({ role: 'group', 'aria-label': 'Условные обозначения' });
  $(legend).append(el('span', 'badge bg-white text-dark border border-dark', 'Свободно'), el('span', 'badge text-bg-secondary', 'Занято'), el('span', 'badge text-bg-danger', 'Выбрано'));
  const mapStatus = el('p', 'small mb-3');
  $(mapStatus).attr("id", 'seat-map-status');
  $(mapStatus).attr('role', 'status');
  $(mapStatus).attr('aria-live', 'polite');
  const mapFeedback = el('p', 'booking-seat-feedback booking-muted small mb-3');
  $(mapFeedback).attr("id", 'seat-map-feedback');
  $(mapFeedback).attr('role', 'status');
  $(mapFeedback).attr('aria-live', 'polite');
  const mapZones = el('div', 'booking-rooms mb-3');
  for (const zone of Object.keys(zoneNames)) {
    const zoneCard = el('section', 'booking-room');
    zoneCard.id = `seats-${zone}`;
    const zoneSeats = seats.filter(seat => seat.zone === zone);
    const heading = el('h3', 'h6 fw-bold mb-3', `${zoneNames[zone]} · ${zoneSeats.length} ПК · этаж ${zoneSeats[0].floor}`);
    const grid = el('div', 'booking-seat-grid');
    for (const seat of zoneSeats) {
      const button = el('button', 'btn booking-seat');
      $(button).attr("id", `seat-${seat.id}`);
      $(button).attr("type", 'button');
      $(button).attr("data-seat-id", String(seat.id));
      $(button).attr("data-zone", seat.zone);
      $(button).attr('aria-pressed', 'false');
      const number = el('span', 'd-block fw-bold', `ПК ${String(seat.id).padStart(2, '0')}`);
      const status = el('span', 'd-block small', 'Свободно');
      $(button).append(number, status);
      seatButtons[seat.id] = {
        button,
        status
      };
      $(grid).append(button);
    }
    $(zoneCard).append(heading, grid);
    $(mapZones).append(zoneCard);
  }
  const clearSelection = el('button', 'btn btn-outline-light btn-sm', 'Снять выбор мест');
  $(clearSelection).attr("type", 'button');
  $(clearSelection).attr("id", 'clear-seat-selection');
  $(clearSelection).on('click', () => {
    selectedSeats = [];
    updateBookingText(mapFeedback, 'Выбор ПК очищен.');
    refresh();
  });
  $(map).append(mapLegend, mapExplanation, legend, mapStatus, mapFeedback, mapZones, clearSelection);
  $('#booking-seat-picker').append(map);
  function addSummaryRow(id, label) {
    const term = el('dt', '', label);
    const value = el('dd');
    $(value).attr("id", id);
    $('#booking-summary').first().append(term, value);
    return value;
  }
  const summarySeats = addSummaryRow('booking-summary-seats', 'Компьютеры');
  const summaryDuration = addSummaryRow('booking-summary-duration', 'Продолжительность');
  const totalNote = $('#booking-total-note').get(0);
  const total = $('#booking-total').get(0);
  $(total).attr('for', 'booking-tariff booking-duration');
  const list = $('#booking-result-list').get(0);
  $(success).addClass("border rounded-3 p-3 text-break");
  const localSection = el('div', 'mt-3');
  const localStatus = el('p', 'booking-muted small mb-2');
  $(localStatus).attr("id", 'local-bookings-status');
  $(localStatus).prop("tabIndex", -1);
  $(localStatus).attr('role', 'status');
  $(localStatus).attr('aria-live', 'polite');
  const localList = el('ul', 'list-group');
  $(localList).attr("id", 'local-bookings');
  $(localSection).append(localStatus, localList);
  $(result).append(localSection);
  function validDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const [year, month, day] = date.split('-').map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    return calendarDate.getUTCFullYear() === year && calendarDate.getUTCMonth() === month - 1 && calendarDate.getUTCDate() === day;
  }
  function interval(date, time, hours) {
    if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isInteger(hours) || hours < 1 || hours > 12) return null;
    const start = localDateTime(date, time);
    return Number.isFinite(start) ? {
      start,
      end: start + hours * 60 * 60 * 1000
    } : null;
  }
  function overlaps(first, second) {
    return first.start < second.end && first.end > second.start;
  }
  function readReservations() {
    const saved = store.get('bookings', []);
    if (!Array.isArray(saved)) return [];
    return saved.filter(item => {
      if (!item || typeof item.id !== 'string' || item.id.length > 80 || !tariffs.some(tariff => tariff.id === item.tariff)) return false;
      const requested = interval(item.date, item.time, item.duration);
      return requested && requested.start === item.start && requested.end === item.end && Array.isArray(item.seats) && item.seats.length > 0 && item.seats.length <= seats.length && item.seats.every((id, index) => item.seats.indexOf(id) === index) && item.seats.every(id => seats.some(seat => seat.id === id));
    });
  }
  function displayId(id) {
    return id.replace(/^DEMO-/, 'TG-');
  }
  function values() {
    return {
      name: $(fields.name).val().trim(),
      phone: $(fields.phone).val().trim(),
      date: $(fields.date).val(),
      time: $(fields.time).val(),
      players: selectedSeats.length,
      tariff: $(fields.tariff).val(),
      duration: Number($(duration).val()),
      seats: [...selectedSeats].sort((first, second) => first - second),
      agreement: $(fields.agreement).prop("checked")
    };
  }
  function occupiedSeats(requestedInterval) {
    if (!requestedInterval) return [];
    const busy = [];
    function addBusy(id) {
      if (!busy.includes(id)) busy.push(id);
    }
    reservations.filter(item => overlaps(requestedInterval, item)).forEach(item => item.seats.forEach(id => addBusy(id)));
    return busy;
  }
  function toggleSeat(seat) {
    if (selectedSeats.includes(seat.id)) {
      selectedSeats = selectedSeats.filter(id => id !== seat.id);
      updateBookingText(mapFeedback, `ПК ${seat.id} исключён из выбора.`);
    } else {
      selectedSeats.push(seat.id);
      updateBookingText(mapFeedback, `ПК ${seat.id} добавлен в выбор.`);
    }
    refresh();
  }
  function selectedZoneNames(ids) {
    const names = [];
    for (const id of ids) {
      const seat = seats.find(item => item.id === id);
      if (seat && !names.includes(zoneNames[seat.zone])) names.push(zoneNames[seat.zone]);
    }
    return names.join(', ');
  }
  function estimate(data) {
    return estimateVisit(tariffs, data.tariff, data.duration, data.players);
  }
  function updateMap(data) {
    const requestedInterval = interval(data.date, data.time, data.duration);
    const busy = occupiedSeats(requestedInterval);
    for (const seat of seats) {
      const {
        button,
        status
      } = seatButtons[seat.id];
      const occupied = busy.includes(seat.id);
      const selected = selectedSeats.includes(seat.id);
      const state = occupied ? 'occupied' : selected ? 'selected' : 'available';
      $(button).prop("disabled", occupied && !selected);
      $(button).attr("data-seat-state", state);
      $(button).toggleClass('btn-outline-light', state === 'available');
      $(button).toggleClass('btn-secondary', state === 'occupied');
      $(button).toggleClass('opacity-100', state === 'occupied');
      $(button).toggleClass('btn-danger', state === 'selected');
      $(button).toggleClass('text-white', state !== 'available');
      $(button).toggleClass('selected', state === 'selected');
      $(button).attr('aria-pressed', String(selected));
      const ownRequest = occupied && selected && lastAccepted?.data.seats.includes(seat.id) && requestedInterval && overlaps(requestedInterval, lastAccepted.data);
      const label = ownRequest ? 'Ваш запрос' : occupied ? 'Занято' : selected ? 'Выбрано' : 'Свободно';
      updateBookingText(status, label);
      $(button).attr('aria-label', `ПК ${seat.id}, зона ${zoneNames[seat.zone]}, ${label.toLowerCase()}`);
    }
    const freeCount = seats.length - busy.length;
    const context = requestedInterval ? `${data.date}, ${data.time}, ${data.duration} ч. по Астане.` : 'Укажите дату, время и длительность для проверки занятости.';
    const sameAcceptedChoice = lastAccepted?.fingerprint === JSON.stringify(data);
    const conflictHint = requestedInterval && !sameAcceptedChoice && data.seats.some(id => busy.includes(id)) ? ' Одно из выбранных мест занято. Снимите его выбор или измените время.' : '';
    $(mapStatus).text(`${context} Свободно: ${freeCount} из ${seats.length}. Выбрано: ${selectedSeats.length}.${conflictHint}`);
    $(clearSelection).prop("disabled", selectedSeats.length === 0);
  }
  function refresh() {
    const data = values();
    $(fields.date).attr("min", today());
    $('#booking-summary-tariff').first().text(tariffs.find(item => item.id === data.tariff)?.name || 'Не выбран');
    $('#booking-summary-zone').first().text(selectedZoneNames(data.seats) || '—');
    $('#booking-summary-date').first().text(data.date || 'Не выбрана');
    $('#booking-summary-time').first().text(data.time ? `${data.time} (Астана)` : 'Не выбрано');
    $('#booking-summary-players').first().text(data.players || '—');
    $(summarySeats).text(data.seats.length ? data.seats.map(id => `ПК ${id}`).join(', ') : 'Не выбраны');
    $(summaryDuration).text(Number.isInteger(data.duration) && data.duration > 0 ? `${data.duration} ч.` : 'Укажите целое число');
    const tariff = tariffs.find(item => item.id === data.tariff);
    tariffInfo.text(tariff
      ? `${tariff.description}. ${money(tariff.price)} ${tariff.hourly ? 'за час на одном ПК' : 'за пакет на одном ПК'}.`
      : 'Цены в списке указаны за один ПК.');
    $(duration).prop('readOnly', Boolean(tariff && !tariff.hourly));
    $(durationNote).text(tariff && !tariff.hourly ? `Пакет «${tariff.name}» включает ${tariff.duration} ч. на каждый ПК.` : 'От 1 до 12 полных часов. Стоимость: тариф × часы × количество ПК.');
    const price = estimate(data);
    $(totalNote).text(price ? 'Стоимость пакета для всех выбранных компьютеров.' : 'Выберите тариф и места.');
    const totalText = price ? money(price.amount) : '—';
    const latest = reservations.at(-1);
    const savedPrice = latest && estimateVisit(tariffs, latest.tariff, latest.duration, latest.seats.length);
    const visitCost = data.seats.length
      ? { amount: price?.amount ?? null, label: 'ПК · текущий выбор' }
      : { amount: savedPrice?.amount ?? null, label: latest ? 'ПК · последняя заявка' : 'ПК' };
    document.dispatchEvent(new CustomEvent('booking:pc-cost', { detail: visitCost }));
    updateBookingText(total, totalText);
    updateBookingText(document.getElementById('booking-mobile-total'), totalText);
    if (!lastAccepted) $(resultStatus).text('');
    updateMap(data);
    if (attempted) validate(false);
  }
  // REWRITE 2: .val(), .prop(), .find() and setError's jQuery class changes replace
  // .value/.checked/querySelector/classList. DOM work is clearer; the business checks stay as long.
  // Browser checks can be bypassed. A real server must repeat validation and check seat conflicts.
  function validate(focusFirst) {
    const data = values();
    const contactErrors = validateContacts(data.name, '', data.phone);
    const invalid = [];
    function check(field, message, focusField = field) {
      if (setError(field, message)) invalid.push(focusField);
    }
    check(fields.name, contactErrors.name);
    check(fields.phone, contactErrors.phone);
    const dateError = !validDate(data.date) ? 'Выберите корректную дату посещения.' : data.date < today() ? 'Дата посещения не может быть в прошлом по времени Астаны.' : '';
    check(fields.date, dateError);
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(data.time);
    check(fields.time, !validTime ? 'Укажите время начала по Астане.' : !dateError && localDateTime(data.date, data.time) <= Date.now() ? 'Выбранное время уже прошло. Укажите будущее время по Астане.' : '');
    const tariff = tariffs.find(item => item.id === data.tariff);
    check(duration, !Number.isInteger(data.duration) || data.duration < 1 || data.duration > 12 ? 'Укажите целое количество часов от 1 до 12.' : tariff && !tariff.hourly && data.duration !== tariff.duration ? `Пакет «${tariff.name}» рассчитан на ${tariff.duration} ч.` : '');
    check(fields.tariff, tariff ? '' : 'Выберите тариф из списка.');
    const requestedInterval = interval(data.date, data.time, data.duration);
    const busy = occupiedSeats(requestedInterval);
    const duplicate = lastAccepted && lastAccepted.fingerprint === JSON.stringify(data) && reservations.some(item => item.id === lastAccepted.id);
    let seatError = data.seats.length ? '' : 'Выберите хотя бы один компьютер.';
    if (!seatError && !duplicate && requestedInterval && data.seats.some(id => busy.includes(id))) seatError = 'Выбранный ПК занят в пересекающееся время. Снимите выбор и выберите свободные места или другой интервал.';
    check(map, seatError);
    check(fields.agreement, $(fields.agreement).prop("checked") ? '' : 'Подтвердите правильность данных.');
    notify(errors, invalid.length ? `Проверьте поля: ${invalid.length}. Подсказки находятся рядом с каждым полем.${lastAccepted ? ' Предыдущая бронь сохранена.' : ''}` : '', 'error');
    if (focusFirst && invalid.length) $(invalid[0]).trigger("focus");
    return invalid.length === 0;
  }
  function renderReservations() {
    renderList(localList, reservations, item => {
      const row = el('li', 'list-group-item bg-dark text-light border-secondary');
      const body = el('div', 'd-flex flex-wrap align-items-start justify-content-between gap-2');
      const details = el('div', 'text-break');
      $(details).append(el('strong', 'd-block', `${selectedZoneNames(item.seats)} · ${item.date}, ${item.time} · ${item.duration} ч.`), el('span', 'd-block small', item.seats.map(id => `ПК ${id}`).join(', ')), el('span', 'd-block small text-body-secondary text-break', displayId(item.id)));
      const cancel = el('button', 'btn btn-outline-light btn-sm', 'Отменить бронь');
      $(cancel).attr("type", 'button');
      $(cancel).attr("data-cancel-booking", item.id);
      $(cancel).attr('aria-label', `Отменить бронь ${displayId(item.id)}`);
      $(body).append(details, cancel);
      $(row).append(body);
      return row;
    }, 'Броней пока нет. После отправки новая заявка появится здесь.');
  }
  // This list exists before any saved booking rows. The same handler survives every rebuild.
  $(localList).on('click', '[data-cancel-booking]', function () {
    cancelReservation($(this).attr('data-cancel-booking'));
  });
  function cancelReservation(id) {
    if (storageAvailable) reservations = readReservations();
    if (!reservations.some(item => item.id === id)) {
      notify(localStatus, 'Эта бронь уже отменена. Список обновлён.');
      renderReservations();
      refresh();
      $(localStatus).trigger("focus");
      return;
    }
    reservations = reservations.filter(item => item.id !== id);
    const saved = store.set('bookings', reservations);
    storageAvailable = saved;
    notify(localStatus, `Бронь ${displayId(id)} отменена, места освобождены.${saved ? '' : ' Браузер не разрешил сохранение; изменение действует до перезагрузки.'}`);
    if (lastAccepted?.id === id) {
      lastAccepted = null;
      notify(success, 'Последняя бронь отменена. Можно подготовить новую.');
      $(list).empty();
      $(list).addClass("hidden");
    }
    renderReservations();
    refresh();
    $(localStatus).trigger("focus");
  }
  $(form).on('submit', event => {
    // Without this the browser would submit/navigate and discard our local feedback.
    event.preventDefault();
    if (storageAvailable) reservations = readReservations();
    attempted = true;
    if (!validate(true)) {
      updateMap(values());
      return;
    }
    const data = values();
    const fingerprint = JSON.stringify(data);
    if (lastAccepted?.fingerprint === fingerprint && reservations.some(item => item.id === lastAccepted.id)) {
      $(resultStatus).text('Эта заявка уже сохранена в этом браузере. Повторная бронь не создана.');
      return;
    }
    const requestedInterval = interval(data.date, data.time, data.duration);
    const id = reference('BOOK');
    const chosenZones = [...new Set(data.seats.map(seatId => seats.find(seat => seat.id === seatId).zone))];
    const entry = {
      id,
      date: data.date,
      time: data.time,
      duration: data.duration,
      seats: data.seats,
      zone: chosenZones.length === 1 ? chosenZones[0] : 'mixed',
      tariff: data.tariff,
      ...requestedInterval
    };
    reservations.push(entry);
    const saved = store.set('bookings', reservations);
    storageAvailable = saved;
    lastAccepted = {
      id,
      data: {
        ...data,
        ...requestedInterval
      },
      fingerprint
    };
    const price = estimate(data);
    const confirmation = [`Игрок: ${data.name}`, `Телефон: ${data.phone}`, `Зоны: ${selectedZoneNames(data.seats)}; ПК: ${data.seats.join(', ')}; игроков: ${data.players}`, `Визит: ${data.date}, ${data.time} по Астане; длительность: ${data.duration} ч.`, `Тариф: ${tariffs.find(tariff => tariff.id === data.tariff).name}; стоимость: ${money(price.amount)}`];
    renderList(list, confirmation, text => el('li', 'list-group-item bg-dark text-light border-secondary text-break', text));
    $(list).removeClass("hidden");
    notify(success, `Локальная заявка ${displayId(id)} сохранена ${saved ? 'в этом браузере' : 'до перезагрузки страницы: сохранение браузером недоступно'}. Данные не отправлены в клуб; реальное бронирование и оплата не созданы.`, 'success');
    renderReservations();
    resetBookingFields();
    refresh();
    $(resultStatus).text('Данные для звонка администратору');
    document.dispatchEvent(new Event('booking:saved'));
  });
  $(form).on('input', event => {
    if ([fields.date, fields.time, duration].includes(event.target)) refresh();
  });
  $(form).on('change', event => {
    if (event.target === fields.tariff) {
      const tariff = tariffs.find(item => item.id === $(fields.tariff).val());
      if (tariff && !tariff.hourly) $(duration).val(String(tariff.duration));
    }
    refresh();
  });
  function resetBookingFields() {
    $(form).find('input:not([type="submit"]):not([type="reset"]):not([type="button"])').each(function () {
      const $field = $(this);
      // .attr('checked') is the initial HTML attribute; .prop('checked') is the live state.
      if ($field.is(':radio, :checkbox')) $field.prop('checked', false);else $field.val(this === duration ? '1' : '');
    });
    $(fields.tariff).val('');
    selectedSeats = [];
    attempted = false;
    clearErrors(form);
    notify(errors, '');
  }
  $(form).on('reset', event => {
    // Use our reset so generated duration and selected seats are also cleared.
    event.preventDefault();
    resetBookingFields();
    lastAccepted = null;
    notify(success, '');
    updateBookingText(mapFeedback, 'Данные и выбор ПК очищены.');
    $(list).empty();
    $(list).addClass("hidden");
    refresh();
    $(fields.name).trigger("focus");
  });
  $(window).on('storage', event => {
    if (event.key !== 'topgame-bookings' && event.key !== null) return;
    reservations = readReservations();
    if (lastAccepted && !reservations.some(item => item.id === lastAccepted.id)) {
      lastAccepted = null;
      notify(success, 'Предыдущая бронь удалена в другой вкладке.');
      $(list).empty();
      $(list).addClass("hidden");
    }
    notify(localStatus, 'Список броней и занятость обновлены после изменения в другой вкладке.');
    renderReservations();
    refresh();
  });
  const params = new URLSearchParams(window.location.search);
  if (tariffs.some(tariff => tariff.id === params.get('tariff'))) $(fields.tariff).val(params.get('tariff'));
  const initialDuration = Number(params.get('hours'));
  if (Number.isInteger(initialDuration) && initialDuration >= 1 && initialDuration <= 12) $(duration).val(String(initialDuration));
  const initialTariff = tariffs.find(item => item.id === $(fields.tariff).val());
  if (initialTariff && !initialTariff.hourly) $(duration).val(String(initialTariff.duration));
  const initialDate = params.get('date') || '';
  if (validDate(initialDate) && initialDate >= today()) $(fields.date).val(initialDate);
  reservations = readReservations();
  renderReservations();
  refresh();
  $('#booking-submit').prop('disabled', false);
  document.dispatchEvent(new Event('booking:seats-ready'));
});
