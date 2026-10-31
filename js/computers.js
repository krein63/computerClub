// .find(), .val(), .text() and .on() replace native lookups, properties and listeners.
// DOM access is more concise; delegation and effects make the complete feature slightly longer.
'use strict';

function setupComputers() {
    const app = window.TopGame;
    const ui = window.TopGameJQuery;
    const section = $('#computers-section-2');
    if (!app || !section.length) return;

    // 1. Получаем фильтры, карточки зон и область сравнения.
    const controls = $('#equipment-filters');
    const grid = section.find('.row.g-4');
    const search = $('#equipment-search');
    const refresh = $('#equipment-refresh');
    const privacy = $('#equipment-private');
    const count = $('#equipment-result-count');
    const comparisonStatus = $('#equipment-comparison-status');
    const comparisonResult = $('#equipment-compare-result');
    const clear = $('#equipment-compare-clear');
    const template = $('#equipment-card-template');
    const equipment = [
        { id: 'main', name: 'Main', processor: 'Ryzen 9600X', graphics: 'RTX 4070', memory: 32, refresh: 310, privacy: false, description: 'Общий зал для одиночной игры и матчей с друзьями.', article: 'computers-article-1' },
        { id: 'duo', name: 'Duo’s', processor: 'Ryzen 9600X', graphics: 'RTX 4070', memory: 32, refresh: 380, privacy: false, description: 'Места рядом для двух игроков.', article: 'computers-article-2' },
        { id: 'private', name: 'Private', processor: 'Ryzen 7800X3D', graphics: 'RTX 4070 Super', memory: 32, refresh: 380, privacy: true, description: 'Отдельное игровое пространство.', article: 'computers-article-3' }
    ];

    function bookingLink(zone) {
        const params = new URLSearchParams();
        params.set('zone', zone.id);
        if (zone.id === 'duo') params.set('players', '2');
        if (zone.id === 'private') params.set('tariff', 'private');
        return `booking.html?${params.toString()}#gaming-zone-selection`;
    }

    for (const zone of equipment) {
        const article = $('#' + zone.article);
        zone.node = article.parent();
        zone.checkbox = $('#' + 'compare-' + zone.id);
        zone.capacity = 0;
        for (const seat of app.seats) {
            if (seat.zone === zone.id) zone.capacity += 1;
        }
        article.find('a').attr('href', bookingLink(zone));
        article.find('[data-zone-capacity]').text(`Мест на демонстрационной схеме: ${zone.capacity}.`);

    }

    // 2. Собираем зоны, подходящие под все выбранные фильтры.
    function getEquipmentNode(zone) {
        return zone.node;
    }

    function renderEquipment() {
        const query = search.val().trim().toLocaleLowerCase('ru');
        const matches = [];
        for (const zone of equipment) {
            const description = `${zone.name} ${zone.processor} ${zone.graphics}`.toLocaleLowerCase('ru');
            if (!description.includes(query)) continue;
            if (zone.refresh < Number(refresh.val())) continue;
            if (privacy.val() === 'private' && !zone.privacy) continue;
            if (privacy.val() === 'shared' && zone.privacy) continue;
            matches.push(zone);
        }
        equipment.forEach(zone => zone.node.detach());
        ui.renderList(grid, matches, getEquipmentNode, 'Подходящих зон нет. Измените характеристики или сбросьте фильтры.');
        grid.stop(true, true).hide().fadeIn(160);
        count.text(`Найдено зон: ${matches.length} из ${equipment.length}`);
    }

    // 3. Заполняем копию HTML-шаблона для каждой отмеченной зоны.
    function renderComparisonCard(zone) {
        const card = template.contents().children().first().clone();
        card.find('h3').text(zone.name);
        card.find('[data-processor]').text(zone.processor);
        card.find('[data-graphics]').text(zone.graphics);
        card.find('[data-memory]').text(zone.memory + ' GB');
        card.find('[data-refresh]').text('ASUS ' + zone.refresh + ' Hz');
        card.find('[data-description]').text(zone.description);
        card.find('[data-capacity]').text(zone.capacity);
        card.find('a').attr('href', bookingLink(zone));
        const remove = card.find('button');
        remove.attr('data-remove-zone', zone.id);

        return card;
    }

    function renderComparison() {
        const choices = [];
        for (const zone of equipment) {
            const checked = zone.checkbox.is(':checked');
            zone.checkbox.siblings('label').toggleClass('selected', checked);
            // Ссылка на карточку работает и после её скрытия фильтром.
            zone.node.find('article').toggleClass('selected', checked);
            if (checked) choices.push(zone);
        }
        ui.renderList(comparisonResult, choices, renderComparisonCard, 'Сравнение пусто. Отметьте зоны в карточках выше.');
        comparisonStatus.text(`Выбрано зон: ${choices.length}.`);
        if (choices.length > 0) {
            comparisonStatus.text(comparisonStatus.text() + ' Характеристики взяты из исходного описания клуба; наличие мест проверьте при бронировании.');
        }
        clear.prop('disabled', choices.length === 0);
    }

    function removeFromComparison(event) {
        for (const zone of equipment) {
            if (zone.id === $(event.currentTarget).attr('data-remove-zone')) zone.checkbox.prop('checked', false);
        }
        renderComparison();
        if (clear.prop('disabled')) {
            comparisonStatus.trigger('focus');
        } else {
            clear.trigger('focus');
        }
    }

    function submitFilters(event) {
        // Keep filtering/submission local instead of navigating or reloading the page.
        event.preventDefault();
        renderEquipment();
    }

    function resetFilters() {
        controls[0].reset();
        renderEquipment();
        search.trigger('focus');
    }

    function clearComparison() {
        for (const zone of equipment) zone.checkbox.prop('checked', false);
        renderComparison();
        search.trigger('focus');
    }

    // Delegation catches controls on cards reinserted after filtering; direct binding at startup misses future cards.
    grid.on('change.catalog', '[type=checkbox]', renderComparison);
    comparisonResult.on('click.catalog', '[data-remove-zone]', function (event) {
        $(this).closest('article').removeClass('selected');
        removeFromComparison(event);
    });
    controls.on('submit.catalog', submitFilters);
    controls.on('input.catalog change.catalog', renderEquipment);
    $('#equipment-filter-reset').on('click', resetFilters);
    clear.on('click', clearComparison);
    renderEquipment();
    renderComparison();
}

// jQuery 3.7.1 full build supplies effects; ready waits for the form and templates.
$(setupComputers);
