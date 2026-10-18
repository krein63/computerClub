'use strict';

function setupGames() {
    const app = window.TopGame;
    const list = document.getElementById('game-cards');
    if (!app || !list) return;

    // 1. Данные игр и готовые элементы страницы.
    const games = [
        { id: 'cs2', title: 'Counter-Strike 2', genre: 'shooter', source: true },
        { id: 'dota2', title: 'Dota 2', genre: 'moba', source: true },
        { id: 'valorant', title: 'VALORANT', genre: 'shooter', source: false },
        { id: 'lol', title: 'League of Legends', genre: 'moba', source: false },
        { id: 'rocket-league', title: 'Rocket League', genre: 'sports', source: false },
        { id: 'civilization', title: 'Sid Meier’s Civilization VI', genre: 'strategy', source: false }
    ];
    const genreNames = { shooter: 'Шутер', moba: 'MOBA', strategy: 'Стратегия', sports: 'Спорт' };
    const controls = document.getElementById('games-filters');
    const search = document.getElementById('games-search');
    const category = document.getElementById('games-category');
    const availability = document.getElementById('games-availability');
    const sort = document.getElementById('games-sort');
    const count = document.getElementById('games-result-count');
    const form = document.getElementById('game-request-form');
    const nameField = document.getElementById('visitor-name');
    const emailField = document.getElementById('visitor-email');
    const phoneField = document.getElementById('visitor-phone');
    const titleField = document.getElementById('game-title');
    const genreField = document.getElementById('genre');
    const dateField = document.getElementById('visit-date');
    const playersField = document.getElementById('players');
    const commentField = document.getElementById('request-comment');
    const commentCounter = document.getElementById('game-comment-counter');
    const status = document.getElementById('game-request-status');
    const errors = document.getElementById('game-request-errors');
    const success = document.getElementById('game-request-success');
    const resultStatus = document.getElementById('game-request-result-status');
    const resultList = document.getElementById('game-request-list');
    const totalSeats = app.seats.length;
    let attempted = false;
    let lastRequestKey = '';
    let lastReference = '';

    for (const game of games) {
        game.card = document.getElementById('game-' + game.id);
        game.column = game.card.parentElement;
        game.button = game.card.querySelector('[data-game]');
        game.button.addEventListener('click', chooseGame);
    }
    playersField.max = totalSeats;
    dateField.min = app.today();
    form.noValidate = true;
    // Включаем проверку через JavaScript; без него форма не отправляет контакты.
    document.getElementById('game-request-submit-guard').remove();
    document.getElementById('game-request-submit').type = 'submit';

    // 2. Поиск, фильтры и сортировка карточек.
    function compareGames(first, second) {
        if (sort.value === 'genre') {
            const genreOrder = genreNames[first.genre].localeCompare(genreNames[second.genre], 'ru');
            if (genreOrder !== 0) return genreOrder;
        }
        return first.title.localeCompare(second.title, 'ru');
    }

    function renderGames() {
        const query = search.value.trim().toLocaleLowerCase('ru');
        const matches = [];
        for (const game of games) {
            if (!game.title.toLocaleLowerCase('ru').includes(query)) continue;
            if (category.value !== 'all' && game.genre !== category.value) continue;
            if (availability.value === 'source' && !game.source) continue;
            if (availability.value === 'suggestion' && game.source) continue;
            matches.push(game);
        }
        matches.sort(compareGames);
        list.replaceChildren();
        for (const game of matches) {
            list.append(game.column);
        }
        if (matches.length === 0) {
            list.append(app.el('p', 'mb-0', 'Подходящих игр нет. Измените название, жанр или сбросьте фильтры.'));
        }
        count.textContent = 'Найдено игр: ' + matches.length + ' из ' + games.length;
    }

    function searchGames(event) {
        event.preventDefault();
        renderGames();
    }

    function resetFilters() {
        controls.reset();
        renderGames();
        search.focus();
    }

    function chooseGame(event) {
        for (const game of games) {
            if (game.id === event.currentTarget.dataset.game) {
                titleField.value = game.title;
                genreField.value = game.genre;
                onRequestEdit();
                app.notify(status, 'Выбрана игра ' + game.title + '. Заполните контакты и параметры визита; это демонстрационный запрос.', '');
                titleField.focus();
                return;
            }
        }
    }

    // 3. При вводе обновляем предварительный итог и ссылку на бронирование.
    function updateSummary() {
        const title = titleField.value.trim();
        commentCounter.textContent = 'Символов: ' + commentField.value.length + ' / 1000';
        for (const game of games) {
            const selected = title.toLocaleLowerCase('ru') === game.title.toLocaleLowerCase('ru');
            game.card.classList.toggle('selected', selected);
            game.button.setAttribute('aria-pressed', String(selected));
        }
        const team = form.querySelector('[name="team-play"]:checked');
        let teamText = 'Не выбрана';
        if (team) {
            teamText = 'Нет';
            if (team.value === 'yes') teamText = 'Да';
        }
        document.getElementById('game-request-summary-title').textContent = title || 'Не указано';
        document.getElementById('game-request-summary-genre').textContent = genreNames[genreField.value] || 'Не выбран';
        document.getElementById('game-request-summary-date').textContent = dateField.value || 'Не выбрана';
        document.getElementById('game-request-summary-players').textContent = playersField.value || 'Не указано';
        document.getElementById('game-request-summary-team').textContent = teamText;
        resultStatus.textContent = 'Предварительный итог. Нажмите «Показать итог запроса» для проверки.';
        success.classList.add('hidden');
        resultList.classList.add('hidden');

        const next = new URL('booking.html', location.href);
        if (title) next.searchParams.set('game', title);
        if (dateField.value) next.searchParams.set('date', dateField.value);
        const players = Number(playersField.value);
        if (Number.isInteger(players) && players >= 1 && players <= totalSeats) {
            next.searchParams.set('players', playersField.value);
        }
        next.hash = 'booking-form';
        document.getElementById('games-a-2').href = 'booking.html' + next.search + next.hash;
    }

    // 4. Проверяем поля по очереди и собираем список ошибок.
    function validateRequest() {
        app.clearErrors(form);
        const invalid = [];
        function check(field, message) {
            app.setError(field, message);
            if (message) invalid.push(field);
        }
        const contacts = app.validateContacts(nameField.value, emailField.value, phoneField.value);
        check(nameField, contacts.name);
        check(emailField, contacts.email);
        check(phoneField, contacts.phone);

        let message = '';
        if (!dateField.value) message = 'Укажите дату визита.';
        else if (dateField.value < app.today()) message = 'Дата визита не может быть в прошлом.';
        check(dateField, message);

        const playerCount = Number(playersField.value);
        message = '';
        if (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > totalSeats) {
            message = 'Укажите целое число игроков от 1 до ' + totalSeats + '.';
        }
        check(playersField, message);

        const title = titleField.value.trim();
        message = '';
        if (title.length < 2 || title.length > 120) message = 'Название игры должно содержать от 2 до 120 символов.';
        check(titleField, message);

        message = '';
        if (!Object.hasOwn(genreNames, genreField.value)) {
            message = 'Выберите жанр игры.';
        } else {
            for (const game of games) {
                if (game.title.toLocaleLowerCase('ru') !== title.toLocaleLowerCase('ru')) continue;
                if (game.genre !== genreField.value) {
                    message = 'Для игры ' + game.title + ' выберите жанр «' + genreNames[game.genre] + '».';
                }
            }
        }
        check(genreField, message);

        const team = form.querySelector('[name="team-play"]:checked');
        message = '';
        if (!team) message = 'Укажите, планируете ли командную игру.';
        else if (team.value === 'yes' && playerCount < 2) message = 'Для командной игры нужны как минимум два игрока.';
        check(document.getElementById('team-yes'), message);

        const agreement = document.getElementById('game-agreement');
        message = '';
        if (!agreement.checked) message = 'Подтвердите правильность данных.';
        check(agreement, message);

        message = '';
        if (commentField.value.trim().length > 1000) message = 'Комментарий не должен превышать 1000 символов.';
        check(commentField, message);
        return invalid;
    }

    function onRequestEdit() {
        if (attempted) {
            const invalid = validateRequest();
            if (invalid.length > 0) app.notify(errors, 'Исправьте поля с ошибками: ' + invalid.length + '.', 'error');
            else errors.classList.add('hidden');
        }
        updateSummary();
    }

    // 5. Показываем проверенный запрос. Повторная отправка сохраняет его номер.
    function submitRequest(event) {
        event.preventDefault();
        attempted = true;
        const invalid = validateRequest();
        if (invalid.length > 0) {
            app.notify(errors, 'Исправьте поля с ошибками: ' + invalid.length + '.', 'error');
            success.classList.add('hidden');
            resultList.classList.add('hidden');
            resultStatus.textContent = 'Запрос не сформирован: проверьте отмеченные поля.';
            invalid[0].focus();
            return;
        }
        errors.classList.add('hidden');
        let teamText = 'Нет';
        if (document.getElementById('team-yes').checked) teamText = 'Да';
        const request = {
            name: nameField.value.trim(),
            email: emailField.value.trim(),
            phone: phoneField.value.trim(),
            title: titleField.value.trim(),
            genre: genreNames[genreField.value],
            date: dateField.value,
            players: Number(playersField.value),
            team: teamText,
            comment: commentField.value.trim()
        };
        const requestKey = JSON.stringify(request);
        if (requestKey !== lastRequestKey) {
            lastReference = app.reference('GAME');
            lastRequestKey = requestKey;
        }
        const lines = [
            'Имя: ' + request.name,
            'Почта: ' + request.email,
            'Телефон: ' + request.phone,
            'Игра: ' + request.title,
            'Жанр: ' + request.genre,
            'Дата визита: ' + request.date,
            'Игроков: ' + request.players + '; командная игра: ' + request.team
        ];
        if (request.comment) lines.push('Комментарий: ' + request.comment);
        resultList.replaceChildren();
        for (const line of lines) {
            resultList.append(app.el('li', 'list-group-item text-break bg-dark text-light border-secondary', line));
        }
        resultList.classList.remove('hidden');
        app.notify(success, 'Демонстрационный запрос ' + lastReference + ' сформирован. Данные не отправлены на сервер; установка игры и реальное бронирование не созданы.', 'success');
        resultStatus.textContent = 'Проверка пройдена. Просмотрите параметры запроса ниже.';
    }

    function resetRequest() {
        attempted = false;
        lastRequestKey = '';
        lastReference = '';
        app.clearErrors(form);
        errors.classList.add('hidden');
        success.classList.add('hidden');
        resultList.replaceChildren();
        resultList.classList.add('hidden');
        // Браузер сначала сбросит поля формы, затем обновим итог.
        setTimeout(finishReset, 0);
    }

    function finishReset() {
        updateSummary();
        app.notify(status, 'Форма очищена. Можно сформировать новый демонстрационный запрос.', '');
        nameField.focus();
    }

    controls.addEventListener('submit', searchGames);
    controls.addEventListener('input', renderGames);
    controls.addEventListener('change', renderGames);
    document.getElementById('games-filter-reset').addEventListener('click', resetFilters);
    form.addEventListener('input', onRequestEdit);
    form.addEventListener('change', onRequestEdit);
    form.addEventListener('submit', submitRequest);
    form.addEventListener('reset', resetRequest);
    renderGames();
    updateSummary();
}

setupGames();
