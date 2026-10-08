'use strict';

(() => {
    const app = window.TopGame;
    const list = document.getElementById('game-cards');
    if (!app || !list) return;

    // Mentioned games and visitor suggestions are distinguished from installed games.
    const games = [
        { id: 'cs2', title: 'Counter-Strike 2', genre: 'shooter', format: 'Командный шутер, 5 × 5', source: true, official: 'https://www.counter-strike.net/cs2', image: 'images/gaming-hall-blue.jpg' },
        { id: 'dota2', title: 'Dota 2', genre: 'moba', format: 'MOBA, две команды по пять игроков', source: true, official: 'https://www.dota2.com/', image: 'images/peripherals.jpg' },
        { id: 'valorant', title: 'VALORANT', genre: 'shooter', format: 'Тактический шутер, 5 × 5', source: false, official: 'https://playvalorant.com/' },
        { id: 'lol', title: 'League of Legends', genre: 'moba', format: 'Командная MOBA', source: false, official: 'https://www.leagueoflegends.com/' },
        { id: 'rocket-league', title: 'Rocket League', genre: 'sports', format: 'Футбол на автомобилях', source: false, official: 'https://www.rocketleague.com/' },
        { id: 'civilization', title: 'Sid Meier’s Civilization VI', genre: 'strategy', format: 'Пошаговая стратегия', source: false, official: 'https://civilization.2k.com/civ-vi/' }
    ];
    const genreNames = { shooter: 'Шутер', moba: 'MOBA', strategy: 'Стратегия', sports: 'Спорт' };
    const form = document.getElementById('game-request-form');
    const titleField = document.getElementById('game-title');
    const genreField = document.getElementById('genre');
    const dateField = document.getElementById('visit-date');
    const playersField = document.getElementById('players');
    const status = document.getElementById('game-request-status');
    const success = document.getElementById('game-request-success');
    const errors = document.getElementById('game-request-errors');
    const resultStatus = document.getElementById('game-request-result-status');
    const resultList = document.getElementById('game-request-list');
    let attempted = false;

    const controls = app.el('form', 'row g-3 mb-4');
    controls.setAttribute('role', 'search');
    controls.setAttribute('aria-label', 'Поиск и фильтры игр');
    function addControl(id, labelText, kind, options) {
        const wrapper = app.el('div', 'col-12 col-md-6 col-lg-3');
        const label = app.el('label', 'form-label fw-semibold', labelText);
        label.htmlFor = id;
        const field = app.el(kind, kind === 'select' ? 'form-select' : 'form-control');
        field.id = id;
        if (kind === 'input') field.type = 'search';
        if (options) options.forEach(([value, text]) => {
            const option = app.el('option', '', text);
            option.value = value;
            field.append(option);
        });
        wrapper.append(label, field);
        controls.append(wrapper);
        return field;
    }
    const search = addControl('games-search', 'Название игры', 'input');
    const category = addControl('games-category', 'Жанр', 'select', [['all', 'Все жанры'], ...Object.entries(genreNames)]);
    const availability = addControl('games-availability', 'Каталог', 'select', [['all', 'Все игры'], ['source', 'Упомянуты на сайте'], ['suggestion', 'Предложения для клуба']]);
    const sort = addControl('games-sort', 'Сортировать', 'select', [['name', 'По названию А–Я'], ['genre', 'По жанру']]);
    const actions = app.el('div', 'col-12 d-flex flex-wrap align-items-center gap-3');
    const reset = app.el('button', 'btn btn-outline-secondary', 'Сбросить фильтры');
    reset.type = 'button';
    reset.id = 'games-filter-reset';
    const count = app.el('p', 'mb-0');
    count.id = 'games-result-count';
    count.setAttribute('aria-live', 'polite');
    actions.append(reset, count);
    controls.append(actions);
    list.before(controls);
    list.closest('section').querySelector('header .lead').textContent = 'Выберите игру для запроса. Counter-Strike 2 и Dota 2 упомянуты в исходном каталоге; остальные игры — предложения. Наличие и версии всех игр нужно уточнить у клуба.';

    function renderGame(game) {
        const column = app.el('div', 'col-12 col-md-6 col-lg-4');
        const card = app.el('article', 'card h-100 shadow-sm');
        card.id = `game-${game.id}`;
        const body = app.el('div', 'card-body p-3 p-lg-4 d-flex flex-column');
        body.append(app.el('h2', 'h4 fw-bold mb-3', game.title));
        if (game.image) {
            const figure = app.el('figure', 'mb-3');
            const image = app.el('img', 'w-100 object-fit-cover rounded-3');
            image.src = game.image;
            image.alt = game.id === 'cs2' ? 'Игровой зал TOP GAME с синим освещением' : 'Периферия игрового места TOP GAME';
            image.height = 190;
            figure.append(image, app.el('figcaption', 'small text-body-secondary mt-2', 'Фотография клуба TOP GAME, не изображение игры.'));
            body.append(figure);
        }
        body.append(app.el('p', 'card-text', game.format));
        body.append(app.el('p', 'small text-body-secondary', game.source ? 'Упомянута на сайте. Установка и версия не подтверждены.' : 'Предложение для клуба. Установка и версия не подтверждены.'));
        const official = app.el('a', 'mb-3', 'Официальный сайт игры');
        official.href = game.official;
        official.target = '_blank';
        official.rel = 'noopener noreferrer';
        const choose = app.el('button', 'btn btn-outline-danger mt-auto', 'Выбрать для запроса');
        choose.type = 'button';
        choose.dataset.game = game.id;
        choose.addEventListener('click', () => {
            titleField.value = game.title;
            genreField.value = game.genre;
            onRequestEdit({ target: titleField });
            app.notify(status, `Выбрана игра ${game.title}. Заполните контакты и параметры визита; это демонстрационный запрос.`, '');
            titleField.focus();
        });
        body.append(official, choose);
        card.append(body);
        column.append(card);
        return column;
    }

    function renderGames() {
        const query = search.value.trim().toLocaleLowerCase('ru');
        const matches = games.filter(game => game.title.toLocaleLowerCase('ru').includes(query)
            && (category.value === 'all' || game.genre === category.value)
            && (availability.value === 'all' || game.source === (availability.value === 'source')));
        matches.sort((first, second) => sort.value === 'genre'
            ? genreNames[first.genre].localeCompare(genreNames[second.genre], 'ru') || first.title.localeCompare(second.title, 'ru')
            : first.title.localeCompare(second.title, 'ru'));
        app.renderList(list, matches, renderGame, 'Подходящих игр нет. Измените название, жанр или сбросьте фильтры.');
        count.textContent = `Найдено игр: ${matches.length} из ${games.length}`;
    }
    controls.addEventListener('submit', event => { event.preventDefault(); renderGames(); });
    controls.addEventListener('input', renderGames);
    controls.addEventListener('change', renderGames);
    reset.addEventListener('click', () => { controls.reset(); renderGames(); search.focus(); });

    const moba = app.el('option', '', 'MOBA');
    moba.value = 'moba';
    genreField.append(moba);
    dateField.min = app.today();
    document.getElementById('game-request-submit-guard').remove();
    document.getElementById('game-request-submit').type = 'submit';
    form.noValidate = true;
    form.closest('section').querySelector(':scope > p').textContent = 'Укажите игру и пожелания к версии. Проверьте предварительный итог, затем создайте демонстрационный запрос. Данные не отправляются на сервер, установка игры и реальное бронирование не выполняются.';
    success.nextElementSibling.textContent = 'Подтверждение относится только к демонстрации в этом браузере. Наличие игры уточняется у администратора.';
    app.notify(status, 'Заполните форму. Итог обновляется при вводе; запрос не отправляется в клуб.', '');

    function updateSummary() {
        const team = form.querySelector('[name="team-play"]:checked');
        document.getElementById('game-request-summary-title').textContent = titleField.value.trim() || 'Не указано';
        document.getElementById('game-request-summary-genre').textContent = genreNames[genreField.value] || 'Не выбран';
        document.getElementById('game-request-summary-date').textContent = dateField.value || 'Не выбрана';
        document.getElementById('game-request-summary-players').textContent = playersField.value || 'Не указано';
        document.getElementById('game-request-summary-team').textContent = team ? (team.value === 'yes' ? 'Да' : 'Нет') : 'Не выбрана';
        resultStatus.textContent = 'Предварительный итог. Нажмите «Показать итог запроса» для проверки.';
        success.classList.add('hidden');
        resultList.classList.add('hidden');
        const next = new URL('booking.html', location.href);
        if (titleField.value.trim()) next.searchParams.set('game', titleField.value.trim());
        if (dateField.value) next.searchParams.set('date', dateField.value);
        if (Number.isInteger(Number(playersField.value)) && Number(playersField.value) >= 1 && Number(playersField.value) <= 45) next.searchParams.set('players', playersField.value);
        next.hash = 'booking-form';
        document.getElementById('games-a-2').href = `${next.pathname.split('/').pop()}${next.search}${next.hash}`;
    }

    function validateRequest() {
        app.clearErrors(form);
        const invalid = [];
        function check(field, message) {
            app.setError(field, message);
            if (message) invalid.push(field);
        }
        const name = document.getElementById('visitor-name');
        const email = document.getElementById('visitor-email');
        const phone = document.getElementById('visitor-phone');
        const contacts = app.validateContacts(name.value, email.value, phone.value);
        check(name, contacts.name);
        check(email, contacts.email);
        check(phone, contacts.phone);
        check(dateField, !dateField.value ? 'Укажите дату визита.' : dateField.value < app.today() ? 'Дата визита не может быть в прошлом.' : '');
        const playerCount = Number(playersField.value);
        check(playersField, !Number.isInteger(playerCount) || playerCount < 1 || playerCount > 45 ? 'Укажите целое число игроков от 1 до 45.' : '');
        const title = titleField.value.trim();
        check(titleField, title.length < 2 || title.length > 120 ? 'Название игры должно содержать от 2 до 120 символов.' : '');
        const known = games.find(game => game.title.toLocaleLowerCase('ru') === title.toLocaleLowerCase('ru'));
        check(genreField, !Object.hasOwn(genreNames, genreField.value) ? 'Выберите жанр игры.' : known && known.genre !== genreField.value ? `Для игры ${known.title} выберите жанр «${genreNames[known.genre]}».` : '');
        const team = form.querySelector('[name="team-play"]:checked');
        check(document.getElementById('team-yes'), !team ? 'Укажите, планируете ли командную игру.' : team.value === 'yes' && playerCount < 2 ? 'Для командной игры нужны как минимум два игрока.' : '');
        check(document.getElementById('game-agreement'), !document.getElementById('game-agreement').checked ? 'Подтвердите правильность данных.' : '');
        const comment = document.getElementById('request-comment');
        check(comment, comment.value.trim().length > 1000 ? 'Комментарий не должен превышать 1000 символов.' : '');
        return invalid;
    }

    function onRequestEdit(event) {
        if (attempted) {
            const invalid = validateRequest();
            if (invalid.length) app.notify(errors, `Исправьте поля с ошибками: ${invalid.length}.`, 'error');
            else errors.classList.add('hidden');
        } else if (event.target.id) app.setError(event.target, '');
        updateSummary();
    }
    form.addEventListener('input', onRequestEdit);
    form.addEventListener('change', onRequestEdit);
    form.addEventListener('submit', event => {
        event.preventDefault();
        attempted = true;
        const invalid = validateRequest();
        if (invalid.length) {
            app.notify(errors, `Исправьте поля с ошибками: ${invalid.length}.`, 'error');
            success.classList.add('hidden');
            resultStatus.textContent = 'Запрос не сформирован: проверьте отмеченные поля.';
            invalid[0].focus();
            return;
        }
        errors.classList.add('hidden');
        const request = {
            reference: app.reference('GAME'),
            title: titleField.value.trim(),
            genre: genreNames[genreField.value],
            date: dateField.value,
            players: Number(playersField.value),
            team: form.querySelector('[name="team-play"]:checked').value === 'yes' ? 'Да' : 'Нет',
            comment: document.getElementById('request-comment').value.trim()
        };
        const lines = [`Игра: ${request.title}`, `Жанр: ${request.genre}`, `Дата визита: ${request.date}`, `Игроков: ${request.players}; командная игра: ${request.team}`];
        if (request.comment) lines.push(`Комментарий: ${request.comment}`);
        app.renderList(resultList, lines, text => app.el('li', 'list-group-item text-break', text), 'Нет данных запроса.');
        resultList.classList.remove('hidden');
        app.notify(success, `Демонстрационный запрос ${request.reference} сформирован. Данные не отправлены на сервер; установка игры и реальное бронирование не созданы.`, 'success');
        resultStatus.textContent = 'Проверка пройдена. Просмотрите параметры запроса ниже.';
    });
    form.addEventListener('reset', () => {
        attempted = false;
        app.clearErrors(form);
        errors.classList.add('hidden');
        success.classList.add('hidden');
        resultList.replaceChildren();
        resultList.classList.add('hidden');
        setTimeout(() => {
            updateSummary();
            app.notify(status, 'Форма очищена. Можно сформировать новый демонстрационный запрос.', '');
            document.getElementById('visitor-name').focus();
        }, 0);
    });
    renderGames();
    updateSummary();
})();
