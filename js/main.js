'use strict';

(() => {
    function el(tag, classes = '', text = '') {
        const element = document.createElement(tag);
        if (classes) element.classList.add(...classes.split(' ').filter(Boolean));
        if (text !== '') element.textContent = text;
        return element;
    }

    function money(amount) {
        return `${new Intl.NumberFormat('ru-KZ').format(amount)} ₸`;
    }

    function reference(prefix) {
        return window.TopGameLogic.reference(prefix);
    }

    function today() {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
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

    function renderList(container, items, renderItem, emptyText = 'Пока ничего нет.') {
        container.replaceChildren();
        if (items.length === 0) {
            container.append(el(container.tagName === 'UL' ? 'li' : 'p', 'p-3 mb-0 text-body-secondary', emptyText));
        } else {
            items.forEach((item, index) => container.append(renderItem(item, index)));
        }
        return items.length;
    }

    function setError(field, message) {
        const errorId = `${field.id}-error`;
        let error = document.getElementById(errorId);
        if (!error) {
            error = el('span', 'd-block small mt-1 mb-0 hidden');
            error.id = errorId;
            field.insertAdjacentElement('afterend', error);
            const descriptions = (field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
            field.setAttribute('aria-describedby', [...new Set([...descriptions, errorId])].join(' '));
        }
        error.textContent = message;
        error.classList.toggle('hidden', !message);
        error.classList.toggle('error', Boolean(message));
        field.classList.toggle('error', Boolean(message));
        field.classList.toggle('is-invalid', Boolean(message));
        field.setAttribute('aria-invalid', String(Boolean(message)));
        return Boolean(message);
    }

    function clearErrors(form) {
        form.querySelectorAll('[aria-invalid="true"]').forEach(field => setError(field, ''));
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
        element.textContent = text;
        element.classList.toggle('success', state === 'success');
        element.classList.toggle('error', state === 'error');
        element.classList.toggle('hidden', text === '');
        return text;
    }

    window.TopGame = { ...window.TopGameData, ...window.TopGameLogic, el, money, reference, today, localDateTime, store, renderList, setError, clearErrors, validateContacts, notify };

    const toggle = document.getElementById('main-navigation-toggle');
    if (toggle) {
        const menu = document.getElementById('main-navigation');
        const syncMenu = () => {
            toggle.setAttribute('aria-expanded', String(toggle.checked));
            // CSS already handles visibility; this adds keyboard Escape behavior.
        };
        toggle.addEventListener('change', syncMenu);
        menu.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                toggle.checked = false;
                syncMenu();
                toggle.focus();
            }
        });
        syncMenu();
    }

    const nav = document.querySelector('#main-navigation .navbar-nav');
    if (nav) {
        const foodLink = el('a', 'nav-link px-2', 'Еда');
        foodLink.href = 'booking.html#food-menu';
        foodLink.id = 'nav-food';
        const item = el('li', 'nav-item');
        item.append(foodLink);
        nav.append(item);
    }

    const home = document.getElementById('index-content');
    if (home) {
        const section = el('section', 'bg-dark text-white rounded-4 p-3 p-md-4 p-lg-5 mb-4');
        section.append(el('p', 'small text-uppercase mb-2', 'Твой следующий сеанс'), el('h2', 'h2 fw-bold mb-3', 'Место для команды и перекус к игре'), el('p', 'mb-3', 'Выберите ПК на схеме зала, подготовьте демо-заявку и соберите заказ еды. Итог и стоимость видны сразу.'));
        const actions = el('div', 'd-flex flex-wrap gap-2');
        const booking = el('a', 'btn btn-danger', 'Выбрать место');
        booking.href = 'booking.html#seat-map';
        const food = el('a', 'btn btn-outline-light', 'Посмотреть меню');
        food.href = 'booking.html#food-menu';
        actions.append(booking, food);
        section.append(actions);
        home.insertBefore(section, home.children[1] || null);
    }
})();
