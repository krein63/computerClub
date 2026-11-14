'use strict';

function enablePageTransitions() {
  const main = document.querySelector('main');
  if (typeof main?.animate !== 'function') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const current = new URL(window.location.href);
  const directory = new URL('.', current).pathname;
  let exitAnimation;

  window.addEventListener('pageshow', () => {
    exitAnimation?.cancel();
    exitAnimation = undefined;
  });

  document.addEventListener('click', async event => {
    if (reducedMotion.matches || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest('a[href]');
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const next = new URL(link.href);
    if (next.protocol !== current.protocol || next.host !== current.host ||
        next.pathname === current.pathname || !next.pathname.endsWith('.html') ||
        new URL('.', next).pathname !== directory) return;

    event.preventDefault();
    if (exitAnimation) return;
    const animation = main.animate([{ opacity: 0.24 }], {
      duration: 150,
      easing: 'ease-in',
      fill: 'forwards'
    });
    exitAnimation = animation;
    try {
      await animation.finished;
    } catch {
      // Continue if the animation was interrupted, unless the page was restored.
    }
    if (exitAnimation === animation) window.location.assign(next.href);
  });
}

enablePageTransitions();

// jQuery 3.7.1 FULL build comes from the CDN first: effects need the full build.
// ready waits for the HTML. This short form means $(document).ready(...).
$(function () {
  $('html').attr('data-bs-theme', 'dark');
  const darkClasses = {
    'bg-white': 'bg-body-secondary',
    'bg-light': 'bg-body-tertiary',
    'text-dark': 'text-light',
    'text-danger': 'text-danger-emphasis',
    'btn-outline-dark': 'btn-outline-light',
    'btn-outline-secondary': 'btn-outline-light',
    'border-dark': 'border-secondary',
    'alert-light': 'alert-dark',
    'table-light': 'table-dark'
  };
  function darkTheme(element) {
    const $element = $(element);
    $.each(darkClasses, function (light, dark) {
      if ($element.hasClass(light)) $element.removeClass(light).addClass(dark);
    });
    if ($element.is('.card, .form-control, .form-select, .list-group-item')) $element.addClass('bg-dark text-light');
    if ($element.is('.table')) $element.addClass('table-dark');
    if ($element.is('.list-group-item')) $element.addClass('border-secondary');
    if ($element.is('a:not(.btn):not(.nav-link):not(.navbar-brand)')) $element.addClass('link-light');
    if ($element.is('.btn-outline-danger')) $element.addClass('text-light');
  }
  $('body').addClass('bg-dark text-light');
  $('*').each(function () {
    darkTheme(this);
  });

  // Return the underlying node so existing arrays can keep references.
  // .get(0) only unwraps the collection; page changes still use jQuery.
  function el(tag, classes = '', text = '') {
    // Chain: create an element -> use existing classes -> insert safe plain text.
    const $element = $('<' + tag + '>').addClass(classes).text(text);
    darkTheme($element);
    return $element.get(0);
  }
  function money(amount) {
    return `${new Intl.NumberFormat('ru-KZ').format(amount)} ₸`;
  }
  function reference(prefix) {
    return window.TopGameLogic.reference(prefix);
  }
  function today() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Almaty',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }
  function localDateTime(date, time) {
    return new Date(`${date}T${time}:00+05:00`).getTime();
  }
  const store = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(`topgame-${key}`);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`topgame-${key}`, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
  };

  // REWRITE 1: .contents().detach(), $.each() and .append() replace replaceChildren/forEach/append.
  // Similar length; detach makes it explicit that reusable equipment cards keep their events.
  function renderList(container, items, renderItem, emptyText = 'Пока ничего нет.') {
    const $container = $(container);
    $container.contents().detach();
    if (!items.length) $container.append(el($container.is('ul, ol') ? 'li' : 'p', 'p-3 mb-0 text-body-secondary', emptyText));else $.each(items, function (index, item) {
      $container.append(renderItem(item, index));
    });
    return items.length;
  }
  function setError(field, message) {
    const $field = $(field);
    const errorId = `${$field.attr('id')}-error`;
    let $error = $('#' + errorId);
    if (!$error.length) {
      $error = $('<span>').addClass('d-block small mt-1 mb-0 hidden').attr('id', errorId);
      $field.after($error);
      const descriptions = ($field.attr('aria-describedby') || '').split(' ').filter(Boolean);
      if (!descriptions.includes(errorId)) descriptions.push(errorId);
      $field.attr('aria-describedby', descriptions.join(' '));
    }
    $error.text(message).toggleClass('hidden', !message).toggleClass('error', Boolean(message));
    // Chain: toggle our error colors -> toggle Bootstrap's invalid border -> expose validity to screen readers.
    $field.toggleClass('error', Boolean(message)).toggleClass('is-invalid', Boolean(message)).attr('aria-invalid', String(Boolean(message)));
    return Boolean(message);
  }
  function clearErrors(form) {
    $(form).find('[aria-invalid="true"]').each(function () {
      setError(this, '');
    });
  }
  function validateContacts(name, email, phone) {
    const digits = phone.trim().replace(/[\s()\-]/g, '');
    return {
      name: name.trim().length >= 2 && name.trim().length <= 80 ? '' : 'Введите имя от 2 до 80 символов.',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 254 ? '' : 'Введите почту в формате name@example.com.',
      phone: /^\+7\d{10}$/.test(digits) ? '' : 'Введите телефон: +7 и 10 цифр, например +7 706 400 50 40.'
    };
  }
  function notify(element, text, state = '') {
    const $message = $(element);
    if (!text) {
      // Fade out dismissed feedback. The callback restores the existing hidden class.
      if (!$message.hasClass('hidden')) $message.stop(true, true).fadeOut(120, function () {
        $(this).addClass('hidden').text('').removeClass('success error');
      });
      return text;
    }
    // Finish a pending dismissal before reading visibility, so rapid edits cannot leave new feedback invisible.
    $message.stop(true, true);
    const wasHidden = $message.hasClass('hidden') || !$message.is(':visible');
    $message.text(text).toggleClass('success', state === 'success').toggleClass('error', state === 'error').removeClass('hidden');
    if (wasHidden) $message.hide().fadeIn(180);
    return text;
  }
  window.TopGame = {
    ...window.TopGameData,
    ...window.TopGameLogic,
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
    notify
  };

  // Update historical capacity text in code while keeping the frozen HTML.
  $('main').find('*').contents().filter(function () {
    return this.nodeType === 3 && /45(?=\s+(?:игров|компьютер|ПК))/.test(this.nodeValue);
  }).each(function () {
    $(this).replaceWith($('<span>').text(this.nodeValue.replace(/45(?=\s+(?:игров|компьютер|ПК))/g, String(window.TopGame.seats.length))));
  });
  $('main input[max="45"]').attr('max', String(window.TopGame.seats.length));
  $('strong abbr[title="персональных компьютеров"]').parent().contents().first().replaceWith($('<span>').text(`${window.TopGame.seats.length} `));
  const $toggle = $('#main-navigation-toggle');
  function syncMenu() {
    $toggle.attr('aria-expanded', String($toggle.prop('checked')));
  }
  $toggle.on('change', syncMenu);
  $('#main-navigation').on('keydown', function (event) {
    if (event.key === 'Escape') {
      $toggle.prop('checked', false).trigger('focus');
      syncMenu();
    }
  });
  syncMenu();
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  $('#main-navigation a.nav-link[href]').each(function () {
    const selected = new URL(this.href).pathname.split('/').pop() === currentPage;
    $(this).toggleClass('active', selected).toggleClass('fw-bold', selected);
    if (selected) $(this).attr('aria-current', 'page');
    else $(this).removeAttr('aria-current');
  });
  const $home = $('#index-content');
  if ($home.length) {
    const $section = $(el('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm'));
    $section.append(el('p', 'small text-uppercase text-danger fw-semibold mb-2', 'Твой следующий сеанс'), el('h2', 'h2 fw-bold mb-3', 'Место для команды и перекус к игре'), el('p', 'mb-3', 'Выберите ПК на схеме зала, подготовьте демо-заявку и соберите заказ еды. Итог и стоимость видны сразу.'));
    const $actions = $('<div>').addClass('d-flex flex-wrap gap-2');
    $actions.append($('<a>').addClass('btn btn-danger').attr('href', 'booking.html#seat-map').text('Выбрать место'), $('<a>').addClass('btn btn-outline-danger').attr('href', 'booking.html#food-menu').text('Посмотреть меню'));
    $section.append($actions);
    $home.children().eq(0).after($section);
  }
});

