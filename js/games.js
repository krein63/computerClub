// jQuery 3.7.1 full build is loaded first; ready waits until the page exists.
'use strict';

$(function () {
  const app = window.TopGame;
  const list = $('#game-cards').get(0);
  if (!app || !list) return;

  // Меняем готовые классы Bootstrap: зелёная кнопка при наведении, красная обводка после.
  // Делегирование сохраняет эффект после поиска, сортировки и пересоздания карточек.
  $('#game-cards')
    .on('mouseenter', '[data-game]', function () {
      $(this).removeClass('btn-outline-danger').addClass('btn-success');
    })
    .on('mouseleave', '[data-game]', function () {
      $(this).removeClass('btn-success').addClass('btn-outline-danger');
    });

  // Mentioned games and visitor suggestions are distinguished from installed games.
  const games = [{
    id: 'cs2',
    title: 'Counter-Strike 2',
    genre: 'shooter',
    format: 'Командный шутер, 5 × 5',
    source: true,
    official: 'https://www.counter-strike.net/cs2',
    image: 'images/games/cs2.jpg'
  }, {
    id: 'dota2',
    title: 'Dota 2',
    genre: 'moba',
    format: 'MOBA, две команды по пять игроков',
    source: true,
    official: 'https://www.dota2.com/',
    image: 'images/games/dota2.jpg'
  }, {
    id: 'valorant',
    title: 'VALORANT',
    genre: 'shooter',
    format: 'Тактический шутер, 5 × 5',
    source: false,
    official: 'https://playvalorant.com/',
    image: 'images/games/valorant.jpg'
  }, {
    id: 'lol',
    title: 'League of Legends',
    genre: 'moba',
    format: 'Командная MOBA',
    source: false,
    official: 'https://www.leagueoflegends.com/',
    image: 'images/games/lol.jpg'
  }, {
    id: 'rocket-league',
    title: 'Rocket League',
    genre: 'sports',
    format: 'Футбол на автомобилях',
    source: false,
    official: 'https://www.rocketleague.com/',
    image: 'images/games/rocket-league.jpg'
  }, {
    id: 'civilization',
    title: 'Sid Meier’s Civilization VI',
    genre: 'strategy',
    format: 'Пошаговая стратегия',
    source: false,
    official: 'https://civilization.2k.com/civ-vi/',
    image: 'images/games/civilization.jpg'
  }];
  const genreNames = {
    shooter: 'Шутер',
    moba: 'MOBA',
    strategy: 'Стратегия',
    sports: 'Спорт'
  };
  const form = $('#game-request-form').get(0);
  const titleField = $('#game-title').get(0);
  const genreField = $('#genre').get(0);
  const dateField = $('#visit-date').get(0);
  const playersField = $('#players').get(0);
  const totalSeats = app.seats.length;
  $(playersField).attr("max", String(totalSeats));
  const status = $('#game-request-status').get(0);
  const success = $('#game-request-success').get(0);
  const errors = $('#game-request-errors').get(0);
  const resultStatus = $('#game-request-result-status').get(0);
  const resultList = $('#game-request-list').get(0);
  const commentField = $('#request-comment').get(0);
  const commentCounter = app.el('span', 'form-text d-block');
  $(commentCounter).attr("id", 'game-comment-counter');
  $(commentField).after(commentCounter);
  $(commentField).attr('aria-describedby', 'request-comment-help game-comment-counter');
  let attempted = false;
  let lastRequestKey = '';
  let lastReference = '';
  const controls = app.el('form', 'row g-3 mb-4');
  $(controls).attr('role', 'search');
  $(controls).attr('aria-label', 'Поиск и фильтры игр');
  function addControl(id, labelText, kind, options) {
    const wrapper = app.el('div', 'col-12 col-md-6 col-lg-3');
    const label = app.el('label', 'form-label fw-semibold', labelText);
    $(label).attr("for", id);
    const field = app.el(kind, kind === 'select' ? 'form-select' : 'form-control');
    $(field).attr("id", id);
    if (kind === 'input') $(field).attr("type", 'search');
    if (options) options.forEach(([value, text]) => {
      const option = app.el('option', '', text);
      $(option).val(value);
      $(field).append(option);
    });
    $(wrapper).append(label, field);
    $(controls).append(wrapper);
    return field;
  }
  const search = addControl('games-search', 'Название игры', 'input');
  const category = addControl('games-category', 'Жанр', 'select', [['all', 'Все жанры'], ...Object.entries(genreNames)]);
  const availability = addControl('games-availability', 'Каталог', 'select', [['all', 'Все игры'], ['source', 'Упомянуты на сайте'], ['suggestion', 'Предложения для клуба']]);
  const sort = addControl('games-sort', 'Сортировать', 'select', [['name', 'По названию А–Я'], ['genre', 'По жанру']]);
  // New endterm feature: a visitor's shortlist survives a page reload.
  const savedFavorites = app.store.get('favorite-games', []);
  let favorites = Array.isArray(savedFavorites) ? games.filter(game => savedFavorites.includes(game.id)).map(game => game.id) : [];
  const favoriteFilter = addControl('games-favorites', 'Мой список', 'select', [['all', 'Все игры'], ['favorites', 'Только избранные']]);
  const favoriteStatus = app.el('p', 'p-3 rounded-3 hidden');
  $(favoriteStatus).attr({ id: 'games-favorite-status', role: 'status' });
  const actions = app.el('div', 'col-12 d-flex flex-wrap align-items-center gap-3');
  const reset = app.el('button', 'btn btn-outline-secondary', 'Сбросить фильтры');
  $(reset).attr("type", 'button');
  $(reset).attr("id", 'games-filter-reset');
  const count = app.el('p', 'mb-0');
  $(count).attr("id", 'games-result-count');
  $(count).attr('aria-live', 'polite');
  $(actions).append(reset, count);
  $(controls).append(actions);
  $(list).before(controls, favoriteStatus);
  $(list).on('click', '[data-favorite-game]', function () {
    const id = $(this).attr('data-favorite-game');
    const game = games.find(item => item.id === id);
    if (!game) return;
    const adding = !favorites.includes(id);
    favorites = adding ? [...favorites, id] : favorites.filter(value => value !== id);
    const saved = app.store.set('favorite-games', favorites);
    renderGames();
    app.notify(favoriteStatus, `${game.title}: ${adding ? 'добавлена в избранное' : 'удалена из избранного'}.${saved ? '' : ' Сохранение недоступно, список действует до перезагрузки.'}`, saved ? 'success' : 'error');
    const $next = $(list).find(`[data-favorite-game="${id}"]`);
    if ($next.length) $next.trigger('focus');
    else $(favoriteFilter).trigger('focus');
  });
  $(list).closest('section').first().find('header .lead').first().text('Выберите игру и запланируйте визит с друзьями. Наличие нужной версии уточняйте у администратора.');
  function renderGame(game) {
    const column = app.el('div', 'col-12 col-md-6 col-lg-4');
    const card = app.el('article', 'card h-100 shadow-sm overflow-hidden');
    $(card).attr("id", `game-${game.id}`);
    const selected = $(titleField).val().trim().toLocaleLowerCase('ru') === game.title.toLocaleLowerCase('ru');
    $(card).toggleClass('selected', selected);
    const cover = app.el('div', 'ratio ratio-16x9');
    const image = app.el('img', 'w-100 h-100 object-fit-cover');
    $(image).attr("src", game.image);
    $(image).attr("alt", `Официальное изображение ${game.title}`);
    image.loading = 'lazy';
    image.decoding = 'async';
    $(cover).append(image);
    const body = app.el('div', 'card-body p-3 p-lg-4 d-flex flex-column');
    $(body).append(app.el('h2', 'h4 fw-bold mb-3', game.title));
    $(body).append(app.el('p', 'card-text', game.format));
    const official = app.el('a', 'mb-3', 'Официальный сайт игры');
    $(official).attr("href", game.official);
    official.target = '_blank';
    official.rel = 'noopener noreferrer';
    const choose = app.el('button', 'btn btn-outline-danger mt-auto', 'Выбрать для запроса');
    $(choose).attr("type", 'button');
    $(choose).attr("data-game", game.id);
    $(choose).attr('aria-pressed', String(selected));
    $(choose).on('click', () => {
      $(titleField).val(game.title);
      $(genreField).val(game.genre);
      onRequestEdit({
        target: titleField
      });
      app.notify(status, `Выбрана игра ${game.title}. Заполните контакты и параметры визита.`, '');
      $(titleField).trigger("focus");
    });
    const favorite = app.el('button', 'btn btn-outline-light mt-2', favorites.includes(game.id) ? 'Убрать из избранного' : 'В избранное');
    $(favorite).attr({ type: 'button', 'data-favorite-game': game.id, 'aria-pressed': String(favorites.includes(game.id)), 'aria-label': `${favorites.includes(game.id) ? 'Убрать из избранного' : 'В избранное'}: ${game.title}` });
    $(body).append(official, choose, favorite);
    $(card).append(cover, body);
    $(column).append(card);
    return column;
  }
  function renderGames() {
    const query = $(search).val().trim().toLocaleLowerCase('ru');
    const matches = games.filter(game => game.title.toLocaleLowerCase('ru').includes(query) && ($(category).val() === 'all' || game.genre === $(category).val()) && ($(availability).val() === 'all' || game.source === ($(availability).val() === 'source')) && ($(favoriteFilter).val() !== 'favorites' || favorites.includes(game.id)));
    matches.sort((first, second) => $(sort).val() === 'genre' ? genreNames[first.genre].localeCompare(genreNames[second.genre], 'ru') || first.title.localeCompare(second.title, 'ru') : first.title.localeCompare(second.title, 'ru'));
    app.renderList(list, matches, renderGame, 'Подходящих игр нет. Измените название, жанр или сбросьте фильтры.');
    $(count).text(`Найдено игр: ${matches.length} из ${games.length}`);
  }
  $(controls).on('submit', event => {
    event.preventDefault();
    renderGames();
  });
  $(controls).on('input', 'input', renderGames);
  $(controls).on('change', 'select', renderGames);
  $(reset).on('click', () => {
    $(controls).trigger("reset");
    renderGames();
    $(search).trigger("focus");
  });
  const moba = app.el('option', '', 'MOBA');
  $(moba).val('moba');
  $(genreField).append(moba);
  $(dateField).attr("min", app.today());
  $('#game-request-submit-guard').first().remove();
  const submit = $('#game-request-submit').get(0);
  $(submit).attr("type", 'submit');
  $(submit).text('Отправить запрос');
  $(form).prop("noValidate", true);
  $(form).closest('section').first().find("> p").first().text('Укажите игру, дату и количество игроков. Параметры запроса сохраняются только в этом браузере и не отправляются в клуб. Установка игры и реальное бронирование не создаются; наличие уточняйте у администратора.');
  $(success).next().first().text('Для бронирования мест перейдите к выбору ПК.');
  app.notify(status, 'Заполните форму. Итог обновляется при вводе.', '');
  function updateSummary() {
    $(commentCounter).text(`Символов: ${$(commentField).val().length} / 1000`);
    games.forEach(game => {
      const card = $("#" + `game-${game.id}`).get(0);
      if (!card) return;
      const selected = $(titleField).val().trim().toLocaleLowerCase('ru') === game.title.toLocaleLowerCase('ru');
      $(card).toggleClass('selected', selected);
      $(card).find('[data-game]').first().attr('aria-pressed', String(selected));
    });
    const team = $(form).find('[name="team-play"]:checked').get(0);
    $('#game-request-summary-title').first().text($(titleField).val().trim() || 'Не указано');
    $('#game-request-summary-genre').first().text(genreNames[$(genreField).val()] || 'Не выбран');
    $('#game-request-summary-date').first().text($(dateField).val() || 'Не выбрана');
    $('#game-request-summary-players').first().text($(playersField).val() || 'Не указано');
    $('#game-request-summary-team').first().text(team ? $(team).val() === 'yes' ? 'Да' : 'Нет' : 'Не выбрана');
    $(resultStatus).text('Проверьте параметры и нажмите «Отправить запрос».');
    $(success).addClass("hidden");
    $(resultList).addClass("hidden");
    const next = new URL('booking.html', location.href);
    if ($(titleField).val().trim()) next.searchParams.set('game', $(titleField).val().trim());
    if ($(dateField).val()) next.searchParams.set('date', $(dateField).val());
    if (Number.isInteger(Number($(playersField).val())) && Number($(playersField).val()) >= 1 && Number($(playersField).val()) <= totalSeats) next.searchParams.set('players', $(playersField).val());
    next.hash = 'booking-form';
    $('#games-a-2').first().attr("href", `${next.pathname.split('/').pop()}${next.search}${next.hash}`);
  }
  function validateRequest() {
    app.clearErrors(form);
    const invalid = [];
    function check(field, message) {
      app.setError(field, message);
      if (message) invalid.push(field);
    }
    const name = $('#visitor-name').get(0);
    const email = $('#visitor-email').get(0);
    const phone = $('#visitor-phone').get(0);
    const contacts = app.validateContacts($(name).val(), $(email).val(), $(phone).val());
    check(name, contacts.name);
    check(email, contacts.email);
    check(phone, contacts.phone);
    check(dateField, !$(dateField).val() ? 'Укажите дату визита.' : $(dateField).val() < app.today() ? 'Дата визита не может быть в прошлом.' : '');
    const playerCount = Number($(playersField).val());
    check(playersField, !Number.isInteger(playerCount) || playerCount < 1 || playerCount > totalSeats ? `Укажите целое число игроков от 1 до ${totalSeats}.` : '');
    const title = $(titleField).val().trim();
    check(titleField, title.length < 2 || title.length > 120 ? 'Название игры должно содержать от 2 до 120 символов.' : '');
    const known = games.find(game => game.title.toLocaleLowerCase('ru') === title.toLocaleLowerCase('ru'));
    check(genreField, !Object.hasOwn(genreNames, $(genreField).val()) ? 'Выберите жанр игры.' : known && known.genre !== $(genreField).val() ? `Для игры ${known.title} выберите жанр «${genreNames[known.genre]}».` : '');
    const team = $(form).find('[name="team-play"]:checked').get(0);
    check($('#team-yes').get(0), !team ? 'Укажите, планируете ли командную игру.' : $(team).val() === 'yes' && playerCount < 2 ? 'Для командной игры нужны как минимум два игрока.' : '');
    check($('#game-agreement').get(0), !$('#game-agreement').first().prop("checked") ? 'Подтвердите правильность данных.' : '');
    const comment = $('#request-comment').get(0);
    check(comment, $(comment).val().trim().length > 1000 ? 'Комментарий не должен превышать 1000 символов.' : '');
    return invalid;
  }
  function onRequestEdit(event) {
    if (attempted) {
      const invalid = validateRequest();
      if (invalid.length) app.notify(errors, `Исправьте поля с ошибками: ${invalid.length}.`, 'error');else $(errors).addClass("hidden");
    } else if (event.target.id) app.setError(event.target, '');
    updateSummary();
  }
  $(form).on('input', onRequestEdit);
  $(form).on('change', onRequestEdit);
  $(form).on('submit', event => {
    event.preventDefault();
    attempted = true;
    const invalid = validateRequest();
    if (invalid.length) {
      app.notify(errors, `Исправьте поля с ошибками: ${invalid.length}.`, 'error');
      $(success).addClass("hidden");
      $(resultList).addClass("hidden");
      $(resultStatus).text('Запрос не сформирован: проверьте отмеченные поля.');
      $(invalid[0]).trigger("focus");
      return;
    }
    $(errors).addClass("hidden");
    const request = {
      name: $('#visitor-name').first().val().trim(),
      email: $('#visitor-email').first().val().trim(),
      phone: $('#visitor-phone').first().val().trim(),
      title: $(titleField).val().trim(),
      genre: genreNames[$(genreField).val()],
      date: $(dateField).val(),
      players: Number($(playersField).val()),
      team: $(form).find('[name="team-play"]:checked').first().val() === 'yes' ? 'Да' : 'Нет',
      comment: $('#request-comment').first().val().trim()
    };
    const requestKey = JSON.stringify(request);
    if (requestKey !== lastRequestKey) {
      lastReference = app.reference('GAME');
      lastRequestKey = requestKey;
    }
    const lines = [`Имя: ${request.name}`, `Почта: ${request.email}`, `Телефон: ${request.phone}`, `Игра: ${request.title}`, `Жанр: ${request.genre}`, `Дата визита: ${request.date}`, `Игроков: ${request.players}; командная игра: ${request.team}`];
    if (request.comment) lines.push(`Комментарий: ${request.comment}`);
    app.renderList(resultList, lines, text => app.el('li', 'list-group-item text-break', text), 'Нет данных запроса.');
    $(resultList).removeClass("hidden");
    // Контакты выводятся в результате, но не попадают в localStorage.
    const {
      name,
      email,
      phone,
      ...parameters
    } = request;
    const saved = app.store.set('game-request', {
      reference: lastReference,
      ...parameters
    });
    app.notify(success, saved ? `Локальный запрос ${lastReference} сохранён в этом браузере. Данные не отправлены в клуб; установка игры и реальное бронирование не созданы.` : 'Параметры проверены, но браузер не разрешил сохранить запрос. Данные не отправлены в клуб.', saved ? 'success' : 'error');
    $(resultStatus).text('Параметры запроса:');
  });
  $(form).on('reset', () => {
    attempted = false;
    lastRequestKey = '';
    lastReference = '';
    app.clearErrors(form);
    $(errors).addClass("hidden");
    $(success).addClass("hidden");
    $(resultList).empty();
    $(resultList).addClass("hidden");
    setTimeout(() => {
      updateSummary();
      app.notify(status, 'Форма очищена. Можно отправить новый запрос.', '');
      $('#visitor-name').first().trigger("focus");
    }, 0);
  });
  renderGames();
  const previousRequest = app.store.get('game-request', null);
  if (previousRequest && typeof previousRequest.title === 'string') {
    $(titleField).val(previousRequest.title);
    $(genreField).val(Object.keys(genreNames).find(key => genreNames[key] === previousRequest.genre) || '');
    $(dateField).val(previousRequest.date || '');
    $(playersField).val(previousRequest.players || 1);
    $("#" + (previousRequest.team === 'Да' ? 'team-yes' : 'team-no')).first().prop("checked", true);
    $('#request-comment').first().val(previousRequest.comment || '');
    app.notify(status, 'Загружены параметры последнего запроса. Контакты заполните заново.', '');
  }
  updateSummary();
});

