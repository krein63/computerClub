// jQuery 3.7.1 full build: ready waits for the DOM; full build provides effects.
// .find(), .val(), .on() replace native queries/properties/listeners; creation code remains explicit.
'use strict';

$(function () {
    const app = window.TopGame;
    const ui = window.TopGameJQuery;
    const make = (tag, classes = '', text = '') => $('<' + tag + '>').addClass(classes).text(text);
    const section = $('#computers-section-2');
    if (!app || !section.length) return;
    const grid = section.find('.row');
    const equipment = [
        { id: 'main', name: 'Main', processor: 'Ryzen 9600X', graphics: 'RTX 4070', memory: 32, refresh: 310, privacy: false, description: 'Общий зал для одиночной игры и матчей с друзьями.', article: 'computers-article-1' },
        { id: 'duo', name: 'Duo’s', processor: 'Ryzen 9600X', graphics: 'RTX 4070', memory: 32, refresh: 380, privacy: false, description: 'Места рядом для двух игроков.', article: 'computers-article-2' },
        { id: 'private', name: 'Private', processor: 'Ryzen 7800X3D', graphics: 'RTX 4070 Super', memory: 32, refresh: 380, privacy: true, description: 'Отдельное игровое пространство.', article: 'computers-article-3' }
    ].map(zone => ({ ...zone, capacity: app.seats.filter(seat => seat.zone === zone.id).length, node: $('#' + zone.article).parent() }));
    let selected = [];
    const controls = make('form', 'row g-3 mb-4');
    controls.attr('role', 'search');
    controls.attr('aria-label', 'Подбор игрового оборудования');
    function makeControl(id, labelText, kind, choices) {
        const wrapper = make('div', 'col-12 col-md-4');
        const label = make('label', 'form-label fw-semibold', labelText);
        label.attr('for', id);
        const field = make(kind, kind === 'select' ? 'form-select' : 'form-control');
        field.attr('id', id);
        if (choices) choices.forEach(([value, text]) => {
            const option = make('option', '', text);
            option.val(value);
            field.append(option);
        });
        wrapper.append(label, field);
        controls.append(wrapper);
        return field;
    }
    const search = makeControl('equipment-search', 'Зона, процессор или видеокарта', 'input');
    search.attr('type', 'search');
    const refresh = makeControl('equipment-refresh', 'Минимальная частота монитора', 'select', [['0', 'Любая частота'], ['310', 'От 310 Hz'], ['380', 'От 380 Hz']]);
    const privacy = makeControl('equipment-private', 'Игровое пространство', 'select', [['all', 'Все зоны'], ['shared', 'Общий зал / Duo’s'], ['private', 'Отдельная зона']]);
    const reset = make('button', 'btn btn-outline-secondary', 'Сбросить фильтры');
    reset.attr('type', 'button');
    reset.attr('id', 'equipment-filter-reset');
    const count = make('p', 'mb-0');
    count.attr('id', 'equipment-result-count');
    count.attr('aria-live', 'polite');
    const actions = make('div', 'col-12 d-flex flex-wrap align-items-center gap-3');
    actions.append(reset, count);
    controls.append(actions);
    grid.before(controls);

    const comparison = make('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
    comparison.attr('id', 'equipment-comparison');
    const heading = make('h2', 'h2 fw-bold mb-3', 'Сравнить выбранные зоны');
    heading.attr('id', 'equipment-comparison-title');
    comparison.attr('aria-labelledby', heading.attr('id'));
    const comparisonStatus = make('p', 'mb-3');
    comparisonStatus.attr('id', 'equipment-comparison-status');
    comparisonStatus.attr('role', 'status');
    comparisonStatus.attr('aria-live', 'polite');
    comparisonStatus.attr('tabindex', '-1');
    const comparisonResult = make('div', 'row g-3 mb-3');
    comparisonResult.attr('id', 'equipment-compare-result');
    const clear = make('button', 'btn btn-outline-secondary', 'Очистить сравнение');
    clear.attr('type', 'button');
    clear.attr('id', 'equipment-compare-clear');
    comparison.append(heading, comparisonStatus, comparisonResult, clear);
    section.after(comparison);

    function bookingLink(zone) {
        const params = new URLSearchParams({ zone: zone.id });
        if (zone.id === 'duo') params.set('players', '2');
        if (zone.id === 'private') params.set('tariff', 'private');
        return `booking.html?${params.toString()}#gaming-zone-selection`;
    }
    equipment.forEach(zone => {
        const article = $('#' + zone.article);
        article.find('a').attr('href', bookingLink(zone));
        const wrapper = make('div', 'form-check mt-3');
        const checkbox = make('input', 'form-check-input');
        checkbox.attr('type', 'checkbox');
        checkbox.attr('id', `compare-${zone.id}`);
        const label = make('label', 'form-check-label', `Сравнить ${zone.name}`);
        label.attr('for', checkbox.attr('id'));
        wrapper.append(checkbox, label);
        article.find('.card-body').append(wrapper);
        article.find('.card-body').append(make('p', 'small text-body-secondary mt-3 mb-0', `Мест на демонстрационной схеме: ${zone.capacity}.`));
        checkbox.on('change', () => {
            if (checkbox.is(':checked')) selected.push(zone.id);
            else selected = selected.filter(id => id !== zone.id);
            renderComparison();
        });
    });

    function renderEquipment() {
        const query = search.val().trim().toLocaleLowerCase('ru');
        const matches = equipment.filter(zone => `${zone.name} ${zone.processor} ${zone.graphics}`.toLocaleLowerCase('ru').includes(query)
            && zone.refresh >= Number(refresh.val())
            && (privacy.val() === 'all' || zone.privacy === (privacy.val() === 'private')));
        equipment.forEach(zone => zone.node.detach());
        ui.renderList(grid, matches, zone => zone.node, 'Подходящих зон нет. Измените характеристики или сбросьте фильтры.');
        grid.stop(true, true).hide().fadeIn(160);
        count.text(`Найдено зон: ${matches.length} из ${equipment.length}`);
    }
    function renderComparisonCard(zone) {
        const column = make('div', 'col-12 col-md-6 col-lg-4');
        const card = make('article', 'card h-100');
        const body = make('div', 'card-body d-flex flex-column');
        body.append(make('h3', 'h4 fw-bold mb-3', zone.name));
        const specifications = make('dl', 'mb-3');
        [['Процессор', zone.processor], ['Видеокарта', zone.graphics], ['Память', `${zone.memory} GB`], ['Монитор', `ASUS ${zone.refresh} Hz`], ['Формат', zone.description], ['Мест на демонстрационной схеме', String(zone.capacity)]].forEach(([label, value]) => {
            specifications.append(make('dt', 'fw-semibold', label), make('dd', 'mb-2 text-break', value));
        });
        const next = make('a', 'btn btn-danger mb-2', 'Выбрать зону');
        next.attr('href', bookingLink(zone));
        const remove = make('button', 'btn btn-outline-secondary', 'Убрать из сравнения');
        remove.attr('type', 'button');
        remove.attr('data-remove-zone', zone.id);

        body.append(specifications, next, remove);
        card.append(body);
        column.append(card);
        return column;
    }
    function renderComparison() {
        const choices = equipment.filter(zone => selected.includes(zone.id));
        equipment.forEach(zone => {
            zone.node.find('[type=checkbox]').siblings('label').toggleClass('selected', selected.includes(zone.id));
            // Nodes remain usable when a filter removes their wrapper from the document.
            zone.node.find('article').toggleClass('selected', selected.includes(zone.id));
            zone.node.find(`#compare-${zone.id}`).prop('checked', selected.includes(zone.id));
        });
        ui.renderList(comparisonResult, choices, renderComparisonCard, 'Сравнение пусто. Отметьте зоны в карточках выше.');
        comparisonStatus.text(choices.length === 0 ? 'Выбрано зон: 0.' : `Выбрано зон: ${choices.length}. Характеристики взяты из исходного описания клуба; наличие мест проверьте при бронировании.`);
        clear.prop('disabled', choices.length === 0);
    }
    // Comparison cards are rendered later, so delegate rather than binding nonexistent buttons.
    comparisonResult.on('click.catalog', '[data-remove-zone]', function () {
        const id = $(this).closest('button').attr('data-remove-zone');
        selected = selected.filter(value => value !== id);
        renderComparison();
        (clear.prop('disabled') ? comparisonStatus : clear).trigger('focus');
    });
    controls.on('submit', event => { // Prevent a reload: this action only changes the local demonstration.
        event.preventDefault(); renderEquipment(); });
    controls.on('input', renderEquipment);
    controls.on('change', renderEquipment);
    reset.on('click', () => { controls[0].reset(); renderEquipment(); search.trigger('focus'); });
    clear.on('click', () => {
        selected = [];
        renderComparison();
        search.trigger('focus');
    });
    renderEquipment();
    renderComparison();
});
