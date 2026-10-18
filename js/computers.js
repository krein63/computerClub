'use strict';

function setupComputers() {
    const app = window.TopGame;
    const section = document.getElementById('computers-section-2');
    if (!app || !section) return;

    // 1. Получаем фильтры, карточки зон и область сравнения.
    const controls = document.getElementById('equipment-filters');
    const grid = section.querySelector('.row.g-4');
    const search = document.getElementById('equipment-search');
    const refresh = document.getElementById('equipment-refresh');
    const privacy = document.getElementById('equipment-private');
    const count = document.getElementById('equipment-result-count');
    const comparisonStatus = document.getElementById('equipment-comparison-status');
    const comparisonResult = document.getElementById('equipment-compare-result');
    const clear = document.getElementById('equipment-compare-clear');
    const template = document.getElementById('equipment-card-template');
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
        const article = document.getElementById(zone.article);
        zone.node = article.parentElement;
        zone.checkbox = document.getElementById('compare-' + zone.id);
        zone.capacity = 0;
        for (const seat of app.seats) {
            if (seat.zone === zone.id) zone.capacity += 1;
        }
        article.querySelector('a').href = bookingLink(zone);
        article.querySelector('[data-zone-capacity]').textContent = `Мест на демонстрационной схеме: ${zone.capacity}.`;
        zone.checkbox.addEventListener('change', renderComparison);
    }

    // 2. Собираем зоны, подходящие под все выбранные фильтры.
    function getEquipmentNode(zone) {
        return zone.node;
    }

    function renderEquipment() {
        const query = search.value.trim().toLocaleLowerCase('ru');
        const matches = [];
        for (const zone of equipment) {
            const description = `${zone.name} ${zone.processor} ${zone.graphics}`.toLocaleLowerCase('ru');
            if (!description.includes(query)) continue;
            if (zone.refresh < Number(refresh.value)) continue;
            if (privacy.value === 'private' && !zone.privacy) continue;
            if (privacy.value === 'shared' && zone.privacy) continue;
            matches.push(zone);
        }
        app.renderList(grid, matches, getEquipmentNode, 'Подходящих зон нет. Измените характеристики или сбросьте фильтры.');
        count.textContent = `Найдено зон: ${matches.length} из ${equipment.length}`;
    }

    // 3. Заполняем копию HTML-шаблона для каждой отмеченной зоны.
    function renderComparisonCard(zone) {
        const card = template.content.firstElementChild.cloneNode(true);
        card.querySelector('h3').textContent = zone.name;
        card.querySelector('[data-processor]').textContent = zone.processor;
        card.querySelector('[data-graphics]').textContent = zone.graphics;
        card.querySelector('[data-memory]').textContent = zone.memory + ' GB';
        card.querySelector('[data-refresh]').textContent = 'ASUS ' + zone.refresh + ' Hz';
        card.querySelector('[data-description]').textContent = zone.description;
        card.querySelector('[data-capacity]').textContent = zone.capacity;
        card.querySelector('a').href = bookingLink(zone);
        const remove = card.querySelector('button');
        remove.dataset.removeZone = zone.id;
        remove.addEventListener('click', removeFromComparison);
        return card;
    }

    function renderComparison() {
        const choices = [];
        for (const zone of equipment) {
            const checked = zone.checkbox.checked;
            // Ссылка на карточку работает и после её скрытия фильтром.
            zone.node.querySelector('article').classList.toggle('selected', checked);
            if (checked) choices.push(zone);
        }
        app.renderList(comparisonResult, choices, renderComparisonCard, 'Сравнение пусто. Отметьте зоны в карточках выше.');
        comparisonStatus.textContent = `Выбрано зон: ${choices.length}.`;
        if (choices.length > 0) {
            comparisonStatus.textContent += ' Характеристики взяты из исходного описания клуба; наличие мест проверьте при бронировании.';
        }
        clear.disabled = choices.length === 0;
    }

    function removeFromComparison(event) {
        for (const zone of equipment) {
            if (zone.id === event.currentTarget.dataset.removeZone) zone.checkbox.checked = false;
        }
        renderComparison();
        if (clear.disabled) {
            comparisonStatus.focus();
        } else {
            clear.focus();
        }
    }

    function submitFilters(event) {
        event.preventDefault();
        renderEquipment();
    }

    function resetFilters() {
        controls.reset();
        renderEquipment();
        search.focus();
    }

    function clearComparison() {
        for (const zone of equipment) zone.checkbox.checked = false;
        renderComparison();
        search.focus();
    }

    controls.addEventListener('submit', submitFilters);
    controls.addEventListener('input', renderEquipment);
    document.getElementById('equipment-filter-reset').addEventListener('click', resetFilters);
    clear.addEventListener('click', clearComparison);
    renderEquipment();
    renderComparison();
}

setupComputers();
