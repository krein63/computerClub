'use strict';

(() => {
    const app = window.TopGame;
    const helpSection = document.getElementById('rule-table');
    const safetySection = document.getElementById('account-safety');
    if (!app || !helpSection || !safetySection) return;
    // Готовый класс Bootstrap сохраняет читаемость исходной таблицы в тёмной теме.
    helpSection.querySelector('table').classList.add('table-dark');

    // Инструкции основаны на правилах этой страницы; помощь не отправляет заявки.
    const situations = [
        { id: 'device', title: 'Не работает устройство', category: 'equipment', keywords: 'мышь клавиатура гарнитура компьютер техника', steps: ['Позовите администратора и объясните, какое устройство не работает.', 'Не разбирайте и не переносите оборудование самостоятельно.'], link: 'about.html#contacts', action: 'Открыть контакты клуба' },
        { id: 'damage', title: 'Обнаружено повреждение до начала игры', category: 'equipment', keywords: 'сломано повреждение техника начало', steps: ['Сообщите администратору о повреждении до начала сеанса.', 'Не пытайтесь самостоятельно ремонтировать устройство.'], link: 'about.html#contacts', action: 'Открыть контакты клуба' },
        { id: 'extend', title: 'Нужно продлить время', category: 'visit', keywords: 'сеанс время продление тариф', steps: ['До окончания сеанса уточните у администратора доступность вашего места.', 'Согласуйте стоимость и возможность продления; калькулятор показывает только ориентир.'], link: 'prices.html', action: 'Посмотреть тарифы' },
        { id: 'lost', title: 'Найдена чужая вещь', category: 'visit', keywords: 'забыто потеряно вещи находка', steps: ['Передайте найденную вещь администратору.', 'Не забирайте чужие вещи с собой.'], link: 'about.html#contacts', action: 'Открыть контакты клуба' },
        { id: 'account', title: 'Нужно безопасно выйти из аккаунтов', category: 'account', keywords: 'пароль браузер выход безопасность логин', steps: ['Выйдите из игровых клиентов и аккаунтов в браузере.', 'Не сохраняйте пароль на общем компьютере и выполните проверку перед уходом.'], link: '#departure-checklist', action: 'Открыть проверку перед уходом' },
        { id: 'install', title: 'Нужна другая игра или программа', category: 'equipment', keywords: 'установка скачать игра программа версия', steps: ['Не устанавливайте программы самостоятельно.', 'Уточните возможность установки у администратора. На странице игр можно подготовить демонстрационный запрос.'], link: 'games.html#game-request', action: 'Открыть запрос игры' }
    ];
    const categories = { equipment: 'Оборудование', visit: 'Посещение', account: 'Аккаунты' };
    const departureItems = [
        { id: 'clients', text: 'Я вышел из игровых клиентов.' },
        { id: 'browser', text: 'Я вышел из аккаунтов в браузере и не сохранил пароли.' },
        { id: 'belongings', text: 'Я забрал свои личные вещи.' },
        { id: 'workstation', text: 'Я проверил чистоту места и сообщил о проблемах администратору.' }
    ];

    function filterSituations(items, query, category) {
        const text = query.trim().toLocaleLowerCase('ru');
        return items.filter(item => (category === 'all' || item.category === category)
            && `${item.title} ${item.keywords} ${item.steps.join(' ')}`.toLocaleLowerCase('ru').includes(text));
    }

    function findSituation(items, id) {
        return items.find(item => item.id === id);
    }

    function getCompletedItems(items, selectedIds) {
        return items.filter(item => selectedIds.includes(item.id));
    }

    function checklistSummary(items, selectedIds) {
        const completed = getCompletedItems(items, selectedIds);
        return {
            completed: completed.length,
            total: items.length,
            remaining: items.filter(item => !selectedIds.includes(item.id)),
            ready: items.length > 0 && completed.length === items.length
        };
    }

    function makeButton(text, id, classes = 'btn btn-outline-danger') {
        const button = app.el('button', classes, text);
        button.type = 'button';
        button.id = id;
        return button;
    }

    function addControl(container, id, labelText, tag) {
        const wrapper = app.el('div', 'col-12 col-md-6');
        const label = app.el('label', 'form-label fw-semibold', labelText);
        label.htmlFor = id;
        const field = app.el(tag, tag === 'select' ? 'form-select' : 'form-control');
        field.id = id;
        wrapper.append(label, field);
        container.append(wrapper);
        return field;
    }

    // Существующая таблица остаётся; поисковые элементы создаются через DOM.
    const finder = app.el('div', 'mt-4');
    finder.append(app.el('h3', 'h4 fw-bold mb-3', 'Найти помощь по ситуации'));
    const controls = app.el('form', 'row g-3 mb-3');
    controls.setAttribute('role', 'search');
    controls.setAttribute('aria-label', 'Поиск помощи по правилам клуба');
    const search = addControl(controls, 'rules-search', 'Опишите ситуацию', 'input');
    search.type = 'search';
    const category = addControl(controls, 'rules-category', 'Категория', 'select');
    for (const [value, text] of [['all', 'Все категории'], ...Object.entries(categories)]) {
        const option = app.el('option', '', text);
        option.value = value;
        category.append(option);
    }
    const actions = app.el('div', 'col-12 d-flex flex-wrap gap-3 align-items-center');
    const reset = makeButton('Сбросить поиск', 'rules-filter-reset', 'btn btn-outline-secondary');
    const count = app.el('p', 'mb-0');
    count.id = 'rules-result-count';
    count.setAttribute('role', 'status');
    actions.append(reset, count);
    controls.append(actions);
    const list = app.el('div', 'row g-3');
    list.id = 'rules-help-list';
    const detail = app.el('section', 'bg-body-tertiary border rounded-3 p-3 p-md-4 mt-4');
    detail.id = 'rules-help-detail';
    detail.setAttribute('aria-label', 'Инструкции для выбранной ситуации');
    finder.append(controls, list, detail);
    helpSection.append(finder);
    let selectedSituation = '';

    function renderSituation(item) {
        const column = app.el('div', 'col-12 col-md-6');
        const card = app.el('article', 'card h-100');
        card.classList.toggle('selected', item.id === selectedSituation);
        const body = app.el('div', 'card-body d-flex flex-column');
        body.append(app.el('p', 'small text-body-secondary mb-2', categories[item.category]), app.el('h4', 'h5 fw-bold mb-3', item.title));
        const choose = makeButton('Показать действия', `rules-choose-${item.id}`, 'btn btn-outline-danger mt-auto');
        choose.setAttribute('aria-controls', detail.id);
        choose.setAttribute('aria-pressed', String(item.id === selectedSituation));
        choose.addEventListener('click', () => {
            selectedSituation = item.id;
            renderHelp();
            detail.querySelector('h3').focus();
        });
        body.append(choose);
        card.append(body);
        column.append(card);
        return column;
    }

    function renderHelpDetail(item) {
        detail.replaceChildren();
        if (!item) {
            detail.append(app.el('p', 'mb-0', 'Выберите ситуацию, чтобы увидеть инструкции и следующий шаг.'));
            return;
        }
        const heading = app.el('h3', 'h4 fw-bold mb-3', item.title);
        heading.tabIndex = -1;
        const steps = app.el('ol', 'ps-3 mb-3');
        app.renderList(steps, item.steps, text => app.el('li', 'mb-2', text), 'Уточните действия у администратора.');
        const next = app.el('a', 'btn btn-danger', item.action);
        next.href = item.link;
        const close = makeButton('Закрыть инструкции', 'rules-detail-close', 'btn btn-outline-secondary');
        close.addEventListener('click', () => {
            const previousId = selectedSituation;
            selectedSituation = '';
            renderHelp();
            document.getElementById(`rules-choose-${previousId}`)?.focus();
        });
        const links = app.el('div', 'd-flex flex-wrap gap-2');
        links.append(next, close);
        detail.append(heading, steps, links, app.el('p', 'small text-body-secondary mt-3 mb-0', 'Инструкции не отправляют сообщение администратору. Для помощи обратитесь к персоналу клуба.'));
    }

    function renderHelp() {
        const matches = filterSituations(situations, search.value, category.value);
        if (!matches.some(item => item.id === selectedSituation)) selectedSituation = '';
        app.renderList(list, matches, renderSituation, 'Подходящих ситуаций нет. Измените запрос или сбросьте поиск.');
        count.textContent = `Найдено ситуаций: ${matches.length} из ${situations.length}`;
        renderHelpDetail(findSituation(matches, selectedSituation));
    }

    controls.addEventListener('input', renderHelp);
    controls.addEventListener('change', renderHelp);
    controls.addEventListener('submit', event => { event.preventDefault(); renderHelp(); });
    reset.addEventListener('click', () => {
        controls.reset();
        selectedSituation = '';
        renderHelp();
        search.focus();
    });

    const checklist = app.el('section', 'bg-body-tertiary border rounded-3 p-3 p-md-4 mt-4');
    checklist.id = 'departure-checklist';
    checklist.setAttribute('aria-labelledby', 'departure-title');
    const title = app.el('h3', 'h4 fw-bold mb-3', 'Проверка перед уходом');
    title.id = 'departure-title';
    checklist.append(title, app.el('p', 'mb-3', 'Отметьте выполненные действия. Это ваша самостоятельная проверка: сайт не проверяет аккаунты и не завершает сеанс на ПК.'));
    const checklistList = app.el('ul', 'list-group mb-3');
    checklistList.id = 'departure-list';

    function renderDepartureItem(item) {
        const row = app.el('li', 'list-group-item bg-dark text-light');
        const input = app.el('input', 'form-check-input me-2');
        input.type = 'checkbox';
        input.id = `departure-${item.id}`;
        input.value = item.id;
        const label = app.el('label', 'form-check-label', item.text);
        label.htmlFor = input.id;
        row.append(input, label);
        return row;
    }

    app.renderList(checklistList, departureItems, renderDepartureItem, 'Нет пунктов для проверки.');
    const progress = app.el('p', 'fw-semibold mb-3');
    progress.id = 'departure-progress';
    progress.setAttribute('role', 'status');
    const remainingLabel = app.el('p', 'mb-2', 'Осталось выполнить:');
    const remainingList = app.el('ul', 'ps-3 mb-3');
    remainingList.id = 'departure-remaining';
    const complete = makeButton('Завершить проверку', 'departure-complete', 'btn btn-danger');
    const clear = makeButton('Начать заново', 'departure-reset', 'btn btn-outline-secondary');
    const checklistActions = app.el('div', 'd-flex flex-wrap gap-2');
    checklistActions.append(complete, clear);
    const message = app.el('p', 'p-3 mt-3 mb-0 hidden');
    message.id = 'departure-confirmation';
    message.setAttribute('role', 'status');
    checklist.append(checklistList, progress, remainingLabel, remainingList, checklistActions, message);
    safetySection.querySelector('aside').before(checklist);

    function currentChecklistSummary() {
        const selectedIds = Array.from(checklistList.querySelectorAll('input:checked'), input => input.value);
        return checklistSummary(departureItems, selectedIds);
    }

    function updateChecklist() {
        const summary = currentChecklistSummary();
        progress.textContent = `Выполнено: ${summary.completed} из ${summary.total}. ${summary.ready ? 'Можно завершить проверку.' : 'Отметьте оставшиеся действия.'}`;
        progress.classList.toggle('success', summary.ready);
        complete.disabled = !summary.ready;
        checklistList.querySelectorAll('li').forEach(row => row.classList.toggle('selected', row.querySelector('input').checked));
        app.renderList(remainingList, summary.remaining, item => app.el('li', 'mb-2', item.text), 'Все пункты отмечены.');
        remainingLabel.classList.toggle('hidden', summary.ready);
        app.notify(message, '');
        return summary;
    }

    checklistList.addEventListener('change', updateChecklist);
    complete.addEventListener('click', () => {
        const summary = currentChecklistSummary();
        if (!summary.ready) return;
        app.notify(message, `Самопроверка завершена: ${summary.completed} из ${summary.total} действий отмечены. Спасибо за заботу о безопасности и порядке.`, 'success');
    });
    clear.addEventListener('click', () => {
        checklistList.querySelectorAll('input').forEach(input => { input.checked = false; });
        updateChecklist();
        app.notify(message, 'Проверка сброшена. Можно начать заново.');
        checklistList.querySelector('input').focus();
    });

    renderHelp();
    updateChecklist();
})();
