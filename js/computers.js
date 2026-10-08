'use strict';

(() => {
    const app = window.TopGame;
    const section = document.getElementById('computers-section-2');
    if (!app || !section) return;
    const grid = section.querySelector('.row');
    const equipment = [
        { id: 'main', name: 'Main', processor: 'Ryzen 9600X', graphics: 'RTX 4070', memory: 32, refresh: 310, privacy: false, description: 'Общий зал для одиночной игры и матчей с друзьями.', article: 'computers-article-1' },
        { id: 'duo', name: 'Duo’s', processor: 'Ryzen 9600X', graphics: 'RTX 4070', memory: 32, refresh: 380, privacy: false, description: 'Места рядом для двух игроков.', article: 'computers-article-2' },
        { id: 'private', name: 'Private', processor: 'Ryzen 7800X3D', graphics: 'RTX 4070 Super', memory: 32, refresh: 380, privacy: true, description: 'Отдельное игровое пространство.', article: 'computers-article-3' }
    ].map(zone => ({ ...zone, capacity: app.seats.filter(seat => seat.zone === zone.id).length, node: document.getElementById(zone.article).parentElement }));
    const selected = new Set();
    const controls = app.el('form', 'row g-3 mb-4');
    controls.setAttribute('role', 'search');
    controls.setAttribute('aria-label', 'Подбор игрового оборудования');
    function makeControl(id, labelText, kind, choices) {
        const wrapper = app.el('div', 'col-12 col-md-4');
        const label = app.el('label', 'form-label fw-semibold', labelText);
        label.htmlFor = id;
        const field = app.el(kind, kind === 'select' ? 'form-select' : 'form-control');
        field.id = id;
        if (choices) choices.forEach(([value, text]) => {
            const option = app.el('option', '', text);
            option.value = value;
            field.append(option);
        });
        wrapper.append(label, field);
        controls.append(wrapper);
        return field;
    }
    const search = makeControl('equipment-search', 'Зона, процессор или видеокарта', 'input');
    search.type = 'search';
    const refresh = makeControl('equipment-refresh', 'Минимальная частота монитора', 'select', [['0', 'Любая частота'], ['310', 'От 310 Hz'], ['380', 'От 380 Hz']]);
    const privacy = makeControl('equipment-private', 'Игровое пространство', 'select', [['all', 'Все зоны'], ['shared', 'Общий зал / Duo’s'], ['private', 'Отдельная зона']]);
    const reset = app.el('button', 'btn btn-outline-secondary', 'Сбросить фильтры');
    reset.type = 'button';
    reset.id = 'equipment-filter-reset';
    const count = app.el('p', 'mb-0');
    count.id = 'equipment-result-count';
    count.setAttribute('aria-live', 'polite');
    const actions = app.el('div', 'col-12 d-flex flex-wrap align-items-center gap-3');
    actions.append(reset, count);
    controls.append(actions);
    grid.before(controls);

    const comparison = app.el('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
    comparison.id = 'equipment-comparison';
    const heading = app.el('h2', 'h2 fw-bold mb-3', 'Сравнить выбранные зоны');
    heading.id = 'equipment-comparison-title';
    comparison.setAttribute('aria-labelledby', heading.id);
    const comparisonStatus = app.el('p', 'mb-3');
    comparisonStatus.id = 'equipment-comparison-status';
    comparisonStatus.setAttribute('role', 'status');
    comparisonStatus.setAttribute('aria-live', 'polite');
    comparisonStatus.tabIndex = -1;
    const comparisonResult = app.el('div', 'row g-3 mb-3');
    comparisonResult.id = 'equipment-compare-result';
    const clear = app.el('button', 'btn btn-outline-secondary', 'Очистить сравнение');
    clear.type = 'button';
    clear.id = 'equipment-compare-clear';
    comparison.append(heading, comparisonStatus, comparisonResult, clear);
    section.after(comparison);

    function bookingLink(zone) {
        const params = new URLSearchParams({ zone: zone.id });
        if (zone.id === 'duo') params.set('players', '2');
        if (zone.id === 'private') params.set('tariff', 'private');
        return `booking.html?${params.toString()}#gaming-zone-selection`;
    }
    equipment.forEach(zone => {
        const article = document.getElementById(zone.article);
        article.querySelector('a').href = bookingLink(zone);
        const wrapper = app.el('div', 'form-check mt-3');
        const checkbox = app.el('input', 'form-check-input');
        checkbox.type = 'checkbox';
        checkbox.id = `compare-${zone.id}`;
        const label = app.el('label', 'form-check-label', `Сравнить ${zone.name}`);
        label.htmlFor = checkbox.id;
        wrapper.append(checkbox, label);
        article.querySelector('.card-body').append(wrapper);
        article.querySelector('.card-body').append(app.el('p', 'small text-body-secondary mt-3 mb-0', `Мест на демонстрационной схеме: ${zone.capacity}.`));
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) selected.add(zone.id);
            else selected.delete(zone.id);
            renderComparison();
        });
    });

    function renderEquipment() {
        const query = search.value.trim().toLocaleLowerCase('ru');
        const matches = equipment.filter(zone => `${zone.name} ${zone.processor} ${zone.graphics}`.toLocaleLowerCase('ru').includes(query)
            && zone.refresh >= Number(refresh.value)
            && (privacy.value === 'all' || zone.privacy === (privacy.value === 'private')));
        app.renderList(grid, matches, zone => zone.node, 'Подходящих зон нет. Измените характеристики или сбросьте фильтры.');
        count.textContent = `Найдено зон: ${matches.length} из ${equipment.length}`;
    }
    function renderComparisonCard(zone) {
        const column = app.el('div', 'col-12 col-md-6 col-lg-4');
        const card = app.el('article', 'card h-100');
        const body = app.el('div', 'card-body d-flex flex-column');
        body.append(app.el('h3', 'h4 fw-bold mb-3', zone.name));
        const specifications = app.el('dl', 'mb-3');
        [['Процессор', zone.processor], ['Видеокарта', zone.graphics], ['Память', `${zone.memory} GB`], ['Монитор', `ASUS ${zone.refresh} Hz`], ['Формат', zone.description], ['Мест на демонстрационной схеме', String(zone.capacity)]].forEach(([label, value]) => {
            specifications.append(app.el('dt', 'fw-semibold', label), app.el('dd', 'mb-2 text-break', value));
        });
        const next = app.el('a', 'btn btn-danger mb-2', 'Выбрать зону');
        next.href = bookingLink(zone);
        const remove = app.el('button', 'btn btn-outline-secondary', 'Убрать из сравнения');
        remove.type = 'button';
        remove.dataset.removeZone = zone.id;
        remove.addEventListener('click', () => {
            selected.delete(zone.id);
            renderComparison();
            if (clear.disabled) comparisonStatus.focus();
            else clear.focus();
        });
        body.append(specifications, next, remove);
        card.append(body);
        column.append(card);
        return column;
    }
    function renderComparison() {
        const choices = equipment.filter(zone => selected.has(zone.id));
        equipment.forEach(zone => {
            // Nodes remain usable when a filter removes their wrapper from the document.
            zone.node.querySelector('article').classList.toggle('selected', selected.has(zone.id));
            zone.node.querySelector(`#compare-${zone.id}`).checked = selected.has(zone.id);
        });
        app.renderList(comparisonResult, choices, renderComparisonCard, 'Сравнение пусто. Отметьте зоны в карточках выше.');
        comparisonStatus.textContent = choices.length === 0 ? 'Выбрано зон: 0.' : `Выбрано зон: ${choices.length}. Характеристики взяты из исходного описания клуба; наличие мест проверьте при бронировании.`;
        clear.disabled = choices.length === 0;
    }
    controls.addEventListener('submit', event => { event.preventDefault(); renderEquipment(); });
    controls.addEventListener('input', renderEquipment);
    controls.addEventListener('change', renderEquipment);
    reset.addEventListener('click', () => { controls.reset(); renderEquipment(); search.focus(); });
    clear.addEventListener('click', () => {
        selected.clear();
        renderComparison();
        search.focus();
    });
    renderEquipment();
    renderComparison();
})();
