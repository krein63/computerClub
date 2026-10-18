'use strict';

function setupMain() {
    // Общие функции используются на всех страницах.

    // Создаёт один элемент, задаёт классы и безопасный текст.
    function el(tag, classes = '', text = '') {
        const element = document.createElement(tag);
        element.className = classes;
        if (text !== '') element.textContent = text;
        return element;
    }

    function money(amount) {
        return `${new Intl.NumberFormat('ru-KZ').format(amount)} ₸`;
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
                if (value === null) return fallback;
                return JSON.parse(value);
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
            let tag = 'p';
            if (container.tagName === 'UL') tag = 'li';
            container.append(el(tag, 'p-3 mb-0 text-body-secondary', emptyText));
        } else {
            for (let index = 0; index < items.length; index++) {
                container.append(renderItem(items[index], index));
            }
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
            const description = field.getAttribute('aria-describedby') || '';
            field.setAttribute('aria-describedby', (description + ' ' + errorId).trim());
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
        for (const field of form.querySelectorAll('[aria-invalid="true"]')) {
            setError(field, '');
        }
    }

    function validateContacts(name, email, phone) {
        const errors = { name: '', email: '', phone: '' };
        name = name.trim();
        email = email.trim();
        const digits = phone.trim().replace(/[\s()\-]/g, '');
        if (name.length < 2 || name.length > 80) {
            errors.name = 'Введите имя от 2 до 80 символов.';
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            errors.email = 'Введите почту в формате name@example.com.';
        }
        if (!/^\+7\d{10}$/.test(digits)) {
            errors.phone = 'Введите телефон: +7 и 10 цифр, например +7 706 400 50 40.';
        }
        return errors;
    }

    function notify(element, text, state = '') {
        element.textContent = text;
        element.classList.toggle('success', state === 'success');
        element.classList.toggle('error', state === 'error');
        element.classList.toggle('hidden', text === '');
        return text;
    }

    window.TopGame = {
        tariffs: window.TopGameData.tariffs,
        menu: window.TopGameData.menu,
        seats: window.TopGameData.seats,
        findProduct: window.TopGameLogic.findProduct,
        validQuantity: window.TopGameLogic.validQuantity,
        cartTotals: window.TopGameLogic.cartTotals,
        filterMenu: window.TopGameLogic.filterMenu,
        estimateVisit: window.TopGameLogic.estimateVisit,
        reference: window.TopGameLogic.reference,
        el: el,
        money: money,
        today: today,
        localDateTime: localDateTime,
        store: store,
        renderList: renderList,
        setError: setError,
        clearErrors: clearErrors,
        validateContacts: validateContacts,
        notify: notify
    };

    const toggle = document.getElementById('main-navigation-toggle');
    if (toggle) {
        const menu = document.getElementById('main-navigation');
        function syncMenu() {
            toggle.setAttribute('aria-expanded', String(toggle.checked));
        }
        toggle.addEventListener('change', syncMenu);
        menu.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                toggle.checked = false;
                syncMenu();
                toggle.focus();
            }
        });
        syncMenu();
    }

}

setupMain();
