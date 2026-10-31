 'use strict';
// jQuery 3.7.1 full build is loaded before this module; ready-dependent consumers run afterwards.
window.TopGameJQuery = (function ($) {
    function setError(field, message) {
        const input = $(field), id = input.attr('id') + '-error';
        let error = $('#' + id);
        if (!error.length) {
            error = $('<span>').addClass('d-block small mt-1 mb-0 hidden').attr('id', id).insertAfter(input);
            input.attr('aria-describedby', ((input.attr('aria-describedby') || '') + ' ' + id).trim());
        }
        // Set text safely, switch existing classes, and expose the state to assistive technology.
        error.text(message).toggleClass('hidden', !message).toggleClass('error', Boolean(message));
        input.toggleClass('error', Boolean(message)).toggleClass('is-invalid', Boolean(message)).attr('aria-invalid', String(Boolean(message)));
        return Boolean(message);
    }
    function clearErrors(form) {
        $(form).find('[aria-invalid="true"]').each(function () { setError($(this), ''); });
    }
    function notify(target, text, state = '') {
        const box = $(target);
        box.stop(true, true).text(text).toggleClass('success', state === 'success').toggleClass('error', state === 'error');
        if (text) box.removeClass('hidden').hide().slideDown(150);
        else if (!box.hasClass('hidden')) box.addClass('hidden');
        return text;
    }
    function renderList(target, items, renderItem, emptyText) {
        const list = $(target).empty();
        if (!items.length) $('<' + (list.is('ul') ? 'li' : 'p') + '>').addClass('p-3 mb-0 text-body-secondary').text(emptyText).appendTo(list);
        else items.forEach((item, index) => list.append(renderItem(item, index)));
        return items.length;
    }
    // .val(), .prop() and per-field messages replace native reads and app.setError in booking validation.
    // This is clearer for DOM state; client checks still cannot replace server-side validation.
    function validateBookingContacts() {
        const form = $('#booking-form');
        const value = id => String($('#' + id).val() || '').trim();
        const contacts = window.TopGame.validateContacts(value('customer-name'), value('customer-email'), value('customer-phone'));
        if (!value('customer-email')) contacts.email = ''; // Preserve the existing optional email field.
        const app = window.TopGame, food = window.TopGameFood;
        const selected = $('[data-seat-id][aria-pressed="true"]').map(function () { return Number($(this).attr('data-seat-id')); }).get();
        const delivery = Number(value('food-seat'));
        const wrongSeat = food.getCart().length && value('food-delivery') === 'seat' &&
            (!app.findProduct(app.seats, delivery) || (selected.length && !selected.includes(delivery)));
        const checks = [ ['customer-name', contacts.name], ['customer-phone', contacts.phone], ['customer-email', contacts.email],
            ['food-seat', wrongSeat ? 'Выбери ПК, к которому нужно принести еду.' : ''],
            ['booking-agreement', $('#booking-agreement').prop('checked') ? '' : 'Подтверди демонстрационный режим.'],
            ['booking-comment', value('booking-comment').length > 1000 ? 'Сократи комментарий до 1 000 символов.' : ''] ];
        const invalid = [];
        checks.forEach(([id, message]) => { if (setError($('#' + id), message)) invalid.push($('#' + id)); });
        return invalid;
    }

    function validateVisit(state) {
        const app = window.TopGame;
        const date = String($('#booking-date').val() || '').trim();
        const time = String($('#booking-time').val() || '').trim();
        const hours = Number($('#booking-duration').val());
        const tariff = $('#booking-tariff').val();
        const parsed = new Date(date + 'T12:00:00+05:00');
        const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) &&
            new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(parsed) === date;
        const dateError = !validDate ? 'Укажи корректную дату.' : date < app.today() ? 'Дата не может быть в прошлом.' : '';
        const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
        const timeError = !validTime ? 'Укажи время начала.' : !dateError && app.localDateTime(date, time) <= Date.now() ? 'Это время уже прошло.' : '';
        const durationError = !Number.isInteger(hours) || hours < 1 || hours > 12 ? 'Укажи от 1 до 12 полных часов.' : tariff === 'three-hours' && hours !== 3 ? 'Пакет включает ровно 3 часа.' : '';
        const tariffError = !app.findProduct(app.tariffs, tariff) || ((state.zone === 'private') !== (tariff === 'private')) ? 'Выбери тариф для этой зоны.' : '';
        const seatError = !state.seats.length ? 'Выбери хотя бы один свободный ПК на схеме.' : state.zone === 'duo' && state.seats.length !== 2 ? 'Для Duo выбери ровно два ПК.' : state.seats.some(id => state.busy.includes(id)) ? 'Выбранный ПК занят на это время.' : '';
        const checks = [['booking-date', dateError], ['booking-time', timeError], ['booking-duration', durationError], ['booking-tariff', tariffError], ['seat-map', seatError]];
        checks.forEach(([id, message]) => setError($('#' + id), message));
        return (checks.find(([, message]) => message) || ['', ''])[1];
    }
    return { setError, clearErrors, notify, renderList, validateBookingContacts, validateVisit };
})(jQuery);
