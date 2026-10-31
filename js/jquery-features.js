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
        const list = $(target).html('');
        if (!items.length) $('<' + (list.is('ul') ? 'li' : 'p') + '>').addClass('p-3 mb-0 text-body-secondary').text(emptyText).appendTo(list);
        else items.forEach((item, index) => list.append(renderItem(item, index)));
        return items.length;
    }
    return { setError, clearErrors, notify, renderList };
})(jQuery);
